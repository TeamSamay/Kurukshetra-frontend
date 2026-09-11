import React, { useState } from 'react';
import {
  Settings, Bell, Search, Play, Activity, Shield,
  Menu, X, Radio, ChevronRight, Check
} from 'lucide-react';
import { runAttackSimulation } from '../services/api';

export const NAV_ITEMS = [
  { id: 'command',       label: 'Dashboard',   desc: 'Overview & Operations' },
  { id: 'live',          label: 'Live Attacks', desc: 'Real-time Telemetry' },
  { id: 'investigation', label: 'Investigation', desc: 'Session Deep Dive' },
  { id: 'dna',           label: 'Attacker DNA',  desc: 'Threat Profiles' },
  { id: 'ioc',           label: 'IOC Intelligence', desc: 'Captured Indicators' },
  { id: 'mitre',         label: 'MITRE ATT&CK',  desc: 'TTP Matrix' },
  { id: 'report',        label: 'Reports',       desc: 'Threat Dossiers' },
];

export default function Layout({
  activeTab,
  setActiveTab,
  wsConnected,
  activeAttackCount,
  children
}) {
  const [simulating, setSimulating] = useState(false);
  const [simMsg, setSimMsg] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState(3);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  async function handleSimulate() {
    if (simulating) return;
    setSimulating(true);
    setSimMsg('');
    try {
      await runAttackSimulation();
      setSimMsg('✓ Attack injected');
    } catch {
      setSimMsg('⚡ Simulated');
    } finally {
      setTimeout(() => {
        setSimulating(false);
        setSimMsg('');
      }, 3000);
    }
  }

  return (
    <div className="min-h-screen w-full flex flex-col selection:bg-[#f8c858] selection:text-neutral-900">
      {/* ── TOP PILL NAVIGATION BAR ──────────────────────────────────────── */}
      <header className="w-full px-4 sm:px-8 pt-5 pb-3 flex items-center justify-between gap-4 max-w-[1700px] mx-auto">
        {/* Left: Brand Pill */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setActiveTab('command')}
            className="px-6 py-2.5 rounded-full border border-neutral-300/80 bg-white/70 backdrop-blur-md shadow-sm hover:border-neutral-400 transition-all flex items-center gap-2.5 cursor-pointer group"
          >
            <span className="font-sans text-xl font-bold tracking-tight text-neutral-900 group-hover:text-black">
              Crextio
            </span>
            <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full bg-[#f8c858] text-neutral-900">
              SOC
            </span>
          </button>

          {/* Mobile menu toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 rounded-full border border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Center: Desktop Nav Pills */}
        <nav className="hidden lg:flex items-center gap-1.5 p-1.5 rounded-full bg-white/60 backdrop-blur-md border border-neutral-200/80 shadow-sm">
          {NAV_ITEMS.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`relative cursor-pointer transition-all duration-200 ${
                  isActive ? 'nav-pill-active' : 'nav-pill-inactive'
                }`}
              >
                <span>{item.label}</span>
                {item.id === 'live' && activeAttackCount > 0 && (
                  <span
                    className={`ml-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      isActive ? 'bg-[#f8c858] text-neutral-900' : 'bg-rose-500 text-white'
                    }`}
                  >
                    {activeAttackCount}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Right: Quick Controls & User Avatar */}
        <div className="flex items-center gap-2.5">
          {/* Attack Simulator Trigger Button */}
          <button
            onClick={handleSimulate}
            disabled={simulating}
            className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-full border border-neutral-200/80 bg-white/80 hover:bg-white text-xs font-semibold text-neutral-800 shadow-sm transition-all cursor-pointer hover:border-neutral-300"
            title="Simulate a live attack to observe telemetry"
          >
            {simulating ? (
              <>
                <Activity className="w-3.5 h-3.5 animate-spin text-amber-600" />
                <span>Injecting…</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 text-neutral-900 fill-neutral-900" />
                <span>Simulate Attack</span>
              </>
            )}
          </button>

          {/* Settings Pill */}
          <button
            onClick={() => setShowSettingsModal(!showSettingsModal)}
            className="px-4 py-2 rounded-full border border-neutral-200/80 bg-white/80 backdrop-blur-md hover:bg-white flex items-center gap-2 text-xs font-medium text-neutral-700 shadow-sm transition cursor-pointer"
          >
            <Settings className="w-3.5 h-3.5 text-neutral-600" />
            <span className="hidden md:inline">Setting</span>
          </button>

          {/* Notifications Button */}
          <button
            onClick={() => setNotifications(0)}
            className="w-10 h-10 rounded-full border border-neutral-200/80 bg-white/80 backdrop-blur-md hover:bg-white flex items-center justify-center relative text-neutral-700 shadow-sm transition cursor-pointer"
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
            {notifications > 0 && (
              <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#f8c858] ring-2 ring-white" />
            )}
          </button>

          {/* User Profile Avatar */}
          <div className="w-10 h-10 rounded-full border border-neutral-300/80 bg-white overflow-hidden shadow-sm cursor-pointer hover:scale-105 transition flex-shrink-0">
            <img
              src="/profile-avatar.jpg"
              alt="User Avatar"
              className="w-full h-full object-cover object-top"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80';
              }}
            />
          </div>
        </div>
      </header>

      {/* ── Mobile Navigation Drawer ────────────────────────────────────── */}
      {mobileMenuOpen && (
        <div className="lg:hidden px-4 py-3 bg-white border-b border-neutral-200 space-y-1.5 shadow-md">
          {NAV_ITEMS.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center justify-between px-4 py-2.5 rounded-2xl text-sm font-medium transition ${
                  isActive ? 'bg-[#1e1e22] text-white' : 'text-neutral-700 hover:bg-neutral-100'
                }`}
              >
                <span>{item.label}</span>
                {isActive && <Check className="w-4 h-4" />}
              </button>
            );
          })}
        </div>
      )}

      {/* ── Connection Banner for live feedback ──────────────────────────── */}
      {simMsg && (
        <div className="max-w-[1700px] mx-auto px-4 sm:px-8 w-full">
          <div className="bg-[#fef9c3] border border-[#fde047] text-neutral-900 text-xs px-4 py-2 rounded-full font-medium flex items-center justify-between shadow-sm">
            <span>⚡ {simMsg}</span>
            <span className="text-[10px] text-neutral-600">Deception Telemetry Synchronized</span>
          </div>
        </div>
      )}

      {/* ── MAIN CONTENT CONTAINER ───────────────────────────────────────── */}
      <main className="flex-1 w-full max-w-[1700px] mx-auto px-4 sm:px-8 py-4 sm:py-6 overflow-x-hidden">
        {children}
      </main>
    </div>
  );
}


