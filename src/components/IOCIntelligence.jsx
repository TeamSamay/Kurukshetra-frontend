import React, { useState } from 'react';
import {
  Share2, Search, Copy, Check, Filter, Globe, Hash, Link, Wrench,
  Download, Shield, FileCode, ShieldAlert, Cpu, Sparkles, Terminal
} from 'lucide-react';
import {
  exportSTIXBundle, exportYaraRules, exportSuricataRules,
  exportFirewallScript, exportCSV
} from '../services/api';

const TYPE_META = {
  ipv4:   { label: 'IP Address', icon: Globe,  color: '#e11d48', bg: '#fef2f2', border: '#fee2e2' },
  ip:     { label: 'IP Address', icon: Globe,  color: '#e11d48', bg: '#fef2f2', border: '#fee2e2' },
  url:    { label: 'URL',        icon: Link,   color: '#2563eb', bg: '#eff6ff', border: '#dbeafe' },
  hash:   { label: 'Hash',       icon: Hash,   color: '#d97706', bg: '#fffbeb', border: '#fef3c7' },
  sha256: { label: 'SHA256',     icon: Hash,   color: '#d97706', bg: '#fffbeb', border: '#fef3c7' },
  hash_sha256: { label: 'SHA256', icon: Hash, color: '#d97706', bg: '#fffbeb', border: '#fef3c7' },
  hash_md5:    { label: 'MD5',    icon: Hash, color: '#d97706', bg: '#fffbeb', border: '#fef3c7' },
  md5:    { label: 'MD5',        icon: Hash,   color: '#d97706', bg: '#fffbeb', border: '#fef3c7' },
  tool:   { label: 'Tool',       icon: Wrench, color: '#7c3aed', bg: '#f5f3ff', border: '#ede9fe' },
  file:   { label: 'Honeyfile',  icon: ShieldAlert, color: '#ca8a04', bg: '#fefce8', border: '#fef9c3' },
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
    <button onClick={copy} className="p-1 rounded-md hover:bg-neutral-100 text-neutral-400 hover:text-neutral-700 transition cursor-pointer" title="Copy to clipboard">
      {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" />
               : <Copy className="w-3.5 h-3.5" />}
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
  const threatCat = ioc.threat_category || 'SUSPICIOUS';

  return (
    <tr className="hover:bg-neutral-50/70 group border-b border-neutral-100 transition-colors">
      <td className="px-5 py-3.5">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: meta.bg, border: `1px solid ${meta.border}` }}>
            <Icon className="w-3.5 h-3.5" style={{ color: meta.color }} />
          </div>
          <span className="text-xs font-bold" style={{ color: meta.color }}>{meta.label}</span>
        </div>
      </td>
      <td className="px-5 py-3.5">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs font-bold text-neutral-900 break-all max-w-sm truncate" title={val}>{val}</span>
          <CopyBtn text={val} />
        </div>
      </td>
      <td className="px-5 py-3.5">
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-700 uppercase tracking-wider">
          {threatCat}
        </span>
      </td>
      <td className="px-5 py-3.5">
        {sessionId ? (
          <span className="font-mono text-[11px] px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
            {sessionId}
          </span>
        ) : (
          <span className="text-neutral-400 text-xs">—</span>
        )}
      </td>
      <td className="px-5 py-3.5">
        {timeVal && (
          <span className="text-xs font-mono text-neutral-500 whitespace-nowrap">
            {new Date(timeVal).toLocaleString('en-GB', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' })}
          </span>
        )}
      </td>
      <td className="px-5 py-3.5">
        <span className="text-xs text-neutral-600 truncate max-w-xs block font-sans">
          {ioc.notes || ioc.context || 'Captured from honeynet deception telemetry'}
        </span>
      </td>
    </tr>
  );
}

