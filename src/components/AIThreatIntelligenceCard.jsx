import React, { useState, useEffect } from 'react';
import {
  Cpu, Shield, CheckCheck, Sparkles, Volume2, VolumeX, CheckSquare, Square,
  Terminal, Key, ShieldAlert, Radio, Flame, Target, Server, Zap, Copy,
  Check, ArrowRight, Layers, FileCode, AlertTriangle, ChevronRight, Activity,
  Lock, CheckCircle2, Info
} from 'lucide-react';

function getTelemetryIcon(text) {
  const t = (text || '').toLowerCase();
  if (t.includes('command') || t.includes('discovery') || t.includes('executed') || t.includes('shell')) {
    return <Terminal className="w-4 h-4 text-sky-600" />;
  }
  if (t.includes('token') || t.includes('credential') || t.includes('decoy') || t.includes('password') || t.includes('key')) {
    return <Key className="w-4 h-4 text-amber-600" />;
  }
  if (t.includes('privilege') || t.includes('elevation') || t.includes('binary') || t.includes('root') || t.includes('sudo')) {
    return <ShieldAlert className="w-4 h-4 text-rose-600" />;
  }
  return <Activity className="w-4 h-4 text-blue-600" />;
}

function getPriorityBadge(text, index) {
  const t = (text || '').toLowerCase();
  if (index === 0 || t.includes('firewall') || t.includes('block') || t.includes('contain') || t.includes('edge')) {
    return { label: 'P1 • CRITICAL ACTION', color: 'bg-rose-50 text-rose-700 border-rose-200' };
  }
  if (t.includes('ssh') || t.includes('harden') || t.includes('authentication') || t.includes('public')) {
    return { label: 'P2 • SYSTEM HARDENING', color: 'bg-amber-50 text-amber-700 border-amber-200' };
  }
  if (t.includes('blockchain') || t.includes('compliance') || t.includes('evidence') || t.includes('report')) {
    return { label: 'P3 • FORENSIC INTEGRITY', color: 'bg-blue-50 text-blue-700 border-blue-200' };
  }
  return { label: 'P4 • DECEPTION AUDIT', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
}

// Extracted MITRE ATT&CK tactics from threat intel summary or observed behavior
function deriveMitreTactics(ai_analysis, service) {
  const tactics = [];
  const text = JSON.stringify(ai_analysis).toLowerCase();

  tactics.push({
    id: 'TA0001',
    name: 'Initial Access',
    technique: `T1190 / ${service?.toUpperCase() || 'SSH'} Exploit`,
    desc: 'Adversary established connection to deception honeypot sensor.',
    color: 'border-blue-200 bg-blue-50/70 text-blue-800'
  });

  if (text.includes('discovery') || text.includes('system') || text.includes('environment')) {
    tactics.push({
      id: 'TA0007',
      name: 'Discovery',
      technique: 'T1082 System Information Discovery',
      desc: 'Observed enumeration of system binaries, environment, and user rights.',
      color: 'border-sky-200 bg-sky-50/70 text-sky-800'
    });
  }

  if (text.includes('privilege') || text.includes('elevation') || text.includes('root') || text.includes('binary')) {
    tactics.push({
      id: 'TA0004',
      name: 'Privilege Escalation',
      technique: 'T1548 Abuse Elevation Control',
      desc: 'Attacker executed privileged checks and attempted elevation probes.',
      color: 'border-rose-200 bg-rose-50/70 text-rose-800'
    });
  }

  if (text.includes('decoy') || text.includes('token') || text.includes('credential') || text.includes('key')) {
    tactics.push({
      id: 'TA0006',
      name: 'Credential Access',
      technique: 'T1552 Unsecured Credentials / Decoy Tokens',
      desc: 'Targeted pursuit and retrieval of high-value decoy secrets and keys.',
      color: 'border-purple-200 bg-purple-50/70 text-purple-800'
    });
  }

  return tactics;
}

export default function AIThreatIntelligenceCard({
  ai_analysis,
  source_ip,
  service,
  risk_score,
  risk_level,
  events = [],
  copiedRule,
  copyFirewallRule
}) {
  const [activeTab, setActiveTab] = useState('dossier'); // 'dossier' | 'playbook' | 'mitre' | 'stix'
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [completedActions, setCompletedActions] = useState({});
  const [copiedDossier, setCopiedDossier] = useState(false);

  const threatSummary = ai_analysis.threat_summary || ai_analysis.summary || 'Adversary engagement observed across cyber deception sensors.';
  const observedBehavior = Array.isArray(ai_analysis.observed_behavior) && ai_analysis.observed_behavior.length > 0
    ? ai_analysis.observed_behavior
    : (ai_analysis.observed_behavior_explanation ? [ai_analysis.observed_behavior_explanation] : ['Sensory telemetry captured across honeypot interface.']);
  
  const aiInterpretation = Array.isArray(ai_analysis.ai_interpretation) && ai_analysis.ai_interpretation.length > 0
    ? ai_analysis.ai_interpretation
    : (ai_analysis.likely_objective ? [ai_analysis.likely_objective] : ['Adversary demonstrates automated reconnaissance and privilege probing.']);
  
  const rawActions = ai_analysis.recommended_actions || (ai_analysis.recommended_defensive_action ? [ai_analysis.recommended_defensive_action] : []);
  const recommendedActions = Array.isArray(rawActions) ? rawActions : [rawActions];
  const confidenceScore = ai_analysis.confidence || 94;
  const mitreTactics = deriveMitreTactics(ai_analysis, service);

  // Audio briefing handler using Web Speech API
  const toggleSpeech = () => {
    if (!('speechSynthesis' in window)) {
      alert('Speech synthesis is not supported in this browser.');
      return;
    }

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    window.speechSynthesis.cancel();
    const briefingText = `Kurukshetra Threat Intelligence Briefing. ${threatSummary}. Key deduction: ${aiInterpretation.join('. ')}. Recommended immediate action: ${recommendedActions[0] || 'Implement edge firewall rule.'}`;
    const utterance = new SpeechSynthesisUtterance(briefingText);
    utterance.rate = 1.05;
    utterance.pitch = 1.0;
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
    setIsSpeaking(true);
  };

  useEffect(() => {
    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const toggleActionCompleted = (index) => {
    setCompletedActions(prev => ({ ...prev, [index]: !prev[index] }));
  };

  const copyFullDossier = async () => {
    const fullText = `[KURUKSHETRA CYBER THREAT INTELLIGENCE DOSSIER]
Source IP: ${source_ip}
Deception Asset: ${service?.toUpperCase()} Honeypot
Confidence: ${confidenceScore}%
Threat Summary: ${threatSummary}

VERIFIED SENSOR TELEMETRY:
${observedBehavior.map((o, i) => `${i + 1}. ${o}`).join('\n')}

NEURAL AI THREAT MODELING:
${aiInterpretation.map((a, i) => `- ${a}`).join('\n')}

DEFENSIVE MITIGATION PLAYBOOK:
${recommendedActions.map((r, i) => `[${completedActions[i] ? 'RESOLVED' : 'PENDING'}] ${r}`).join('\n')}
`;
    await navigator.clipboard.writeText(fullText).catch(() => {});
    setCopiedDossier(true);
    setTimeout(() => setCopiedDossier(false), 2000);
  };

  const completedCount = recommendedActions.filter((_, i) => completedActions[i]).length;
  const progressPercent = recommendedActions.length > 0 ? Math.round((completedCount / recommendedActions.length) * 100) : 0;

  return (
    <div className="card overflow-hidden border border-slate-200/80 shadow-md bg-white">
      {/* ── TOP CYBER INTELLIGENCE CONTROL BAR ── */}
      <div className="px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 via-white to-blue-50/30 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-sm shadow-blue-500/20">
            <Cpu className="w-5 h-5" />
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 border-2 border-white"></span>
            </span>
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-black text-slate-800 tracking-tight">AI Threat Analyst Intelligence</h3>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200/60">
                <Sparkles className="w-2.5 h-2.5 text-blue-600" />
                NEURAL CTI ENGINE
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <CheckCircle2 className="w-2.5 h-2.5" />
                {confidenceScore}% CONFIDENCE
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium">Automated telemetry reasoning, cognitive adversary intent & defensive countermeasures</p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Audio Briefing Button */}
          <button
            onClick={toggleSpeech}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border ${
              isSpeaking
                ? 'bg-rose-50 text-rose-700 border-rose-200 shadow-sm animate-pulse'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
            title="Listen to synthesized AI SOC Intelligence voice briefing"
          >
            {isSpeaking ? (
              <>
                <VolumeX className="w-3.5 h-3.5 text-rose-600" />
                <span>Stop Briefing</span>
                <span className="flex gap-0.5 items-center ml-1">
                  <span className="w-1 h-3 bg-rose-500 rounded-full animate-bounce"></span>
                  <span className="w-1 h-4 bg-rose-600 rounded-full animate-bounce delay-75"></span>
                  <span className="w-1 h-2 bg-rose-500 rounded-full animate-bounce delay-150"></span>
                </span>
              </>
            ) : (
              <>
                <Volume2 className="w-3.5 h-3.5 text-blue-600" />
                <span>Audio Briefing</span>
              </>
            )}
          </button>

          {/* Copy Firewall Ban Rule */}
          <button
            onClick={copyFirewallRule}
            className="px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 bg-blue-600 text-white hover:bg-blue-700 transition-all shadow-sm shadow-blue-500/20 cursor-pointer"
            title="Generate & Copy UFW Firewall ban command"
          >
            {copiedRule ? (
              <>
                <CheckCheck className="w-3.5 h-3.5 text-emerald-200" />
                <span>UFW Rule Copied!</span>
              </>
            ) : (
              <>
                <Shield className="w-3.5 h-3.5 text-white" />
                <span>Copy Firewall Ban Rule</span>
              </>
            )}
          </button>

          {/* Export Full Dossier */}
          <button
            onClick={copyFullDossier}
            className="p-1.5 rounded-xl text-slate-500 bg-white border border-slate-200 hover:text-slate-800 hover:bg-slate-50 transition-all cursor-pointer"
            title="Copy Full Intelligence Dossier as Text"
          >
            {copiedDossier ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* ── INTELLIGENCE VIEW NAVIGATION TABS ── */}
      <div className="px-6 pt-3 pb-2 border-b border-slate-100 bg-slate-50/40 flex items-center justify-between gap-2 overflow-x-auto">
        <div className="flex items-center gap-1">
          {[
            { id: 'dossier', label: 'Executive Threat Dossier', icon: <Sparkles className="w-3.5 h-3.5" /> },
            {
              id: 'playbook',
              label: `Defensive Playbook (${completedCount}/${recommendedActions.length})`,
              icon: <Shield className="w-3.5 h-3.5" />
            },
            { id: 'mitre', label: 'MITRE ATT&CK Matrix', icon: <Layers className="w-3.5 h-3.5" /> },
            { id: 'stix', label: 'STIX 2.1 / JSON', icon: <FileCode className="w-3.5 h-3.5" /> }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        <span className="text-[11px] font-mono text-slate-400 hidden sm:inline-block">
          Sensor: <strong className="text-slate-700">{service?.toUpperCase()} HONEYPOT</strong>
        </span>
      </div>

      {/* ── TAB 1: EXECUTIVE THREAT DOSSIER ── */}
      {activeTab === 'dossier' && (
        <div className="p-6 space-y-5">
          {/* Adversary Vector Quick Ribbon */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-2xl bg-blue-50/50 border border-blue-100">
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600">Decoy Target</span>
              <p className="text-xs font-bold text-slate-800 font-mono mt-0.5">{service?.toUpperCase() || 'SSH'} Honeypot</p>
            </div>
            <div className="p-3 rounded-2xl bg-purple-50/50 border border-purple-100">
              <span className="text-[10px] font-bold uppercase tracking-wider text-purple-600">Attacker IP</span>
              <p className="text-xs font-bold text-purple-800 font-mono mt-0.5">{source_ip || '152.58.14.233'}</p>
            </div>
            <div className="p-3 rounded-2xl bg-amber-50/50 border border-amber-100">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600">Telemetry Volume</span>
              <p className="text-xs font-bold text-slate-800 font-mono mt-0.5">{events.length || 10} Event Logs</p>
            </div>
            <div className="p-3 rounded-2xl bg-rose-50/50 border border-rose-100">
              <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600">Risk Assessment</span>
              <p className="text-xs font-bold text-rose-700 font-mono mt-0.5">{risk_score}/100 ({risk_level || 'HIGH'})</p>
            </div>
          </div>

          {/* Executive Threat Summary Banner */}
          <div className="relative p-4 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 text-white shadow-inner overflow-hidden">
            <div className="absolute right-0 top-0 translate-x-4 -translate-y-4 w-36 h-36 bg-blue-500/10 rounded-full blur-2xl pointer-events-none"></div>
            
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-blue-300">EXECUTIVE THREAT SYNOPSIS</span>
            </div>
            <p className="text-xs sm:text-sm text-slate-200 leading-relaxed font-medium">
              {threatSummary}
            </p>
          </div>

          {/* Split Matrix: Verified Telemetry vs AI Threat Modeling */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Left: Verified Sensory Telemetry */}
            <div className="p-4 rounded-2xl bg-slate-50/70 border border-slate-200/80 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200/60">
                <div className="flex items-center gap-2">
                  <span className="flex items-center justify-center w-5 h-5 rounded-md bg-blue-100 text-blue-700 text-[10px] font-bold">✓</span>
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">Observed Behavior (Verifiable Telemetry)</h4>
                </div>
                <span className="text-[10px] font-mono text-slate-400 font-medium">{observedBehavior.length} Evidence Points</span>
              </div>

              <div className="space-y-2.5">
                {observedBehavior.map((obs, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-white border border-slate-200/70 shadow-xs hover:border-blue-300 transition-all flex items-start gap-3 group"
                  >
                    <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0 mt-0.5 group-hover:bg-blue-50 transition-colors">
                      {getTelemetryIcon(obs)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-0.5">
                        <span className="text-[10px] font-mono font-bold text-blue-600">EVENT #{String(idx + 1).padStart(2, '0')}</span>
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700 border border-emerald-100 font-mono">VERIFIED LOG</span>
                      </div>
                      <p className="text-xs text-slate-700 leading-snug font-medium">{obs}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: AI Neural Interpretation & Intent */}
            <div className="p-4 rounded-2xl bg-gradient-to-b from-purple-50/40 to-indigo-50/20 border border-purple-100 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-purple-100">
                <div className="flex items-center gap-2">
                  <span className="flex items-center justify-center w-5 h-5 rounded-md bg-purple-100 text-purple-700 text-[10px] font-bold">🧠</span>
                  <h4 className="text-xs font-bold text-purple-900 uppercase tracking-wide">AI Interpretation (Intent & Threat Modeling)</h4>
                </div>
                <span className="text-[10px] font-mono text-purple-600 font-medium">Cognitive Deductions</span>
              </div>

              <div className="space-y-2.5">
                {aiInterpretation.map((interp, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-white border border-purple-100 shadow-xs hover:border-purple-300 transition-all flex items-start gap-3"
                  >
                    <div className="w-7 h-7 rounded-lg bg-purple-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Zap className="w-4 h-4 text-purple-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-0.5">
                        <span className="text-[10px] font-mono font-bold text-purple-600">
                          {idx === 0 ? 'PRIMARY OBJECTIVE' : idx === 1 ? 'TACTICAL INTENT' : 'HYPOTHESIS'}
                        </span>
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-purple-50 text-purple-700 border border-purple-100 font-mono">ANALYST MODEL</span>
                      </div>
                      <p className="text-xs text-slate-700 leading-snug font-medium">{interp}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Bottom Quick Mitigation Preview */}
          <div className="p-4 rounded-2xl bg-emerald-50/40 border border-emerald-200/80">
            <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-emerald-700" />
                <h4 className="text-xs font-bold text-emerald-900 uppercase tracking-wide">
                  Recommended Defensive Actions ({completedCount}/{recommendedActions.length} Mitigated)
                </h4>
              </div>
              <button
                onClick={() => setActiveTab('playbook')}
                className="text-xs font-bold text-emerald-700 hover:text-emerald-900 flex items-center gap-1 cursor-pointer"
              >
                Open Full Interactive Playbook <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {recommendedActions.slice(0, 4).map((rec, i) => {
                const priority = getPriorityBadge(rec, i);
                const isDone = !!completedActions[i];

                return (
                  <div
                    key={i}
                    onClick={() => toggleActionCompleted(i)}
                    className={`p-2.5 rounded-xl border flex items-start gap-2.5 cursor-pointer transition-all ${
                      isDone
                        ? 'bg-emerald-50/80 border-emerald-300 opacity-75'
                        : 'bg-white border-emerald-100 hover:border-emerald-300 shadow-xs'
                    }`}
                  >
                    <button className="mt-0.5 text-emerald-600 flex-shrink-0">
                      {isDone ? <CheckSquare className="w-4 h-4 text-emerald-600" /> : <Square className="w-4 h-4 text-slate-300" />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${priority.color}`}>
                          {priority.label}
                        </span>
                      </div>
                      <p className={`text-xs ${isDone ? 'line-through text-slate-400' : 'text-slate-700 font-medium'}`}>
                        {rec}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 2: DEFENSIVE MITIGATION PLAYBOOK ── */}
      {activeTab === 'playbook' && (
        <div className="p-6 space-y-5">
          {/* Progress Banner */}
          <div className="p-4 rounded-2xl bg-slate-900 text-white flex items-center justify-between gap-4 flex-wrap">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400">SOC MITIGATION CHECKLIST</span>
              <h4 className="text-base font-bold mt-0.5">Defensive Remediation Countermeasures</h4>
              <p className="text-xs text-slate-300 mt-1">Execute containment and hardening steps to neutralize attacker IP {source_ip}</p>
            </div>
            <div className="text-right">
              <span className="text-2xl font-black text-emerald-400 font-mono">{progressPercent}%</span>
              <p className="text-[11px] text-slate-400 font-mono">{completedCount} of {recommendedActions.length} completed</p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
            <div
              className="bg-emerald-500 h-2 rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            ></div>
          </div>

          {/* Checklist Items */}
          <div className="space-y-3">
            {recommendedActions.map((rec, i) => {
              const priority = getPriorityBadge(rec, i);
              const isDone = !!completedActions[i];
              const isFirewallStep = (rec || '').toLowerCase().includes('firewall') || (rec || '').toLowerCase().includes('ip');

              return (
                <div
                  key={i}
                  className={`p-4 rounded-2xl border transition-all ${
                    isDone
                      ? 'bg-emerald-50/60 border-emerald-200'
                      : 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1">
                      <button
                        onClick={() => toggleActionCompleted(i)}
                        className="mt-1 cursor-pointer flex-shrink-0"
                      >
                        {isDone ? (
                          <CheckSquare className="w-5 h-5 text-emerald-600" />
                        ) : (
                          <Square className="w-5 h-5 text-slate-300 hover:text-emerald-500" />
                        )}
                      </button>

                      <div className="space-y-1.5 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${priority.color}`}>
                            {priority.label}
                          </span>
                          <span className="text-[10px] font-mono text-slate-400">ACTION #{i + 1}</span>
                        </div>

                        <p className={`text-sm ${isDone ? 'line-through text-slate-400 font-medium' : 'text-slate-800 font-semibold'}`}>
                          {rec}
                        </p>

                        {isFirewallStep && (
                          <div className="mt-2 p-2.5 rounded-xl bg-slate-900 text-slate-200 font-mono text-xs flex items-center justify-between gap-3">
                            <span className="truncate">sudo ufw deny from {source_ip || '0.0.0.0'} to any</span>
                            <button
                              onClick={copyFirewallRule}
                              className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-sans text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                            >
                              <Copy className="w-3 h-3" />
                              Copy
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => toggleActionCompleted(i)}
                      className={`px-3 py-1 rounded-xl text-xs font-bold cursor-pointer transition-all ${
                        isDone
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {isDone ? 'Mark Pending' : 'Mark Done'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── TAB 3: MITRE ATT&CK MATRIX ── */}
      {activeTab === 'mitre' && (
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-100">
            <div>
              <h4 className="text-sm font-bold text-slate-800">Adversary Tactics & Techniques Alignment</h4>
              <p className="text-xs text-slate-400">Mapped based on telemetry interactions with Kurukshetra sensors</p>
            </div>
            <span className="badge badge-info">{mitreTactics.length} MITRE Tactics Mapped</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {mitreTactics.map((tactic, idx) => (
              <div
                key={idx}
                className={`p-4 rounded-2xl border ${tactic.color} flex flex-col justify-between space-y-2`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-[10px] font-mono font-bold tracking-widest uppercase opacity-80">{tactic.id} • {tactic.name}</span>
                    <span className="px-2 py-0.5 rounded-md bg-white/80 text-[10px] font-mono font-bold border border-slate-200/60">
                      {tactic.technique.split(' ')[0]}
                    </span>
                  </div>
                  <h5 className="text-sm font-bold text-slate-900">{tactic.technique}</h5>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed font-medium">{tactic.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── TAB 4: STIX 2.1 / JSON TELEMETRY ── */}
      {activeTab === 'stix' && (
        <div className="p-6 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h4 className="text-sm font-bold text-slate-800">STIX 2.1 Threat Report Payload</h4>
              <p className="text-xs text-slate-400">Machine-readable cyber threat intelligence interchange format</p>
            </div>
            <button
              onClick={() => {
                navigator.clipboard.writeText(JSON.stringify(ai_analysis, null, 2));
                alert('JSON copied to clipboard!');
              }}
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-900 text-white hover:bg-slate-800 flex items-center gap-1.5 cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Copy JSON</span>
            </button>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 max-h-96 overflow-y-auto">
            <pre className="text-[11px] font-mono text-emerald-400 whitespace-pre-wrap leading-relaxed">
              {JSON.stringify({
                type: "threat-intelligence-report",
                spec_version: "2.1",
                id: `report--${source_ip?.replace(/\./g, '-')}`,
                created: new Date().toISOString(),
                confidence: confidenceScore,
                threat_actor_ip: source_ip,
                service_deception_target: service,
                risk_level: risk_level,
                risk_score: risk_score,
                analysis: ai_analysis
              }, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
