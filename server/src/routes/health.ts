import { Router, Request, Response } from 'express';
import { githubService } from '../services/github.service';

const router = Router();

router.get('/', async (_req: Request, res: Response) => {
  const checks: Record<string, any> = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    github: { configured: !!process.env.GITHUB_PAT },
    nvidia: { configured: !!process.env.NVIDIA_API_KEY },
  };

  try {
    const user = await githubService.getAuthenticatedUser();
    checks.github.connected = true;
    checks.github.user = user.login;
  } catch (e: any) {
    checks.github.connected = false;
    checks.github.error = e.message;
  }

  const allOk = checks.github.connected && checks.nvidia.configured;
  res.status(allOk ? 200 : 207).json(checks);
});

export default router;
