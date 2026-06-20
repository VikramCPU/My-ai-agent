import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, MessageSquare, GitBranch, FileCode2,
  Hammer, ScrollText, Bot, Zap, Settings2, Smartphone
} from 'lucide-react';
import { clsx } from 'clsx';

const nav = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/chat', icon: MessageSquare, label: 'AI Chat' },
  { to: '/repositories', icon: GitBranch, label: 'Repositories' },
  { to: '/editor', icon: FileCode2, label: 'File Editor' },
  { to: '/android', icon: Smartphone, label: 'Android / APK' },
  { to: '/builds', icon: Hammer, label: 'Build Status' },
  { to: '/logs', icon: ScrollText, label: 'Error Logs' },
  { to: '/settings', icon: Settings2, label: 'AI Provider' },
];

export default function Sidebar() {
  return (
    <aside className="w-60 bg-gray-900 border-r border-gray-800 flex flex-col shrink-0">
      <div className="flex items-center gap-3 px-5 py-5 border-b border-gray-800">
        <div className="p-2 rounded-xl bg-brand-600/20 border border-brand-500/30">
          <Bot className="w-5 h-5 text-brand-400" />
        </div>
        <div>
          <h1 className="font-semibold text-gray-100 text-sm leading-tight">AI Coding Agent</h1>
          <p className="text-xs text-gray-500 flex items-center gap-1">
            <Zap className="w-3 h-3 text-yellow-400" /> NVIDIA Powered
          </p>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {nav.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150',
                isActive
                  ? 'bg-brand-600/20 text-brand-400 border border-brand-500/20'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
              )
            }
          >
            <Icon className="w-4 h-4 shrink-0" />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="px-4 py-4 border-t border-gray-800">
        <div className="flex items-center gap-2 text-xs text-gray-600">
          <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
          Connected & Ready
        </div>
        <p className="text-[10px] text-gray-700 mt-1">v1.0.0 — 100% Complete</p>
      </div>
    </aside>
  );
}
