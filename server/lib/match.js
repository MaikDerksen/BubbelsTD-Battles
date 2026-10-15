'use strict';
// Eine Online-Partie auf dem Server.
//  1. Vorrunde: Würfel-Turm (2x neu würfeln), Ausrüstung anpassen, „Bereit“
//  2. Spiel: der Server simuliert BEIDE Felder verbindlich (gleicher Code wie der Browser).
//     Clients schicken nur Befehle; Geld, Leben, Türme und Sieg bestimmt der Server.
const crypto = require('node:crypto');

const cryptoRnd = () => crypto.randomInt(0, 0x7fffffff) / 0x7fffffff;
let nextId = 1;

class Match {
  constructor(hub, clients, opts) {
    this.id = nextId++;
    this.hub = hub;
    this.SC = hub.SC;
    this.cfg = hub.config;
    this.map = opts.map;
    this.ranked = !!opts.ranked;
    this.phase = 'pre';
    this.created = Date.now();
    this.deadline = Date.now() + this.cfg.preMatchMs;
    this.players = clients.map((c, i) => {
      const lo = c.loadout;
      return {
        side: i,
        client: c,
        name: c.name,
        guest: !c.user,
        userId: c.user ? c.user.id : null,
        rating: c.user ? c.user.rating : null,
        loadout: lo,
        dice: this.SC.rollDice(lo.towers, cryptoRnd),
        rerolls: this.SC.LOADOUT.rerolls,
        ready: false,
        cmds: [],
        ack: 0,
        lastQ: 0,
        goneAt: 0,
        token: crypto.randomBytes(18).toString('base64url'),
        cmdCount: 0,
      };
    });
    for (const p of this.players) {
      p.client.match = this;
      p.client.side = p.side;
    }
    this.sendPre();
  }

  // ---------------- Vorrunde ----------------
  preInfo(p) {
    const o = this.players[1 - p.side];
    return {
      t: 'pre', map: this.map, ranked: this.ranked, deadline: this.deadline,
      me: { loadout: p.loadout, dice: p.dice, rerolls: p.rerolls, ready: p.ready },
      opp: { name: o.name, guest: o.guest, rating: o.rating, ready: o.ready },
    };
  }
  sendPre() {
    for (const p of this.players) this.send(p, this.preInfo(p));
  }
  onPre(p, m) {
    if (this.phase !== 'pre' || p.ready) return;
    if (m.t === 'pre.reroll') {
      if (p.rerolls <= 0) return this.send(p, this.preInfo(p));
      p.rerolls--;
      p.dice = this.SC.rollDice(p.loadout.towers, cryptoRnd, p.dice);
    } else if (m.t === 'pre.loadout') {
      const lo = this.hub.v.loadout(m.loadout);
      if (!lo) return this.send(p, { t: 'err', msg: 'Ungültige Ausrüstung' });
      p.loadout = lo;
      // Würfel-Turm darf keiner der gewählten sein – dann kostenlos neu würfeln
      if (lo.towers.indexOf(p.dice) >= 0) p.dice = this.SC.rollDice(lo.towers, cryptoRnd);
    } else if (m.t === 'pre.ready') p.ready = true;
    this.sendPre();
    if (this.players.every((x) => x.ready)) this.begin();
  }

