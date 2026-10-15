'use strict';
// ============================================================
//  Eine Partie: Runden, Eco-Ticks, Senden, Kräfte, Sieg/Niederlage
//
//  Modi:
//   'ai'      – Duell gegen die KI (beide Felder lokal)
//   'p2p'     – Direkt-Duell per Code (PeerJS), jeder simuliert sein Feld
//   'server'  – Online über den eigenen Server: der Client simuliert sein
//               Feld zur Anzeige, der Server rechnet verbindlich mit und
//               korrigiert Geld/Leben/Türme (Anti-Cheat)
//   'sim'     – läuft NUR auf dem Server: beide Felder, ohne Grafik
//   'classic' – 40 Wellen allein
// ============================================================
SC.CLASSIC_DIFF = {
  easy: { lives: 200, money: 850, name: 'Leicht' },
  normal: { lives: 150, money: 650, name: 'Normal' },
  hard: { lives: 100, money: 600, name: 'Schwer' },
};
SC.BATTLE = { lives: 150, money: 650, eco: 250 };
SC.SEND_DELAY = 30; // Ticks, bis ein Send beim Gegner ankommt (Server-Modus)
SC.TARGETS = ['first', 'last', 'strong', 'close'];
SC.HEXES = { boost: true, fog: true };
SC.isBloon = (t) => typeof t === 'string' && Object.prototype.hasOwnProperty.call(SC.BLOONS, t);
SC.sendById = (id) => SC.SENDS.find((s) => s.id === id) || null;

