'use strict';
// Zentrale: verbundene Spieler, Schnellsuche (Matchmaking), private Räume, laufende Partien
const crypto = require('node:crypto');
const { Match } = require('./match');
const { Bucket, RateLimiter } = require('./ratelimit');
const auth = require('./auth');

const CODE_ABC = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const newCode = (n) => {
  let s = '';
  for (let i = 0; i < n; i++) s += CODE_ABC[crypto.randomInt(0, CODE_ABC.length)];
  return s;
};

class Client {
  constructor(hub, ws, ip, user) {
    this.hub = hub;
    this.ws = ws;
    this.ip = ip;
    this.user = user;
    this.name = user ? user.name : 'Gast-' + crypto.randomInt(1000, 10000);
    this.match = null;
    this.side = null;
    this.queued = null;
    this.room = null;
    this.loadout = null;
    this.bucket = new Bucket(40, 120); // Nachrichten pro Sekunde / Puffer
    this.alive = true;
  }
  send(msg) {
    if (this.ws.readyState === 1 && this.ws.bufferedAmount < 2e6) this.ws.send(JSON.stringify(msg));
  }
}

class Hub {
  constructor(SC, config, db, v) {
    this.SC = SC;
    this.config = config;
    this.db = db;
    this.v = v;
    this.clients = new Set();
    this.matches = new Set();
    this.queue = [];
    this.rooms = new Map();
    this.roomJoinLimit = new RateLimiter(0.5, 8); // gegen das Durchprobieren von Raumcodes
    this.loopT = setInterval(() => this.loop(), 8);
    this.pairT = setInterval(() => this.pair(), 500);
  }
  log(msg) {
    console.log(new Date().toISOString() + ' ' + msg);
  }
  stats() {
    let playing = 0;
    for (const m of this.matches) if (m.phase === 'play') playing++;
    return { online: this.clients.size, matches: playing, queue: this.queue.length };
  }

  // ---------------- Verbindungen ----------------
  connect(ws, ip, user) {
    const c = new Client(this, ws, ip, user);
    this.clients.add(c);
    ws.on('message', (data, isBinary) => {
      if (isBinary || !c.bucket.take()) {
        ws.close(1008, 'Zu viele Nachrichten');
        return;
      }
      let m;
      try {
        m = JSON.parse(data.toString('utf8'));
      } catch (e) {
        return;
      }
      if (!m || typeof m !== 'object' || typeof m.t !== 'string') return;
      try {
        this.onMessage(c, m);
      } catch (e) {
        this.log('Fehler bei Nachricht ' + m.t + ': ' + (e && e.stack));
      }
    });
    ws.on('pong', () => (c.alive = true));
    ws.on('close', () => this.disconnect(c));
    ws.on('error', () => {});
    return c;
  }
  disconnect(c) {
    if (!this.clients.has(c)) return;
    this.clients.delete(c);
    this.unqueue(c);
    this.leaveRoom(c);
    if (c.match) c.match.onLeave(c);
  }
  heartbeat() {
    for (const c of this.clients) {
      if (!c.alive) {
        c.ws.terminate();
        continue;
      }
      c.alive = false;
      try {
        c.ws.ping();
      } catch (e) {}
    }
  }

