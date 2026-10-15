'use strict';
// ============================================================
//  KI-Gegner: baut, rüstet auf, farmt und schickt Blasen
// ============================================================
SC.AI = class AI {
  // KI-Ausrüstung: 3 Türme + Würfel, muss Glas und Panzer kontern können
  static pickLoadout(diff) {
    const pool = SC.TOWER_ORDER.filter((k) => k !== 'farm' && k !== 'winker');
    const can = (list, cap) => list.some((k) => SC.CAPS[k][cap]);
    let towers = null;
    for (let i = 0; i < 60; i++) {
      const p = pool.slice().sort(() => Math.random() - 0.5).slice(0, 3);
      if (i < 50 && (!can(p, 'camo') || !can(p, 'armor'))) continue;
      towers = p;
      break;
    }
    if (diff !== 'easy' && Math.random() < 0.5) towers[2] = 'farm';
    towers.push(SC.rollDice(towers));
    const pw = SC.POWERS.map((p) => p.id).sort(() => Math.random() - 0.5).slice(0, 3);
    return { towers, powers: pw };
  }

  constructor(field, enemy, game, diff) {
    this.f = field;
    this.e = enemy;
    this.g = game;
    this.diff = diff;
    this.p = {
      easy: { think: 2.6, eff: 0.55, send: 0.25, farms: 0, reserve: 0.5, smart: 0.4, maxTier: 2, pick: 6 },
      normal: { think: 1.3, eff: 0.85, send: 0.45, farms: 1, reserve: 0.3, smart: 0.75, maxTier: 3, pick: 4 },
      hard: { think: 0.7, eff: 1.15, send: 0.5, farms: 2, reserve: 0.15, smart: 1, maxTier: 4, pick: 2 },
    }[diff];
    this.t = 3;
    this.fav = {};
    this.spots = this.computeSpots();
    this.rnd = Math.random;
  }

  computeSpots() {
    const f = this.f, P = f.path, spots = [];
    for (let y = 24; y < SC.H - 20; y += 26) {
      for (let x = 24; x < SC.W - 20; x += 26) {
        const dp = P.distTo(x, y);
        if (dp < SC.PATH_W / 2 + SC.TOWER_RADIUS || dp > 120) continue;
        let cov = 0;
        for (let i = 0; i < P.n; i += 6) {
          if (SC.d2(x, y, P.xs[i], P.ys[i]) < 110 * 110) cov += 1 + 0.4 * (i / P.n);
        }
        spots.push({ x, y, cov, near: dp < 70 });
      }
    }
    spots.sort((a, b) => b.cov - a.cov);
    return spots;
  }

  update(dt) {
    if (this.f.dead) return;
    this.t -= dt;
    if (this.t > 0) return;
    this.t = this.p.think * (0.7 + Math.random() * 0.6);
    this.useAbilities();
    this.usePowers();
    // mehrere Aktionen pro Denkschritt, wenn viel Geld da ist
    for (let i = 0; i < 4; i++) if (!this.act()) break;
  }

  useAbilities() {
    const f = this.f;
    const vis = f.visibleBloons();
    const moab = vis.some((b) => b.def.moab);
    let danger = false;
    for (const b of vis) if (b.dist > f.path.len * 0.6) danger = true;
    for (const t of f.towers) {
      if (!f.canUseAbility(t)) continue;
      const id = t.ab.def.id;
      if (id === 'cash' || id === 'bank' || vis.length > 25 || moab || danger) f.useAbility(t);
    }
  }

  usePowers() {
    const f = this.f, r = Math.max(1, this.g.round);
    if (this.p.smart < 0.5 && Math.random() < 0.5) return;
    const vis = f.visibleBloons();
    let front = null;
    for (const b of vis) if (!front || b.dist > front.dist) front = b;
    const danger = front && front.dist > f.path.len * 0.55;
    for (let i = 0; i < f.powers.length; i++) {
      const st = f.powerState(i, r);
      if (!st.ok || f.money - st.def.cost < 150) continue;
      const id = st.def.id;
      let x = 0, y = 0, use = false;
      if (id === 'cash') use = true;
      else if (id === 'spikes' || id === 'bomb') {
        if (danger) {
          x = front.x;
          y = front.y;
          use = true;
        }
      } else if (id === 'freeze' || id === 'shield' || id === 'rage') use = danger && vis.length > 8;
      else if (id === 'radar') use = vis.some((b) => b.camo) && !this.hasCamo();
      else if (id === 'heal') use = f.lives < 90;
      else if (id === 'boost' || id === 'fog') use = this.e.bloons.length > 12 && Math.random() < 0.3;
      if (use) f.usePower(i, x, y, r);
    }
  }

  needed(r) {
    let incoming = 0;
    for (const q of this.f.sendQueue) incoming += q.send.count * SC.BLOONS[q.send.type].rbe;
    for (const b of this.f.bloons) incoming += b.def.rbe * 0.3;
    return 250 + r * 70 + r * r * 8.5 + incoming * 3;
  }

  act() {
    const f = this.f, r = Math.max(1, this.g.round);
    const need = this.needed(r) * this.p.eff;
    const have = f.defenseValue();
    // Gefahr: Blasen weit vorne?
    let danger = false;
    for (const b of f.bloons) if (b.dist > f.path.len * 0.75) { danger = true; break; }

    if (have < need || danger) return this.buildDefense(r);

    // Farm?
    const farms = f.towers.filter((t) => t.kind === 'farm').length;
    if (f.canBuild('farm') && farms < this.p.farms && r >= 4 && r < 26 && f.money > 1100) {
      return this.place('farm');
    }
    if (farms && Math.random() < 0.3 * this.p.smart) {
      const fm = f.towers.find((t) => t.kind === 'farm' && f.upgradeState(t, 0).ok);
      if (fm && f.money > fm.def.paths[0][fm.tiers[0]].cost * 1.4) return f.upgrade(fm, 0);
    }
    // Senden
    if (Math.random() < this.p.send) return this.sendSomething(r);
    // sonst Verteidigung ausbauen, wenn Geld übrig
    if (f.money > need * 0.3) return this.buildDefense(r);
    return false;
  }

  hasCamo() {
    return this.f.towers.some((t) => t.s.camo || t.s.auraCamo || t.buff.camo || t.kind === 'yeti' || t.kind === 'pocke' || (t.kind === 'molt' && t.lvl >= 5));
  }
  hasArmor() {
    return this.f.towers.some((t) => (['punch', 'blast', 'heat'].includes(t.s.type) || (t.s.type === 'cold' && t.s.dmg > 0)) || t.s.auraArmor || (t.kind === 'post' && t.s.catchMax >= 7));
  }

  buildDefense(r) {
    const f = this.f;
    // Meister-Upgrade (Stufe 4), wenn sich das Geld angespart hat
    if (this.p.maxTier >= 4 && r >= 20) {
      for (const t of f.towers) {
        const p = this.fav[t.id];
        if (p == null || t.tiers[p] !== 3) continue;
        const st = f.upgradeState(t, p);
        if (st.ok) return f.upgrade(t, p);
        if (st.u && f.money > st.u.cost * 0.5) return false; // dafür sparen
      }
    }
    // Pflicht: Panzer- & Glas-Konter mit dem, was die Ausrüstung hergibt
    if (r >= 13 && !this.hasArmor()) {
      const res = this.counter('armor');
      if (res !== null) return res;
    }
    if (r >= 15 && !this.hasCamo()) {
      const res = this.counter('camo');
      if (res !== null) return res;
    }
    const towers = f.towers.filter((t) => t.kind !== 'farm' && t.kind !== 'winker');
    const maxTowers = 2 + Math.floor(r / 3);
    const wantNew = towers.length < maxTowers && (towers.length < 3 || Math.random() < 0.45);
    if (wantNew) {
      const kind = this.pickKind(r);
      if (f.money >= SC.TOWERS[kind].cost) return this.place(kind);
      if (towers.length < 2) return false; // sparen
    }
    // Upgrade: günstigstes sinnvolles
    let best = null, bc = Infinity;
    for (const t of f.towers) {
      if (t.kind === 'farm') continue;
      for (const p of this.pathOrder(t)) {
        const st = f.upgradeState(t, p);
        if (!st.u || st.why === 'locked' || st.why === 'max' || t.tiers[p] + 1 > this.p.maxTier) continue;
        const c = st.u.cost * (p === this.fav[t.id] ? 1 : 1.6);
        if (c < bc) {
          bc = c;
          best = { t, p, cost: st.u.cost };
        }
        break;
      }
    }
    if (best && f.money >= best.cost) return f.upgrade(best.t, best.p);
    return false;
  }

  // baut oder rüstet einen Turm auf, der die Fähigkeit cap ('camo'/'armor') bekommt
  counter(cap) {
    const f = this.f;
    const kinds = (f.allowed || SC.TOWER_ORDER).filter((k) => SC.CAPS[k] && SC.CAPS[k][cap]);
    if (!kinds.length) return null;
    for (const t of f.towers) {
      const c = SC.CAPS[t.kind][cap];
      if (!c || t.tiers[c[0]] >= c[1]) continue;
      const other = t.tiers[1 - c[0]];
      if (c[1] >= 3 && other >= 3) continue;
      this.fav[t.id] = c[0];
      return this.tryUpgrade(t, c[0]);
    }
    kinds.sort((a, b) => SC.CAPS[a][cap][1] - SC.CAPS[b][cap][1]);
    return this.place(kinds[0]);
  }

  pathOrder(t) {
    if (this.fav[t.id] == null) this.fav[t.id] = this.favPath(t.kind);
    const a = this.fav[t.id];
    return t.tiers[a] < SC.MAX_TIER ? [a, 1 - a] : [1 - a];
  }
  favPath(kind) {
    const pref = { knall: 0.5, fang: 0.5, einsiedler: 0.7, kokos: 0.6, pocke: 0.6, winker: 0.5, yeti: 0.6, spinne: 0.65, krill: 0.5, post: 0.6, tide: 0.55, molt: 0.6, dice: 0.5 };
    return Math.random() < (pref[kind] || 0.5) ? 0 : 1;
  }

  pickKind(r) {
    const all = { knall: 3, fang: 2.5, einsiedler: 1.6, spinne: 2, kokos: r >= 6 ? 1.6 : 0.4, yeti: r >= 8 ? 0.6 : 0.2, pocke: r >= 5 ? 1.2 : 0.3, krill: r >= 10 ? 1.6 : 0.4, post: 1.2, tide: r >= 6 ? 1 : 0.3, molt: 2, dice: 2.4 };
    if (this.f.towers.length >= 6 && !this.f.towers.some((t) => t.kind === 'winker')) all.winker = 1.5;
    const w = {};
    for (const k in all) if (this.f.canBuild(k) && all[k] > 0) w[k] = all[k];
    if (!Object.keys(w).length) {
      for (const k of this.f.allowed || []) if (k !== 'farm') w[k] = 1;
    }
    let sum = 0;
    for (const k in w) sum += w[k];
    let x = Math.random() * sum;
    for (const k in w) {
      x -= w[k];
      if (x <= 0) return k;
    }
    return Object.keys(w)[0] || 'knall';
  }

  place(kind) {
    const f = this.f;
    if (!f.canBuild(kind) || f.money < SC.TOWERS[kind].cost) return false;
    const cands = [];
    for (const s of this.spots) {
      if (kind === 'farm' && s.near) continue;
      if (f.canPlace(kind, s.x, s.y)) {
        cands.push(s);
        if (cands.length >= 6) break;
      }
    }
    if (!cands.length && kind === 'farm') {
      for (let i = 0; i < 120; i++) {
        const x = 40 + Math.random() * (SC.W - 80), y = 40 + Math.random() * (SC.H - 80);
        if (f.canPlace(kind, x, y)) {
          cands.push({ x, y });
          break;
        }
      }
    }
    if (!cands.length) return false;
    const s = cands[Math.floor(Math.random() * Math.min(cands.length, this.p.pick))];
    const t = f.placeTower(kind, s.x, s.y);
    if (t) {
      if (kind === 'yeti' || kind === 'spinne' || kind === 'molt') t.target = 'close';
      if (kind === 'kokos' && Math.random() < 0.5) t.target = 'strong';
    }
    return !!t;
  }

  tryUpgrade(t, p) {
    const st = this.f.upgradeState(t, p);
    if (st.ok) return this.f.upgrade(t, p);
    return false;
  }

  sendSomething(r) {
    const f = this.f;
    if (this.g.queueLen(this.e) >= SC.SEND_QUEUE_MAX) return false;
    const reserve = this.needed(r) * this.p.reserve * 0.3;
    const budget = f.money - reserve;
    const avail = SC.SENDS.filter((s) => s.round <= r && s.cost <= budget);
    if (!avail.length) return false;
    // Eco-Sends bevorzugen, manchmal Rush mit Riesen
    let pick;
    const big = avail.filter((s) => s.eco <= 0);
    if (big.length && this.p.smart >= 0.75 && Math.random() < 0.15) pick = big[big.length - 1];
    else {
      const eco = avail.filter((s) => s.eco > 0);
      if (!eco.length) return false;
      const top = eco.slice(-3);
      pick = top[Math.floor(Math.random() * top.length)];
    }
    const mods = {};
    if (r >= SC.SEND_MOD.regrow.round && Math.random() < 0.15) mods.regrow = true;
    if (r >= SC.SEND_MOD.camo.round && Math.random() < 0.12 * this.p.smart) mods.camo = true;
    return this.g.doSend(f, this.e, pick, mods);
  }
};
