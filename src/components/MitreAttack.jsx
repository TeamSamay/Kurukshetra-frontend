import React, { useState } from 'react';
import { Shield, ChevronDown, ChevronUp, Terminal, Search } from 'lucide-react';

// Official MITRE ATT&CK Tactic ordering
const TACTIC_ORDER = [
  'Reconnaissance','Resource Development','Initial Access','Execution',
  'Persistence','Privilege Escalation','Defense Evasion','Credential Access',
  'Discovery','Lateral Movement','Collection','Command and Control',
  'Exfiltration','Impact',
];

const TACTIC_COLORS = {
  'Reconnaissance':       { bg: '#f5f3ff', border: '#ede9fe', text: '#7c3aed' },
  'Resource Development': { bg: '#eef2ff', border: '#e0e7ff', text: '#4f46e5' },
  'Initial Access':       { bg: '#fef2f2', border: '#fee2e2', text: '#dc2626' },
  'Execution':            { bg: '#fff1f2', border: '#ffe4e6', text: '#e11d48' },
  'Persistence':          { bg: '#fffbeb', border: '#fef3c7', text: '#d97706' },
  'Privilege Escalation': { bg: '#fff7ed', border: '#ffedd5', text: '#ea580c' },
  'Defense Evasion':      { bg: '#fefce8', border: '#fef9c3', text: '#ca8a04' },
  'Credential Access':    { bg: '#ecfdf5', border: '#d1fae5', text: '#059669' },
  'Discovery':            { bg: '#f0f9ff', border: '#e0f2fe', text: '#0284c7' },
  'Lateral Movement':     { bg: '#eff6ff', border: '#dbeafe', text: '#2563eb' },
  'Collection':           { bg: '#eef2ff', border: '#e0e7ff', text: '#4f46e5' },
  'Command and Control':  { bg: '#faf5ff', border: '#f3e8ff', text: '#9333ea' },
  'Exfiltration':         { bg: '#fef2f2', border: '#fee2e2', text: '#dc2626' },
  'Impact':               { bg: '#fff1f2', border: '#ffe4e6', text: '#e11d48' },
};

function defaultColor() {
  return { bg: '#f8fafc', border: '#e2e8f0', text: '#64748b' };
}

