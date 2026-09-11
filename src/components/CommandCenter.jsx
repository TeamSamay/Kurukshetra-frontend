import React, { useEffect, useState } from 'react';
import {
  Server, Target, AlertTriangle, Database, Activity, Clock,
  Shield, Globe, Zap, TrendingUp, Eye, Radio
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell
} from 'recharts';
import { fetchDashboardSummary } from '../services/api';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function Skeleton({ className = '' }) {
  return <div className={`shimmer ${className}`} />;
}

function StatCard({ label, value, sub, icon: Icon, accent, loading }) {
  const colors = {
    blue:    { bg: 'bg-blue-50',    border: 'border-blue-100',    icon: 'text-blue-600',    glow: 'rgba(37,99,235,0.06)' },
    rose:    { bg: 'bg-rose-50',    border: 'border-rose-100',    icon: 'text-rose-600',    glow: 'rgba(225,29,72,0.06)' },
    amber:   { bg: 'bg-amber-50',   border: 'border-amber-100',   icon: 'text-amber-600',   glow: 'rgba(217,119,6,0.06)' },
    emerald: { bg: 'bg-emerald-50', border: 'border-emerald-100', icon: 'text-emerald-600', glow: 'rgba(5,150,105,0.06)' },
    purple:  { bg: 'bg-purple-50',  border: 'border-purple-100',  icon: 'text-purple-600',  glow: 'rgba(124,58,237,0.06)' },
    cyan:    { bg: 'bg-sky-50',     border: 'border-sky-100',     icon: 'text-sky-600',     glow: 'rgba(2,132,199,0.06)' },
  };
  const c = colors[accent] || colors.blue;

  return (
    <div className="card p-5 flex items-start gap-4 hover:shadow-md transition-all duration-200"
      style={{ boxShadow: `0 4px 20px ${c.glow}` }}>
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${c.bg} border ${c.border}`}>
        <Icon className={`w-5 h-5 ${c.icon}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-bold tracking-widest uppercase mb-1 text-slate-400">
          {label}
        </p>
        {loading ? (
          <><Skeleton className="h-7 w-16 mb-1" /><Skeleton className="h-3 w-24" /></>
        ) : (
          <>
            <p className="text-2xl font-black text-slate-800 tracking-tight leading-none">{value}</p>
            <p className={`text-[11px] font-semibold mt-1 ${c.icon}`}>{sub}</p>
          </>
        )}
      </div>
    </div>
  );
}

const CHART_COLORS = {
  ssh:   '#7c3aed',
  http:  '#2563eb',
  ftp:   '#0284c7',
  other: '#94a3b8',
};

const TOOLTIP_STYLE = {
  background: '#ffffff',
  border: '1px solid #e2e8f0',
  borderRadius: 10,
  fontSize: 12,
  color: '#0f172a',
  boxShadow: '0 4px 14px rgba(0,0,0,0.08)',
};

function buildServiceDonut(serviceDistribution) {
  return Object.entries(serviceDistribution || {}).map(([name, value]) => ({
    name: name.toUpperCase(),
    value,
    color: CHART_COLORS[name.toLowerCase()] || '#94a3b8',
  }));
}

function buildTechBars(topMitre) {
  return (topMitre || []).slice(0, 6).map(t => ({
    name: (t.technique_id || t.name || '').slice(0, 12),
    count: t.count || t.frequency || 1,
  }));
}

// Build attack trend from recent_attacks timestamps
function buildTrend(recentAttacks) {
  if (!recentAttacks || recentAttacks.length === 0) {
    return Array.from({ length: 8 }, (_, i) => ({ time: `${i * 3}h`, attacks: 0, iocs: 0 }));
  }
  const buckets = {};
  recentAttacks.forEach(a => {
    const h = new Date(a.timestamp || a.created_at || Date.now()).getHours();
    const key = `${h}:00`;
    buckets[key] = (buckets[key] || 0) + 1;
  });
  return Object.entries(buckets).map(([time, attacks]) => ({ time, attacks, iocs: Math.floor(attacks * 1.4) }));
}