export default function IOCIntelligence({ iocList = [] }) {
  const [query, setQuery] = useState('');
  const [filterType, setFilterType] = useState('ALL');
  const [exportNotice, setExportNotice] = useState('');

  const types = ['ALL', ...new Set(iocList.map(i => (i.ioc_type || i.type || 'unknown').toLowerCase()))];

  const filtered = iocList.filter(ioc => {
    const val = ioc.value || ioc.indicator || '';
    const matchQ = !query || val.toLowerCase().includes(query.toLowerCase()) || (ioc.threat_category || '').toLowerCase().includes(query.toLowerCase());
    const matchT = filterType === 'ALL' || (ioc.ioc_type || ioc.type || '').toLowerCase() === filterType;
    return matchQ && matchT;
  });

  const stats = {
    total:  iocList.length,
    ips:    iocList.filter(i => ['ip','ipv4'].includes((i.ioc_type||i.type||'').toLowerCase())).length,
    hashes: iocList.filter(i => ['hash','sha256','md5','hash_sha256','hash_md5'].includes((i.ioc_type||i.type||'').toLowerCase())).length,
    tools:  iocList.filter(i => (i.ioc_type||i.type||'').toLowerCase() === 'tool').length,
    files:  iocList.filter(i => (i.ioc_type||i.type||'').toLowerCase() === 'file').length,
    urls:   iocList.filter(i => (i.ioc_type||i.type||'').toLowerCase() === 'url').length,
  };

  const triggerExport = (fn, name) => {
    fn(iocList);
    setExportNotice(`✓ ${name} exported successfully!`);
    setTimeout(() => setExportNotice(''), 3000);
  };

  return (
    <div className="space-y-6 fade-in-up">

      {/* Top Threat Intel Action & Export Banner */}
      <div className="card p-6 bg-white border border-neutral-200/80 shadow-xs">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-neutral-900" />
              <h2 className="text-lg font-black text-neutral-900 tracking-tight">
                ACTIONABLE THREAT INTELLIGENCE & IOC FEEDS
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#f8c858] text-neutral-900">
                LIVE CAPTURED
              </span>
            </div>
            <p className="text-xs text-neutral-500 mt-1 max-w-2xl">
              Deterministic extraction of attacker source IPs, C2 URLs, payload hashes, and canary honeytokens. Export directly into enterprise SIEM, SOAR, EDR, and edge firewalls.
            </p>
          </div>

          {/* 1-Click Multi-Format Export Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => triggerExport((list) => exportYaraRules(list), 'YARA Rules (.yar)')}
              className="px-3 py-1.5 rounded-xl bg-neutral-900 text-white text-xs font-semibold hover:bg-neutral-800 transition shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <FileCode className="w-3.5 h-3.5 text-[#f8c858]" /> YARA (.yar)
            </button>

            <button
              onClick={() => triggerExport(exportSuricataRules, 'Suricata Rules (.rules)')}
              className="px-3 py-1.5 rounded-xl bg-neutral-900 text-white text-xs font-semibold hover:bg-neutral-800 transition shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <ShieldAlert className="w-3.5 h-3.5 text-rose-400" /> Snort / Suricata
            </button>

            <button
              onClick={() => triggerExport(exportFirewallScript, 'Firewall Blocklist (.sh)')}
              className="px-3 py-1.5 rounded-xl bg-neutral-900 text-white text-xs font-semibold hover:bg-neutral-800 transition shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Terminal className="w-3.5 h-3.5 text-emerald-400" /> Firewall Script
            </button>

            <button
              onClick={() => triggerExport((list) => exportSTIXBundle(null, list), 'STIX 2.1 JSON Bundle')}
              className="px-3 py-1.5 rounded-xl bg-neutral-100 text-neutral-800 border border-neutral-300 text-xs font-semibold hover:bg-neutral-200 transition shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Share2 className="w-3.5 h-3.5 text-blue-600" /> STIX 2.1
            </button>

            <button
              onClick={() => triggerExport(exportCSV, 'IOC Spreadsheet (.csv)')}
              className="px-3 py-1.5 rounded-xl bg-neutral-100 text-neutral-800 border border-neutral-300 text-xs font-semibold hover:bg-neutral-200 transition shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-neutral-700" /> CSV
            </button>
          </div>
        </div>

        {exportNotice && (
          <div className="mt-3 p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2 animate-fade-in">
            <Check className="w-4 h-4 text-emerald-600" />
            <span>{exportNotice}</span>
          </div>
        )}
      </div>

      {/* Stat Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
        {[
          { label: 'Total IOCs', value: stats.total,  color: '#0f172a' },
          { label: 'IP Addresses', value: stats.ips,  color: '#e11d48' },
          { label: 'Malware Hashes', value: stats.hashes, color: '#d97706' },
          { label: 'Offensive Tools', value: stats.tools,  color: '#7c3aed' },
          { label: 'Honeyfiles', value: stats.files,  color: '#ca8a04' },
          { label: 'C2 / Dropper URLs', value: stats.urls, color: '#0284c7' },
        ].map(s => (
          <div key={s.label} className="card p-4 text-center bg-white border border-neutral-200/80 shadow-xs">
            <p className="text-2xl font-black" style={{ color: s.color }}>{s.value}</p>
            <p className="text-[10px] font-bold tracking-widest uppercase mt-1 text-neutral-400">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Search and Filters */}
      <div className="card p-4 bg-white border border-neutral-200/80 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-64">
          <Search className="w-4 h-4 flex-shrink-0 text-neutral-400" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search indicator value, category, or notes..."
            className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-1.5 text-xs text-neutral-900 focus:outline-none focus:border-neutral-400 font-mono"
          />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="w-4 h-4 text-neutral-400" />
          {types.map(t => {
            const meta = getTypeMeta(t);
            const isSelected = filterType === t;
            return (
              <button
                key={t}
                onClick={() => setFilterType(t)}
                className={`text-[11px] font-bold px-3 py-1 rounded-full transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-neutral-900 text-white shadow-xs'
                    : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                }`}
              >
                {t === 'ALL' ? 'All Types' : meta.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden bg-white border border-neutral-200/80 shadow-xs">
        {filtered.length === 0 ? (
          <div className="py-20 flex flex-col items-center gap-4">
            <Share2 className="w-12 h-12 text-neutral-300" />
            <div className="text-center">
              <p className="text-base font-bold text-neutral-800">
                {iocList.length === 0 ? 'No IOCs captured yet' : 'No indicators match your filter'}
              </p>
              <p className="text-xs mt-1 text-neutral-400">
                Indicators are automatically extracted from live honeypot telemetry in real time.
              </p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-100 bg-neutral-50/70">
                  {['Type', 'Indicator Value', 'Category', 'Session ID', 'Timestamp', 'Context / Notes'].map(h => (
                    <th key={h} className="text-left px-5 py-3 text-[10px] font-bold tracking-widest uppercase text-neutral-500 font-mono">{h}</th>
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
