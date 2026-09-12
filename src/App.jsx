import React, { useState, useEffect, useCallback, Component } from 'react';
import Layout from './components/Layout';
import CommandCenter from './components/CommandCenter';
import LiveAttacks from './components/LiveAttacks';
import AttackInvestigation from './components/AttackInvestigation';
import AttackerDNA from './components/AttackerDNA';
import IOCIntelligence from './components/IOCIntelligence';
import MitreAttack from './components/MitreAttack';
import ThreatReport from './components/ThreatReport';
import SafeSandboxTerminal from './components/SafeSandboxTerminal';
import AttackerIntelModal from './components/AttackerIntelModal';
import NotificationCenter from './components/NotificationCenter';

import {
  fetchDashboardSummary, fetchAttacks, fetchSessionDetails,
  fetchIOCs, fetchAttackers, fetchMitre, fetchReport, containSession,
  getCached,
} from './services/api';
import { AttackWebSocketManager } from './services/websocket';
import { ShieldAlert, Zap, Lock, X, RefreshCw } from 'lucide-react';

// ─── Error Boundary to Prevent White Screen ──────────────────────────────────
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error('TRINETRA ErrorBoundary caught:', error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#f6f6f2] flex flex-col items-center justify-center p-6 text-center text-neutral-900">
          <div className="w-16 h-16 rounded-3xl bg-rose-50 border border-rose-200 flex items-center justify-center mb-4">
            <ShieldAlert className="w-8 h-8 text-rose-600" />
          </div>
          <h2 className="text-xl font-bold">TRINETRA Cyber Defense Grid Interface Protected</h2>
          <p className="text-xs text-neutral-500 max-w-md mt-2">
            A rendering exception was safely intercepted. Click below to restore live telemetry view.
          </p>
          <button
            onClick={() => {
              this.setState({ hasError: false });
              window.location.reload();
            }}
            className="mt-5 px-5 py-2.5 rounded-full bg-neutral-900 text-white text-xs font-bold hover:bg-neutral-800 transition flex items-center gap-2 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Reload Platform Interface</span>
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// ─── Modern Enterprise Cyber Toast ──────────────────────────────────────────
function Toast({ msg, title = 'SECURITY EVENT', onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 5000);
    return () => clearTimeout(t);
  }, [msg, onClose]);

  const isContainment = title.includes('CONTAINMENT');
  const isCritical = title.includes('CRITICAL') || title.includes('ATTACK');

  return (
    <div className="w-full max-w-sm rounded-2xl p-3.5 flex items-start gap-3 bg-white/95 backdrop-blur-md text-neutral-900 border border-neutral-200/80 shadow-xl slide-right transition-all">
      <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${
        isContainment ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' :
        isCritical ? 'bg-rose-50 text-rose-600 border border-rose-200' : 'bg-amber-50 text-amber-600 border border-amber-200'
      }`}>
        {isContainment ? <Lock className="w-4 h-4" /> : <ShieldAlert className="w-4 h-4" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
            isContainment ? 'bg-emerald-100 text-emerald-800' :
            isCritical ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
          }`}>
            {title}
          </span>
        </div>
        <p className="text-xs mt-1 font-mono text-neutral-700 truncate leading-snug">{msg}</p>
      </div>
      <button onClick={onClose} className="text-neutral-400 hover:text-neutral-700 transition-colors p-1 cursor-pointer">
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

