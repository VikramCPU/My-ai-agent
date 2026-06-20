import { useState } from 'react';
import { Copy, Check } from 'lucide-react';

interface Props { content: string }

export default function MarkdownRenderer({ content }: Props) {
  const parts = content.split(/(```[\s\S]*?```)/g);

  return (
    <div className="prose prose-invert prose-sm max-w-none space-y-2">
      {parts.map((part, i) => {
        if (part.startsWith('```')) {
          const lines = part.slice(3, -3).split('\n');
          const lang = lines[0].trim();
          const code = lines.slice(1).join('\n');
          return <CodeBlock key={i} code={code} lang={lang} />;
        }
        return <MarkdownText key={i} text={part} />;
      })}
    </div>
  );
}

function CodeBlock({ code, lang }: { code: string; lang: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="relative group rounded-lg overflow-hidden border border-gray-700 bg-gray-950">
      {lang && <div className="px-3 py-1 bg-gray-800 text-xs text-gray-400 font-mono border-b border-gray-700">{lang}</div>}
      <button onClick={copy} className="absolute top-2 right-2 p-1.5 rounded bg-gray-700 hover:bg-gray-600 text-gray-400 hover:text-gray-200 transition-colors opacity-0 group-hover:opacity-100">
        {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
      </button>
      <pre className="p-3 overflow-x-auto text-xs text-gray-300 font-mono"><code>{code}</code></pre>
    </div>
  );
}

function MarkdownText({ text }: { text: string }) {
  const html = text
    .replace(/^### (.+)$/gm, '<h3 class="text-base font-semibold text-gray-200 mt-3 mb-1">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-lg font-semibold text-gray-100 mt-4 mb-2">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="text-xl font-bold text-gray-100 mt-4 mb-2">$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong class="text-gray-200 font-semibold">$1</strong>')
    .replace(/\*(.+?)\*/g, '<em class="text-gray-300">$1</em>')
    .replace(/`([^`]+)`/g, '<code class="bg-gray-800 text-brand-300 px-1 py-0.5 rounded text-xs font-mono">$1</code>')
    .replace(/^- (.+)$/gm, '<li class="ml-4 text-gray-300 list-disc">$1</li>')
    .replace(/^\d+\. (.+)$/gm, '<li class="ml-4 text-gray-300 list-decimal">$1</li>')
    .replace(/❌|✅|⚠️|🔧|🚀|📦|🤖|⚡/g, m => `<span>${m}</span>`)
    .split('\n').map(l => l.startsWith('<') ? l : l ? `<p class="text-gray-300">${l}</p>` : '').join('');

  return <div dangerouslySetInnerHTML={{ __html: html }} className="space-y-1" />;
}
