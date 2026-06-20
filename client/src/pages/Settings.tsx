import { useState, useEffect } from 'react';
import {
  Settings2, Cpu, Smartphone, Zap, Globe, CheckCircle,
  XCircle, Loader, Save, TestTube, ChevronDown, ChevronRight,
  Wifi, Key, RefreshCw, Info
} from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { clsx } from 'clsx';

const PRESETS = [
  {
    id: 'pocketapi',
    name: 'PocketAPI Server2',
    icon: Smartphone,
    color: 'text-green-400',
    bg: 'bg-green-900/20 border-green-700',
    desc: 'Your Android phone as AI server (local WiFi)',
    badge: '📱 FREE',
    defaultURL: 'http://192.168.1.100:8080',
    model: 'llama-3.3-70b-versatile',
    keyRequired: false,
    keyHint: 'Leave empty if no key set in PocketAPI',
    steps: [
      'Open PocketAPI Server2 on your Android phone',
      'Add Groq/OpenRouter key in Settings → Add API Provider',
      'Tap "START ENGINE" on the Servers tab',
      'Find your phone IP: Settings → Servers → IP shown there',
      'Enter http://<your-phone-ip>:8080 below',
    ],
  },
  {
    id: 'groq',
    name: 'Groq Cloud',
    icon: Zap,
    color: 'text-yellow-400',
    bg: 'bg-yellow-900/20 border-yellow-700',
    desc: 'Super fast inference — free tier available',
    badge: '⚡ FREE',
    defaultURL: 'https://api.groq.com/openai/v1',
    model: 'llama-3.3-70b-versatile',
    keyRequired: true,
    keyHint: 'Get free key at console.groq.com (gsk_...)',
    steps: [
      'Go to console.groq.com → Sign up free',
      'Click "API Keys" → Create API Key',
      'Copy key (starts with gsk_...)',
      'Paste below and click Save',
    ],
  },
  {
    id: 'openrouter',
    name: 'OpenRouter',
    icon: Globe,
    color: 'text-purple-400',
    bg: 'bg-purple-900/20 border-purple-700',
    desc: 'Access 200+ models — free credits available',
    badge: '🌐 FREE',
    defaultURL: 'https://openrouter.ai/api/v1',
    model: 'openrouter/auto',
    keyRequired: true,
    keyHint: 'Get free key at openrouter.ai (sk-or-v1-...)',
    steps: [
      'Go to openrouter.ai → Sign up free',
      'Dashboard → Keys → Create Key',
      'Copy key (starts with sk-or-v1-...)',
      'Paste below and click Save',
    ],
  },
  {
    id: 'nvidia',
    name: 'NVIDIA NIM',
    icon: Cpu,
    color: 'text-brand-400',
    bg: 'bg-brand-900/20 border-brand-700',
    desc: 'Current default — NVIDIA AI cloud',
    badge: '🔑 Paid',
    defaultURL: 'https://integrate.api.nvidia.com/v1',
    model: 'meta/llama-3.1-70b-instruct',
    keyRequired: true,
    keyHint: 'Your NVIDIA API key (already set as env var)',
    steps: ['Already configured as NVIDIA_API_KEY env secret'],
  },
  {
    id: 'custom',
    name: 'Custom Provider',
    icon: Settings2,
    color: 'text-gray-400',
    bg: 'bg-gray-800/50 border-gray-600',
    desc: 'Any OpenAI-compatible API endpoint',
    badge: '⚙️ Custom',
    defaultURL: 'http://localhost:11434/v1',
    model: 'llama2',
    keyRequired: false,
    keyHint: 'API key if required by your provider',
    steps: [
      'Enter your server base URL (must end in /v1 for OpenAI-compat)',
      'Enter model name supported by your server',
      'Add API key if required',
      'Click Test to verify connection',
    ],
  },
];

