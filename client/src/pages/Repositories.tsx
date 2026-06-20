import { useState } from 'react';
import { GitBranch, Plus, Star, GitFork, Lock, Globe, Trash2, ExternalLink, RefreshCw, Search, GitPullRequest, AlertCircle } from 'lucide-react';
import { useRepositories } from '../hooks/useGitHub';
import toast from 'react-hot-toast';
import { github } from '../services/api';
import { Repository } from '../types';

export default function Repositories() {
  const { repos, loading, refresh, createRepo, deleteRepo } = useRepositories();
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [selected, setSelected] = useState<Repository | null>(null);
  const [form, setForm] = useState({ name: '', description: '', private: false, auto_init: true });
  const [creating, setCreating] = useState(false);
  const [issues, setIssues] = useState<any[]>([]);
  const [prs, setPrs] = useState<any[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const filtered = repos.filter(r =>
    r.name.toLowerCase().includes(search.toLowerCase()) ||
    (r.description || '').toLowerCase().includes(search.toLowerCase())
  );

  const handleCreate = async () => {
    if (!form.name.trim()) return toast.error('Repository name required');
    setCreating(true);
    try {
      await createRepo(form);
      setForm({ name: '', description: '', private: false, auto_init: true });
      setShowCreate(false);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setCreating(false);
    }
  };

  const loadRepoDetail = async (repo: Repository) => {
    setSelected(repo);
    setLoadingDetail(true);
    const [owner, name] = repo.full_name.split('/');
    try {
      const [i, p] = await Promise.all([
        github.listIssues(owner, name).catch(() => []),
        github.listPRs(owner, name).catch(() => []),
      ]);
      setIssues(i); setPrs(p);
    } finally {
      setLoadingDetail(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input className="input w-full pl-9" placeholder="Search repositories..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <button onClick={refresh} className="btn-secondary" disabled={loading}><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /></button>
        <button onClick={() => setShowCreate(v => !v)} className="btn-primary"><Plus className="w-4 h-4" /> New Repo</button>
      </div>

      {showCreate && (
        <div className="card border border-brand-500/20 bg-brand-950/20">
          <h3 className="font-medium text-gray-200 mb-3">Create Repository</h3>
          <div className="grid grid-cols-1 gap-3">
            <input className="input" placeholder="Repository name *" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            <input className="input" placeholder="Description (optional)" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer">
                <input type="checkbox" checked={form.private} onChange={e => setForm(f => ({ ...f, private: e.target.checked }))} className="rounded" />
                Private repository
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer">
                <input type="checkbox" checked={form.auto_init} onChange={e => setForm(f => ({ ...f, auto_init: e.target.checked }))} className="rounded" />
                Initialize with README
              </label>
            </div>
            <div className="flex gap-2">
              <button onClick={handleCreate} className="btn-primary" disabled={creating}>{creating ? 'Creating...' : 'Create Repository'}</button>
              <button onClick={() => setShowCreate(false)} className="btn-secondary">Cancel</button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {loading ? (
          Array(6).fill(0).map((_, i) => <div key={i} className="card h-28 animate-pulse bg-gray-800" />)
        ) : filtered.map(repo => (
          <div key={repo.id} onClick={() => loadRepoDetail(repo)}
            className={`card cursor-pointer hover:border-gray-600 transition-all ${selected?.id === repo.id ? 'border-brand-500/50 bg-brand-950/10' : ''}`}>
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  {repo.private ? <Lock className="w-3.5 h-3.5 text-yellow-500 shrink-0" /> : <Globe className="w-3.5 h-3.5 text-green-500 shrink-0" />}
                  <span className="font-medium text-gray-200 truncate">{repo.name}</span>
                </div>
                {repo.description && <p className="text-xs text-gray-500 mt-1 line-clamp-2">{repo.description}</p>}
                <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                  {repo.language && <span className="badge badge-gray">{repo.language}</span>}
                  <span className="flex items-center gap-1"><Star className="w-3 h-3" />{repo.stargazers_count}</span>
                  <span className="flex items-center gap-1"><GitFork className="w-3 h-3" />{repo.forks_count}</span>
                  <span className="flex items-center gap-1"><AlertCircle className="w-3 h-3" />{repo.open_issues_count}</span>
                </div>
              </div>
              <div className="flex gap-1 shrink-0">
                <a href={repo.html_url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="btn-ghost p-1.5"><ExternalLink className="w-3.5 h-3.5" /></a>
                <button onClick={e => { e.stopPropagation(); if (confirm(`Delete ${repo.name}?`)) deleteRepo(repo.owner.login, repo.name); }} className="btn-ghost p-1.5 hover:text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            </div>
          </div>
        ))}
        {!loading && filtered.length === 0 && (
          <div className="col-span-2 text-center py-12 text-gray-500">
            <GitBranch className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No repositories found</p>
          </div>
        )}
      </div>

      {selected && (
        <div className="card border border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-200 flex items-center gap-2"><GitBranch className="w-4 h-4 text-brand-400" />{selected.full_name}</h3>
            <button onClick={() => setSelected(null)} className="btn-ghost text-xs">✕ Close</button>
          </div>
          {loadingDetail ? <div className="text-center py-4 text-gray-500 text-sm">Loading details...</div> : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="text-sm font-medium text-gray-400 mb-2 flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" /> Issues ({issues.length})</h4>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {issues.slice(0, 10).map((issue: any) => (
                    <a key={issue.id} href={issue.html_url} target="_blank" rel="noopener noreferrer" className="block text-xs text-gray-300 hover:text-brand-400 py-1 border-b border-gray-800">
                      #{issue.number} {issue.title}
                    </a>
                  ))}
                  {issues.length === 0 && <p className="text-xs text-gray-600">No open issues</p>}
                </div>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-400 mb-2 flex items-center gap-1"><GitPullRequest className="w-3.5 h-3.5" /> Pull Requests ({prs.length})</h4>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {prs.slice(0, 10).map((pr: any) => (
                    <a key={pr.id} href={pr.html_url} target="_blank" rel="noopener noreferrer" className="block text-xs text-gray-300 hover:text-brand-400 py-1 border-b border-gray-800">
                      #{pr.number} {pr.title}
                    </a>
                  ))}
                  {prs.length === 0 && <p className="text-xs text-gray-600">No open PRs</p>}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
