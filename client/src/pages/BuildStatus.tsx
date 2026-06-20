import { useState } from 'react';
import { Hammer, Play, RefreshCw, Download, ScrollText, CheckCircle, XCircle, Clock, Loader, Package, Zap, Wrench, ExternalLink } from 'lucide-react';
import { github, ai } from '../services/api';
import toast from 'react-hot-toast';
import { WorkflowRun, Artifact } from '../types';
import { clsx } from 'clsx';
import { Link } from 'react-router-dom';

const statusIcon: Record<string, any> = { completed: CheckCircle, failure: XCircle, in_progress: Loader, queued: Clock, waiting: Clock };
const statusColor: Record<string, string> = {
  success: 'text-green-400', failure: 'text-red-400',
  in_progress: 'text-yellow-400', queued: 'text-gray-400', neutral: 'text-gray-400',
};

export default function BuildStatus() {
  const [owner, setOwner] = useState('VikramCPU');
  const [repo, setRepo] = useState('My-ai-agent');
  const [runs, setRuns] = useState<WorkflowRun[]>([]);
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [selectedRun, setSelectedRun] = useState<WorkflowRun | null>(null);
  const [loading, setLoading] = useState(false);
  const [genForm, setGenForm] = useState({ repoName: 'My-ai-agent', buildType: 'debug', javaVersion: '17' });
  const [generating, setGenerating] = useState(false);
  const [generatedYaml, setGeneratedYaml] = useState('');
  const [showGenerate, setShowGenerate] = useState(false);

  const loadRuns = async () => {
    if (!owner || !repo) return toast.error('Enter owner and repo');
    setLoading(true);
    try {
      const data = await github.listRuns(owner, repo);
      setRuns(data.workflow_runs || []);
    } catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  };

  const loadArtifacts = async (run: WorkflowRun) => {
    setSelectedRun(run);
    try {
      const data = await github.listArtifacts(owner, repo, run.id);
      setArtifacts(data.artifacts || []);
    } catch (e: any) { toast.error(e.message); }
  };

  const triggerRun = async (workflowId: string) => {
    try {
      await github.triggerWorkflow(owner, repo, workflowId, { ref: 'main', inputs: {} });
      toast.success('Workflow triggered!');
      setTimeout(loadRuns, 5000);
    } catch (e: any) { toast.error(e.message); }
  };

  const generateWorkflow = async () => {
    if (!genForm.repoName) return toast.error('Enter repo name');
    setGenerating(true);
    try {
      const data = await ai.generateWorkflow(genForm.repoName, { build_type: genForm.buildType, java_version: genForm.javaVersion });
      setGeneratedYaml(data.content);
    } catch (e: any) { toast.error(e.message); }
    finally { setGenerating(false); }
  };

  const saveWorkflowToGitHub = async () => {
    if (!owner || !repo || !generatedYaml) return toast.error('Load a repo and generate YAML first');
    try {
      const filename = `build-apk.yml`;
      await github.saveFile(owner, repo, { path: `.github/workflows/${filename}`, content: generatedYaml, message: `Add GitHub Actions APK workflow` });
      toast.success(`Workflow saved! Go to GitHub Actions to run it.`);
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <div className="space-y-4">
      {/* Auto-fix banner */}
      <Link to="/android" className="block card border border-yellow-700/40 bg-yellow-900/10 hover:border-yellow-600 transition-colors">
        <div className="flex items-center gap-3">
          <Wrench className="w-5 h-5 text-yellow-400 shrink-0" />
          <div>
            <p className="text-sm font-medium text-gray-200">Auto-fix & Rebuild Loop Available</p>
            <p className="text-xs text-gray-500">Go to Android Generator → Auto-fix Loop to automatically fix failed builds with AI</p>
          </div>
          <ExternalLink className="w-4 h-4 text-gray-500 ml-auto" />
        </div>
      </Link>

      <div className="card">
        <div className="flex gap-2 flex-wrap items-end">
          <div className="flex gap-2 flex-1">
            <input className="input flex-1 min-w-24" placeholder="owner" value={owner} onChange={e => setOwner(e.target.value)} />
            <input className="input flex-1 min-w-24" placeholder="repository" value={repo} onChange={e => setRepo(e.target.value)} />
          </div>
          <button onClick={loadRuns} className="btn-primary" disabled={loading}>
            <RefreshCw className={clsx('w-4 h-4', loading && 'animate-spin')} /> Load Runs
          </button>
          <button onClick={() => setShowGenerate(v => !v)} className="btn-secondary">
            <Zap className="w-4 h-4 text-yellow-400" /> Generate Workflow
          </button>
        </div>
      </div>

      {showGenerate && (
        <div className="card border border-yellow-500/20 bg-yellow-950/10 space-y-3">
          <h3 className="font-medium text-gray-200 flex items-center gap-2"><Zap className="w-4 h-4 text-yellow-400" /> Generate Android APK Workflow</h3>
          <div className="grid grid-cols-3 gap-3">
            <input className="input" placeholder="Repo name" value={genForm.repoName} onChange={e => setGenForm(f => ({ ...f, repoName: e.target.value }))} />
            <select className="input" value={genForm.buildType} onChange={e => setGenForm(f => ({ ...f, buildType: e.target.value }))}>
              <option value="debug">Debug</option><option value="release">Release</option>
            </select>
            <select className="input" value={genForm.javaVersion} onChange={e => setGenForm(f => ({ ...f, javaVersion: e.target.value }))}>
              <option value="11">Java 11</option><option value="17">Java 17</option><option value="21">Java 21</option>
            </select>
          </div>
          <div className="flex gap-2">
            <button onClick={generateWorkflow} className="btn-primary" disabled={generating}><Zap className="w-4 h-4" />{generating ? 'Generating...' : 'Generate YAML'}</button>
            {generatedYaml && <button onClick={saveWorkflowToGitHub} className="btn-secondary"><Hammer className="w-4 h-4" /> Save to GitHub</button>}
          </div>
          {generatedYaml && (
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-xs text-gray-400 font-mono">.github/workflows/build-apk.yml</span>
                <button onClick={() => { navigator.clipboard.writeText(generatedYaml); toast.success('Copied!'); }} className="text-xs text-brand-400">Copy</button>
              </div>
              <pre className="text-xs bg-gray-950 border border-gray-800 rounded-lg p-3 overflow-auto max-h-64 text-green-400 font-mono">{generatedYaml}</pre>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="space-y-3">
          <h3 className="font-medium text-gray-300 flex items-center gap-2"><Hammer className="w-4 h-4 text-brand-400" /> Runs ({runs.length})</h3>
          {runs.length === 0 && !loading && (
            <div className="card text-center py-8 text-gray-600"><Hammer className="w-10 h-10 mx-auto mb-2 opacity-20" /><p className="text-sm">Load workflow runs above</p></div>
          )}
          {runs.slice(0, 20).map(run => {
            const Icon = statusIcon[run.status || 'queued'] || Clock;
            const color = statusColor[run.conclusion || run.status || 'neutral'];
            return (
              <div key={run.id} onClick={() => loadArtifacts(run)} className={clsx('card cursor-pointer hover:border-gray-600 transition-all', selectedRun?.id === run.id && 'border-brand-500/50')}>
                <div className="flex items-start gap-3">
                  <Icon className={clsx('w-5 h-5 mt-0.5 shrink-0', color, run.status === 'in_progress' && 'animate-spin')} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-200 truncate">{run.name || `Run #${run.run_number}`}</p>
                    <p className="text-xs text-gray-500">{run.head_branch} · {new Date(run.created_at).toLocaleString()}</p>
                    <span className={clsx('badge mt-1', run.conclusion === 'success' ? 'badge-green' : run.conclusion === 'failure' ? 'badge-red' : 'badge-yellow')}>
                      {run.conclusion || run.status}
                    </span>
                  </div>
                  <div className="flex gap-1">
                    <a href={run.html_url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="btn-ghost p-1.5"><ScrollText className="w-3.5 h-3.5" /></a>
                    <button onClick={e => { e.stopPropagation(); triggerRun(String(run.workflow_id)); }} className="btn-ghost p-1.5"><Play className="w-3.5 h-3.5 text-green-400" /></button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="space-y-3">
          <h3 className="font-medium text-gray-300 flex items-center gap-2"><Package className="w-4 h-4 text-brand-400" /> Artifacts{selectedRun && ` — Run #${selectedRun.run_number}`}</h3>
          {!selectedRun ? (
            <div className="card text-center py-8 text-gray-600"><Package className="w-10 h-10 mx-auto mb-2 opacity-20" /><p className="text-sm">Click a run to view artifacts</p></div>
          ) : artifacts.length === 0 ? (
            <div className="card text-center py-4 text-gray-600 text-sm">No artifacts for this run</div>
          ) : artifacts.map(art => (
            <div key={art.id} className="card flex items-center justify-between gap-3">
              <div className="flex items-center gap-3"><Package className="w-5 h-5 text-brand-400 shrink-0" />
                <div><p className="text-sm font-medium text-gray-200">{art.name}</p><p className="text-xs text-gray-500">{(art.size_in_bytes / 1024 / 1024).toFixed(2)} MB</p></div>
              </div>
              <a href={art.archive_download_url} className="btn-secondary text-xs"><Download className="w-3.5 h-3.5" /> Download APK</a>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
