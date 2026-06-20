import { githubService } from './github.service';
import { aiService } from './ai.service';
import { logger } from '../utils/logger';

export interface ActionResult {
  success: boolean;
  data?: any;
  error?: string;
}

export async function parseAndExecuteAction(aiResponse: string): Promise<{ text: string; action?: ActionResult }> {
  const actionMatch = aiResponse.match(/<action>([\s\S]*?)<\/action>/);
  const cleanText = aiResponse.replace(/<action>[\s\S]*?<\/action>/g, '').trim();

  if (!actionMatch) return { text: cleanText };

  let actionData: any;
  try {
    actionData = JSON.parse(actionMatch[1].trim());
  } catch {
    return { text: cleanText, action: { success: false, error: 'Failed to parse action JSON' } };
  }

  logger.info('Executing action', { type: actionData.type, operation: actionData.operation });

  try {
    const result = await executeAction(actionData);
    return { text: cleanText, action: { success: true, data: result } };
  } catch (err: any) {
    return { text: cleanText, action: { success: false, error: err.message } };
  }
}

async function executeAction(action: { type: string; operation: string; params: any }): Promise<any> {
  const { type, operation, params } = action;

  if (type === 'github_action') {
    switch (operation) {
      case 'create_repo':
        return githubService.createRepository(params.name, params);
      case 'list_repos':
        return githubService.listRepositories(params);
      case 'get_repo':
        return githubService.getRepository(params.owner, params.repo);
      case 'get_file':
        return githubService.getFileContent(params.owner, params.repo, params.path, params.ref);
      case 'create_file':
      case 'update_file':
        return githubService.createOrUpdateFile(params.owner, params.repo, params.path, params.content, params.message, params.sha, params.branch);
      case 'delete_file':
        return githubService.deleteFile(params.owner, params.repo, params.path, params.message, params.sha, params.branch);
      case 'create_branch':
        return githubService.createBranch(params.owner, params.repo, params.branch, params.from);
      case 'list_branches':
        return githubService.listBranches(params.owner, params.repo);
      case 'create_pr':
        return githubService.createPullRequest(params.owner, params.repo, params.title, params.head, params.base, params.body);
      case 'list_issues':
        return githubService.listIssues(params.owner, params.repo, params.state);
      case 'create_issue':
        return githubService.createIssue(params.owner, params.repo, params.title, params.body, params.labels);
      case 'update_issue':
        return githubService.updateIssue(params.owner, params.repo, params.issue_number, params);
      case 'trigger_workflow':
        return githubService.triggerWorkflow(params.owner, params.repo, params.workflow_id, params.ref, params.inputs);
      case 'list_workflow_runs':
        return githubService.listWorkflowRuns(params.owner, params.repo);
      case 'list_artifacts':
        return githubService.listWorkflowRunArtifacts(params.owner, params.repo, params.run_id);
      case 'list_contents':
        return githubService.listRepoContents(params.owner, params.repo, params.path, params.ref);
      default:
        throw new Error(`Unknown GitHub operation: ${operation}`);
    }
  }

  if (type === 'build_action') {
    switch (operation) {
      case 'generate_android_project':
        return { content: await aiService.generateAndroidProject(params.app_name, params.package_name) };
      case 'generate_github_actions_workflow':
        return { content: await aiService.generateAndroidWorkflow(params.repo_name, params) };
      default:
        throw new Error(`Unknown build operation: ${operation}`);
    }
  }

  if (type === 'code_action') {
    switch (operation) {
      case 'analyze_code':
        return { analysis: await aiService.analyzeCode(params.code, params.language) };
      case 'explain_code':
        return { explanation: await aiService.explainCode(params.code, params.language) };
      case 'suggest_fix':
        return { fix: await aiService.suggestFix(params.code, params.error, params.language) };
      case 'generate_file':
        return { content: await aiService.generateFile(params.description, params.filename) };
      default:
        throw new Error(`Unknown code operation: ${operation}`);
    }
  }

  throw new Error(`Unknown action type: ${type}`);
}
