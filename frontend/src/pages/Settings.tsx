import { useState, useEffect } from 'react';
import { getLLMSettings, updateLLMSettings, testLLMConnection } from '../services/api';
import { Settings as SettingsIcon, Check, AlertTriangle, Loader2 } from 'lucide-react';
import { useLang } from '../i18n/index';

const PROVIDERS: Record<string, { name: string; baseUrl: string; models: string[] }> = {
  openrouter: { name: 'OpenRouter', baseUrl: 'https://openrouter.ai/api/v1', models: ['xiaomi/mimo-v2.5', 'google/gemini-2.0-flash', 'openai/gpt-4o-mini'] },
  openai: { name: 'OpenAI', baseUrl: 'https://api.openai.com/v1', models: ['gpt-4o-mini', 'gpt-4o', 'gpt-3.5-turbo'] },
  ollama: { name: 'Ollama (Local)', baseUrl: 'http://localhost:11434/v1', models: ['llama3.2', 'codellama', 'mistral'] },
  lmstudio: { name: 'LM Studio', baseUrl: 'http://localhost:1234/v1', models: ['local-model'] },
  vllm: { name: 'vLLM', baseUrl: 'http://localhost:8080/v1', models: ['local-model'] },
};

export default function SettingsPage() {
  const [provider, setProvider] = useState('openrouter');
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('xiaomi/mimo-v2.5');
  const [baseUrl, setBaseUrl] = useState('https://openrouter.ai/api/v1');
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'ok' | 'error'>('idle');
  const [testMsg, setTestMsg] = useState('');
  const [saved, setSaved] = useState(false);
  const { t } = useLang();

  useEffect(() => {
    getLLMSettings().then(s => {
      setProvider(s.provider || 'openrouter');
      setModel(s.model || 'xiaomi/mimo-v2.5');
      setBaseUrl(s.base_url || 'https://openrouter.ai/api/v1');
    }).catch(() => {});
  }, []);

  const handleProviderChange = (p: string) => {
    setProvider(p);
    const prov = PROVIDERS[p];
    if (prov) {
      setBaseUrl(prov.baseUrl);
      setModel(prov.models[0]);
    }
  };

  const handleSave = async () => {
    await updateLLMSettings({ provider, api_key: apiKey || undefined, model, base_url: baseUrl });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleTest = async () => {
    setTestStatus('testing');
    try {
      const res = await testLLMConnection();
      setTestStatus(res.status === 'ok' ? 'ok' : 'error');
      setTestMsg(res.message);
    } catch (e: any) {
      setTestStatus('error');
      setTestMsg(e.message);
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-2">
        <SettingsIcon className="w-6 h-6 text-neon-blue" />
        <h1 className="text-2xl font-bold text-white">{t('settingsTitle')}</h1>
      </div>

      <div className="glass-card rounded-xl p-5 space-y-4">
        <h2 className="font-semibold text-white">{t('llmProvider')}</h2>
        <div className="grid grid-cols-3 gap-2">
          {Object.entries(PROVIDERS).map(([key, prov]) => (
            <button key={key} onClick={() => handleProviderChange(key)}
              className={`p-2 rounded-lg text-sm border transition-colors ${
                provider === key ? 'border-neon-blue bg-neon-blue/10 text-neon-blue' : 'border-dark-600 text-dark-300 hover:border-dark-400'
              }`}>
              {prov.name}
            </button>
          ))}
        </div>

        <input type="password" placeholder={t('apiKey')} value={apiKey} onChange={e => setApiKey(e.target.value)}
          className="w-full px-3 py-2 rounded-lg bg-dark-700 border border-dark-600 text-white text-sm focus:border-neon-blue focus:outline-none" />

        <input type="text" placeholder={t('baseUrl')} value={baseUrl} onChange={e => setBaseUrl(e.target.value)}
          className="w-full px-3 py-2 rounded-lg bg-dark-700 border border-dark-600 text-white text-sm focus:border-neon-blue focus:outline-none" />

        <select value={model} onChange={e => setModel(e.target.value)}
          className="w-full px-3 py-2 rounded-lg bg-dark-700 border border-dark-600 text-white text-sm focus:border-neon-blue focus:outline-none">
          {(PROVIDERS[provider]?.models || []).map(m => <option key={m} value={m}>{m}</option>)}
        </select>

        <div className="flex items-center gap-3">
          <button onClick={handleTest}
            className="px-4 py-2 rounded-lg border border-dark-600 text-dark-300 hover:text-white hover:border-dark-400 text-sm flex items-center gap-2">
            {testStatus === 'testing' ? <Loader2 className="w-4 h-4 animate-spin" /> :
             testStatus === 'ok' ? <Check className="w-4 h-4 text-neon-green" /> :
             testStatus === 'error' ? <AlertTriangle className="w-4 h-4 text-neon-red" /> : null}
            {t('testConnection')}
          </button>
          {testStatus === 'ok' && <span className="text-xs px-2 py-1 rounded-full bg-neon-green/10 text-neon-green">{t('active')}</span>}
          {testStatus === 'error' && <span className="text-xs px-2 py-1 rounded-full bg-neon-red/10 text-neon-red">{t('failed')}</span>}
          {testMsg && <span className="text-xs text-dark-400">{testMsg}</span>}
        </div>

        <button onClick={handleSave}
          className="w-full py-2 rounded-lg bg-neon-blue text-dark-900 font-medium text-sm hover:bg-neon-blue/80">
          {saved ? t('saved') : t('saveSettings')}
        </button>
      </div>
    </div>
  );
}
