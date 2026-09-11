import React, { useState, useEffect } from 'react';
import {
  Shield, Zap, Search, Fingerprint, Share2, FileText, Crosshair,
  Wifi, WifiOff, Bell, ChevronRight, Play, Menu, X, Activity,
  Clock, Radio
} from 'lucide-react';
import { runAttackSimulation } from '../services/api';

const TABS = [
  { id: 'command',       label: 'Command Center',  icon: Crosshair,   desc: 'Overview' },
  { id: 'live',          label: 'Live Attacks',     icon: Zap,         desc: 'Real-time' },
  { id: 'investigation', label: 'Investigation',    icon: Search,      desc: 'Session detail' },
  { id: 'dna',           label: 'Attacker DNA',     icon: Fingerprint, desc: 'Profiles' },
  { id: 'ioc',           label: 'IOC Intelligence', icon: Share2,      desc: 'Indicators' },
  { id: 'mitre',         label: 'MITRE ATT&CK',     icon: Shield,      desc: 'Tactics' },
  { id: 'report',        label: 'Threat Reports',   icon: FileText,    desc: 'Intelligence' },
];

function LiveClock() {
  const [time, setTime] = useState('');
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const dateStr = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
      const timeStr = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
      setTime(`${dateStr} · ${timeStr}`);
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, []);
  return <span className="font-mono text-[11px] font-bold text-slate-700 tabular-nums">{time}</span>;
}

