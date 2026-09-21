import { useState } from 'react';
import { login } from '../services/api';
import { Shield } from 'lucide-react';
import { useLang } from '../i18n/index';

export default function Login({ onLogin }: { onLogin: (role: string, username: string) => void }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { t } = useLang();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await login(username, password);
      localStorage.setItem('hardino_token', res.access_token);
      onLogin(res.role, res.username);
    } catch (e: any) {
      setError(e.message || 'Login failed');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-dark-900">
      <form onSubmit={handleSubmit} className="glass-card rounded-2xl p-8 w-full max-w-sm">
        <div className="flex items-center gap-3 mb-6 justify-center">
          <Shield className="w-8 h-8 text-neon-green" />
          <h1 className="text-2xl font-bold text-neon-green">Hardino</h1>
        </div>
        <p className="text-center text-dark-400 text-sm mb-6">{t('deviceHardening')}</p>
        <div className="space-y-4">
          <input type="text" placeholder={t('username')} value={username} onChange={e => setUsername(e.target.value)}
            className="w-full px-4 py-3 rounded-lg bg-dark-700 border border-dark-600 text-white focus:border-neon-green focus:outline-none" autoFocus />
          <input type="password" placeholder={t('password')} value={password} onChange={e => setPassword(e.target.value)}
            className="w-full px-4 py-3 rounded-lg bg-dark-700 border border-dark-600 text-white focus:border-neon-green focus:outline-none" />
          {error && <p className="text-neon-red text-sm text-center">{error}</p>}
          <button type="submit" disabled={loading || !username || !password}
            className="w-full py-3 rounded-lg bg-neon-green text-dark-900 font-bold hover:bg-neon-green/80 disabled:opacity-50">
            {loading ? '...' : t('signIn')}
          </button>
        </div>
      </form>
    </div>
  );
}
