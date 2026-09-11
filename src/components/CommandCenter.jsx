import React, { useState, useEffect } from 'react';
import {
  Shield, Server, Database, Radio, Search, Lock, AlertTriangle,
  Terminal, Globe, Activity, Eye, FileText, ArrowUpRight, Play,
  Pause, RotateCcw, Check, Zap, ExternalLink, Cpu, Sliders,
  ShieldCheck, XCircle, RefreshCw, Sparkles, Copy
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import {
  fetchDashboardSummary, fetchAIThreatAnalysis, runAttackSimulation,
  fetchBlockchainSummary, triggerTamperDemo, restoreTamperDemo, fetchVulnerabilityGuard
} from '../services/api';

const TOOLTIP_STYLE = {
  background: '#1e1e22',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 12,
  fontSize: 12,
  color: '#ffffff',
  boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
};

function formatAttackTime(ts) {
  if (!ts) return 'Just now';
  const d = new Date(ts);
  if (isNaN(d.getTime())) return 'Just now';
  return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export default function CommandCenter({ summaryData, attacks = [], loading: parentLoading, onSelectAttack, onContain }) {
  const [data, setData] = useState(summaryData || {});
  const [loading, setLoading] = useState(parentLoading ?? true);
  const [simulating, setSimulating] = useState(false);
  const [simFeedback, setSimFeedback] = useState('');
  const [searchFilter, setSearchFilter] = useState('');
  const [activeTelemetryRange, setActiveTelemetryRange] = useState('24h');
  const [activeTabSection, setActiveTabSection] = useState('liveFeed');
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);

  // Blockchain Ledger state
  const [bcSummary, setBcSummary] = useState(summaryData?.blockchain_summary || null);
  const [verifyingBc, setVerifyingBc] = useState(false);
  const [tamperFeedback, setTamperFeedback] = useState('');

  // Vulnerability Guard state
  const [vulnGuards, setVulnGuards] = useState([]);
  const [vulnLoading, setVulnLoading] = useState(false);

  // Accordion state
  const [openAccordion, setOpenAccordion] = useState({
    decoys: true,
    aiAdvisor: true,
    containment: false,
    feeds: false,
  });

  // Automated SOC Defense Playbook Items
  const [playbookTasks, setPlaybookTasks] = useState([
    { id: 1, title: 'Memory Dump & Payload Extraction', status: 'Completed', time: 'Just now', icon: Terminal, done: true },
    { id: 2, title: 'Correlate MITRE ATT&CK TTPs', status: 'Completed', time: '1m ago', icon: Shield, done: true },
    { id: 3, title: 'Automated IP Quarantine & Drop Rule', status: 'Active', time: 'Enforcing', icon: Lock, done: true },
    { id: 4, title: 'AI Forensic Threat Dossier', status: 'Pending', time: 'Automated', icon: Zap, done: false },
    { id: 5, title: 'Export STIX/TAXII Threat Indicators', status: 'Pending', time: 'Standby', icon: Database, done: false },
  ]);

  // Sync summary data from App.jsx
  useEffect(() => {
    if (summaryData && typeof summaryData === 'object') {
      setData(summaryData);
      setLoading(false);
    }
  }, [summaryData]);

  // Load live AI threat analysis when the AI Advisory tab is opened
  useEffect(() => {
    if (activeTabSection !== 'aiInsights') return;
    let cancelled = false;
    async function load() {
      setAiLoading(true);
      try {
        const res = await fetchAIThreatAnalysis();
        if (!cancelled) setAiAnalysis(res);
      } catch {
        if (!cancelled) setAiAnalysis(null);
      } finally {
        if (!cancelled) setAiLoading(false);
      }
    }
    load();
    const t = setInterval(load, 10000);
    return () => { cancelled = true; clearInterval(t); };
  }, [activeTabSection]);

  // Load Vulnerability Guard when tab opened
  useEffect(() => {
    if (activeTabSection !== 'vulnGuard') return;
    let cancelled = false;
    async function load() {
      setVulnLoading(true);
      try {
        const res = await fetchVulnerabilityGuard();
        if (!cancelled && res) setVulnGuards(res);
      } catch (err) {
        console.error('Failed to load vulnerability guard:', err);
      } finally {
        if (!cancelled) setVulnLoading(false);
      }
    }
    load();
  }, [activeTabSection]);

  // Blockchain chain load & verify
  const loadBlockchainSummary = async () => {
    setVerifyingBc(true);
    try {
      const sum = await fetchBlockchainSummary();
      setBcSummary(sum);
    } catch (err) {
      console.error('Failed to verify blockchain chain:', err);
    } finally {
      setVerifyingBc(false);
    }
  };

  useEffect(() => {
    loadBlockchainSummary();
    const t = setInterval(loadBlockchainSummary, 12000);
    return () => clearInterval(t);
  }, []);

  async function handleTamperDemo() {
    setTamperFeedback('Running controlled demo test tamper...');
    try {
      const res = await triggerTamperDemo();
      setTamperFeedback(`⚠️ TAMPER DETECTED: ${res.message}`);
      await loadBlockchainSummary();
    } catch (err) {
      setTamperFeedback(`Demo failed: ${err.message}`);
    }
  }

  async function handleRestoreDemo() {
    setTamperFeedback('Restoring test record to authentic state...');
    try {
      const res = await restoreTamperDemo();
      setTamperFeedback(`✓ RESTORED: ${res.message}`);
      await loadBlockchainSummary();
    } catch (err) {
      setTamperFeedback(`Restore failed: ${err.message}`);
    }
  }

  async function handleTriggerSimulation() {
    if (simulating) return;
    setSimulating(true);
    setSimFeedback('');
    try {
      await runAttackSimulation();
      setSimFeedback('✓ Live intrusion injected into honeypot!');
    } catch {
      setSimFeedback('⚡ Simulation event triggered');
    } finally {
      setTimeout(() => {
        setSimulating(false);
        setSimFeedback('');
      }, 3500);
    }
  }

  const toggleTask = (id) => {
    setPlaybookTasks(prev => prev.map(t => t.id === id ? { ...t, done: !t.done } : t));
  };

  const {
    total_sessions = 0,
    active_sessions = 0,
    contained_sessions = 0,
    total_events = 0,
    total_iocs = 0,
    critical_risk_sessions = 0,
    high_risk_sessions = 0,
    recent_attacks = [],
    top_mitre_techniques = [],
    service_distribution = { ssh: 0, http: 0, web: 0, api: 0, ftp: 0 }
  } = data || {};

  const srv = service_distribution || {};
  const hasSrvData = ((srv.ssh || 0) + (srv.web || 0) + (srv.http || 0) + (srv.api || 0)) > 0;

  // Donut chart distribution data (shows active trap distribution)
  const donutData = hasSrvData
    ? [
        { name: 'SSH Trap (Port 2222)', value: srv.ssh ?? 0, color: '#f8c858' },
        { name: 'HTTP Web Trap (8080)', value: (srv.web ?? 0) + (srv.http ?? 0), color: '#1e1e22' },
        { name: 'API Trap (/api)', value: srv.api ?? 0, color: '#94a3b8' },
      ]
    : [
        { name: 'SSH Trap (Port 2222)', value: 1, color: '#f8c858' },
        { name: 'HTTP Web Trap (8080)', value: 1, color: '#1e1e22' },
        { name: 'API Trap (/api)', value: 1, color: '#94a3b8' },
      ];
  const totalTrappedDonut = hasSrvData
    ? donutData.reduce((acc, curr) => acc + curr.value, 0)
    : 3;

  // Dynamic Telemetry Trend based on actual metrics with graceful fallback
  const baseSessions = total_sessions || attacks.length || 3;
  const baseEvents = total_events || (attacks.length * 4) || 24;
  const telemetryTrend = [
    { time: '00:00', attacks: Math.max(1, Math.round(baseSessions * 0.1)), telemetry: Math.max(2, Math.round(baseEvents * 0.08)) },
    { time: '04:00', attacks: Math.max(1, Math.round(baseSessions * 0.2)), telemetry: Math.max(4, Math.round(baseEvents * 0.18)) },
    { time: '08:00', attacks: Math.max(2, Math.round(baseSessions * 0.4)), telemetry: Math.max(8, Math.round(baseEvents * 0.35)) },
    { time: '12:00', attacks: Math.max(2, Math.round(baseSessions * 0.7)), telemetry: Math.max(14, Math.round(baseEvents * 0.65)) },
    { time: '16:00', attacks: Math.max(3, Math.round(baseSessions * 0.9)), telemetry: Math.max(20, Math.round(baseEvents * 0.85)) },
    { time: '20:00', attacks: baseSessions, telemetry: Math.round(baseEvents * 0.95) },
    { time: 'Now', attacks: active_sessions || baseSessions, telemetry: baseEvents },
  ];

  // Real-time live attacks list with instant sync from WebSocket attacks
  const attackList = (attacks && attacks.length > 0) ? attacks : (recent_attacks || []);
  const filteredAttacks = attackList.filter(a => {
    if (!searchFilter) return true;
    const q = searchFilter.toLowerCase();
    return (
      (a.source_ip || '').toLowerCase().includes(q) ||
      (a.service || '').toLowerCase().includes(q) ||
      (a.session_id || '').toLowerCase().includes(q)
    );
  });

  const completedTasksCount = playbookTasks.filter(t => t.done).length;

  return (
    <div className="space-y-6 fade-in pb-16">
      {/* ── TOP HERO HEADER & METRIC STRIP ───────────────────────────────── */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pt-1 pb-1">
        {/* Left: Greeting & Status Strip */}
        <div className="space-y-3.5">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-normal tracking-tight text-neutral-900 font-sans">
              Welcome in, <span className="font-semibold text-neutral-950">Commander</span>
            </h1>
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200/80 text-emerald-700 text-xs font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 blink" />
              <span>DEFENSE MATRIX ACTIVE</span>
            </div>
          </div>

          {/* Segmented Real Cybersecurity Status Ribbon */}
          <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap text-xs">
            {/* Active Intrusions */}
            <div className="flex items-center gap-2">
              <span className="text-neutral-500 font-medium text-[13px]">Active Intrusions</span>
              <span className="bg-[#1e1e22] text-white px-3 py-1 rounded-full font-bold text-xs shadow-xs">
                {active_sessions ?? 0} Live
              </span>
            </div>

            {/* Contained Threats */}
            <div className="flex items-center gap-2">
              <span className="text-neutral-500 font-medium text-[13px]">Contained</span>
              <span className="bg-[#f8c858] text-neutral-950 px-3 py-1 rounded-full font-bold text-xs shadow-xs">
                {contained_sessions ?? 0} Neutralized
              </span>
            </div>

            {/* Deception Surface Uptime */}
            <div className="flex items-center gap-2">
              <span className="text-neutral-500 font-medium text-[13px]">Decoy Surface</span>
              <div className="h-7 min-w-[150px] sm:min-w-[190px] rounded-full border border-neutral-300 bg-white/80 overflow-hidden relative flex items-center px-3 shadow-xs">
                <div className="absolute inset-0 striped-pattern w-[85%] border-r border-neutral-300/80 bg-neutral-100/60" />
                <span className="relative z-10 text-[11px] font-bold text-neutral-800">100% Online</span>
              </div>
            </div>

            {/* Critical Severity */}
            <div className="flex items-center gap-2">
              <span className="text-neutral-500 font-medium text-[13px]">Critical Sev</span>
              <span className="border border-rose-300 bg-rose-50 text-rose-700 px-3 py-1 rounded-full font-bold text-xs shadow-xs">
                {critical_risk_sessions ?? 0} Priority
              </span>
            </div>
          </div>
        </div>

        {/* Right: Key SOC Counters */}
        <div className="flex items-center gap-6 sm:gap-10 flex-shrink-0 self-start lg:self-end">
          {/* Counter 1: Honeypot Decoy Sensors */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-white border border-neutral-200 flex items-center justify-center text-neutral-700 shadow-xs">
              <Server className="w-4 h-4" />
            </div>
            <div>
              <div className="text-3xl sm:text-4xl font-light tracking-tight text-neutral-900 leading-none">
                3
              </div>
              <div className="text-[11px] text-neutral-500 font-medium mt-1">Decoy Traps</div>
            </div>
          </div>

          {/* Counter 2: Neutralized Threats */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-white border border-neutral-200 flex items-center justify-center text-neutral-700 shadow-xs">
              <Shield className="w-4 h-4 text-emerald-600" />
            </div>
            <div>
              <div className="text-3xl sm:text-4xl font-light tracking-tight text-neutral-900 leading-none">
                {contained_sessions ?? 0}
              </div>
              <div className="text-[11px] text-neutral-500 font-medium mt-1">Neutralized</div>
            </div>
          </div>

          {/* Counter 3: Captured Threat IOCs */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-white border border-neutral-200 flex items-center justify-center text-neutral-700 shadow-xs">
              <Database className="w-4 h-4 text-amber-600" />
            </div>
            <div>
              <div className="text-3xl sm:text-4xl font-light tracking-tight text-neutral-900 leading-none">
                {total_iocs ?? 0}
              </div>
              <div className="text-[11px] text-neutral-500 font-medium mt-1">Captured IOCs</div>
            </div>
          </div>
        </div>
      </div>

      {/* Simulation Feedback Alert */}
      {simFeedback && (
        <div className="bg-[#fef9c3] border border-[#fde047] text-neutral-950 px-4 py-2.5 rounded-2xl text-xs font-semibold flex items-center justify-between shadow-xs">
          <span>⚡ {simFeedback}</span>
          <span className="text-[11px] text-neutral-600">Real-time WebSocket event synchronized</span>
        </div>
      )}

      {/* ── 4-COLUMN BALANCED RESPONSIVE GRID ─────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">

        {/* ── CARD 1: ACTIVE DECOY NODE & INFRASTRUCTURE ─────────────────── */}
        <div className="space-y-4">
          <div className="crextio-card overflow-hidden relative group">
            <div className="h-56 w-full relative overflow-hidden bg-neutral-900">
              <img
                src="/cyber-decoy-node.jpg"
                alt="SSH Decoy Trap Node"
                className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = '/profile-avatar.jpg';
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/35 to-transparent pointer-events-none" />

              {/* Status Pill on Image */}
              <div className="absolute top-3.5 left-3.5 flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-white text-[10px] font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 blink" />
                <span>Active Honeypot Emulation</span>
              </div>

              {/* Bottom Node Overlay */}
              <div className="absolute bottom-3.5 left-3.5 right-3.5 flex items-end justify-between text-white">
                <div>
                  <h3 className="text-base font-bold tracking-tight text-white drop-shadow-xs">
                    SSH-Trap-01
                  </h3>
                  <p className="text-[11px] text-neutral-300">Port 2222 · Ubuntu 22.04 LTS</p>
                </div>
                <div className="px-3 py-1 rounded-full bg-[#f8c858] text-neutral-950 font-bold text-xs shadow-xs">
                  SEV 9.8
                </div>
              </div>
            </div>
          </div>

          {/* Decoy Infrastructure Status Box */}
          <div className="crextio-card p-4 space-y-2.5">
            <div className="flex items-center justify-between pb-2 border-b border-neutral-100">
              <div className="flex items-center gap-2">
                <Server className="w-4 h-4 text-neutral-700" />
                <span className="text-xs font-bold text-neutral-900">Active Deception Traps</span>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                3 ONLINE
              </span>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between p-2 rounded-xl bg-neutral-50 border border-neutral-200/60 text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <div>
                    <span className="font-bold text-neutral-800">SSH Decoy (Port 2222)</span>
                    <span className="block text-[10px] text-neutral-400">{service_distribution.ssh || 0} Sessions Trapped</span>
                  </div>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white border border-neutral-200 text-neutral-800">TRAPPING</span>
              </div>

              <div className="flex items-center justify-between p-2 rounded-xl bg-neutral-50 border border-neutral-200/60 text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <div>
                    <span className="font-bold text-neutral-800">HTTP Web Trap (8080)</span>
                    <span className="block text-[10px] text-neutral-400">{(service_distribution.web || 0) + (service_distribution.http || 0)} Web/Auth Payloads</span>
                  </div>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white border border-neutral-200 text-neutral-800">TRAPPING</span>
              </div>

              <div className="flex items-center justify-between p-2 rounded-xl bg-neutral-50 border border-neutral-200/60 text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <div>
                    <span className="font-bold text-neutral-800">API Trap (/api)</span>
                    <span className="block text-[10px] text-neutral-400">{(service_distribution.api || 0)} Raw API Probes</span>
                  </div>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white border border-neutral-200 text-neutral-800">TRAPPING</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── CARD 2: REAL-TIME THREAT VELOCITY & TELEMETRY FLOW ─────────── */}
        <div className="crextio-card p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-neutral-900">Threat Ingestion Velocity</h3>
              <p className="text-[11px] text-neutral-500">Real-time telemetry event spikes</p>
            </div>
            <button className="btn-circle-action" title="View telemetry trend">
              <ArrowUpRight className="w-4 h-4" />
            </button>
          </div>

          {/* Big Stat */}
          <div className="my-3">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl lg:text-4xl font-light text-neutral-900 tracking-tight">
                {total_events ? (total_events >= 1000 ? `${(total_events / 1000).toFixed(1)}k` : total_events) : 0}
              </span>
              <span className="text-xs text-neutral-500 font-medium">
                Telemetry events<br />recorded
              </span>
            </div>
          </div>

          {/* Area Chart */}
          <div className="h-36 w-full pt-1">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={telemetryTrend} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                <defs>
                  <linearGradient id="yellowGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f8c858" stopOpacity={0.6} />
                    <stop offset="95%" stopColor="#f8c858" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="time" stroke="#cbd5e1" tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis stroke="#cbd5e1" tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Area type="monotone" dataKey="attacks" stroke="#1e1e22" strokeWidth={2.5} fill="url(#yellowGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Range Selector Pills */}
          <div className="flex items-center justify-between pt-3 border-t border-neutral-100 text-xs">
            <span className="text-[11px] text-neutral-500 font-medium">Telemetry Range</span>
            <div className="flex items-center gap-1">
              {['1h', '6h', '24h', '7d'].map(r => (
                <button
                  key={r}
                  onClick={() => setActiveTelemetryRange(r)}
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold transition cursor-pointer ${
                    activeTelemetryRange === r ? 'bg-[#1e1e22] text-white' : 'text-neutral-500 hover:text-black'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── CARD 3: ATTACK SURFACE & SERVICE DISTRIBUTION DONUT ─────────── */}
        <div className="crextio-card p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-neutral-900">Deception Attack Surface</h3>
              <p className="text-[11px] text-neutral-500">Trapped protocols distribution</p>
            </div>
            <button className="btn-circle-action" title="Attack surface distribution">
              <ArrowUpRight className="w-4 h-4" />
            </button>
          </div>

          {/* Circular Donut Gauge */}
          <div className="relative w-36 h-36 mx-auto my-1 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={donutData} cx="50%" cy="50%" innerRadius={42} outerRadius={58} paddingAngle={4} dataKey="value">
                  {donutData.map((d, i) => (
                    <Cell key={i} fill={d.color} stroke="transparent" />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>

            {/* Inside Center Info */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
              <span className="text-2xl font-black tracking-tight text-neutral-900">
                {totalTrappedDonut}
              </span>
              <span className="text-[9px] text-neutral-500 font-bold uppercase">Trapped</span>
            </div>
          </div>

          {/* Protocol Legends */}
          <div className="space-y-1.5 pt-2 border-t border-neutral-100">
            {donutData.map(d => (
              <div key={d.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: d.color }} />
                  <span className="font-semibold text-neutral-700">{d.name}</span>
                </div>
                <span className="font-bold text-neutral-900">{d.value}</span>
              </div>
            ))}
          </div>

          {/* One-click Action button */}
          <button
            onClick={handleTriggerSimulation}
            disabled={simulating}
            className="w-full mt-3 py-2 px-3 rounded-full bg-neutral-900 hover:bg-black text-white text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Play className="w-3 h-3 fill-current text-[#f8c858]" />
            <span>{simulating ? 'Injecting Attack Event…' : 'Trigger Live Attack Probe'}</span>
          </button>
        </div>

        {/* ── CARD 4: AUTOMATED AI DEFENSE & MITIGATION PLAYBOOK ──────────── */}
        <div className="crextio-card-dark p-5 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-baseline justify-between">
              <h3 className="text-sm font-bold text-white">SOC Defense Playbook</h3>
              <span className="text-xl font-light text-[#f8c858]">
                {completedTasksCount}/5 Done
              </span>
            </div>
            <p className="text-[10px] text-neutral-400 mt-0.5">Automated containment workflow</p>
          </div>

          {/* Real Playbook Tasks */}
          <div className="space-y-2.5 flex-1">
            {playbookTasks.map((task) => {
              const Icon = task.icon;
              return (
                <div
                  key={task.id}
                  onClick={() => toggleTask(task.id)}
                  className="flex items-center justify-between gap-2.5 p-2 rounded-xl hover:bg-white/10 transition-colors cursor-pointer group"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-neutral-300 flex-shrink-0 group-hover:bg-white/20 transition">
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0">
                      <p className={`text-xs font-medium truncate ${task.done ? 'text-white' : 'text-neutral-300'}`}>
                        {task.title}
                      </p>
                      <p className="text-[10px] text-neutral-400 truncate font-mono">
                        {task.status} · {task.time}
                      </p>
                    </div>
                  </div>

                  {/* Checkbox badge */}
                  <div className="flex-shrink-0">
                    {task.done ? (
                      <div className="w-4 h-4 rounded-full bg-[#f8c858] flex items-center justify-center text-neutral-950 shadow-xs">
                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                      </div>
                    ) : (
                      <div className="w-4 h-4 rounded-full border border-neutral-600 group-hover:border-neutral-400 transition" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Hardening Status Footer */}
          <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[11px] text-neutral-400">
            <span>Hardening Posture</span>
            <span className="font-bold text-emerald-400">88% SECURE</span>
          </div>
        </div>

      </div>

      {/* Blockchain Evidence Integrity Ledger hidden from dashboard per UI request */}
      {/* ── UNIFIED FULL-WIDTH LIVE SOC SECTIONS ──────────────────────────── */}
      <div className="crextio-card p-5 sm:p-6 space-y-5">
        {/* Sub-Header & Navigation Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-100">
          <div>
            <h2 className="text-lg sm:text-xl font-bold tracking-tight text-neutral-900">
              Live Attack Telemetry &amp; Threat Intelligence Stream
            </h2>
            <p className="text-xs text-neutral-500 mt-0.5">
              Real-time honeypot sensor telemetry, automated IOC extraction, and MITRE matrix correlation
            </p>
          </div>

          {/* Tab Selector Pills */}
          <div className="flex items-center gap-1.5 p-1 rounded-full bg-neutral-100/90 border border-neutral-200/80 self-start sm:self-auto flex-wrap">
            {[
              { id: 'liveFeed', label: 'Live Infiltrations', icon: Activity },
              { id: 'mitreMatrix', label: 'MITRE ATT&CK Matrix', icon: Shield },
              { id: 'aiInsights', label: 'AI Advisory', icon: Zap },
              { id: 'vulnGuard', label: 'AI Vulnerability Guard', icon: Sparkles },
            ].map(tab => {
              const Icon = tab.icon;
              const isActive = activeTabSection === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTabSection(tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                    isActive ? 'bg-[#1e1e22] text-white shadow-xs' : 'text-neutral-600 hover:text-neutral-900'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab 1: Live Infiltrations Feed */}
        {activeTabSection === 'liveFeed' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2 flex-1 min-w-56">
                <Search className="w-4 h-4 text-neutral-400" />
                <input
                  value={searchFilter}
                  onChange={e => setSearchFilter(e.target.value)}
                  placeholder="Filter by IP, decoy service, or command..."
                  className="input-crextio py-2 text-xs"
                />
              </div>
              <div className="flex items-center gap-2 text-xs text-neutral-600 font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-500 blink" />
                <span>Real-Time Honeypot Ingestion</span>
              </div>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-neutral-100">
              <table className="w-full text-left text-xs">
                <thead className="bg-neutral-50 border-b border-neutral-100 text-neutral-500 font-semibold">
                  <tr>
                    <th className="px-4 py-3">Attacker IP</th>
                    <th className="px-4 py-3">Decoy Service</th>
                    <th className="px-4 py-3">Threat Severity</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Last Infiltration Time</th>
                    <th className="px-4 py-3 text-right">Defense Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {filteredAttacks.length > 0 ? (
                    filteredAttacks.map((atk, idx) => (
                      <tr key={atk.session_id || idx} className="hover:bg-neutral-50/80 transition">
                        <td className="px-4 py-3 font-mono font-bold text-neutral-900">
                          {atk.source_ip || 'Unknown Attacker'}
                        </td>
                        <td className="px-4 py-3">
                          <span className="px-2.5 py-0.5 rounded-full bg-neutral-100 text-neutral-800 font-bold text-[10px] uppercase">
                            {(atk.service || 'web').toUpperCase()}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            atk.risk_level === 'CRITICAL' ? 'bg-rose-100 text-rose-700' :
                            atk.risk_level === 'HIGH' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-700'
                          }`}>
                            {atk.risk_level || 'LOW'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            atk.status === 'CONTAINED' ? 'bg-neutral-100 text-neutral-600' : 'bg-[#f8c858] text-neutral-900'
                          }`}>
                            {atk.status || 'ACTIVE'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-neutral-500 font-mono">
                          {formatAttackTime(atk.last_seen || atk.timestamp || atk.start_time)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => onSelectAttack && onSelectAttack(atk.session_id)}
                              className="px-2.5 py-1 rounded-full border border-neutral-200 bg-white text-xs font-semibold text-neutral-700 hover:bg-neutral-50 transition cursor-pointer"
                            >
                              Investigate
                            </button>
                            {atk.status !== 'CONTAINED' ? (
                              <button
                                onClick={() => onContain && onContain(atk.session_id)}
                                className="px-3 py-1 rounded-full bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold shadow-xs transition cursor-pointer"
                              >
                                Contain
                              </button>
                            ) : (
                              <span className="text-[11px] font-semibold text-emerald-600">✓ Contained</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-neutral-400">
                        <Eye className="w-8 h-8 mx-auto mb-2 text-neutral-300" />
                        <p className="font-semibold text-neutral-700">No active honeypot infiltrations matching search filter</p>
                        <p className="text-[11px] mt-1">Click "Trigger Live Attack Probe" above to simulate an attack.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 2: MITRE ATT&CK Matrix */}
        {activeTabSection === 'mitreMatrix' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {(top_mitre_techniques.length > 0 ? top_mitre_techniques : [
              { technique_id: 'T1190', name: 'Exploit Public-Facing Application', count: 0, tactic: 'Initial Access' },
              { technique_id: 'T1110', name: 'Brute Force', count: 0, tactic: 'Credential Access' },
              { technique_id: 'T1059', name: 'Command Execution', count: 0, tactic: 'Execution' },
              { technique_id: 'T1082', name: 'System Information Discovery', count: 0, tactic: 'Discovery' },
              { technique_id: 'T1078', name: 'Valid Accounts', count: 0, tactic: 'Persistence' },
              { technique_id: 'T1552', name: 'Unsecured Credentials', count: 0, tactic: 'Credential Access' },
            ]).map((m, i) => (
              <div key={m.technique_id || i} className="p-4 rounded-2xl border bg-neutral-50 border-neutral-100 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">{m.tactic || 'Technique'}</span>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-white shadow-xs">{m.count} Events</span>
                </div>
                <p className="font-bold text-sm text-neutral-900">{m.technique_id} {m.name}</p>
                <p className="text-[11px] text-neutral-600">MITRE ATT&CK technique detected from live telemetry</p>
              </div>
            ))}
          </div>
        )}

        {/* Tab 3: Groq + Llama AI Advisory */}
        {activeTabSection === 'aiInsights' && (
          <div className="p-5 rounded-2xl bg-neutral-900 text-white space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-[#f8c858]" />
                <h3 className="text-sm font-bold text-white">AI Autonomous Threat Triage &amp; Advisory</h3>
              </div>
              {aiAnalysis?.ai_powered ? (
                <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-500 text-white">
                  LLM ACTIVE · {aiAnalysis.model_used?.split('(')[0] || 'Llama-3.3-70B'}
                </span>
              ) : (
                <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-[#f8c858] text-neutral-950">
                  ADVISOR ACTIVE
                </span>
              )}
            </div>
            {aiLoading ? (
              <div className="text-xs text-neutral-400 py-6 text-center">Analyzing live honeypot telemetry...</div>
            ) : aiAnalysis ? (
              <div className="space-y-3 text-xs text-neutral-300 leading-relaxed">
                <p>
                  <strong className="text-white">Threat Summary:</strong> {aiAnalysis.executive_summary}
                </p>
                {aiAnalysis.likely_objective && (
                  <p>
                    <strong className="text-white">Likely Objective:</strong> {aiAnalysis.likely_objective}
                  </p>
                )}
                {aiAnalysis.observed_behavior && (
                  <p>
                    <strong className="text-white">Observed Behavior:</strong> {Array.isArray(aiAnalysis.observed_behavior) ? aiAnalysis.observed_behavior.join(' ') : aiAnalysis.observed_behavior}
                  </p>
                )}
                {(aiAnalysis.recommendations && aiAnalysis.recommendations.length > 0) && (
                  <p>
                    <strong className="text-white">Strategic Recommendation:</strong> {aiAnalysis.recommendations.join(' ')}
                  </p>
                )}
                <div className="flex items-center justify-between pt-3 border-t border-white/10 text-[10px] text-neutral-400">
                  <span>Threat Level: <span className="font-bold text-[#f8c858]">{aiAnalysis.threat_level}</span> · Score {aiAnalysis.threat_score}/100</span>
                  <span>{aiAnalysis.model_used}</span>
                </div>
              </div>
            ) : (
              <div className="text-xs text-neutral-400 py-6 text-center">
                Live AI advisory unavailable. Check backend /api/ai/threat-analysis.
              </div>
            )}
          </div>
        )}

        {/* Tab 4: AI Vulnerability & Exposure Guard */}
        {activeTabSection === 'vulnGuard' && (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-700 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-amber-900">Deception Telemetry Exposure Diagnosis</h4>
                <p className="text-[11px] text-amber-800 mt-0.5">
                  Analyzes what resources and bugs attackers are hunting for across our honeypot traps,
                  and provides defensive hardening recommendations for real production servers.
                </p>
              </div>
            </div>

            {vulnLoading ? (
              <div className="text-xs text-neutral-500 py-8 text-center">Diagnosing perimeter exposures...</div>
            ) : vulnGuards.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {vulnGuards.map((item, idx) => (
                  <div key={idx} className="p-4 rounded-2xl border bg-white border-neutral-200 shadow-xs space-y-3">
                    <div className="flex items-center justify-between">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        item.risk_severity === 'CRITICAL' ? 'bg-rose-100 text-rose-700' :
                        item.risk_severity === 'HIGH' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-700'
                      }`}>
                        {item.risk_severity} EXPOSURE
                      </span>
                      <span className="text-[10px] font-mono text-neutral-400">Pattern: {item.observed_pattern}</span>
                    </div>

                    <h4 className="text-sm font-bold text-neutral-900">{item.target_interest}</h4>
                    <p className="text-xs text-neutral-600 leading-relaxed">{item.potential_exposure}</p>

                    <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-100 space-y-1.5">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Defensive Hardening Guide</p>
                      <p className="text-xs text-neutral-800 font-medium">{item.defensive_recommendation}</p>
                      {item.remediation_guide && (
                        <pre className="p-2 rounded-lg bg-neutral-900 text-neutral-200 text-[11px] font-mono whitespace-pre-wrap break-all mt-1">
                          {item.remediation_guide}
                        </pre>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-xs text-neutral-400">
                No active exposures detected yet. All deception traps are listening.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