interface CurrentConfig {
  name: string;
  baseURL: string;
  model: string;
  hasApiKey: boolean;
  apiKeyPreview: string;
}

export default function Settings() {
  const [current, setCurrent] = useState<CurrentConfig | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [form, setForm] = useState({ baseURL: '', model: '', apiKey: '', name: '' });
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => { loadCurrent(); }, []);

  const loadCurrent = async () => {
    try {
      const { data } = await axios.get('/api/settings/ai-provider');
      setCurrent(data.data);
    } catch (e: any) {
      toast.error('Failed to load config: ' + e.message);
    }
  };

  const selectPreset = (preset: typeof PRESETS[0]) => {
    setSelected(preset.id);
    setForm({ baseURL: preset.defaultURL, model: preset.model, apiKey: '', name: preset.name });
    setTestResult(null);
    setExpanded(preset.id);
  };

  const testConnection = async () => {
    if (!form.baseURL) return toast.error('Enter base URL first');
    setTesting(true); setTestResult(null);
    try {
      await axios.post('/api/settings/ai-provider', { ...form, preset: selected !== 'custom' && selected !== 'pocketapi' ? selected : undefined });
      const { data } = await axios.post('/api/settings/ai-provider/test');
      setTestResult(data);
      if (data.success) toast.success('Connection successful!');
      else toast.error('Connection failed: ' + data.data?.message);
    } catch (e: any) {
      setTestResult({ success: false, message: e.message });
      toast.error(e.message);
    } finally {
      setTesting(false);
    }
  };

  const save = async () => {
    if (!form.baseURL || !form.model) return toast.error('Fill in URL and model name');
    setSaving(true);
    try {
      await axios.post('/api/settings/ai-provider', {
        ...form,
        preset: selected && selected !== 'custom' && selected !== 'pocketapi' ? selected : undefined,
      });
      toast.success(`Switched to ${form.name || selected}!`);
      loadCurrent();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h2 className="text-lg font-semibold text-gray-200 flex items-center gap-2">
          <Settings2 className="w-5 h-5 text-brand-400" /> AI Provider Settings
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          Choose which AI model powers the chat agent. PocketAPI Server2 runs FREE on your phone!
        </p>
      </div>

      {current && (
        <div className="card border border-green-700 bg-green-900/10">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-400 shrink-0" />
            <div>
              <p className="text-sm font-medium text-gray-200">Currently Active: <span className="text-green-400">{current.name}</span></p>
              <p className="text-xs text-gray-500 font-mono">{current.baseURL} · {current.model}</p>
              {current.hasApiKey && <p className="text-xs text-gray-600">API Key: {current.apiKeyPreview}</p>}
            </div>
            <button onClick={loadCurrent} className="ml-auto btn-ghost p-1.5"><RefreshCw className="w-4 h-4" /></button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Choose Provider</h3>
        {PRESETS.map(preset => {
          const Icon = preset.icon;
          const isActive = current?.baseURL?.includes(preset.defaultURL.replace('http://192.168.1.100:8080', '').replace('https://', '').split('/')[0]);
          const isExpanded = expanded === preset.id;
          return (
            <div key={preset.id} className={clsx('card border transition-all cursor-pointer', preset.bg, selected === preset.id && 'ring-1 ring-brand-500')}>
              <div className="flex items-center gap-3" onClick={() => { selectPreset(preset); }}>
                <div className={clsx('p-2 rounded-lg border', preset.bg)}>
                  <Icon className={clsx('w-5 h-5', preset.color)} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-gray-200">{preset.name}</span>
                    <span className="badge badge-gray text-[10px]">{preset.badge}</span>
                    {isActive && <span className="badge badge-green text-[10px]">Active</span>}
                  </div>
                  <p className="text-xs text-gray-500">{preset.desc}</p>
                </div>
                <button onClick={e => { e.stopPropagation(); setExpanded(isExpanded ? null : preset.id); }} className="btn-ghost p-1">
                  {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </button>
              </div>

              {isExpanded && (
                <div className="mt-4 space-y-4 border-t border-gray-700 pt-4">
                  {/* Setup steps */}
                  <div className="bg-gray-900/50 rounded-lg p-3">
                    <p className="text-xs font-semibold text-gray-400 mb-2 flex items-center gap-1"><Info className="w-3.5 h-3.5" /> Setup Steps</p>
                    <ol className="space-y-1">
                      {preset.steps.map((step, i) => (
                        <li key={i} className="text-xs text-gray-400 flex items-start gap-2">
                          <span className={clsx('shrink-0 w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold', preset.bg, preset.color)}>{i + 1}</span>
                          {step}
                        </li>
                      ))}
                    </ol>
                  </div>

                  {/* PocketAPI special instructions */}
                  {preset.id === 'pocketapi' && (
                    <div className="bg-green-950/30 border border-green-800 rounded-lg p-3 text-xs text-green-300 space-y-1">
                      <p className="font-semibold flex items-center gap-1"><Wifi className="w-3.5 h-3.5" /> Network Requirement</p>
                      <p>Your phone and this server must be on the <strong>same WiFi network</strong>, OR use <strong>ngrok</strong> to expose your phone publicly:</p>
                      <code className="block bg-black/30 rounded px-2 py-1 font-mono text-green-400">ngrok http 8080</code>
                      <p>Then use the ngrok https URL below instead of the local IP.</p>
                    </div>
                  )}

                  {/* Form fields */}
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs text-gray-400 mb-1 block flex items-center gap-1"><Globe className="w-3 h-3" /> Base URL</label>
                      <input
                        className="input w-full font-mono text-xs"
                        value={selected === preset.id ? form.baseURL : preset.defaultURL}
                        onChange={e => setForm(f => ({ ...f, baseURL: e.target.value }))}
                        placeholder={preset.defaultURL}
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-400 mb-1 block flex items-center gap-1"><Cpu className="w-3 h-3" /> Model Name</label>
                      <input
                        className="input w-full font-mono text-xs"
                        value={selected === preset.id ? form.model : preset.model}
                        onChange={e => setForm(f => ({ ...f, model: e.target.value }))}
                        placeholder={preset.model}
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-400 mb-1 block flex items-center gap-1">
                        <Key className="w-3 h-3" /> API Key {!preset.keyRequired && <span className="text-gray-600">(optional)</span>}
                      </label>
                      <input
                        className="input w-full font-mono text-xs"
                        type="password"
                        value={selected === preset.id ? form.apiKey : ''}
                        onChange={e => setForm(f => ({ ...f, apiKey: e.target.value }))}
                        placeholder={preset.keyHint}
                      />
                      <p className="text-[10px] text-gray-600 mt-1">{preset.keyHint}</p>
                    </div>
                  </div>

                  {/* Test result */}
                  {testResult && (
                    <div className={clsx('flex items-center gap-2 px-3 py-2 rounded-lg border text-xs', testResult.success ? 'bg-green-900/30 border-green-700 text-green-400' : 'bg-red-900/30 border-red-700 text-red-400')}>
                      {testResult.success ? <CheckCircle className="w-3.5 h-3.5 shrink-0" /> : <XCircle className="w-3.5 h-3.5 shrink-0" />}
                      {testResult.message}
                    </div>
                  )}

                  {/* Action buttons */}
                  <div className="flex gap-2">
                    <button onClick={testConnection} disabled={testing} className="btn-secondary text-xs">
                      {testing ? <Loader className="w-3.5 h-3.5 animate-spin" /> : <TestTube className="w-3.5 h-3.5" />}
                      {testing ? 'Testing...' : 'Test Connection'}
                    </button>
                    <button onClick={save} disabled={saving} className="btn-primary text-xs">
                      {saving ? <Loader className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                      {saving ? 'Saving...' : 'Save & Activate'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
