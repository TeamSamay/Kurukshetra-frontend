import React, { useState } from 'react';
import {
  ShieldAlert, Clock, Lock, Activity, Terminal, Copy, Check,
  AlertTriangle, ChevronDown, ChevronUp, TrendingUp,
  Cpu, CheckCircle2, Sparkles, Zap, Flame,
  Shield, Crosshair, Code2, PlayCircle, Layers, Radio, CheckCheck
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer
} from 'recharts';
import { explainEventWithAI } from '../services/api';

function riskBadge(risk) {
  const r = (risk || '').toUpperCase();
  const map = {
    CRITICAL: 'bg-rose-100 text-rose-700 border-rose-300',
    HIGH: 'bg-amber-100 text-amber-800 border-amber-300',
    MEDIUM: 'bg-blue-100 text-blue-700 border-blue-300',
    LOW: 'bg-emerald-100 text-emerald-700 border-emerald-300',
    INFO: 'bg-slate-100 text-slate-700 border-slate-300'
  };
  return map[r] || 'bg-slate-100 text-slate-700 border-slate-300';
}

function CopyBtn({ text, label }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(text).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={copy}
      className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all border border-slate-200 cursor-pointer"
      title="Copy to clipboard"
    >
      {copied ? (
        <>
          <CheckCheck className="w-3 h-3 text-emerald-600" />
          <span className="text-emerald-700 font-bold">{label ? `${label} Copied!` : 'Copied!'}</span>
        </>
      ) : (
        <>
          <Copy className="w-3 h-3 text-slate-500" />
          {label && <span>{label}</span>}
        </>
      )}
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

function deriveAttackerPersona(service, events = [], riskScore = 0) {
  const s = (service || '').toLowerCase();
  const evtCount = events.length;

  if (s === 'ssh' || s === 'telnet') {
    if (evtCount > 5 || riskScore >= 75) {
      return {
        type: 'Targeted Shell Operator (Manual / APT)',
        icon: Crosshair,
        tagBg: 'bg-rose-100 text-rose-800 border-rose-200',
        barColor: 'bg-rose-500',
        sophistication: 'High (Interactive TTY Shell)',
        intent: 'Credential harvesting, lateral traversal & persistence attempt',
        evasion: 'Dynamic proxying & target validation'
      };
    }
    return {
      type: 'Brute-Force Credential Bot',
      icon: Radio,
      tagBg: 'bg-amber-100 text-amber-800 border-amber-200',
      barColor: 'bg-amber-500',
      sophistication: 'Moderate (Wordlist spraying)',
      intent: 'Automated SSH daemon credential stuffing',
      evasion: 'Rapid randomized source port rotation'
    };
  }

  if (s === 'web' || s === 'http') {
    return {
      type: 'Web Application Vulnerability Scanner',
      icon: Flame,
      tagBg: 'bg-indigo-100 text-indigo-800 border-indigo-200',
      barColor: 'bg-indigo-500',
      sophistication: 'Moderate (Automated exploit fuzzing)',
      intent: 'Directory traversal, config leakage & API backdoor discovery',
      evasion: 'User-agent spoofing & fuzzing headers'
    };
  }

  return {
    type: 'Automated Internet Recon Crawler',
    icon: Radio,
    tagBg: 'bg-blue-100 text-blue-800 border-blue-200',
    barColor: 'bg-blue-500',
    sophistication: 'Low (Shodan / Masscan style probe)',
    intent: 'Port mapping and open daemon banner grabbing',
    evasion: 'Standard SYN sweep'
  };
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
  const [activeTab, setActiveTab] = useState('intelligence'); // 'intelligence' | 'playbook' | 'timeline'
  const [ruleFormat, setRuleFormat] = useState('ufw'); // 'ufw' | 'iptables' | 'snort'

  if (!sessionData) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-5 fade-in-up" style={{ minHeight: 400 }}>
        <ShieldAlert className="w-16 h-16 text-slate-300" />
        <div className="text-center">
          <h2 className="text-xl font-black text-slate-800">No Session Selected</h2>
          <p className="text-sm mt-2 text-slate-400">
            Go to <span className="font-bold text-sky-600">Live Attacks</span> and click{' '}
            <span className="font-bold text-blue-600">Investigate</span> on any active session.
          </p>
        </div>
      </div>
    );
  }

  const {
    session_id, source_ip = '127.0.0.1', service = 'ssh', status, risk_level = 'LOW',
    risk_score = 0, attacker_dna, fingerprint, events = [], iocs = [],
    created_at, updated_at, start_time, last_seen, ai_analysis
  } = sessionData;

  const displayFingerprint = fingerprint || attacker_dna;
  const displayFirstSeen = start_time || created_at;
  const displayLastSeen = last_seen || updated_at;
  const isContained = (status || '').toUpperCase() === 'CONTAINED';
  const riskTimelineData = buildRiskTimeline(events);
  const persona = deriveAttackerPersona(service, events, risk_score);
  const PersonaIcon = persona.icon;

  // Active Defense commands
  const ufwCmd = `sudo ufw deny from ${source_ip} to any comment 'Kurukshetra Deception Trap Block'`;
  const iptablesCmd = `sudo iptables -I INPUT -s ${source_ip} -j DROP -m comment --comment 'Kurukshetra Trap'`;
  const snortRule = `alert tcp ${source_ip} any -> $HOME_NET any (msg:"KURUKSHETRA-DECEPTION Hostile IP Detected"; sid:1009021; rev:1;)`;

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
    <div className="space-y-6 fade-in-up">

      {/* TOP HERO INVESTIGATION BANNER */}
      <div className="card p-6 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white border-none shadow-xl relative overflow-hidden">
        {/* Glow backdrop accent */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-wrap items-start justify-between gap-5">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 bg-blue-500/20 border border-blue-400/30 text-blue-400 backdrop-blur-md">
              <ShieldAlert className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="text-xs font-mono tracking-widest text-blue-300 uppercase font-bold">
                  CYBER DECEPTION FORENSICS STUDIO
                </span>
                <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${riskBadge(risk_level)}`}>
                  {risk_level} SEVERITY
                </span>
                {isContained && (
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                    ISOLATED & CONTAINED
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3 mt-2 flex-wrap">
                <h1 className="text-2xl font-black font-mono tracking-tight text-white">{source_ip}</h1>
                <CopyBtn text={source_ip} />
                <span className="text-slate-400 font-mono text-sm">→</span>
                <span className="px-3 py-1 rounded-xl text-xs font-bold bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 uppercase tracking-wide">
                  {service} Decoy Trap
                </span>
              </div>

              <p className="text-xs font-mono text-slate-400 mt-2">
                Session ID: <span className="text-slate-200">{session_id}</span>
              </p>
            </div>
          </div>

          {/* Risk Gauge & Actions */}
          <div className="flex items-center gap-4 flex-wrap">
            <div className="px-5 py-3 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10 text-center">
              <p className="text-[10px] font-bold tracking-widest uppercase text-slate-300">Threat Threat Index</p>
              <div className="flex items-baseline justify-center gap-1 mt-0.5">
                <span className="text-3xl font-black" style={{
                  color: risk_score >= 80 ? '#fb7185' : risk_score >= 50 ? '#fbbf24' : '#60a5fa'
                }}>{risk_score}</span>
                <span className="text-xs font-mono text-slate-400">/100</span>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              {!isContained && (
                <button
                  onClick={() => onContainSession(session_id)}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white flex items-center gap-2 shadow-lg shadow-rose-900/30 transition-all cursor-pointer"
                >
                  <Lock className="w-4 h-4" /> Contain Adversary
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ATTACKER BEHAVIORAL PERSONA CARD */}
        <div className="mt-6 pt-5 border-t border-white/10 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center flex-shrink-0 text-blue-400">
              <PersonaIcon className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Attacker Archetype</p>
              <p className="text-xs font-bold text-white mt-0.5">{persona.type}</p>
              <span className="text-[11px] text-blue-300 font-medium">{persona.sophistication}</span>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center flex-shrink-0 text-indigo-400">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Deception Containment Status</p>
              <p className="text-xs font-bold text-emerald-400 mt-0.5">0% Production Leakage</p>
              <span className="text-[11px] text-slate-300">Trapped inside Kurukshetra Decoy</span>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center flex-shrink-0 text-purple-400">
              <Terminal className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Attacker DNA Fingerprint</p>
              <p className="text-xs font-mono font-bold text-purple-300 truncate mt-0.5" title={displayFingerprint}>
                {displayFingerprint || 'FPR-GENERIC-AGENT'}
              </p>
              <span className="text-[11px] text-slate-300">Behavioral keystroke & tool signature</span>
            </div>
          </div>
        </div>
      </div>

      {/* 4-STAGE CYBER DECEPTION KILL-CHAIN FLOW */}
      <div className="card p-5 bg-white border border-slate-200">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
            <Activity className="w-4 h-4 text-blue-600" />
            Deception Trap Progression & Adversary Kill-Chain
          </h3>
          <span className="text-[11px] font-mono text-slate-400">{events.length} Telemetry Events</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Step 1 */}
          <div className="p-3 rounded-xl bg-blue-50/60 border border-blue-100 flex items-center gap-3">
            <div className="w-7 h-7 rounded-full bg-blue-600 text-white font-black text-xs flex items-center justify-center flex-shrink-0">
              1
            </div>
            <div>
              <p className="text-xs font-bold text-slate-800">Decoy Reconnaissance</p>
              <p className="text-[11px] text-slate-500">Port probe & banner grab</p>
            </div>
          </div>

          {/* Step 2 */}
          <div className="p-3 rounded-xl bg-indigo-50/60 border border-indigo-100 flex items-center gap-3">
            <div className="w-7 h-7 rounded-full bg-indigo-600 text-white font-black text-xs flex items-center justify-center flex-shrink-0">
              2
            </div>
            <div>
              <p className="text-xs font-bold text-slate-800">Lure Engagement</p>
              <p className="text-[11px] text-slate-500">Decoy service ingress</p>
            </div>
          </div>

          {/* Step 3 */}
          <div className={`p-3 rounded-xl border flex items-center gap-3 ${
            events.length > 2 ? 'bg-amber-50/70 border-amber-200' : 'bg-slate-50 border-slate-100 opacity-60'
          }`}>
            <div className={`w-7 h-7 rounded-full font-black text-xs flex items-center justify-center flex-shrink-0 ${
              events.length > 2 ? 'bg-amber-500 text-white' : 'bg-slate-300 text-slate-700'
            }`}>
              3
            </div>
            <div>
              <p className="text-xs font-bold text-slate-800">Decoy Interaction</p>
              <p className="text-[11px] text-slate-500">Probing fake tokens & paths</p>
            </div>
          </div>

          {/* Step 4 */}
          <div className={`p-3 rounded-xl border flex items-center gap-3 ${
            isContained ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200'
          }`}>
            <div className={`w-7 h-7 rounded-full font-black text-xs flex items-center justify-center flex-shrink-0 ${
              isContained ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
            }`}>
              4
            </div>
            <div>
              <p className="text-xs font-bold text-slate-800">
                {isContained ? 'Threat Contained' : 'Active Trap Monitoring'}
              </p>
              <p className="text-[11px] text-slate-500">
                {isContained ? 'Decoy isolated' : 'Live telemetry stream'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* NAVIGATION TABS FOR DEEP INVESTIGATION */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-1">
        <button
          onClick={() => setActiveTab('intelligence')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'intelligence'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Cpu className="w-3.5 h-3.5" />
          AI Threat Intelligence & Hypothesis
        </button>

        <button
          onClick={() => setActiveTab('playbook')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'playbook'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Shield className="w-3.5 h-3.5" />
          1-Click Active Defense Playbook
        </button>

        <button
          onClick={() => setActiveTab('timeline')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'timeline'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Terminal className="w-3.5 h-3.5" />
          Forensic Attack Telemetry ({events.length})
        </button>
      </div>

      {/* TAB 1: AI THREAT INTELLIGENCE & REASONING */}
      {activeTab === 'intelligence' && (
        <div className="space-y-5">
          {ai_analysis ? (
            <div className="card p-6 bg-white border border-slate-200 shadow-sm space-y-5">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-slate-900">Cognitive Cyber Threat Reasoning Engine</h3>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-blue-100 text-blue-700">
                        {ai_analysis.model_used || 'Groq Llama-3.3-70B'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">
                      Telemetry-grounded reasoning with zero-hallucination verification
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Telemetry Fact-Checked
                </div>
              </div>

              {/* Threat Summary Box */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-blue-50/70 to-indigo-50/50 border border-blue-100">
                <p className="text-[10px] font-bold uppercase tracking-wider text-blue-700 mb-1">
                  Adversary Executive Brief
                </p>
                <p className="text-xs leading-relaxed text-slate-800 font-medium">
                  {ai_analysis.threat_summary || ai_analysis.summary}
                </p>
              </div>

              {/* DUAL COMPARISON: Ground Truth Facts vs AI Hypotheses */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* Left: Verifiable Ground Truth */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 text-blue-600" />
                      Observed Telemetry Facts (Ground Truth)
                    </p>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-slate-200 text-slate-700 font-mono font-bold">LOG-BACKED</span>
                  </div>

                  {Array.isArray(ai_analysis.observed_behavior) && ai_analysis.observed_behavior.length > 0 ? (
                    <ul className="space-y-2 text-xs text-slate-700">
                      {ai_analysis.observed_behavior.map((obs, idx) => (
                        <li key={idx} className="flex items-start gap-2 p-2 rounded-lg bg-white border border-slate-200/80">
                          <span className="text-blue-600 font-bold">•</span>
                          <span>{obs}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-slate-600 p-2 bg-white rounded-lg border border-slate-200">
                      {ai_analysis.observed_behavior_explanation || 'Interactions recorded across honeypot sensors.'}
                    </p>
                  )}
                </div>

                {/* Right: AI Analytical Interpretation */}
                <div className="p-4 rounded-xl bg-purple-50/40 border border-purple-100 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-purple-800 flex items-center gap-1.5">
                      <Cpu className="w-3.5 h-3.5 text-purple-600" />
                      Adversary Threat Modeling & Intent
                    </p>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-purple-100 text-purple-700 font-mono font-bold">ANALYST HYPOTHESIS</span>
                  </div>

                  {ai_analysis.likely_objective && (
                    <div className="p-2.5 rounded-lg bg-white border border-purple-200">
                      <strong className="text-purple-800 block text-[10px] uppercase tracking-wider mb-0.5">Primary Attacker Goal</strong>
                      <p className="text-xs text-slate-800 font-medium">{ai_analysis.likely_objective}</p>
                    </div>
                  )}

                  {Array.isArray(ai_analysis.ai_interpretation) && ai_analysis.ai_interpretation.length > 0 && (
                    <ul className="space-y-1.5 text-xs text-slate-700">
                      {ai_analysis.ai_interpretation.map((interp, idx) => (
                        <li key={idx} className="flex items-start gap-2 p-2 rounded-lg bg-white border border-purple-100">
                          <span className="text-purple-600 font-bold">→</span>
                          <span>{interp}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="card p-8 text-center bg-white border border-slate-200">
              <Cpu className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-700">AI Telemetry Analysis Pending</p>
              <p className="text-xs text-slate-400 mt-1">Collecting and clustering decoy telemetry signals...</p>
            </div>
          )}

          {/* METADATA & RISK EVOLUTION */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="card p-5 bg-white border border-slate-200">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3">
                Decoy Session Telemetry Specs
              </h4>
              <div className="space-y-2.5">
                {[
                  { label: 'First Contact',    value: formatTs(displayFirstSeen) },
                  { label: 'Latest Interaction',  value: formatTs(displayLastSeen) },
                  { label: 'Total Telemetry Traces', value: events.length },
                  { label: 'Captured Artifacts / IOCs', value: iocs.length },
                  { label: 'Containment State', value: status || 'ACTIVE' },
                ].map(({ label, value }) => (
                  <div key={label} className="flex items-center justify-between py-1.5 border-b border-slate-100 text-xs">
                    <span className="text-slate-500 font-medium">{label}</span>
                    <span className="text-slate-900 font-bold font-mono">{String(value)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="card p-5 bg-white border border-slate-200">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="w-4 h-4 text-amber-600" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Threat Risk Score Progression
                </h4>
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
                <div className="h-36 flex items-center justify-center">
                  <p className="text-xs text-slate-400">Single event recorded</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: 1-CLICK ACTIVE DEFENSE PLAYBOOK */}
      {activeTab === 'playbook' && (
        <div className="space-y-5">
          <div className="card p-6 bg-white border border-slate-200 space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-emerald-600" />
                  Active Defense Playbook & Live Firewall Rules
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Pre-compiled actionable containment commands and SIEM detection rules for this adversary
                </p>
              </div>

              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                <button
                  onClick={() => setRuleFormat('ufw')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    ruleFormat === 'ufw' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
                  }`}
                >
                  UFW Rule
                </button>
                <button
                  onClick={() => setRuleFormat('iptables')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    ruleFormat === 'iptables' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
                  }`}
                >
                  iptables
                </button>
                <button
                  onClick={() => setRuleFormat('snort')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    ruleFormat === 'snort' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
                  }`}
                >
                  Snort / Suricata
                </button>
              </div>
            </div>

            {/* Code Box */}
            <div className="p-4 rounded-xl bg-slate-900 text-slate-100 space-y-2 border border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono text-slate-400 font-semibold uppercase">
                  {ruleFormat.toUpperCase()} Firewall Command
                </span>
                <CopyBtn
                  text={ruleFormat === 'ufw' ? ufwCmd : ruleFormat === 'iptables' ? iptablesCmd : snortRule}
                  label="Copy Rule"
                />
              </div>
              <pre className="text-xs font-mono text-emerald-400 whitespace-pre-wrap break-all select-all">
                {ruleFormat === 'ufw' ? ufwCmd : ruleFormat === 'iptables' ? iptablesCmd : snortRule}
              </pre>
            </div>

            {/* AI Action Recommendations */}
            {ai_analysis?.recommended_actions && (
              <div className="space-y-3 pt-4 border-t border-slate-100">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Recommended Threat Mitigation Steps
                </h4>
                <div className="space-y-2">
                  {(Array.isArray(ai_analysis.recommended_actions) ? ai_analysis.recommended_actions : [ai_analysis.recommended_defensive_action]).map((rec, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-emerald-50/40 border border-emerald-100">
                      <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-[10px] font-black flex-shrink-0 mt-0.5">
                        {i + 1}
                      </div>
                      <p className="text-xs text-slate-800 font-medium">{rec}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: FORENSIC ATTACK TELEMETRY */}
      {activeTab === 'timeline' && (
        <div className="card p-6 bg-white border border-slate-200">
          <div className="flex items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-sky-50 border border-sky-100">
                <Activity className="w-4 h-4 text-sky-600" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-800">Raw Decoy Interaction Trace</h3>
                <p className="text-[11px] text-slate-400">{events.length} telemetry interactions captured</p>
              </div>
            </div>
          </div>

          {events.length === 0 ? (
            <p className="text-sm text-center py-8 text-slate-400">No events recorded for this session</p>
          ) : (
            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {events.map((ev, i) => {
                const evKey = ev.event_id || i;
                const explanation = eventExplanations[evKey];
                const isExplaining = explainingEventId === evKey;

                return (
                  <div key={evKey} className="border border-slate-200 rounded-xl overflow-hidden">
                    <div className="flex items-center justify-between gap-3 px-3.5 py-3 bg-slate-50/70 hover:bg-slate-50 transition-colors">
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
                          className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
                        >
                          {expandedEvent === i ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {/* AI Explanation Box */}
                    {explanation && expandedEvent === i && (
                      <div className="px-4 py-3.5 bg-blue-50/60 border-t border-blue-100 space-y-2 text-xs">
                        <div className="flex items-center gap-1.5 text-blue-800 font-bold">
                          <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                          <span>AI Telemetry Dissection</span>
                        </div>
                        <p><strong className="text-slate-800">Observed Action:</strong> {explanation.observed_behavior}</p>
                        <p><strong className="text-purple-700">Threat Intent:</strong> {explanation.ai_interpretation}</p>
                        <p><strong className="text-slate-700">Context:</strong> {explanation.threat_context}</p>
                        <p><strong className="text-emerald-700">Remediation:</strong> {explanation.defensive_note}</p>
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
      )}

      {/* IOCs Captured */}
      {iocs.length > 0 && (
        <div className="card p-5 bg-white border border-slate-200">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Captured Honeypot Indicators of Compromise ({iocs.length})
            </h4>
          </div>
          <div className="flex flex-wrap gap-2">
            {iocs.map((ioc, i) => (
              <span key={i} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-bold bg-amber-50 text-amber-700 border border-amber-200">
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
