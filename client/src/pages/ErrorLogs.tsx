import { useState, useEffect } from 'react';
import { ScrollText, AlertCircle, Info, AlertTriangle, Bug, Trash2, RefreshCw, Filter } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { LogEntry } from '../types';
import { clsx } from 'clsx';

const LEVEL_ICONS: Record<string, any> = { error: AlertCircle, warn: AlertTriangle, info: Info, debug: Bug };
const LEVEL_COLORS: Record<string, string> = {
  error: 'text-red-400 bg-red-900/20 border-red-800',
  warn: 'text-yellow-400 bg-yellow-900/20 border-yellow-800',
  info: 'text-blue-400 bg-blue-900/20 border-blue-800',
  debug: 'text-gray-400 bg-gray-900/20 border-gray-800',
};

function useLogs() {
  const [logs, setLogs] = useState<LogEntry[]>([]);

  useEffect(() => {
    const initial: LogEntry[] = [
      { id: uuidv4(), level: 'info', message: 'AI Coding Agent started successfully', timestamp: new Date(), meta: { version: '1.0.0' } },
      { id: uuidv4(), level: 'info', message: 'GitHub API connected', timestamp: new Date(), meta: {} },
      { id: uuidv4(), level: 'info', message: 'NVIDIA AI API configured', timestamp: new Date(), meta: { model: 'llama-3.1-70b' } },
    ];
    setLogs(initial);

    const intercept = async () => {
      try {
        const res = await fetch('/api/health');
        const data = await res.json();
        if (data.github?.connected) {
          addLog('info', `GitHub connected as @${data.github.user}`);
        }
        if (!data.github?.connected) {
          addLog('error', `GitHub connection failed: ${data.github?.error || 'Unknown error'}`);
        }
      } catch (e: any) {
        addLog('error', `Health check failed: ${e.message}`);
      }
    };
    intercept();
  }, []);

  const addLog = (level: LogEntry['level'], message: string, meta?: Record<string, any>) => {
    setLogs(prev => [{ id: uuidv4(), level, message, timestamp: new Date(), meta }, ...prev]);
  };

  const clearLogs = () => setLogs([]);

  return { logs, addLog, clearLogs };
}

export default function ErrorLogs() {
  const { logs, addLog, clearLogs } = useLogs();
  const [filter, setFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const refresh = async () => {
    setRefreshing(true);
    try {
      const res = await fetch('/api/health');
      const data = await res.json();
      addLog('info', 'Health check refreshed', data);
      if (!data.github?.connected) addLog('warn', 'GitHub API connection issue detected');
    } catch (e: any) {
      addLog('error', `Health check failed: ${e.message}`);
    } finally {
      setRefreshing(false);
    }
  };

  const filtered = logs.filter(log => {
    if (filter !== 'all' && log.level !== filter) return false;
    if (search && !log.message.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const counts = { error: logs.filter(l => l.level === 'error').length, warn: logs.filter(l => l.level === 'warn').length, info: logs.filter(l => l.level === 'info').length, debug: logs.filter(l => l.level === 'debug').length };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Object.entries(counts).map(([level, count]) => {
          const Icon = LEVEL_ICONS[level];
          return (
            <button key={level} onClick={() => setFilter(filter === level ? 'all' : level)}
              className={clsx('card text-left transition-all border', filter === level ? LEVEL_COLORS[level] : 'hover:border-gray-600')}>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400 capitalize">{level}</span>
                <Icon className={`w-4 h-4 ${LEVEL_COLORS[level].split(' ')[0]}`} />
              </div>
              <p className="text-2xl font-bold mt-1">{count}</p>
            </button>
          );
        })}
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input className="input w-full pl-9" placeholder="Search logs..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="input" value={filter} onChange={e => setFilter(e.target.value)}>
          <option value="all">All Levels</option>
          <option value="error">Errors</option>
          <option value="warn">Warnings</option>
          <option value="info">Info</option>
          <option value="debug">Debug</option>
        </select>
        <button onClick={refresh} className="btn-secondary" disabled={refreshing}><RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} /> Refresh</button>
        <button onClick={clearLogs} className="btn-secondary text-red-400 hover:text-red-300"><Trash2 className="w-4 h-4" /> Clear</button>
      </div>

      <div className="card">
        <div className="flex items-center gap-2 mb-3">
          <ScrollText className="w-4 h-4 text-brand-400" />
          <h3 className="font-medium text-gray-200">Application Logs</h3>
          <span className="badge badge-gray">{filtered.length} entries</span>
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-600">
            <ScrollText className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p className="text-sm">No logs matching filters</p>
          </div>
        ) : (
          <div className="space-y-1.5 max-h-[60vh] overflow-y-auto font-mono text-xs">
            {filtered.map(log => {
              const Icon = LEVEL_ICONS[log.level];
              return (
                <div key={log.id} className={clsx('flex items-start gap-3 px-3 py-2 rounded-lg border', LEVEL_COLORS[log.level])}>
                  <Icon className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${LEVEL_COLORS[log.level].split(' ')[0]}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-gray-500">{log.timestamp.toLocaleTimeString()}</span>
                      <span className={`font-semibold uppercase text-[10px] ${LEVEL_COLORS[log.level].split(' ')[0]}`}>[{log.level}]</span>
                      <span className="text-gray-200">{log.message}</span>
                    </div>
                    {log.meta && Object.keys(log.meta).length > 0 && (
                      <pre className="text-gray-500 mt-0.5 text-[10px] overflow-x-auto">{JSON.stringify(log.meta, null, 2)}</pre>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
