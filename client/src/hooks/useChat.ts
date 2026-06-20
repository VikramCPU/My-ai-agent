import { useState, useCallback, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Message } from '../types';

const STORAGE_KEY = 'ai_agent_chat_history';
const MAX_STORED = 100;

function loadHistory(): Message[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Message[];
    return parsed.map(m => ({ ...m, timestamp: new Date(m.timestamp) }));
  } catch { return []; }
}

function saveHistory(messages: Message[]) {
  try {
    const toSave = messages.filter(m => !m.loading).slice(-MAX_STORED);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
  } catch { /* quota exceeded — ignore */ }
}

const WELCOME: Message = {
  id: 'welcome',
  role: 'assistant',
  content: `# Welcome to AI Coding Agent! 🤖

I can help you with:
- **GitHub**: Create repos, manage files, branches, PRs, issues
- **Code**: Analyze bugs, generate files, explain code  
- **Android**: Generate full projects, build APKs via GitHub Actions
- **Auto-fix**: Detect build failures and fix them automatically

**Try asking:**
- "Create a new repo called my-android-app"
- "Generate Android project MyApp with package com.example.myapp and push to VikramCPU/My-ai-agent"
- "Show my repositories"
- "Create a GitHub Actions APK workflow for repo My-ai-agent"
- "Analyze this code: [paste code]"`,
  timestamp: new Date(),
};

export function useChat() {
  const stored = loadHistory();
  const [messages, setMessages] = useState<Message[]>(stored.length > 0 ? stored : [WELCOME]);
  const [loading, setLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  // Persist on every change
  useEffect(() => {
    saveHistory(messages);
  }, [messages]);

  const sendMessage = useCallback(async (content: string) => {
    if (loading) return;

    const userMsg: Message = { id: uuidv4(), role: 'user', content, timestamp: new Date() };
    const streamId = uuidv4();
    const streamMsg: Message = { id: streamId, role: 'assistant', content: '', timestamp: new Date(), loading: true };

    setMessages(prev => [...prev, userMsg, streamMsg]);
    setLoading(true);

    const apiMessages = [...messages, userMsg]
      .filter(m => !m.loading && m.id !== 'welcome')
      .slice(-20)
      .map(m => ({ role: m.role, content: m.content }));

    abortRef.current = new AbortController();

    try {
      const response = await fetch('/api/ai/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: apiMessages, executeActions: true }),
        signal: abortRef.current.signal,
      });

      if (!response.ok || !response.body) {
        throw new Error(`HTTP ${response.status}: ${await response.text()}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = '';
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data:')) continue;
          const jsonStr = trimmed.slice(5).trim();
          if (!jsonStr) continue;

          try {
            const parsed = JSON.parse(jsonStr);

            if (parsed.error) {
              setMessages(prev => prev.map(m =>
                m.id === streamId ? { ...m, content: `❌ ${parsed.error}`, loading: false } : m
              ));
              return;
            }

            if (parsed.token) {
              accumulated += parsed.token;
              setMessages(prev => prev.map(m =>
                m.id === streamId ? { ...m, content: accumulated, loading: false } : m
              ));
            }

            if (parsed.done) {
              const finalText = parsed.fullText || accumulated;
              setMessages(prev => prev.map(m =>
                m.id === streamId ? {
                  ...m,
                  content: finalText || accumulated,
                  loading: false,
                  action: parsed.action,
                } : m
              ));
            }
          } catch { /* malformed chunk — skip */ }
        }
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        setMessages(prev => prev.map(m =>
          m.id === streamId ? { ...m, content: accumulated || '⏹ Stopped.', loading: false } : m
        ));
      } else {
        setMessages(prev => prev.map(m =>
          m.id === streamId ? { ...m, content: `❌ Error: ${err.message}`, loading: false } : m
        ));
      }
    } finally {
      setLoading(false);
      abortRef.current = null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, loading]);

  const stopGeneration = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const clearChat = useCallback(() => {
    const fresh = [{ ...WELCOME, id: 'welcome', timestamp: new Date() }];
    setMessages(fresh);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return { messages, loading, sendMessage, stopGeneration, clearChat };
}
