import { Router, Request, Response, NextFunction } from 'express';
import { GitHubService } from '../services/github.service';
import { logger } from '../utils/logger';

const router = Router();
const wrap = (fn: Function) => (req: Request, res: Response, next: NextFunction) =>
  Promise.resolve(fn(req, res, next)).catch(next);

// Use per-request service — picks up X-GitHub-Token header if present
const gh = (req: Request) => GitHubService.fromRequest(req);

router.get('/user', wrap(async (req: Request, res: Response) => {
  const data = await gh(req).getAuthenticatedUser();
  res.json({ success: true, data });
}));

router.get('/repos', wrap(async (req: Request, res: Response) => {
  const data = await gh(req).listRepositories(req.query as any);
  res.json({ success: true, data });
}));

router.get('/repos/:owner/:repo', wrap(async (req: Request, res: Response) => {
  const { owner, repo } = req.params;
  const data = await gh(req).getRepository(owner, repo);
  res.json({ success: true, data });
}));

router.post('/repos', wrap(async (req: Request, res: Response) => {
  const { name, description, private: isPrivate, auto_init } = req.body;
  if (!name) return res.status(400).json({ success: false, error: 'Repository name is required' });
  const data = await gh(req).createRepository(name, { description, private: isPrivate, auto_init });
  logger.info('API: Created repository', { name });
  res.status(201).json({ success: true, data });
}));

router.delete('/repos/:owner/:repo', wrap(async (req: Request, res: Response) => {
  const { owner, repo } = req.params;
  const data = await gh(req).deleteRepository(owner, repo);
  res.json({ success: true, data });
}));

router.get('/repos/:owner/:repo/contents', wrap(async (req: Request, res: Response) => {
  const { owner, repo } = req.params;
  const path = (req.query.path as string) || '';
  const ref = req.query.ref as string;
  const data = await gh(req).listRepoContents(owner, repo, path, ref);
  res.json({ success: true, data });
}));

router.get('/repos/:owner/:repo/file', wrap(async (req: Request, res: Response) => {
  const { owner, repo } = req.params;
  const { path, ref } = req.query as { path: string; ref?: string };
  if (!path) return res.status(400).json({ success: false, error: 'path query param required' });
  const data = await gh(req).getFileContent(owner, repo, path, ref);
  res.json({ success: true, data });
}));

router.post('/repos/:owner/:repo/file', wrap(async (req: Request, res: Response) => {
  const { owner, repo } = req.params;
  const { path, content, message, sha, branch } = req.body;
  if (!path || !content || !message) return res.status(400).json({ success: false, error: 'path, content, message required' });
  const data = await gh(req).createOrUpdateFile(owner, repo, path, content, message, sha, branch);
  res.json({ success: true, data });
}));

router.delete('/repos/:owner/:repo/file', wrap(async (req: Request, res: Response) => {
  const { owner, repo } = req.params;
  const { path, message, sha, branch } = req.body;
  if (!path || !message || !sha) return res.status(400).json({ success: false, error: 'path, message, sha required' });
  const data = await gh(req).deleteFile(owner, repo, path, message, sha, branch);
  res.json({ success: true, data });
}));

router.get('/repos/:owner/:repo/branches', wrap(async (req: Request, res: Response) => {
  const { owner, repo } = req.params;
  const data = await gh(req).listBranches(owner, repo);
  res.json({ success: true, data });
}));

router.post('/repos/:owner/:repo/branches', wrap(async (req: Request, res: Response) => {
  const { owner, repo } = req.params;
  const { name, from } = req.body;
  if (!name) return res.status(400).json({ success: false, error: 'Branch name required' });
  const data = await gh(req).createBranch(owner, repo, name, from);
  res.json({ success: true, data });
}));

router.get('/repos/:owner/:repo/pulls', wrap(async (req: Request, res: Response) => {
  const { owner, repo } = req.params;
  const data = await gh(req).listPullRequests(owner, repo, req.query.state as string);
  res.json({ success: true, data });
}));

router.post('/repos/:owner/:repo/pulls', wrap(async (req: Request, res: Response) => {
  const { owner, repo } = req.params;
  const { title, head, base, body } = req.body;
  if (!title || !head || !base) return res.status(400).json({ success: false, error: 'title, head, base required' });
  const data = await gh(req).createPullRequest(owner, repo, title, head, base, body);
  res.status(201).json({ success: true, data });
}));

router.get('/repos/:owner/:repo/issues', wrap(async (req: Request, res: Response) => {
  const { owner, repo } = req.params;
  const data = await gh(req).listIssues(owner, repo, req.query.state as string);
  res.json({ success: true, data });
}));

router.post('/repos/:owner/:repo/issues', wrap(async (req: Request, res: Response) => {
  const { owner, repo } = req.params;
  const { title, body, labels } = req.body;
  if (!title) return res.status(400).json({ success: false, error: 'Issue title required' });
  const data = await gh(req).createIssue(owner, repo, title, body, labels);
  res.status(201).json({ success: true, data });
}));

router.patch('/repos/:owner/:repo/issues/:issue_number', wrap(async (req: Request, res: Response) => {
  const { owner, repo, issue_number } = req.params;
  const data = await gh(req).updateIssue(owner, repo, parseInt(issue_number), req.body);
  res.json({ success: true, data });
}));

router.get('/repos/:owner/:repo/actions/runs', wrap(async (req: Request, res: Response) => {
  const { owner, repo } = req.params;
  const data = await gh(req).listWorkflowRuns(owner, repo);
  res.json({ success: true, data });
}));

router.get('/repos/:owner/:repo/actions/runs/:run_id', wrap(async (req: Request, res: Response) => {
  const { owner, repo, run_id } = req.params;
  const data = await gh(req).getWorkflowRun(owner, repo, parseInt(run_id));
  res.json({ success: true, data });
}));

router.post('/repos/:owner/:repo/actions/workflows/:workflow_id/dispatches', wrap(async (req: Request, res: Response) => {
  const { owner, repo, workflow_id } = req.params;
  const { ref, inputs } = req.body;
  const data = await gh(req).triggerWorkflow(owner, repo, workflow_id, ref, inputs);
  res.json({ success: true, data });
}));

router.get('/repos/:owner/:repo/actions/runs/:run_id/artifacts', wrap(async (req: Request, res: Response) => {
  const { owner, repo, run_id } = req.params;
  const data = await gh(req).listWorkflowRunArtifacts(owner, repo, parseInt(run_id));
  res.json({ success: true, data });
}));

router.get('/repos/:owner/:repo/actions/runs/:run_id/logs', wrap(async (req: Request, res: Response) => {
  const { owner, repo, run_id } = req.params;
  const data = await gh(req).downloadWorkflowLogs(owner, repo, parseInt(run_id));
  res.json({ success: true, data });
}));

export default router;