SC.Game = class Game {
  constructor(cfg) {
    this.cfg = cfg;
    this.mode = cfg.mode;
    this.battle = cfg.mode !== 'classic';
    this.map = SC.MAPS.find((m) => m.id === cfg.map) || SC.MAPS[0];
    this.seed = cfg.seed >>> 0 || 1 + Math.floor(Math.random() * 0x7ffffffe);
    const CL = SC.CLASSIC_DIFF[cfg.diff || 'normal'];
    const B = SC.BATTLE;
    const fieldSeed = (i) => (this.seed + Math.imul(i + 1, 0x9e3779b1)) >>> 0;
    const mk = (i, lo, name, local, headless) =>
      new SC.Field(this, {
        map: this.map, mode: this.battle ? 'battle' : 'classic', name, local, headless,
        lives: this.battle ? B.lives : CL.lives, money: this.battle ? B.money : CL.money, eco: this.battle ? B.eco : 0,
        seed: fieldSeed(i), towers: this.battle && lo ? lo.towers : null, powers: lo ? lo.powers : [],
      });
    this.opp = null;
    if (this.mode === 'sim') {
      this.fields = [mk(0, cfg.loadouts[0], cfg.names[0], false, true), mk(1, cfg.loadouts[1], cfg.names[1], false, true)];
      this.me = this.fields[0];
      this.opp = this.fields[1];
    } else {
      this.me = mk(cfg.side || 0, cfg.loadout, cfg.name || 'Du', true, false);
      if (this.mode === 'ai') {
        const names = { easy: 'Krabbel-KI', normal: 'Hummer-KI', hard: 'Kraken-KI' };
        const lo = cfg.oppLoadout || SC.AI.pickLoadout(cfg.diff);
        this.opp = mk(1, lo, names[cfg.diff] || 'KI', false, false);
        this.opp.loadout = lo;
        this.ai = new SC.AI(this.opp, this.me, this, cfg.diff);
      } else if (this.mode === 'p2p' || this.mode === 'server') {
        this.opp = new SC.Ghost(this.map);
        this.opp.name = cfg.oppName || 'Gegner';
        this.net = cfg.net;
        if (this.mode === 'p2p') {
          this.net.onmsg = (m) => this.onNet(m);
          this.net.onclose = () => {
            if (!this.over) this.end(true, 'Dein Gegner hat die Verbindung getrennt.');
          };
        }
      }
    }
    this.tick = 0;
    this.time = 0;
    this.round = 0;
    this.nextRoundAt = this.battle ? 3 : Infinity;
    this.ecoT = SC.ECO_INTERVAL;
    this.over = false;
    this.paused = false;
    this.roundActive = false;
    this.auto = false;
    this.autoT = 0;
    this.snapT = 0;
    this.won40 = false;
    this.sched = []; // geplante Angriffe: { at, to, atk }
    this.dead = [];
    if (this.mode === 'server') {
      this.hist = new Array(1024);
      this.badSum = 0;
    }
  }

  // ---------------- Hauptschleife (feste Schritte) ----------------
  update(dt) {
    if (this.over || this.paused) return;
    this.tick++;
    this.time += dt;
    if (this.sched.length) {
      const due = this.sched.filter((s) => s.at <= this.tick);
      if (due.length) {
        this.sched = this.sched.filter((s) => s.at > this.tick);
        for (const s of due) this.applyAttack(s.to, s.atk);
      }
    }
    if (this.battle) {
      if (this.time >= this.nextRoundAt) this.startRound();
    } else {
      if (this.roundActive && !this.me.spawns.length && !this.me.bloons.length) this.endClassicRound();
      if (!this.roundActive && this.auto) {
        this.autoT -= dt;
        if (this.autoT <= 0) this.startRound();
      }
    }
    const both = this.mode === 'ai' || this.mode === 'sim';
    if (this.battle || this.roundActive) {
      this.ecoT -= dt;
      if (this.ecoT <= 0) {
        this.ecoT += SC.ECO_INTERVAL;
        this.me.ecoTick();
        if (both) this.opp.ecoTick();
      }
    }
    this.me.update(dt);
    if (both && !this.over) this.opp.update(dt);
    if (this.mode === 'ai' && !this.over) this.ai.update(dt);
    if (this.mode === 'sim' && this.dead.length && !this.over) {
      this.over = true;
      const f0 = this.dead.includes(this.fields[0]), f1 = this.dead.includes(this.fields[1]);
      this.result = { winner: f0 && f1 ? -1 : f0 ? 1 : 0, reason: 'lives' };
    }
    if (this.mode === 'p2p') {
      this.snapT -= dt;
      if (this.snapT <= 0) {
        this.snapT = 0.1;
        this.net.send(SC.Ghost.snapshot(this.me));
      }
    }
    if (this.hist) {
      const h = this.hist[this.tick & 1023] || (this.hist[this.tick & 1023] = {});
      h.k = this.tick;
      h.m = this.me.money;
      h.l = this.me.lives;
      h.e = this.me.eco;
      h.b = this.me.bloonSum();
    }
  }

  canStartRound() {
    return !this.battle && !this.roundActive && !this.over;
  }
  startRound() {
    this.round++;
    this.me.queueRound(this.round);
    if (this.mode === 'ai' || this.mode === 'sim') this.opp.queueRound(this.round);
    if (this.battle) {
      this.nextRoundAt = this.time + SC.getRound(this.round).duration + 5;
      // Eskalation: ab Runde 31 wird die Strömung immer schneller
      const r = this.round;
      const rush = 1 + Math.max(0, r - 30) * 0.06 + Math.max(0, r - 40) * 0.1;
      this.me.rush = rush;
      if (this.opp) this.opp.rush = rush;
      if (r === 31) this.notify('rush');
    } else this.roundActive = true;
    this.notify('round', this.round);
  }
  endClassicRound() {
    this.roundActive = false;
    const bonus = 100 + this.round;
    this.me.money += bonus;
    this.me.addFx({ k: 'text', x: SC.W / 2, y: SC.H / 2, txt: 'Rundenbonus +' + bonus, dur: 1.4, c: '#ffe14d' });
    this.autoT = 1.2;
    const best = SC.store.get('best.' + this.map.id, 0);
    if (this.round > best) SC.store.set('best.' + this.map.id, this.round);
    if (this.round === 40 && !this.won40) {
      this.won40 = true;
      this.notify('won40');
    }
  }

  // ---------------- Befehle (Client & Server rechnen identisch) ----------------
  other(f) {
    return f === this.me ? this.opp : this.me;
  }
  exec(f, c) {
    if (this.over || !c) return false;
    const t = c.id != null && c.c !== 'place' && c.c !== 'crate' ? f.towerById(c.id) : null;
    switch (c.c) {
      case 'place':
        if (!Object.prototype.hasOwnProperty.call(SC.TOWERS, c.k)) return false;
        return !!f.placeTower(c.k, c.x, c.y, false, c.id);
      case 'up':
        return !!t && f.upgrade(t, c.p);
      case 'sell':
        return !!t && f.sell(t);
      case 'tgt':
        if (!t || SC.TARGETS.indexOf(c.m) < 0) return false;
        t.target = c.m;
        return true;
      case 'ab':
        return !!t && f.useAbility(t);
      case 'crate':
        return f.collectById(c.id);
      case 'send': {
        const s = SC.sendById(c.s);
        return !!s && this.battle && this.doSend(f, this.other(f), s, { camo: !!c.camo, regrow: !!c.regrow });
      }
      case 'pow': {
        const p = f.powers[c.i];
        if (!p || (!this.battle && SC.POWER_BY_ID[p.id].target === 'opp')) return false;
        return f.usePower(c.i, c.x, c.y, this.round);
      }
    }
    return false;
  }
  // Aktion des Spielers (UI): lokal ausführen und ggf. an den Server melden
  act(c) {
    if (c.c === 'place') c.id = this.me.tid;
    const ok = this.exec(this.me, c);
    if (ok && this.mode === 'server') this.net.cmd(this.tick, c);
    return ok;
  }

  // ---------------- Senden & Angriffe ----------------
  sendCost(send, mods) {
    let c = send.cost;
    if (mods.camo) c *= SC.SEND_MOD.camo.mul;
    if (mods.regrow) c *= SC.SEND_MOD.regrow.mul;
    return Math.round(c);
  }
  queueLen(field) {
    if (field instanceof SC.Ghost) return field.q;
    let n = field.sendQueue.length;
    for (const s of this.sched) if (s.to === field && s.atk.k === 'send') n++;
    return n;
  }
  doSend(from, to, send, mods) {
    if (this.over || !to || send.round > Math.max(1, this.round)) return false;
    mods = { camo: !!mods.camo && this.round >= SC.SEND_MOD.camo.round, regrow: !!mods.regrow && this.round >= SC.SEND_MOD.regrow.round };
    const cost = this.sendCost(send, mods);
    if (from.money < cost) return false;
    if (this.queueLen(to) >= SC.SEND_QUEUE_MAX) return false;
    from.money -= cost;
    from.eco = Math.max(0, from.eco + send.eco);
    from.stats.sent++;
    this.attack(from, to, { k: 'send', id: send.id, mods });
    return true;
  }
  // Ereignisse aus einem Feld (Flaschenpost, Flüche)
  onFieldEvent(f, kind, data) {
    if (!this.battle || !this.opp) return;
    const to = this.other(f);
    if (this.mode === 'server' && f === this.me) {
      if (kind === 'post') this.pending(to, { k: 'post', types: data.types, mods: data.mods }); // der Server leitet weiter
      return;
    }
    if (kind === 'post') this.attack(f, to, { k: 'post', types: data.types, mods: data.mods });
    else if (kind === 'hex') this.attack(f, to, { k: 'hex', id: data.id, dur: data.dur });
  }
  attack(from, to, atk) {
    switch (this.mode) {
      case 'ai':
        this.applyAttack(to, atk);
        break;
      case 'sim': {
        const at = this.tick + SC.SEND_DELAY;
        this.sched.push({ at, to, atk });
        if (this.onAttack) this.onAttack(to, atk, at);
        break;
      }
      case 'p2p':
        this.net.send({ t: 'atk', atk });
        this.pending(to, atk);
        break;
      case 'server':
        this.pending(to, atk);
        break;
    }
  }
  // Gegner-Spiegelbild: Send sofort in der Röhre zeigen, bis der nächste Snapshot ihn enthält
  pending(to, atk) {
    if (atk.k === 'hex' || !(to instanceof SC.Ghost)) return;
    to.q++;
    const send = atk.k === 'post' ? { id: 'post', type: atk.types[0], count: atk.types.length } : SC.sendById(atk.id);
    if (send) to.pend.push(Object.assign(SC.Ghost.qEntry(send, atk.mods), { at: Date.now() }));
  }
  applyAttack(to, atk) {
    if (!to || !(to instanceof SC.Field)) return;
    let ok = false;
    if (atk.k === 'send') {
      const s = SC.sendById(atk.id);
      if (s) ok = to.receiveSend(s, atk.mods || {}, true);
    } else if (atk.k === 'post') ok = Array.isArray(atk.types) && to.receivePost(atk.types.filter(SC.isBloon), atk.mods || {});
    else if (atk.k === 'hex' && SC.HEXES[atk.id]) {
      to.applyHex(atk.id, SC.clamp(+atk.dur || 0, 0, 10));
      ok = true;
    }
    if (ok && to === this.me) this.notify('incoming', atk);
  }
  // Server-Modus: Angriff kommt zum vereinbarten Tick an
  incoming(atk, at) {
    if (at > this.tick) this.sched.push({ at, to: this.me, atk });
    else this.applyAttack(this.me, atk);
  }

  // ---------------- Direkt-Duell (P2P) ----------------
  onNet(m) {
    if (!m || typeof m !== 'object' || this.over) return;
    if (m.t === 's') this.opp.apply(m);
    else if (m.t === 'atk' && m.atk && typeof m.atk === 'object') {
      const a = m.atk;
      const mods = { camo: !!(a.mods && a.mods.camo), regrow: !!(a.mods && a.mods.regrow) };
      if (a.k === 'send' && SC.sendById(a.id)) this.applyAttack(this.me, { k: 'send', id: a.id, mods });
      else if (a.k === 'post' && Array.isArray(a.types)) this.applyAttack(this.me, { k: 'post', types: a.types.slice(0, 24), mods });
      else if (a.k === 'hex' && SC.HEXES[a.id]) this.applyAttack(this.me, { k: 'hex', id: a.id, dur: a.dur });
    } else if (m.t === 'dead') this.end(true);
    else if (m.t === 'bye') this.end(true, 'Dein Gegner hat aufgegeben.');
  }

  // ---------------- Server-Modus: Abgleich mit dem Server ----------------
  // st: { k: Tick, m, l, e, b, ack, T: [[id, kind, x, y, t0, t1, ziel], ...] }
  reconcile(st) {
    const h = this.hist && this.hist[st.k & 1023];
    if (!h || h.k !== st.k) return;
    const fix = (key, cur, val) => {
      const d = val - h[key];
      if (Math.abs(d) < 1e-6) return 0;
      for (const e of this.hist) if (e && e.k > st.k) e[key] += d;
      return d;
    };
    this.me.money += fix('m', this.me.money, st.m);
    this.me.lives += fix('l', this.me.lives, st.l);
    this.me.eco += fix('e', this.me.eco, st.e);
    if (st.ack === this.net.seq) this.syncTowers(st.T);
    this.badSum = st.b === h.b ? 0 : this.badSum + 1;
    if (this.badSum >= 4) {
      this.badSum = -20; // nicht sofort wieder fragen
      this.net.send({ t: 'resync' });
    }
  }
  syncTowers(T) {
    const f = this.me;
    const srv = new Map();
    for (const a of T) srv.set(a[0], a);
    let changed = false;
    for (const t of f.towers.slice()) {
      if (!srv.has(t.id)) {
        f.towers.splice(f.towers.indexOf(t), 1);
        changed = true;
      }
    }
    for (const a of T) {
      let t = f.towerById(a[0]);
      const kind = SC.TOWER_ORDER[a[1]];
      if (!kind) continue;
      if (!t) {
        t = f.newTower(kind, a[2], a[3], a[0]);
        t.born = f.time;
        f.towers.push(t);
        f.tid = Math.max(f.tid, a[0] + 1);
        changed = true;
      }
      if (t.tiers[0] !== a[4] || t.tiers[1] !== a[5]) {
        t.tiers = [a[4], a[5]];
        t.s = SC.towerStats(t.kind, t.tiers);
        t.sx = null;
        t.ab = null;
        for (let p = 0; p < 2; p++) if (t.tiers[p] >= SC.MAX_TIER) t.ab = { def: t.def.paths[p][SC.MAX_TIER - 1].ability, cd: 0 };
        changed = true;
      }
      if (SC.TARGETS[a[6]]) t.target = SC.TARGETS[a[6]];
    }
    if (changed) {
      f.buffT = 0;
      this.notify('towers');
    }
  }
  // kompletter Zustand vom Server (Wiederverbinden, große Abweichung)
  applyResync(d) {
    this.tick = d.k;
    this.time = d.g.time;
    this.round = d.g.round;
    this.nextRoundAt = d.g.nextRoundAt;
    this.ecoT = d.g.ecoT;
    this.me.restore(d.f);
    this.sched = (d.sched || []).map((s) => ({ at: s.at, to: this.me, atk: s.atk }));
    this.hist = new Array(1024);
    this.badSum = 0;
    this.notify('towers');
  }
  // Server: Zustand eines Feldes für den Resync
  resyncFor(i) {
    const f = this.fields[i];
    return {
      k: this.tick,
      g: { time: this.time, round: this.round, nextRoundAt: this.nextRoundAt, ecoT: this.ecoT },
      f: f.serialize(),
      sched: this.sched.filter((s) => s.to === f).map((s) => ({ at: s.at, atk: s.atk })),
    };
  }
  // Server: kurzer Status eines Feldes
  stateFor(i, ack) {
    const f = this.fields[i];
    return {
      t: 'st', k: this.tick, m: f.money, l: f.lives, e: f.eco, b: f.bloonSum(), ack,
      T: f.towers.map((t) => [t.id, SC.TOWER_ORDER.indexOf(t.kind), Math.round(t.x * 10) / 10, Math.round(t.y * 10) / 10, t.tiers[0], t.tiers[1], SC.TARGETS.indexOf(t.target)]),
    };
  }

  // ---------------- Röhren-Anzeige ----------------
  // out = Blasen, die ich dem Gegner geschickt habe; in = Blasen, die zu mir kommen
  pipes() {
    const qOf = (f) => {
      if (f instanceof SC.Ghost) return { list: f.Q || [], cur: f.C || null, transit: (f.X || []).concat(f.pend || []) };
      const list = f.sendQueue.map((q) => SC.Ghost.qEntry(q.send, q.mods));
      const cur = f.curSend ? Object.assign(SC.Ghost.qEntry(f.curSend, f.curSend), { p: SC.clamp((f.time - f.curSend.t0) / Math.max(0.01, f.curSend.t1 - f.curSend.t0), 0, 1) }) : null;
      const transit = this.sched.filter((s) => s.to === f && s.atk.k !== 'hex').map((s) => SC.Ghost.qEntry(s.atk.k === 'post' ? { id: 'post', type: s.atk.types[0], count: s.atk.types.length } : SC.sendById(s.atk.id), s.atk.mods || {}));
      return { list, cur, transit };
    };
    return { out: this.opp ? qOf(this.opp) : null, in: qOf(this.me) };
  }

  // ---------------- Ende ----------------
  onFieldDead(f) {
    if (this.over) return;
    if (this.mode === 'server') return; // der Server entscheidet
    if (this.mode === 'sim') {
      if (!this.dead.includes(f)) this.dead.push(f);
      return;
    }
    if (f === this.me) {
      if (this.mode === 'p2p') this.net.send({ t: 'dead' });
      this.end(false);
    } else this.end(true);
  }
  end(win, reason, extra) {
    if (this.over && this.result) return;
    this.over = true;
    this.result = Object.assign({ win, reason }, extra || {});
    if (!this.battle) {
      const best = SC.store.get('best.' + this.map.id, 0);
      if (this.round - 1 > best) SC.store.set('best.' + this.map.id, this.round - 1);
    }
    this.notify('end', this.result);
  }
  notify(kind, data) {
    if (this.onNotify) this.onNotify(kind, data);
  }
  destroy() {
    if (this.net) this.net.close();
  }
};
