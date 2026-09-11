import React, { useState, useEffect } from 'react';
import {
  ArrowUpRight, Play, Pause, Clock, ChevronDown, ChevronUp,
  MoreVertical, Check, Laptop, Zap, MessageSquare, Edit3, Link2,
  Users, UserPlus, FolderKanban
} from 'lucide-react';
import { fetchDashboardSummary } from '../services/api';

export default function CommandCenter({ summaryData, loading: parentLoading }) {
  const [data, setData] = useState(summaryData || {});
  const [loading, setLoading] = useState(parentLoading ?? true);

  // Accordion state
  const [openAccordion, setOpenAccordion] = useState({
    pension: false,
    devices: true,
    compensation: false,
    benefits: false,
  });

  // Time tracker interactive state
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(155); // 02:35
  const [activeDayIndex, setActiveDayIndex] = useState(5); // Friday (index 5)

  // Task checklist state
  const [tasks, setTasks] = useState([
    { id: 1, title: 'Interview', time: 'Sep 13, 08:30', icon: Laptop, done: true },
    { id: 2, title: 'Team Meeting', time: 'Sep 13, 10:30', icon: Zap, done: true },
    { id: 3, title: 'Project Update', time: 'Sep 13, 13:00', icon: MessageSquare, done: false },
    { id: 4, title: 'Discuss Q3 Goals', time: 'Sep 13, 14:45', icon: Edit3, done: false },
    { id: 5, title: 'HR Policy Review', time: 'Sep 13, 16:30', icon: Link2, done: false },
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

  // Timer tick
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
    contained_sessions = 56,
    total_iocs = 203,
  } = data;

  const daysOfWeek = [
    { label: 'S', height: '35%', active: false, tooltip: null },
    { label: 'M', height: '75%', active: false, tooltip: null },
    { label: 'T', height: '60%', active: false, tooltip: null },
    { label: 'W', height: '45%', active: false, tooltip: null },
    { label: 'T', height: '85%', active: false, tooltip: null },
    { label: 'F', height: '95%', active: true, tooltip: '5h 23m' },
    { label: 'S', height: '25%', active: false, tooltip: null },
  ];

  return (
    <div className="space-y-6 fade-in pb-12">
      {/* ── TOP HERO HEADER & METRIC RIBBON ───────────────────────────────── */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pt-2 pb-2">
        {/* Left: Greeting & Status Strip */}
        <div className="space-y-4">
          <h1 className="text-4xl sm:text-5xl font-normal tracking-tight text-neutral-900 font-sans">
            Welcome in, <span className="font-medium text-neutral-950">Nixtio</span>
          </h1>

          {/* Segmented Status Ribbon */}
          <div className="flex items-center gap-3 flex-wrap text-xs">
            {/* Interviews / Threats */}
            <div className="flex items-center gap-2">
              <span className="text-neutral-500 font-medium text-[13px]">Interviews</span>
              <span className="bg-[#1e1e22] text-white px-3 py-1 rounded-full font-semibold text-xs shadow-xs">
                15%
              </span>
            </div>

            {/* Hired / Contained */}
            <div className="flex items-center gap-2">
              <span className="text-neutral-500 font-medium text-[13px]">Hired</span>
              <span className="bg-[#f8c858] text-neutral-900 px-3 py-1 rounded-full font-bold text-xs shadow-xs">
                15%
              </span>
            </div>

            {/* Project time / Deception Uptime */}
            <div className="flex items-center gap-2">
              <span className="text-neutral-500 font-medium text-[13px]">Project time</span>
              <div className="h-7 min-w-[140px] sm:min-w-[190px] rounded-full border border-neutral-300 bg-white/70 overflow-hidden relative flex items-center px-3 shadow-xs">
                <div className="absolute inset-0 striped-pattern w-[60%] border-r border-neutral-300/80 bg-neutral-100/50" />
                <span className="relative z-10 text-[11px] font-bold text-neutral-800">60%</span>
              </div>
            </div>

            {/* Output / IOCs */}
            <div className="flex items-center gap-2">
              <span className="text-neutral-500 font-medium text-[13px]">Output</span>
              <span className="border border-neutral-400 bg-white/80 text-neutral-800 px-3 py-1 rounded-full font-semibold text-xs shadow-xs">
                10%
              </span>
            </div>
          </div>
        </div>

        {/* Right: Large Overview Stat Counters */}
        <div className="flex items-center gap-8 sm:gap-12 flex-shrink-0 self-start lg:self-end">
          {/* Stat 1 */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-white/60 border border-neutral-200/80 flex items-center justify-center text-neutral-600 shadow-xs">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <div className="text-4xl sm:text-5xl font-light tracking-tight text-neutral-900 leading-none">
                {total_sessions || 78}
              </div>
              <div className="text-xs text-neutral-500 font-medium mt-0.5">Employe</div>
            </div>
          </div>

          {/* Stat 2 */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-white/60 border border-neutral-200/80 flex items-center justify-center text-neutral-600 shadow-xs">
              <UserPlus className="w-4 h-4" />
            </div>
            <div>
              <div className="text-4xl sm:text-5xl font-light tracking-tight text-neutral-900 leading-none">
                {contained_sessions || 56}
              </div>
              <div className="text-xs text-neutral-500 font-medium mt-0.5">Hirings</div>
            </div>
          </div>

          {/* Stat 3 */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-white/60 border border-neutral-200/80 flex items-center justify-center text-neutral-600 shadow-xs">
              <FolderKanban className="w-4 h-4" />
            </div>
            <div>
              <div className="text-4xl sm:text-5xl font-light tracking-tight text-neutral-900 leading-none">
                {total_iocs || 203}
              </div>
              <div className="text-xs text-neutral-500 font-medium mt-0.5">Projects</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── 3-COLUMN MAIN GRID ────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* ── LEFT COLUMN (Profile Card & Accordion) ──────────────────────── */}
        <div className="lg:col-span-4 xl:col-span-3 space-y-4">
          {/* Main User Card with Image */}
          <div className="crextio-card overflow-hidden relative group">
            <div className="h-64 sm:h-72 w-full relative overflow-hidden bg-neutral-200">
              <img
                src="/profile-avatar.jpg"
                alt="Lora Piterson"
                className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&auto=format&fit=crop&q=80';
                }}
              />
              {/* Gradient overlay for bottom typography */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent pointer-events-none" />

              {/* Bottom Card Overlay */}
              <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between text-white">
                <div>
                  <h3 className="text-xl font-semibold tracking-tight text-white drop-shadow-sm">
                    Lora Piterson
                  </h3>
                  <p className="text-xs font-normal text-white/80">UX/UI Designer</p>
                </div>
                <div className="px-3.5 py-1.5 rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-white font-medium text-xs shadow-xs">
                  $1,200
                </div>
              </div>
            </div>
          </div>

          {/* Accordion / Info Lists */}
          <div className="crextio-card p-4 space-y-2">
            {/* Accordion 1: Pension contributions */}
            <div className="border-b border-neutral-100 pb-2">
              <button
                onClick={() => setOpenAccordion(p => ({ ...p, pension: !p.pension }))}
                className="w-full flex items-center justify-between py-2 text-left text-sm font-medium text-neutral-800 hover:text-black transition"
              >
                <span>Pension contributions</span>
                <ChevronDown className={`w-4 h-4 text-neutral-500 transition-transform ${openAccordion.pension ? 'rotate-180' : ''}`} />
              </button>
              {openAccordion.pension && (
                <div className="py-2 text-xs text-neutral-500 space-y-1">
                  <div className="flex justify-between"><span>Employee Share</span><span className="font-semibold text-neutral-800">8%</span></div>
                  <div className="flex justify-between"><span>Employer Match</span><span className="font-semibold text-neutral-800">6%</span></div>
                </div>
              )}
            </div>

            {/* Accordion 2: Devices (Expanded) */}
            <div className="border-b border-neutral-100 pb-2">
              <button
                onClick={() => setOpenAccordion(p => ({ ...p, devices: !p.devices }))}
                className="w-full flex items-center justify-between py-2 text-left text-sm font-medium text-neutral-800 hover:text-black transition"
              >
                <span>Devices</span>
                <ChevronUp className={`w-4 h-4 text-neutral-500 transition-transform ${openAccordion.devices ? '' : 'rotate-180'}`} />
              </button>
              {openAccordion.devices && (
                <div className="py-2 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-10 rounded-xl bg-neutral-100 border border-neutral-200 overflow-hidden flex items-center justify-center p-1 flex-shrink-0">
                      <img
                        src="/macbook-device.jpg"
                        alt="MacBook Air"
                        className="w-full h-full object-contain"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=200&auto=format&fit=crop&q=80';
                        }}
                      />
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-neutral-900">MacBook Air</div>
                      <div className="text-[11px] text-neutral-400">Version M1</div>
                    </div>
                  </div>
                  <button className="p-1 rounded-full text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100">
                    <MoreVertical className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {/* Accordion 3: Compensation Summary */}
            <div className="border-b border-neutral-100 pb-2">
              <button
                onClick={() => setOpenAccordion(p => ({ ...p, compensation: !p.compensation }))}
                className="w-full flex items-center justify-between py-2 text-left text-sm font-medium text-neutral-800 hover:text-black transition"
              >
                <span>Compensation Summary</span>
                <ChevronDown className={`w-4 h-4 text-neutral-500 transition-transform ${openAccordion.compensation ? 'rotate-180' : ''}`} />
              </button>
              {openAccordion.compensation && (
                <div className="py-2 text-xs text-neutral-500 space-y-1">
                  <div className="flex justify-between"><span>Base Salary</span><span className="font-semibold text-neutral-800">$84,000</span></div>
                  <div className="flex justify-between"><span>Bonus Allocation</span><span className="font-semibold text-neutral-800">12%</span></div>
                </div>
              )}
            </div>

            {/* Accordion 4: Employee Benefits */}
            <div>
              <button
                onClick={() => setOpenAccordion(p => ({ ...p, benefits: !p.benefits }))}
                className="w-full flex items-center justify-between py-2 text-left text-sm font-medium text-neutral-800 hover:text-black transition"
              >
                <span>Employee Benefits</span>
                <ChevronDown className={`w-4 h-4 text-neutral-500 transition-transform ${openAccordion.benefits ? 'rotate-180' : ''}`} />
              </button>
              {openAccordion.benefits && (
                <div className="py-2 text-xs text-neutral-500 space-y-1">
                  <div className="flex justify-between"><span>Health &amp; Dental</span><span className="font-semibold text-emerald-600">Active</span></div>
                  <div className="flex justify-between"><span>Remote Stipend</span><span className="font-semibold text-neutral-800">$500/mo</span></div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── MIDDLE COLUMN (Progress, Time Tracker, Calendar Timeline) ───── */}
        <div className="lg:col-span-8 xl:col-span-6 space-y-6">

          {/* Top Row: Progress + Time Tracker Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">

            {/* CARD 1: Progress Chart Card */}
            <div className="crextio-card p-6 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold text-neutral-900">Progress</h3>
                <button className="btn-circle-action" title="View details">
                  <ArrowUpRight className="w-4 h-4" />
                </button>
              </div>

              {/* Big Stat */}
              <div className="my-4">
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-light text-neutral-900 tracking-tight">6.1 h</span>
                  <span className="text-xs text-neutral-500 font-medium">
                    Work Time<br />this week
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
                          {day.tooltip || '5h 23m'}
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

            {/* CARD 2: Time Tracker Gauge Card */}
            <div className="crextio-card p-6 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold text-neutral-900">Time tracker</h3>
                <button className="btn-circle-action" title="Open tracker">
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
                  <span className="text-[10px] text-neutral-400 font-medium">Work Time</span>
                </div>
              </div>

              {/* Bottom Control Buttons */}
              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  onClick={() => setTimerRunning(true)}
                  className={`w-9 h-9 rounded-full flex items-center justify-center border border-neutral-200 transition shadow-xs ${
                    timerRunning ? 'bg-neutral-100 text-neutral-400' : 'bg-white hover:bg-neutral-50 text-neutral-800'
                  }`}
                  title="Play"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                </button>
                <button
                  onClick={() => setTimerRunning(false)}
                  className={`w-9 h-9 rounded-full flex items-center justify-center border border-neutral-200 transition shadow-xs ${
                    !timerRunning ? 'bg-neutral-100 text-neutral-400' : 'bg-white hover:bg-neutral-50 text-neutral-800'
                  }`}
                  title="Pause"
                >
                  <Pause className="w-3.5 h-3.5 fill-current" />
                </button>
                <button
                  onClick={() => setTimerSeconds(0)}
                  className="w-9 h-9 rounded-full flex items-center justify-center bg-[#1e1e22] text-white hover:bg-black transition shadow-xs"
                  title="Reset Timer"
                >
                  <Clock className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* CARD 3: Bottom Calendar / Timeline Schedule */}
          <div className="crextio-card p-6">
            {/* Calendar Header with Navigation */}
            <div className="flex items-center justify-between mb-5">
              <button className="px-3.5 py-1.5 rounded-full border border-neutral-200/90 text-xs font-medium text-neutral-700 hover:bg-neutral-50">
                August
              </button>
              <h3 className="text-base font-semibold text-neutral-900">
                September 2024
              </h3>
              <button className="px-3.5 py-1.5 rounded-full border border-neutral-200/90 text-xs font-medium text-neutral-700 hover:bg-neutral-50">
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

                {/* Floating Event 1: Dark Card (Weekly Team Sync) */}
                <div className="absolute left-[30%] sm:left-[35%] z-10 bg-[#1e1e22] text-white px-4 py-2.5 rounded-2xl shadow-lg border border-neutral-700 max-w-[230px] flex items-center gap-3">
                  <div className="min-w-0">
                    <div className="text-xs font-semibold truncate text-white">Weekly Team Sync</div>
                    <div className="text-[10px] text-neutral-300 truncate">Discuss progress on projects</div>
                  </div>
                  {/* Stacked Avatars */}
                  <div className="flex -space-x-2 flex-shrink-0">
                    <div className="w-5 h-5 rounded-full ring-2 ring-[#1e1e22] bg-amber-400 overflow-hidden text-[9px] font-bold flex items-center justify-center text-black">A</div>
                    <div className="w-5 h-5 rounded-full ring-2 ring-[#1e1e22] bg-indigo-400 overflow-hidden text-[9px] font-bold flex items-center justify-center text-white">L</div>
                  </div>
                </div>
              </div>

              <div className="relative flex items-center">
                <span className="w-16 font-mono text-[11px] text-neutral-500">9:00 am</span>
              </div>

              <div className="relative flex items-center">
                <span className="w-16 font-mono text-[11px] text-neutral-500">10:00 am</span>

                {/* Floating Event 2: White Card (Onboarding Session) */}
                <div className="absolute left-[52%] sm:left-[58%] z-10 bg-white text-neutral-900 px-4 py-2.5 rounded-2xl shadow-md border border-neutral-200 max-w-[230px] flex items-center gap-3">
                  <div className="min-w-0">
                    <div className="text-xs font-semibold truncate text-neutral-900">Onboarding Session</div>
                    <div className="text-[10px] text-neutral-500 truncate">Introduction for new hires</div>
                  </div>
                  {/* Stacked Avatars */}
                  <div className="flex -space-x-2 flex-shrink-0">
                    <div className="w-5 h-5 rounded-full ring-2 ring-white bg-emerald-400 overflow-hidden text-[9px] font-bold flex items-center justify-center text-black">E</div>
                    <div className="w-5 h-5 rounded-full ring-2 ring-white bg-rose-400 overflow-hidden text-[9px] font-bold flex items-center justify-center text-white">M</div>
                  </div>
                </div>
              </div>

              <div className="relative flex items-center">
                <span className="w-16 font-mono text-[11px] text-neutral-500">11:00 am</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── RIGHT COLUMN (Onboarding & Dark Task Card) ──────────────────── */}
        <div className="lg:col-span-12 xl:col-span-3 space-y-6">

          {/* Onboarding Top Progress Widget */}
          <div className="crextio-card p-6">
            <div className="flex items-baseline justify-between mb-4">
              <h3 className="text-base font-semibold text-neutral-900">Onboarding</h3>
              <span className="text-3xl font-light text-neutral-900">18%</span>
            </div>

            {/* Segmented Step Indicators */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                {/* 30% Task Yellow Pill */}
                <div className="bg-[#f8c858] text-neutral-900 px-3 py-1.5 rounded-full text-xs font-bold flex items-center justify-between min-w-[85px] shadow-xs">
                  <span>30%</span>
                  <span className="text-[10px] font-semibold text-neutral-800 ml-1">Task</span>
                </div>

                {/* 25% Dark Pill */}
                <div className="bg-[#1e1e22] text-white px-3 py-1.5 rounded-full text-xs font-semibold shadow-xs">
                  25%
                </div>

                {/* 0% Gray Pill */}
                <div className="bg-neutral-400 text-white px-3 py-1.5 rounded-full text-xs font-semibold shadow-xs">
                  0%
                </div>
              </div>
            </div>
          </div>

          {/* Floating Dark Card: "Onboarding Task 2/8" */}
          <div className="crextio-card-dark p-6 space-y-5">
            {/* Header */}
            <div className="flex items-baseline justify-between">
              <h3 className="text-base font-semibold text-white">Onboarding Task</h3>
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
    </div>
  );
}
