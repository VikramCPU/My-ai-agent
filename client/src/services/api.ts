import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 90000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const message = err.response?.data?.error || err.message || 'Request failed';
    return Promise.reject(new Error(message));
  }
);

// ── GitHub ──────────────────────────────────────────────────────
export const github = {
  getUser: () => api.get('/github/user').then(r => r.data.data),
  listRepos: (params?: any) => api.get('/github/repos', { params }).then(r => r.data.data),
  getRepo: (owner: string, repo: string) => api.get(`/github/repos/${owner}/${repo}`).then(r => r.data.data),
  createRepo: (data: any) => api.post('/github/repos', data).then(r => r.data.data),
  deleteRepo: (owner: string, repo: string) => api.delete(`/github/repos/${owner}/${repo}`).then(r => r.data.data),

  listContents: (owner: string, repo: string, path = '', ref?: string) =>
    api.get(`/github/repos/${owner}/${repo}/contents`, { params: { path, ref } }).then(r => r.data.data),
  getFile: (owner: string, repo: string, path: string, ref?: string) =>
    api.get(`/github/repos/${owner}/${repo}/file`, { params: { path, ref } }).then(r => r.data.data),
  saveFile: (owner: string, repo: string, data: any) =>
    api.post(`/github/repos/${owner}/${repo}/file`, data).then(r => r.data.data),
  deleteFile: (owner: string, repo: string, data: any) =>
    api.delete(`/github/repos/${owner}/${repo}/file`, { data }).then(r => r.data.data),

  listBranches: (owner: string, repo: string) => api.get(`/github/repos/${owner}/${repo}/branches`).then(r => r.data.data),
  createBranch: (owner: string, repo: string, data: any) => api.post(`/github/repos/${owner}/${repo}/branches`, data).then(r => r.data.data),

  listPRs: (owner: string, repo: string, state = 'open') =>
    api.get(`/github/repos/${owner}/${repo}/pulls`, { params: { state } }).then(r => r.data.data),
  createPR: (owner: string, repo: string, data: any) =>
    api.post(`/github/repos/${owner}/${repo}/pulls`, data).then(r => r.data.data),

  listIssues: (owner: string, repo: string, state = 'open') =>
    api.get(`/github/repos/${owner}/${repo}/issues`, { params: { state } }).then(r => r.data.data),
  createIssue: (owner: string, repo: string, data: any) =>
    api.post(`/github/repos/${owner}/${repo}/issues`, data).then(r => r.data.data),
  updateIssue: (owner: string, repo: string, number: number, data: any) =>
    api.patch(`/github/repos/${owner}/${repo}/issues/${number}`, data).then(r => r.data.data),

  listRuns: (owner: string, repo: string) => api.get(`/github/repos/${owner}/${repo}/actions/runs`).then(r => r.data.data),
  getRun: (owner: string, repo: string, runId: number) => api.get(`/github/repos/${owner}/${repo}/actions/runs/${runId}`).then(r => r.data.data),
  triggerWorkflow: (owner: string, repo: string, workflowId: string, data: any) =>
    api.post(`/github/repos/${owner}/${repo}/actions/workflows/${workflowId}/dispatches`, data).then(r => r.data.data),
  listArtifacts: (owner: string, repo: string, runId: number) =>
    api.get(`/github/repos/${owner}/${repo}/actions/runs/${runId}/artifacts`).then(r => r.data.data),
  getLogs: (owner: string, repo: string, runId: number) =>
    api.get(`/github/repos/${owner}/${repo}/actions/runs/${runId}/logs`).then(r => r.data.data),
};

// ── AI ──────────────────────────────────────────────────────────
export const ai = {
  chat: (messages: any[], options: any = {}) =>
    api.post('/ai/chat', { messages, ...options }).then(r => r.data.data),
  analyze: (code: string, language: string) =>
    api.post('/ai/analyze', { code, language }).then(r => r.data.data),
  explain: (code: string, language: string) =>
    api.post('/ai/explain', { code, language }).then(r => r.data.data),
  fix: (code: string, error: string, language: string) =>
    api.post('/ai/fix', { code, error, language }).then(r => r.data.data),
  generate: (description: string, filename: string) =>
    api.post('/ai/generate', { description, filename }).then(r => r.data.data),
  generateAndroidProject: (appName: string, packageName: string) =>
    api.post('/ai/android/project', { app_name: appName, package_name: packageName }).then(r => r.data.data),
  generateWorkflow: (repoName: string, opts: any = {}) =>
    api.post('/ai/android/workflow', { repo_name: repoName, ...opts }).then(r => r.data.data),
  listModels: () => api.get('/ai/models').then(r => r.data.data.models),
};

// ── Build / Auto-fix ────────────────────────────────────────────
export const build = {
  commitFiles: (data: { owner: string; repo: string; files: any[]; message: string; branch?: string }) =>
    api.post('/build/commit-files', data).then(r => r.data.data),
  generateAndPush: (data: { owner: string; repo: string; app_name: string; package_name: string; branch?: string }) =>
    api.post('/build/android/generate-and-push', data).then(r => r.data.data),
  pushSource: (data: { owner: string; repo: string; branch?: string }) =>
    api.post('/build/push-source', data).then(r => r.data.data),
  // SSE-based auto-fix — returns EventSource URL
  autoFixUrl: (owner: string, repo: string, workflow = 'build-apk.yml', branch = 'main', max = 5) =>
    `/api/build/auto-fix?owner=${owner}&repo=${repo}&workflow=${workflow}&branch=${branch}&max_attempts=${max}`,
};

// ── Settings ────────────────────────────────────────────────────
export const settings = {
  getProvider: () => api.get('/settings/ai-provider').then(r => r.data.data),
  setProvider: (data: any) => api.post('/settings/ai-provider', data).then(r => r.data.data),
  testProvider: () => api.post('/settings/ai-provider/test').then(r => r.data),
  getPresets: () => api.get('/settings/ai-provider/presets').then(r => r.data.data),
};

// ── Health ──────────────────────────────────────────────────────
export const health = {
  check: () => api.get('/health').then(r => r.data),
};

export default api;
