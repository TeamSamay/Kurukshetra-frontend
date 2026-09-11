// Connects to live Render WebSocket (wss://kurukshetra-backend.onrender.com/ws/attacks) by default
export function getWsEndpoint() {
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    // On Vercel or any remote production domain (HTTPS), ALWAYS use secure WSS Render backend
    if (host.includes('vercel.app') || (host !== 'localhost' && host !== '127.0.0.1' && !host.startsWith('192.168.'))) {
      return 'wss://kurukshetra-backend.onrender.com/ws/attacks';
    }
  }
  if (import.meta.env.VITE_WS_URL && !import.meta.env.VITE_WS_URL.includes('127.0.0.1') && !import.meta.env.VITE_WS_URL.includes('localhost')) {
    const base = import.meta.env.VITE_WS_URL.replace(/\/$/, '');
    return `${base}/ws/attacks`;
  }
  return 'wss://kurukshetra-backend.onrender.com/ws/attacks';
}

const WS_ENDPOINT = getWsEndpoint();
const MAX_RETRIES_BEFORE_POLL = 5;
const POLL_INTERVAL_MS = 10000;

export class AttackWebSocketManager {
  constructor(_unused, onMessage, onStatus) {
    this.onMessage  = onMessage;
    this.onStatus   = onStatus;
    this.ws         = null;
    this._stopped   = false;
    this._retries   = 0;
    this._backoffMs = 2000;
    this._pollTimer = null;
    this._pingTimer = null;
    this._polling   = false;
  }

  connect() {
    if (this._stopped) return;
    try {
      const endpoint = getWsEndpoint();
      this.ws = new WebSocket(endpoint);

      this.ws.onopen = () => {
        this._retries   = 0;
        this._backoffMs = 2000;
        this._stopPolling();
        this._startPing();
        this._polling = false;
        if (this.onStatus) this.onStatus(true, 'CONNECTED');
      };

      this.ws.onmessage = (ev) => {
        try {
          const data = JSON.parse(ev.data);
          if (this.onMessage) this.onMessage(data);
        } catch (e) {
          console.warn('[WS] JSON parse error:', e);
        }
      };

      this.ws.onerror = () => {
        if (this.onStatus) this.onStatus(false, 'ERROR');
      };

      this.ws.onclose = () => {
        this._stopPing();
        if (this.onStatus) this.onStatus(false, 'DISCONNECTED');
        this._scheduleReconnect();
      };
    } catch (e) {
      this._stopPing();
      if (this.onStatus) this.onStatus(false, 'FAILED');
      this._scheduleReconnect();
    }
  }

  _startPing() {
    this._stopPing();
    // Send keepalive ping every 15s to prevent Render cloud proxy timeout
    this._pingTimer = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        try {
          this.ws.send(JSON.stringify({ type: 'PING' }));
        } catch {}
      }
    }, 15000);
  }

  _stopPing() {
    if (this._pingTimer) {
      clearInterval(this._pingTimer);
      this._pingTimer = null;
    }
  }

  _scheduleReconnect() {
    if (this._stopped) return;
    this._retries++;
    const delay = Math.min(this._backoffMs, 8000);
    this._backoffMs = Math.min(this._backoffMs * 1.3, 8000);
    setTimeout(() => {
      if (!this._stopped) this.connect();
    }, delay);
  }

  _stopPolling() {
    if (this._pollTimer) {
      clearInterval(this._pollTimer);
      this._pollTimer = null;
    }
  }

  disconnect() {
    this._stopped = true;
    this._stopPing();
    this._stopPolling();
    if (this.ws) {
      try { this.ws.close(); } catch {}
      this.ws = null;
    }
  }
}
