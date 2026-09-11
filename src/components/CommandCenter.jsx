import React, { useState, useEffect } from 'react';
import {
  Shield, Server, Database, Radio, Search, Lock, AlertTriangle,
  Terminal, Globe, Activity, Eye, FileText, ArrowUpRight, Play,
  Pause, RotateCcw, Check, Zap, ExternalLink, Cpu, Sliders
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import { fetchDashboardSummary, runAttackSimulation } from '../services/api';

const TOOLTIP_STYLE = {
  background: '#1e1e22',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 12,
  fontSize: 12,
  color: '#ffffff',
  boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
};

export default function CommandCenter({ summaryData, loading: parentLoading, onSelectAttack, onContain }) {
  const [data, setData] = useState(summaryData || {});
  const [loading, setLoading] = useState(parentLoading ?? true);
  const [simulating, setSimulating] = useState(false);
  const [simFeedback, setSimFeedback] = useState('');
  const [searchFilter, setSearchFilter] = useState('');
  const [activeTelemetryRange, setActiveTelemetryRange] = useState('24h');
  const [activeTabSection, setActiveTabSection] = useState('liveFeed');

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
    { id: 4, title: 'Gemini AI Forensic Threat Dossier', status: 'Pending', time: 'Automated', icon: Zap, done: false },
    { id: 5, title: 'Export STIX/TAXII Threat Indicators', status: 'Pending', time: 'Standby', icon: Database, done: false },
  ]);

  // Sync summary data
  useEffect(() => {
    if (summaryData && Object.keys(summaryData).length > 0) {
      setData(summaryData);
      setLoading(false);
    }
  }, [summaryData]);

  // Auto-refresh summary
  useEffect(() => {
    const t = setInterval(async () => {
      try {
        const d = await fetchDashboardSummary();
        if (d) {
          setData(d);
          setLoading(false);
        }
      } catch {}
    }, 8000);
    return () => clearInterval(t);
  }, []);

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
    total_sessions = 78,
    active_sessions = 2,
    contained_sessions = 56,
    total_events = 6120,
    total_iocs = 203,
    critical_risk_sessions = 8,
    high_risk_sessions = 18,
    recent_attacks = [],
    service_distribution = { ssh: 45, http: 22, ftp: 11 }
  } = data;

  // Donut chart distribution data
  const donutData = [
    { name: 'SSH Trap (Port 2222)', value: service_distribution.ssh || 45, color: '#f8c858' },
    { name: 'HTTP Web Decoy (8080)', value: service_distribution.http || 22, color: '#1e1e22' },
    { name: 'FTP Honeypot (2121)', value: service_distribution.ftp || 11, color: '#94a3b8' },
  ];
  const totalTrappedDonut = donutData.reduce((acc, curr) => acc + curr.value, 0);

  // Telemetry Area Chart Buckets
  const telemetryTrend = [
    { time: '00:00', attacks: 12, telemetry: 48 },
    { time: '04:00', attacks: 28, telemetry: 112 },
    { time: '08:00', attacks: 65, telemetry: 320 },
    { time: '12:00', attacks: 142, telemetry: 680 },
    { time: '16:00', attacks: 189, telemetry: 890 },
    { time: '20:00', attacks: 120, telemetry: 540 },
    { time: 'Now', attacks: active_sessions ? active_sessions * 15 : 95, telemetry: 480 },
  ];

  const filteredAttacks = (recent_attacks || []).filter(a => {
    if (!searchFilter) return true;
    const q = searchFilter.toLowerCase();
    return (
      (a.source_ip || '').includes(q) ||
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
                {active_sessions || 2} Live
              </span>
            </div>

            {/* Contained Threats */}
            <div className="flex items-center gap-2">
              <span className="text-neutral-500 font-medium text-[13px]">Contained</span>
              <span className="bg-[#f8c858] text-neutral-950 px-3 py-1 rounded-full font-bold text-xs shadow-xs">
                {contained_sessions || 56} Neutralized
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
                {critical_risk_sessions || 8} Priority
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
                {total_sessions || 78}
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
                {contained_sessions || 56}
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
                {total_iocs || 203}
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
                    <span className="block text-[10px] text-neutral-400">45 Infiltrations Trapped</span>
                  </div>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white border border-neutral-200 text-neutral-800">TRAPPING</span>
              </div>

              <div className="flex items-center justify-between p-2 rounded-xl bg-neutral-50 border border-neutral-200/60 text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <div>
                    <span className="font-bold text-neutral-800">HTTP Web Trap (8080)</span>
                    <span className="block text-[10px] text-neutral-400">22 SQLi/Auth Payloads</span>
                  </div>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white border border-neutral-200 text-neutral-800">TRAPPING</span>
              </div>

              <div className="flex items-center justify-between p-2 rounded-xl bg-neutral-50 border border-neutral-200/60 text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <div>
                    <span className="font-bold text-neutral-800">FTP Honeypot (2121)</span>
                    <span className="block text-[10px] text-neutral-400">11 Anonymous Probes</span>
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
                {total_events ? `${(total_events / 1000).toFixed(1)}k` : '6.1k'}
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
              { id: 'aiInsights', label: 'Gemini AI Advisory', icon: Zap },
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
                          {atk.source_ip || '185.220.101.45'}
                        </td>
                        <td className="px-4 py-3">
                          <span className="px-2.5 py-0.5 rounded-full bg-neutral-100 text-neutral-800 font-bold text-[10px] uppercase">
                            {atk.service || 'SSH'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            atk.risk_level === 'CRITICAL' ? 'bg-rose-100 text-rose-700' :
                            atk.risk_level === 'HIGH' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-700'
                          }`}>
                            {atk.risk_level || 'HIGH'}
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
                          {atk.timestamp ? new Date(atk.timestamp).toLocaleTimeString() : 'Just now'}
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
            {[
              { tactic: 'Initial Access', tech: 'T1190 Exploit Public App', count: '48 Probes', desc: 'Exploit attempts on HTTP/SSH ports', color: 'bg-rose-50 border-rose-100 text-rose-700' },
              { tactic: 'Credential Access', tech: 'T1110 Brute Force', count: '132 Attempts', desc: 'SSH & Admin login dictionary attacks', color: 'bg-amber-50 border-amber-100 text-amber-800' },
              { tactic: 'Execution', tech: 'T1059 Command Injection', count: '29 Events', desc: 'Trapped bash/curl/wget reverse shell attempts', color: 'bg-purple-50 border-purple-100 text-purple-700' },
              { tactic: 'Discovery', tech: 'T1082 System Info Discovery', count: '19 Queries', desc: 'whoami, id, uname -a system profiling', color: 'bg-blue-50 border-blue-100 text-blue-700' },
              { tactic: 'Persistence', tech: 'T1078 Valid Accounts', count: '14 Logins', desc: 'Compromised decoy root/admin credentials', color: 'bg-emerald-50 border-emerald-100 text-emerald-700' },
              { tactic: 'Defense Evasion', tech: 'T1070 Indicator Removal', count: '8 Attempts', desc: 'Attempts to clear bash_history & auth logs', color: 'bg-neutral-100 border-neutral-200 text-neutral-800' },
            ].map((m, i) => (
              <div key={i} className={`p-4 rounded-2xl border ${m.color} space-y-2`}>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider">{m.tactic}</span>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-white/90 shadow-xs">{m.count}</span>
                </div>
                <p className="font-bold text-sm text-neutral-900">{m.tech}</p>
                <p className="text-[11px] text-neutral-600">{m.desc}</p>
              </div>
            ))}
          </div>
        )}

        {/* Tab 3: Gemini AI Advisory */}
        {activeTabSection === 'aiInsights' && (
          <div className="p-5 rounded-2xl bg-neutral-900 text-white space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-[#f8c858]" />
                <h3 className="text-sm font-bold text-white">Gemini Autonomous Threat Triage &amp; Advisory</h3>
              </div>
              <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-[#f8c858] text-neutral-950">
                AI ACTIVE
              </span>
            </div>
            <div className="space-y-3 text-xs text-neutral-300 leading-relaxed">
              <p>
                <strong className="text-white">Threat Summary:</strong> Honeypot telemetry detected an active brute-force campaign originating from Tor exit relays and automated credential stuffers targeting SSH (Port 2222) and HTTP admin decoys.
              </p>
              <p>
                <strong className="text-white">Autonomous Mitigation:</strong> Attacker IP addresses have been automatically quarantined in the deception sandbox. Deceptive fake file responses and delayed execution have engaged the attackers for an average of 4.2 minutes per session.
              </p>
              <p>
                <strong className="text-white">Strategic Recommendation:</strong> Export captured IOC hashes to edge firewall and enable dynamic honey-token alerting for unauthorized database query attempts.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
