import React, { useState, useEffect, useCallback } from 'react';
import Layout from './components/Layout';
import CommandCenter from './components/CommandCenter';
import LiveAttacks from './components/LiveAttacks';
import AttackInvestigation from './components/AttackInvestigation';
import AttackerDNA from './components/AttackerDNA';
import IOCIntelligence from './components/IOCIntelligence';
import MitreAttack from './components/MitreAttack';
import ThreatReport from './components/ThreatReport';

import {
  fetchDashboardSummary, fetchAttacks, fetchSessionDetails,
  fetchIOCs, fetchAttackers, fetchMitre, fetchReport, containSession,
} from './services/api';
import { AttackWebSocketManager } from './services/websocket';

// ─── Toast Notification ───────────────────────────────────────────────────────
function Toast({ msg, title = 'SECURITY ALERT', onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 6000);
    return () => clearTimeout(t);
  }, [msg, onClose]);

  return (
    <div className="w-full max-w-sm rounded-2xl p-3.5 flex items-start gap-3 bg-[#1e1e22] text-white border border-rose-500/40 shadow-2xl slide-right">
      <div className="w-2.5 h-2.5 rounded-full mt-1 flex-shrink-0 bg-rose-500 blink" />
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-bold text-rose-400 tracking-wider font-mono uppercase">{title}</p>
        <p className="text-xs mt-0.5 text-neutral-200 font-mono break-all leading-snug">{msg}</p>
      </div>
      <button onClick={onClose} className="text-neutral-400 hover:text-white transition-colors flex-shrink-0 text-sm font-bold cursor-pointer">✕</button>
    </div>
  );
}