function TechniqueCard({ technique, sessionId }) {
  const [expanded, setExpanded] = useState(false);
  const tactic = technique.tactic || technique.tactic_name || 'Unknown';
  const colors  = TACTIC_COLORS[tactic] || defaultColor();

  return (
    <div className="rounded-xl overflow-hidden" style={{ background: colors.bg, border: `1px solid ${colors.border}` }}>
      <button onClick={() => setExpanded(v => !v)}
        className="w-full flex items-start gap-3 p-3 text-left">
        <Shield className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: colors.text }} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-black" style={{ color: colors.text }}>
              {technique.technique_id || technique.id || '—'}
            </span>
            <span className="text-xs font-semibold text-slate-800 truncate">
              {technique.technique_name || technique.name || 'Unknown Technique'}
            </span>
          </div>
          {technique.frequency && (
            <p className="text-[10px] mt-0.5 text-slate-400">
              Observed {technique.frequency}× · {tactic}
            </p>
          )}
        </div>
        {(technique.evidence || technique.commands) && (
          expanded ? <ChevronUp className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: colors.text }} />
                   : <ChevronDown className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: colors.text }} />
        )}
      </button>

      {expanded && (technique.evidence || technique.commands || technique.description) && (
        <div className="px-3 pb-3 space-y-2 border-t" style={{ borderColor: colors.border }}>
          {technique.description && (
            <p className="text-[11px] mt-2 text-slate-600">{technique.description}</p>
          )}
          {(technique.commands || technique.evidence) && (
            <div className="space-y-1">
              <p className="text-[10px] font-bold tracking-widest uppercase mt-2 text-slate-400">Evidence</p>
              {(technique.commands || technique.evidence || []).map((cmd, i) => (
                <div key={i} className="flex items-start gap-2 px-2 py-1.5 rounded-lg bg-white border border-slate-100 shadow-2xs">
                  <Terminal className="w-3 h-3 mt-0.5 flex-shrink-0 text-sky-600" />
                  <span className="font-mono text-[10px] break-all text-slate-700">{cmd}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function TacticColumn({ tactic, techniques }) {
  const colors = TACTIC_COLORS[tactic] || defaultColor();
  return (
    <div className="card p-4 min-w-[200px]">
      <div className="mb-3 pb-2.5 border-b-2" style={{ borderBottomColor: colors.border }}>
        <p className="text-xs font-black tracking-wide" style={{ color: colors.text }}>{tactic}</p>
        <p className="text-[10px] mt-0.5 text-slate-400">{techniques.length} technique{techniques.length !== 1 ? 's' : ''}</p>
      </div>
      <div className="space-y-2">
        {techniques.map((t, i) => (
          <TechniqueCard key={t.technique_id || i} technique={t} />
        ))}
      </div>
    </div>
  );
}

export default function MitreAttack({ mitreData = [] }) {
  const [query, setQuery] = useState('');

  // Group techniques by tactic
  const grouped = {};
  const filtered = mitreData.filter(t => {
    const q = query.toLowerCase();
    return !q
      || (t.technique_id || '').toLowerCase().includes(q)
      || (t.technique_name || t.name || '').toLowerCase().includes(q)
      || (t.tactic || '').toLowerCase().includes(q);
  });

  filtered.forEach(t => {
    const tactic = t.tactic || t.tactic_name || 'Other';
    if (!grouped[tactic]) grouped[tactic] = [];
    grouped[tactic].push(t);
  });

  // Sort tactics in MITRE kill-chain order
  const sortedTactics = Object.keys(grouped).sort((a, b) => {
    const ai = TACTIC_ORDER.indexOf(a);
    const bi = TACTIC_ORDER.indexOf(b);
    if (ai === -1 && bi === -1) return a.localeCompare(b);
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });

  const totalTechniques = mitreData.length;
  const totalTactics    = Object.keys(grouped).length;

  return (
    <div className="space-y-5 fade-in-up">

      {/* Header */}
      <div className="card p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="section-icon bg-rose-50 border border-rose-100">
            <Shield className="w-4 h-4 text-rose-600" />
          </div>
          <div>
            <h2 className="text-base font-black text-slate-800">MITRE ATT&amp;CK® Matrix</h2>
            <p className="text-[11px] text-slate-400">
              {totalTechniques} technique{totalTechniques !== 1 ? 's' : ''} across {totalTactics} tactic{totalTactics !== 1 ? 's' : ''} observed
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-slate-400" />
            <input value={query} onChange={e => setQuery(e.target.value)}
              placeholder="Search technique or tactic…"
              className="input-cyber w-56" />
          </div>
          {/* Legend pills */}
          <div className="hidden lg:flex items-center gap-2 flex-wrap">
            {Object.entries(TACTIC_COLORS).slice(0, 4).map(([name, c]) => (
              <span key={name} className="text-[10px] font-bold px-2 py-0.5 rounded-md"
                style={{ background: c.bg, border: `1px solid ${c.border}`, color: c.text }}>
                {name}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Techniques',  value: totalTechniques,  color: '#e11d48' },
          { label: 'Tactics',     value: totalTactics,     color: '#d97706' },
          { label: 'Max Freq.',   value: mitreData.reduce((m,t) => Math.max(m, t.frequency || 1), 0), color: '#7c3aed' },
          { label: 'Sessions',    value: new Set(mitreData.map(t => t.session_id).filter(Boolean)).size, color: '#0284c7' },
        ].map(s => (
          <div key={s.label} className="card p-4 text-center">
            <p className="text-2xl font-black" style={{ color: s.color }}>{s.value}</p>
            <p className="text-[10px] font-bold tracking-widest uppercase mt-1 text-slate-400">{s.label}</p>
          </div>
        ))}
      </div>

      {/* ATT&CK Matrix */}
      {sortedTactics.length === 0 ? (
        <div className="card py-20 flex flex-col items-center gap-4">
          <Shield className="w-14 h-14 text-slate-300" />
          <div className="text-center">
            <p className="text-base font-bold text-slate-800">No ATT&amp;CK techniques mapped yet</p>
            <p className="text-sm mt-1 text-slate-400">
              Techniques are automatically mapped from honeypot attack sessions
            </p>
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto pb-2">
          <div className="flex gap-4" style={{ minWidth: `${sortedTactics.length * 220}px` }}>
            {sortedTactics.map(tactic => (
              <div key={tactic} className="flex-shrink-0 w-52">
                <TacticColumn tactic={tactic} techniques={grouped[tactic]} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All techniques table fallback */}
      {sortedTactics.length > 0 && (
        <div className="card overflow-hidden">
          <div className="p-4 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-800">All Observed Techniques</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  {['Technique ID','Name','Tactic','Frequency','Session'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-[10px] font-bold tracking-widest uppercase text-slate-400">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((t, i) => {
                  const tactic = t.tactic || 'Other';
                  const c = TACTIC_COLORS[tactic] || defaultColor();
                  return (
                    <tr key={t.technique_id || i} className="tr-hover border-b border-slate-100">
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs font-bold" style={{ color: c.text }}>
                          {t.technique_id || '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs font-semibold text-slate-800">
                        {t.technique_name || t.name || '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md"
                          style={{ background: c.bg, border: `1px solid ${c.border}`, color: c.text }}>
                          {tactic}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs font-bold text-amber-600">
                        {t.frequency || 1}
                      </td>
                      <td className="px-4 py-3">
                        {t.session_id && (
                          <span className="font-mono text-[11px] text-slate-400">
                            {t.session_id.slice(0, 14)}…
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