  // ---------------- Spiel ----------------
  begin() {
    if (this.phase !== 'pre') return;
    const SC = this.SC;
    this.phase = 'play';
    this.seed = crypto.randomInt(1, 0x7fffffff);
    const loadouts = this.players.map((p) => ({ towers: p.loadout.towers.concat([p.dice]), powers: p.loadout.powers.slice() }));
    this.game = new SC.Game({ mode: 'sim', map: this.map, seed: this.seed, loadouts, names: this.players.map((p) => p.name) });
    this.loadouts = loadouts;
    this.startAt = Date.now() + 4000; // Zeit für das VS-Intro
    this.lastSnap = 0;
    this.game.onAttack = (to, atk, at) => {
      const side = to === this.game.fields[0] ? 0 : 1;
      this.send(this.players[side], { t: 'inc', atk, at });
    };
    this.game.onNotify = (kind, d) => {
      if ((kind === 'ability' || kind === 'power') && d && d.field) {
        const side = d.field === this.game.fields[0] ? 0 : 1;
        const ev = kind === 'ability' ? { t: 'ev', k: 'ab', kind: d.t.kind, tiers: d.t.tiers, name: d.t.ab.def.name } : { t: 'ev', k: 'pow', id: d.def.id, name: d.def.name };
        this.send(this.players[1 - side], ev);
      }
    };
    for (const p of this.players) this.sendStart(p);
    this.hub.log('Partie ' + this.id + ' startet: ' + this.players.map((p) => p.name).join(' vs ') + ' auf ' + this.map + (this.ranked ? ' (gewertet)' : ''));
  }
  sendStart(p) {
    const o = this.players[1 - p.side];
    this.send(p, {
      t: 'start', side: p.side, seed: this.seed, map: this.map, startAt: this.startAt, now: Date.now(), delay: this.cfg.delayTicks,
      loadout: this.loadouts[p.side], oppLoadout: this.loadouts[o.side], oppName: o.name + (o.guest ? ' (Gast)' : ''), oppRating: o.rating, ranked: this.ranked, token: p.token,
    });
  }
  // Befehl eines Spielers: prüfen und für den passenden Tick vormerken
  onCmd(p, m) {
    if (this.phase !== 'play') return;
    const v = this.hub.v;
    if (!v.isInt(m.q, 1, 1e9) || m.q <= p.lastQ || !v.isInt(m.k, 0, 1e9)) return;
    const c = v.cmd(m.c);
    p.lastQ = m.q;
    if (!c || p.cmds.length > 200) {
      p.ack = m.q;
      return this.send(p, { t: 'rej', q: m.q });
    }
    p.cmdCount++;
    // Ein Befehl darf höchstens kurz „in der Zukunft“ liegen (Uhr-Toleranz)
    const maxK = this.game.tick + this.cfg.delayTicks + 90;
    p.cmds.push({ q: m.q, k: Math.min(m.k, maxK), c });
  }
  applyCmds(p) {
    const f = this.game.fields[p.side];
    while (p.cmds.length && p.cmds[0].k <= this.game.tick) {
      const x = p.cmds.shift();
      const ok = this.game.exec(f, x.c);
      p.ack = x.q;
      if (!ok) this.send(p, { t: 'rej', q: x.q });
    }
  }
  step(now) {
    if (this.phase === 'pre') {
      if (now >= this.deadline) {
        for (const p of this.players) p.ready = true;
        this.begin();
      }
      return;
    }
    if (this.phase !== 'play') return;
    for (const p of this.players) {
      if (!p.client && now - p.goneAt > this.cfg.reconnectGraceMs) return this.finish(1 - p.side, 'disconnect');
    }
    if (now - this.startAt > this.cfg.maxMatchMs) return this.finishByLives('timeout');
    const SC = this.SC, g = this.game;
    const target = Math.floor((now - this.startAt) / SC.STEP_MS) - this.cfg.delayTicks;
    let n = 0;
    while (g.tick < target && n < 240 && !g.over) {
      for (const p of this.players) this.applyCmds(p);
      g.update(SC.STEP);
      n++;
      if (g.tick % 30 === 0) for (const p of this.players) this.send(p, g.stateFor(p.side, p.ack));
      if (g.tick % 6 === 0) {
        for (const p of this.players) {
          const f = g.fields[1 - p.side];
          const transit = g.sched.filter((s) => s.to === f && s.atk.k !== 'hex').map((s) => SC.Ghost.qEntry(s.atk.k === 'post' ? { id: 'post', type: s.atk.types[0], count: s.atk.types.length } : SC.sendById(s.atk.id), s.atk.mods));
          this.send(p, SC.Ghost.snapshot(f, transit));
        }
      }
    }
    if (g.over) this.finish(g.result.winner, 'lives');
  }
  finishByLives(reason) {
    const [a, b] = this.game.fields;
    this.finish(a.lives === b.lives ? -1 : a.lives > b.lives ? 0 : 1, reason);
  }
  // winner: 0/1 = Seite, -1 = unentschieden
  finish(winner, reason) {
    if (this.phase === 'done') return;
    const wasPlaying = this.phase === 'play';
    this.phase = 'done';
    const P = this.players;
    let d = [0, 0];
    const ranked = this.ranked && wasPlaying && P[0].userId && P[1].userId && P[0].userId !== P[1].userId;
    if (ranked) {
      const ra = P[0].rating, rb = P[1].rating;
      const ea = 1 / (1 + Math.pow(10, (rb - ra) / 400));
      const sa = winner === 0 ? 1 : winner === 1 ? 0 : 0.5;
      const da = Math.round(32 * (sa - ea));
      d = [da, -da];
    }
    for (const p of P) {
      this.send(p, { t: 'end', win: winner === p.side, draw: winner === -1, reason, delta: d[p.side], rating: p.rating != null ? p.rating + d[p.side] : null, round: this.game ? this.game.round : 0 });
      if (p.client) {
        p.client.match = null;
        p.client.side = null;
      }
    }
    if (wasPlaying) {
      try {
        this.hub.db.recordMatch({
          p1: P[0].userId, p2: P[1].userId, n1: P[0].name, n2: P[1].name, winner, reason, map: this.map,
          rounds: this.game.round, duration: Math.max(0, Math.round((Date.now() - this.startAt) / 1000)), ranked: !!ranked, d1: d[0], d2: d[1],
          l1: JSON.stringify(this.loadouts[0]), l2: JSON.stringify(this.loadouts[1]),
        });
      } catch (e) {
        this.hub.log('Fehler beim Speichern der Partie: ' + e.message);
      }
      this.hub.log('Partie ' + this.id + ' beendet (' + reason + '), Sieger: ' + (winner < 0 ? 'keiner' : P[winner].name));
    }
    this.hub.removeMatch(this);
  }

