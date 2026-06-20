import { useRef, useEffect, useState, KeyboardEvent } from 'react';
import { Send, Trash2, Bot, Zap, Square, History } from 'lucide-react';
import { useChat } from '../hooks/useChat';
import MessageBubble from '../components/chat/MessageBubble';

const QUICK = [
  'Show my repositories',
  'Create repo called android-demo',
  'Generate Android project MyApp with package com.example.myapp and push to VikramCPU/My-ai-agent',
  'Create GitHub Actions APK workflow for repo My-ai-agent',
  'Create issue in VikramCPU/My-ai-agent titled "Test issue from AI Agent"',
];

export default function Chat() {
  const { messages, loading, sendMessage, stopGeneration, clearChat } = useChat();
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput('');
    sendMessage(text);
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  };

  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  };

  const onInput = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 160) + 'px';
  };

  const savedCount = messages.filter(m => !m.loading && m.id !== 'welcome').length;

  return (
    <div className="flex flex-col h-full max-h-[calc(100vh-8rem)] gap-4">
      <div className="flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <Bot className="w-5 h-5 text-brand-400" />
          <h2 className="font-semibold text-gray-200">AI Chat</h2>
          <span className="badge badge-blue"><Zap className="w-3 h-3" /> Streaming</span>
        </div>
        <div className="flex items-center gap-2">
          {savedCount > 0 && (
            <span className="flex items-center gap-1 text-xs text-gray-500">
              <History className="w-3 h-3" /> {savedCount} saved
            </span>
          )}
          <button onClick={clearChat} className="btn-ghost text-xs">
            <Trash2 className="w-3.5 h-3.5" /> Clear
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 pr-2 min-h-0">
        {messages.map(msg => <MessageBubble key={msg.id} message={msg} />)}
        <div ref={bottomRef} />
      </div>

      <div className="space-y-2 shrink-0">
        <div className="flex flex-wrap gap-1.5">
          {QUICK.map(q => (
            <button
              key={q}
              onClick={() => { setInput(q); textareaRef.current?.focus(); }}
              className="text-xs px-2.5 py-1 rounded-full bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-400 hover:text-gray-200 transition-colors"
            >
              {q.length > 40 ? q.slice(0, 40) + '…' : q}
            </button>
          ))}
        </div>

        <div className="flex gap-2 items-end bg-gray-900 border border-gray-700 rounded-xl p-3 focus-within:border-brand-500 transition-colors">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={onKey}
            onInput={onInput}
            placeholder="Ask anything — create repos, generate Android APKs, fix code..."
            rows={1}
            className="flex-1 bg-transparent resize-none outline-none text-sm text-gray-100 placeholder-gray-500 font-sans"
            disabled={loading}
          />
          {loading ? (
            <button
              onClick={stopGeneration}
              className="p-2 rounded-lg bg-red-600 hover:bg-red-500 text-white transition-colors shrink-0"
              title="Stop generation"
            >
              <Square className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={send}
              disabled={!input.trim()}
              className="p-2 rounded-lg bg-brand-600 hover:bg-brand-500 text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0"
            >
              <Send className="w-4 h-4" />
            </button>
          )}
        </div>
        <p className="text-xs text-gray-600 text-center">
          Enter to send · Shift+Enter new line · Chat auto-saved in browser
        </p>
      </div>
    </div>
  );
}
