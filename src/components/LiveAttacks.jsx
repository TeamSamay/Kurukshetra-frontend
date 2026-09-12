import React, { useState } from 'react';
import {
  Zap, ArrowRight, Search, Lock, Filter, Clock, Terminal,
  MapPin, Shield, ChevronDown, ChevronUp, Copy, Check, Eye
} from 'lucide-react';

function riskBadge(risk) {
  const r = (risk || '').toUpperCase();
  const map = {
    CRITICAL: 'badge-critical', HIGH: 'badge-high',
    MEDIUM: 'badge-medium',    LOW: 'badge-low', INFO: 'badge-yellow',
  };
  return map[r] || 'badge-low';
}

function statusBadge(status) {
  const s = (status || '').toUpperCase();
  if (s === 'ACTIVE')    return { label: 'ACTIVE',    cls: 'bg-[#f8c858] text-neutral-900 font-bold' };
  if (s === 'CONTAINED') return { label: 'CONTAINED', cls: 'bg-neutral-100 text-neutral-700 font-medium' };
  return { label: s || 'UNKNOWN', cls: 'bg-neutral-100 text-neutral-600' };
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
    <button onClick={copy} className="p-1.5 rounded-full hover:bg-neutral-100 text-neutral-400 hover:text-neutral-700 transition cursor-pointer" title="Copy">
      {copied ? <Check className="w-3 h-3 text-emerald-600" />
               : <Copy className="w-3 h-3" />}
    </button>
  );
}

