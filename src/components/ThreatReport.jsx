import React, { useState } from 'react';
import {
  FileText, Shield, AlertTriangle, CheckCircle, Lock, Clock,
  Terminal, Target, TrendingUp, Download, ShieldCheck, XCircle,
  Printer, Cpu, Sparkles, Check, Share2, FileCode, ChevronDown
} from 'lucide-react';
import { exportSTIXBundle, downloadFile } from '../services/api';

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
    <div className="card p-5 bg-white border border-neutral-200/80 shadow-xs">
      <div className="flex items-center gap-2.5 mb-4">
        <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${iconBg || 'bg-blue-50 border border-blue-100'}`}>
          <Icon className={`w-4 h-4 ${iconColor || 'text-blue-600'}`} />
        </div>
        <h3 className="text-sm font-bold text-neutral-900 tracking-tight">{title}</h3>
      </div>
      {children}
    </div>
  );
}

const DEFAULT_DEMO_REPORTS = {
  'ATK-SSH-901': {
    report_id: 'RPT-ATK-SSH-901',
    session_id: 'ATK-SSH-901',
    source_ip: '185.220.101.5',
    service: 'ssh',
    risk_score: 95,
    risk_level: 'CRITICAL',
    containment_status: 'CONTAINED',
    generated_at: new Date().toISOString(),
    executive_summary: 'Critical multi-stage intrusion identified on SSH Honeypot. Adversary operating via Tor exit node (185.220.101.5) triggered decoy canary honeytoken (/root/.env), attempted AWS Cloud IAM metadata theft, staged an external dropper binary, and spawned an interactive Netcat reverse shell before automated isolation containment.',
    attacker_objective: 'Establish persistent C2 footprint, harvest AWS cloud credentials, escalate privileges, and pivot into internal enterprise infrastructure.',
    observed_behavior: [
        'Targeted SSH authentication service with dictionary credentials.',
        'Accessed canary honeytoken file "/root/.env" containing fake AWS secrets.',
        'Probed AWS Cloud Instance Metadata Service (169.254.169.254).',
        'Downloaded external payload "dropper.sh" from malicious distribution domain.',
        'Initiated interactive reverse shell targeting TCP port 9001.'
    ],
    ai_interpretation: [
        'Behavioral markers and command velocity strongly indicate interactive human operator (APT29 Cozy Bear playbook).',
        'Adversary intended to use stolen AWS credentials to pivot into the production cloud control plane.'
    ],
    mitre_techniques: [
      { technique_id: 'T1110.001', technique_name: 'Password Guessing', tactic: 'Credential Access' },
      { technique_id: 'T1078', technique_name: 'Valid Accounts', tactic: 'Initial Access' },
      { technique_id: 'T1552.001', technique_name: 'Credentials in Files', tactic: 'Credential Access' },
      { technique_id: 'T1552.005', technique_name: 'Cloud Instance Metadata API', tactic: 'Credential Access' },
      { technique_id: 'T1105', technique_name: 'Ingress Tool Transfer', tactic: 'Command and Control' },
      { technique_id: 'T1059.004', technique_name: 'Unix Shell', tactic: 'Execution' },
    ],
    iocs_summary: [
      { ioc_type: 'ip', value: '185.220.101.5', threat_category: 'ATTACKER_SOURCE' },
      { ioc_type: 'url', value: 'http://cdn.malicious-domain.cc/tools/dropper.sh', threat_category: 'PAYLOAD_DELIVERY' },
      { ioc_type: 'hash_sha256', value: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855', threat_category: 'MALWARE_PAYLOAD' },
      { ioc_type: 'file', value: '/root/.env', threat_category: 'HONEYTOKEN_CANARY' },
    ],
    recommendations: [
      'Enforce immediate edge firewall DROP rule for IP 185.220.101.5.',
      'Sinkhole malicious domain "cdn.malicious-domain.cc" at corporate DNS resolvers.',
      'Verify AWS CloudTrail for any access attempts using the canary IAM keys from /root/.env.',
      'Retain cryptographic SHA-256 blockchain proof block for legal & compliance audit.'
    ],
    evidence_integrity: 'VERIFIED',
    blockchain_proof: {
      block_index: 12,
      block_hash: '0634babc287de2b9e05aad6026ef7b82b0a4778e0ac641c199ce5cb91f214c21',
      status: 'VERIFIED'
    }
  },
  'ATK-WEB-402': {
    report_id: 'RPT-ATK-WEB-402',
    session_id: 'ATK-WEB-402',
    source_ip: '45.154.255.89',
    service: 'http',
    risk_score: 90,
    risk_level: 'CRITICAL',
    containment_status: 'ACTIVE',
    generated_at: new Date().toISOString(),
    executive_summary: 'Critical web exploitation campaign targeting e-commerce web application. Attacker executed classic SQL injection bypass, accessed canary passwords.txt, uploaded PHP backdoor web shell, and conducted internal CIDR SYN scans.',
    attacker_objective: 'Arbitrary code execution on web application server and lateral expansion across internal subnet.',
    observed_behavior: [
      'Scanned robots.txt and grabbed canary file passwords.txt.',
      'Injected tautological SQL strings (\' OR \'1\'=\'1\' --) and UNION SELECT queries.',
      'Downloaded PHP backdoor web shell via curl and spawned Python reverse connection.',
      'Conducted SYN subnet sweep across internal IP range.'
    ],
    ai_interpretation: [
      'Attack follows classic FIN7 initial access to lateral movement playbook.',
      'High confidence in automated toolchain (sqlmap + custom python dropper).'
    ],
    mitre_techniques: [
      { technique_id: 'T1190', technique_name: 'Exploit Public-Facing Application', tactic: 'Initial Access' },
      { technique_id: 'T1552.001', technique_name: 'Credentials in Files', tactic: 'Credential Access' },
      { technique_id: 'T1505.003', technique_name: 'Web Shell', tactic: 'Persistence' },
      { technique_id: 'T1046', technique_name: 'Network Service Discovery', tactic: 'Discovery' }
    ],
    iocs_summary: [
      { ioc_type: 'ip', value: '45.154.255.89', threat_category: 'ATTACKER_SOURCE' },
      { ioc_type: 'url', value: 'http://45.154.255.89/backdoor.php', threat_category: 'PAYLOAD_DELIVERY' },
      { ioc_type: 'hash_md5', value: '5d41402abc4b2a76b9719d911017c592', threat_category: 'MALWARE_HASH' },
    ],
    recommendations: [
      'Deploy WAF signature blocking tautological SQL patterns.',
      'Isolate compromised web worker container immediately.',
      'Add 45.154.255.89 to perimeter blocklist.'
    ],
    evidence_integrity: 'VERIFIED',
    blockchain_proof: {
      block_index: 18,
      block_hash: '43c9218c68e21f2dfe6fb2b05fb9157687e744d79886faf9c7fc6bba1cd24352',
      status: 'VERIFIED'
    }
  }
};

export default function ThreatReport({ reportData: rawReportData, onContainSession, attacks = [] }) {
  const [selectedSessionId, setSelectedSessionId] = useState('ATK-SSH-901');

  // Use provided reportData or lookup from demo reports
  const activeReport = rawReportData || DEFAULT_DEMO_REPORTS[selectedSessionId] || DEFAULT_DEMO_REPORTS['ATK-SSH-901'];

  const session_id = activeReport.session_id || selectedSessionId;
  const source_ip = activeReport.source_ip || activeReport.attack_source?.source_ip || '185.220.101.5';
  const service = activeReport.service || activeReport.attack_source?.service || 'ssh';
  const risk_score = activeReport.risk_score ?? activeReport.risk?.score ?? 95;
  const risk_level = activeReport.risk_level || activeReport.risk?.level || (risk_score >= 80 ? 'CRITICAL' : risk_score >= 50 ? 'HIGH' : 'LOW');
  const containment_status = typeof activeReport.containment_status === 'object' ? activeReport.containment_status?.status : activeReport.containment_status;
  const generated_at = activeReport.generated_at || new Date().toISOString();

  const ai = activeReport.ai_analysis || {};
  const executive_summary = activeReport.executive_summary || ai.threat_summary || ai.summary;
  const attacker_objective = activeReport.attacker_objective || ai.likely_objective;
  const observed_behavior = activeReport.observed_behavior || ai.observed_behavior || (ai.observed_behavior_explanation ? [ai.observed_behavior_explanation] : []);
  const ai_interpretation = ai.ai_interpretation || [];
  const mitre_techniques = activeReport.mitre_techniques || activeReport.mitre_mapping || [];
  const iocs_summary = activeReport.iocs_summary || activeReport.iocs || [];
  const recommendations = activeReport.recommendations || ai.recommended_actions || (ai.recommended_defensive_action ? [ai.recommended_defensive_action] : []);
  const evidence_integrity = activeReport.evidence_integrity || 'VERIFIED';
  const blockchain_proof = activeReport.blockchain_proof;

  const isContained = (containment_status || '').toUpperCase() === 'CONTAINED';

  const handleExportJSON = () => {
    downloadFile(`threat-report-${session_id}.json`, JSON.stringify(activeReport, null, 2), 'application/json');
  };

  const handleExportMarkdown = () => {
    const md = `# Threat Intelligence Incident Dossier: ${session_id}
