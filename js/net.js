'use strict';
// ============================================================
//  Online-Duell per PeerJS (WebRTC, Peer-to-Peer mit Raumcode)
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
      s.onload = () => res();
      s.onerror = () => rej(new Error('PeerJS konnte nicht geladen werden (Internet?)'));
      document.head.appendChild(s);
    });
  }
  static code() {
    const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let c = '';
    for (let i = 0; i < 4; i++) c += A[Math.floor(Math.random() * A.length)];
    return c;
  }
  async host(onCode, onConnect, onError) {
    await SC.Net.load();
    this.isHost = true;
    const code = SC.Net.code();
    this.peer = new window.Peer('scherenschlacht-v1-' + code);
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
      const c = this.peer.connect('scherenschlacht-v1-' + code.toUpperCase(), { reliable: true });
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

// Spiegelbild des gegnerischen Feldes aus Snapshots
SC.Ghost = class Ghost {
  constructor(map) {
    this.map = map;
    this.path = SC.buildPath(map);
    this.towers = [];
    this.bloons = [];
    this.projs = [];
    this.piles = [];
    this.fx = [];
    this.crates = [];
    this.whales = [];
    this.lives = 150;
    this.money = 0;
    this.eco = 250;
    this.q = 0;
    this.sendQueue = [];
    this.dead = false;
    this.name = 'Gegner';
    this._sc = {};
  }
  apply(s) {
    this.lives = s.l;
    this.money = s.m;
    this.eco = s.e;
    this.q = s.q;
    const T = s.T, towers = [];
    for (let i = 0; i < T.length; i += 6) {
      const kind = SC.TOWER_ORDER[T[i]];
      const tiers = [T[i + 3], T[i + 4]];
      const key = kind + tiers.join('');
      const st = this._sc[key] || (this._sc[key] = SC.towerStats(kind, tiers));
      towers.push({ kind, x: T[i + 1], y: T[i + 2], tiers, ang: T[i + 5] / 100, s: st, anim: 0, drones: [], orbitA: 0 });
    }
    this.towers = towers;
    const B = s.B, bloons = [];
    for (let i = 0; i < B.length; i += 6) {
      const type = SC.BLOON_ORDER[B[i]];
      const def = SC.BLOONS[type];
      bloons.push({ id: i, type, def, x: B[i + 1], y: B[i + 2], camo: !!(B[i + 3] & 1), regrow: !!(B[i + 3] & 2), hp: (def.hp * B[i + 4]) / 100, a: B[i + 5] / 100, frozen: 0, slowT: 0, stun: 0 });
    }
    this.bloons = bloons;
  }
  static snapshot(f) {
    const T = [];
    for (const t of f.towers) T.push(SC.TOWER_ORDER.indexOf(t.kind), t.x | 0, t.y | 0, t.tiers[0], t.tiers[1], Math.round(t.ang * 100));
    const B = [];
    let n = 0;
    for (const b of f.bloons) {
      if (b.dead || n++ > 350) continue;
      B.push(b.def.idx, b.x | 0, b.y | 0, (b.camo ? 1 : 0) | (b.regrow ? 2 : 0), Math.round((b.hp / b.def.hp) * 100), Math.round(b.a * 100));
    }
    return { t: 's', l: f.lives, m: Math.floor(f.money), e: Math.round(f.eco), q: f.sendQueue.length, T, B };
  }
  update() {}
};
