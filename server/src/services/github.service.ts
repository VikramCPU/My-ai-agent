import { Octokit } from '@octokit/rest';
import { logger } from '../utils/logger';
import axios from 'axios';

export interface FileCommit {
  path: string;
  content: string;
}

export class GitHubService {
  private octokit: Octokit;

  constructor() {
    const token = process.env.GITHUB_PAT;
    if (!token) throw new Error('GITHUB_PAT environment variable is not set');
    this.octokit = new Octokit({ auth: token });
  }

  async getAuthenticatedUser() {
    const { data } = await this.octokit.users.getAuthenticated();
    logger.info('Fetched authenticated user', { login: data.login });
    return data;
  }

  async listRepositories(options: { type?: string; sort?: string; per_page?: number; page?: number } = {}) {
    const { data } = await this.octokit.repos.listForAuthenticatedUser({
      type: (options.type as any) || 'all',
      sort: (options.sort as any) || 'updated',
      per_page: options.per_page || 30,
      page: options.page || 1,
    });
    return data;
  }

  async getRepository(owner: string, repo: string) {
    const { data } = await this.octokit.repos.get({ owner, repo });
    return data;
  }

  async createRepository(name: string, options: { description?: string; private?: boolean; auto_init?: boolean } = {}) {
    const { data } = await this.octokit.repos.createForAuthenticatedUser({
      name, description: options.description || '',
      private: options.private ?? false, auto_init: options.auto_init ?? true,
    });
    logger.info('Created repository', { name: data.full_name });
    return data;
  }

  async deleteRepository(owner: string, repo: string) {
    await this.octokit.repos.delete({ owner, repo });
    return { success: true };
  }

  async getFileContent(owner: string, repo: string, path: string, ref?: string) {
    const params: any = { owner, repo, path };
    if (ref) params.ref = ref;
    const { data } = await this.octokit.repos.getContent(params);
    if (Array.isArray(data)) throw new Error('Path is a directory');
    const file = data as any;
    return { ...file, content: file.encoding === 'base64' ? Buffer.from(file.content, 'base64').toString('utf-8') : file.content };
  }

  async createOrUpdateFile(owner: string, repo: string, path: string, content: string, message: string, sha?: string, branch?: string) {
    const params: any = { owner, repo, path, message, content: Buffer.from(content).toString('base64') };
    if (sha) params.sha = sha;
    if (branch) params.branch = branch;
    const { data } = await this.octokit.repos.createOrUpdateFileContents(params);
    logger.info('Created/updated file', { owner, repo, path });
    return data;
  }

  async deleteFile(owner: string, repo: string, path: string, message: string, sha: string, branch?: string) {
    const params: any = { owner, repo, path, message, sha };
    if (branch) params.branch = branch;
    const { data } = await this.octokit.repos.deleteFile(params);
    return data;
  }

  // ── Multi-file commit via Git Trees API ─────────────────────────
  async commitMultipleFiles(owner: string, repo: string, files: FileCommit[], message: string, branch: string = 'main'): Promise<{ sha: string; url: string }> {
    logger.info('Starting multi-file commit', { owner, repo, fileCount: files.length, branch });

    // 1. Get current branch ref
    const { data: refData } = await this.octokit.git.getRef({ owner, repo, ref: `heads/${branch}` });
    const baseSha = refData.object.sha;

    // 2. Get base tree SHA from latest commit
    const { data: baseCommit } = await this.octokit.git.getCommit({ owner, repo, commit_sha: baseSha });
    const baseTreeSha = baseCommit.tree.sha;

    // 3. Create blobs for all files in parallel
    const blobs = await Promise.all(files.map(f =>
      this.octokit.git.createBlob({ owner, repo, content: f.content, encoding: 'utf-8' })
    ));

    // 4. Create new tree with all files
    const { data: tree } = await this.octokit.git.createTree({
      owner, repo,
      base_tree: baseTreeSha,
      tree: files.map((f, i) => ({
        path: f.path, mode: '100644' as const, type: 'blob' as const, sha: blobs[i].data.sha,
      })),
    });

    // 5. Create commit
    const { data: newCommit } = await this.octokit.git.createCommit({
      owner, repo, message, tree: tree.sha, parents: [baseSha],
    });

    // 6. Update branch ref
    await this.octokit.git.updateRef({ owner, repo, ref: `heads/${branch}`, sha: newCommit.sha });

    logger.info('Multi-file commit success', { sha: newCommit.sha, files: files.length });
    return { sha: newCommit.sha, url: `https://github.com/${owner}/${repo}/commit/${newCommit.sha}` };
  }