function AttackRow({ atk, onSelect, onContain, onSelectIp }) {
  const [expanded, setExpanded] = useState(false);
  const st = statusBadge(atk.status);

  return (
    <>
      <tr className="hover:bg-neutral-50/70 transition-colors border-b border-neutral-100">
        <td className="px-5 py-3.5">
          <div className="flex items-center gap-2">
            <button
              onClick={() => onSelectIp && onSelectIp(atk.source_ip)}
              className="font-mono text-xs font-bold text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1 cursor-pointer"
              title="Click for 360° Attacker Intelligence Dossier"
            >
              <span>{atk.source_ip || '?.?.?.?'}</span>
              <Eye className="w-3 h-3 opacity-70" />
            </button>
            <CopyBtn text={atk.source_ip || ''} />
          </div>
        </td>
        <td className="px-5 py-3.5">
          <span className="badge bg-neutral-100 text-neutral-800 text-[10px] font-semibold uppercase">
            {(atk.service || 'SSH').toUpperCase()}
          </span>
        </td>
        <td className="px-5 py-3.5">
          <span className={`badge ${riskBadge(atk.risk_level)}`}>{atk.risk_level || 'LOW'}</span>
        </td>
        <td className="px-5 py-3.5">
          <span className={`px-2.5 py-0.5 rounded-full text-[10px] tracking-wide ${st.cls}`}>{st.label}</span>
        </td>
        <td className="px-5 py-3.5 text-xs text-neutral-500 font-mono whitespace-nowrap">
          {formatTime(atk.last_seen || atk.start_time || atk.timestamp || atk.created_at)}
        </td>
        <td className="px-5 py-3.5">
          <div className="flex items-center gap-2">
            <button onClick={() => onSelect(atk.session_id)}
              className="px-3 py-1 rounded-full border border-neutral-200 bg-white text-xs font-medium text-neutral-800 hover:bg-neutral-50 transition shadow-xs flex items-center gap-1.5 cursor-pointer">
              <Search className="w-3 h-3 text-neutral-500" /> Investigate
            </button>
            {atk.status !== 'CONTAINED' && (
              <button onClick={() => onContain(atk.session_id)}
                className="px-3 py-1 rounded-full bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold hover:bg-rose-100 transition shadow-xs flex items-center gap-1 cursor-pointer">
                <Lock className="w-3 h-3" /> Contain
              </button>
            )}
            <button onClick={() => setExpanded(v => !v)} className="p-1 rounded-full text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 cursor-pointer">
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </td>
      </tr>
      {expanded && (
        <tr className="bg-neutral-50/80 border-b border-neutral-100">
          <td colSpan={6} className="px-6 py-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
              <div>
                <p className="text-[10px] font-bold tracking-widest uppercase mb-1 text-neutral-400">Session ID</p>
                <p className="font-mono text-neutral-800 font-semibold truncate">{atk.session_id || '—'}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold tracking-widest uppercase mb-1 text-neutral-400">Attacker DNA</p>
                <p className="font-mono font-bold text-neutral-800">{atk.fingerprint || atk.attacker_dna || '—'}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold tracking-widest uppercase mb-1 text-neutral-400">Risk Score</p>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-neutral-900">{atk.risk_score || 0}/100</span>
                </div>
              </div>
              <div>
                <p className="text-[10px] font-bold tracking-widest uppercase mb-1 text-neutral-400">Events</p>
                <p className="font-bold text-neutral-900">{atk.event_count || atk.events?.length || 0}</p>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

export default function LiveAttacks({ attacks = [], onSelectAttack, onContain, onSelectIp }) {
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
    <div className="space-y-6 fade-in pb-12">

      {/* Summary row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Recorded', value: attacks.length, badge: 'All Time' },
          { label: 'Active Infiltrations', value: active, badge: 'Live' },
          { label: 'Contained Sessions', value: contained, badge: 'Isolated' },
          { label: 'Critical Threat', value: critical, badge: 'Priority' },
        ].map(s => (
          <div key={s.label} className="crextio-card p-5">
            <div className="flex items-center justify-between">
              <p className="text-3xl font-light tracking-tight text-neutral-900">{s.value}</p>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-600">
                {s.badge}
              </span>
            </div>
            <p className="text-xs font-medium text-neutral-500 mt-2">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="crextio-card p-4 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-48">
          <Search className="w-4 h-4 flex-shrink-0 text-neutral-400" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search IP, session, decoy service…"
            className="input-crextio flex-1 py-2 text-xs"
          />
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          {['ALL','CRITICAL','HIGH','MEDIUM','LOW'].map(r => (
            <button key={r} onClick={() => setFilterRisk(r)}
              className={`text-xs font-medium px-3 py-1.5 rounded-full transition-all cursor-pointer ${
                filterRisk === r ? 'bg-[#1e1e22] text-white shadow-xs' : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200/70'
              }`}>
              {r}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1.5">
          {['ALL','SSH','HTTP','FTP'].map(s => (
            <button key={s} onClick={() => setFilterSvc(s)}
              className={`text-xs font-medium px-3 py-1.5 rounded-full transition-all cursor-pointer ${
                filterSvc === s ? 'bg-[#f8c858] text-neutral-900 font-bold shadow-xs' : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200/70'
              }`}>
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="crextio-card overflow-hidden">
        {filtered.length === 0 ? (
          <div className="py-20 flex flex-col items-center gap-4">
            <Zap className="w-10 h-10 text-neutral-300" />
            <div className="text-center">
              <p className="text-base font-semibold text-neutral-800">
                {attacks.length === 0 ? 'No attacks recorded yet' : 'No results match filters'}
              </p>
              <p className="text-xs mt-1 text-neutral-400">
                {attacks.length === 0
                  ? 'Use "Simulate Intrusion Campaign" in the top profile menu to inject a live event'
                  : 'Try adjusting your search query or filter pills'}
              </p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-100 bg-neutral-50/50">
                  {['Source IP','Service','Risk','Status','Time','Actions'].map(h => (
                    <th key={h} className="text-left px-5 py-3.5 text-[11px] font-semibold text-neutral-500">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((atk, i) => (
                  <AttackRow key={atk.session_id || i} atk={atk}
                    onSelect={onSelectAttack} onContain={onContain} onSelectIp={onSelectIp} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
