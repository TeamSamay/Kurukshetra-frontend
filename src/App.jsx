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
function Toast({ msg, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 6000);
    return () => clearTimeout(t);
  }, [msg, onClose]);

  return (
    <div className="fixed top-4 right-4 z-[200] max-w-sm w-full slide-right">
      <div className="card px-5 py-4 flex items-start gap-3"
        style={{ background: '#0f1629', border: '1px solid rgba(244,63,94,0.4)', boxShadow: '0 0 30px rgba(244,63,94,0.2)' }}>
        <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0 blink" style={{ background: '#fb7185' }} />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-white">ALERT</p>
          <p className="text-xs mt-0.5 break-all" style={{ color: '#94a3b8' }}>{msg}</p>
        </div>
        <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors flex-shrink-0 text-lg leading-none">✕</button>
      </div>
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

  // ── Toast helpers ─────────────────────────────────────────────────────────
  const addToast = useCallback((msg) => {
    const id = Date.now();
    setToasts(prev => [...prev.slice(-2), { id, msg }]);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // ── Data loading ──────────────────────────────────────────────────────────
  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [sum, atks, iocs, atkrs, mitre] = await Promise.allSettled([
        fetchDashboardSummary(),
        fetchAttacks(),
        fetchIOCs(),
        fetchAttackers(),
        fetchMitre(),
      ]);
      if (sum.status     === 'fulfilled' && sum.value)     setSummaryData(sum.value);
      if (atks.status    === 'fulfilled' && atks.value)    setAttacks(atks.value);
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

  // Auto-refresh every 30s
  useEffect(() => {
    const t = setInterval(loadAll, 30000);
    return () => clearInterval(t);
  }, [loadAll]);

  // ── WebSocket ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const ws = new AttackWebSocketManager(null, handleWsMsg, (ok) => setWsConnected(ok));
    ws.connect();
    return () => ws.disconnect();
  }, [selectedId]); // eslint-disable-line

  function handleWsMsg(data) {
    if (!data) return;

    if (data.type === 'POLL_TICK') {
      // Polling fallback: refresh all data
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
        // A. Update Attacks List
        setAttacks(prev => {
          const exists = prev.some(a => a.session_id === sessionId);
          if (exists) {
            return prev.map(a => (a.session_id === sessionId ? { ...a, ...sessionDoc } : a));
          }
          return [sessionDoc, ...prev];
        });

        // B. Update Dashboard Summary Metrics
        setSummaryData(prev => {
          const currentRecent = prev.recent_attacks || [];
          const updatedRecent = currentRecent.some(a => a.session_id === sessionId)
            ? currentRecent.map(a => (a.session_id === sessionId ? { ...a, ...sessionDoc } : a))
            : [sessionDoc, ...currentRecent].slice(0, 20);

          return {
            ...prev,
            total_events: (prev.total_events || 0) + 1,
            active_sessions: (sessionDoc.status === 'ACTIVE' || !sessionDoc.status)
              ? Math.max((prev.active_sessions || 0), 1)
              : prev.active_sessions,
            total_iocs: (prev.total_iocs || 0) + newIocs.length,
            recent_attacks: updatedRecent,
          };
        });

        // C. Update Active Investigation View if open
        if (selectedId === sessionId) {
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

        // F. Trigger Instant Alert Toast
        const sourceIp = eventObj.source_ip || sessionDoc.source_ip || 'Unknown Attacker';
        const svc = (eventObj.service || sessionDoc.service || 'HONEYPOT').toUpperCase();
        const action = eventObj.event || eventObj.event_type || 'Interaction detected';
        addToast(`🔴 [${svc}] ${sourceIp}: ${action.slice(0, 45)}`);
      }
    }

    // 2. Live Session Containment Event
    if (data.type === 'SESSION_CONTAINED') {
      const id = data.data?.session_id || data.session_id;
      if (id) {
        setAttacks(prev => prev.map(a => (a.session_id === id ? { ...a, status: 'CONTAINED' } : a)));
        if (selectedId === id) {
          setSession(p => (p ? { ...p, status: 'CONTAINED' } : p));
        }
        addToast(`🛡️ Session ${id.slice(0, 12)}… isolated and contained`);
      }
    }
  }

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
    command:       <CommandCenter summaryData={summaryData} loading={loading} />,
    live:          <LiveAttacks attacks={attacks} onSelectAttack={handleSelectAttack} onContain={handleContain} />,
    investigation: <AttackInvestigation sessionData={sessionDetails} onContainSession={handleContain} />,
    dna:           <AttackerDNA attackers={attackers} />,
    ioc:           <IOCIntelligence iocList={iocList} />,
    mitre:         <MitreAttack mitreData={mitreData} />,
    report:        <ThreatReport reportData={reportData} onContainSession={handleContain} />,
  };

  return (
    <>
      {/* Toast Notifications */}
      <div className="fixed top-4 right-4 z-[200] space-y-2 pointer-events-none">
        {toasts.map(t => (
          <div key={t.id} className="pointer-events-auto">
            <Toast msg={t.msg} onClose={() => removeToast(t.id)} />
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
