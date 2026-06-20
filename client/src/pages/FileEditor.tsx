import { useState } from 'react';
import { FileCode2, FolderOpen, Save, Wand2, Bug, BookOpen, RefreshCw, ChevronRight, File, Folder } from 'lucide-react';
import { github, ai } from '../services/api';
import toast from 'react-hot-toast';
import Editor from '@monaco-editor/react';

export default function FileEditor() {
  const [owner, setOwner] = useState('');
  const [repo, setRepo] = useState('');
  const [path, setPath] = useState('');
  const [contents, setContents] = useState<any[]>([]);
  const [fileData, setFileData] = useState<any>(null);
  const [code, setCode] = useState('');
  const [loadingTree, setLoadingTree] = useState(false);
  const [saving, setSaving] = useState(false);
  const [aiResult, setAiResult] = useState('');
  const [aiLoading, setAiLoading] = useState('');
  const [breadcrumbs, setBreadcrumbs] = useState<string[]>([]);

  const loadContents = async (p = '') => {
    if (!owner || !repo) return toast.error('Enter owner and repo first');
    setLoadingTree(true);
    try {
      const data = await github.listContents(owner, repo, p);
      setContents(data.sort((a: any, b: any) => a.type === b.type ? a.name.localeCompare(b.name) : a.type === 'dir' ? -1 : 1));
      setBreadcrumbs(p ? p.split('/') : []);
      setPath(p);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoadingTree(false);
    }
  };

  const openFile = async (filePath: string) => {
    try {
      const data = await github.getFile(owner, repo, filePath);
      setFileData(data);
      setCode(data.content);
      setAiResult('');
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const saveFile = async () => {
    if (!fileData) return;
    setSaving(true);
    try {
      await github.saveFile(owner, repo, {
        path: fileData.path,
        content: code,
        message: `Update ${fileData.name} via AI Agent`,
        sha: fileData.sha,
      });
      toast.success('File saved to GitHub!');
      setFileData((prev: any) => ({ ...prev, content: code }));
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const runAI = async (action: 'analyze' | 'explain' | 'fix') => {
    if (!code) return toast.error('No file loaded');
    const ext = (fileData?.name || 'file').split('.').pop() || 'txt';
    const langMap: Record<string, string> = { ts: 'TypeScript', js: 'JavaScript', py: 'Python', kt: 'Kotlin', java: 'Java' };
    const lang = langMap[ext] || ext;
    setAiLoading(action); setAiResult('');
    try {
      let result: any;
      if (action === 'analyze') result = await ai.analyze(code, lang);
      else if (action === 'explain') result = await ai.explain(code, lang);
      else result = await ai.fix(code, 'Auto-detect errors', lang);
      setAiResult(result.analysis || result.explanation || result.fix || JSON.stringify(result));
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setAiLoading('');
    }
  };

  const ext = fileData?.name?.split('.').pop() || 'txt';
  const monacoLang: Record<string, string> = { ts: 'typescript', tsx: 'typescript', js: 'javascript', jsx: 'javascript', py: 'python', kt: 'kotlin', java: 'java', xml: 'xml', json: 'json', yaml: 'yaml', yml: 'yaml', md: 'markdown', gradle: 'groovy', sh: 'shell' };

  return (
    <div className="space-y-4 h-full">
      <div className="card">
        <div className="flex gap-2 flex-wrap">
          <input className="input flex-1 min-w-32" placeholder="owner" value={owner} onChange={e => setOwner(e.target.value)} />
          <input className="input flex-1 min-w-32" placeholder="repository" value={repo} onChange={e => setRepo(e.target.value)} />
          <button onClick={() => loadContents('')} className="btn-primary" disabled={loadingTree}>
            <FolderOpen className="w-4 h-4" /> {loadingTree ? 'Loading...' : 'Browse'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4" style={{ minHeight: '500px' }}>
        {contents.length > 0 && (
          <div className="card overflow-hidden flex flex-col">
            <div className="flex items-center gap-2 mb-2">
              <FolderOpen className="w-4 h-4 text-brand-400" />
              <span className="text-sm font-medium text-gray-300">{repo}/</span>
            </div>
            {breadcrumbs.length > 0 && (
              <button onClick={() => loadContents(breadcrumbs.slice(0, -1).join('/'))} className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-300 mb-2">
                <ChevronRight className="w-3 h-3 rotate-180" /> ..
              </button>
            )}
            <div className="overflow-y-auto flex-1 space-y-0.5">
              {contents.map((item: any) => (
                <button key={item.path} onClick={() => item.type === 'dir' ? loadContents(item.path) : openFile(item.path)}
                  className={`w-full flex items-center gap-2 text-xs px-2 py-1.5 rounded text-left hover:bg-gray-800 transition-colors ${fileData?.path === item.path ? 'bg-brand-900/30 text-brand-400' : 'text-gray-400'}`}>
                  {item.type === 'dir' ? <Folder className="w-3.5 h-3.5 text-yellow-500 shrink-0" /> : <File className="w-3.5 h-3.5 text-gray-500 shrink-0" />}
                  <span className="truncate">{item.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className={`flex flex-col gap-4 ${contents.length > 0 ? 'lg:col-span-3' : 'lg:col-span-4'}`}>
          {fileData ? (
            <>
              <div className="card py-2 px-3 flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2 text-sm">
                  <FileCode2 className="w-4 h-4 text-brand-400" />
                  <span className="text-gray-300 font-mono text-xs">{fileData.path}</span>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <button onClick={() => runAI('analyze')} className="btn-secondary text-xs" disabled={!!aiLoading}><Bug className="w-3.5 h-3.5" />{aiLoading === 'analyze' ? '...' : 'Analyze'}</button>
                  <button onClick={() => runAI('explain')} className="btn-secondary text-xs" disabled={!!aiLoading}><BookOpen className="w-3.5 h-3.5" />{aiLoading === 'explain' ? '...' : 'Explain'}</button>
                  <button onClick={() => runAI('fix')} className="btn-secondary text-xs" disabled={!!aiLoading}><Wand2 className="w-3.5 h-3.5" />{aiLoading === 'fix' ? '...' : 'Fix'}</button>
                  <button onClick={saveFile} className="btn-primary text-xs" disabled={saving}><Save className="w-3.5 h-3.5" />{saving ? 'Saving...' : 'Save'}</button>
                </div>
              </div>
              <div className="rounded-xl overflow-hidden border border-gray-800" style={{ height: '350px' }}>
                <Editor
                  height="350px"
                  language={monacoLang[ext] || 'plaintext'}
                  value={code}
                  onChange={v => setCode(v || '')}
                  theme="vs-dark"
                  options={{ fontSize: 13, minimap: { enabled: false }, scrollBeyondLastLine: false, wordWrap: 'on', lineNumbers: 'on', automaticLayout: true }}
                />
              </div>
              {aiResult && (
                <div className="card border border-brand-500/20">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-brand-400 flex items-center gap-1"><Wand2 className="w-4 h-4" /> AI Analysis</span>
                    <button onClick={() => setAiResult('')} className="text-xs text-gray-600 hover:text-gray-400">✕</button>
                  </div>
                  <pre className="text-xs text-gray-300 whitespace-pre-wrap font-sans overflow-auto max-h-60">{aiResult}</pre>
                </div>
              )}
            </>
          ) : (
            <div className="card flex flex-col items-center justify-center h-64 text-gray-600">
              <FileCode2 className="w-16 h-16 mb-4 opacity-20" />
              <p className="text-sm">Browse a repository and select a file to edit</p>
              <p className="text-xs mt-1">Supports TypeScript, JavaScript, Python, Kotlin, and more</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
