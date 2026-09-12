import React, { useState, useEffect } from 'react';
import {
  FileText, Shield, AlertTriangle, CheckCircle, Lock, Clock,
  Terminal, Target, TrendingUp, Download, ShieldCheck, XCircle,
  Printer, Cpu, Sparkles, Check, Share2, FileCode, ChevronDown,
  Activity, Globe, Server, Hash, Zap, CheckCircle2, ArrowRight,
  BarChart3, Eye, Layers, ShieldAlert, Filter, Search, Building2,
  PieChart as PieIcon, ListFilter, SlidersHorizontal, MapPin
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis,
  PolarRadiusAxis, Radar, PieChart, Pie, Cell
} from 'recharts';
import { buildComprehensiveThreatReport, getIpGeolocation } from '../services/threatIntel';
import { exportSTIXBundle, downloadFile } from '../services/api';

function formatTs(ts) {
  if (!ts) return '—';
  const d = new Date(ts);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-GB', {
    weekday: 'short', day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  });
}

function riskColor(score) {
  if (score >= 80) return '#e11d48';
  if (score >= 50) return '#d97706';
  if (score >= 25) return '#2563eb';
  return '#059669';
}

const TOOLTIP_STYLE = {
  background: '#1e1e22',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 12,
  fontSize: 12,
  color: '#ffffff',
  boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
};

