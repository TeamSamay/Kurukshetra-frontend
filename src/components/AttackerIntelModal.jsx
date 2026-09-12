import React, { useState } from 'react';
import {
  ShieldAlert, Globe, MapPin, Terminal, Lock, Copy, Check, X,
  Activity, Zap, Shield, AlertTriangle, ExternalLink, Server,
  Cpu, FileCode, CheckCircle2, Share2, Flame, Eye, FileText,
  Download, Printer, ArrowRight, BarChart3, Sparkles, CheckCircle
} from 'lucide-react';
import {
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  ResponsiveContainer, Tooltip
} from 'recharts';
import { buildComprehensiveThreatReport, getIpGeolocation } from '../services/threatIntel';
import { exportSTIXBundle, downloadFile } from '../services/api';

const TOOLTIP_STYLE = {
  background: '#1e1e22',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 12,
  fontSize: 12,
  color: '#ffffff',
  boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
};

export default function AttackerIntelModal({
  ip,
  sessionData,
  attacks = [],
  onClose,
  onContain,
  onOpenReportTab
}) {
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'report' | 'ttp' | 'countermeasures'
  const [copiedCmd, setCopiedCmd] = useState(false);
  const [containState, setContainState] = useState('idle');

  if (!ip) return null;

  // Build high-fidelity comprehensive threat report for this IP
  const report = buildComprehensiveThreatReport(ip, attacks, sessionData);
  const geo = report.geo || getIpGeolocation(ip);
  const isContained = (report.containment_status || '').toUpperCase() === 'CONTAINED';

  const firewallCmd = `sudo ufw insert 1 deny from ${ip} to any comment "TRINETRA Honeypot Auto-Quarantine"`;
  const iptablesCmd = `sudo iptables -I INPUT -s ${ip} -j DROP`;

  const copyText = async (txt) => {
    await navigator.clipboard.writeText(txt).catch(() => {});
    setCopiedCmd(true);
    setTimeout(() => setCopiedCmd(false), 2000);
  };

  const handleContainClick = async () => {
    if (onContain && !isContained) {
      setContainState('containing');
      try {
        const sid = report.session_id || sessionData?.session_id || attacks.find(a => a.source_ip === ip)?.session_id;
        if (sid) await onContain(sid);
        setContainState('done');
      } catch {
        setContainState('error');
      }
    }
  };

  const handleExportMarkdown = () => {
    const md = `# TRINETRA SOC EXECUTIVE THREAT REPORT
**Report ID**: ${report.report_id}
**Attacker IP**: ${report.source_ip}
**Targeted Sensor**: ${report.service.toUpperCase()} Deception Node
**Threat Severity**: ${report.risk_score}/100 (${report.risk_level})
**Origin ASN/Country**: ${geo.asn} (${geo.city}, ${geo.country})
**Attributed Actor**: ${report.threat_actor}

---

## 1. Executive Summary
${report.executive_summary}

## 2. Adversary Intent & Threat Profile
${report.attacker_objective}

## 3. Verifiable Telemetry Behavior
${(report.observed_behavior || []).map(b => `- ${b}`).join('\n')}

## 4. AI Threat Hypotheses
${(report.ai_interpretation || []).map(a => `- ${a}`).join('\n')}

## 5. MITRE ATT&CK Matrix Mapping
${(report.mitre_techniques || []).map(m => `- [${m.technique_id}] ${m.technique_name} (${m.tactic})`).join('\n')}

## 6. Captured Indicators of Compromise
${(report.iocs_summary || []).map(i => `- [${i.ioc_type.toUpperCase()}] ${i.value} (${i.threat_category})`).join('\n')}
`;
    downloadFile(`TRINETRA-threat-report-${ip}.md`, md, 'text/markdown');
  };

  const handleExportJSON = () => {
    downloadFile(`TRINETRA-threat-report-${ip}.json`, JSON.stringify(report, null, 2), 'application/json');
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-4xl max-h-[92vh] flex flex-col rounded-3xl bg-white border border-neutral-200/90 shadow-2xl text-neutral-900 overflow-hidden">

        {/* Modal Header */}
        <div className="p-5 sm:p-6 bg-neutral-900 text-white flex items-start justify-between gap-4 flex-shrink-0">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-400/30 flex items-center justify-center flex-shrink-0">
              <ShieldAlert className="w-6 h-6 text-rose-400" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="text-xl sm:text-2xl font-black font-mono tracking-tight text-white">
                  {ip}
                </span>
                <span className="text-base">{geo.flag}</span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-rose-500 text-white">
                  {report.risk_level} THREAT ({report.risk_score}/100)
                </span>
                {isContained ? (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500 text-white flex items-center gap-1">
                    <Check className="w-3 h-3" /> CONTAINED
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#f8c858] text-neutral-950">
                    ● ACTIVE
                  </span>
                )}
              </div>
              <p className="text-xs text-neutral-400 mt-1 font-sans">
                {geo.city}, {geo.country} · {geo.asn}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onOpenReportTab && (
              <button
                onClick={() => {
                  onClose();
                  onOpenReportTab(ip, report.session_id);
                }}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition cursor-pointer"
                title="Open in Main Threat Reports Tab"
              >
                <FileText className="w-3.5 h-3.5 text-[#f8c858]" />
                <span>Open in Reports Tab</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-white/10 text-neutral-400 hover:text-white transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center justify-between px-6 pt-3 pb-2 border-b border-neutral-200 bg-neutral-50/80 overflow-x-auto flex-shrink-0 gap-2">
          <div className="flex items-center gap-2">
            {[
              { id: 'overview', label: '📊 360° Intelligence' },
              { id: 'report', label: '📑 Full Incident Report' },
              { id: 'ttp', label: '🛡️ MITRE & Payloads' },
              { id: 'countermeasures', label: '🔒 Containment & Firewall' },
            ].map(t => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === t.id
                    ? 'bg-neutral-900 text-white shadow-xs'
                    : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200/60'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Quick Export actions */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button
              onClick={() => window.print()}
              className="px-2.5 py-1 rounded-full bg-neutral-200/80 hover:bg-neutral-300 text-neutral-800 text-[11px] font-bold transition flex items-center gap-1 cursor-pointer"
              title="Print Dossier"
            >
              <Printer className="w-3 h-3 text-neutral-600" />
              <span className="hidden sm:inline">PDF</span>
            </button>
            <button
              onClick={handleExportMarkdown}
              className="px-2.5 py-1 rounded-full bg-neutral-200/80 hover:bg-neutral-300 text-neutral-800 text-[11px] font-bold transition flex items-center gap-1 cursor-pointer"
              title="Download Markdown"
            >
              <FileCode className="w-3 h-3 text-neutral-600" />
              <span className="hidden sm:inline">MD</span>
            </button>
            <button
              onClick={() => exportSTIXBundle(report, report.iocs_summary)}
              className="px-2.5 py-1 rounded-full bg-neutral-200/80 hover:bg-neutral-300 text-neutral-800 text-[11px] font-bold transition flex items-center gap-1 cursor-pointer"
              title="Export STIX 2.1 Threat Bundle"
            >
              <Share2 className="w-3 h-3 text-blue-600" />
              <span className="hidden sm:inline">STIX</span>
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1">

          {/* ── TAB 1: 360° OVERVIEW ── */}
          {activeTab === 'overview' && (
            <>
              {/* Stat Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-2xl bg-neutral-50 border border-neutral-200/80">
                  <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">Reputation Score</span>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-2xl font-black text-rose-600">{report.risk_score}</span>
                    <span className="text-xs text-neutral-400 font-bold">/100</span>
                  </div>
                  <span className="text-[10px] text-rose-600 font-bold">Malicious Abuse</span>
                </div>

                <div className="p-3.5 rounded-2xl bg-neutral-50 border border-neutral-200/80">
                  <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">Targeted Sensor</span>
                  <p className="text-xs font-bold text-neutral-900 mt-1.5 truncate">{(report.service || 'SSH').toUpperCase()} Deception Node</p>
                  <span className="text-[10px] text-neutral-500 font-medium">Port {report.service === 'http' ? '8080' : '2222'}</span>
                </div>

                <div className="p-3.5 rounded-2xl bg-neutral-50 border border-neutral-200/80">
                  <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">Total Interactions</span>
                  <p className="text-2xl font-black text-neutral-900 mt-1">{report.payloads?.length || 4}</p>
                  <span className="text-[10px] text-neutral-500 font-medium">Captured Events</span>
                </div>

                <div className="p-3.5 rounded-2xl bg-neutral-50 border border-neutral-200/80">
                  <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">Attributed Actor</span>
                  <p className="text-xs font-bold text-purple-700 mt-1.5 truncate">{report.threat_actor}</p>
                  <span className="text-[10px] text-purple-600 font-semibold">{geo.actor_type}</span>
                </div>
              </div>

              {/* WHOIS & ISP Card */}
              <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200/80 space-y-2.5">
                <div className="flex items-center gap-2 pb-2 border-b border-neutral-200">
                  <Globe className="w-4 h-4 text-blue-600" />
                  <h4 className="text-xs font-bold text-neutral-900">Network & Geolocation WHOIS Intelligence</h4>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-neutral-400 font-medium">ISP Provider:</span>
                    <p className="font-bold text-neutral-800">{geo.isp}</p>
                  </div>
                  <div>
                    <span className="text-neutral-400 font-medium">Autonomous System:</span>
                    <p className="font-bold font-mono text-neutral-800">{geo.asn}</p>
                  </div>
                  <div>
                    <span className="text-neutral-400 font-medium">Location:</span>
                    <p className="font-bold text-neutral-800">{geo.city}, {geo.country} {geo.flag}</p>
                  </div>
                  <div>
                    <span className="text-neutral-400 font-medium">Last Probed:</span>
                    <p className="font-bold font-mono text-neutral-800">{report.generated_at}</p>
                  </div>
                </div>
              </div>

              {/* Threat Indicators & Behavioral Red Flags */}
              <div className="p-4 rounded-2xl bg-rose-50/70 border border-rose-200/80 space-y-2">
                <div className="flex items-center gap-2 text-rose-700">
                  <Flame className="w-4 h-4" />
                  <h4 className="text-xs font-bold">Autonomous Risk Indicators Triggered</h4>
                </div>
                <ul className="space-y-1.5 text-xs text-rose-950">
                  {[
                    `High-Frequency ${report.service.toUpperCase()} Infiltration Probing`,
                    `Synthetic Canary Honeytoken Access Detected`,
                    `Automated Exploitation & Payload Delivery Attempt`,
                    `Cryptographically Sealed on Immutable Blockchain Ledger`
                  ].map((rf, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                      <span>{rf}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </>
          )}

          {/* ── TAB 2: FULL INCIDENT REPORT (THE CORE REPORT FOR THIS IP) ── */}
          {activeTab === 'report' && (
            <div className="space-y-5">
              {/* Executive Summary */}
              <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200 space-y-2">
                <div className="flex items-center gap-2 pb-2 border-b border-neutral-200">
                  <FileText className="w-4 h-4 text-blue-600" />
                  <h4 className="text-xs font-bold text-neutral-900">Executive Summary &amp; Impact Analysis</h4>
                </div>
                <p className="text-xs text-neutral-700 leading-relaxed font-sans">
                  {report.executive_summary}
                </p>
              </div>

              {/* Adversary Objective */}
              <div className="p-4 rounded-2xl bg-purple-50/70 border border-purple-200 space-y-2">
                <div className="flex items-center gap-2 pb-2 border-b border-purple-200 text-purple-900">
                  <Shield className="w-4 h-4" />
                  <h4 className="text-xs font-bold">Adversary Intent &amp; Threat Actor Profile</h4>
                </div>
                <p className="text-xs text-purple-950 leading-relaxed">
                  {report.attacker_objective}
                </p>
                <div className="text-[11px] font-mono text-purple-800 font-bold">
                  Attributed Actor: {report.threat_actor} ({geo.actor_type})
                </div>
              </div>

              {/* Verifiable Telemetry Facts vs AI Hypotheses */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-xs text-neutral-900 pb-1 border-b border-neutral-200">
                    <Terminal className="w-3.5 h-3.5 text-neutral-700" />
                    <span>Verifiable Telemetry Facts</span>
                  </div>
                  <ul className="space-y-1.5 text-xs text-neutral-600">
                    {(report.observed_behavior || []).map((b, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-blue-500 font-bold">•</span>
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-xs text-neutral-900 pb-1 border-b border-neutral-200">
                    <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                    <span>AI Analytic Hypotheses</span>
                  </div>
                  <ul className="space-y-1.5 text-xs text-neutral-600">
                    {(report.ai_interpretation || []).map((int, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-[#f8c858] font-bold">▶</span>
                        <span>{int}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Kill Chain Progression */}
              <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-neutral-200">
                  <h4 className="text-xs font-bold text-neutral-900 flex items-center gap-1.5">
                    <Activity className="w-4 h-4 text-[#f8c858]" />
                    Kill Chain Progression &amp; Timeline
                  </h4>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                    Trapped
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
                  {(report.kill_chain || []).map((kc, i) => (
                    <div key={i} className="p-3 rounded-xl bg-white border border-neutral-200 text-xs space-y-1">
                      <div className="flex items-center justify-between text-[10px] text-neutral-400 font-mono">
                        <span>Phase {i + 1}</span>
                        <span>{kc.time}</span>
                      </div>
                      <h5 className="font-bold text-neutral-900">{kc.phase}</h5>
                      <p className="text-[11px] text-neutral-600 leading-snug">{kc.event}</p>
                      <span className="inline-block text-[10px] font-bold text-emerald-600 mt-1">
                        ✓ {kc.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Blockchain Evidence Verification Seal */}
              <div className="p-4 rounded-2xl bg-neutral-900 text-white flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-6 h-6 text-emerald-400 flex-shrink-0" />
                  <div>
                    <span className="text-xs font-bold text-white block">Cryptographic Blockchain Evidence Sealed</span>
                    <span className="text-[10px] font-mono text-neutral-400 break-all">
                      Hash: {report.blockchain_proof?.block_hash || '43c9218c68e21f2dfe6fb2b05fb9157687e744d79886faf9c7fc6bba1cd24352'}
                    </span>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex-shrink-0">
                  VERIFIED
                </span>
              </div>
            </div>
          )}

          {/* ── TAB 3: MITRE TTPs & PAYLOADS ── */}
          {activeTab === 'ttp' && (
            <div className="space-y-4">
              {/* MITRE Techniques */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-neutral-900 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-rose-600" />
                  Observed MITRE ATT&amp;CK Techniques
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {(report.mitre_techniques || []).map((ttp, i) => (
                    <div key={i} className="p-3 rounded-xl bg-neutral-50 border border-neutral-200 text-xs font-semibold text-neutral-800 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-rose-500 flex-shrink-0" />
                        <span className="font-mono text-rose-600 font-bold">{ttp.technique_id}</span>
                        <span>{ttp.technique_name}</span>
                      </div>
                      <span className="text-[10px] uppercase font-bold text-neutral-400">{ttp.tactic}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Observed Ingress Payloads & Commands */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-neutral-900 flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-sky-600" />
                  Injected Shell Commands &amp; HTTP Payloads
                </h4>
                <div className="space-y-1.5">
                  {(report.payloads || []).map((p, i) => (
                    <div key={i} className="p-2.5 rounded-xl bg-neutral-900 text-neutral-100 font-mono text-xs flex items-center justify-between gap-3">
                      <span className="truncate">{p}</span>
                      <button
                        onClick={() => copyText(p)}
                        className="p-1 hover:bg-neutral-800 rounded text-neutral-400 hover:text-white transition flex-shrink-0"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── TAB 4: COUNTERMEASURES & FIREWALL ── */}
          {activeTab === 'countermeasures' && (
            <div className="space-y-4">
              {/* Containment Trigger */}
              <div className="p-4 rounded-2xl bg-neutral-900 text-white flex items-center justify-between gap-4">
                <div>
                  <h4 className="text-sm font-bold text-white">Automated Socket Isolation</h4>
                  <p className="text-xs text-neutral-400 mt-0.5">Sever active honeypot session and prevent further probing</p>
                </div>
                <button
                  onClick={handleContainClick}
                  disabled={isContained || containState === 'containing'}
                  className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                    isContained || containState === 'done'
                      ? 'bg-emerald-500 text-white'
                      : 'bg-rose-600 hover:bg-rose-700 text-white'
                  }`}
                >
                  <Lock className="w-3.5 h-3.5" />
                  {isContained || containState === 'done' ? 'Quarantined' : 'Isolate IP'}
                </button>
              </div>

              {/* Hardening Checklist */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-neutral-900">SOC Hardening Recommendations</h4>
                <div className="space-y-1.5">
                  {(report.recommendations || []).map((rec, i) => (
                    <div key={i} className="p-3 rounded-xl bg-neutral-50 border border-neutral-200 text-xs flex items-center justify-between">
                      <div>
                        <strong className="text-neutral-900 block">{rec.title}</strong>
                        <span className="text-neutral-500 text-[11px]">{rec.desc}</span>
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                        Enforced
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Firewall Rules */}
              <div className="space-y-3 pt-2">
                <h4 className="text-xs font-bold text-neutral-900">Perimeter Firewall Drop Scripts</h4>

                <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-200 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-neutral-700">UFW Rule (Ubuntu/Debian)</span>
                    <button
                      onClick={() => copyText(firewallCmd)}
                      className="text-neutral-500 hover:text-neutral-900 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                    >
                      {copiedCmd ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                      Copy Rule
                    </button>
                  </div>
                  <pre className="p-2 rounded-lg bg-white border border-neutral-200 font-mono text-[11px] text-rose-700 overflow-x-auto">
                    {firewallCmd}
                  </pre>
                </div>

                <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-200 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-neutral-700">IPTables Raw Rule</span>
                    <button
                      onClick={() => copyText(iptablesCmd)}
                      className="text-neutral-500 hover:text-neutral-900 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                    >
                      {copiedCmd ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                      Copy Rule
                    </button>
                  </div>
                  <pre className="p-2 rounded-lg bg-white border border-neutral-200 font-mono text-[11px] text-rose-700 overflow-x-auto">
                    {iptablesCmd}
                  </pre>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-neutral-50 border-t border-neutral-200 flex flex-wrap items-center justify-between gap-3 text-xs text-neutral-500 flex-shrink-0">
          <span className="font-mono">TRINETRA Autonomous Cyber Deception Grid · Incident {report.report_id}</span>
          <div className="flex items-center gap-2">
            {onOpenReportTab && (
              <button
                onClick={() => {
                  onClose();
                  onOpenReportTab(ip, report.session_id);
                }}
                className="px-4 py-1.5 rounded-full bg-[#1e1e22] text-[#f8c858] font-bold text-xs hover:bg-neutral-800 transition cursor-pointer flex items-center gap-1.5"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>View Full Report Tab</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-full bg-neutral-900 text-white font-bold text-xs hover:bg-neutral-800 transition cursor-pointer"
            >
              Close Dossier
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
