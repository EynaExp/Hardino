import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { getEngagement, getFindings, getSessions, getActions, getReports, getPhases } from '../services/api';
import { Shield, CheckCircle, AlertTriangle, XCircle, Clock, ChevronDown, ChevronRight } from 'lucide-react';

export default function ScanDetail() {
  const { id } = useParams<{ id: string }>();
  const [engagement, setEngagement] = useState<any>(null);
  const [findings, setFindings] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [phases, setPhases] = useState<any[]>([]);
  const [expandedSession, setExpandedSession] = useState<string | null>(null);
  const [actions, setActions] = useState<any[]>([]);
  const [tab, setTab] = useState<'findings' | 'phases' | 'agent' | 'report'>('findings');

  useEffect(() => {
    if (!id) return;
    getEngagement(id).then(setEngagement).catch(() => {});
    getFindings(id).then(setFindings).catch(() => {});
    getSessions(id).then(setSessions).catch(() => {});
    getReports(id).then(setReports).catch(() => {});
    getPhases(id).then(setPhases).catch(() => {});
  }, [id]);

  // Auto-refresh if running
  useEffect(() => {
    if (!id || !engagement || !['running', 'queued'].includes(engagement.status)) return;
    const interval = setInterval(() => {
      getEngagement(id).then(setEngagement);
      getFindings(id).then(setFindings);
      getSessions(id).then(setSessions);
      getPhases(id).then(setPhases);
      getReports(id).then(setReports);
    }, 3000);
    return () => clearInterval(interval);
  }, [id, engagement?.status]);

  const loadActions = async (sessionId: string) => {
    if (expandedSession === sessionId) { setExpandedSession(null); return; }
    setExpandedSession(sessionId);
    const acts = await getActions(sessionId);
    setActions(acts);
  };

  const report = reports[0];
  const reportData = report?.content ? JSON.parse(report.content) : null;

  if (!engagement) return <div className="p-6 text-dark-400">Loading...</div>;

  const phaseIcons: Record<string, any> = {
    audit: Shield,
    hardening: AlertTriangle,
    report: CheckCircle,
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">{engagement.name}</h1>
          <p className="text-dark-400 text-sm mt-1">
            {engagement.target_scope?.[0]?.host || 'Unknown target'} • Created {new Date(engagement.created_at).toLocaleString()}
          </p>
        </div>
        <span className={`px-3 py-1 rounded-full text-sm status-${engagement.status}`}>
          {engagement.status}
        </span>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-dark-600">
        {(['findings', 'phases', 'agent', 'report'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === t ? 'border-neon-green text-neon-green' : 'border-transparent text-dark-400 hover:text-white'
            }`}>
            {t === 'findings' ? `Findings (${findings.length})` : t === 'phases' ? 'Phases' : t === 'agent' ? 'Agent Sessions' : 'Report'}
          </button>
        ))}
      </div>

      {/* Findings Tab */}
      {tab === 'findings' && (
        <div className="space-y-3">
          {findings.length === 0 && <div className="text-dark-400 text-sm">No findings yet.</div>}
          {findings.map(f => (
            <div key={f.id} className="glass-card rounded-xl p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium severity-${f.severity} bg-${f.severity === 'critical' ? 'neon-red' : f.severity === 'high' ? 'neon-orange' : 'dark-600'}/20`}>
                      {f.severity}
                    </span>
                    <span className="text-xs text-dark-400">{f.category}</span>
                  </div>
                  <h3 className="text-white font-medium mt-1">{f.title}</h3>
                  <p className="text-dark-300 text-sm mt-1">{f.description}</p>
                  {f.recommendation && (
                    <p className="text-neon-green text-xs mt-2">Fix: {f.recommendation}</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Phases Tab */}
      {tab === 'phases' && (
        <div className="space-y-2">
          {phases.map(p => {
            const Icon = phaseIcons[p.phase] || Shield;
            return (
              <div key={p.id} className="glass-card rounded-xl p-4 flex items-center gap-4">
                <Icon className={`w-5 h-5 ${p.status === 'completed' ? 'text-neon-green' : p.status === 'started' ? 'text-neon-blue' : 'text-dark-400'}`} />
                <div className="flex-1">
                  <div className="font-medium text-white capitalize">{p.phase}</div>
                  <div className="text-xs text-dark-400">{p.message}</div>
                </div>
                <span className={`text-xs ${p.status === 'completed' ? 'text-neon-green' : p.status === 'failed' ? 'text-neon-red' : 'text-neon-blue'}`}>
                  {p.status}
                </span>
                {p.completed_at && (
                  <span className="text-xs text-dark-400">{new Date(p.completed_at).toLocaleTimeString()}</span>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Agent Sessions Tab */}
      {tab === 'agent' && (
        <div className="space-y-2">
          {sessions.map(s => (
            <div key={s.id} className="glass-card rounded-xl overflow-hidden">
              <div className="p-4 flex items-center gap-4 cursor-pointer hover:bg-dark-700/50"
                onClick={() => loadActions(s.id)}>
                {expandedSession === s.id ? <ChevronDown className="w-4 h-4 text-dark-400" /> : <ChevronRight className="w-4 h-4 text-dark-400" />}
                <div className="flex-1">
                  <div className="font-medium text-white capitalize">{s.agent_role} Agent</div>
                  <div className="text-xs text-dark-400">
                    {s.input_tokens || 0} in / {s.output_tokens || 0} out tokens
                  </div>
                </div>
                <span className={`text-xs ${s.status === 'completed' ? 'text-neon-green' : 'text-neon-blue'}`}>{s.status}</span>
              </div>
              {expandedSession === s.id && (
                <div className="border-t border-dark-600 max-h-80 overflow-auto">
                  {actions.map(a => (
                    <div key={a.id} className="px-4 py-2 border-b border-dark-700 last:border-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs px-1.5 py-0.5 rounded bg-dark-600 text-neon-blue font-mono">{a.tool_name}</span>
                      </div>
                      <pre className="text-xs text-dark-300 mt-1 whitespace-pre-wrap max-h-32 overflow-auto">{a.tool_output}</pre>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Report Tab */}
      {tab === 'report' && (
        <div className="space-y-4">
          {reportData ? (
            <>
              <div className="glass-card rounded-xl p-5">
                <h3 className="font-semibold text-white mb-3">Hardening Score</h3>
                <div className="flex items-center gap-4">
                  <div className={`text-5xl font-bold ${
                    reportData.summary.hardening_score >= 80 ? 'text-neon-green' :
                    reportData.summary.hardening_score >= 50 ? 'text-neon-orange' : 'text-neon-red'
                  }`}>
                    {reportData.summary.hardening_score}%
                  </div>
                  <div className="space-y-1 text-sm">
                    <div className="text-neon-red">Critical: {reportData.summary.critical}</div>
                    <div className="text-neon-orange">High: {reportData.summary.high}</div>
                    <div className="text-neon-yellow">Medium: {reportData.summary.medium}</div>
                    <div className="text-neon-blue">Low: {reportData.summary.low}</div>
                  </div>
                </div>
              </div>
              <div className="glass-card rounded-xl p-5">
                <h3 className="font-semibold text-white mb-2">Summary</h3>
                <p className="text-dark-300 text-sm">Target: {reportData.target}</p>
                <p className="text-dark-300 text-sm">Total findings: {reportData.summary.total_findings}</p>
              </div>
            </>
          ) : (
            <div className="text-dark-400 text-sm">Report not yet available.</div>
          )}
        </div>
      )}
    </div>
  );
}