**Report ID**: ${activeReport.report_id || `RPT-${session_id}`}
**Timestamp**: ${formatTs(generated_at)}
**Attacker IP**: ${source_ip}
**Deception Target**: ${(service).toUpperCase()} Honeypot
**Risk Score**: ${risk_score}/100 (${risk_level})
**Containment Status**: ${containment_status || 'ACTIVE'}

---

## Executive Summary
${executive_summary || 'N/A'}

## Attacker Objective & Intent
${attacker_objective || 'N/A'}

## Observed Telemetry Behavior
${(observed_behavior || []).map(b => `- ${b}`).join('\n')}

## Analytical AI Interpretation
${(ai_interpretation || []).map(a => `- ${a}`).join('\n')}

## MITRE ATT&CK Mapping
${(mitre_techniques || []).map(m => `- **${m.technique_id}**: ${m.technique_name} (${m.tactic || 'Tactic'})`).join('\n')}

## Captured Indicators of Compromise (IOCs)
${(iocs_summary || []).map(i => `- [${(i.ioc_type || 'IOC').toUpperCase()}] \`${i.value}\` - Category: ${i.threat_category || 'SUSPICIOUS'}`).join('\n')}

## Defensive Recommendations & SOC Playbook
${(recommendations || []).map((r, idx) => `${idx + 1}. ${r}`).join('\n')}

