'use strict';
// ============================================================
//  Netzwerk
//  1) SC.Net       – Direkt-Duell per PeerJS (WebRTC, Raumcode, kein eigener Server nötig)
//  2) SC.ServerNet – Verbindung zum eigenen Spiel-Server (WebSocket)
// ============================================================
SC.Net = class Net {
  constructor() {
    this.peer = null;
    this.conn = null;
    this.onmsg = null;
    this.onclose = null;
    this.isHost = false;
  }
  static load() {
    if (window.Peer) return Promise.resolve();
    return new Promise((res, rej) => {
      const s = document.createElement('script');
      s.src = 'https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js';
      s.crossOrigin = 'anonymous';
      s.onload = () => res();
      s.onerror = () => rej(new Error('PeerJS konnte nicht geladen werden (Internet?)'));
      document.head.appendChild(s);
    });
  }
  static code() {
    const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const r = new Uint32Array(4);
    crypto.getRandomValues(r);
    let c = '';
    for (let i = 0; i < 4; i++) c += A[r[i] % A.length];
    return c;
  }
  async host(onCode, onConnect, onError) {
    await SC.Net.load();
    this.isHost = true;
    const code = SC.Net.code();
    this.peer = new window.Peer('scherenschlacht-v2-' + code);
    this.peer.on('open', () => onCode(code));
    this.peer.on('connection', (c) => {
      if (this.conn) {
        c.close();
        return;
      }
      this.bind(c);
      c.on('open', () => onConnect());
    });
    this.peer.on('error', (e) => onError(e));
  }
  async join(code, onConnect, onError) {
    await SC.Net.load();
    this.isHost = false;
    this.peer = new window.Peer();
    this.peer.on('open', () => {
      const c = this.peer.connect('scherenschlacht-v2-' + code.toUpperCase(), { reliable: true });
      this.bind(c);
      c.on('open', () => onConnect());
    });
    this.peer.on('error', (e) => onError(e));
  }
  bind(c) {
    this.conn = c;
    c.on('data', (d) => this.onmsg && this.onmsg(d));
    c.on('close', () => this.onclose && this.onclose());
    c.on('error', () => this.onclose && this.onclose());
  }
  send(o) {
    if (this.conn && this.conn.open) this.conn.send(o);
  }
  close() {
    try {
      if (this.conn) this.conn.close();
      if (this.peer) this.peer.destroy();
    } catch (e) {}
    this.conn = null;
    this.peer = null;
  }
};

// ------------------------------------------------------------
//  Eigener Server: Konto, Matchmaking, Räume und verbindliche Partien
// ------------------------------------------------------------
SC.ServerNet = class ServerNet {
  constructor() {
    this.ws = null;
    this.handlers = {};
    this.seq = 0;
    this.offset = 0;
    this.rtt = 0;
    this.samples = [];
    this.startAt = 0;
    this.open = false;
  }
  // Ist das Spiel von einem Scherenschlacht-Server ausgeliefert worden?
  static async probe() {
    if (location.protocol === 'file:') return null;
    try {
      const ctl = new AbortController();
      const to = setTimeout(() => ctl.abort(), 2500);
      const r = await fetch('api/health', { signal: ctl.signal, cache: 'no-store', credentials: 'same-origin' });
      clearTimeout(to);
      if (!r.ok) return null;
      const j = await r.json();
      return j && j.game === 'scherenschlacht' ? j : null;
    } catch (e) {
      return null;
    }
  }
  static async api(method, path, body) {
    const r = await fetch('api/' + path, {
      method,
      credentials: 'same-origin',
      cache: 'no-store',
      headers: body ? { 'Content-Type': 'application/json' } : {},
      body: body ? JSON.stringify(body) : undefined,
    });
    let j = null;
    try {
      j = await r.json();
    } catch (e) {}
    if (!r.ok) throw new Error((j && j.error) || 'Fehler ' + r.status);
    return j;
  }
  on(type, fn) {
    this.handlers[type] = fn;
  }
  connect() {
    return new Promise((res, rej) => {
      const url = new URL('ws', location.href);
      url.protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
      const ws = (this.ws = new WebSocket(url.href));
      let opened = false;
      ws.onopen = () => {
        opened = true;
        this.open = true;
        this.ping();
        this.pingT = setInterval(() => this.ping(), 2000);
        res();
      };
      ws.onmessage = (ev) => {
        let m;
        try {
          m = JSON.parse(ev.data);
        } catch (e) {
          return;
        }
        if (!m || typeof m.t !== 'string') return;
        if (m.t === 'pong') return this.onPong(m);
        const h = this.handlers[m.t] || this.handlers['*'];
        if (h) h(m);
      };
      ws.onclose = (ev) => {
        this.open = false;
        clearInterval(this.pingT);
        if (!opened) rej(new Error('Keine Verbindung zum Server'));
        const h = this.handlers.close;
        if (h) h(ev);
      };
      ws.onerror = () => {};
    });
  }
  send(o) {
    if (this.ws && this.ws.readyState === 1) this.ws.send(JSON.stringify(o));
  }
  cmd(tick, c) {
    this.seq++;
    this.send({ t: 'cmd', q: this.seq, k: tick, c });
  }
  // Uhrabgleich (wie NTP): beste Messung mit der kleinsten Laufzeit gewinnt
  ping() {
    this.send({ t: 'ping', c: Date.now() });
  }
  onPong(m) {
    const now = Date.now();
    const rtt = now - m.c;
    if (!(rtt >= 0 && rtt < 10000)) return;
    this.samples.push({ rtt, off: m.s + rtt / 2 - now });
    if (this.samples.length > 8) this.samples.shift();
    let best = this.samples[0];
    for (const s of this.samples) if (s.rtt < best.rtt) best = s;
    this.offset = best.off;
    this.rtt = rtt;
  }
  serverNow() {
    return Date.now() + this.offset;
  }
  targetTick() {
    return Math.floor((this.serverNow() - this.startAt) / SC.STEP_MS);
  }
  close() {
    clearInterval(this.pingT);
    this.handlers = {};
    try {
      if (this.ws) this.ws.close();
    } catch (e) {}
    this.ws = null;
    this.open = false;
  }
};
