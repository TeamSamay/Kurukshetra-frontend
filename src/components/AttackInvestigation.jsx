import React, { useState } from 'react';
import {
  ShieldAlert, Clock, Lock, Activity, Terminal, Copy, Check,
  AlertTriangle, FileText, ChevronDown, ChevronUp, TrendingUp
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer
} from 'recharts';

function riskBadge(risk) {
  const r = (risk || '').toUpperCase();
  const map = { CRITICAL:'badge-critical', HIGH:'badge-high', MEDIUM:'badge-medium', LOW:'badge-low', INFO:'badge-info' };
  return map[r] || 'badge-low';
}

function CopyBtn({ text }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(text).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={copy} className="btn-ghost p-1" title="Copy">
      {copied ? <Check className="w-3 h-3 text-emerald-600" />
               : <Copy className="w-3 h-3 text-slate-400" />}
    </button>
  );
}

function formatTs(ts) {
  if (!ts) return '—';
  return new Date(ts).toLocaleString('en-GB', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit', second:'2-digit' });
}

function buildRiskTimeline(events) {
  return (events || [])
    .filter(e => e.risk_score !== undefined)
    .map((e, i) => ({ t: i + 1, risk: e.risk_score || 0 }));
}

const TOOLTIP_STYLE = {
  background: '#ffffff', border: '1px solid #e2e8f0',
  borderRadius: 10, fontSize: 12, color: '#0f172a',
  boxShadow: '0 4px 14px rgba(0,0,0,0.08)',
};

export default function AttackInvestigation({ sessionData, onContainSession }) {
  const [expandedEvent, setExpandedEvent] = useState(null);

  if (!sessionData) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-5 fade-in-up" style={{ minHeight: 400 }}>
        <ShieldAlert className="w-16 h-16 text-slate-300" />
        <div className="text-center">
          <h2 className="text-xl font-black text-slate-800">No Session Selected</h2>
          <p className="text-sm mt-2 text-slate-400">
            Go to <span className="font-bold text-sky-600">Live Attacks</span> and click{' '}
            <span className="font-bold text-blue-600">Investigate</span> on any session.
          </p>
        </div>
      </div>
    );
  }

  const {
    session_id, source_ip, service, status, risk_level,
    risk_score = 0, attacker_dna, events = [], iocs = [],
    created_at, updated_at,
  } = sessionData;

  const riskTimelineData = buildRiskTimeline(events);
  const isContained = (status || '').toUpperCase() === 'CONTAINED';

  return (
    <div className="space-y-5 fade-in-up">

      {/* Header Card */}
      <div className="card p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 bg-rose-50 border border-rose-100">
              <ShieldAlert className="w-6 h-6 text-rose-600" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-black text-slate-800">Session Investigation</h2>
                <span className={`badge ${riskBadge(risk_level)}`}>{risk_level || 'LOW'}</span>
                {isContained && <span className="badge badge-contained">CONTAINED</span>}
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className="font-mono text-sm font-bold text-blue-600">{source_ip || '?.?.?.?'}</span>
                <CopyBtn text={source_ip || ''} />
                <span className="text-xs text-slate-400">→</span>
                <span className="badge badge-info text-[10px]">{(service || '').toUpperCase()}</span>
              </div>
              <p className="text-xs font-mono mt-1 text-slate-400">{session_id}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* Risk Gauge */}
            <div className="flex items-center gap-3 px-4 py-2 rounded-xl bg-slate-50 border border-slate-100">
              <div>
                <p className="text-[10px] font-bold tracking-widest uppercase text-slate-400">Risk Score</p>
                <p className="text-2xl font-black mt-0.5" style={{
                  color: risk_score >= 80 ? '#e11d48' : risk_score >= 50 ? '#d97706' : '#2563eb'
                }}>{risk_score}</p>
              </div>
              <svg width="48" height="48" viewBox="0 0 48 48">
                <circle cx="24" cy="24" r="18" fill="none" stroke="#e2e8f0" strokeWidth="4" />
                <circle cx="24" cy="24" r="18" fill="none"
                  stroke={risk_score >= 80 ? '#e11d48' : risk_score >= 50 ? '#d97706' : '#2563eb'}
                  strokeWidth="4" strokeLinecap="round"
                  strokeDasharray={`${(risk_score / 100) * 113} 113`}
                  transform="rotate(-90 24 24)" />
                <text x="24" y="28" textAnchor="middle" fontSize="10" fill="#94a3b8" fontFamily="JetBrains Mono">
                  /100
                </text>
              </svg>
            </div>

            {!isContained && (
              <button onClick={() => onContainSession(session_id)} className="btn-danger">
                <Lock className="w-4 h-4" /> Contain Session
              </button>
            )}
          </div>
        </div>

        {/* Attacker DNA */}
        {attacker_dna && (
          <div className="mt-4 px-4 py-2.5 rounded-xl flex items-center gap-3 bg-purple-50/70 border border-purple-100">
            <span className="text-[10px] font-bold tracking-widest uppercase text-purple-600">ATTACKER DNA</span>
            <span className="font-mono font-bold text-purple-700">{attacker_dna}</span>
            <CopyBtn text={attacker_dna} />
          </div>
        )}
      </div>

      {/* Metadata + Risk Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Metadata */}
        <div className="card p-6">
          <h3 className="text-sm font-bold text-slate-800 mb-4">Session Metadata</h3>
          <div className="space-y-3">
            {[
              { label: 'First Seen',    value: formatTs(created_at) },
              { label: 'Last Updated',  value: formatTs(updated_at) },
              { label: 'Total Events',  value: events.length },
              { label: 'IOCs Captured', value: iocs.length },
              { label: 'Status',        value: status || '—' },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-center justify-between py-2 border-b border-slate-100">
                <span className="text-xs font-semibold text-slate-500">{label}</span>
                <span className="text-xs font-bold text-slate-800 font-mono">{String(value)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Risk Score Timeline */}
        <div className="card p-6">
          <div className="flex items-center gap-2.5 mb-4">
            <TrendingUp className="w-4 h-4 text-amber-600" />
            <h3 className="text-sm font-bold text-slate-800">Risk Score Evolution</h3>
          </div>
          {riskTimelineData.length > 1 ? (
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={riskTimelineData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <XAxis dataKey="t" tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis domain={[0,100]} tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => [`${v}`, 'Risk Score']} />
                <Line type="monotone" dataKey="risk" stroke="#d97706" strokeWidth={2.5}
                  dot={{ fill: '#d97706', r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-40 flex items-center justify-center">
              <p className="text-xs text-slate-400">Insufficient data points</p>
            </div>
          )}
        </div>
      </div>

      {/* Event Timeline */}
      <div className="card p-6">
        <div className="flex items-center gap-2.5 mb-5">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-sky-50 border border-sky-100">
            <Activity className="w-4 h-4 text-sky-600" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800">Attack Timeline</h3>
            <p className="text-[11px] text-slate-400">{events.length} events recorded</p>
          </div>
        </div>

        {events.length === 0 ? (
          <p className="text-sm text-center py-8 text-slate-400">No events recorded for this session</p>
        ) : (
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {events.map((ev, i) => (
              <div key={ev.event_id || i}>
                <div
                  onClick={() => setExpandedEvent(expandedEvent === i ? null : i)}
                  className="flex items-start gap-3 px-3 py-3 rounded-xl cursor-pointer tr-hover bg-slate-50/50 border border-slate-100">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 bg-sky-100 border border-sky-200">
                    <Terminal className="w-3 h-3 text-sky-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-slate-800">
                        {ev.event_type || 'EVENT'}
                      </span>
                      <span className="text-[10px] font-mono text-slate-400">
                        {formatTs(ev.timestamp || ev.created_at)}
                      </span>
                      {ev.risk_score !== undefined && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-50 text-amber-600 border border-amber-100">
                          Risk: {ev.risk_score}
                        </span>
                      )}
                    </div>
                    {ev.data && typeof ev.data === 'object' && Object.keys(ev.data).length > 0 && (
                      <p className="text-[11px] mt-1 font-mono truncate text-slate-600">
                        {JSON.stringify(ev.data).slice(0, 80)}…
                      </p>
                    )}
                  </div>
                  {expandedEvent === i ? <ChevronUp className="w-4 h-4 flex-shrink-0 mt-0.5 text-slate-400" />
                                       : <ChevronDown className="w-4 h-4 flex-shrink-0 mt-0.5 text-slate-400" />}
                </div>
                {expandedEvent === i && (
                  <div className="mx-3 mb-2 px-4 py-3 rounded-b-xl bg-slate-900 border border-slate-800 border-t-0">
                    <pre className="text-[11px] font-mono whitespace-pre-wrap break-all text-slate-200">
                      {JSON.stringify(ev.data || ev, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* IOCs from this session */}
      {iocs.length > 0 && (
        <div className="card p-6">
          <div className="flex items-center gap-2.5 mb-4">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <h3 className="text-sm font-bold text-slate-800">Indicators of Compromise ({iocs.length})</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {iocs.map((ioc, i) => (
              <span key={i} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-bold bg-amber-50 text-amber-700 border border-amber-200/70">
                {ioc.type && <span className="text-[10px] opacity-70">[{ioc.type}]</span>}
                {ioc.value || ioc}
                <CopyBtn text={ioc.value || ioc} />
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

