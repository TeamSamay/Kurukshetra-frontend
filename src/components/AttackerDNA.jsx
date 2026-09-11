import React, { useState } from 'react';
import { Fingerprint, Search, Activity, Terminal, MapPin, Clock, Shield } from 'lucide-react';

function riskColor(score) {
  if (score >= 80) return '#e11d48';
  if (score >= 50) return '#d97706';
  if (score >= 25) return '#2563eb';
  return '#059669';
}

function AttackerCard({ attacker }) {
  const [expanded, setExpanded] = useState(false);
  const {
    attacker_id, source_ip, dna_fingerprint, total_sessions = 0,
    max_risk_score = 0, services_used = [], commands_used = [],
    first_seen, last_seen, country, threat_level,
  } = attacker;

  const r = (threat_level || '').toUpperCase();
  const badgeClass = r === 'CRITICAL' ? 'badge-critical' : r === 'HIGH' ? 'badge-high' : r === 'MEDIUM' ? 'badge-medium' : 'badge-low';

  return (
    <div className="card overflow-hidden hover:shadow-md transition-all duration-200">
      {/* Card Header */}
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 bg-purple-50 border border-purple-100">
              <Fingerprint className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="font-mono font-bold text-sm text-blue-600">{source_ip || '?.?.?.?'}</p>
              {country && (
                <p className="flex items-center gap-1 text-[11px] mt-0.5 text-slate-400">
                  <MapPin className="w-3 h-3" /> {country}
                </p>
              )}
              {dna_fingerprint && (
                <p className="font-mono text-[10px] mt-1 px-2 py-0.5 rounded-md inline-block bg-purple-50 text-purple-700 border border-purple-100">
                  {dna_fingerprint}
                </p>
              )}
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            {threat_level && <span className={`badge ${badgeClass}`}>{threat_level}</span>}
            <div className="text-center">
              <p className="text-xl font-black" style={{ color: riskColor(max_risk_score) }}>{max_risk_score}</p>
              <p className="text-[10px] text-slate-400">Max Risk</p>
            </div>
          </div>
        </div>

        {/* Risk bar */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-[11px] mb-1.5">
            <span className="text-slate-400">Risk Score</span>
            <span className="font-bold" style={{ color: riskColor(max_risk_score) }}>{max_risk_score}/100</span>
          </div>
          <div className="risk-bar">
            <div className="risk-bar-fill" style={{ width: `${max_risk_score}%`, background: riskColor(max_risk_score) }} />
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3 mt-4">
          {[
            { label: 'Sessions', value: total_sessions },
            { label: 'Services', value: services_used.length || '—' },
            { label: 'Commands', value: commands_used.length || '—' },
          ].map(({ label, value }) => (
            <div key={label} className="text-center px-2 py-2 rounded-xl bg-slate-50 border border-slate-100">
              <p className="text-base font-black text-slate-800">{value}</p>
              <p className="text-[10px] font-semibold mt-0.5 text-slate-400">{label}</p>
            </div>
          ))}
        </div>

        {/* Services pills */}
        {services_used.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {services_used.map(s => (
              <span key={s} className="badge badge-info text-[10px]">{s.toUpperCase()}</span>
            ))}
          </div>
        )}

        <button onClick={() => setExpanded(v => !v)}
          className="btn-ghost w-full mt-4 justify-center text-[11px]">
          {expanded ? 'Hide Details' : 'Show Details'}
        </button>
      </div>

      {/* Expanded: commands */}
      {expanded && commands_used.length > 0 && (
        <div className="px-5 pb-5 border-t border-slate-100">
          <p className="text-[10px] font-bold tracking-widest uppercase mt-4 mb-3 text-slate-400">
            Observed Commands
          </p>
          <div className="space-y-1.5 max-h-40 overflow-y-auto">
            {commands_used.map((cmd, i) => (
              <div key={i} className="flex items-start gap-2 px-3 py-2 rounded-lg bg-slate-50 border border-slate-100">
                <Terminal className="w-3 h-3 mt-0.5 flex-shrink-0 text-sky-600" />
                <span className="font-mono text-[11px] break-all text-slate-700">{cmd}</span>
              </div>
            ))}
          </div>
          {(first_seen || last_seen) && (
            <div className="flex items-center gap-6 mt-4 text-xs text-slate-400">
              {first_seen && <span><span className="font-bold text-slate-700">First: </span>{new Date(first_seen).toLocaleDateString()}</span>}
              {last_seen  && <span><span className="font-bold text-slate-700">Last: </span>{new Date(last_seen).toLocaleDateString()}</span>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function AttackerDNA({ attackers = [] }) {
  const [query, setQuery] = useState('');

  const filtered = attackers.filter(a => {
    const q = query.toLowerCase();
    return !q
      || (a.source_ip || '').includes(q)
      || (a.dna_fingerprint || '').toLowerCase().includes(q)
      || (a.country || '').toLowerCase().includes(q);
  });

  return (
    <div className="space-y-5 fade-in-up">
      {/* Header */}
      <div className="card p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="section-icon bg-purple-50 border border-purple-100">
            <Fingerprint className="w-4 h-4 text-purple-600" />
          </div>
          <div>
            <h2 className="text-base font-black text-slate-800">Attacker DNA Profiles</h2>
            <p className="text-[11px] text-slate-400">
              {attackers.length} behavioral fingerprints identified
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-1 max-w-sm">
          <Search className="w-4 h-4 flex-shrink-0 text-slate-400" />
          <input value={query} onChange={e => setQuery(e.target.value)}
            placeholder="Search IP, DNA, country…"
            className="input-cyber flex-1" />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="card py-24 flex flex-col items-center gap-4">
          <Fingerprint className="w-14 h-14 text-slate-300" />
          <div className="text-center">
            <p className="text-base font-bold text-slate-800">
              {attackers.length === 0 ? 'No attacker profiles yet' : 'No results match'}
            </p>
            <p className="text-sm mt-1 text-slate-400">
              Profiles are built automatically from honeypot attack sessions
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((a, i) => (
            <AttackerCard key={a.attacker_id || a.source_ip || i} attacker={a} />
          ))}
        </div>
      )}
    </div>
  );
}

