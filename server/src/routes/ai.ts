import { Router, Request, Response, NextFunction } from 'express';
import { aiService, Message, getActiveConfig, ProviderConfig } from '../services/ai.service';
import { parseAndExecuteAction } from '../services/action.service';
import axios from 'axios';

/** Merge request headers into provider config (mobile client overrides) */
function cfgFromRequest(req: Request): ProviderConfig {
  const base = getActiveConfig();
  const headerKey   = req.headers['x-ai-key']   as string | undefined;
  const headerUrl   = req.headers['x-ai-url']   as string | undefined;
  const headerModel = req.headers['x-ai-model'] as string | undefined;
  return {
    ...base,
    apiKey:  headerKey   || base.apiKey,
    baseURL: headerUrl   || base.baseURL,
    model:   headerModel || base.model,
  };
}

const router = Router();
const wrap = (fn: Function) => (req: Request, res: Response, next: NextFunction) =>
  Promise.resolve(fn(req, res, next)).catch(next);

// ── Standard chat (non-streaming) ───────────────────────────────
router.post('/chat', wrap(async (req: Request, res: Response) => {
  const { messages, model, temperature, max_tokens, executeActions } = req.body;
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ success: false, error: 'messages array is required' });
  }
  const response = await aiService.chat(messages as Message[], { model, temperature, max_tokens });
  if (executeActions !== false) {
    const result = await parseAndExecuteAction(response);
    return res.json({ success: true, data: { content: result.text, raw: response, action: result.action } });
  }
  res.json({ success: true, data: { content: response, raw: response } });
}));

// ── SSE Streaming chat ───────────────────────────────────────────
router.post('/chat/stream', async (req: Request, res: Response) => {
  const { messages, model, temperature } = req.body;
  if (!messages || !Array.isArray(messages)) {
    res.status(400).json({ success: false, error: 'messages array is required' });
    return;
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.flushHeaders();

  const cfg = cfgFromRequest(req); // uses X-AI-Key / X-AI-URL / X-AI-Model headers if present

  const sendToken = (token: string) => res.write(`data: ${JSON.stringify({ token })}\n\n`);
  const sendDone = (fullText: string, action?: any) => {
    res.write(`data: ${JSON.stringify({ done: true, fullText, action })}\n\n`);
    res.end();
  };
  const sendError = (error: string) => {
    res.write(`data: ${JSON.stringify({ error })}\n\n`);
    res.end();
  };

  // Helper: detect if provider is PocketAPI (non-OpenAI-compat)
  const isPocket = !cfg.baseURL.includes('/v1') && !cfg.baseURL.includes('nvidia') &&
    !cfg.baseURL.includes('groq') && !cfg.baseURL.includes('openrouter') && !cfg.baseURL.includes('openai') && !cfg.baseURL.includes('x.ai');

  const SYSTEM = `You are an expert AI Coding Agent. Help with GitHub, code, Android development.
When performing GitHub/build operations include <action>{"type":"...","operation":"...","params":{...}}</action>.`;
  const apiMessages = [{ role: 'system', content: SYSTEM }, ...messages];

  try {
    if (isPocket) {
      // PocketAPI doesn't stream — simulate word-by-word
      const fullText = await aiService.chat(messages as Message[], { model, temperature });
      const words = fullText.split(' ');
      for (const word of words) {
        sendToken(word + ' ');
        await new Promise(r => setTimeout(r, 25));
      }
      // Run action detection
      const { text, action } = await parseAndExecuteAction(fullText);
      sendDone(text, action);
      return;
    }

    // OpenAI-compatible streaming
    const streamResp = await axios.post(
      `${cfg.baseURL}/chat/completions`,
      {
        model: model || cfg.model,
        messages: apiMessages,
        temperature: temperature ?? 0.7,
        max_tokens: 4096,
        stream: true,
      },
      {
        headers: {
          Authorization: `Bearer ${cfg.apiKey}`,
          'Content-Type': 'application/json',
          ...(cfg.baseURL.includes('openrouter') ? { 'HTTP-Referer': 'https://ai-agent.replit.app', 'X-Title': 'AI Coding Agent' } : {}),
        },
        responseType: 'stream',
        timeout: 90000,
      }
    );

    let fullText = '';
    let buffer = '';

    streamResp.data.on('data', (chunk: Buffer) => {
      buffer += chunk.toString();
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data:')) continue;
        const jsonStr = trimmed.slice(5).trim();
        if (jsonStr === '[DONE]') continue;
        try {
          const parsed = JSON.parse(jsonStr);
          const token = parsed.choices?.[0]?.delta?.content || '';
          if (token) {
            fullText += token;
            sendToken(token);
          }
        } catch { /* skip malformed */ }
      }
    });

    streamResp.data.on('end', async () => {
      try {
        const { text, action } = await parseAndExecuteAction(fullText);
        sendDone(text, action);
      } catch {
        sendDone(fullText);
      }
    });

    streamResp.data.on('error', (err: Error) => sendError(err.message));

  } catch (err: any) {
    sendError(err.response?.data?.error?.message || err.message || 'Stream error');
  }
});

// ── Code tools ───────────────────────────────────────────────────
router.post('/analyze', wrap(async (req: Request, res: Response) => {
  const { code, language } = req.body;
  if (!code) return res.status(400).json({ success: false, error: 'code is required' });
  const analysis = await aiService.analyzeCode(code, language || 'unknown');
  res.json({ success: true, data: { analysis } });
}));

router.post('/explain', wrap(async (req: Request, res: Response) => {
  const { code, language } = req.body;
  if (!code) return res.status(400).json({ success: false, error: 'code is required' });
  const explanation = await aiService.explainCode(code, language || 'unknown');
  res.json({ success: true, data: { explanation } });
}));

router.post('/fix', wrap(async (req: Request, res: Response) => {
  const { code, error, language } = req.body;
  if (!code || !error) return res.status(400).json({ success: false, error: 'code and error are required' });
  const fix = await aiService.suggestFix(code, error, language || 'unknown');
  res.json({ success: true, data: { fix } });
}));

router.post('/generate', wrap(async (req: Request, res: Response) => {
  const { description, filename } = req.body;
  if (!description || !filename) return res.status(400).json({ success: false, error: 'description and filename required' });
  const content = await aiService.generateFile(description, filename);
  res.json({ success: true, data: { content, filename } });
}));

router.post('/android/project', wrap(async (req: Request, res: Response) => {
  const { app_name, package_name } = req.body;
  if (!app_name || !package_name) return res.status(400).json({ success: false, error: 'app_name and package_name required' });
  const content = await aiService.generateAndroidProject(app_name, package_name);
  res.json({ success: true, data: { content } });
}));

router.post('/android/workflow', wrap(async (req: Request, res: Response) => {
  const { repo_name, build_type, java_version } = req.body;
  if (!repo_name) return res.status(400).json({ success: false, error: 'repo_name required' });
  const content = await aiService.generateAndroidWorkflow(repo_name, { buildType: build_type, javaVersion: java_version });
  res.json({ success: true, data: { content } });
}));

router.get('/models', wrap(async (_req: Request, res: Response) => {
  const models = await aiService.listModels();
  res.json({ success: true, data: { models } });
}));

export default router;
