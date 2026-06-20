import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { GitBranch, MessageSquare, Hammer, FileCode2, Star, GitFork, AlertCircle, TrendingUp, ArrowRight } from 'lucide-react';
import { github, health } from '../services/api';
import { Repository } from '../types';

export default function Dashboard() {
  const [user, setUser] = useState<any>(null);
  const [repos, setRepos] = useState<Repository[]>([]);
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      github.getUser().catch(() => null),
      github.listRepos({ per_page: 5, sort: 'updated' }).catch(() => []),
      health.check().catch(() => null),
    ]).then(([u, r, s]) => {
      setUser(u); setRepos(r); setStatus(s);
    }).finally(() => setLoading(false));
  }, []);

  const stats = [
    { label: 'Total Repos', value: user?.public_repos ?? '—', icon: GitBranch, color: 'text-brand-400', bg: 'bg-brand-600/10 border-brand-500/20' },
    { label: 'Followers', value: user?.followers ?? '—', icon: TrendingUp, color: 'text-green-400', bg: 'bg-green-600/10 border-green-500/20' },
    { label: 'Open Issues', value: repos.reduce((a, r) => a + r.open_issues_count, 0), icon: AlertCircle, color: 'text-yellow-400', bg: 'bg-yellow-600/10 border-yellow-500/20' },
    { label: 'Stars Earned', value: repos.reduce((a, r) => a + r.stargazers_count, 0), icon: Star, color: 'text-orange-400', bg: 'bg-orange-600/10 border-orange-500/20' },
  ];

  const quickLinks = [
    { to: '/chat', icon: MessageSquare, label: 'AI Chat', desc: 'Talk to the AI agent', color: 'text-brand-400' },
    { to: '/repositories', icon: GitBranch, label: 'Repositories', desc: 'Manage your repos', color: 'text-green-400' },
    { to: '/editor', icon: FileCode2, label: 'File Editor', desc: 'Edit code with AI', color: 'text-yellow-400' },
    { to: '/builds', icon: Hammer, label: 'Build Status', desc: 'Monitor APK builds', color: 'text-purple-400' },
  ];

  if (loading) return <div className="flex items-center justify-center h-full"><div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6 animate-fade-in">
      {user && (
        <div className="card flex items-center gap-4">
          <img src={user.avatar_url} alt={user.login} className="w-14 h-14 rounded-full border-2 border-brand-500/30" />
          <div>
            <h2 className="font-semibold text-gray-100 text-lg">{user.name || user.login}</h2>
            <p className="text-sm text-gray-400">@{user.login} · {user.bio || 'GitHub Developer'}</p>
            <div className="flex gap-3 mt-1">
              <span className={`badge ${status?.github?.connected ? 'badge-green' : 'badge-red'}`}>
                {status?.github?.connected ? '✓ GitHub Connected' : '✗ GitHub Error'}
              </span>
              <span className={`badge ${status?.nvidia?.configured ? 'badge-green' : 'badge-red'}`}>
                {status?.nvidia?.configured ? '✓ AI Ready' : '✗ AI Error'}
              </span>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className={`card border ${bg}`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-400">{label}</span>
              <Icon className={`w-4 h-4 ${color}`} />
            </div>
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {quickLinks.map(({ to, icon: Icon, label, desc, color }) => (
          <Link key={to} to={to} className="card hover:border-gray-600 transition-colors group cursor-pointer">
            <Icon className={`w-8 h-8 ${color} mb-3`} />
            <h3 className="font-medium text-gray-200 group-hover:text-white">{label}</h3>
            <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
            <ArrowRight className="w-4 h-4 text-gray-600 group-hover:text-gray-400 mt-2 transition-colors" />
          </Link>
        ))}
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-200 flex items-center gap-2"><GitBranch className="w-4 h-4 text-brand-400" /> Recent Repositories</h3>
          <Link to="/repositories" className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1">View all <ArrowRight className="w-3 h-3" /></Link>
        </div>
        <div className="space-y-3">
          {repos.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">No repositories found</p>
          ) : repos.map(repo => (
            <div key={repo.id} className="flex items-center justify-between py-2 border-b border-gray-800 last:border-0">
              <div>
                <a href={repo.html_url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-gray-200 hover:text-brand-400">{repo.name}</a>
                {repo.description && <p className="text-xs text-gray-500 truncate max-w-xs">{repo.description}</p>}
              </div>
              <div className="flex items-center gap-3 text-xs text-gray-500">
                {repo.language && <span className="badge badge-gray">{repo.language}</span>}
                <span className="flex items-center gap-1"><Star className="w-3 h-3" />{repo.stargazers_count}</span>
                <span className="flex items-center gap-1"><GitFork className="w-3 h-3" />{repo.forks_count}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
