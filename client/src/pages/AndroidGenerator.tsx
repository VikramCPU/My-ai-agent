import { useState } from 'react';
import { Smartphone, Zap, Github, CheckCircle, XCircle, Loader, Code2, Play, RefreshCw, AlertCircle, ExternalLink } from 'lucide-react';
import { build } from '../services/api';
import toast from 'react-hot-toast';
import { clsx } from 'clsx';

interface AutoFixEvent {
  stage: string;
  message: string;
  attempt?: number;
  maxAttempts?: number;
  commitSha?: string;
  runId?: number;
  error?: string;
}

interface AutoFixLog extends AutoFixEvent {
  id: string;
  ts: Date;
}

export default function AndroidGenerator() {
  const [form, setForm] = useState({ owner: 'VikramCPU', repo: 'My-ai-agent', appName: '', packageName: '', branch: 'main' });
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<any>(null);

  const [autoFixForm, setAutoFixForm] = useState({ owner: 'VikramCPU', repo: 'My-ai-agent', workflow: 'build-apk.yml', branch: 'main', maxAttempts: 5 });
  const [autoFixLogs, setAutoFixLogs] = useState<AutoFixLog[]>([]);
  const [autoFixRunning, setAutoFixRunning] = useState(false);
  const [autoFixDone, setAutoFixDone] = useState<{ success: boolean } | null>(null);
  const [esRef, setEsRef] = useState<EventSource | null>(null);

  const generateAndPush = async () => {
    if (!form.owner || !form.repo || !form.appName || !form.packageName) {
      return toast.error('Fill all fields');
    }
    setGenerating(true); setResult(null);
    try {
      const data = await build.generateAndPush({
        owner: form.owner, repo: form.repo,
        app_name: form.appName, package_name: form.packageName, branch: form.branch,
      });
      setResult(data);
      toast.success(`✅ ${data.fileCount} files pushed to GitHub!`);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setGenerating(false);
    }
  };

  const startAutoFix = () => {
    if (autoFixRunning) return;
    setAutoFixLogs([]);
    setAutoFixDone(null);
    setAutoFixRunning(true);

    const url = build.autoFixUrl(autoFixForm.owner, autoFixForm.repo, autoFixForm.workflow, autoFixForm.branch, autoFixForm.maxAttempts);
    const es = new EventSource(url);
    setEsRef(es);

    es.addEventListener('status', (e: MessageEvent) => {
      const data: AutoFixEvent = JSON.parse(e.data);
      setAutoFixLogs(prev => [...prev, { ...data, id: Math.random().toString(36).slice(2), ts: new Date() }]);
    });

    es.addEventListener('done', (e: MessageEvent) => {
      const data = JSON.parse(e.data);
      setAutoFixDone(data);
      setAutoFixRunning(false);
      es.close();
      if (data.success) toast.success('🎉 Build succeeded!');
      else toast.error('Build failed after max attempts');
    });

    es.addEventListener('error', () => {
      setAutoFixRunning(false);
      setAutoFixLogs(prev => [...prev, { stage: 'failed', message: 'SSE connection error', id: 'err', ts: new Date() }]);
      es.close();
    });
  };

  const stopAutoFix = () => {
    esRef?.close();
    setAutoFixRunning(false);
    setAutoFixLogs(prev => [...prev, { stage: 'failed', message: '⏹ Stopped by user', id: 'stop', ts: new Date() }]);
  };

  const stageColor: Record<string, string> = {
    success: 'text-green-400', failed: 'text-red-400', max_retries: 'text-red-400',
    analyzing: 'text-purple-400', fixing: 'text-yellow-400', committing: 'text-blue-400',
    triggering: 'text-brand-400', waiting: 'text-gray-400', checking: 'text-gray-300',
    fetching_logs: 'text-orange-400',
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h2 className="text-lg font-semibold text-gray-200 flex items-center gap-2">
          <Smartphone className="w-5 h-5 text-green-400" /> Android Project Generator
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          AI generates a complete Android project and pushes all files to GitHub in one commit.
        </p>
      </div>

      {/* ── Generate & Push ─────────────────────────────────── */}
      <div className="card border border-green-700/40 space-y-4">
        <h3 className="font-medium text-gray-200 flex items-center gap-2">
          <Code2 className="w-4 h-4 text-green-400" /> Generate Android Project → Push to GitHub
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <input className="input" placeholder="GitHub owner (e.g. VikramCPU)" value={form.owner} onChange={e => setForm(f => ({ ...f, owner: e.target.value }))} />
          <input className="input" placeholder="Repo name (e.g. My-ai-agent)" value={form.repo} onChange={e => setForm(f => ({ ...f, repo: e.target.value }))} />
          <input className="input" placeholder="App name (e.g. MyApp)" value={form.appName} onChange={e => setForm(f => ({ ...f, appName: e.target.value }))} />
          <input className="input" placeholder="Package (e.g. com.vikram.myapp)" value={form.packageName} onChange={e => setForm(f => ({ ...f, packageName: e.target.value }))} />
          <input className="input" placeholder="Branch (default: main)" value={form.branch} onChange={e => setForm(f => ({ ...f, branch: e.target.value }))} />
        </div>
        <button onClick={generateAndPush} disabled={generating} className="btn-primary">
          {generating ? <><Loader className="w-4 h-4 animate-spin" /> Generating & Pushing...</> : <><Zap className="w-4 h-4" /> Generate & Push to GitHub</>}
        </button>

        {generating && (
          <div className="text-sm text-gray-400 bg-gray-800 rounded-lg p-3 space-y-1">
            <p className="flex items-center gap-2"><Loader className="w-3.5 h-3.5 animate-spin text-brand-400" /> AI generating project files...</p>
            <p className="text-xs text-gray-500">This may take 30-60 seconds. AI is writing all Gradle, Kotlin, XML, Manifest, and GitHub Actions files.</p>
          </div>
        )}

        {result && (
          <div className="bg-green-900/20 border border-green-700 rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-2 text-green-400 font-medium">
              <CheckCircle className="w-5 h-5" /> {result.fileCount} files pushed successfully!
            </div>
            <div className="text-xs space-y-1">
              <p className="text-gray-400">Commit: <span className="font-mono text-green-300">{result.commitSha?.slice(0, 12)}...</span></p>
              <a href={result.commitUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-brand-400 hover:text-brand-300">
                <ExternalLink className="w-3 h-3" /> View on GitHub
              </a>
            </div>
            <div className="max-h-40 overflow-y-auto">
              <p className="text-xs text-gray-500 mb-1">Files pushed:</p>
              {result.files?.map((f: string) => (
                <p key={f} className="text-xs font-mono text-gray-400">📄 {f}</p>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Auto-fix & Rebuild Loop ─────────────────────────── */}
      <div className="card border border-yellow-700/40 space-y-4">
        <h3 className="font-medium text-gray-200 flex items-center gap-2">
          <RefreshCw className="w-4 h-4 text-yellow-400" /> Auto-fix & Rebuild Loop
        </h3>
        <p className="text-xs text-gray-500">
          When a GitHub Actions APK build fails, the agent automatically fetches logs, uses AI to fix the code, pushes fixes, and triggers a new build — repeating until success.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <input className="input" placeholder="Owner" value={autoFixForm.owner} onChange={e => setAutoFixForm(f => ({ ...f, owner: e.target.value }))} />
          <input className="input" placeholder="Repo" value={autoFixForm.repo} onChange={e => setAutoFixForm(f => ({ ...f, repo: e.target.value }))} />
          <input className="input" placeholder="Workflow file (e.g. build-apk.yml)" value={autoFixForm.workflow} onChange={e => setAutoFixForm(f => ({ ...f, workflow: e.target.value }))} />
          <input className="input" placeholder="Branch" value={autoFixForm.branch} onChange={e => setAutoFixForm(f => ({ ...f, branch: e.target.value }))} />
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-400 whitespace-nowrap">Max Attempts:</label>
            <input type="number" min={1} max={10} className="input w-20" value={autoFixForm.maxAttempts} onChange={e => setAutoFixForm(f => ({ ...f, maxAttempts: parseInt(e.target.value) || 5 }))} />
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={startAutoFix} disabled={autoFixRunning} className="btn-primary">
            <Play className="w-4 h-4" /> Start Auto-fix Loop
          </button>
          {autoFixRunning && (
            <button onClick={stopAutoFix} className="btn-danger">
              <XCircle className="w-4 h-4" /> Stop
            </button>
          )}
        </div>

        {autoFixDone && (
          <div className={clsx('flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium', autoFixDone.success ? 'bg-green-900/30 border border-green-700 text-green-400' : 'bg-red-900/30 border border-red-700 text-red-400')}>
            {autoFixDone.success ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            {autoFixDone.success ? '✅ Build succeeded!' : '❌ Build failed after all attempts'}
          </div>
        )}

        {autoFixLogs.length > 0 && (
          <div className="bg-gray-950 border border-gray-800 rounded-lg p-3 max-h-72 overflow-y-auto font-mono text-xs space-y-1">
            {autoFixLogs.map(log => (
              <div key={log.id} className="flex items-start gap-2">
                <span className="text-gray-600 shrink-0">{log.ts.toLocaleTimeString()}</span>
                <span className={stageColor[log.stage] || 'text-gray-400'}>[{log.stage}]</span>
                <span className="text-gray-300">{log.message}</span>
                {log.commitSha && (
                  <a href={`https://github.com/${autoFixForm.owner}/${autoFixForm.repo}/commit/${log.commitSha}`} target="_blank" rel="noopener noreferrer" className="text-brand-400 hover:underline shrink-0">
                    {log.commitSha.slice(0, 7)} <ExternalLink className="w-2.5 h-2.5 inline" />
                  </a>
                )}
              </div>
            ))}
            {autoFixRunning && <div className="flex items-center gap-2 text-gray-500"><Loader className="w-3 h-3 animate-spin" /> Watching...</div>}
          </div>
        )}
      </div>

      {/* ── Push Agent Source to GitHub ──────────────────────── */}
      <PushSourceSection />
    </div>
  );
}

function PushSourceSection() {
  const [form, setForm] = useState({ owner: 'VikramCPU', repo: 'My-ai-agent', branch: 'main' });
  const [pushing, setPushing] = useState(false);
  const [result, setResult] = useState<any>(null);

  const push = async () => {
    setPushing(true);
    try {
      const data = await build.pushSource(form);
      setResult(data);
      toast.success(`✅ ${data.fileCount} source files pushed to GitHub!`);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setPushing(false);
    }
  };

  return (
    <div className="card border border-brand-700/40 space-y-4">
      <h3 className="font-medium text-gray-200 flex items-center gap-2">
        <Github className="w-4 h-4 text-brand-400" /> Push Agent Source Code to GitHub
      </h3>
      <p className="text-xs text-gray-500">Push the complete AI Coding Agent source code to your GitHub repo.</p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <input className="input" placeholder="Owner" value={form.owner} onChange={e => setForm(f => ({ ...f, owner: e.target.value }))} />
        <input className="input" placeholder="Repo" value={form.repo} onChange={e => setForm(f => ({ ...f, repo: e.target.value }))} />
        <input className="input" placeholder="Branch" value={form.branch} onChange={e => setForm(f => ({ ...f, branch: e.target.value }))} />
      </div>
      <button onClick={push} disabled={pushing} className="btn-secondary">
        {pushing ? <><Loader className="w-4 h-4 animate-spin" /> Pushing...</> : <><Github className="w-4 h-4" /> Push Source to GitHub</>}
      </button>
      {result && (
        <div className="bg-brand-900/20 border border-brand-700 rounded-lg p-3">
          <p className="text-green-400 text-sm flex items-center gap-2"><CheckCircle className="w-4 h-4" /> {result.fileCount} files pushed!</p>
          <a href={result.url} target="_blank" rel="noopener noreferrer" className="text-xs text-brand-400 hover:underline flex items-center gap-1 mt-1"><ExternalLink className="w-3 h-3" /> View commit</a>
        </div>
      )}
    </div>
  );
}
