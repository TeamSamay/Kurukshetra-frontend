import React, { useState } from 'react';
import {
  ShieldAlert, Clock, Lock, Activity, Terminal, Copy, Check,
  AlertTriangle, ChevronDown, ChevronUp, TrendingUp,
  Cpu, CheckCircle2, Sparkles, Zap, Shield, CheckCheck
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer
} from 'recharts';
import { explainEventWithAI } from '../services/api';

function riskBadge(risk) {
  const r = (risk || '').toUpperCase();
  const map = {
    CRITICAL: 'badge-critical',
    HIGH: 'badge-high',
    MEDIUM: 'badge-medium',
    LOW: 'badge-low',
    INFO: 'badge-info'
  };
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
    <button onClick={copy} className="btn-ghost p-1" title="Copy to clipboard">
      {copied ? <Check className="w-3 h-3 text-emerald-600" />
               : <Copy className="w-3 h-3 text-slate-400" />}
    </button>
  );
}

function formatTs(ts) {
  if (!ts) return '—';
  return new Date(ts).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', second: '2-digit'
  });
}

function buildRiskTimeline(events) {
  return (events || [])
    .filter(e => e.risk_score !== undefined || e.risk_delta !== undefined)
    .map((e, i) => ({ t: i + 1, risk: e.risk_score ?? ((i + 1) * 15) }));
}

const TOOLTIP_STYLE = {
  background: '#ffffff', border: '1px solid #e2e8f0',
  borderRadius: 10, fontSize: 12, color: '#0f172a',
  boxShadow: '0 4px 14px rgba(0,0,0,0.08)',
};