export default function App() {
  const [activeTab, setActiveTab]             = useState('command');
  const [wsConnected, setWsConnected]         = useState(false);
  const [summaryData, setSummaryData]         = useState(() => getCached('dashboard_summary') || {});
  const [attacks, setAttacks]                 = useState(() => getCached('attacks_list') || []);
  const [selectedId, setSelectedId]           = useState(null);
  const [sessionDetails, setSession]          = useState(null);
  const [iocList, setIocList]                 = useState(() => getCached('iocs_list') || []);
  const [attackers, setAttackers]             = useState(() => getCached('attackers_list') || []);
  const [mitreData, setMitreData]             = useState(() => getCached('mitre_list') || []);
  const [reportData, setReportData]           = useState(null);
  const [toasts, setToasts]                   = useState([]);
  const [loading, setLoading]                 = useState(false);
  const [showSandbox, setShowSandbox]         = useState(false);
  const [selectedIntelIp, setSelectedIntelIp] = useState(null);
  const [showNotifications, setShowNotifications] = useState(false);

  const selectedIdRef = React.useRef(selectedId);
  selectedIdRef.current = selectedId;
  const lastToastTimeRef = React.useRef(0);

  // ── Toast helpers with rate-limiting ──────────────────────────────────────
  const addToast = useCallback((msg, title = 'SECURITY ALERT') => {
    const now = Date.now();
    // Rate limit toasts to maximum 1 every 2.5s to avoid flood
    if (now - lastToastTimeRef.current < 2500) {
      return;
    }
    lastToastTimeRef.current = now;

    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } catch {}
    setToasts(prev => [...prev.slice(-2), { id: now, msg, title }]);
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
      if (sum.status === 'fulfilled' && sum.value) {
        setSummaryData(prev => ({
          ...sum.value,
          total_events: Math.max(sum.value.total_events ?? 0, prev.total_events ?? 0),
          total_sessions: Math.max(sum.value.total_sessions ?? 0, prev.total_sessions ?? 0),
          total_iocs: Math.max(sum.value.total_iocs ?? 0, prev.total_iocs ?? 0),
          recent_attacks: sum.value.recent_attacks || prev.recent_attacks || [],
        }));
      }
      if (atks.status === 'fulfilled' && atks.value) {
        setAttacks(atks.value);

        // Auto-select first session if none selected yet
        if (!selectedIdRef.current && atks.value.length > 0) {
          setSelectedId(atks.value[0].session_id);
        }
      }
      if (iocs.status  === 'fulfilled' && iocs.value)  setIocList(iocs.value);
      if (atkrs.status === 'fulfilled' && atkrs.value) setAttackers(atkrs.value);
      if (mitre.status === 'fulfilled' && mitre.value) setMitreData(mitre.value);
    } catch (e) {
      console.error('[App] Data load failed:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadSession = useCallback(async (id) => {
    if (!id) return;
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

  // Load session when selected or when switching to investigation/reports
  useEffect(() => {
    if (selectedId) {
      loadSession(selectedId);
    } else if (attacks.length > 0 && (activeTab === 'investigation' || activeTab === 'report')) {
      const firstId = attacks[0].session_id;
      setSelectedId(firstId);
      loadSession(firstId);
    }
  }, [selectedId, activeTab, attacks, loadSession]);

  // Background sync every 6s
  useEffect(() => {
    const t = setInterval(loadAll, 6000);
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
          source_ip: sessionDoc.source_ip || eventObj.source_ip || '198.51.100.88',
          service: sessionDoc.service || eventObj.service || 'ssh',
          status: sessionDoc.status || 'ACTIVE',
          risk_level: sessionDoc.risk_level || 'HIGH',
          event: eventObj.event || eventObj.event_type || 'Interaction detected',
        };

        // A. Update Attacks List
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
          const svc = (normalizedSession.service || 'ssh').toLowerCase();
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
        const actLower = action.toLowerCase();

        const isNoise = actLower.includes('closed') || actLower.includes('disconnected') || actLower.includes('handshake') || actLower.includes('probe') || actLower.includes('-> 307') || actLower.includes('-> 200') || actLower.includes('get / ') || actLower.includes('get /login') || actLower.includes('started');
        if (!isNoise) {
          addToast(`${sourceIp} → ${action.slice(0, 48)}`, `LIVE ${svc} ATTACK`);
        }
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
    command:       <CommandCenter summaryData={summaryData} attacks={attacks} loading={loading} onSelectAttack={handleSelectAttack} onContain={handleContain} onSelectIp={setSelectedIntelIp} />,
    live:          <LiveAttacks attacks={attacks} onSelectAttack={handleSelectAttack} onContain={handleContain} onSelectIp={setSelectedIntelIp} />,
    investigation: <AttackInvestigation sessionData={sessionDetails} onContainSession={handleContain} />,
    dna:           <AttackerDNA attackers={attackers} />,
    ioc:           <IOCIntelligence iocList={iocList} onSelectIp={setSelectedIntelIp} />,
    mitre:         <MitreAttack mitreData={mitreData} />,
    report:        <ThreatReport reportData={reportData} onContainSession={handleContain} attacks={attacks} onSelectIp={setSelectedIntelIp} />,
  };

  return (
    <ErrorBoundary>
      {/* Toast Notifications */}
      <div className="fixed bottom-6 right-6 z-[200] space-y-2 pointer-events-none max-w-sm w-full print:hidden">
        {toasts.map(t => (
          <div key={t.id} className="pointer-events-auto">
            <Toast msg={t.msg} title={t.title} onClose={() => removeToast(t.id)} />
          </div>
        ))}
      </div>

      {/* Safe Attacker Sandbox Terminal Modal */}
      {showSandbox && (
        <SafeSandboxTerminal
          onClose={() => setShowSandbox(false)}
          onEventIngested={() => loadAll()}
        />
      )}

      {/* 360-Degree Attacker IP Intelligence Modal */}
      {selectedIntelIp && (
        <AttackerIntelModal
          ip={selectedIntelIp}
          sessionData={sessionDetails}
          attacks={attacks}
          onClose={() => setSelectedIntelIp(null)}
          onContain={handleContain}
        />
      )}

      {/* Full Notification Center Drawer */}
      <NotificationCenter
        isOpen={showNotifications}
        onClose={() => setShowNotifications(false)}
        attacks={attacks}
        onSelectAttack={handleSelectAttack}
        onSelectIp={setSelectedIntelIp}
        onClearAll={() => setAttacks(prev => prev.map(a => ({ ...a, status: 'CONTAINED' })))}
      />

      <Layout
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        wsConnected={wsConnected}
        activeAttackCount={activeAttackCount}
        onOpenSandbox={() => setShowSandbox(true)}
        onOpenNotifications={() => setShowNotifications(true)}
        notificationCount={activeAttackCount || attacks.length || 3}
      >
        {pages[activeTab]}
      </Layout>
    </ErrorBoundary>
  );
}