export default function Layout({ activeTab, setActiveTab, wsConnected, activeAttackCount, children }) {
  const [simulating, setSimulating]   = useState(false);
  const [simMsg, setSimMsg]           = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifications, setNotifications] = useState(3);

  async function handleSimulate() {
    if (simulating) return;
    setSimulating(true);
    setSimMsg('');
    try {
      await runAttackSimulation();
      setSimMsg('✓ Attack event injected!');
    } catch {
      setSimMsg('⚡ Simulation sent');
    } finally {
      setTimeout(() => { setSimulating(false); setSimMsg(''); }, 3000);
    }
  }

  const activeTabData = TABS.find(t => t.id === activeTab) || TABS[0];
  const ActiveIcon = activeTabData.icon;

  const Sidebar = () => (
    <aside className="w-64 flex-shrink-0 flex flex-col h-full bg-white border-r border-slate-200/80 shadow-[2px_0_12px_rgba(0,0,0,0.02)]">

      {/* Brand */}
      <div className="px-5 pt-6 pb-5 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-gradient-to-br from-blue-600 to-indigo-600 shadow-md shadow-blue-500/20">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-black text-slate-900 text-sm tracking-tight leading-tight">KURUKSHETRA</h1>
            <p className="text-[10px] font-extrabold tracking-widest text-blue-600">
              SOC · DECEPTION PLATFORM
            </p>
          </div>
        </div>

        {/* Divider */}
        <div className="h-[1px] bg-slate-100 mt-4" />
      </div>

      {/* WS Status Bar */}
      <div className="px-4 mb-2">
        <div className={`flex items-center gap-2 px-3 py-2 rounded-xl text-[11px] font-semibold ${
          wsConnected
            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
            : 'bg-rose-50 text-rose-700 border border-rose-200/60'
        }`}>
          {wsConnected ? (
            <><span className="w-2 h-2 rounded-full bg-emerald-500 blink" />
              <Wifi className="w-3.5 h-3.5 text-emerald-600" />
              <span>LIVE FEED CONNECTED</span></>
          ) : (
            <><span className="w-2 h-2 rounded-full bg-rose-500" />
              <WifiOff className="w-3.5 h-3.5 text-rose-500" />
              <span>RECONNECTING…</span></>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-3 space-y-1 overflow-y-auto">
        <p className="text-[10px] font-bold tracking-widest px-3 pb-2 pt-1 text-slate-400">
          NAVIGATION
        </p>
        {TABS.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); setSidebarOpen(false); }}
              className={`nav-item w-full text-left ${isActive ? 'active' : ''}`}
            >
              <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
              <div className="flex-1 min-w-0">
                <span className="block text-sm font-semibold leading-tight truncate">{tab.label}</span>
                <span className="block text-[10px] opacity-70 leading-tight">{tab.desc}</span>
              </div>
              {tab.id === 'live' && activeAttackCount > 0 && (
                <span className="ml-auto flex-shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-600">
                  {activeAttackCount}
                </span>
              )}
              {isActive && <ChevronRight className="w-3.5 h-3.5 flex-shrink-0 text-blue-600" />}
            </button>
          );
        })}
      </nav>

      {/* One-Click Simulator */}
      <div className="px-4 py-4 flex-shrink-0 border-t border-slate-100">
        <p className="text-[10px] font-bold tracking-widest text-slate-400 mb-2.5">
          ATTACK SIMULATOR
        </p>
        <button
          onClick={handleSimulate}
          disabled={simulating}
          className={`w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-bold transition-all duration-200 ${
            simulating
              ? 'bg-amber-50 text-amber-700 border border-amber-200'
              : 'bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 shadow-sm'
          }`}
        >
          {simulating ? (
            <><Activity className="w-4 h-4 animate-spin text-amber-600" /><span>Injecting…</span></>
          ) : (
            <><Play className="w-4 h-4 text-rose-600" /><span>Simulate Attack</span></>
          )}
        </button>
        {simMsg && (
          <p className="text-center text-[11px] font-semibold mt-2 text-emerald-600">
            {simMsg}
          </p>
        )}
        <p className="text-[10px] text-center mt-2 text-slate-400">
          Sends live event to Render backend
        </p>
      </div>

      {/* Bottom info */}
      <div className="px-4 py-3 flex-shrink-0 border-t border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-xs font-bold text-white flex-shrink-0 shadow-sm">
            S
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-slate-800 truncate">SOC Analyst</p>
            <p className="text-[10px] text-slate-400 truncate">Kurukshetra Platform</p>
          </div>
          <div className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" />
        </div>
      </div>
    </aside>
  );

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#f3f5fa]">

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-xs lg:hidden"
          onClick={() => setSidebarOpen(false)} />
      )}

      {/* Desktop Sidebar */}
      <div className="hidden lg:flex h-full flex-shrink-0">
        <Sidebar />
      </div>

      {/* Mobile Sidebar drawer */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 lg:hidden transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <Sidebar />
      </div>

      {/* ── MAIN CONTENT ──────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Top Header */}
        <header className="flex-shrink-0 px-6 py-4 flex items-center justify-between bg-white border-b border-slate-200/80 shadow-[0_2px_10px_rgba(0,0,0,0.02)]">

          {/* Left: mobile menu + page title */}
          <div className="flex items-center gap-4">
            <button className="lg:hidden p-2 rounded-xl btn-ghost" onClick={() => setSidebarOpen(!sidebarOpen)}>
              {sidebarOpen ? <X className="w-5 h-5 text-slate-700" /> : <Menu className="w-5 h-5 text-slate-700" />}
            </button>

            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-blue-50 border border-blue-100">
                <ActiveIcon className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <h2 className="text-base font-black text-slate-900 tracking-tight leading-tight">{activeTabData.label}</h2>
                <p className="text-[11px] font-medium text-slate-500">
                  Adaptive Cyber Deception &amp; Threat Intelligence Platform
                </p>
              </div>
            </div>
          </div>

          {/* Right: status items */}
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap justify-end">
            {/* Live Clock (Always Visible) */}
            <div className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200/80 shadow-xs">
              <Clock className="w-3.5 h-3.5 text-blue-600 animate-pulse" />
              <LiveClock />
            </div>

            {/* Backend status */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 blink" />
              BACKEND LIVE
            </div>

            {/* Notifications */}
            <button className="relative p-2 rounded-xl btn-ghost" onClick={() => setNotifications(0)}>
              <Bell className="w-4 h-4 text-slate-600" />
              {notifications > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full text-[9px] font-black flex items-center justify-center bg-rose-500 text-white">
                  {notifications}
                </span>
              )}
            </button>

            {/* WS badge */}
            <div className={`flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-xl text-[10px] sm:text-[11px] font-bold ${
              wsConnected
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                : 'bg-rose-50 text-rose-600 border border-rose-200/60'
            }`}>
              <Radio className="w-3 h-3" />
              <span>{wsConnected ? 'WS LIVE' : 'WS RECONNECT'}</span>
            </div>
          </div>
        </header>

        {/* Content area */}
        <main className="flex-1 overflow-y-auto relative">
          <div className="cyber-grid absolute inset-0 pointer-events-none opacity-20" />
          <div className="relative z-10 p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

