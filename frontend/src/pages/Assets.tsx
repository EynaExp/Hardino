import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { listAssets, getAsset, updateAssetNotes, deleteAsset } from '../services/api';
import { Server, Search, Eye, Trash2, StickyNote, X, ExternalLink } from 'lucide-react';

export default function Assets() {
  const [assets, setAssets] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<any>(null);
  const [notes, setNotes] = useState('');
  const navigate = useNavigate();

  useEffect(() => { listAssets().then(setAssets).catch(() => {}); }, []);

  const filtered = assets.filter(a =>
    a.host.includes(search) || (a.os_type || '').toLowerCase().includes(search.toLowerCase())
  );

  const handleView = async (id: string) => {
    const a = await getAsset(id);
    setSelected(a);
    setNotes(a.notes || '');
  };

  const handleSaveNotes = async () => {
    if (!selected) return;
    await updateAssetNotes(selected.id, notes);
    setSelected({ ...selected, notes });
    setAssets(assets.map(a => a.id === selected.id ? { ...a, notes } : a));
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this asset?')) return;
    await deleteAsset(id);
    setAssets(assets.filter(a => a.id !== id));
    if (selected?.id === id) setSelected(null);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Assets</h1>
        <span className="text-sm text-dark-400">{assets.length} devices</span>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-dark-400" />
        <input type="text" placeholder="Search by IP, hostname, or OS..." value={search} onChange={e => setSearch(e.target.value)}
          className="w-full pl-9 pr-3 py-2 rounded-lg bg-dark-700 border border-dark-600 text-white text-sm focus:border-neon-blue focus:outline-none" />
      </div>

      {/* Asset Table */}
      <div className="glass-card rounded-xl overflow-hidden">
        {filtered.length === 0 && <div className="p-8 text-center text-dark-400">No assets found. Run a scan to discover devices.</div>}
        {filtered.length > 0 && (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-dark-600 text-left">
                <th className="px-4 py-3 text-dark-400 font-medium">Host</th>
                <th className="px-4 py-3 text-dark-400 font-medium">OS</th>
                <th className="px-4 py-3 text-dark-400 font-medium">Score</th>
                <th className="px-4 py-3 text-dark-400 font-medium">Findings</th>
                <th className="px-4 py-3 text-dark-400 font-medium">Last Scan</th>
                <th className="px-4 py-3 text-dark-400 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(a => (
                <tr key={a.id} className="border-b border-dark-700 last:border-0 hover:bg-dark-700/30">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Server className="w-4 h-4 text-neon-blue" />
                      <span className="text-white font-mono">{a.host}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-dark-300 capitalize">{a.os_type || 'unknown'}</td>
                  <td className="px-4 py-3">
                    <span className={`font-bold ${
                      (a.hardening_score ?? 0) >= 80 ? 'text-neon-green' :
                      (a.hardening_score ?? 0) >= 50 ? 'text-neon-orange' : 'text-neon-red'
                    }`}>
                      {a.hardening_score ?? '-'}%
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-xs ${
                      a.findings_count > 0 ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'
                    }`}>
                      {a.findings_count} issues
                    </span>
                  </td>
                  <td className="px-4 py-3 text-dark-400 text-xs">
                    {a.last_scan_at ? new Date(a.last_scan_at).toLocaleString() : '-'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => handleView(a.id)} className="p-1.5 rounded-lg text-dark-400 hover:text-neon-blue hover:bg-neon-blue/10" title="View details">
                        <Eye className="w-4 h-4" />
                      </button>
                      {a.last_scan_id && (
                        <button onClick={() => navigate(`/scan/${a.last_scan_id}`)} className="p-1.5 rounded-lg text-dark-400 hover:text-neon-green hover:bg-neon-green/10" title="View last scan">
                          <ExternalLink className="w-4 h-4" />
                        </button>
                      )}
                      <button onClick={() => handleDelete(a.id)} className="p-1.5 rounded-lg text-dark-400 hover:text-neon-red hover:bg-neon-red/10" title="Delete">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Asset Detail Modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setSelected(null)}>
          <div className="glass-card rounded-2xl p-6 w-full max-w-3xl mx-4 max-h-[85vh] overflow-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Server className="w-5 h-5 text-neon-blue" />
                <h2 className="text-lg font-bold text-white">{selected.host}</h2>
                <span className="text-sm text-dark-400 capitalize">({selected.os_type})</span>
              </div>
              <button onClick={() => setSelected(null)} className="p-1 rounded-lg text-dark-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>

            {/* Score */}
            <div className="flex items-center gap-6 mb-4">
              <div className={`text-4xl font-bold ${
                (selected.hardening_score ?? 0) >= 80 ? 'text-neon-green' :
                (selected.hardening_score ?? 0) >= 50 ? 'text-neon-orange' : 'text-neon-red'
              }`}>
                {selected.hardening_score ?? '-'}%
              </div>
              <div className="text-sm text-dark-300">
                {selected.findings_count} findings • Last scan: {selected.last_scan_at ? new Date(selected.last_scan_at).toLocaleString() : '-'}
              </div>
            </div>

            {/* OS Info */}
            {selected.os_info && (
              <div className="mb-4">
                <h3 className="text-sm font-medium text-dark-400 mb-1">OS Info</h3>
                <pre className="text-xs text-dark-300 bg-dark-700 rounded-lg p-3 overflow-auto max-h-24">{selected.os_info}</pre>
              </div>
            )}

            {/* Open Ports */}
            {selected.open_ports?.raw && (
              <div className="mb-4">
                <h3 className="text-sm font-medium text-dark-400 mb-1">Open Ports & Services</h3>
                <pre className="text-xs text-dark-300 bg-dark-700 rounded-lg p-3 overflow-auto max-h-40">{selected.open_ports.raw}</pre>
              </div>
            )}

            {/* Running Services */}
            {selected.services?.raw && (
              <div className="mb-4">
                <h3 className="text-sm font-medium text-dark-400 mb-1">Running Services</h3>
                <pre className="text-xs text-dark-300 bg-dark-700 rounded-lg p-3 overflow-auto max-h-40">{selected.services.raw}</pre>
              </div>
            )}

            {/* Findings */}
            {selected.findings?.length > 0 && (
              <div className="mb-4">
                <h3 className="text-sm font-medium text-dark-400 mb-2">Findings ({selected.findings.length})</h3>
                <div className="space-y-1">
                  {selected.findings.map((f: any) => (
                    <div key={f.id} className="flex items-center gap-2 text-xs">
                      <span className={`px-1.5 py-0.5 rounded font-medium ${
                        f.severity === 'critical' ? 'bg-red-500/20 text-red-400' :
                        f.severity === 'high' ? 'bg-orange-500/20 text-orange-400' :
                        f.severity === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                        'bg-blue-500/20 text-blue-400'
                      }`}>{f.severity}</span>
                      <span className="text-dark-300">{f.title}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Notes */}
            <div>
              <h3 className="text-sm font-medium text-dark-400 mb-1 flex items-center gap-1">
                <StickyNote className="w-3 h-3" /> Notes
              </h3>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
                className="w-full px-3 py-2 rounded-lg bg-dark-700 border border-dark-600 text-white text-sm focus:border-neon-blue focus:outline-none resize-none"
                placeholder="Add notes about this asset..." />
              <button onClick={handleSaveNotes}
                className="mt-2 px-3 py-1.5 rounded-lg bg-neon-blue text-dark-900 text-xs font-medium hover:bg-neon-blue/80">
                Save Notes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