  // ---------------- Verbindung ----------------
  onLeave(client) {
    const p = this.players.find((x) => x.client === client);
    if (!p) return;
    if (this.phase === 'pre') {
      this.send(this.players[1 - p.side], { t: 'err', msg: 'Der Gegner hat die Vorrunde verlassen.' });
      p.client = null;
      return this.abort();
    }
    p.client = null;
    p.goneAt = Date.now();
    this.send(this.players[1 - p.side], { t: 'ev', k: 'gone' });
  }
  abort() {
    if (this.phase === 'done') return;
    this.phase = 'done';
    for (const p of this.players) {
      if (p.client) {
        this.send(p, { t: 'abort' });
        p.client.match = null;
      }
    }
    this.hub.removeMatch(this);
  }
  // Wiederverbinden: per Konto oder per Token aus der Start-Nachricht
  canRejoin(client, token) {
    if (this.phase !== 'play') return null;
    return this.players.find((p) => !p.client && ((client.user && p.userId === client.user.id) || (token && p.token === token))) || null;
  }
  rejoin(p, client) {
    p.client = client;
    client.match = this;
    client.side = p.side;
    p.cmds = [];
    p.lastQ = 0;
    p.ack = 0;
    this.sendStart(p);
    this.resync(p);
    this.send(this.players[1 - p.side], { t: 'ev', k: 'back' });
  }
  resync(p) {
    if (this.phase !== 'play' || !p.client) return;
    if (p.lastResync && Date.now() - p.lastResync < 1500) return;
    p.lastResync = Date.now();
    this.send(p, Object.assign({ t: 'rs', ack: p.ack }, this.game.resyncFor(p.side)));
  }
  quit(client) {
    const p = this.players.find((x) => x.client === client);
    if (!p) return;
    if (this.phase === 'pre') return this.onLeave(client);
    this.finish(1 - p.side, 'surrender');
  }
  send(p, msg) {
    if (p.client) p.client.send(msg);
  }
}

module.exports = { Match };