  // ── Branches ────────────────────────────────────────────────────
  async listBranches(owner: string, repo: string) {
    const { data } = await this.octokit.repos.listBranches({ owner, repo });
    return data;
  }

  async createBranch(owner: string, repo: string, branchName: string, fromBranch: string = 'main') {
    const { data: fromRef } = await this.octokit.git.getRef({ owner, repo, ref: `heads/${fromBranch}` });
    const { data } = await this.octokit.git.createRef({ owner, repo, ref: `refs/heads/${branchName}`, sha: fromRef.object.sha });
    return data;
  }

  // ── Pull Requests ────────────────────────────────────────────────
  async listPullRequests(owner: string, repo: string, state: string = 'open') {
    const { data } = await this.octokit.pulls.list({ owner, repo, state: state as any });
    return data;
  }

  async createPullRequest(owner: string, repo: string, title: string, head: string, base: string, body?: string) {
    const { data } = await this.octokit.pulls.create({ owner, repo, title, head, base, body: body || '' });
    return data;
  }

  // ── Issues ───────────────────────────────────────────────────────
  async listIssues(owner: string, repo: string, state: string = 'open') {
    const { data } = await this.octokit.issues.listForRepo({ owner, repo, state: state as any });
    return data;
  }

  async createIssue(owner: string, repo: string, title: string, body?: string, labels?: string[]) {
    const { data } = await this.octokit.issues.create({ owner, repo, title, body: body || '', labels });
    return data;
  }

  async updateIssue(owner: string, repo: string, issue_number: number, updates: any) {
    const { data } = await this.octokit.issues.update({ owner, repo, issue_number, ...updates });
    return data;
  }

  // ── Actions / Workflows ──────────────────────────────────────────
  async listWorkflowRuns(owner: string, repo: string) {
    const { data } = await this.octokit.actions.listWorkflowRunsForRepo({ owner, repo, per_page: 20 });
    return data;
  }

  async getWorkflowRun(owner: string, repo: string, run_id: number) {
    const { data } = await this.octokit.actions.getWorkflowRun({ owner, repo, run_id });
    return data;
  }

  async triggerWorkflow(owner: string, repo: string, workflow_id: string, ref: string = 'main', inputs: Record<string, string> = {}) {
    await this.octokit.actions.createWorkflowDispatch({ owner, repo, workflow_id, ref, inputs });
    return { success: true };
  }

  async listWorkflowRunArtifacts(owner: string, repo: string, run_id: number) {
    const { data } = await this.octokit.actions.listWorkflowRunArtifacts({ owner, repo, run_id });
    return data;
  }

  async downloadWorkflowLogs(owner: string, repo: string, run_id: number): Promise<string> {
    try {
      // Get log download URL
      const response = await this.octokit.request('GET /repos/{owner}/{repo}/actions/runs/{run_id}/logs', {
        owner, repo, run_id,
        request: { redirect: 'manual' },
      });
      // The redirect URL contains the actual logs
      const logUrl = (response as any).url || '';
      if (logUrl) {
        const logResp = await axios.get(logUrl, { responseType: 'text', timeout: 15000 }).catch(() => null);
        return logResp?.data?.slice(0, 8000) || 'Logs not accessible';
      }
      return 'Log URL not available';
    } catch (e: any) {
      return `Log fetch error: ${e.message}`;
    }
  }

  async listRepoContents(owner: string, repo: string, path: string = '', ref?: string) {
    const params: any = { owner, repo, path };
    if (ref) params.ref = ref;
    const { data } = await this.octokit.repos.getContent(params);
    return Array.isArray(data) ? data : [data];
  }
}

export const githubService = new GitHubService();