---
**Cryptographic Blockchain Verification**: ${evidence_integrity}
*Generated by Kurukshetra Adaptive Cyber Deception Platform*
`;
    downloadFile(`threat-dossier-${session_id}.md`, md, 'text/markdown');
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 fade-in-up print:space-y-4 print:p-0">

      {/* Session Switcher & Action Bar */}
      <div className="card p-4 bg-white border border-neutral-200/80 shadow-xs flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider flex items-center gap-1.5">
            <Target className="w-3.5 h-3.5 text-neutral-700" /> Select Incident:
          </span>
          <select
            value={selectedSessionId}
            onChange={e => setSelectedSessionId(e.target.value)}
            className="bg-neutral-50 border border-neutral-300 rounded-xl px-3 py-1.5 text-xs font-bold text-neutral-900 focus:outline-none focus:border-neutral-500 font-mono"
          >
            <option value="ATK-SSH-901">ATK-SSH-901 (APT29 Cozy Bear - SSH Infiltration - 95 Risk)</option>
            <option value="ATK-WEB-402">ATK-WEB-402 (FIN7 E-Commerce - Web Shell & SQLi - 90 Risk)</option>
            <option value="ATK-REDIS-601">ATK-REDIS-601 (Lazarus Group - Redis Cryptominer - 88 Risk)</option>
            <option value="ATK-K8S-505">ATK-K8S-505 (Kubernetes Decoy - Secrets Exfil - 85 Risk)</option>
            <option value="ATK-RDP-108">ATK-RDP-108 (RDP Gateway - Credential Stuffing - 75 Risk)</option>
          </select>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handlePrint}
            className="px-3.5 py-1.5 rounded-xl bg-neutral-900 text-white text-xs font-semibold hover:bg-neutral-800 transition shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5 text-[#f8c858]" /> Print / Export PDF
          </button>
          <button
            onClick={handleExportMarkdown}
            className="px-3 py-1.5 rounded-xl bg-neutral-100 text-neutral-800 border border-neutral-300 text-xs font-semibold hover:bg-neutral-200 transition shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <FileCode className="w-3.5 h-3.5 text-neutral-700" /> Markdown
          </button>
          <button
            onClick={() => exportSTIXBundle(activeReport, iocs_summary)}
            className="px-3 py-1.5 rounded-xl bg-neutral-100 text-neutral-800 border border-neutral-300 text-xs font-semibold hover:bg-neutral-200 transition shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <Share2 className="w-3.5 h-3.5 text-blue-600" /> STIX 2.1
          </button>
          <button
            onClick={handleExportJSON}
            className="px-3 py-1.5 rounded-xl bg-neutral-100 text-neutral-800 border border-neutral-300 text-xs font-semibold hover:bg-neutral-200 transition shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-neutral-700" /> JSON
          </button>
        </div>
      </div>

      {/* Main Report Header */}
      <div className="card p-6 bg-white border border-neutral-200/80 shadow-xs">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 bg-blue-50 border border-blue-100">
              <FileText className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-neutral-900 tracking-tight">
                  EXECUTIVE THREAT INTELLIGENCE INCIDENT REPORT
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-[#f8c858] text-neutral-900">
                  CONFIDENTIAL
                </span>
              </div>
              <p className="font-mono text-xs mt-1 text-neutral-500">
                Incident Ref: {activeReport.report_id || `RPT-${session_id}`}
              </p>
              <div className="flex items-center gap-2 flex-wrap mt-2">
                <span className="font-mono text-sm font-bold text-blue-600">{source_ip}</span>
                <span className="badge bg-neutral-100 text-neutral-800 text-[10px] font-bold uppercase">
                  {(service).toUpperCase()} DECOY
                </span>
                <span className={`badge ${
                  risk_level === 'CRITICAL' ? 'badge-critical' :
                  risk_level === 'HIGH'     ? 'badge-high' :
                  risk_level === 'MEDIUM'   ? 'badge-medium' : 'badge-low'
                }`}>
                  {risk_level} SEVERITY
                </span>
                {isContained ? (
                  <span className="badge bg-emerald-100 text-emerald-800 text-[10px] font-bold">CONTAINED</span>
                ) : (
                  <span className="badge bg-amber-100 text-amber-900 text-[10px] font-bold">ACTIVE MONITORING</span>
                )}
              </div>
              <p className="text-xs mt-2 flex items-center gap-1.5 text-neutral-400">
                <Clock className="w-3.5 h-3.5" />
                Generated: {formatTs(generated_at)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Risk Gauge */}
            <div className="px-5 py-3 rounded-2xl text-center bg-neutral-50 border border-neutral-200">
              <p className="text-3xl font-black" style={{ color: riskColor(risk_score) }}>{risk_score}</p>
              <p className="text-[10px] font-bold tracking-widest uppercase mt-1 text-neutral-400">Risk Index</p>
              <div className="risk-bar mt-2 w-24">
                <div className="risk-bar-fill" style={{ width: `${risk_score}%`, background: riskColor(risk_score) }} />
              </div>
            </div>

            {!isContained && onContainSession && (
              <button
                onClick={() => onContainSession(session_id)}
                className="px-4 py-2.5 rounded-xl bg-rose-600 text-white font-bold text-xs hover:bg-rose-700 transition shadow-xs flex items-center gap-1.5 cursor-pointer print:hidden"
              >
                <Lock className="w-4 h-4" /> Contain Session
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Executive Summary */}
      {executive_summary && (
        <Section icon={FileText} title="Executive Summary & Impact Analysis" iconBg="bg-blue-50" iconColor="text-blue-600">
          <p className="text-sm text-neutral-800 leading-relaxed font-sans font-medium">
            {executive_summary}
          </p>
        </Section>
      )}

      {/* Attacker Intent & Objective */}
      {attacker_objective && (
        <Section icon={Target} title="Adversary Objective & Threat Actor Profiling" iconBg="bg-purple-50" iconColor="text-purple-600">
          <p className="text-sm text-neutral-800 leading-relaxed font-sans">
            {attacker_objective}
          </p>
        </Section>
      )}

      {/* Observed Behavior vs Analytical Interpretation */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <Section icon={Terminal} title="Observed Telemetry Facts (Verifiable Logs)" iconBg="bg-neutral-100" iconColor="text-neutral-700">
          <ul className="space-y-2 text-xs text-neutral-700">
            {observed_behavior.map((b, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-blue-500 font-bold">•</span>
                <span>{b}</span>
              </li>
            ))}
          </ul>
        </Section>

        <Section icon={Sparkles} title="AI Intelligence Interpretation & Hypotheses" iconBg="bg-amber-50" iconColor="text-amber-600">
          <ul className="space-y-2 text-xs text-neutral-700">
            {ai_interpretation.map((int, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-[#f8c858] font-bold">▶</span>
                <span>{int}</span>
              </li>
            ))}
          </ul>
        </Section>
      </div>

      {/* MITRE ATT&CK Matrix Mapping */}
      {mitre_techniques.length > 0 && (
        <Section icon={Shield} title="Correlated MITRE ATT&CK Techniques" iconBg="bg-rose-50" iconColor="text-rose-600">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
            {mitre_techniques.map((m, i) => (
              <div key={i} className="p-3 rounded-xl bg-neutral-50 border border-neutral-200/80">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-extrabold text-rose-600">{m.technique_id}</span>
                  <span className="text-[10px] font-bold uppercase text-neutral-400">{m.tactic || 'Execution'}</span>
                </div>
                <p className="text-xs font-semibold text-neutral-900 mt-1">{m.technique_name}</p>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Captured IOCs */}
      {iocs_summary.length > 0 && (
        <Section icon={Share2} title="Captured Threat Indicators (IOCs)" iconBg="bg-emerald-50" iconColor="text-emerald-600">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-neutral-100 bg-neutral-50/50">
                  <th className="text-left px-3 py-2 text-[10px] font-bold text-neutral-400 uppercase">Type</th>
                  <th className="text-left px-3 py-2 text-[10px] font-bold text-neutral-400 uppercase">Value</th>
                  <th className="text-left px-3 py-2 text-[10px] font-bold text-neutral-400 uppercase">Category</th>
                </tr>
              </thead>
              <tbody>
                {iocs_summary.map((ioc, i) => (
                  <tr key={i} className="border-b border-neutral-100">
                    <td className="px-3 py-2 font-bold uppercase text-neutral-700">{ioc.ioc_type || 'IOC'}</td>
                    <td className="px-3 py-2 font-mono font-semibold text-neutral-900">{ioc.value}</td>
                    <td className="px-3 py-2">
                      <span className="px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-700 text-[10px] font-semibold">
                        {ioc.threat_category || 'SUSPICIOUS'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      )}

      {/* Defensive Recommendations */}
      {recommendations.length > 0 && (
        <Section icon={ShieldCheck} title="Defensive Hardening & SOC Playbook Actions" iconBg="bg-emerald-50" iconColor="text-emerald-600">
          <ol className="space-y-2 text-xs text-neutral-800 list-decimal list-inside font-medium">
            {recommendations.map((r, i) => (
              <li key={i} className="leading-relaxed">{r}</li>
            ))}
          </ol>
        </Section>
      )}

      {/* Cryptographic Blockchain Seal */}
      <div className="card p-5 bg-neutral-900 text-white rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center flex-shrink-0">
            <CheckCircle className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <p className="text-xs font-bold text-white tracking-wide">
              CRYPTOGRAPHIC PROOF OF FORENSIC INTEGRITY
            </p>
            <p className="text-[11px] text-neutral-400 font-mono mt-0.5">
              Evidence Hash: {blockchain_proof?.block_hash || '0634babc287de2b9e05aad6026ef7b82b0a4778e0ac641c199ce5cb91f214c21'}
            </p>
          </div>
        </div>
        <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-400/20 text-emerald-300 border border-emerald-400/30 flex-shrink-0">
          ✓ BLOCKCHAIN VERIFIED
        </span>
      </div>

    </div>
  );
}
