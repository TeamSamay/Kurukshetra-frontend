import React, { useState } from 'react';
import {
  Zap, ArrowRight, Search, Lock, Filter, Clock, Terminal,
  MapPin, Shield, ChevronDown, ChevronUp, Copy, Check
} from 'lucide-react';

function riskBadge(risk) {
  const r = (risk || '').toUpperCase();
  const map = {
    CRITICAL: 'badge-critical', HIGH: 'badge-high',
    MEDIUM: 'badge-medium',    LOW: 'badge-low', INFO: 'badge-info',
  };
  return map[r] || 'badge-low';
}

function statusBadge(status) {
  const s = (status || '').toUpperCase();
  if (s === 'ACTIVE')    return { label: 'ACTIVE',    cls: 'badge-high' };
  if (s === 'CONTAINED') return { label: 'CONTAINED', cls: 'badge-contained' };
  return { label: s || 'UNKNOWN', cls: 'badge-info' };
}

function formatTime(ts) {
  if (!ts) return '--:--';
  const d = new Date(ts);
  if (isNaN(d.getTime())) return '--:--';
  return d.toLocaleString('en-GB', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', second: '2-digit'
  });
}

function CopyBtn({ text }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(text).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={copy} className="btn-ghost p-1.5 rounded-lg" title="Copy">
      {copied ? <Check className="w-3 h-3 text-emerald-600" />
               : <Copy className="w-3 h-3 text-slate-400" />}
    </button>
  );
}

function AttackRow({ atk, onSelect, onContain }) {
  const [expanded, setExpanded] = useState(false);
  const st = statusBadge(atk.status);

  return (
    <>
      <tr className="tr-hover border-b border-slate-100">
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold text-blue-600">
              {atk.source_ip || '?.?.?.?'}
            </span>
            <CopyBtn text={atk.source_ip || ''} />
          </div>
        </td>
        <td className="px-4 py-3">
          <span className="badge badge-info text-[10px]">{(atk.service || 'SSH').toUpperCase()}</span>
        </td>
        <td className="px-4 py-3">
          <span className={`badge ${riskBadge(atk.risk_level)}`}>{atk.risk_level || 'LOW'}</span>
        </td>
        <td className="px-4 py-3">
          <span className={`badge ${st.cls}`}>{st.label}</span>
        </td>
        <td className="px-4 py-3 text-xs text-slate-500 font-mono whitespace-nowrap">
          {formatTime(atk.last_seen || atk.start_time || atk.timestamp || atk.created_at)}
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            <button onClick={() => onSelect(atk.session_id)}
              className="btn-ghost text-[11px]">
              <Search className="w-3 h-3" /> Investigate
            </button>
            {atk.status !== 'CONTAINED' && (
              <button onClick={() => onContain(atk.session_id)}
                className="btn-danger text-[11px] px-3 py-1">
                <Lock className="w-3 h-3" /> Contain
              </button>
            )}
            <button onClick={() => setExpanded(v => !v)} className="btn-ghost p-1.5 text-slate-400">
              {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>
        </td>
      </tr>
      {expanded && (
        <tr className="bg-slate-50/70 border-b border-slate-100">
          <td colSpan={6} className="px-6 py-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
              <div>
                <p className="text-[10px] font-bold tracking-widest uppercase mb-1 text-slate-400">Session ID</p>
                <p className="font-mono text-blue-600 font-semibold">{atk.session_id || '—'}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold tracking-widest uppercase mb-1 text-slate-400">Attacker DNA</p>
                <p className="font-mono font-bold text-slate-800">{atk.fingerprint || atk.attacker_dna || '—'}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold tracking-widest uppercase mb-1 text-slate-400">Risk Score</p>
                <div className="flex items-center gap-2">
                  <div className="risk-bar flex-1">
                    <div className="risk-bar-fill"
                      style={{ width: `${atk.risk_score || 0}%`, background: atk.risk_score >= 80 ? '#e11d48' : atk.risk_score >= 50 ? '#d97706' : '#2563eb' }} />
                  </div>
                  <span className="font-bold text-slate-800">{atk.risk_score || 0}</span>
                </div>
              </div>
              <div>
                <p className="text-[10px] font-bold tracking-widest uppercase mb-1 text-slate-400">Events</p>
                <p className="font-bold text-slate-800">{atk.event_count || atk.events?.length || 0}</p>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

export default function LiveAttacks({ attacks = [], onSelectAttack, onContain }) {
  const [query, setQuery]         = useState('');
  const [filterRisk, setFilterRisk] = useState('ALL');
  const [filterSvc, setFilterSvc]   = useState('ALL');

  const filtered = attacks.filter(a => {
    const q = query.toLowerCase();
    const matchQ = !q || (a.source_ip || '').includes(q) || (a.session_id || '').toLowerCase().includes(q) || (a.service || '').toLowerCase().includes(q);
    const matchR = filterRisk === 'ALL' || (a.risk_level || '').toUpperCase() === filterRisk;
    const matchS = filterSvc  === 'ALL' || (a.service || '').toUpperCase() === filterSvc;
    return matchQ && matchR && matchS;
  });

  const active    = attacks.filter(a => a.status === 'ACTIVE').length;
  const contained = attacks.filter(a => a.status === 'CONTAINED').length;
  const critical  = attacks.filter(a => (a.risk_level || '').toUpperCase() === 'CRITICAL').length;

  return (
    <div className="space-y-5 fade-in-up">

      {/* Summary row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total',     value: attacks.length, color: '#2563eb' },
          { label: 'Active',    value: active,         color: '#e11d48' },
          { label: 'Contained', value: contained,      color: '#059669' },
          { label: 'Critical',  value: critical,       color: '#d97706' },
        ].map(s => (
          <div key={s.label} className="card p-4 text-center">
            <p className="text-2xl font-black" style={{ color: s.color }}>{s.value}</p>
            <p className="text-[10px] font-bold tracking-widest uppercase mt-1 text-slate-400">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="card p-4 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-48">
          <Search className="w-4 h-4 flex-shrink-0 text-slate-400" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search IP, session, service…"
            className="input-cyber flex-1 py-2"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          {['ALL','CRITICAL','HIGH','MEDIUM','LOW'].map(r => (
            <button key={r} onClick={() => setFilterRisk(r)}
              className={`text-[11px] font-bold px-2.5 py-1 rounded-lg transition-all ${filterRisk === r ? 'badge badge-' + r.toLowerCase() : 'btn-ghost'}`}>
              {r}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          {['ALL','SSH','HTTP','FTP'].map(s => (
            <button key={s} onClick={() => setFilterSvc(s)}
              className={`text-[11px] font-bold px-2.5 py-1 rounded-lg transition-all ${filterSvc === s ? 'badge badge-info' : 'btn-ghost'}`}>
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {filtered.length === 0 ? (
          <div className="py-20 flex flex-col items-center gap-4">
            <Zap className="w-12 h-12 text-slate-300" />
            <div className="text-center">
              <p className="text-base font-bold text-slate-800">
                {attacks.length === 0 ? 'No attacks recorded yet' : 'No results match filters'}
              </p>
              <p className="text-sm mt-1 text-slate-400">
                {attacks.length === 0
                  ? 'Use "Simulate Attack" in the sidebar to inject a live attack event'
                  : 'Try adjusting your search or filter criteria'}
              </p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  {['Source IP','Service','Risk','Status','Time','Actions'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-[10px] font-bold tracking-widest uppercase text-slate-400">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((atk, i) => (
                  <AttackRow key={atk.session_id || i} atk={atk}
                    onSelect={onSelectAttack} onContain={onContain} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