function formatTime(ts) {
  if (!ts) return '--:--';
  const d = new Date(ts);
  return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

export default function CommandCenter({ summaryData, loading: parentLoading }) {
  const [data, setData] = useState(summaryData || {});
  const [loading, setLoading] = useState(parentLoading ?? true);

  useEffect(() => {
    if (summaryData && Object.keys(summaryData).length > 0) {
      setData(summaryData);
      setLoading(false);
    }
  }, [summaryData]);

  // Auto-refresh every 15s
  useEffect(() => {
    const t = setInterval(async () => {
      try {
        const d = await fetchDashboardSummary();
        setData(d || {});
        setLoading(false);
      } catch {}
    }, 15000);
    return () => clearInterval(t);
  }, []);

  const {
    total_sessions      = 0,
    active_sessions     = 0,
    contained_sessions  = 0,
    critical_risk_sessions = 0,
    high_risk_sessions  = 0,
    total_events        = 0,
    total_iocs          = 0,
    top_mitre_techniques= [],
    recent_attacks      = [],
    service_distribution= {},
  } = data;

  const donutData = buildServiceDonut(service_distribution);
  const techBars  = buildTechBars(top_mitre_techniques);
  const trendData = buildTrend(recent_attacks);
  const totalDonut = donutData.reduce((s, d) => s + d.value, 0);

  return (
    <div className="space-y-6 fade-in-up">

      {/* ── STAT CARDS ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard label="Total Sessions"   value={total_sessions}      sub="All tracked sessions" icon={Server}       accent="blue"    loading={loading} />
        <StatCard label="Active Attacks"   value={active_sessions}     sub="Currently active"     icon={Zap}          accent="rose"    loading={loading} />
        <StatCard label="Contained"        value={contained_sessions}  sub="Isolated sessions"    icon={Shield}       accent="emerald" loading={loading} />
        <StatCard label="Critical / High"  value={`${critical_risk_sessions} / ${high_risk_sessions}`} sub="Needs attention" icon={AlertTriangle} accent="amber" loading={loading} />
        <StatCard label="Total Events"     value={total_events}        sub="Honeypot telemetry"   icon={Activity}     accent="purple"  loading={loading} />
        <StatCard label="Captured IOCs"    value={total_iocs}          sub="Threat indicators"    icon={Database}     accent="cyan"    loading={loading} />
      </div>

      {/* ── CHARTS ROW ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">

        {/* Attack Trend Area Chart */}
        <div className="xl:col-span-2 card p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="section-header mb-0">
              <div className="section-icon bg-blue-50 border border-blue-100">
                <TrendingUp className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-800">Attack Frequency &amp; IOC Extraction</h3>
                <p className="text-[11px] text-slate-400">Real-time telemetry from deception sensors</p>
              </div>
            </div>
            <div className="flex items-center gap-4 text-[11px] font-semibold">
              <span className="flex items-center gap-1.5 text-blue-600">
                <span className="w-2 h-2 rounded-full bg-blue-600" />Attacks
              </span>
              <span className="flex items-center gap-1.5 text-purple-600">
                <span className="w-2 h-2 rounded-full bg-purple-600" />IOCs
              </span>
            </div>
          </div>

          {loading ? (
            <Skeleton className="h-56 w-full" />
          ) : (
            <ResponsiveContainer width="100%" height={224}>
              <AreaChart data={trendData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="gA" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#2563eb" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gI" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#7c3aed" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="time" stroke="#e2e8f0" tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis stroke="#e2e8f0" tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Area type="monotone" dataKey="attacks" stroke="#2563eb" strokeWidth={2.5} fill="url(#gA)" />
                <Area type="monotone" dataKey="iocs"    stroke="#7c3aed" strokeWidth={2.5} fill="url(#gI)" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Service Distribution Donut */}
        <div className="card p-6 flex flex-col">
          <div className="section-header">
            <div className="section-icon bg-purple-50 border border-purple-100">
              <Globe className="w-4 h-4 text-purple-600" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">Service Breakdown</h3>
              <p className="text-[11px] text-slate-400">Attack surface distribution</p>
            </div>
          </div>

          {loading ? (
            <Skeleton className="h-40 w-40 rounded-full mx-auto" />
          ) : donutData.length > 0 ? (
            <>
              <div className="relative w-40 h-40 mx-auto">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={donutData} cx="50%" cy="50%" innerRadius={46} outerRadius={65}
                      paddingAngle={4} dataKey="value">
                      {donutData.map((d, i) => (
                        <Cell key={i} fill={d.color} stroke="transparent" />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-2xl font-black text-slate-800 leading-none">{totalDonut}</span>
                  <span className="text-[10px] font-semibold mt-0.5 text-slate-400">Sessions</span>
                </div>
              </div>
              <div className="mt-4 space-y-2">
                {donutData.map(d => (
                  <div key={d.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: d.color }} />
                      <span className="font-semibold text-slate-700">{d.name}</span>
                    </div>
                    <span className="font-bold" style={{ color: d.color }}>{d.value}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center gap-3">
              <Globe className="w-10 h-10 text-slate-300" />
              <p className="text-xs font-semibold text-center text-slate-400">
                No attacks yet.<br />Use the simulator to inject events.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── BOTTOM ROW ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-5">

        {/* MITRE Technique Frequency */}
        <div className="card p-6">
          <div className="section-header">
            <div className="section-icon bg-amber-50 border border-amber-100">
              <Shield className="w-4 h-4 text-amber-600" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">Top MITRE Techniques</h3>
              <p className="text-[11px] text-slate-400">Observed tactic frequency</p>
            </div>
          </div>
          {loading ? (
            <Skeleton className="h-36 w-full" />
          ) : techBars.length > 0 ? (
            <ResponsiveContainer width="100%" height={144}>
              <BarChart data={techBars} layout="vertical" margin={{ left: 0, right: 8, top: 0, bottom: 0 }}>
                <XAxis type="number" tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fill: '#475569', fontSize: 10 }} tickLine={false} axisLine={false} width={70} />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Bar dataKey="count" fill="#d97706" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-36 flex items-center justify-center">
              <p className="text-xs font-semibold text-slate-400">No MITRE data yet</p>
            </div>
          )}
        </div>

        {/* Recent Attacks Feed */}
        <div className="card p-6 xl:col-span-2">
          <div className="flex items-center justify-between mb-5">
            <div className="section-header mb-0">
              <div className="section-icon bg-rose-50 border border-rose-100">
                <Radio className="w-4 h-4 text-rose-600" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-800">Live Attack Feed</h3>
                <p className="text-[11px] text-slate-400">Most recent honeypot events</p>
              </div>
            </div>
            {active_sessions > 0 && (
              <span className="flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-lg bg-rose-50 text-rose-600 border border-rose-100">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 blink" />
                {active_sessions} ACTIVE
              </span>
            )}
          </div>

          {loading ? (
            <div className="space-y-2">
              {[1,2,3,4].map(i => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : recent_attacks.length > 0 ? (
            <div className="space-y-1.5 max-h-64 overflow-y-auto">
              {recent_attacks.map((atk, i) => (
                <div key={atk.session_id || i}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl tr-hover bg-slate-50/50 border border-slate-100">
                  <Clock className="w-3.5 h-3.5 flex-shrink-0 text-slate-400" />
                  <span className="text-[11px] font-mono tabular-nums flex-shrink-0 text-slate-400">
                    {formatTime(atk.timestamp || atk.created_at)}
                  </span>
                  <span className="text-xs font-mono font-bold flex-shrink-0 text-blue-600">
                    {atk.source_ip || '?.?.?.?'}
                  </span>
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md flex-shrink-0 uppercase bg-purple-50 text-purple-600 border border-purple-100">
                    {atk.service || 'UNKNOWN'}
                  </span>
                  <span className="flex-1 text-xs truncate text-slate-600">
                    {atk.session_id || atk.id || 'session'}
                  </span>
                  <span className={`badge ${
                    atk.risk_level === 'CRITICAL' ? 'badge-critical' :
                    atk.risk_level === 'HIGH'     ? 'badge-high' :
                    atk.risk_level === 'MEDIUM'   ? 'badge-medium' : 'badge-low'
                  }`}>
                    {atk.risk_level || 'LOW'}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-40 flex flex-col items-center justify-center gap-3">
              <Eye className="w-10 h-10 text-slate-300" />
              <div className="text-center">
                <p className="text-sm font-bold text-slate-800">No attacks detected yet</p>
                <p className="text-xs mt-1 text-slate-400">
                  Use <span className="font-bold text-rose-600">Simulate Attack</span> in the sidebar to inject a live event
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