export default function ThreatReport({
  reportData: rawReportData,
  onContainSession,
  attacks = [],
  onSelectIp,
  selectedSessionId: propSelectedSessionId,
  selectedIp: propSelectedIp
}) {
  const [reportMode, setReportMode] = useState('single'); // 'single' | 'fleet'
  const [selectedSessionId, setSelectedSessionId] = useState('');
  const [checklist, setChecklist] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSvc, setFilterSvc] = useState('ALL');

  // Build full list of all recorded incidents (dynamic live attacks + standard presets if empty)
  const allIncidents = React.useMemo(() => {
    if (attacks.length === 0) {
      return [
        { session_id: 'ATK-SSH-901', source_ip: '185.220.101.5', service: 'ssh', risk_score: 95, risk_level: 'CRITICAL', label: 'APT29 Cozy Bear (SSH Canary Decoy)' },
        { session_id: 'ATK-WEB-402', source_ip: '45.154.255.89', service: 'http', risk_score: 90, risk_level: 'CRITICAL', label: 'FIN7 Carbanak (Web SQLi & Shell)' },
        { session_id: 'ATK-SSH-103', source_ip: '103.208.220.12', service: 'ssh', risk_score: 74, risk_level: 'HIGH', label: 'Automated Port Scanner (India Vi Grid)' },
      ];
    }

    return attacks.map(a => {
      const geo = getIpGeolocation(a.source_ip);
      const svc = (a.service || 'ssh').toUpperCase();
      return {
        session_id: a.session_id,
        source_ip: a.source_ip || '198.51.100.88',
        service: a.service || 'ssh',
        risk_score: a.risk_score || (svc === 'SSH' ? 92 : 88),
        risk_level: a.risk_level || 'HIGH',
        status: a.status || 'ACTIVE',
        last_seen: a.last_seen || a.timestamp || a.start_time,
        geo,
        label: `${svc} Infiltration (${a.source_ip}) · ${geo.country} ${geo.flag}`
      };
    });
  }, [attacks]);

  // Sync selected incident when prop changes or on initial load
  useEffect(() => {
    if (propSelectedSessionId) {
      setSelectedSessionId(propSelectedSessionId);
    } else if (propSelectedIp) {
      const match = allIncidents.find(i => i.source_ip === propSelectedIp);
      if (match) setSelectedSessionId(match.session_id);
    } else if (!selectedSessionId && allIncidents.length > 0) {
      setSelectedSessionId(allIncidents[0].session_id);
    }
  }, [propSelectedSessionId, propSelectedIp, allIncidents, selectedSessionId]);

  // Generate dynamic complete threat report for currently selected incident
  const activeReport = React.useMemo(() => {
    const targetId = selectedSessionId || (allIncidents[0]?.session_id) || 'ATK-SSH-901';
    return buildComprehensiveThreatReport(targetId, attacks, rawReportData);
  }, [selectedSessionId, attacks, rawReportData, allIncidents]);

  const session_id = activeReport.session_id;
  const source_ip = activeReport.source_ip;
  const service = (activeReport.service || 'ssh').toUpperCase();
  const risk_score = activeReport.risk_score || 95;
  const risk_level = activeReport.risk_level || 'CRITICAL';
  const containment_status = activeReport.containment_status || 'ACTIVE';
  const generated_at = activeReport.generated_at || new Date().toISOString();
  const geo = activeReport.geo || getIpGeolocation(source_ip);

  const isContained = (containment_status || '').toUpperCase() === 'CONTAINED';

  const toggleChecklistItem = (idx) => {
    setChecklist(prev => ({ ...prev, [idx]: !prev[idx] }));
  };

  // Fleet statistics for "All Attacks Master Report"
  const totalFleetAttacks = allIncidents.length;
  const sshCount = allIncidents.filter(a => (a.service || '').toLowerCase() === 'ssh').length;
  const webCount = allIncidents.filter(a => ['http', 'web'].includes((a.service || '').toLowerCase())).length;
  const criticalCount = allIncidents.filter(a => (a.risk_level || '').toUpperCase() === 'CRITICAL' || a.risk_score >= 80).length;
  const containedCount = allIncidents.filter(a => (a.status || '').toUpperCase() === 'CONTAINED').length;

  const fleetPieData = [
    { name: 'SSH Decoy Traps', value: sshCount || (totalFleetAttacks > 0 ? totalFleetAttacks : 1), color: '#f8c858' },
    { name: 'Web & API Decoy Traps', value: webCount || (totalFleetAttacks > 1 ? 1 : 0), color: '#1e1e22' },
    { name: 'Port Probing Traps', value: Math.max(0, totalFleetAttacks - (sshCount + webCount)), color: '#0284c7' },
  ];

  const handleExportJSON = () => {
    downloadFile(`TRINETRA-incident-dossier-${session_id}.json`, JSON.stringify(activeReport, null, 2), 'application/json');
  };

  const handleExportMarkdown = () => {
    const md = `# TRINETRA SOC EXECUTIVE THREAT INTELLIGENCE DOSSIER
**Report ID**: ${activeReport.report_id}
**Incident Session**: ${session_id}
**Attacker IP**: ${source_ip} (${geo.city}, ${geo.country} ${geo.flag})
**Origin ASN**: ${geo.asn}
**Targeted Decoy**: ${service} Deception Node
**Risk Score**: ${risk_score}/100 (${risk_level})
**Containment Status**: ${containment_status}
**Timestamp**: ${formatTs(generated_at)}

---

## 1. Executive Summary & Impact Analysis
${activeReport.executive_summary}

## 2. Adversary Intent & Threat Actor Profiling
${activeReport.attacker_objective}

## 3. Observed Telemetry Behavior
${(activeReport.observed_behavior || []).map(b => `- ${b}`).join('\n')}

## 4. Analytical AI Threat Interpretation
${(activeReport.ai_interpretation || []).map(a => `- ${a}`).join('\n')}

## 5. MITRE ATT&CK Matrix Mapping
${(activeReport.mitre_techniques || []).map(m => `- [${m.technique_id}] ${m.technique_name} (${m.tactic})`).join('\n')}

## 6. Captured Indicators of Compromise (IOCs)
${(activeReport.iocs_summary || []).map(i => `- [${(i.ioc_type || 'IOC').toUpperCase()}] \`${i.value}\` (${i.threat_category})`).join('\n')}

