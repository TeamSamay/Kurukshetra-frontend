import React, { useState, useEffect } from 'react';
import {
  ArrowUpRight, Play, Pause, Clock, ChevronDown, ChevronUp,
  MoreVertical, Check, Laptop, Zap, MessageSquare, Edit3, Link2,
  Shield, Server, Database, Radio, Search, Lock, AlertTriangle,
  Terminal, Globe, Activity, Eye, FileText
} from 'lucide-react';
import { fetchDashboardSummary, containSession } from '../services/api';

export default function CommandCenter({ summaryData, loading: parentLoading, onSelectAttack, onContain }) {
  const [data, setData] = useState(summaryData || {});
  const [loading, setLoading] = useState(parentLoading ?? true);

  // Accordion state for Decoy Infrastructure
  const [openAccordion, setOpenAccordion] = useState({
    decoys: true,
    aiAdvisor: false,
    containment: false,
    feeds: false,
  });

  // Time tracker / SLA clock interactive state
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(155); // 02:35
  const [activeDayIndex, setActiveDayIndex] = useState(5); // Friday (index 5)
  const [activeTabSection, setActiveTabSection] = useState('liveFeed');
  const [searchFilter, setSearchFilter] = useState('');

  // SOC Incident Response Tasks Checklist
  const [tasks, setTasks] = useState([
    { id: 1, title: 'Extract Payload Hash & Memory Dump', time: 'Sep 13, 08:30', icon: Laptop, done: true },
    { id: 2, title: 'Cross-reference MITRE ATT&CK Matrix', time: 'Sep 13, 10:30', icon: Zap, done: true },
    { id: 3, title: 'Isolate Attacker Source IP', time: 'Sep 13, 13:00', icon: Shield, done: false },
    { id: 4, title: 'AI Advisor Deep Forensic Analysis', time: 'Sep 13, 14:45', icon: Terminal, done: false },
    { id: 5, title: 'Push IOCs to Perimeter Firewall', time: 'Sep 13, 16:30', icon: Link2, done: false },
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
    }, 15000);
    return () => clearInterval(t);
  }, []);

  // Timer tick for Containment Window SLA
  useEffect(() => {
    let interval = null;
    if (timerRunning) {
      interval = setInterval(() => {
        setTimerSeconds(s => s + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timerRunning]);

  const formatTimer = (totalSecs) => {
    const m = Math.floor(totalSecs / 60);
    const s = totalSecs % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const toggleTask = (id) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, done: !t.done } : t));
  };

  const completedCount = tasks.filter(t => t.done).length;

  const {
    total_sessions = 78,
    active_sessions = 2,
    contained_sessions = 56,
    total_iocs = 203,
    recent_attacks = [],
    top_mitre_techniques = [],
    service_distribution = { ssh: 45, http: 22, ftp: 11 }
  } = data;

  const daysOfWeek = [
    { label: 'S', height: '35%', active: false, tooltip: null },
    { label: 'M', height: '75%', active: false, tooltip: null },
    { label: 'T', height: '60%', active: false, tooltip: null },
    { label: 'W', height: '45%', active: false, tooltip: null },
    { label: 'T', height: '85%', active: false, tooltip: null },
    { label: 'F', height: '95%', active: true, tooltip: '5,230 req' },
    { label: 'S', height: '25%', active: false, tooltip: null },
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

  return (
    <div className="space-y-6 fade-in pb-16">
      {/* ── TOP HERO HEADER & METRIC RIBBON ───────────────────────────────── */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pt-2 pb-2">
        {/* Left: Greeting & Status Strip */}
        <div className="space-y-4">
          <h1 className="text-4xl sm:text-5xl font-normal tracking-tight text-neutral-900 font-sans">
            Welcome in, <span className="font-medium text-neutral-950">Commander</span>
          </h1>

          {/* Segmented Status Ribbon */}
          <div className="flex items-center gap-3 flex-wrap text-xs">
            {/* Active Threats */}
            <div className="flex items-center gap-2">
              <span className="text-neutral-500 font-medium text-[13px]">Active Attacks</span>
              <span className="bg-[#1e1e22] text-white px-3 py-1 rounded-full font-semibold text-xs shadow-xs">
                {active_sessions || 2} Live
              </span>
            </div>

            {/* Contained */}
            <div className="flex items-center gap-2">
              <span className="text-neutral-500 font-medium text-[13px]">Contained</span>
              <span className="bg-[#f8c858] text-neutral-900 px-3 py-1 rounded-full font-bold text-xs shadow-xs">
                15%
              </span>
            </div>

            {/* Sensor Health / Deception Uptime */}
            <div className="flex items-center gap-2">
              <span className="text-neutral-500 font-medium text-[13px]">Sensor Health</span>
              <div className="h-7 min-w-[140px] sm:min-w-[190px] rounded-full border border-neutral-300 bg-white/70 overflow-hidden relative flex items-center px-3 shadow-xs">
                <div className="absolute inset-0 striped-pattern w-[60%] border-r border-neutral-300/80 bg-neutral-100/50" />
                <span className="relative z-10 text-[11px] font-bold text-neutral-800">60%</span>
              </div>
            </div>

            {/* High Risk */}
            <div className="flex items-center gap-2">
              <span className="text-neutral-500 font-medium text-[13px]">High Risk</span>
              <span className="border border-neutral-400 bg-white/80 text-neutral-800 px-3 py-1 rounded-full font-semibold text-xs shadow-xs">
                10%
              </span>
            </div>
          </div>
        </div>

        {/* Right: Large Overview Stat Counters */}
        <div className="flex items-center gap-8 sm:gap-12 flex-shrink-0 self-start lg:self-end">
          {/* Stat 1: Live Sensors */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-white/60 border border-neutral-200/80 flex items-center justify-center text-neutral-700 shadow-xs">
              <Server className="w-4 h-4" />
            </div>
            <div>
              <div className="text-4xl sm:text-5xl font-light tracking-tight text-neutral-900 leading-none">
                {total_sessions || 78}
              </div>
              <div className="text-xs text-neutral-500 font-medium mt-0.5">Live Sensors</div>
            </div>
          </div>

          {/* Stat 2: Threats Blocked */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-white/60 border border-neutral-200/80 flex items-center justify-center text-neutral-700 shadow-xs">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <div className="text-4xl sm:text-5xl font-light tracking-tight text-neutral-900 leading-none">
                {contained_sessions || 56}
              </div>
              <div className="text-xs text-neutral-500 font-medium mt-0.5">Neutralized</div>
            </div>
          </div>

          {/* Stat 3: Captured IOCs */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-white/60 border border-neutral-200/80 flex items-center justify-center text-neutral-700 shadow-xs">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <div className="text-4xl sm:text-5xl font-light tracking-tight text-neutral-900 leading-none">
                {total_iocs || 203}
              </div>
              <div className="text-xs text-neutral-500 font-medium mt-0.5">Captured IOCs</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── 3-COLUMN MAIN GRID ────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* ── LEFT COLUMN (Decoy Infrastructure & SOC Threat Node) ────────── */}
        <div className="lg:col-span-4 xl:col-span-3 space-y-4">
          {/* Main Cyber Decoy Node Card */}
          <div className="crextio-card overflow-hidden relative group">
            <div className="h-64 sm:h-72 w-full relative overflow-hidden bg-neutral-900">
              <img
                src="/cyber-decoy-node.jpg"
                alt="SSH Decoy Node"
                className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = '/profile-avatar.jpg';
                }}
              />
              {/* Gradient overlay for bottom typography */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent pointer-events-none" />

              {/* Top Status Pill */}
              <div className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-white text-[11px] font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-400 blink" />
                <span>Active Honeypot Emulation</span>
              </div>

              {/* Bottom Card Overlay */}
              <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between text-white">
                <div>
                  <h3 className="text-lg font-bold tracking-tight text-white drop-shadow-sm">
                    SSH-Trap-01
                  </h3>
                  <p className="text-xs font-normal text-white/80">Port 2222 · Ubuntu 22.04 LTS</p>
                </div>
                <div className="px-3 py-1 rounded-full bg-[#f8c858] text-neutral-950 font-bold text-xs shadow-xs">
                  SEV 9.8
                </div>
              </div>
            </div>
          </div>

          {/* Accordion / Security Modules */}
          <div className="crextio-card p-4 space-y-2">
            {/* Accordion 1: Decoy Infrastructure (Expanded) */}
            <div className="border-b border-neutral-100 pb-2">
              <button
                onClick={() => setOpenAccordion(p => ({ ...p, decoys: !p.decoys }))}
                className="w-full flex items-center justify-between py-2 text-left text-sm font-medium text-neutral-800 hover:text-black transition cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <Server className="w-4 h-4 text-neutral-600" />
                  <span>Decoy Infrastructure</span>
                </div>
                <ChevronUp className={`w-4 h-4 text-neutral-500 transition-transform ${openAccordion.decoys ? '' : 'rotate-180'}`} />
              </button>
              {openAccordion.decoys && (
                <div className="py-2 space-y-2">
                  <div className="flex items-center justify-between p-2 rounded-xl bg-neutral-50 border border-neutral-200/60 text-xs">
                    <div className="flex items-center gap-2.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      <div>
                        <span className="font-bold text-neutral-800">SSH Honeypot</span>
                        <span className="block text-[10px] text-neutral-400">Port 2222 · Emulated Shell</span>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-700">ONLINE</span>
                  </div>

                  <div className="flex items-center justify-between p-2 rounded-xl bg-neutral-50 border border-neutral-200/60 text-xs">
                    <div className="flex items-center gap-2.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      <div>
                        <span className="font-bold text-neutral-800">HTTP Web-Decoy</span>
                        <span className="block text-[10px] text-neutral-400">Port 8080 · Fake Admin Login</span>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-700">ONLINE</span>
                  </div>
                </div>
              )}
            </div>

            {/* Accordion 2: AI Security Advisor */}
            <div className="border-b border-neutral-100 pb-2">
              <button
                onClick={() => setOpenAccordion(p => ({ ...p, aiAdvisor: !p.aiAdvisor }))}
                className="w-full flex items-center justify-between py-2 text-left text-sm font-medium text-neutral-800 hover:text-black transition cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-500" />
                  <span>AI Security Advisor</span>
                </div>
                <ChevronDown className={`w-4 h-4 text-neutral-500 transition-transform ${openAccordion.aiAdvisor ? 'rotate-180' : ''}`} />
              </button>
              {openAccordion.aiAdvisor && (
                <div className="py-2 text-xs text-neutral-600 space-y-1.5 bg-neutral-50 p-2.5 rounded-xl border border-neutral-200/60">
                  <p className="font-semibold text-neutral-800">Gemini Neural Triage:</p>
                  <p className="text-[11px] text-neutral-500 leading-relaxed">
                    SSH brute-force activity observed from ASN 45102. Recommendation: enforce dynamic decoy tar-pitting and auto-isolate IP.
                  </p>
                </div>
              )}
            </div>

            {/* Accordion 3: Active Containment Rules */}
            <div className="border-b border-neutral-100 pb-2">
              <button
                onClick={() => setOpenAccordion(p => ({ ...p, containment: !p.containment }))}
                className="w-full flex items-center justify-between py-2 text-left text-sm font-medium text-neutral-800 hover:text-black transition cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-rose-500" />
                  <span>Active Containment Rules</span>
                </div>
                <ChevronDown className={`w-4 h-4 text-neutral-500 transition-transform ${openAccordion.containment ? 'rotate-180' : ''}`} />
              </button>
              {openAccordion.containment && (
                <div className="py-2 text-xs text-neutral-500 space-y-1">
                  <div className="flex justify-between"><span>Auto-Isolation Policy</span><span className="font-semibold text-emerald-600">Enabled</span></div>
                  <div className="flex justify-between"><span>Sandbox Jail</span><span className="font-semibold text-neutral-800">Strict iptables</span></div>
                </div>
              )}
            </div>

            {/* Accordion 4: Threat Intelligence Feeds */}
            <div>
              <button
                onClick={() => setOpenAccordion(p => ({ ...p, feeds: !p.feeds }))}
                className="w-full flex items-center justify-between py-2 text-left text-sm font-medium text-neutral-800 hover:text-black transition cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-blue-500" />
                  <span>Threat Intel &amp; MITRE Feeds</span>
                </div>
                <ChevronDown className={`w-4 h-4 text-neutral-500 transition-transform ${openAccordion.feeds ? 'rotate-180' : ''}`} />
              </button>
              {openAccordion.feeds && (
                <div className="py-2 text-xs text-neutral-500 space-y-1">
                  <div className="flex justify-between"><span>MITRE ATT&CK Matrix</span><span className="font-semibold text-neutral-800">v14.1 Synchronized</span></div>
                  <div className="flex justify-between"><span>Global Honeynet Feed</span><span className="font-semibold text-neutral-800">12 ms latency</span></div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── MIDDLE COLUMN (Threat Velocity, SLA Clock, Attack Timeline) ─── */}
        <div className="lg:col-span-8 xl:col-span-6 space-y-6">

          {/* Top Row: Threat Velocity + Containment SLA Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">

            {/* CARD 1: Threat Velocity Chart Card */}
            <div className="crextio-card p-6 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold text-neutral-900">Threat Velocity</h3>
                <button className="btn-circle-action" title="Telemetry details">
                  <ArrowUpRight className="w-4 h-4" />
                </button>
              </div>

              {/* Big Stat */}
              <div className="my-4">
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-light text-neutral-900 tracking-tight">6.1k</span>
                  <span className="text-xs text-neutral-500 font-medium">
                    Telemetry events<br />this week
                  </span>
                </div>
              </div>

              {/* Custom Capsule Bar Chart */}
              <div className="relative pt-6 pb-1">
                {/* Dotted horizontal guideline */}
                <div className="absolute top-1/2 left-0 right-0 border-t border-dotted border-neutral-300 pointer-events-none" />

                <div className="flex items-end justify-between gap-2 h-28">
                  {daysOfWeek.map((day, idx) => (
                    <div
                      key={idx}
                      className="flex-1 flex flex-col items-center gap-2 cursor-pointer group"
                      onClick={() => setActiveDayIndex(idx)}
                    >
                      {/* Floating Tooltip for Active Day */}
                      {idx === activeDayIndex && (
                        <div className="bg-[#f8c858] text-neutral-900 font-bold text-[10px] px-2 py-0.5 rounded-full shadow-xs whitespace-nowrap mb-1">
                          {day.tooltip || '5,230 req'}
                        </div>
                      )}

                      {/* Capsule Bar */}
                      <div className="w-2.5 sm:w-3 bg-neutral-100 rounded-full h-24 flex items-end overflow-hidden">
                        <div
                          className={`w-full rounded-full transition-all duration-500 ${
                            idx === activeDayIndex
                              ? 'bg-[#f8c858]'
                              : 'bg-[#1e1e22] group-hover:bg-neutral-700'
                          }`}
                          style={{ height: day.height }}
                        />
                      </div>

                      {/* Day Label */}
                      <span className={`text-[11px] font-semibold ${
                        idx === activeDayIndex ? 'text-neutral-900 font-bold' : 'text-neutral-400'
                      }`}>
                        {day.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* CARD 2: Containment SLA Clock Card */}
            <div className="crextio-card p-6 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold text-neutral-900">Containment SLA</h3>
                <button className="btn-circle-action" title="SLA Details">
                  <ArrowUpRight className="w-4 h-4" />
                </button>
              </div>

              {/* Circular Gauge Center */}
              <div className="relative w-36 h-36 mx-auto my-2 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  {/* Outer tick marks circle */}
                  <circle
                    cx="50"
                    cy="50"
                    r="44"
                    fill="none"
                    stroke="#e5e5dc"
                    strokeWidth="3"
                    strokeDasharray="2 4"
                  />
                  {/* Background Track Arc */}
                  <circle
                    cx="50"
                    cy="50"
                    r="38"
                    fill="none"
                    stroke="#f3f3ee"
                    strokeWidth="7"
                  />
                  {/* Active Yellow Progress Arc */}
                  <circle
                    cx="50"
                    cy="50"
                    r="38"
                    fill="none"
                    stroke="#f8c858"
                    strokeWidth="7"
                    strokeLinecap="round"
                    strokeDasharray="238.76"
                    strokeDashoffset={238.76 * (1 - 0.72)}
                    className="transition-all duration-500"
                  />
                </svg>

                {/* Inside Center Info */}
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
                  <span className="text-2xl font-bold tracking-tight text-neutral-900">
                    {formatTimer(timerSeconds)}
                  </span>
                  <span className="text-[10px] text-neutral-400 font-medium">Active Defense</span>
                </div>
              </div>

              {/* Bottom Control Buttons */}
              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  onClick={() => setTimerRunning(true)}
                  className={`w-9 h-9 rounded-full flex items-center justify-center border border-neutral-200 transition shadow-xs cursor-pointer ${
                    timerRunning ? 'bg-neutral-100 text-neutral-400' : 'bg-white hover:bg-neutral-50 text-neutral-800'
                  }`}
                  title="Start Monitoring"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                </button>
                <button
                  onClick={() => setTimerRunning(false)}
                  className={`w-9 h-9 rounded-full flex items-center justify-center border border-neutral-200 transition shadow-xs cursor-pointer ${
                    !timerRunning ? 'bg-neutral-100 text-neutral-400' : 'bg-white hover:bg-neutral-50 text-neutral-800'
                  }`}
                  title="Pause"
                >
                  <Pause className="w-3.5 h-3.5 fill-current" />
                </button>
                <button
                  onClick={() => setTimerSeconds(0)}
                  className="w-9 h-9 rounded-full flex items-center justify-center bg-[#1e1e22] text-white hover:bg-black transition shadow-xs cursor-pointer"
                  title="Reset SLA Window"
                >
                  <Clock className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* CARD 3: Bottom Attack Telemetry Timeline */}
          <div className="crextio-card p-6">
            {/* Calendar Header with Navigation */}
            <div className="flex items-center justify-between mb-5">
              <button className="px-3.5 py-1.5 rounded-full border border-neutral-200/90 text-xs font-medium text-neutral-700 hover:bg-neutral-50 cursor-pointer">
                August
              </button>
              <h3 className="text-base font-semibold text-neutral-900">
                September 2024 Attack Telemetry
              </h3>
              <button className="px-3.5 py-1.5 rounded-full border border-neutral-200/90 text-xs font-medium text-neutral-700 hover:bg-neutral-50 cursor-pointer">
                October
              </button>
            </div>

            {/* Days Header */}
            <div className="grid grid-cols-6 text-center text-xs pb-3 border-b border-neutral-100">
              <div><span className="text-neutral-400 block text-[11px]">Mon</span><span className="font-semibold text-neutral-800">22</span></div>
              <div><span className="text-neutral-400 block text-[11px]">Tue</span><span className="font-semibold text-neutral-800">23</span></div>
              <div><span className="text-neutral-400 block text-[11px]">Wed</span><span className="font-semibold text-neutral-800">24</span></div>
              <div><span className="text-neutral-400 block text-[11px]">Thu</span><span className="font-semibold text-neutral-800">25</span></div>
              <div><span className="text-neutral-400 block text-[11px]">Fri</span><span className="font-semibold text-neutral-800">26</span></div>
              <div><span className="text-neutral-400 block text-[11px]">Sat</span><span className="font-semibold text-neutral-800">27</span></div>
            </div>

            {/* Timeline Body with Vertical Dotted Guides */}
            <div className="relative pt-4 space-y-5 text-xs text-neutral-400">
              {/* Vertical Dotted Column Lines */}
              <div className="absolute inset-0 grid grid-cols-6 pointer-events-none">
                {[0, 1, 2, 3, 4, 5].map(i => (
                  <div key={i} className="border-r border-dotted border-neutral-200/80 h-full" />
                ))}
              </div>

              {/* Time Rows */}
              <div className="relative flex items-center">
                <span className="w-16 font-mono text-[11px] text-neutral-500">8:00 am</span>

                {/* Floating Event 1: Dark Card (SSH Brute Force Infiltration) */}
                <div className="absolute left-[28%] sm:left-[32%] z-10 bg-[#1e1e22] text-white px-4 py-2.5 rounded-2xl shadow-lg border border-neutral-700 max-w-[260px] flex items-center gap-3">
                  <div className="min-w-0">
                    <div className="text-xs font-semibold truncate text-white">SSH Brute-Force Probe</div>
                    <div className="text-[10px] text-neutral-300 truncate font-mono">185.220.101.5 · Rotated Keys</div>
                  </div>
                  {/* Attacker flag avatars */}
                  <div className="flex -space-x-2 flex-shrink-0">
                    <div className="w-5 h-5 rounded-full ring-2 ring-[#1e1e22] bg-rose-500 text-white overflow-hidden text-[9px] font-bold flex items-center justify-center">RU</div>
                    <div className="w-5 h-5 rounded-full ring-2 ring-[#1e1e22] bg-amber-400 text-black overflow-hidden text-[9px] font-bold flex items-center justify-center">T1</div>
                  </div>
                </div>
              </div>

              <div className="relative flex items-center">
                <span className="w-16 font-mono text-[11px] text-neutral-500">9:00 am</span>
              </div>

              <div className="relative flex items-center">
                <span className="w-16 font-mono text-[11px] text-neutral-500">10:00 am</span>

                {/* Floating Event 2: White Card (Web-Decoy SQL Injection) */}
                <div className="absolute left-[50%] sm:left-[56%] z-10 bg-white text-neutral-900 px-4 py-2.5 rounded-2xl shadow-md border border-neutral-200 max-w-[260px] flex items-center gap-3">
                  <div className="min-w-0">
                    <div className="text-xs font-semibold truncate text-neutral-900">Web SQLi Payload Probe</div>
                    <div className="text-[10px] text-neutral-500 truncate font-mono">45.142.120.9 · Captured Hash</div>
                  </div>
                  {/* Avatars */}
                  <div className="flex -space-x-2 flex-shrink-0">
                    <div className="w-5 h-5 rounded-full ring-2 ring-white bg-blue-600 text-white overflow-hidden text-[9px] font-bold flex items-center justify-center">IOC</div>
                    <div className="w-5 h-5 rounded-full ring-2 ring-white bg-emerald-500 text-white overflow-hidden text-[9px] font-bold flex items-center justify-center">✓</div>
                  </div>
                </div>
              </div>

              <div className="relative flex items-center">
                <span className="w-16 font-mono text-[11px] text-neutral-500">11:00 am</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── RIGHT COLUMN (SOC Hardening & Floating Response Tasks) ──────── */}
        <div className="lg:col-span-12 xl:col-span-3 space-y-6">

          {/* SOC Hardening Progress Widget */}
          <div className="crextio-card p-6">
            <div className="flex items-baseline justify-between mb-4">
              <h3 className="text-base font-semibold text-neutral-900">SOC Hardening</h3>
              <span className="text-3xl font-light text-neutral-900">88%</span>
            </div>

            {/* Segmented Step Indicators */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                {/* 30% Triage Yellow Pill */}
                <div className="bg-[#f8c858] text-neutral-900 px-3 py-1.5 rounded-full text-xs font-bold flex items-center justify-between min-w-[85px] shadow-xs">
                  <span>30%</span>
                  <span className="text-[10px] font-semibold text-neutral-800 ml-1">Triage</span>
                </div>

                {/* 25% Isolated Dark Pill */}
                <div className="bg-[#1e1e22] text-white px-3 py-1.5 rounded-full text-xs font-semibold shadow-xs">
                  25%
                </div>

                {/* 0% Pending Gray Pill */}
                <div className="bg-neutral-400 text-white px-3 py-1.5 rounded-full text-xs font-semibold shadow-xs">
                  0%
                </div>
              </div>
            </div>
          </div>

          {/* Floating Dark Card: "SOC Response Tasks 2/8" */}
          <div className="crextio-card-dark p-6 space-y-5">
            {/* Header */}
            <div className="flex items-baseline justify-between">
              <h3 className="text-base font-semibold text-white">SOC Response Tasks</h3>
              <span className="text-2xl font-light tracking-tight text-white/90">
                {completedCount}/8
              </span>
            </div>

            {/* Checklist Items */}
            <div className="space-y-3.5">
              {tasks.map((task) => {
                const Icon = task.icon;
                return (
                  <div
                    key={task.id}
                    onClick={() => toggleTask(task.id)}
                    className="flex items-center justify-between gap-3 p-2.5 rounded-2xl hover:bg-white/5 transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Icon circle */}
                      <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-neutral-300 flex-shrink-0 group-hover:bg-white/20 transition">
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0">
                        <p className={`text-xs font-medium truncate ${task.done ? 'text-white' : 'text-neutral-300'}`}>
                          {task.title}
                        </p>
                        <p className="text-[10px] text-neutral-400 truncate">
                          {task.time}
                        </p>
                      </div>
                    </div>

                    {/* Checkmark Status Indicator */}
                    <div className="flex-shrink-0">
                      {task.done ? (
                        <div className="w-5 h-5 rounded-full bg-[#f8c858] flex items-center justify-center text-neutral-950 shadow-xs">
                          <Check className="w-3 h-3 stroke-[3]" />
                        </div>
                      ) : (
                        <div className="w-5 h-5 rounded-full border border-neutral-600 group-hover:border-neutral-400 transition" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

      </div>

      {/* ── UNIFIED FULL-PAGE LIVE SOC SECTIONS ───────────────────────────── */}
      <div className="pt-6 space-y-6">
        <div className="crextio-card p-6 space-y-6">
          {/* Section Header & Sub-Navigation Pills */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-100">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-neutral-900">
                Live Cyber Deception Telemetry &amp; Intelligence
              </h2>
              <p className="text-xs text-neutral-500 mt-0.5">
                Unified real-time event correlation, threat containment, and MITRE ATT&amp;CK analysis
              </p>
            </div>

            {/* Sub-Pills */}
            <div className="flex items-center gap-1.5 p-1 rounded-full bg-neutral-100/80 border border-neutral-200">
              {[
                { id: 'liveFeed', label: 'Live Infiltrations', icon: Activity },
                { id: 'mitreMatrix', label: 'MITRE Matrix', icon: Shield },
                { id: 'serviceSurface', label: 'Decoy Distribution', icon: Globe }
              ].map(tab => {
                const Icon = tab.icon;
                const isActive = activeTabSection === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTabSection(tab.id)}
                    className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer ${
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

          {/* Section View 1: Live Infiltrations Feed */}
          {activeTabSection === 'liveFeed' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2 flex-1 min-w-64">
                  <Search className="w-4 h-4 text-neutral-400" />
                  <input
                    value={searchFilter}
                    onChange={e => setSearchFilter(e.target.value)}
                    placeholder="Search by Attacker IP, Target Decoy, Session ID..."
                    className="input-crextio py-2 text-xs"
                  />
                </div>
                <div className="flex items-center gap-2 text-xs text-neutral-500 font-medium">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 blink" />
                  <span>Real-Time Ingestion Active</span>
                </div>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-neutral-100">
                <table className="w-full text-left text-xs">
                  <thead className="bg-neutral-50 border-b border-neutral-100 text-neutral-500 font-semibold">
                    <tr>
                      <th className="px-4 py-3">Attacker IP</th>
                      <th className="px-4 py-3">Decoy Service</th>
                      <th className="px-4 py-3">Risk Severity</th>
                      <th className="px-4 py-3">Session Status</th>
                      <th className="px-4 py-3">Last Activity</th>
                      <th className="px-4 py-3 text-right">Containment Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {filteredAttacks.length > 0 ? (
                      filteredAttacks.map((atk, idx) => (
                        <tr key={atk.session_id || idx} className="hover:bg-neutral-50/80 transition">
                          <td className="px-4 py-3 font-mono font-bold text-neutral-900">
                            {atk.source_ip || '185.220.101.5'}
                          </td>
                          <td className="px-4 py-3">
                            <span className="px-2.5 py-0.5 rounded-full bg-neutral-100 text-neutral-800 font-semibold text-[10px] uppercase">
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
                            {atk.status !== 'CONTAINED' ? (
                              <button
                                onClick={() => onContain && onContain(atk.session_id)}
                                className="px-3 py-1 rounded-full bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 text-xs font-semibold shadow-xs transition cursor-pointer"
                              >
                                Isolate &amp; Contain
                              </button>
                            ) : (
                              <span className="text-[11px] font-semibold text-emerald-600">✓ Contained</span>
                            )}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-neutral-400">
                          <Eye className="w-8 h-8 mx-auto mb-2 text-neutral-300" />
                          <p className="font-medium text-neutral-700">No active infiltrations matching search filter</p>
                          <p className="text-[11px] mt-1">Use "Simulate Attack" in the top bar to trigger a live decoy event.</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Section View 2: MITRE ATT&CK Matrix */}
          {activeTabSection === 'mitreMatrix' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { tactic: 'Initial Access', tech: 'T1190 Exploit Public App', count: '48 Probes', color: 'bg-rose-50 border-rose-100 text-rose-700' },
                { tactic: 'Credential Access', tech: 'T1110 Brute Force', count: '132 Attempts', color: 'bg-amber-50 border-amber-100 text-amber-800' },
                { tactic: 'Execution', tech: 'T1059 Command Injection', count: '29 Events', color: 'bg-purple-50 border-purple-100 text-purple-700' },
                { tactic: 'Discovery', tech: 'T1082 System Info Discovery', count: '19 Queries', color: 'bg-blue-50 border-blue-100 text-blue-700' },
                { tactic: 'Persistence', tech: 'T1078 Valid Accounts', count: '14 Logins', color: 'bg-emerald-50 border-emerald-100 text-emerald-700' },
                { tactic: 'Defense Evasion', tech: 'T1070 Indicator Removal', count: '8 Attempts', color: 'bg-neutral-100 border-neutral-200 text-neutral-800' },
              ].map((m, i) => (
                <div key={i} className={`p-4 rounded-2xl border ${m.color} space-y-2`}>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider">{m.tactic}</span>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-white/80 shadow-xs">{m.count}</span>
                  </div>
                  <p className="font-semibold text-sm text-neutral-900">{m.tech}</p>
                  <p className="text-[11px] text-neutral-500">Trapped by decoy sensors and mapped to MITRE enterprise matrix</p>
                </div>
              ))}
            </div>
          )}

          {/* Section View 3: Decoy Service Distribution */}
          {activeTabSection === 'serviceSurface' && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-5 rounded-2xl bg-neutral-50 border border-neutral-200/60 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-neutral-800">SSH Decoy Cluster</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                </div>
                <p className="text-2xl font-bold text-neutral-900">45 Sessions</p>
                <div className="w-full bg-neutral-200 h-2 rounded-full overflow-hidden">
                  <div className="bg-[#f8c858] h-full" style={{ width: '65%' }} />
                </div>
                <p className="text-[11px] text-neutral-400">Emulated OpenSSH 8.9p1 on port 2222</p>
              </div>

              <div className="p-5 rounded-2xl bg-neutral-50 border border-neutral-200/60 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-neutral-800">HTTP Web Trap</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                </div>
                <p className="text-2xl font-bold text-neutral-900">22 Sessions</p>
                <div className="w-full bg-neutral-200 h-2 rounded-full overflow-hidden">
                  <div className="bg-[#1e1e22] h-full" style={{ width: '40%' }} />
                </div>
                <p className="text-[11px] text-neutral-400">Fake Admin Portal &amp; API Endpoint</p>
              </div>

              <div className="p-5 rounded-2xl bg-neutral-50 border border-neutral-200/60 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-neutral-800">FTP Honeypot</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                </div>
                <p className="text-2xl font-bold text-neutral-900">11 Sessions</p>
                <div className="w-full bg-neutral-200 h-2 rounded-full overflow-hidden">
                  <div className="bg-neutral-400 h-full" style={{ width: '20%' }} />
                </div>
                <p className="text-[11px] text-neutral-400">Emulated VSFTPD 3.0.3 Trap</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
