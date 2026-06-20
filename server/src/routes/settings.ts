import { Router, Request, Response, NextFunction } from 'express';
import { getActiveConfig, setActiveConfig, PROVIDER_PRESETS } from '../services/ai.service';
import { aiService } from '../services/ai.service';
import { logger } from '../utils/logger';

const router = Router();
const wrap = (fn: Function) => (req: Request, res: Response, next: NextFunction) =>
  Promise.resolve(fn(req, res, next)).catch(next);

// Get current config (without exposing full API key)
router.get('/ai-provider', wrap(async (_req: Request, res: Response) => {
  const cfg = getActiveConfig();
  res.json({
    success: true,
    data: {
      name: cfg.name,
      baseURL: cfg.baseURL,
      model: cfg.model,
      hasApiKey: !!cfg.apiKey,
      apiKeyPreview: cfg.apiKey ? `${cfg.apiKey.slice(0, 8)}...` : '',
    },
  });
}));

// Update AI provider config
router.post('/ai-provider', wrap(async (req: Request, res: Response) => {
  const { name, baseURL, apiKey, model, preset } = req.body;

  if (preset && PROVIDER_PRESETS[preset]) {
    const p = PROVIDER_PRESETS[preset];
    setActiveConfig({
      name: p.name,
      baseURL: p.baseURL,
      model: p.model,
      ...(apiKey ? { apiKey } : {}),
    });
    logger.info('Applied provider preset', { preset });
  } else {
    if (!baseURL) return res.status(400).json({ success: false, error: 'baseURL is required' });
    setActiveConfig({ name, baseURL, model, ...(apiKey ? { apiKey } : {}) });
  }

  const cfg = getActiveConfig();
  res.json({
    success: true,
    data: { name: cfg.name, baseURL: cfg.baseURL, model: cfg.model, hasApiKey: !!cfg.apiKey },
  });
}));

// Test current connection
router.post('/ai-provider/test', wrap(async (_req: Request, res: Response) => {
  const result = await aiService.testConnection();
  res.json({ success: result.success, data: result });
}));

// List all presets
router.get('/ai-provider/presets', wrap(async (_req: Request, res: Response) => {
  res.json({ success: true, data: PROVIDER_PRESETS });
}));

export default router;