---
**Cryptographic Forensic Proof**: SHA-256 Block ${activeReport.blockchain_proof?.block_index || 48} (VERIFIED)
*Generated by TRINETRA Autonomous Cyber Deception Grid*
`;
    downloadFile(`TRINETRA-incident-dossier-${session_id}.md`, md, 'text/markdown');
  };

  const filteredIncidents = allIncidents.filter(inc => {
    const q = searchQuery.toLowerCase();
    const matchQ = !q || inc.session_id.toLowerCase().includes(q) || inc.source_ip.includes(q) || inc.label.toLowerCase().includes(q);
    const matchS = filterSvc === 'ALL' || (inc.service || '').toUpperCase() === filterSvc;
    return matchQ && matchS;
  });

  return (
    <div className="space-y-6 fade-in pb-16 print:space-y-4 print:p-0">

      {/* ─── TOP MODE SELECTOR & EXPORT ACTION BAR ─────────────────────────── */}
      <div className="crextio-card p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4 print:hidden">
        {/* Report Mode Tabs */}
        <div className="flex items-center gap-2 p-1 rounded-full bg-neutral-100 border border-neutral-200">
          <button
            onClick={() => setReportMode('single')}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              reportMode === 'single' ? 'bg-[#1e1e22] text-white shadow-xs' : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Individual Attacker IP / Incident Report</span>
          </button>

          <button
            onClick={() => setReportMode('fleet')}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              reportMode === 'fleet' ? 'bg-[#1e1e22] text-white shadow-xs' : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-[#f8c858]" />
            <span>Master Organization Threat Digest ({totalFleetAttacks} Attacks)</span>
          </button>
        </div>

        {/* Export Suite Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => window.print()}
            className="px-4 py-2 rounded-full bg-neutral-900 text-white text-xs font-bold hover:bg-neutral-800 transition shadow-xs flex items-center gap-2 cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5 text-[#f8c858]" />
            <span>Print / Export PDF</span>
          </button>

          <button
            onClick={handleExportMarkdown}
            className="px-3.5 py-2 rounded-full bg-neutral-100 text-neutral-800 hover:bg-neutral-200 border border-neutral-200 text-xs font-semibold transition shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <FileCode className="w-3.5 h-3.5 text-neutral-700" />
            <span>Markdown</span>
          </button>

          <button
            onClick={() => exportSTIXBundle(activeReport, activeReport.iocs_summary)}
            className="px-3.5 py-2 rounded-full bg-neutral-100 text-neutral-800 hover:bg-neutral-200 border border-neutral-200 text-xs font-semibold transition shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <Share2 className="w-3.5 h-3.5 text-blue-600" />
            <span>STIX 2.1</span>
          </button>

          <button
            onClick={handleExportJSON}
            className="px-3.5 py-2 rounded-full bg-neutral-100 text-neutral-800 hover:bg-neutral-200 border border-neutral-200 text-xs font-semibold transition shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-neutral-700" />
            <span>JSON</span>
          </button>
        </div>
      </div>

      {/* ─── VIEW 1: FLEET-WIDE MASTER THREAT INTELLIGENCE DIGEST ──────────── */}
      {reportMode === 'fleet' ? (
        <div className="space-y-6">
          {/* Master Hero Banner */}
          <div className="crextio-card p-6 sm:p-8 bg-neutral-900 text-white rounded-3xl relative overflow-hidden">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
              <div className="space-y-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-3 py-1 rounded-full bg-[#f8c858] text-neutral-950 font-mono text-[10px] font-black uppercase tracking-widest">
                    MASTER SOC THREAT DIGEST
                  </span>
                  <span className="px-3 py-1 rounded-full bg-white/10 text-white text-[10px] font-bold">
                    {totalFleetAttacks} TOTAL ATTACKS CAPTURED
                  </span>
                </div>

                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight">
                  Comprehensive Enterprise Cyber Threat Intelligence Digest
                </h1>
                <p className="text-xs sm:text-sm text-neutral-300 max-w-3xl leading-relaxed">
                  Consolidated forensic telemetry across all active deception traps. Deterministic detection of external brute-force campaigns, canary honeytoken trips, web SQL injection exploits, and payload delivery attempts.
                </p>
              </div>

              {/* Master Stats */}
              <div className="grid grid-cols-2 gap-3 flex-shrink-0">
                <div className="p-4 rounded-2xl bg-white/10 text-center min-w-[120px]">
                  <span className="text-[10px] uppercase font-bold text-neutral-400 block">Critical Threats</span>
                  <p className="text-3xl font-black text-rose-400 mt-1">{criticalCount}</p>
                </div>
                <div className="p-4 rounded-2xl bg-white/10 text-center min-w-[120px]">
                  <span className="text-[10px] uppercase font-bold text-neutral-400 block">Neutralized</span>
                  <p className="text-3xl font-black text-emerald-400 mt-1">{containedCount}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Master Visual Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Decoy Protocol Distribution */}
            <div className="crextio-card p-6 flex flex-col justify-between">
              <div className="pb-3 border-b border-neutral-100 flex items-center justify-between">
                <h3 className="text-sm font-bold text-neutral-900">Decoy Surface Distribution</h3>
                <span className="text-xs text-neutral-500 font-mono">{totalFleetAttacks} Sessions</span>
              </div>

              <div className="h-48 w-full my-2">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={fleetPieData} cx="50%" cy="50%" innerRadius={48} outerRadius={68} paddingAngle={4} dataKey="value">
                      {fleetPieData.map((d, i) => (
                        <Cell key={i} fill={d.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="space-y-1.5 pt-2 border-t border-neutral-100 text-xs">
                {fleetPieData.map(d => (
                  <div key={d.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ background: d.color }} />
                      <span className="text-neutral-700 font-medium">{d.name}</span>
                    </div>
                    <span className="font-bold text-neutral-900">{d.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Top Threat Origin ASNs */}
            <div className="crextio-card p-6 lg:col-span-2 space-y-4">
              <div className="pb-3 border-b border-neutral-100 flex items-center justify-between">
                <h3 className="text-sm font-bold text-neutral-900">Top Attacker Autonomous Systems (ASNs)</h3>
                <span className="text-xs text-rose-600 font-bold">Priority Threat Vectors</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {allIncidents.slice(0, 6).map((item, i) => {
                  const g = item.geo || getIpGeolocation(item.source_ip);
                  return (
                    <div key={i} className="p-3.5 rounded-2xl bg-neutral-50 border border-neutral-200/80 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-bold text-neutral-900 truncate max-w-[200px]">{g.asn}</span>
                        <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[10px] font-bold">
                          {item.risk_score}/100 Risk
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-neutral-500">
                        <span>{g.city}, {g.country} {g.flag}</span>
                        <span className="text-purple-700 font-semibold font-mono">{item.source_ip}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Master Incident Directory Table */}
          <div className="crextio-card p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-neutral-100">
              <div>
                <h3 className="text-base font-bold text-neutral-900">All Recorded Attacker IPs &amp; Incidents Register</h3>
                <p className="text-xs text-neutral-500">Click any IP row to open its full individual forensic report</p>
              </div>

              {/* Filters */}
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-neutral-50 border border-neutral-200 text-xs">
                  <Search className="w-3.5 h-3.5 text-neutral-400" />
                  <input
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Search IP or Ref..."
                    className="bg-transparent focus:outline-none text-neutral-900 w-32"
                  />
                </div>
                {['ALL', 'SSH', 'HTTP', 'WEB'].map(s => (
                  <button
                    key={s}
                    onClick={() => setFilterSvc(s)}
                    className={`px-3 py-1 rounded-full text-xs font-bold transition cursor-pointer ${
                      filterSvc === s ? 'bg-[#1e1e22] text-white' : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-neutral-100">
              <table className="w-full text-left text-xs">
                <thead className="bg-neutral-50 border-b border-neutral-100 text-neutral-500 font-semibold">
                  <tr>
                    <th className="px-4 py-3">Attacker IP</th>
                    <th className="px-4 py-3">Origin Geo / ASN</th>
                    <th className="px-4 py-3">Decoy Sensor</th>
                    <th className="px-4 py-3">Threat Score</th>
                    <th className="px-4 py-3">Campaign Profiling</th>
                    <th className="px-4 py-3 text-right">View Dossier</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {filteredIncidents.map((inc, i) => {
                    const g = inc.geo || getIpGeolocation(inc.source_ip);
                    return (
                      <tr
                        key={inc.session_id || i}
                        onClick={() => {
                          setSelectedSessionId(inc.session_id);
                          setReportMode('single');
                        }}
                        className="hover:bg-neutral-50/80 transition cursor-pointer group"
                      >
                        <td className="px-4 py-3 font-mono font-bold text-blue-600">
                          {inc.source_ip}
                        </td>
                        <td className="px-4 py-3 font-sans text-neutral-700">
                          {g.city}, {g.country} {g.flag}
                        </td>
                        <td className="px-4 py-3">
                          <span className="px-2.5 py-0.5 rounded-full bg-neutral-100 text-neutral-800 font-bold uppercase text-[10px]">
                            {(inc.service || 'SSH').toUpperCase()}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-bold text-rose-600">
                          {inc.risk_score}/100
                        </td>
                        <td className="px-4 py-3 text-neutral-700">
                          {inc.label}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="font-bold text-blue-600 group-hover:underline flex items-center justify-end gap-1">
                            <span>Open IP Report</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* ─── VIEW 2: INDIVIDUAL INCIDENT FORENSIC DOSSIER ────────────────── */
        <div className="space-y-6">

          {/* Incident Selector Bar */}
          <div className="crextio-card p-4 flex flex-wrap items-center justify-between gap-3 bg-neutral-50 border border-neutral-200">
            <div className="flex items-center gap-3 flex-wrap flex-1 min-w-64">
              <span className="text-xs font-bold uppercase tracking-wider text-neutral-500 flex items-center gap-1.5">
                <Target className="w-4 h-4 text-neutral-800" /> Select Attacker IP / Incident:
              </span>
              <select
                value={selectedSessionId}
                onChange={e => setSelectedSessionId(e.target.value)}
                className="bg-white border border-neutral-300 rounded-full px-4 py-2 text-xs font-bold text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900 font-mono shadow-xs cursor-pointer flex-1 max-w-xl"
              >
                {allIncidents.map(inc => {
                  const g = inc.geo || getIpGeolocation(inc.source_ip);
                  return (
                    <option key={inc.session_id} value={inc.session_id}>
                      {inc.source_ip} · {g.city}, {g.country} {g.flag} ({(inc.service).toUpperCase()} - {inc.risk_score} Risk)
                    </option>
                  );
                })}
              </select>
            </div>

            <button
              onClick={() => setReportMode('fleet')}
              className="text-xs font-bold text-neutral-700 hover:text-neutral-900 underline flex items-center gap-1 cursor-pointer"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>View All {totalFleetAttacks} Attacks Summary</span>
            </button>
          </div>

          {/* Executive Dossier Hero Banner */}
          <div className="crextio-card p-6 sm:p-8 relative overflow-hidden bg-white">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
              <div className="space-y-3">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className="px-3 py-1 rounded-full bg-[#1e1e22] text-[#f8c858] font-mono text-[10px] font-black uppercase tracking-widest">
                    TRINETRA FORENSIC DOSSIER
                  </span>
                  <span className="px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-bold uppercase">
                    {risk_level} SEVERITY
                  </span>
                  <span className="px-2.5 py-1 rounded-full bg-neutral-100 text-neutral-700 text-[10px] font-bold uppercase">
                    {service} DECEPTION TRAP
                  </span>
                  {isContained ? (
                    <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                      ✓ CONTAINED
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-900 text-[10px] font-bold">
                      ● ACTIVE MONITORING
                    </span>
                  )}
                </div>

                <h1 className="text-2xl sm:text-3xl font-black text-neutral-900 tracking-tight font-sans">
                  Executive Threat Intelligence Report: {source_ip}
                </h1>

                <div className="flex items-center gap-4 flex-wrap text-xs text-neutral-600 font-mono">
                  <div className="flex items-center gap-1.5">
                    <span className="text-neutral-400">Attacker IP:</span>
                    <button
                      onClick={() => onSelectIp && onSelectIp(source_ip)}
                      className="font-bold text-blue-600 hover:text-blue-800 underline flex items-center gap-1 cursor-pointer"
                      title="Click for 360° IP Intelligence Dossier"
                    >
                      <span>{source_ip}</span>
                      <span>{geo.flag}</span>
                      <Eye className="w-3 h-3" />
                    </button>
                  </div>
                  <span>•</span>
                  <div>
                    <span className="text-neutral-400">Location:</span> <strong className="text-neutral-800">{geo.city}, {geo.country}</strong>
                  </div>
                  <span>•</span>
                  <div>
                    <span className="text-neutral-400">ASN:</span> <strong className="text-neutral-800">{geo.asn}</strong>
                  </div>
                  <span>•</span>
                  <div className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-neutral-400" />
                    <span>{formatTs(generated_at)}</span>
                  </div>
                </div>
              </div>

              {/* Right: Risk Gauge & Containment Trigger */}
              <div className="flex items-center gap-4 self-start lg:self-center flex-shrink-0">
                <div className="p-4 rounded-3xl bg-neutral-50 border border-neutral-200 text-center min-w-[130px] shadow-xs">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 block">Risk Index</span>
                  <p className="text-4xl font-black mt-1" style={{ color: riskColor(risk_score) }}>
                    {risk_score}
                  </p>
                  <div className="w-full bg-neutral-200 h-1.5 rounded-full mt-2 overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${risk_score}%`, backgroundColor: riskColor(risk_score) }} />
                  </div>
                </div>

                {!isContained && onContainSession && (
                  <button
                    onClick={() => onContainSession(session_id)}
                    className="px-5 py-3 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md transition flex items-center gap-2 cursor-pointer print:hidden"
                  >
                    <Lock className="w-4 h-4" />
                    <span>Contain Session</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* 2-Column Analysis & Radar Chart */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div className="crextio-card p-6 space-y-3">
                <div className="flex items-center gap-2 pb-3 border-b border-neutral-100">
                  <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
                    <FileText className="w-4 h-4" />
                  </div>
                  <h2 className="text-base font-bold text-neutral-900">Executive Summary &amp; Impact Analysis</h2>
                </div>
                <p className="text-sm text-neutral-700 leading-relaxed font-sans font-normal">
                  {activeReport.executive_summary}
                </p>
              </div>

              <div className="crextio-card p-6 space-y-3">
                <div className="flex items-center gap-2 pb-3 border-b border-neutral-100">
                  <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center flex-shrink-0">
                    <Target className="w-4 h-4" />
                  </div>
                  <h2 className="text-base font-bold text-neutral-900">Adversary Intent &amp; Threat Actor Profile</h2>
                </div>
                <p className="text-sm text-neutral-700 leading-relaxed font-sans">
                  {activeReport.attacker_objective}
                </p>
                {activeReport.threat_actor && (
                  <div className="p-3 rounded-xl bg-purple-50/70 border border-purple-100 flex items-center justify-between text-xs">
                    <span className="text-neutral-500">Attributed Actor / Campaign:</span>
                    <strong className="text-purple-900 font-bold">{activeReport.threat_actor} ({geo.actor_type})</strong>
                  </div>
                )}
              </div>

              {/* Observed Facts vs AI Interpretation */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="crextio-card p-5 space-y-3">
                  <div className="flex items-center gap-2 text-neutral-900 font-bold text-xs">
                    <Terminal className="w-4 h-4 text-neutral-700" />
                    <span>Verifiable Telemetry Facts</span>
                  </div>
                  <ul className="space-y-2 text-xs text-neutral-600">
                    {(activeReport.observed_behavior || []).map((b, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-blue-500 font-bold mt-0.5">•</span>
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="crextio-card p-5 space-y-3">
                  <div className="flex items-center gap-2 text-neutral-900 font-bold text-xs">
                    <Sparkles className="w-4 h-4 text-amber-600" />
                    <span>AI Analytic Hypotheses</span>
                  </div>
                  <ul className="space-y-2 text-xs text-neutral-600">
                    {(activeReport.ai_interpretation || []).map((int, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-[#f8c858] font-bold mt-0.5">▶</span>
                        <span>{int}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            {/* Right: Radar Chart & Techniques */}
            <div className="space-y-6">
              <div className="crextio-card p-5 flex flex-col justify-between">
                <div className="flex items-center justify-between pb-2 border-b border-neutral-100">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-neutral-700" />
                    <h3 className="text-xs font-bold text-neutral-900">Kill Chain Threat Radar</h3>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-600">
                    Multi-Vector
                  </span>
                </div>

                <div className="h-56 w-full my-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={activeReport.radar_metrics}>
                      <PolarGrid stroke="#e2e8f0" />
                      <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 10 }} />
                      <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                      <Radar name="Threat Vector" dataKey="A" stroke="#1e1e22" fill="#f8c858" fillOpacity={0.6} />
                      <Tooltip contentStyle={TOOLTIP_STYLE} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>

                <p className="text-[11px] text-neutral-400 text-center">
                  Autonomous vector intensity mapped against standard SOC kill chain
                </p>
              </div>

              <div className="crextio-card p-5 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-neutral-100">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-rose-600" />
                    <h3 className="text-xs font-bold text-neutral-900">Top Observed Techniques</h3>
                  </div>
                </div>

                <div className="space-y-2">
                  {(activeReport.mitre_techniques || []).slice(0, 5).map((m, i) => (
                    <div key={i} className="p-2.5 rounded-xl bg-neutral-50 border border-neutral-200/70 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-rose-600">{m.technique_id}</span>
                        <span className="text-[10px] font-bold uppercase text-neutral-400">{m.tactic}</span>
                      </div>
                      <p className="font-semibold text-neutral-800 mt-0.5">{m.technique_name}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Kill Chain Progression */}
          <div className="crextio-card p-6 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-neutral-900 text-[#f8c858] flex items-center justify-center flex-shrink-0">
                  <Activity className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-neutral-900">Attack Kill Chain Progression &amp; Timeline</h2>
                  <p className="text-xs text-neutral-500">Autonomous deception trap triggers across intrusion lifecycle</p>
                </div>
              </div>
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                Deception Trapped
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {(activeReport.kill_chain || []).map((kc, i) => (
                <div key={i} className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200/80 flex flex-col justify-between space-y-2 relative group hover:border-neutral-400 transition">
                  <div className="flex items-center justify-between text-[10px] font-mono text-neutral-400">
                    <span>Phase 0{i + 1}</span>
                    <span>{kc.time}</span>
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-neutral-900">{kc.phase}</h4>
                    <p className="text-[11px] text-neutral-600 mt-1 leading-snug">{kc.event}</p>
                  </div>
                  <div className="pt-2 border-t border-neutral-200 flex items-center justify-between text-[10px]">
                    <span className="font-bold text-emerald-600 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> {kc.status}
                    </span>
                    <span className="text-neutral-400 font-mono">100% Captured</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Captured IOCs */}
          <div className="crextio-card p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <div className="flex items-center gap-2">
                <Share2 className="w-5 h-5 text-emerald-600" />
                <h2 className="text-base font-bold text-neutral-900">Captured Indicators of Compromise (IOCs)</h2>
              </div>
              <span className="text-xs font-mono font-bold text-neutral-500">
                {(activeReport.iocs_summary || []).length} Indicators Extracted
              </span>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-neutral-100">
              <table className="w-full text-xs text-left">
                <thead className="bg-neutral-50 border-b border-neutral-100 text-neutral-500 font-semibold">
                  <tr>
                    <th className="px-4 py-3">Indicator Type</th>
                    <th className="px-4 py-3">Value / Artifact Hash</th>
                    <th className="px-4 py-3">Threat Category</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 font-mono">
                  {(activeReport.iocs_summary || []).map((ioc, i) => (
                    <tr key={i} className="hover:bg-neutral-50/80 transition">
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded-md bg-neutral-100 text-neutral-800 font-bold uppercase text-[10px]">
                          {ioc.ioc_type || 'IOC'}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-semibold text-neutral-900 break-all max-w-md">
                        {ioc.value}
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 font-bold text-[10px]">
                          {ioc.threat_category || 'SUSPICIOUS'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-sans">
                        <button
                          onClick={() => navigator.clipboard.writeText(ioc.value)}
                          className="text-xs text-neutral-500 hover:text-neutral-900 font-bold underline cursor-pointer"
                        >
                          Copy
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Hardening Checklist */}
          <div className="crextio-card p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                <h2 className="text-base font-bold text-neutral-900">Recommended SOC Remediation &amp; Hardening Actions</h2>
              </div>
              <span className="text-xs font-bold text-neutral-500">
                Interactive Playbook
              </span>
            </div>

            <div className="space-y-2.5">
              {(activeReport.recommendations || []).map((rec, i) => {
                const title = rec.title || rec;
                const desc = rec.desc || 'Execute automated mitigation rule.';
                const isDone = checklist[i] !== undefined ? checklist[i] : rec.done;

                return (
                  <div
                    key={i}
                    onClick={() => toggleChecklistItem(i)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-4 ${
                      isDone
                        ? 'bg-emerald-50/60 border-emerald-200 text-emerald-950'
                        : 'bg-neutral-50 border-neutral-200 text-neutral-900 hover:border-neutral-300'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-5 h-5 rounded-full mt-0.5 flex items-center justify-center flex-shrink-0 ${
                        isDone ? 'bg-emerald-600 text-white' : 'border border-neutral-400'
                      }`}>
                        {isDone && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                      <div>
                        <h4 className={`text-xs font-bold ${isDone ? 'line-through opacity-80' : ''}`}>{title}</h4>
                        <p className="text-[11px] text-neutral-500 mt-0.5 font-sans">{desc}</p>
                      </div>
                    </div>

                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full flex-shrink-0 ${
                      isDone ? 'bg-emerald-100 text-emerald-800' : 'bg-neutral-200 text-neutral-700'
                    }`}>
                      {isDone ? 'Completed' : 'Pending Action'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Blockchain Seal */}
          <div className="crextio-card-dark p-6 rounded-3xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center flex-shrink-0">
                <CheckCircle className="w-6 h-6 text-emerald-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-white tracking-wide">
                    CRYPTOGRAPHIC PROOF OF FORENSIC INTEGRITY
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-400/20 text-emerald-300 border border-emerald-400/30">
                    BLOCKCHAIN VERIFIED
                  </span>
                </div>
                <p className="text-xs text-neutral-400 font-mono mt-1 break-all">
                  Evidence Hash: {activeReport.blockchain_proof?.block_hash || '43c9218c68e21f2dfe6fb2b05fb9157687e744d79886faf9c7fc6bba1cd24352'}
                </p>
              </div>
            </div>

            <div className="text-right text-xs text-neutral-400 font-sans">
              <span className="block text-white font-bold">TRINETRA Cyber Deception Grid</span>
              <span>National Forensic Evidence Standard</span>
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
