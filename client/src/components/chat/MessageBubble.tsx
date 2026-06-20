import { Message } from '../../types';
import { Bot, User, CheckCircle, XCircle, ChevronDown, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { clsx } from 'clsx';
import ReactMarkdown from '../ui/MarkdownRenderer';

interface Props { message: Message }

export default function MessageBubble({ message }: Props) {
  const [showAction, setShowAction] = useState(false);
  const isUser = message.role === 'user';

  if (message.loading) {
    return (
      <div className="flex gap-3 items-start chat-message">
        <div className="w-8 h-8 rounded-full bg-brand-600/20 border border-brand-500/30 flex items-center justify-center shrink-0">
          <Bot className="w-4 h-4 text-brand-400" />
        </div>
        <div className="card flex items-center gap-2 py-3">
          <span className="text-gray-400 text-sm">Thinking</span>
          <span className="typing-dot w-1.5 h-1.5 rounded-full bg-brand-400 inline-block" />
          <span className="typing-dot w-1.5 h-1.5 rounded-full bg-brand-400 inline-block" />
          <span className="typing-dot w-1.5 h-1.5 rounded-full bg-brand-400 inline-block" />
        </div>
      </div>
    );
  }

  return (
    <div className={clsx('flex gap-3 items-start chat-message', isUser && 'flex-row-reverse')}>
      <div className={clsx(
        'w-8 h-8 rounded-full flex items-center justify-center shrink-0',
        isUser ? 'bg-gray-700 border border-gray-600' : 'bg-brand-600/20 border border-brand-500/30'
      )}>
        {isUser ? <User className="w-4 h-4 text-gray-300" /> : <Bot className="w-4 h-4 text-brand-400" />}
      </div>

      <div className={clsx('max-w-[80%] space-y-2', isUser && 'items-end flex flex-col')}>
        <div className={clsx(
          'rounded-xl px-4 py-3 text-sm',
          isUser
            ? 'bg-brand-600 text-white rounded-tr-sm'
            : 'bg-gray-900 border border-gray-800 text-gray-100 rounded-tl-sm'
        )}>
          {isUser ? (
            <p className="whitespace-pre-wrap">{message.content}</p>
          ) : (
            <ReactMarkdown content={message.content} />
          )}
        </div>

        {message.action && (
          <div className="w-full">
            <button
              onClick={() => setShowAction(v => !v)}
              className={clsx(
                'flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg border transition-colors',
                message.action.success
                  ? 'bg-green-900/30 border-green-800 text-green-400'
                  : 'bg-red-900/30 border-red-800 text-red-400'
              )}
            >
              {message.action.success
                ? <CheckCircle className="w-3 h-3" />
                : <XCircle className="w-3 h-3" />}
              {message.action.success ? 'Action executed successfully' : 'Action failed'}
              {showAction ? <ChevronDown className="w-3 h-3 ml-1" /> : <ChevronRight className="w-3 h-3 ml-1" />}
            </button>
            {showAction && (
              <pre className="mt-2 text-xs bg-gray-950 border border-gray-800 rounded-lg p-3 overflow-auto max-h-60 text-gray-400">
                {JSON.stringify(message.action.success ? message.action.data : message.action.error, null, 2)}
              </pre>
            )}
          </div>
        )}

        <span className="text-[10px] text-gray-600 px-1">
          {new Date(message.timestamp).toLocaleTimeString()}
        </span>
      </div>
    </div>
  );
}