  onMessage(c, m) {
    const SC = this.SC;
    switch (m.t) {
      case 'ping':
        if (typeof m.c === 'number') c.send({ t: 'pong', c: m.c, s: Date.now() });
        return;
      case 'hello': {
        if (m.ver !== SC.VERSION) return c.send({ t: 'err', code: 'version', msg: 'Neue Spielversion – bitte Seite neu laden.' });
        if (!c.user && typeof m.name === 'string' && m.name !== c.name) {
          if (auth.validName(m.name) && !this.db.userByName(m.name)) c.name = m.name;
        }
        c.send({ t: 'welcome', name: c.name, guest: !c.user, rating: c.user ? c.user.rating : null, ver: SC.VERSION, server: this.config.serverName });
        // Laufende Partie nach Verbindungsabbruch fortsetzen
        const token = typeof m.rejoin === 'string' ? m.rejoin.slice(0, 64) : null;
        for (const match of this.matches) {
          const p = match.canRejoin(c, token);
          if (p) {
            match.rejoin(p, c);
            break;
          }
        }
        return;
      }
      case 'queue': {
        if (c.match) return;
        const lo = this.v.loadout(m.loadout);
        if (!lo) return c.send({ t: 'err', msg: 'Ungültige Ausrüstung' });
        this.leaveRoom(c);
        c.loadout = lo;
        const map = SC.MAPS.some((x) => x.id === m.map) ? m.map : 'any';
        this.unqueue(c);
        c.queued = { since: Date.now(), map, ranked: !!c.user };
        this.queue.push(c);
        c.send({ t: 'queued', n: this.queue.length });
        return;
      }
      case 'unqueue':
        this.unqueue(c);
        return c.send({ t: 'unqueued' });
      case 'room.create': {
        if (c.match) return;
        const lo = this.v.loadout(m.loadout);
        if (!lo) return c.send({ t: 'err', msg: 'Ungültige Ausrüstung' });
        if (this.rooms.size > 2000) return c.send({ t: 'err', msg: 'Server ist voll' });
        this.unqueue(c);
        this.leaveRoom(c);
        c.loadout = lo;
        let code;
        do code = newCode(5);
        while (this.rooms.has(code));
        const map = SC.MAPS.some((x) => x.id === m.map) ? m.map : SC.MAPS[0].id;
        const room = { code, host: c, map, created: Date.now() };
        this.rooms.set(code, room);
        c.room = room;
        return c.send({ t: 'room', code, map });
      }
      case 'room.join': {
        if (c.match) return;
        if (!this.roomJoinLimit.take(c.ip)) return c.send({ t: 'err', msg: 'Zu viele Versuche – bitte kurz warten.' });
        const lo = this.v.loadout(m.loadout);
        if (!lo) return c.send({ t: 'err', msg: 'Ungültige Ausrüstung' });
        const code = typeof m.code === 'string' ? m.code.toUpperCase().slice(0, 8) : '';
        const room = this.rooms.get(code);
        if (!room || room.host === c) return c.send({ t: 'err', msg: 'Raum nicht gefunden.' });
        if (this.matches.size >= this.config.maxMatches) return c.send({ t: 'err', msg: 'Server ist voll – bitte später versuchen.' });
        this.unqueue(c);
        this.leaveRoom(c);
        c.loadout = lo;
        this.rooms.delete(code);
        room.host.room = null;
        this.matches.add(new Match(this, [room.host, c], { map: room.map, ranked: false }));
        return;
      }
      case 'room.leave':
        return this.leaveRoom(c);
      case 'pre.reroll':
      case 'pre.loadout':
      case 'pre.ready':
        if (c.match) c.match.onPre(c.match.players[c.side], m);
        return;
      case 'cmd':
        if (c.match && c.side != null) c.match.onCmd(c.match.players[c.side], m);
        return;
      case 'resync':
        if (c.match && c.side != null) c.match.resync(c.match.players[c.side]);
        return;
      case 'quit':
        if (c.match) c.match.quit(c);
        return;
    }
  }

  // ---------------- Schnellsuche ----------------
  unqueue(c) {
    if (!c.queued) return;
    c.queued = null;
    const i = this.queue.indexOf(c);
    if (i >= 0) this.queue.splice(i, 1);
  }
  pair() {
    const now = Date.now();
    // abgelaufene Räume (10 min) schließen
    for (const [code, r] of this.rooms) {
      if (now - r.created > 600000) {
        this.rooms.delete(code);
        r.host.room = null;
        r.host.send({ t: 'err', msg: 'Raum abgelaufen.' });
      }
    }
    const q = this.queue;
    for (let i = 0; i < q.length; i++) {
      for (let j = i + 1; j < q.length; j++) {
        const a = q[i], b = q[j];
        if (a.user && b.user && a.user.id === b.user.id) continue;
        const wait = (now - Math.min(a.queued.since, b.queued.since)) / 1000;
        const ra = a.user ? a.user.rating : 1000, rb = b.user ? b.user.rating : 1000;
        if (Math.abs(ra - rb) > 150 + 25 * wait) continue;
        if (a.queued.ranked !== b.queued.ranked && wait < 20) continue; // Konten bevorzugt gegen Konten
        if (this.matches.size >= this.config.maxMatches) return;
        const maps = [a.queued.map, b.queued.map].filter((x) => x !== 'any');
        const map = maps.length ? maps[crypto.randomInt(0, maps.length)] : this.SC.MAPS[crypto.randomInt(0, this.SC.MAPS.length)].id;
        const ranked = !!(a.user && b.user);
        this.unqueue(a);
        this.unqueue(b);
        this.matches.add(new Match(this, [a, b], { map, ranked }));
        return this.pair();
      }
    }
  }

  leaveRoom(c) {
    if (!c.room) return;
    this.rooms.delete(c.room.code);
    c.room = null;
  }
  removeMatch(m) {
    this.matches.delete(m);
  }

  // ---------------- Simulation aller Partien ----------------
  loop() {
    const now = Date.now();
    for (const m of this.matches) {
      try {
        m.step(now);
      } catch (e) {
        this.log('Partie ' + m.id + ' abgebrochen (Fehler): ' + (e && e.stack));
        m.abort();
      }
    }
  }
  shutdown() {
    clearInterval(this.loopT);
    clearInterval(this.pairT);
    for (const m of this.matches) m.abort();
    for (const c of this.clients) {
      try {
        c.ws.close(1001, 'Server startet neu');
      } catch (e) {}
    }
  }
}

module.exports = { Hub };