export default function AttackInvestigation({ sessionData, onContainSession }) {
  const [expandedEvent, setExpandedEvent] = useState(null);
  const [eventExplanations, setEventExplanations] = useState({});
  const [explainingEventId, setExplainingEventId] = useState(null);
  const [copiedRule, setCopiedRule] = useState(false);

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
    risk_score = 0, attacker_dna, fingerprint, events = [], iocs = [],
    created_at, updated_at, start_time, last_seen, ai_analysis
  } = sessionData;

  const displayFingerprint = fingerprint || attacker_dna;
  const displayFirstSeen = start_time || created_at;
  const displayLastSeen = last_seen || updated_at;
  const isContained = (status || '').toUpperCase() === 'CONTAINED';
  const riskTimelineData = buildRiskTimeline(events);

  const firewallCommand = `sudo ufw deny from ${source_ip || '0.0.0.0'} to any comment 'Kurukshetra Honeypot Block'`;

  const copyFirewallRule = async () => {
    await navigator.clipboard.writeText(firewallCommand).catch(() => {});
    setCopiedRule(true);
    setTimeout(() => setCopiedRule(false), 2500);
  };

  async function handleExplainEvent(ev, idx) {
    const key = ev.event_id || idx;
    if (eventExplanations[key]) {
      setExpandedEvent(expandedEvent === idx ? null : idx);
      return;
    }

    setExplainingEventId(key);
    try {
      const res = await explainEventWithAI({
        event_id: ev.event_id || `EVT-${key}`,
        event: ev.event || ev.event_type || 'Unknown action',
        event_type: ev.event_type || 'command',
        service: service || 'ssh',
        source_ip: source_ip || 'unknown'
      });
      setEventExplanations(prev => ({ ...prev, [key]: res }));
      setExpandedEvent(idx);
    } catch (err) {
      console.error('Explain failed:', err);
    } finally {
      setExplainingEventId(null);
    }
  }

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
                <h2 className="text-lg font-black text-slate-800">AI Attacker Forensics Studio</h2>
                <span className={`badge ${riskBadge(risk_level)}`}>{risk_level || 'LOW'}</span>
                {isContained && <span className="badge badge-contained">CONTAINED</span>}
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className="font-mono text-sm font-bold text-blue-600">{source_ip || '?.?.?.?'}</span>
                <CopyBtn text={source_ip || ''} />
                <span className="text-xs text-slate-400">→</span>
                <span className="badge badge-info text-[10px]">{(service || '').toUpperCase()} HONEYPOT</span>
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

            {!isContained && onContainSession && (
              <button onClick={() => onContainSession(session_id)} className="btn-danger">
                <Lock className="w-4 h-4" /> Contain Session
              </button>
            )}
          </div>
        </div>

        {/* Attacker DNA */}
        {displayFingerprint && (
          <div className="mt-4 px-4 py-2.5 rounded-xl flex items-center justify-between flex-wrap gap-3 bg-purple-50/70 border border-purple-100">
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-bold tracking-widest uppercase text-purple-600">ATTACKER DNA</span>
              <span className="font-mono font-bold text-purple-700">{displayFingerprint}</span>
              <CopyBtn text={displayFingerprint} />
            </div>
            <span className="text-[11px] text-purple-600 font-medium">Evidence-based behavioral fingerprint</span>
          </div>
        )}
      </div>

      {/* STRUCTURED AI THREAT ANALYST PANEL (Clean Theme) */}
      {ai_analysis && (
        <div className="card p-6">
          <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-blue-50 border border-blue-200">
                <Cpu className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-slate-800">AI Threat Analyst Intelligence</h3>
                  <span className="badge badge-info text-[10px]">
                    Kurukshetra Cyber Threat Intelligence Engine
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">Structured telemetry reasoning & objective analysis</p>
              </div>
            </div>

            {/* 1-Click Action Button */}
            <button
              onClick={copyFirewallRule}
              className="btn-ghost text-xs flex items-center gap-1.5 border border-slate-200 bg-slate-50 hover:bg-slate-100"
              title="Copy UFW Firewall block rule for this attacker IP"
            >
              {copiedRule ? (
                <>
                  <CheckCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-700 font-bold">UFW Block Rule Copied!</span>
                </>
              ) : (
                <>
                  <Shield className="w-3.5 h-3.5 text-blue-600" />
                  <span>Copy Firewall Ban Rule</span>
                </>
              )}
            </button>
          </div>

          <div className="space-y-4">
            {/* Threat Summary */}
            <div className="p-3.5 rounded-xl bg-blue-50/40 border border-blue-100">
              <p className="text-[10px] font-bold uppercase tracking-wider text-blue-700">Threat Summary</p>
              <p className="text-xs text-slate-700 mt-1 leading-relaxed">
                {ai_analysis.threat_summary || ai_analysis.summary}
              </p>
            </div>

            {/* Observed Behavior vs AI Interpretation */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-2">
                  ✓ Observed Behavior (Verifiable Telemetry)
                </p>
                {Array.isArray(ai_analysis.observed_behavior) && ai_analysis.observed_behavior.length > 0 ? (
                  <ul className="space-y-1.5 text-xs text-slate-700">
                    {ai_analysis.observed_behavior.map((obs, idx) => (
                      <li key={idx} className="flex items-start gap-1.5">
                        <span className="text-blue-600 font-bold">•</span>
                        <span>{obs}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-slate-600">{ai_analysis.observed_behavior_explanation || 'Interactions recorded across honeypot sensors.'}</p>
                )}
              </div>

              <div className="p-3.5 rounded-xl bg-purple-50/50 border border-purple-100">
                <p className="text-[10px] font-bold uppercase tracking-wider text-purple-700 mb-2">
                  🧠 AI Interpretation (Intent & Threat Modeling)
                </p>
                {Array.isArray(ai_analysis.ai_interpretation) && ai_analysis.ai_interpretation.length > 0 ? (
                  <ul className="space-y-1.5 text-xs text-slate-700">
                    {ai_analysis.ai_interpretation.map((interp, idx) => (
                      <li key={idx} className="flex items-start gap-1.5">
                        <span className="text-purple-600 font-bold">•</span>
                        <span>{interp}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-slate-600">Likely intent: {ai_analysis.likely_objective || 'Reconnaissance and service probing.'}</p>
                )}
              </div>
            </div>

            {/* Recommended Defensive Actions */}
            {ai_analysis.recommended_actions && (
              <div className="p-3.5 rounded-xl bg-emerald-50/50 border border-emerald-100">
                <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 mb-1.5">
                  🛡️ Human-Reviewed Defensive Recommendations
                </p>
                <ul className="space-y-1 text-xs text-slate-700">
                  {(Array.isArray(ai_analysis.recommended_actions) ? ai_analysis.recommended_actions : [ai_analysis.recommended_defensive_action]).map((rec, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <span className="text-emerald-600 font-bold">→</span>
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Metadata + Risk Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Metadata */}
        <div className="card p-6">
          <h3 className="text-sm font-bold text-slate-800 mb-4">Session Telemetry Metadata</h3>
          <div className="space-y-3">
            {[
              { label: 'First Seen',    value: formatTs(displayFirstSeen) },
              { label: 'Last Updated',  value: formatTs(displayLastSeen) },
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
                <YAxis domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false} axisLine={false} />
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

      {/* EVENT TIMELINE WITH EXPLAIN WITH AI */}
      <div className="card p-6">
        <div className="flex items-center justify-between gap-4 mb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-sky-50 border border-sky-100">
              <Activity className="w-4 h-4 text-sky-600" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">Forensic Attack Timeline</h3>
              <p className="text-[11px] text-slate-400">{events.length} telemetry interactions recorded</p>
            </div>
          </div>
        </div>

        {events.length === 0 ? (
          <p className="text-sm text-center py-8 text-slate-400">No events recorded for this session</p>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {events.map((ev, i) => {
              const evKey = ev.event_id || i;
              const explanation = eventExplanations[evKey];
              const isExplaining = explainingEventId === evKey;

              return (
                <div key={evKey} className="border border-slate-100 rounded-xl overflow-hidden">
                  <div className="flex items-center justify-between gap-3 px-3.5 py-3 bg-slate-50/60 hover:bg-slate-50 transition-colors">
                    <div
                      onClick={() => setExpandedEvent(expandedEvent === i ? null : i)}
                      className="flex items-start gap-3 flex-1 min-w-0 cursor-pointer"
                    >
                      <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 bg-sky-100 border border-sky-200">
                        <Terminal className="w-3 h-3 text-sky-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold text-slate-800 font-mono">
                            {ev.event || ev.event_type || 'Interaction'}
                          </span>
                          <span className="text-[10px] font-mono text-slate-400">
                            {formatTs(ev.timestamp || ev.created_at)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => handleExplainEvent(ev, i)}
                        disabled={isExplaining}
                        className="px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 border border-blue-200 hover:from-blue-100 hover:to-indigo-100 transition-all cursor-pointer"
                      >
                        <Zap className={`w-3 h-3 text-blue-600 ${isExplaining ? 'animate-pulse' : ''}`} />
                        {isExplaining ? 'Analyzing...' : 'Explain with AI'}
                      </button>

                      <button
                        onClick={() => setExpandedEvent(expandedEvent === i ? null : i)}
                        className="p-1 text-slate-400 hover:text-slate-600"
                      >
                        {expandedEvent === i ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* AI Explanation Box */}
                  {explanation && expandedEvent === i && (
                    <div className="px-4 py-3 bg-blue-50/50 border-t border-blue-100 space-y-2 text-xs">
                      <div className="flex items-center gap-1.5 text-blue-700 font-bold">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>AI Forensic Event Breakdown</span>
                      </div>
                      <p><strong className="text-slate-800">Observed Behavior:</strong> {explanation.observed_behavior}</p>
                      <p><strong className="text-purple-700">AI Interpretation:</strong> {explanation.ai_interpretation}</p>
                      <p><strong className="text-slate-700">Threat Context:</strong> {explanation.threat_context}</p>
                      <p><strong className="text-emerald-700">Defensive Note:</strong> {explanation.defensive_note}</p>
                    </div>
                  )}

                  {/* Raw JSON viewer */}
                  {!explanation && expandedEvent === i && (
                    <div className="px-4 py-3 bg-slate-900 border-t border-slate-800">
                      <pre className="text-[11px] font-mono whitespace-pre-wrap break-all text-slate-200">
                        {JSON.stringify(ev.metadata || ev, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              );
            })}
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
                {ioc.ioc_type && <span className="text-[10px] opacity-70">[{ioc.ioc_type}]</span>}
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
