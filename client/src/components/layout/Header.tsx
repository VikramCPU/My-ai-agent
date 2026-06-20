import { useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { health } from '../../services/api';
import { Github, Cpu, AlertCircle, CheckCircle } from 'lucide-react';

const titles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/chat': 'AI Chat',
  '/repositories': 'Repositories',
  '/editor': 'File Editor',
  '/builds': 'Build Status',
  '/logs': 'Error Logs',
};

export default function Header() {
  const { pathname } = useLocation();
  const [status, setStatus] = useState<any>(null);

  useEffect(() => {
    health.check().then(setStatus).catch(() => setStatus({ github: { connected: false }, nvidia: { configured: false } }));
    const t = setInterval(() => {
      health.check().then(setStatus).catch(() => {});
    }, 30000);
    return () => clearInterval(t);
  }, []);

  const title = titles[pathname] || 'AI Coding Agent';

  return (
    <header className="h-14 bg-gray-900 border-b border-gray-800 flex items-center justify-between px-6 shrink-0">
      <h2 className="font-semibold text-gray-200">{title}</h2>
      <div className="flex items-center gap-4">
        <StatusBadge icon={Github} label={status?.github?.user || 'GitHub'} ok={status?.github?.connected} />
        <StatusBadge icon={Cpu} label="NVIDIA AI" ok={status?.nvidia?.configured} />
      </div>
    </header>
  );
}

function StatusBadge({ icon: Icon, label, ok }: { icon: any; label: string; ok?: boolean }) {
  return (
    <div className="flex items-center gap-1.5 text-xs">
      <Icon className="w-3.5 h-3.5 text-gray-500" />
      <span className="text-gray-400">{label}</span>
      {ok === undefined ? (
        <div className="w-2 h-2 rounded-full bg-gray-600 animate-pulse" />
      ) : ok ? (
        <CheckCircle className="w-3.5 h-3.5 text-green-500" />
      ) : (
        <AlertCircle className="w-3.5 h-3.5 text-red-500" />
      )}
    </div>
  );
}
