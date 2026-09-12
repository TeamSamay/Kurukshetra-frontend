import React, { useState } from 'react';
import {
  Shield, ChevronDown, ChevronUp, Terminal, Search, ExternalLink,
  Layers, AlertTriangle, CheckCircle2, X, Activity, Eye, Zap
} from 'lucide-react';

// Official MITRE ATT&CK Tactic ordering
const TACTIC_ORDER = [
  'Reconnaissance','Resource Development','Initial Access','Execution',
  'Persistence','Privilege Escalation','Defense Evasion','Credential Access',
  'Discovery','Lateral Movement','Collection','Command and Control',
  'Exfiltration','Impact',
];

const TACTIC_COLORS = {
  'Reconnaissance':       { bg: '#f5f3ff', border: '#ede9fe', text: '#7c3aed', badgeBg: '#ede9fe' },
  'Resource Development': { bg: '#eef2ff', border: '#e0e7ff', text: '#4f46e5', badgeBg: '#e0e7ff' },
  'Initial Access':       { bg: '#fef2f2', border: '#fee2e2', text: '#dc2626', badgeBg: '#fee2e2' },
  'Execution':            { bg: '#fff1f2', border: '#ffe4e6', text: '#e11d48', badgeBg: '#ffe4e6' },
  'Persistence':          { bg: '#fffbeb', border: '#fef3c7', text: '#d97706', badgeBg: '#fef3c7' },
  'Privilege Escalation': { bg: '#fff7ed', border: '#ffedd5', text: '#ea580c', badgeBg: '#ffedd5' },
  'Defense Evasion':      { bg: '#fefce8', border: '#fef9c3', text: '#ca8a04', badgeBg: '#fef9c3' },
  'Credential Access':    { bg: '#ecfdf5', border: '#d1fae5', text: '#059669', badgeBg: '#d1fae5' },
  'Discovery':            { bg: '#f0f9ff', border: '#e0f2fe', text: '#0284c7', badgeBg: '#e0f2fe' },
  'Lateral Movement':     { bg: '#eff6ff', border: '#dbeafe', text: '#2563eb', badgeBg: '#dbeafe' },
  'Collection':           { bg: '#eef2ff', border: '#e0e7ff', text: '#4f46e5', badgeBg: '#e0e7ff' },
  'Command and Control':  { bg: '#faf5ff', border: '#f3e8ff', text: '#9333ea', badgeBg: '#f3e8ff' },
  'Exfiltration':         { bg: '#fef2f2', border: '#fee2e2', text: '#dc2626', badgeBg: '#fee2e2' },
  'Impact':               { bg: '#fff1f2', border: '#ffe4e6', text: '#e11d48', badgeBg: '#ffe4e6' },
};

function defaultColor() {
  return { bg: '#f8fafc', border: '#e2e8f0', text: '#64748b', badgeBg: '#e2e8f0' };
}

