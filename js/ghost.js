'use strict';
// ============================================================
//  Spiegelbild des gegnerischen Feldes aus Snapshots
//  (Direkt-Duell: vom Gegner, Server-Modus: vom Server berechnet)
// ============================================================
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
    this.Q = [];
    this.C = null;
    this.X = []; // unterwegs (Server: noch nicht angekommen)
    this.pend = []; // lokal gesendet, Snapshot steht noch aus
    this.flags = 0;
    this.sendQueue = [];
    this.dead = false;
    this.name = 'Gegner';
    this._sc = {};
  }
  // Einträge der Sende-Röhre: { t: Blasentyp, n: Anzahl, post, camo, regrow, p: Fortschritt }
  static qEntry(send, mods) {
    return { t: send.type, n: send.count, post: send.id === 'post', camo: !!(mods && mods.camo), regrow: !!(mods && mods.regrow) };
  }
  static qPack(e, out) {
    out.push(SC.BLOONS[e.t] ? SC.BLOONS[e.t].idx : 0, e.n | 0, (e.camo ? 1 : 0) | (e.regrow ? 2 : 0) | (e.post ? 4 : 0));
  }
  static qUnpack(a, i) {
    const type = SC.BLOON_ORDER[a[i]];
    if (!type) return null;
    const fl = a[i + 2] | 0;
    return { t: type, n: SC.clamp(a[i + 1] | 0, 0, 99), camo: !!(fl & 1), regrow: !!(fl & 2), post: !!(fl & 4) };
  }
  // Daten kommen ggf. vom Gegner-Gerät: alles prüfen, nichts blind übernehmen
  apply(s) {
    const num = (v, a, b, d) => (typeof v === 'number' && isFinite(v) ? SC.clamp(v, a, b) : d);
    this.lives = num(s.l, -1e6, 1e6, this.lives);
    this.money = num(s.m, 0, 1e9, this.money);
    this.eco = num(s.e, 0, 1e7, this.eco);
    this.q = num(s.q, 0, 99, 0);
    this.flags = num(s.F, 0, 255, 0);
    const towers = [];
    const T = Array.isArray(s.T) ? s.T : [];
    for (let i = 0; i + 6 < T.length && towers.length < 200; i += 7) {
      const kind = SC.TOWER_ORDER[T[i]];
      const t0 = T[i + 3], t1 = T[i + 4];
      if (!kind || !(t0 >= 0 && t0 <= 4 && t1 >= 0 && t1 <= 4)) continue;
      const tiers = [t0 | 0, t1 | 0];
      const key = kind + tiers.join('');
      const st = this._sc[key] || (this._sc[key] = SC.towerStats(kind, tiers));
      towers.push({ id: i, kind, x: num(T[i + 1], 0, SC.W, 0), y: num(T[i + 2], 0, SC.H, 0), tiers, ang: num(T[i + 5], -700, 700, 0) / 100, s: st, anim: 0, drones: [], orbitA: 0, lvl: num(T[i + 6], 1, 10, 1) });
    }
    this.towers = towers;
    const B = Array.isArray(s.B) ? s.B : [];
    const bloons = [];
    for (let i = 0; i + 5 < B.length && bloons.length < 400; i += 6) {
      const type = SC.BLOON_ORDER[B[i]];
      if (!type) continue;
      const def = SC.BLOONS[type];
      bloons.push({ id: i, type, def, x: num(B[i + 1], -100, SC.W + 100, 0), y: num(B[i + 2], -100, SC.H + 100, 0), camo: !!(B[i + 3] & 1), regrow: !!(B[i + 3] & 2), hp: (def.hp * num(B[i + 4], 0, 100, 100)) / 100, a: num(B[i + 5], -700, 700, 0) / 100, frozen: 0, slowT: 0, stun: 0 });
    }
    this.bloons = bloons;
    const Q = Array.isArray(s.Q) ? s.Q : [];
    this.Q = [];
    for (let i = 0; i + 2 < Q.length && this.Q.length < 12; i += 3) {
      const e = SC.Ghost.qUnpack(Q, i);
      if (e) this.Q.push(e);
    }
    const X = Array.isArray(s.X) ? s.X : [];
    this.X = [];
    for (let i = 0; i + 2 < X.length && this.X.length < 6; i += 3) {
      const e = SC.Ghost.qUnpack(X, i);
      if (e) this.X.push(e);
    }
    const now = Date.now();
    this.pend = this.pend.filter((e) => now - e.at < 400);
    this.C = null;
    if (Array.isArray(s.C) && s.C.length === 4) {
      const e = SC.Ghost.qUnpack(s.C, 0);
      if (e) this.C = Object.assign(e, { p: num(s.C[3], 0, 100, 0) / 100 });
    }
  }
  // transit: Liste von qEntry (Server: geplante, noch nicht angekommene Sends)
  static snapshot(f, transit) {
    const T = [];
    for (const t of f.towers) T.push(SC.TOWER_ORDER.indexOf(t.kind), t.x | 0, t.y | 0, t.tiers[0], t.tiers[1], Math.round(t.ang * 100), t.lvl || 1);
    const B = [];
    let n = 0;
    for (const b of f.bloons) {
      if (b.dead || n++ > 350) continue;
      B.push(b.def.idx, b.x | 0, b.y | 0, (b.camo ? 1 : 0) | (b.regrow ? 2 : 0), Math.round((b.hp / b.def.hp) * 100), Math.round(b.a * 100));
    }
    const Q = [];
    for (const q of f.sendQueue) SC.Ghost.qPack(SC.Ghost.qEntry(q.send, q.mods), Q);
    let C = 0;
    if (f.curSend) {
      C = [];
      SC.Ghost.qPack(SC.Ghost.qEntry(f.curSend, f.curSend), C);
      C.push(Math.round(SC.clamp((f.time - f.curSend.t0) / Math.max(0.01, f.curSend.t1 - f.curSend.t0), 0, 1) * 100));
    }
    const X = [];
    if (transit) for (const e of transit.slice(0, 6)) SC.Ghost.qPack(e, X);
    const F = (f.shieldT > 0 ? 1 : 0) | (f.hexFogT > 0 ? 2 : 0) | (f.hexBoostT > 0 ? 4 : 0) | (f.rageT > 0 ? 8 : 0);
    return { t: 's', l: Math.ceil(f.lives), m: Math.floor(f.money), e: Math.round(f.eco), q: f.sendQueue.length, F, T, B, Q, C, X };
  }
  update() {}
};
