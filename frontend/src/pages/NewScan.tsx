import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createEngagement, runEngagement } from '../services/api';
import { Shield, Server, Key, Loader2, Brain, FileText } from 'lucide-react';
import { useLang } from '../i18n/index';

export default function NewScan() {
  const navigate = useNavigate();
  const { t } = useLang();
  const [name, setName] = useState('');
  const [host, setHost] = useState('');
  const [osType, setOsType] = useState('auto');
  const [sshUser, setSshUser] = useState('');
  const [sshPass, setSshPass] = useState('');
  const [sshPort, setSshPort] = useState('22');
  const [sshKeyPath, setSshKeyPath] = useState('');
  const [aiAnalysis, setAiAnalysis] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  const handleCreate = async (run = false) => {
    if (!host || !sshUser) { setError('Target host and SSH username are required'); return; }
    setCreating(true);
    setError('');
    try {
      const res = await createEngagement({
        name: name || `Hardening Scan - ${host}`,
        description: `Hardening assessment for ${host}`,
        target_scope: [{
          host,
          ssh_username: sshUser,
          ssh_password: sshPass,
          ssh_port: parseInt(sshPort) || 22,
          ssh_key_path: sshKeyPath || undefined,
          os_type: osType,
          ai_analysis: aiAnalysis,
        }],
      });
      if (run) {
        await runEngagement(res.id);
      }
      navigate(`/scan/${res.id}`);
    } catch (e: any) {
      setError(e.message);
    } finally { setCreating(false); }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-white">{t('newScanTitle')}</h1>

      {/* Target Info */}
      <div className="glass-card rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-2 text-neon-blue">
          <Server className="w-5 h-5" />
          <h2 className="font-semibold">{t('targetHost').replace(' *', '')}</h2>
        </div>
        <input type="text" placeholder={t('scanName')} value={name} onChange={e => setName(e.target.value)}
          className="w-full px-3 py-2 rounded-lg bg-dark-700 border border-dark-600 text-white text-sm focus:border-neon-blue focus:outline-none" />
        <div className="grid grid-cols-2 gap-4">
          <input type="text" placeholder={t('targetHost')} value={host} onChange={e => setHost(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-dark-700 border border-dark-600 text-white text-sm focus:border-neon-blue focus:outline-none" />
          <select value={osType} onChange={e => setOsType(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-dark-700 border border-dark-600 text-white text-sm focus:border-neon-blue focus:outline-none">
            <option value="auto">{t('autoDetectOS')}</option>
            <option value="linux">Linux</option>
            <option value="windows">Windows</option>
          </select>
        </div>
      </div>

      {/* SSH Credentials */}
      <div className="glass-card rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-2 text-neon-green">
          <Key className="w-5 h-5" />
          <h2 className="font-semibold">{t('sshCredentials')}</h2>
        </div>
        <p className="text-xs text-dark-400">
          {t('sshCredsHint')}
        </p>
        <div className="grid grid-cols-2 gap-4">
          <input type="text" placeholder={t('sshUsername')} value={sshUser} onChange={e => setSshUser(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-dark-700 border border-dark-600 text-white text-sm focus:border-neon-green focus:outline-none" />
          <input type="number" placeholder={t('sshPort')} value={sshPort} onChange={e => setSshPort(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-dark-700 border border-dark-600 text-white text-sm focus:border-neon-green focus:outline-none" />
        </div>
        <input type="password" placeholder={t('sshPassword')} value={sshPass} onChange={e => setSshPass(e.target.value)}
          className="w-full px-3 py-2 rounded-lg bg-dark-700 border border-dark-600 text-white text-sm focus:border-neon-green focus:outline-none" />
        <input type="text" placeholder={t('sshKeyPath')} value={sshKeyPath} onChange={e => setSshKeyPath(e.target.value)}
          className="w-full px-3 py-2 rounded-lg bg-dark-700 border border-dark-600 text-white text-sm focus:border-neon-green focus:outline-none" />
      </div>

      {/* AI Analysis Toggle */}
      <div className="glass-card rounded-xl p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {aiAnalysis ? <Brain className="w-5 h-5 text-neon-blue" /> : <FileText className="w-5 h-5 text-dark-400" />}
            <div>
              <h2 className="font-semibold text-white">{t('aiAnalysis')}</h2>
              <p className="text-xs text-dark-400">{t('aiAnalysisDesc')}</p>
            </div>
          </div>
          <button onClick={() => setAiAnalysis(!aiAnalysis)}
            className={`relative w-12 h-6 rounded-full transition-colors ${aiAnalysis ? 'bg-neon-blue' : 'bg-dark-600'}`}>
            <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${aiAnalysis ? 'left-7' : 'left-1'}`} />
          </button>
        </div>
        {!aiAnalysis && (
          <p className="text-xs text-dark-400 mt-2 ml-7">{t('aiDisabled')}</p>
        )}
      </div>

      {error && <p className="text-neon-red text-sm">{error}</p>}

      <div className="flex gap-3">
        <button onClick={() => handleCreate(true)} disabled={creating || !host || !sshUser}
          className="flex-1 py-3 rounded-lg bg-neon-green text-dark-900 font-bold hover:bg-neon-green/80 disabled:opacity-50 flex items-center justify-center gap-2">
          {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
          {creating ? t('creating') : t('startScan')}
        </button>
        <button onClick={() => handleCreate(false)} disabled={creating || !host || !sshUser}
          className="px-6 py-3 rounded-lg border border-dark-600 text-dark-300 hover:text-white hover:border-dark-400 disabled:opacity-50 text-sm">
          {t('createOnly')}
        </button>
      </div>
    </div>
  );
}
