import { BrowserRouter, Routes, Route, NavLink, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import {
  LayoutDashboard, Plus, Shield, Settings, KeyRound, X,
  ChevronLeft, ChevronRight, LogOut, Server, HardDrive, Globe,
  Moon, Sun
} from 'lucide-react';
import Dashboard from './pages/Dashboard';
import NewScan from './pages/NewScan';
import ScanDetail from './pages/ScanDetail';
import Assets from './pages/Assets';
import SettingsPage from './pages/Settings';
import Login from './pages/Login';
import { getMe, changePassword, onUnauthorized } from './services/api';
import { useLang } from './i18n/index';

function Shell({ role, username, onLogout }: { role: string; username: string; onLogout: () => void }) {
  const [collapsed, setCollapsed] = useState(false);
  const [pwOpen, setPwOpen] = useState(false);
  const [pwOld, setPwOld] = useState('');
  const [pwNew, setPwNew] = useState('');
  const [pwMsg, setPwMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pwSaving, setPwSaving] = useState(false);
  const { lang, setLang, t, theme, toggleTheme } = useLang();
  const isAdmin = role === 'admin';

  const submitPassword = async () => {
    setPwSaving(true);
    setPwMsg(null);
    try {
      await changePassword(pwOld, pwNew);
      setPwMsg({ ok: true, text: 'Password changed' });
      setPwOld(''); setPwNew('');
      setTimeout(() => setPwOpen(false), 1200);
    } catch (e: any) {
      setPwMsg({ ok: false, text: e.message || 'Failed' });
    } finally { setPwSaving(false); }
  };

  const navItems = [
    { path: '/', icon: LayoutDashboard, label: t('dashboard') },
    { path: '/new-scan', icon: Plus, label: t('newScan') },
    { path: '/assets', icon: HardDrive, label: t('assets') },
    ...(isAdmin ? [{ path: '/settings', icon: Settings, label: t('settings') }] : []),
  ];

  return (
    <div className="flex h-screen bg-dark-900">
      <aside className={`${collapsed ? 'w-16' : 'w-56'} bg-dark-800 border-r border-dark-600 flex flex-col transition-all duration-200`}>
        <div className="p-4 flex items-center gap-2">
          <Shield className="w-6 h-6 text-neon-green shrink-0" />
          {!collapsed && <span className="font-bold text-lg text-neon-green">Hardino</span>}
        </div>
        <nav className="flex-1 px-2 space-y-1">
          {navItems.map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                  isActive ? 'bg-neon-green/10 text-neon-green' : 'text-white/60 hover:text-white hover:bg-dark-700'
                }`
              }
            >
              <item.icon className="w-5 h-5 shrink-0" />
              {!collapsed && <span className="text-sm">{item.label}</span>}
            </NavLink>
          ))}
        </nav>
        <div className="p-3 border-t border-dark-600">
          {!collapsed && (
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-dark-400 truncate">{username}</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-dark-600 text-dark-300">{role}</span>
            </div>
          )}
          <div className={`${collapsed ? 'flex flex-col items-center gap-1' : 'flex items-center gap-1'}`}>
            <button onClick={() => setCollapsed(!collapsed)} className="p-1.5 rounded-lg text-dark-400 hover:text-white hover:bg-dark-700">
              {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
            {!collapsed && (
              <>
                <button onClick={toggleTheme}
                  className="p-1.5 rounded-lg text-dark-400 hover:text-neon-green hover:bg-neon-green/10" title="Toggle theme">
                  {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                </button>
                <button onClick={() => setLang(lang === 'en' ? 'fa' : 'en')}
                  className="p-1.5 rounded-lg text-dark-400 hover:text-neon-green hover:bg-neon-green/10" title="Language">
                  <Globe className="w-4 h-4" />
                </button>
                <button onClick={() => setLang(lang === 'en' ? 'fa' : 'en')}
                  className="text-xs text-dark-400 hover:text-neon-green">
                  {lang === 'en' ? 'فارسی' : 'EN'}
                </button>
                <button onClick={() => setPwOpen(true)} className="p-1.5 rounded-lg text-dark-400 hover:text-neon-green hover:bg-neon-green/10" title="Change password">
                  <KeyRound className="w-4 h-4" />
                </button>
              </>
            )}
            <button onClick={onLogout} className="p-1.5 rounded-lg text-dark-400 hover:text-neon-red hover:bg-neon-red/10" title="Logout">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/new-scan" element={<NewScan />} />
          <Route path="/scan/:id" element={<ScanDetail />} />
          <Route path="/assets" element={<Assets />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </main>

      {pwOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setPwOpen(false)}>
          <div className="glass-card rounded-2xl p-6 w-full max-w-sm mx-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-neon-blue" />
                <h3 className="font-semibold text-white">{t('changePassword')}</h3>
              </div>
              <button onClick={() => setPwOpen(false)} className="p-1 rounded-lg text-dark-400 hover:text-white"><X className="w-4 h-4" /></button>
            </div>
            <div className="space-y-3">
              <input type="password" placeholder="Current password" value={pwOld} onChange={e => setPwOld(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-dark-700 border border-dark-600 text-white text-sm focus:border-neon-blue focus:outline-none" />
              <input type="password" placeholder="New password (min 6 chars)" value={pwNew} onChange={e => setPwNew(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-dark-700 border border-dark-600 text-white text-sm focus:border-neon-blue focus:outline-none" />
              {pwMsg && (
                <p className={`text-xs ${pwMsg.ok ? 'text-neon-green' : 'text-neon-red'}`}>{pwMsg.text}</p>
              )}
              <button onClick={submitPassword} disabled={pwSaving || !pwOld || !pwNew}
                className="w-full py-2 rounded-lg bg-neon-blue text-dark-900 font-medium text-sm hover:bg-neon-blue/80 disabled:opacity-50">
                {pwSaving ? '...' : t('changePassword')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [auth, setAuth] = useState<{ role: string; username: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('hardino_token');
    if (!token) { setLoading(false); return; }
    getMe()
      .then(u => setAuth({ role: u.role, username: u.username }))
      .catch(() => localStorage.removeItem('hardino_token'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { onUnauthorized(() => setAuth(null)); }, []);

  if (loading) return <div className="h-screen flex items-center justify-center bg-dark-900"><div className="text-dark-400">Loading...</div></div>;
  if (!auth) return <Login onLogin={(role, username) => setAuth({ role, username })} />;

  return (
    <Shell role={auth.role} username={auth.username} onLogout={() => { localStorage.removeItem('hardino_token'); setAuth(null); navigate('/'); }} />
  );
}