// ── Technique Detail Modal ──────────────────────────────────────────────────
function TechniqueModal({ technique, onClose }) {
  if (!technique) return null;
  const tactic = technique.tactic || technique.tactic_name || 'Enterprise ATT&CK';
  const colors = TACTIC_COLORS[tactic] || defaultColor();

  const commands = Array.isArray(technique.commands)
    ? technique.commands
    : Array.isArray(technique.evidence)
    ? technique.evidence
    : technique.command ? [technique.command] : [];

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-150">
      <div className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-3xl bg-white border border-neutral-200 shadow-2xl text-neutral-900 overflow-hidden">
        {/* Header */}
        <div className="p-6 bg-neutral-900 text-white flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0">
              <Shield className="w-5 h-5 text-[#f8c858]" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-sm font-black text-[#f8c858]">
                  {technique.technique_id || technique.id || 'TXXXX'}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-white/20 text-white">
                  {tactic}
                </span>
              </div>
              <h3 className="text-lg font-bold text-white mt-1">
                {technique.technique_name || technique.name || 'MITRE Technique'}
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/10 text-neutral-400 hover:text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* Technique Description */}
          <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200">
            <h4 className="text-xs font-bold text-neutral-900 uppercase tracking-wider mb-1">
              Technique Description
            </h4>
            <p className="text-xs text-neutral-700 leading-relaxed font-sans">
              {technique.description ||
                `Adversaries may utilize ${technique.technique_name || 'this technique'} to achieve ${tactic.toLowerCase()} objectives within the target environment.`}
            </p>
          </div>

          {/* Observed Frequency & Session Info */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3.5 rounded-xl bg-neutral-50 border border-neutral-200">
              <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">Observation Frequency</span>
              <p className="text-xl font-black text-neutral-900 mt-1">{technique.frequency || technique.count || 1}×</p>
              <span className="text-[10px] text-neutral-500 font-medium">Deception Triggers</span>
            </div>

            <div className="p-3.5 rounded-xl bg-neutral-50 border border-neutral-200">
              <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">Correlated Session</span>
              <p className="font-mono text-xs font-bold text-blue-600 mt-1.5 truncate">
                {technique.session_id || 'Global Honeygrid'}
              </p>
              <span className="text-[10px] text-neutral-500 font-medium">Active Sensor</span>
            </div>
          </div>

          {/* Captured Commands & Evidence */}
          {commands.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-neutral-900 uppercase tracking-wider flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 text-neutral-700" />
                <span>Captured Honeypot Telemetry Evidence ({commands.length})</span>
              </h4>
              <div className="space-y-1.5">
                {commands.map((cmd, i) => (
                  <div key={i} className="p-2.5 rounded-xl bg-neutral-900 text-neutral-100 font-mono text-xs break-all">
                    {cmd}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Detection & Mitigation Recommendations */}
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-2">
            <h4 className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Recommended SOC Detection &amp; Mitigation</span>
            </h4>
            <ul className="text-xs text-emerald-950 space-y-1 list-disc list-inside">
              <li>Audit authentication telemetry for sudden frequency surges.</li>
              <li>Deploy honeytoken canaries to alert instantly on unauthorized access.</li>
              <li>Enforce least-privilege network segmentation across microservices.</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-neutral-50 border-t border-neutral-200 flex justify-between items-center text-xs text-neutral-500">
          <span>TRINETRA MITRE ATT&amp;CK Mapping</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-full bg-neutral-900 text-white font-bold hover:bg-neutral-800 transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Technique Card ──────────────────────────────────────────────────────────
function TechniqueCard({ technique, onOpenDetail }) {
  const [expanded, setExpanded] = useState(false);
  const tactic = technique.tactic || technique.tactic_name || 'Unknown';
  const colors  = TACTIC_COLORS[tactic] || defaultColor();

  const commands = Array.isArray(technique.commands)
    ? technique.commands
    : Array.isArray(technique.evidence)
    ? technique.evidence
    : technique.command ? [technique.command] : [];

  return (
    <div
      className="rounded-2xl overflow-hidden transition-all shadow-2xs hover:shadow-xs"
      style={{ background: colors.bg, border: `1px solid ${colors.border}` }}
    >
      <div className="p-3.5 flex flex-col gap-2">
        <div className="flex items-start justify-between gap-2">
          <button
            onClick={() => onOpenDetail(technique)}
            className="text-left flex-1 min-w-0 group cursor-pointer"
            title="Click for full technique details"
          >
            <span
              className="text-[11px] font-black font-mono px-2 py-0.5 rounded-md inline-block mb-1"
              style={{ background: colors.badgeBg, color: colors.text }}
            >
              {technique.technique_id || technique.id || '—'}
            </span>
            <p className="text-xs font-bold text-neutral-900 group-hover:text-blue-600 transition leading-snug break-words">
              {technique.technique_name || technique.name || 'Unknown Technique'}
            </p>
          </button>

          {commands.length > 0 && (
            <button
              onClick={() => setExpanded(v => !v)}
              className="p-1 rounded-md hover:bg-black/5 text-neutral-400 hover:text-neutral-700 transition cursor-pointer"
              title="Toggle evidence preview"
            >
              {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          )}
        </div>

        <div className="flex items-center justify-between text-[10px] text-neutral-500 pt-1 border-t border-black/5">
          <span>Observed {technique.frequency || technique.count || 1}×</span>
          <button
            onClick={() => onOpenDetail(technique)}
            className="font-bold text-blue-600 hover:underline flex items-center gap-0.5 cursor-pointer"
          >
            <span>Intel</span>
            <ExternalLink className="w-2.5 h-2.5" />
          </button>
        </div>
      </div>

      {expanded && commands.length > 0 && (
        <div className="px-3 pb-3 space-y-1.5 border-t border-black/5 bg-white/70">
          <p className="text-[9px] font-bold tracking-widest uppercase mt-2 text-neutral-400">Captured Telemetry</p>
          {commands.slice(0, 3).map((cmd, i) => (
            <div key={i} className="flex items-start gap-1.5 px-2 py-1 rounded-md bg-neutral-900 text-white font-mono text-[10px] break-all">
              <Terminal className="w-2.5 h-2.5 text-[#f8c858] mt-0.5 flex-shrink-0" />
              <span>{cmd}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TacticColumn({ tactic, techniques = [], onOpenDetail }) {
  const colors = TACTIC_COLORS[tactic] || defaultColor();
  return (
    <div className="crextio-card p-4 min-w-[240px] flex-1 flex flex-col justify-start">
      <div className="mb-3 pb-2.5 border-b-2" style={{ borderBottomColor: colors.border }}>
        <p className="text-xs font-black tracking-wide" style={{ color: colors.text }}>{tactic}</p>
        <p className="text-[10px] mt-0.5 text-neutral-400 font-medium">
          {techniques.length} technique{techniques.length !== 1 ? 's' : ''} mapped
        </p>
      </div>
      <div className="space-y-2.5">
        {techniques.map((t, i) => (
          <TechniqueCard
            key={t.technique_id || i}
            technique={t}
            onOpenDetail={onOpenDetail}
          />
        ))}
      </div>
    </div>
  );
}

export default function MitreAttack({ mitreData = [] }) {
  const [query, setQuery] = useState('');
  const [selectedTechnique, setSelectedTechnique] = useState(null);

  // Group techniques safely by tactic
  const grouped = {};
  const safeData = Array.isArray(mitreData) ? mitreData : [];

  const filtered = safeData.filter(t => {
    if (!t) return false;
    const q = query.toLowerCase();
    return !q
      || (t.technique_id || '').toLowerCase().includes(q)
      || (t.technique_name || t.name || '').toLowerCase().includes(q)
      || (t.tactic || '').toLowerCase().includes(q);
  });

  filtered.forEach(t => {
    const tactic = t.tactic || t.tactic_name || 'Credential Access';
    if (!grouped[tactic]) grouped[tactic] = [];
    grouped[tactic].push(t);
  });

  // Ensure known tactics are present if data is available
  const sortedTactics = Object.keys(grouped).sort((a, b) => {
    const ai = TACTIC_ORDER.indexOf(a);
    const bi = TACTIC_ORDER.indexOf(b);
    if (ai === -1 && bi === -1) return a.localeCompare(b);
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });

  const totalTechniques = safeData.length;
  const totalTactics = Object.keys(grouped).length;

  return (
    <div className="space-y-6 fade-in pb-16">

      {/* Detail Modal */}
      {selectedTechnique && (
        <TechniqueModal
          technique={selectedTechnique}
          onClose={() => setSelectedTechnique(null)}
        />
      )}

      {/* Header Banner */}
      <div className="crextio-card p-5 sm:p-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center flex-shrink-0">
            <Shield className="w-5 h-5 text-rose-600" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-black text-neutral-900">MITRE ATT&amp;CK® Enterprise Matrix</h2>
            <p className="text-xs text-neutral-500 mt-0.5">
              {totalTechniques} techniques mapped across {totalTactics} tactics from autonomous deception telemetry
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-neutral-400" />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search technique ID or name..."
              className="input-crextio w-64 text-xs py-2"
            />
          </div>
        </div>
      </div>

      {/* Matrix Metric Ribbon */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Observed Techniques', value: totalTechniques, color: '#e11d48' },
          { label: 'Tactics Triggered', value: totalTactics, color: '#d97706' },
          { label: 'Max Tactic Frequency', value: safeData.reduce((m, t) => Math.max(m, t?.frequency || 1), 0), color: '#7c3aed' },
          { label: 'Correlated Sessions', value: new Set(safeData.map(t => t?.session_id).filter(Boolean)).size || 1, color: '#0284c7' },
        ].map(s => (
          <div key={s.label} className="crextio-card p-5 text-center">
            <p className="text-3xl font-light text-neutral-900">{s.value}</p>
            <p className="text-xs font-medium text-neutral-500 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Matrix Grid */}
      {sortedTactics.length === 0 ? (
        <div className="crextio-card py-20 flex flex-col items-center gap-4 text-center">
          <Shield className="w-12 h-12 text-neutral-300" />
          <div>
            <p className="text-base font-bold text-neutral-800">No ATT&amp;CK techniques mapped yet</p>
            <p className="text-xs mt-1 text-neutral-400">
              Techniques are automatically mapped in real-time as honeypot interactions occur.
            </p>
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto pb-4">
          <div className="flex gap-4 items-start" style={{ minWidth: `${Math.max(sortedTactics.length * 260, 900)}px` }}>
            {sortedTactics.map(tactic => (
              <TacticColumn
                key={tactic}
                tactic={tactic}
                techniques={grouped[tactic]}
                onOpenDetail={setSelectedTechnique}
              />
            ))}
          </div>
        </div>
      )}

      {/* Complete Techniques Table View */}
      {sortedTactics.length > 0 && (
        <div className="crextio-card overflow-hidden">
          <div className="p-5 border-b border-neutral-100 flex items-center justify-between">
            <h3 className="text-sm font-bold text-neutral-900">Observed TTP Intelligence Register</h3>
            <span className="text-xs text-neutral-500 font-medium">Click any technique row for forensic breakdown</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-neutral-50 border-b border-neutral-100 text-neutral-500 font-semibold">
                <tr>
                  <th className="px-5 py-3.5">Technique ID</th>
                  <th className="px-5 py-3.5">Technique Name</th>
                  <th className="px-5 py-3.5">Tactic</th>
                  <th className="px-5 py-3.5">Frequency</th>
                  <th className="px-5 py-3.5">Correlated Session</th>
                  <th className="px-5 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {filtered.map((t, i) => {
                  const tactic = t.tactic || 'Other';
                  const c = TACTIC_COLORS[tactic] || defaultColor();
                  return (
                    <tr
                      key={t.technique_id || i}
                      onClick={() => setSelectedTechnique(t)}
                      className="hover:bg-neutral-50/80 transition cursor-pointer"
                    >
                      <td className="px-5 py-3.5">
                        <span className="font-mono font-bold text-xs" style={{ color: c.text }}>
                          {t.technique_id || '—'}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 font-bold text-neutral-900">
                        {t.technique_name || t.name || '—'}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full"
                          style={{ background: c.bg, border: `1px solid ${c.border}`, color: c.text }}>
                          {tactic}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 font-bold text-amber-600">
                        {t.frequency || t.count || 1}×
                      </td>
                      <td className="px-5 py-3.5 font-mono text-neutral-500">
                        {t.session_id ? t.session_id.slice(0, 16) : 'Honeygrid'}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <span className="text-blue-600 font-bold hover:underline">
                          View Intel →
                        </span>
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