export default function App() {
  const [activeTab, setActiveTab]       = useState('command');
  const [wsConnected, setWsConnected]   = useState(false);
  const [summaryData, setSummaryData]   = useState({});
  const [attacks, setAttacks]           = useState([]);
  const [selectedId, setSelectedId]     = useState(null);
  const [sessionDetails, setSession]    = useState(null);
  const [iocList, setIocList]           = useState([]);
  const [attackers, setAttackers]       = useState([]);
  const [mitreData, setMitreData]       = useState([]);
  const [reportData, setReportData]     = useState(null);
  const [toasts, setToasts]             = useState([]);
  const [loading, setLoading]           = useState(true);

  const selectedIdRef = React.useRef(selectedId);
  selectedIdRef.current = selectedId;

  // ── Toast helpers ─────────────────────────────────────────────────────────
  const addToast = useCallback((msg, title = 'SECURITY ALERT') => {
    const id = Date.now();
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.2);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.2);
    } catch {}
    setToasts(prev => [...prev.slice(-3), { id, msg, title }]);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // ── Data loading ──────────────────────────────────────────────────────────
  const loadAll = useCallback(async () => {
    try {
      const [sum, atks, iocs, atkrs, mitre] = await Promise.allSettled([
        fetchDashboardSummary(),
        fetchAttacks(),
        fetchIOCs(),
        fetchAttackers(),
        fetchMitre(),
      ]);
      if (sum.status     === 'fulfilled' && sum.value) {
        setSummaryData(prev => ({
          ...sum.value,
          total_events: Math.max(sum.value.total_events ?? 0, prev.total_events ?? 0),
          total_sessions: Math.max(sum.value.total_sessions ?? 0, prev.total_sessions ?? 0),
          total_iocs: Math.max(sum.value.total_iocs ?? 0, prev.total_iocs ?? 0),
          recent_attacks: (prev.recent_attacks && prev.recent_attacks.length > 0)
            ? [
                ...prev.recent_attacks.slice(0, 3),
                ...(sum.value.recent_attacks || []).filter(sa => !prev.recent_attacks.slice(0, 3).some(pa => pa.session_id === sa.session_id))
              ].slice(0, 20)
            : (sum.value.recent_attacks || []),
        }));
      }
      if (atks.status    === 'fulfilled' && atks.value) {
        setAttacks(prev => {
          if (!prev || prev.length === 0) return atks.value;
          const recentTop = prev.slice(0, 3);
          const remaining = atks.value.filter(a => !recentTop.some(r => r.session_id === a.session_id));
          return [...recentTop, ...remaining];
        });
      }
      if (iocs.status    === 'fulfilled' && iocs.value)    setIocList(iocs.value);
      if (atkrs.status   === 'fulfilled' && atkrs.value)   setAttackers(atkrs.value);
      if (mitre.status   === 'fulfilled' && mitre.value)   setMitreData(mitre.value);
    } catch (e) {
      console.error('[App] Data load failed:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadSession = useCallback(async (id) => {
    try {
      const [sess, rep] = await Promise.allSettled([
        fetchSessionDetails(id),
        fetchReport(id),
      ]);
      if (sess.status === 'fulfilled' && sess.value) setSession(sess.value);
      if (rep.status  === 'fulfilled' && rep.value)  setReportData(rep.value);
    } catch (e) {
      console.error('[App] Session load failed:', e);
    }
  }, []);

  // Initial load
  useEffect(() => { loadAll(); }, [loadAll]);

  // Load session when selected
  useEffect(() => { if (selectedId) loadSession(selectedId); }, [selectedId, loadSession]);

  // Fast background auto-refresh every 5s for guaranteed sync
  useEffect(() => {
    const t = setInterval(loadAll, 5000);
    return () => clearInterval(t);
  }, [loadAll]);

  // ── WebSocket Handler ─────────────────────────────────────────────────────
  const handleWsMsgRef = React.useRef();
  handleWsMsgRef.current = (data) => {
    if (!data) return;

    if (data.type === 'POLL_TICK') {
      loadAll();
      return;
    }

    // 1. Live Honeypot Telemetry / Attack Event
    if (data.type === 'NEW_EVENT' || data.type === 'NEW_ATTACK_EVENT' || data.type === 'new_attack') {
      const payloadData = data.data || {};
      const eventObj = payloadData.event || data.event || data;
      const sessionDoc = payloadData.session || data.session || eventObj;
      const newIocs = payloadData.extracted_iocs || [];
      const newMitre = payloadData.mitre_matches || [];

      const sessionId = sessionDoc.session_id || eventObj.session_id;

      if (sessionId) {
        const nowIso = eventObj.timestamp || sessionDoc.last_seen || new Date().toISOString();
        const normalizedSession = {
          ...sessionDoc,
          session_id: sessionId,
          timestamp: nowIso,
          last_seen: nowIso,
          source_ip: sessionDoc.source_ip || eventObj.source_ip || 'Unknown Attacker',
          service: sessionDoc.service || eventObj.service || 'web',
          status: sessionDoc.status || 'ACTIVE',
          risk_level: sessionDoc.risk_level || 'HIGH',
          event: eventObj.event || eventObj.event_type || 'Interaction detected',
        };

        // A. Update Attacks List: Always move the active/updated attack to the very TOP (index 0)
        setAttacks(prev => {
          const filtered = prev.filter(a => a.session_id !== sessionId);
          return [normalizedSession, ...filtered];
        });

        // B. Update Dashboard Summary Metrics INSTANTLY on frame
        setSummaryData(prev => {
          const currentRecent = prev.recent_attacks || [];
          const filteredRecent = currentRecent.filter(a => a.session_id !== sessionId);
          const updatedRecent = [normalizedSession, ...filteredRecent].slice(0, 20);

          const isNewSession = !currentRecent.some(a => a.session_id === sessionId);
          const svc = (normalizedSession.service || 'web').toLowerCase();
          const prevDist = prev.service_distribution || { ssh: 0, http: 0, web: 0, api: 0, ftp: 0 };
          const updatedDist = {
            ...prevDist,
            [svc]: (prevDist[svc] || 0) + 1,
          };

          return {
            ...prev,
            total_sessions: (prev.total_sessions || 0) + (isNewSession ? 1 : 0),
            total_events: (prev.total_events || 0) + 1,
            active_sessions: (normalizedSession.status === 'ACTIVE')
              ? Math.max((prev.active_sessions || 0) + (isNewSession ? 1 : 0), 1)
              : prev.active_sessions,
            total_iocs: (prev.total_iocs || 0) + newIocs.length,
            recent_attacks: updatedRecent,
            service_distribution: updatedDist,
          };
        });

        // C. Update Active Investigation View if open
        const curSelectedId = selectedIdRef.current;
        if (curSelectedId === sessionId) {
          setSession(prev => {
            if (!prev) return prev;
            const updatedEvents = prev.events ? [...prev.events, eventObj] : [eventObj];
            const updatedIocs = prev.iocs ? [...prev.iocs, ...newIocs] : newIocs;
            const updatedMitre = prev.mitre_mappings ? [...prev.mitre_mappings, ...newMitre] : newMitre;
            return {
              ...prev,
              ...sessionDoc,
              events: updatedEvents,
              iocs: updatedIocs,
              mitre_mappings: updatedMitre,
              risk_score: sessionDoc.risk_score ?? prev.risk_score,
              risk_level: sessionDoc.risk_level ?? prev.risk_level,
            };
          });
        }

        // D. Update IOC Intelligence View
        if (newIocs.length > 0) {
          setIocList(prev => [...newIocs, ...prev]);
        }

        // E. Update MITRE ATT&CK View
        if (newMitre.length > 0) {
          setMitreData(prev => [...newMitre, ...prev]);
        }

        // F. Trigger Instant Alert Toast & Sound
        const sourceIp = eventObj.source_ip || sessionDoc.source_ip || 'Unknown Attacker';
        const svc = (eventObj.service || sessionDoc.service || 'HONEYPOT').toUpperCase();
        const action = eventObj.event || eventObj.event_type || 'Interaction detected';
        addToast(`${sourceIp} → ${action.slice(0, 50)}`, `🚨 LIVE ${svc} ATTACK`);
      }
    }

    // 2. Live Session Containment Event
    if (data.type === 'SESSION_CONTAINED') {
      const id = data.data?.session_id || data.session_id;
      if (id) {
        setAttacks(prev => prev.map(a => (a.session_id === id ? { ...a, status: 'CONTAINED' } : a)));
        if (selectedIdRef.current === id) {
          setSession(p => (p ? { ...p, status: 'CONTAINED' } : p));
        }
        addToast(`Session ${id.slice(0, 12)}… isolated and contained`, '🛡️ CONTAINMENT ACTION');
      }
    }
  };

  // Connect WebSocket ONCE on mount
  useEffect(() => {
    const ws = new AttackWebSocketManager(null, (data) => {
      if (handleWsMsgRef.current) handleWsMsgRef.current(data);
    }, (ok) => setWsConnected(ok));

    ws.connect();
    return () => ws.disconnect();
  }, []);

  // ── Actions ────────────────────────────────────────────────────────────────
  function handleSelectAttack(id) {
    setSelectedId(id);
    setActiveTab('investigation');
  }

  async function handleContain(id) {
    try {
      await containSession(id);
      setAttacks(prev => prev.map(a => a.session_id === id ? { ...a, status: 'CONTAINED' } : a));
      if (sessionDetails?.session_id === id) setSession(p => ({ ...p, status: 'CONTAINED' }));
      if (reportData?.session_id    === id) setReportData(p => ({ ...p, containment_status: 'CONTAINED' }));
      addToast(`Session ${id.slice(0,12)}… contained successfully`);
    } catch (e) {
      addToast(`Containment failed: ${e.message}`);
    }
  }

  const activeAttackCount = attacks.filter(a => (a.status || '').toUpperCase() === 'ACTIVE').length;

  const pages = {
    command:       <CommandCenter summaryData={summaryData} attacks={attacks} loading={loading} onSelectAttack={handleSelectAttack} onContain={handleContain} />,
    live:          <LiveAttacks attacks={attacks} onSelectAttack={handleSelectAttack} onContain={handleContain} />,
    investigation: <AttackInvestigation sessionData={sessionDetails} onContainSession={handleContain} />,
    dna:           <AttackerDNA attackers={attackers} />,
    ioc:           <IOCIntelligence iocList={iocList} />,
    mitre:         <MitreAttack mitreData={mitreData} />,
    report:        <ThreatReport reportData={reportData} onContainSession={handleContain} />,
  };

  return (
    <>
      {/* Toast Notifications - Clean bottom-right positioning */}
      <div className="fixed bottom-6 right-6 z-[200] space-y-2 pointer-events-none max-w-sm w-full">
        {toasts.map(t => (
          <div key={t.id} className="pointer-events-auto">
            <Toast msg={t.msg} title={t.title} onClose={() => removeToast(t.id)} />
          </div>
        ))}
      </div>

      <Layout
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        wsConnected={wsConnected}
        activeAttackCount={activeAttackCount}
      >
        {pages[activeTab]}
      </Layout>
    </>
  );
}
