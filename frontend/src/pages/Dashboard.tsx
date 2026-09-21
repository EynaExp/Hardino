import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDashboardStats, listEngagements, deleteEngagement } from '../services/api';
import { Shield, Activity, AlertTriangle, CheckCircle, Trash2 } from 'lucide-react';

export default function Dashboard() {
  const [stats, setStats] = useState<any>(null);
  const [scans, setScans] = useState<any[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    getDashboardStats().then(setStats).catch(() => {});
    listEngagements().then(setScans).catch(() => {});
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this scan?')) return;
    await deleteEngagement(id);
    setScans(scans.filter(s => s.id !== id));
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <button onClick={() => navigate('/new-scan')}
          className="px-4 py-2 rounded-lg bg-neon-green text-dark-900 font-medium hover:bg-neon-green/80 text-sm">
          + New Scan
        </button>
      </div>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Scans', value: stats.total_scans, icon: Shield, color: 'text-neon-blue' },
            { label: 'Completed', value: stats.completed, icon: CheckCircle, color: 'text-neon-green' },
            { label: 'Critical Findings', value: stats.critical, icon: AlertTriangle, color: 'text-neon-red' },
            { label: 'High Findings', value: stats.high, icon: Activity, color: 'text-neon-orange' },
          ].map((s, i) => (
            <div key={i} className="glass-card rounded-xl p-4">
              <s.icon className={`w-5 h-5 ${s.color} mb-2`} />
              <div className="text-2xl font-bold text-white">{s.value}</div>
              <div className="text-xs text-dark-400">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      <div className="glass-card rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-dark-600">
          <h2 className="font-semibold text-white">Recent Scans</h2>
        </div>
        <div className="divide-y divide-dark-600">
          {scans.length === 0 && (
            <div className="p-8 text-center text-dark-400">No scans yet. Click "New Scan" to start.</div>
          )}
          {scans.map(s => (
            <div key={s.id} className="px-4 py-3 flex items-center justify-between hover:bg-dark-700/50 cursor-pointer"
              onClick={() => navigate(`/scan/${s.id}`)}>
              <div>
                <div className="font-medium text-white">{s.name}</div>
                <div className="text-xs text-dark-400">
                  {s.target_scope?.[0]?.host || s.target_scope?.[0]?.target || 'No target'} • {new Date(s.created_at).toLocaleString()}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-xs px-2 py-1 rounded-full status-${s.status}`}>{s.status}</span>
                <button onClick={e => { e.stopPropagation(); handleDelete(s.id); }}
                  className="p-1.5 rounded-lg text-dark-400 hover:text-neon-red hover:bg-neon-red/10">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
