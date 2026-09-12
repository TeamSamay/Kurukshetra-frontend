import React, { useState, useRef, useEffect } from 'react';
import {
  Settings, Bell, Search, Play, Activity, Shield,
  Menu, X, Radio, ChevronRight, Check, User, Sliders,
  Volume2, VolumeX, RefreshCw, Lock, Sparkles, CheckCircle2,
  Terminal, Zap, Eye
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
  onOpenSandbox,
  onOpenNotifications,
  notificationCount = 0,
  children
}) {
  const [simulating, setSimulating] = useState(false);
  const [simMsg, setSimMsg] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [autoRefreshSecs, setAutoRefreshSecs] = useState(5);

  const profileRef = useRef(null);

  // Close profile dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setShowProfileMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  async function handleSimulate() {
    if (simulating) return;
    setSimulating(true);
    setSimMsg('');
    try {
      await runAttackSimulation();
      setSimMsg('⚡ Attack campaign injected!');
    } catch (e) {
      setSimMsg(`⚠️ Error: ${e.message?.slice(0, 40) || 'check backend'}`);
    } finally {
      setTimeout(() => {
        setSimulating(false);
        setSimMsg('');
      }, 3000);
    }
  }

  return (
    <div className="min-h-screen w-full flex flex-col selection:bg-[#f8c858] selection:text-neutral-900 bg-[#f6f6f2]">
      {/* ─── TOP PILL NAVIGATION BAR ────────────────────────────────────────── */}
      <header className="w-full px-3 sm:px-6 lg:px-8 pt-4 pb-3 flex items-center justify-between gap-3 max-w-[1700px] mx-auto print:hidden">
        {/* Left: Brand Pill */}
        <div className="flex items-center gap-2.5 flex-shrink-0">
          <button
            onClick={() => setActiveTab('command')}
            className="px-4 sm:px-5 py-2 rounded-full border border-neutral-300/80 bg-white/80 backdrop-blur-md shadow-xs hover:border-neutral-400 transition-all flex items-center gap-2 cursor-pointer group"
          >
            <Shield className="w-4 h-4 text-neutral-900 fill-neutral-900" />
            <span className="font-sans text-base sm:text-lg font-extrabold tracking-tight text-neutral-900">
              TRINETRA
            </span>
            <span className="text-[9px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full bg-[#f8c858] text-neutral-900">
              SOC
            </span>
          </button>

          {/* Mobile menu toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="xl:hidden p-2 rounded-full border border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50 cursor-pointer"
          >
            {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>

        {/* Center: Desktop Nav Pills */}
        <nav className="hidden xl:flex items-center gap-1 p-1 rounded-full bg-white/70 backdrop-blur-md border border-neutral-200/80 shadow-xs">
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

        {/* Right: Notification Trigger & Clean Profile Avatar Menu */}
        <div className="flex items-center gap-2.5 flex-shrink-0" ref={profileRef}>
          {/* Quick Notification Bell Button */}
          <button
            onClick={() => {
              if (onOpenNotifications) onOpenNotifications();
            }}
            className="w-10 h-10 rounded-full border border-neutral-300/80 bg-white/80 hover:bg-white text-neutral-700 hover:text-neutral-900 shadow-xs flex items-center justify-center transition cursor-pointer relative"
            title="Open Security Alerts & Telemetry Notification Drawer"
          >
            <Bell className="w-4 h-4" />
            {notificationCount > 0 && (
              <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-rose-500 ring-2 ring-white animate-pulse" />
            )}
          </button>

          <div className="relative">
            {/* User Profile Avatar */}
            <button
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="w-10 h-10 rounded-full border-2 border-white ring-1 ring-neutral-300/80 bg-white overflow-hidden shadow-sm hover:ring-[#f8c858] hover:scale-105 transition-all flex-shrink-0 cursor-pointer relative"
              title="Click for Attacker Sandbox, Simulation & Settings"
            >
              <img
                src="/profile-avatar.jpg"
                alt="User Avatar"
                className="w-full h-full object-cover object-top"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80';
                }}
              />
            </button>

            {/* Profile Dropdown Popup Menu */}
            {showProfileMenu && (
              <div className="absolute right-0 mt-2.5 w-96 rounded-3xl bg-white/95 backdrop-blur-xl border border-neutral-200 shadow-2xl z-[150] p-4 text-neutral-800 animate-in fade-in slide-in-from-top-2 duration-150">
                {/* User Header */}
                <div className="p-3.5 rounded-2xl bg-neutral-50 border border-neutral-200/70 flex items-center gap-3.5 mb-3">
                  <div className="w-11 h-11 rounded-full border border-neutral-300 overflow-hidden flex-shrink-0">
                    <img
                      src="/profile-avatar.jpg"
                      alt="User"
                      className="w-full h-full object-cover object-top"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80';
                      }}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-bold text-neutral-900 truncate">Senior Cyber Defense Lead</p>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold flex-shrink-0">
                        L3 Commander
                      </span>
                    </div>
                    <p className="text-[11px] text-neutral-500 truncate font-mono">soc-lead@trinetra.gov.in</p>
                  </div>
                </div>

                <div className="space-y-1.5">
                  {/* 1. Interactive Attacker Sandbox Item */}
                  <button
                    onClick={() => {
                      if (onOpenSandbox) onOpenSandbox();
                      setShowProfileMenu(false);
                    }}
                    className="w-full p-2.5 rounded-2xl hover:bg-neutral-100 transition flex items-center gap-3 text-left group cursor-pointer"
                  >
                    <div className="w-9 h-9 rounded-xl bg-neutral-900 text-[#f8c858] flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition">
                      <Terminal className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-neutral-900">Interactive Sandbox Terminal</span>
                        <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold">LIVE</span>
                      </div>
                      <p className="text-[11px] text-neutral-500">Live honeypot session CLI emulator</p>
                    </div>
                  </button>

                  {/* 2. Simulate Attack One-Click Item */}
                  <button
                    onClick={handleSimulate}
                    disabled={simulating}
                    className="w-full p-2.5 rounded-2xl hover:bg-neutral-100 transition flex items-center gap-3 text-left group cursor-pointer disabled:opacity-50"
                  >
                    <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition">
                      {simulating ? (
                        <Activity className="w-4 h-4 animate-spin text-amber-600" />
                      ) : (
                        <Play className="w-4 h-4 fill-amber-700 text-amber-700" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-neutral-900">
                          {simulating ? 'Injecting Attack...' : 'Simulate Intrusion Campaign'}
                        </span>
                        {simMsg && (
                          <span className="text-[9px] text-amber-600 font-bold">{simMsg}</span>
                        )}
                      </div>
                      <p className="text-[11px] text-neutral-500">Inject full multi-stage honeypot scenario</p>
                    </div>
                  </button>

                  {/* 3. Notifications Drawer Item */}
                  <button
                    onClick={() => {
                      if (onOpenNotifications) onOpenNotifications();
                      setShowProfileMenu(false);
                    }}
                    className="w-full p-2.5 rounded-2xl hover:bg-neutral-100 transition flex items-center gap-3 text-left group cursor-pointer"
                  >
                    <div className="w-9 h-9 rounded-xl bg-neutral-100 border border-neutral-200 text-neutral-700 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition">
                      <Bell className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-neutral-900">Security Telemetry Alerts</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800">
                          {notificationCount} Active
                        </span>
                      </div>
                      <p className="text-[11px] text-neutral-500">View real-time honeytrap trigger logs</p>
                    </div>
                  </button>

                  {/* 4. Settings Item */}
                  <button
                    onClick={() => {
                      setShowSettingsModal(true);
                      setShowProfileMenu(false);
                    }}
                    className="w-full p-2.5 rounded-2xl hover:bg-neutral-100 transition flex items-center gap-3 text-left group cursor-pointer"
                  >
                    <div className="w-9 h-9 rounded-xl bg-neutral-100 border border-neutral-200 text-neutral-700 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition">
                      <Settings className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-neutral-900">Platform Settings</span>
                        <ChevronRight className="w-3.5 h-3.5 text-neutral-400 group-hover:translate-x-0.5 transition" />
                      </div>
                      <p className="text-[11px] text-neutral-500">Audio beeps, polling rate &amp; theme</p>
                    </div>
                  </button>
                </div>

                {/* Footer status strip */}
                <div className="mt-3 pt-3 border-t border-neutral-100 flex items-center justify-between text-[11px] text-neutral-400 px-1 font-mono">
                  <span>TRINETRA SOC PLATFORM</span>
                  <span className="text-emerald-600 font-bold flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 blink" />
                    Connected
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ─── Mobile Navigation Drawer ────────────────────────────────────────── */}
      {mobileMenuOpen && (
        <div className="xl:hidden px-4 py-3 bg-white border-b border-neutral-200 space-y-1.5 shadow-md">
          {NAV_ITEMS.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center justify-between px-4 py-2.5 rounded-2xl text-sm font-medium transition cursor-pointer ${
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

      {/* ─── Main Content Container ─────────────────────────────────────────── */}
      <main className="flex-1 w-full max-w-[1700px] mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6">
        {children}
      </main>

      {/* ─── Settings Modal ─────────────────────────────────────────────────── */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-3xl bg-white border border-neutral-200 p-6 shadow-2xl text-neutral-800">
            <div className="flex items-center justify-between pb-4 border-b border-neutral-100">
              <div className="flex items-center gap-2.5">
                <Sliders className="w-5 h-5 text-neutral-900" />
                <h3 className="font-bold text-base text-neutral-900">TRINETRA Platform Preferences</h3>
              </div>
              <button
                onClick={() => setShowSettingsModal(false)}
                className="p-1 rounded-full hover:bg-neutral-100 text-neutral-400 hover:text-neutral-700 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 py-5">
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-neutral-50 border border-neutral-100">
                <div className="flex items-center gap-3">
                  {soundEnabled ? <Volume2 className="w-5 h-5 text-amber-600" /> : <VolumeX className="w-5 h-5 text-neutral-400" />}
                  <div>
                    <p className="text-xs font-bold text-neutral-900">Audio Telemetry Beep</p>
                    <p className="text-[11px] text-neutral-500">Sound tone on critical honeypot trip</p>
                  </div>
                </div>
                <button
                  onClick={() => setSoundEnabled(!soundEnabled)}
                  className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                    soundEnabled ? 'bg-[#1e1e22]' : 'bg-neutral-200'
                  }`}
                >
                  <span
                    className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${
                      soundEnabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              <div className="p-3.5 rounded-2xl bg-neutral-50 border border-neutral-100">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-neutral-900">Live Polling Rate</span>
                  <span className="text-xs font-mono font-bold text-neutral-700">{autoRefreshSecs}s</span>
                </div>
                <input
                  type="range"
                  min="2"
                  max="15"
                  value={autoRefreshSecs}
                  onChange={(e) => setAutoRefreshSecs(Number(e.target.value))}
                  className="w-full accent-neutral-900 cursor-pointer"
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setShowSettingsModal(false)}
                className="px-5 py-2 rounded-full bg-neutral-900 text-white text-xs font-bold hover:bg-neutral-800 transition cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
