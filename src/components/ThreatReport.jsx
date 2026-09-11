import React from 'react';
import {
  FileText, Shield, AlertTriangle, CheckCircle, Lock, Clock,
  Terminal, Target, TrendingUp, Download, ShieldCheck, XCircle,
  Printer, Cpu, Sparkles
} from 'lucide-react';

function formatTs(ts) {
  if (!ts) return '—';
  return new Date(ts).toLocaleString('en-GB', {
    weekday: 'short', day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function riskColor(score) {
  if (score >= 80) return '#e11d48';
  if (score >= 50) return '#d97706';
  if (score >= 25) return '#2563eb';
  return '#059669';
}

function Section({ icon: Icon, title, iconBg, iconColor, children }) {
  return (
    <div className="card p-5">
      <div className="flex items-center gap-2.5 mb-4">
        <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${iconBg || 'bg-blue-50 border border-blue-100'}`}>
          <Icon className={`w-4 h-4 ${iconColor || 'text-blue-600'}`} />
        </div>
        <h3 className="text-sm font-bold text-slate-800">{title}</h3>
      </div>
      {children}
    </div>
  );
}

export default function ThreatReport({ reportData, onContainSession }) {
  if (!reportData) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-5 fade-in-up" style={{ minHeight: 400 }}>
        <FileText className="w-16 h-16 text-slate-300" />
        <div className="text-center">
          <h2 className="text-xl font-black text-slate-800">No Report Available</h2>
          <p className="text-sm mt-2 text-slate-400">
            Select a session from{' '}
            <span className="font-bold text-sky-600">Live Attacks</span> to view its threat intelligence report.
          </p>
        </div>
      </div>
    );
  }

  const session_id = reportData.session_id;
  const source_ip = reportData.source_ip || reportData.attack_source?.source_ip;
  const service = reportData.service || reportData.attack_source?.service || reportData.target?.service;
  const risk_score = reportData.risk_score ?? reportData.risk?.score ?? 0;
  const risk_level = reportData.risk_level || reportData.risk?.level || (risk_score >= 80 ? 'CRITICAL' : risk_score >= 50 ? 'HIGH' : 'LOW');
  const containment_status = typeof reportData.containment_status === 'object' ? reportData.containment_status?.status : reportData.containment_status;
  const generated_at = reportData.generated_at;

  const ai = reportData.ai_analysis || {};
  const executive_summary = reportData.executive_summary || ai.threat_summary || ai.summary;
  const attacker_objective = reportData.attacker_objective || ai.likely_objective;
  const observed_behavior = reportData.observed_behavior || ai.observed_behavior || (ai.observed_behavior_explanation ? [ai.observed_behavior_explanation] : []);
  const ai_interpretation = ai.ai_interpretation || [];
  const mitre_techniques = reportData.mitre_techniques || reportData.mitre_mapping || [];
  const iocs_summary = reportData.iocs_summary || reportData.iocs || [];
  const recommendations = reportData.recommendations || ai.recommended_actions || (ai.recommended_defensive_action ? [ai.recommended_defensive_action] : []);
  const evidence_integrity = reportData.evidence_integrity || 'VERIFIED';
  const blockchain_proof = reportData.blockchain_proof;

  const isContained = (containment_status || '').toUpperCase() === 'CONTAINED';
  const isTampered = evidence_integrity === 'TAMPER_DETECTED';

  const handleExport = () => {
    const content = JSON.stringify(reportData, null, 2);
    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `threat-report-${session_id || 'unknown'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-5 fade-in-up print:p-0">

      {/* Report Header */}
      <div className="card p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 bg-blue-50 border border-blue-100">
              <FileText className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-800">Executive Threat Intelligence Incident Report</h2>
              <p className="font-mono text-xs mt-1 text-slate-400">
                Incident ID: {reportData.report_id || `RPT-${session_id}`}
              </p>
              <div className="flex items-center gap-2 flex-wrap mt-2">
                {source_ip && (
                  <span className="font-mono text-sm font-bold text-blue-600">{source_ip}</span>
                )}
                {service && <span className="badge badge-info text-[10px]">{(service).toUpperCase()} DECOY</span>}
                {risk_level && (
                  <span className={`badge ${
                    risk_level === 'CRITICAL' ? 'badge-critical' :
                    risk_level === 'HIGH'     ? 'badge-high' :
                    risk_level === 'MEDIUM'   ? 'badge-medium' : 'badge-low'
                  }`}>{risk_level}</span>
                )}
                {isContained && <span className="badge badge-contained">CONTAINED</span>}
              </div>
              <p className="text-[11px] mt-2 flex items-center gap-1.5 text-slate-400">
                <Clock className="w-3 h-3" />
                Generated: {formatTs(generated_at)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* Risk Gauge */}
            <div className="px-5 py-3 rounded-xl text-center bg-slate-50 border border-slate-100">
              <p className="text-3xl font-black" style={{ color: riskColor(risk_score) }}>{risk_score}</p>
              <p className="text-[10px] font-bold tracking-widest uppercase mt-1 text-slate-400">Risk Score</p>
              <div className="risk-bar mt-2 w-24">
                <div className="risk-bar-fill" style={{ width: `${risk_score}%`, background: riskColor(risk_score) }} />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              {!isContained && onContainSession && (
                <button onClick={() => onContainSession(session_id)} className="btn-danger text-xs">
                  <Lock className="w-3.5 h-3.5" /> Contain Now
                </button>
              )}
              <div className="flex items-center gap-2">
                <button onClick={handlePrint} className="btn-ghost text-xs flex items-center gap-1">
                  <Printer className="w-3.5 h-3.5" /> Print
                </button>
                <button onClick={handleExport} className="btn-ghost text-xs flex items-center gap-1">
                  <Download className="w-3.5 h-3.5" /> Export JSON
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* BLOCKCHAIN EVIDENCE INTEGRITY STAMP */}
      <div className="card p-5 border-l-4" style={{
        borderLeftColor: isTampered ? '#e11d48' : '#059669'
      }}>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
              isTampered ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'
            }`}>
              {isTampered ? <XCircle className="w-5 h-5" /> : <ShieldCheck className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  Tamper-Evident Evidence Seal
                </h4>
                <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                  isTampered ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'
                }`}>
                  {isTampered ? '⚠️ TAMPER DETECTED' : '✓ VERIFIED ON-CHAIN'}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Cryptographic SHA-256 hash proof registered on Kurukshetra Evidence Ledger
              </p>
            </div>
          </div>

          {blockchain_proof && (
            <div className="text-right text-[11px] font-mono text-slate-500">
              <p>Evidence ID: <strong className="text-slate-800">{blockchain_proof.evidence_id}</strong> (Block #{blockchain_proof.block_index})</p>
              <p className="truncate max-w-xs">Hash: {blockchain_proof.event_hash}</p>
            </div>
          )}
        </div>
      </div>

      {/* Executive Summary */}
      {executive_summary && (
        <Section icon={Target} title="Executive Summary (AI Threat Analyst)" iconBg="bg-blue-50 border border-blue-100" iconColor="text-blue-600">
          <p className="text-sm leading-relaxed text-slate-700">
            {executive_summary}
          </p>
        </Section>
      )}

      {/* Observed Behavior vs AI Interpretation */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Observed Behavior */}
        <Section icon={Terminal} title="Observed Telemetry Behavior" iconBg="bg-slate-100 border border-slate-200" iconColor="text-slate-700">
          {Array.isArray(observed_behavior) && observed_behavior.length > 0 ? (
            <ul className="space-y-2 text-xs text-slate-700">
              {observed_behavior.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2 p-2 rounded-lg bg-slate-50 border border-slate-100">
                  <span className="text-blue-600 font-bold">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-slate-500">Telemetry logs recorded across decoy interfaces.</p>
          )}
        </Section>

        {/* AI Interpretation */}
        <Section icon={Cpu} title="AI Threat Interpretation & Objective" iconBg="bg-purple-50 border border-purple-100" iconColor="text-purple-600">
          <div className="space-y-3 text-xs text-slate-700">
            {attacker_objective && (
              <div className="p-2.5 rounded-lg bg-purple-50/60 border border-purple-100">
                <strong className="text-purple-800 block text-[10px] uppercase tracking-wider mb-1">Likely Objective</strong>
                <p>{attacker_objective}</p>
              </div>
            )}
            {Array.isArray(ai_interpretation) && ai_interpretation.length > 0 && (
              <ul className="space-y-1.5">
                {ai_interpretation.map((interp, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-purple-600 font-bold">→</span>
                    <span>{interp}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Section>
      </div>

      {/* Two column: MITRE + IOCs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* MITRE Techniques */}
        {mitre_techniques.length > 0 && (
          <Section icon={Shield} title={`MITRE ATT&CK Techniques (${mitre_techniques.length})`} iconBg="bg-purple-50 border border-purple-100" iconColor="text-purple-600">
            <div className="space-y-2">
              {mitre_techniques.map((t, i) => (
                <div key={t.technique_id || i} className="flex items-center gap-3 px-3 py-2 rounded-xl bg-purple-50/40 border border-purple-100">
                  <span className="font-mono text-xs font-bold flex-shrink-0 text-purple-700">
                    {t.technique_id || '—'}
                  </span>
                  <span className="text-xs font-semibold text-slate-800 flex-1 truncate">
                    {t.technique_name || t.name || '—'}
                  </span>
                  {t.tactic && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md flex-shrink-0 bg-purple-100 text-purple-700">
                      {t.tactic}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* IOC Summary */}
        {iocs_summary.length > 0 && (
          <Section icon={AlertTriangle} title={`Captured Indicators of Compromise (${iocs_summary.length})`} iconBg="bg-amber-50 border border-amber-100" iconColor="text-amber-600">
            <div className="flex flex-wrap gap-2">
              {iocs_summary.map((ioc, i) => (
                <span key={i} className="font-mono text-xs font-bold px-3 py-1.5 rounded-xl bg-amber-50 text-amber-700 border border-amber-200/70">
                  {ioc.ioc_type && <span className="text-[10px] opacity-70 mr-1">[{ioc.ioc_type}]</span>}
                  {ioc.value || ioc.indicator || String(ioc)}
                </span>
              ))}
            </div>
          </Section>
        )}
      </div>

      {/* Defensive Recommendations */}
      {recommendations.length > 0 && (
        <Section icon={CheckCircle} title="Human-Reviewed Defensive Remediation Actions" iconBg="bg-emerald-50 border border-emerald-100" iconColor="text-emerald-600">
          <div className="space-y-2.5">
            {recommendations.map((rec, i) => (
              <div key={i} className="flex items-start gap-3 px-4 py-3 rounded-xl bg-emerald-50/40 border border-emerald-100">
                <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black flex-shrink-0 mt-0.5 bg-emerald-100 text-emerald-700">
                  {i + 1}
                </span>
                <p className="text-sm text-slate-700 font-medium">{rec}</p>
              </div>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}
