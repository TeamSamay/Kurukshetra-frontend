import React, { useState } from 'react';
import { Share2, Search, Copy, Check, Filter, Globe, Hash, Link, Wrench } from 'lucide-react';

const TYPE_META = {
  ipv4:   { label: 'IP Address', icon: Globe,  color: '#e11d48', bg: '#fef2f2', border: '#fee2e2' },
  ip:     { label: 'IP Address', icon: Globe,  color: '#e11d48', bg: '#fef2f2', border: '#fee2e2' },
  url:    { label: 'URL',        icon: Link,   color: '#2563eb', bg: '#eff6ff', border: '#dbeafe' },
  hash:   { label: 'Hash',       icon: Hash,   color: '#d97706', bg: '#fffbeb', border: '#fef3c7' },
  sha256: { label: 'SHA256',     icon: Hash,   color: '#d97706', bg: '#fffbeb', border: '#fef3c7' },
  md5:    { label: 'MD5',        icon: Hash,   color: '#d97706', bg: '#fffbeb', border: '#fef3c7' },
  tool:   { label: 'Tool',       icon: Wrench, color: '#7c3aed', bg: '#f5f3ff', border: '#ede9fe' },
  domain: { label: 'Domain',     icon: Globe,  color: '#0284c7', bg: '#f0f9ff', border: '#e0f2fe' },
};

function getTypeMeta(type) {
  return TYPE_META[(type || '').toLowerCase()] || {
    label: (type || 'Unknown').toUpperCase(),
    icon: Share2,
    color: '#64748b',
    bg: '#f8fafc',
    border: '#e2e8f0',
  };
}

function CopyBtn({ text }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(text).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={copy} className="btn-ghost p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
      {copied ? <Check className="w-3 h-3 text-emerald-600" />
               : <Copy className="w-3 h-3 text-slate-400" />}
    </button>
  );
}

function IOCRow({ ioc }) {
  const val = ioc.value || ioc.indicator || String(ioc);
  const type = ioc.ioc_type || ioc.type || 'unknown';
  const meta = getTypeMeta(type);
  const Icon = meta.icon;
  const sessionId = ioc.session_id || (Array.isArray(ioc.session_ids) ? ioc.session_ids[0] : null);
  const timeVal = ioc.last_seen || ioc.timestamp || ioc.first_seen;

  return (
    <tr className="tr-hover group border-b border-slate-100">
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: meta.bg, border: `1px solid ${meta.border}` }}>
            <Icon className="w-3.5 h-3.5" style={{ color: meta.color }} />
          </div>
          <span className="text-xs font-bold" style={{ color: meta.color }}>{meta.label}</span>
        </div>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs font-bold text-slate-800 break-all max-w-xs truncate" title={val}>{val}</span>
          <CopyBtn text={val} />
        </div>
      </td>
      <td className="px-4 py-3">
        {sessionId && (
          <span className="font-mono text-[11px] px-2 py-0.5 rounded-md bg-sky-50 text-sky-700 border border-sky-100">
            {sessionId.slice(0, 16)}…
          </span>
        )}
      </td>
      <td className="px-4 py-3">
        {timeVal && (
          <span className="text-[11px] font-mono text-slate-400">
            {new Date(timeVal).toLocaleString('en-GB', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' })}
          </span>
        )}
      </td>
      <td className="px-4 py-3">
        {ioc.context && (
          <span className="text-[11px] font-mono truncate max-w-xs block text-slate-600">
            {ioc.context}
          </span>
        )}
      </td>
    </tr>
  );
}

export default function IOCIntelligence({ iocList = [] }) {
  const [query, setQuery]       = useState('');
  const [filterType, setFilterType] = useState('ALL');

  const types = ['ALL', ...new Set(iocList.map(i => (i.type || 'unknown').toLowerCase()))];

  const filtered = iocList.filter(ioc => {
    const val = ioc.value || ioc.indicator || '';
    const matchQ = !query || val.toLowerCase().includes(query.toLowerCase());
    const matchT = filterType === 'ALL' || (ioc.type || '').toLowerCase() === filterType;
    return matchQ && matchT;
  });

  const stats = {
    total:   iocList.length,
    ips:     iocList.filter(i => ['ip','ipv4'].includes((i.type||'').toLowerCase())).length,
    hashes:  iocList.filter(i => ['hash','sha256','md5'].includes((i.type||'').toLowerCase())).length,
    tools:   iocList.filter(i => (i.type||'').toLowerCase() === 'tool').length,
    urls:    iocList.filter(i => (i.type||'').toLowerCase() === 'url').length,
  };

  return (
    <div className="space-y-5 fade-in-up">

      {/* Stat strip */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: 'Total IOCs', value: stats.total,  color: '#2563eb' },
          { label: 'IP Addresses', value: stats.ips,  color: '#e11d48' },
          { label: 'Hashes',     value: stats.hashes, color: '#d97706' },
          { label: 'Tools',      value: stats.tools,  color: '#7c3aed' },
          { label: 'URLs',       value: stats.urls,   color: '#0284c7' },
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
          <input value={query} onChange={e => setQuery(e.target.value)}
            placeholder="Search IOC value…"
            className="input-cyber flex-1 py-2" />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="w-4 h-4 text-slate-400" />
          {types.map(t => {
            const meta = getTypeMeta(t);
            return (
              <button key={t} onClick={() => setFilterType(t)}
                className={`text-[11px] font-bold px-3 py-1 rounded-lg capitalize transition-all ${
                  filterType === t
                    ? 'shadow-sm'
                    : 'btn-ghost'
                }`}
                style={filterType === t ? { background: meta.bg, border: `1px solid ${meta.border}`, color: meta.color } : {}}>
                {t === 'ALL' ? 'All Types' : meta.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {filtered.length === 0 ? (
          <div className="py-20 flex flex-col items-center gap-4">
            <Share2 className="w-12 h-12 text-slate-300" />
            <div className="text-center">
              <p className="text-base font-bold text-slate-800">
                {iocList.length === 0 ? 'No IOCs captured yet' : 'No results match'}
              </p>
              <p className="text-sm mt-1 text-slate-400">
                IOCs are extracted automatically from honeypot attack sessions
              </p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  {['Type','Indicator','Session','Captured','Context'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-[10px] font-bold tracking-widest uppercase text-slate-400">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((ioc, i) => (
                  <IOCRow key={ioc.id || i} ioc={ioc} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

