import { githubService } from './github.service';
import { aiService } from './ai.service';
import { logger } from '../utils/logger';
import { Response } from 'express';

export interface AutoFixStatus {
  stage: 'checking' | 'fetching_logs' | 'analyzing' | 'fixing' | 'committing' | 'triggering' | 'waiting' | 'success' | 'failed' | 'max_retries';
  message: string;
  attempt?: number;
  maxAttempts?: number;
  commitSha?: string;
  runId?: number;
  error?: string;
}

function sse(res: Response, event: string, data: any) {
  res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

export async function runAutoFixLoop(
  owner: string,
  repo: string,
  workflowFile: string,
  branch: string = 'main',
  maxAttempts: number = 5,
  res: Response
): Promise<void> {
  const send = (status: AutoFixStatus) => {
    sse(res, 'status', status);
    logger.info('Auto-fix status', status);
  };

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    send({ stage: 'checking', message: `Attempt ${attempt}/${maxAttempts}: Checking latest workflow run...`, attempt, maxAttempts });

    try {
      // 1. Get latest run
      const runsData = await githubService.listWorkflowRuns(owner, repo);
      const runs = (runsData as any).workflow_runs || [];
      const latestRun = runs[0];

      if (!latestRun) {
        send({ stage: 'triggering', message: 'No runs found. Triggering workflow...', attempt, maxAttempts });
        await githubService.triggerWorkflow(owner, repo, workflowFile, branch);
        await waitForSeconds(res, 30, 'Waiting for workflow to start...');
        continue;
      }

      // 2. Check run status
      const runId = latestRun.id;
      send({ stage: 'checking', message: `Run #${latestRun.run_number}: ${latestRun.status} / ${latestRun.conclusion || 'in progress'}`, attempt, maxAttempts, runId });

      // Wait if still running
      if (latestRun.status === 'in_progress' || latestRun.status === 'queued' || latestRun.status === 'waiting') {
        await waitForSeconds(res, 30, `Build in progress (status: ${latestRun.status}). Waiting 30s...`);
        const updated = await githubService.getWorkflowRun(owner, repo, runId);
        if (updated.conclusion === 'success') {
          send({ stage: 'success', message: `✅ Build succeeded on Run #${updated.run_number}!`, attempt, maxAttempts, runId });
          sse(res, 'done', { success: true });
          return;
        }
        if (updated.conclusion === 'failure') {
          // fall through to fix
        } else {
          continue; // still running
        }
      }

      if (latestRun.conclusion === 'success') {
        send({ stage: 'success', message: `✅ Build already succeeded! Run #${latestRun.run_number}`, attempt, maxAttempts, runId });
        sse(res, 'done', { success: true });
        return;
      }

      if (latestRun.conclusion !== 'failure') {
        await waitForSeconds(res, 15, `Status: ${latestRun.conclusion || latestRun.status}. Waiting...`);
        continue;
      }

      // 3. Build failed — fetch logs
      send({ stage: 'fetching_logs', message: `❌ Build failed on Run #${latestRun.run_number}. Fetching error logs...`, attempt, maxAttempts, runId });
      const logs = await githubService.downloadWorkflowLogs(owner, repo, runId);

      // 4. AI analysis
      send({ stage: 'analyzing', message: '🤖 AI analyzing error logs...', attempt, maxAttempts });
      const analysis = await aiService.chat([{
        role: 'user',
        content: `Android APK build failed. Analyze these GitHub Actions logs and identify the root cause.
Then suggest the exact file changes needed to fix the build.

Logs:
\`\`\`
${logs.slice(0, 6000)}
\`\`\`

Respond with:
1. Root cause (1-2 sentences)
2. JSON fix plan in this format:
<fix>
[
  { "path": "app/build.gradle", "content": "...full file content..." },
  { "path": "gradle/wrapper/gradle-wrapper.properties", "content": "..." }
]
</fix>

Only include files that need changes.`
      }], { temperature: 0.2, max_tokens: 6000 });

      // 5. Parse fix plan
      send({ stage: 'fixing', message: '🔧 Applying AI-suggested fixes...', attempt, maxAttempts });
      const fixMatch = analysis.match(/<fix>([\s\S]*?)<\/fix>/);
      let filesToFix: Array<{ path: string; content: string }> = [];

      if (fixMatch) {
        try {
          filesToFix = JSON.parse(fixMatch[1].trim());
        } catch {
          logger.warn('Could not parse fix JSON from AI response');
        }
      }

      if (filesToFix.length === 0) {
        // AI gave text fixes but no structured format — try to apply common fixes
        const fixSummary = analysis.slice(0, 500);
        send({ stage: 'fixing', message: `⚠️ AI analysis: ${fixSummary}. No structured fix found, triggering rebuild...`, attempt, maxAttempts });
      } else {
        // 6. Commit all fixes
        send({ stage: 'committing', message: `📝 Committing ${filesToFix.length} fixed file(s)...`, attempt, maxAttempts });
        const commit = await githubService.commitMultipleFiles(
          owner, repo, filesToFix,
          `[Auto-fix] Attempt ${attempt}: AI-fixed build errors`, branch
        );
        send({ stage: 'committing', message: `✅ Fixes committed: ${commit.sha.slice(0, 7)}`, attempt, maxAttempts, commitSha: commit.sha });
      }

      // 7. Trigger new workflow
      send({ stage: 'triggering', message: '🚀 Triggering new build...', attempt, maxAttempts });
      try {
        await githubService.triggerWorkflow(owner, repo, workflowFile, branch);
      } catch (e: any) {
        send({ stage: 'triggering', message: `Workflow trigger: ${e.message} (commit push may auto-trigger)`, attempt, maxAttempts });
      }

      // 8. Wait for new run to start
      await waitForSeconds(res, 20, 'Waiting for new build to start...');

    } catch (err: any) {
      send({ stage: 'failed', message: `Error: ${err.message}`, attempt, maxAttempts, error: err.message });
      if (attempt === maxAttempts) break;
      await waitForSeconds(res, 10, 'Retrying...');
    }
  }

  send({ stage: 'max_retries', message: `Reached max attempts (${maxAttempts}). Check logs manually.`, maxAttempts });
  sse(res, 'done', { success: false });
}

async function waitForSeconds(res: Response, seconds: number, message: string) {
  sse(res, 'status', { stage: 'waiting', message: `⏳ ${message} (${seconds}s)` });
  await new Promise(r => setTimeout(r, seconds * 1000));
}
