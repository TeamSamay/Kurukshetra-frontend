// Connects to local FastAPI backend (ws://127.0.0.1:8000/ws/attacks) in dev or Render in cloud
function getWsEndpoint() {
  if (import.meta.env.VITE_WS_URL) {
    const base = import.meta.env.VITE_WS_URL.replace(/\/$/, '');
    return `${base}/ws/attacks`;
  }
  if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
    return 'ws://127.0.0.1:8000/ws/attacks';
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
    this._polling   = false;
  }

  connect() {
    if (this._stopped) return;
    try {
      this.ws = new WebSocket(WS_ENDPOINT);

      this.ws.onopen = () => {
        this._retries   = 0;
        this._backoffMs = 2000;
        this._stopPolling();
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
        if (this.onStatus) this.onStatus(false, 'DISCONNECTED');
        this._scheduleReconnect();
      };
    } catch (e) {
      if (this.onStatus) this.onStatus(false, 'FAILED');
      this._scheduleReconnect();
    }
  }

  _scheduleReconnect() {
    if (this._stopped) return;
    this._retries++;
    if (this._retries >= MAX_RETRIES_BEFORE_POLL && !this._polling) {
      // Fall back: poll tick so App can refresh data manually
      console.warn('[WS] Falling back to poll ticks');
      this._polling = true;
      if (this.onStatus) this.onStatus(false, 'POLLING');
      this._pollTimer = setInterval(() => {
        if (this.onMessage) this.onMessage({ type: 'POLL_TICK' });
      }, POLL_INTERVAL_MS);
    } else if (!this._polling) {
      const delay = Math.min(this._backoffMs, 30000);
      this._backoffMs = Math.min(this._backoffMs * 1.5, 30000);
      setTimeout(() => this.connect(), delay);
    }
  }

  _stopPolling() {
    if (this._pollTimer) {
      clearInterval(this._pollTimer);
      this._pollTimer = null;
    }
  }

  disconnect() {
    this._stopped = true;
    this._stopPolling();
    if (this.ws) { this.ws.close(); this.ws = null; }
  }
}
