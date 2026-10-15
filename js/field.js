'use strict';
// ============================================================
//  Ein Spielfeld = die Karte eines Spielers mit Türmen & Blasen
// ============================================================
SC.towerStats = function (kind, tiers) {
  const def = SC.TOWERS[kind];
  const s = JSON.parse(JSON.stringify(def.base));
  for (let p = 0; p < 2; p++) for (let i = 0; i < tiers[p]; i++) def.paths[p][i].apply(s);
  return s;
};

SC.Field = class Field {
  constructor(game, o) {
    this.game = game;
    this.map = o.map;
    this.path = SC.buildPath(o.map);
    this.mode = o.mode; // 'battle' | 'classic'
    this.name = o.name || 'Spieler';
    this.lives = o.lives;
    this.money = o.money;
    this.eco = o.eco;
    this.bloons = [];
    this.towers = [];
    this.projs = [];
    this.piles = [];
    this.fx = [];
    this.crates = [];
    this.whales = [];
    this.spawns = [];
    this.sendQueue = [];
    this.sendBusyUntil = 0;
    this.time = 0;
    this.nid = 1;
    this.buffT = 0;
    this.stats = { pops: 0, leaked: 0, sent: 0, built: 0 };
    this.dead = false;
    this.rush = 1; // Strömungs-Eskalation im Battle-Modus
    this.gBoostT = 0; // Großer Balztanz
    this.slowAllT = 0;
    this.slowAllF = 1;
    this.local = o.local !== false; // lokale Felder machen Sound
    this.headless = !!o.headless; // Server: keine Effekte
    this.maxLives = o.lives;
    this.rng = new SC.Rng(o.seed || 1);
    this.tid = 1; // Turm-IDs (vom Client vergeben, damit Server & Client gleich zählen)
    this.cid = 1; // Kisten-IDs
    // Ausrüstung: erlaubte Türme (null = alle) und Kräfte
    this.allowed = o.towers ? o.towers.slice() : null;
    this.powers = (o.powers || []).map((id) => ({ id, cd: 0 }));
    this.rageT = 0;
    this.radarT = 0;
    this.shieldT = 0;
    this.shieldHp = 0;
    this.hexBoostT = 0;
    this.hexFogT = 0;
    this.curSend = null; // gerade ausströmender Send (für die Röhre)
    this._p = { x: 0, y: 0, a: 0 };
  }
  rnd() {
    return this.rng.next();
  }
  canBuild(kind) {
    return !this.allowed || this.allowed.indexOf(kind) >= 0;
  }
  // Ereignisse, die das andere Feld betreffen (Flaschenpost, Flüche)
  emit(kind, data) {
    if (this.game && this.game.onFieldEvent) this.game.onFieldEvent(this, kind, data);
  }

  // ---------------- Spawns ----------------
  queueRound(r) {
    const R = SC.getRound(r);
    for (const sp of R.spawns) this.spawns.push({ at: this.time + sp.at + 0.5, type: sp.type, camo: sp.camo, regrow: sp.regrow });
    this.spawns.sort((a, b) => a.at - b.at);
  }
  receiveSend(send, mods, force) {
    if (!force && this.sendQueue.length >= SC.SEND_QUEUE_MAX) return false;
    this.sendQueue.push({ send, mods: mods || {} });
    return true;
  }
  // Flaschenpost: gefangene Blasen des Gegners kommen hier an
  receivePost(types, mods) {
    const list = types.filter((t) => SC.BLOONS[t]).slice(0, 24);
    if (!list.length || this.sendQueue.length >= SC.POST_QUEUE_MAX) return false;
    const big = list.some((t) => SC.BLOONS[t].moab);
    this.sendQueue.push({ send: { id: 'post', types: list, type: list[0], count: list.length, spacing: big ? 1.2 : 0.22 }, mods: mods || {} });
    return true;
  }
  applyHex(id, dur) {
    if (id === 'boost') this.hexBoostT = Math.max(this.hexBoostT, dur);
    else if (id === 'fog') {
      this.hexFogT = Math.max(this.hexFogT, dur);
      this.buffT = 0;
    }
  }
  spawnBloon(type, dist, camo, regrow, orig) {
    const d = SC.BLOONS[type];
    const b = {
      id: this.nid++, type, def: d, hp: d.hp, dist, x: 0, y: 0, a: 0,
      camo: !!camo, regrow: !!regrow, orig: orig || type, regT: 0,
      frozen: 0, slowT: 0, slowF: 1, stun: 0, immP: 0, dead: false, aura: 1, vuln: 0, markT: 0, dotT: 0, dotA: 0, pushes: 0, soakT: 0,
    };
    this.path.pos(dist, this._p);
    b.x = this._p.x;
    b.y = this._p.y;
    b.a = this._p.a;
    this.bloons.push(b);
    return b;
  }

  // ---------------- Schaden ----------------
  hit(b, dmg, type, o) {
    if (b.dead) return false;
    const d = b.def;
    if (d.immune && d.immune.indexOf(type) >= 0) {
      if (!(o && o.armorBreak && b.type === 'armor')) {
        if (Math.random() < 0.3) this.addFx({ k: 'tink', x: b.x, y: b.y, dur: 0.15 });
        return false;
      }
    }
    if (o) {
      if (d.moab && o.moabMul) dmg *= o.moabMul;
      else if (b.type === 'coral' && o.coralMul) dmg *= o.coralMul;
      if (o.strip) {
        b.camo = false;
        b.regrow = false;
      }
      if (o.slow) {
        const f = d.moab ? Math.max(o.slow.f, 0.8) : o.slow.f;
        b.slowF = b.slowT > 0 ? Math.min(b.slowF, f) : f;
        b.slowT = Math.max(b.slowT, o.slow.t);
      }
      if (o.knock && d.moab) b.dist = Math.max(0, b.dist - o.knock);
      if (o.stun) {
        if (!d.moab) b.stun = Math.max(b.stun, o.stun);
        else if (o.moabStun) b.stun = Math.max(b.stun, o.moabStun);
      }
    }
    this.damage(b, dmg + b.vuln + (b.markT > 0 ? 2 : 0) + (b.soakT > 0 ? 1 : 0), (o && o.id) || 0);
    return true;
  }
  damage(b, dmg, pid) {
    if (b.dead) return;
    b.hp -= dmg;
    if (b.hp > 0) return;
    this.pop(b, pid, -b.hp);
  }
  pop(b, pid, over) {
    b.dead = true;
    this.stats.pops++;
    if (this.mode === 'classic') this.money += 1;
    const d = b.def;
    if (this.fx.length < 160) this.addFx({ k: 'pop', x: b.x, y: b.y, dur: d.moab ? 0.4 : 0.18, s: d.moab ? 3 : 1 });
    if (d.moab) {
      this.addFx({ k: 'bigboom', x: b.x, y: b.y, r: d.r * 2.6, dur: 0.7 });
      this.sparks(b.x, b.y, 22, [d.color, '#ffffff', '#ffe14d'], 220);
      this.shake = Math.max(this.shake || 0, b.type === 'puffer' ? 0.25 : 0.5);
    }
    if (this.local) SC.audio.pop(d.moab);
    const ch = d.children;
    const n = ch.length;
    for (let i = 0; i < n; i++) {
      const off = (i - (n - 1) / 2) * (n > 2 ? 14 : 9);
      const c = this.spawnBloon(ch[i], Math.max(0, b.dist + off), b.camo, b.regrow, b.orig);
      c.immP = pid;
      c.slowT = b.slowT;
      c.slowF = b.slowF;
      c.markT = b.markT;
      c.dotT = b.dotT;
      c.pushes = b.pushes;
      c.soakT = b.soakT;
      if (i === 0 && over > 0) this.damage(c, over, pid);
    }
  }
  explode(x, y, r, dmg, type, pierce, o, col) {
    let n = 0;
    const L = this.bloons.length;
    for (let i = 0; i < L && n < pierce; i++) {
      const b = this.bloons[i];
      if (b.dead) continue;
      const rr = r + b.def.r;
      if (SC.d2(x, y, b.x, b.y) < rr * rr) {
        this.hit(b, dmg, type, o);
        n++;
      }
    }
    this.addFx({ k: 'boom', x, y, r, dur: 0.28, c: col || (type === 'heat' ? '#ffcf4d' : '#ffffff') });
  }
  sparks(x, y, n, cols, speed, confetti) {
    if (this.headless || this.fx.length > 260) return;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, v = speed * (0.4 + Math.random() * 0.8);
      this.fx.push({ k: confetti ? 'confetti' : 'spark', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - (confetti ? speed * 0.6 : 0), c: cols[i % cols.length], t: 0, dur: confetti ? 1.4 : 0.6 + Math.random() * 0.3, rot: Math.random() * 6, s: 2 + Math.random() * 2.5 });
    }
  }
  addFx(f) {
    if (this.headless) return;
    f.t = 0;
    this.fx.push(f);
  }

  // ---------------- Türme ----------------
  canPlace(kind, x, y) {
    const R = SC.towerRadius(kind);
    if (x < R || y < R || x > SC.W - R || y > SC.H - R) return false;
    if (this.path.distTo(x, y) < SC.PATH_W / 2 + R - 2) return false;
    for (const t of this.towers) {
      const rr = R + SC.towerRadius(t.kind) - 2;
      if (SC.d2(t.x, t.y, x, y) < rr * rr) return false;
    }
    return true;
  }
  towerById(id) {
    for (const t of this.towers) if (t.id === id) return t;
    return null;
  }
  newTower(kind, x, y, id) {
    const def = SC.TOWERS[kind];
    const t = {
      id, kind, def, x, y, tiers: [0, 0], spent: def.cost, s: null, cd: 0.2, ang: -Math.PI / 2, anim: 0,
      target: 'first', buff: { speed: 0, range: 0, pierce: 0, camo: false, armor: false, dance: false, dmg: 0 },
      cnt: 0, drones: [], orbitA: 0, orbHit: new Map(), danceT: 0, danceCd: 25, pearlT: 30, bankT: 30, whaleT: 12, cannonCd: 1,
      xp: 0, lvl: 1, shellT: 15, bag: [], luckyT: 0,
    };
    t.s = SC.towerStats(kind, t.tiers);
    return t;
  }
  placeTower(kind, x, y, free, id) {
    const def = SC.TOWERS[kind];
    if (!def || !this.canBuild(kind)) return null;
    if (!free && this.money < def.cost) return null;
    if (!this.canPlace(kind, x, y)) return null;
    if (id == null) id = this.tid;
    if (this.towerById(id)) return null;
    this.tid = Math.max(this.tid, id + 1);
    if (!free) this.money -= def.cost;
    const t = this.newTower(kind, x, y, id);
    t.born = this.time;
    this.towers.push(t);
    this.stats.built++;
    this.buffT = 0;
    this.addFx({ k: 'dust', x, y: y + 6, dur: 0.5, r: SC.towerRadius(kind) + 10 });
    return t;
  }
  upgradeState(t, p) {
    const tier = t.tiers[p];
    if (tier >= SC.MAX_TIER) return { ok: false, why: 'max' };
    const other = t.tiers[1 - p];
    if (tier + 1 >= 3 && other >= 3) return { ok: false, why: 'locked' };
    const u = t.def.paths[p][tier];
    return { ok: this.money >= u.cost, why: this.money >= u.cost ? '' : 'money', u };
  }
  upgrade(t, p) {
    const st = this.upgradeState(t, p);
    if (!st.ok) return false;
    this.money -= st.u.cost;
    t.spent += st.u.cost;
    t.tiers[p]++;
    t.s = SC.towerStats(t.kind, t.tiers);
    t.sx = null;
    if (t.tiers[p] === SC.MAX_TIER) t.ab = { def: st.u.ability, cd: st.u.ability.cd * 0.25 };
    t.pathPts = null;
    this.buffT = 0;
    this.sparks(t.x, t.y, 14, ['#ffe14d', '#ffffff', '#7fe0ff'], 120);
    this.addFx({ k: 'ring', x: t.x, y: t.y, r: 34, dur: 0.45, c: '#ffd23f' });
    this.addFx({ k: 'text', x: t.x, y: t.y - 26, txt: 'UPGRADE!', dur: 1, c: '#b6ff6a' });
    if (t.tiers[p] === SC.MAX_TIER) {
      this.addFx({ k: 'pillar', x: t.x, y: t.y, dur: 1.4 });
      this.sparks(t.x, t.y, 40, ['#ff4d4d', '#ffe14d', '#4fd34a', '#3aa8ff', '#ff6fb5', '#ffffff'], 260, true);
      this.shake = Math.max(this.shake || 0, 0.35);
      if (this.local) SC.audio.tier4();
      if (this.game.notify) this.game.notify('tier4', t);
    }
    return true;
  }
  sellValue(t) {
    return Math.floor(t.spent * 0.7);
  }
  sell(t) {
    if (this.towers.indexOf(t) < 0) return false;
    this.money += this.sellValue(t);
    this.towers.splice(this.towers.indexOf(t), 1);
    this.piles = this.piles.filter((p) => p.owner !== t.id);
    this.buffT = 0;
    this.addFx({ k: 'text', x: t.x, y: t.y, txt: '+' + this.sellValue(t), dur: 0.9, c: '#ffe14d' });
    return true;
  }

  // ---------------- Zielsuche ----------------
  score(b, mode, t) {
    switch (mode) {
      case 'last': return -b.dist;
      case 'strong': return b.def.idx * 100000 + b.dist;
      case 'close': return -SC.d2(b.x, b.y, t.x, t.y);
      default: return b.dist;
    }
  }
  findTarget(t, range, camo, mode) {
    let best = null, bv = -Infinity;
    const m = mode || t.target;
    for (const b of this.bloons) {
      if (b.dead || (b.camo && !camo)) continue;
      if (b.dist < this.path.visStart - 5 || b.dist > this.path.visEnd + 5) continue;
      const rr = range + b.def.r;
      if (range < 5000 && SC.d2(t.x, t.y, b.x, b.y) > rr * rr) continue;
      const v = this.score(b, m, t);
      if (v > bv) {
        bv = v;
        best = b;
      }
    }
    return best;
  }
  findTargets(t, range, camo, n, mode) {
    const m = mode || t.target;
    const list = [];
    for (const b of this.bloons) {
      if (b.dead || (b.camo && !camo)) continue;
      if (b.dist < this.path.visStart - 5 || b.dist > this.path.visEnd + 5) continue;
      const rr = range + b.def.r;
      if (range < 5000 && SC.d2(t.x, t.y, b.x, b.y) > rr * rr) continue;
      list.push(b);
    }
    if (list.length > n) {
      list.sort((a, b) => this.score(b, m, t) - this.score(a, m, t));
      list.length = n;
    }
    return list;
  }
  lead(b, speed, fx, fy) {
    const d = SC.dist(fx, fy, b.x, b.y);
    const tt = d / speed;
    const bs = b.frozen > 0 || b.stun > 0 ? 0 : b.def.speed * SC.SPEED * (b.slowT > 0 ? b.slowF : 1) * b.aura * this.rush;
    return this.path.pos(b.dist + bs * tt, { x: 0, y: 0, a: 0 });
  }
  inRange(t, b, range) {
    const rr = range + b.def.r;
    return SC.d2(t.x, t.y, b.x, b.y) <= rr * rr;
  }

  // ---------------- Buffs (Winkerkrabbe & Co.) ----------------
  computeBuffs() {
    for (const t of this.towers) {
      const b = t.buff;
      b.speed = 0; b.range = 0; b.pierce = 0; b.camo = false; b.armor = false; b.dance = false; b.dmg = 0;
    }
    for (const w of this.towers) {
      const s = w.s;
      const isW = w.kind === 'winker';
      if (!isW && !s.auraCamo && !s.auraPierce && !s.auraRange && !s.auraDmg && !s.teach) continue;
      const R = s.range;
      for (const o of this.towers) {
        if (o === w || SC.d2(o.x, o.y, w.x, w.y) > R * R) continue;
        const b = o.buff;
        if (s.teach) b.speed = Math.max(b.speed, Math.min(s.teach2 ? 0.4 : 0.2, w.lvl * (s.teach2 ? 0.04 : 0.02)));
        if (isW) {
          b.speed = Math.max(b.speed, s.buffSpeed || 0);
          if (s.buffRange) b.range = Math.max(b.range, s.buffRange);
          if (s.buffPierce) b.pierce = Math.max(b.pierce, s.buffPierce);
          if (s.auraArmor) b.armor = true;
          if (w.danceT > 0) b.dance = true;
        }
        if (s.auraCamo) b.camo = true;
        if (s.auraPierce) b.pierce = Math.max(b.pierce, s.auraPierce);
        if (s.auraRange) b.range = Math.max(b.range, s.auraRange);
        if (s.auraDmg) b.dmg = Math.max(b.dmg, s.auraDmg);
      }
    }
    for (const t of this.towers) t.sx = t.buff.dmg && t.s.dmg ? Object.assign({}, t.s, { dmg: t.s.dmg + t.buff.dmg }) : null;
  }

  // ---------------- Update ----------------
  update(dt) {
    this.time += dt;
    const P = this.path;
    // Sends starten
    if (this.sendQueue.length && this.time >= this.sendBusyUntil) {
      const { send, mods } = this.sendQueue.shift();
      for (let i = 0; i < send.count; i++) this.spawns.push({ at: this.time + i * send.spacing, type: send.types ? send.types[i] : send.type, camo: !!mods.camo, regrow: !!mods.regrow });
      this.spawns.sort((a, b) => a.at - b.at);
      this.sendBusyUntil = this.time + send.count * send.spacing + 0.2;
      this.curSend = { id: send.id, type: send.type, count: send.count, t0: this.time, t1: this.sendBusyUntil, camo: !!mods.camo, regrow: !!mods.regrow };
    }
    if (this.curSend && this.time >= this.curSend.t1) this.curSend = null;
    // Spawns
    while (this.spawns.length && this.spawns[0].at <= this.time) {
      const sp = this.spawns.shift();
      this.spawnBloon(sp.type, 0, sp.camo, sp.regrow);
    }

    // Blasen bewegen
    for (const b of this.bloons) {
      if (b.dead) continue;
      if (b.frozen > 0) b.frozen -= dt;
      if (b.stun > 0) b.stun -= dt;
      if (b.slowT > 0) b.slowT -= dt;
      let sp = b.def.speed * SC.SPEED * (b.slowT > 0 ? b.slowF : 1) * b.aura * this.rush;
      if (this.slowAllT > 0) sp *= b.def.moab ? 0.5 : this.slowAllF;
      if (this.hexBoostT > 0) sp *= 1.4;
      if (b.frozen > 0 || b.stun > 0) sp = 0;
      if (b.markT > 0) b.markT -= dt;
      if (b.soakT > 0) b.soakT -= dt;
      if (b.dotT > 0) {
        b.dotT -= dt;
        b.dotA += dt;
        if (b.dotA >= 0.5) {
          b.dotA -= 0.5;
          this.hit(b, 2, 'pure', null);
          if (b.dead) continue;
        }
      }
      b.dist += sp * dt;
      b.aura = 1;
      b.vuln = 0;
      if (b.regrow) {
        b.regT += dt;
        if (b.regT >= 2.2) {
          b.regT = 0;
          const up = SC.REGROW_UP[b.type];
          if (up && SC.BLOONS[up].idx <= SC.BLOONS[b.orig].idx) {
            b.type = up;
            b.def = SC.BLOONS[up];
            b.hp = b.def.hp;
          }
        }
      }
      if (b.dist >= P.len) {
        b.dead = true;
        let lost = Math.max(1, Math.ceil(b.def.rbe - (b.def.hp - b.hp)));
        if (this.shieldT > 0 && this.shieldHp > 0) {
          const blk = Math.min(lost, this.shieldHp);
          this.shieldHp -= blk;
          lost -= blk;
          this.addFx({ k: 'ring', x: b.x, y: b.y, r: 30, dur: 0.4, c: '#58c4ff' });
          if (lost <= 0) continue;
        }
        this.lives -= lost;
        this.stats.leaked += lost;
        this.leakFlash = 0.45;
        if (this.local) SC.audio.leak();
        if (this.lives <= 0 && !this.dead) {
          this.lives = 0;
          this.dead = true;
          this.game.onFieldDead(this);
        }
        continue;
      }
      P.pos(b.dist, this._p);
      b.x = this._p.x;
      b.y = this._p.y;
      b.a = this._p.a;
    }

    if (this.shake > 0) this.shake -= dt;
    if (this.leakFlash > 0) this.leakFlash -= dt;
    if (this.gBoostT > 0) this.gBoostT -= dt;
    if (this.slowAllT > 0) this.slowAllT -= dt;
    if (this.rageT > 0) this.rageT -= dt;
    if (this.radarT > 0) this.radarT -= dt;
    if (this.shieldT > 0) this.shieldT -= dt;
    if (this.hexBoostT > 0) this.hexBoostT -= dt;
    if (this.hexFogT > 0) {
      this.hexFogT -= dt;
      if (this.hexFogT <= 0) this.buffT = 0;
    }
    for (const p of this.powers) if (p.cd > 0) p.cd -= dt;
    // Buffs
    this.buffT -= dt;
    if (this.buffT <= 0) {
      this.buffT = 0.25;
      this.computeBuffs();
    }
    // Auren (Verlangsamung / Verwundbarkeit)
    for (const t of this.towers) {
      const s = t.s;
      if (s.zone || s.moabSlow || s.permaSlow || s.ebb) {
        const R = s.range;
        for (const b of this.bloons) {
          if (b.dead || !this.inRange(t, b, R)) continue;
          if (s.zone) {
            b.aura = Math.min(b.aura, 0.75);
            b.vuln = 1;
          }
          if (s.moabSlow && b.def.moab) b.aura = Math.min(b.aura, s.moabSlow);
          if (s.permaSlow) b.aura = Math.min(b.aura, b.def.moab ? 0.75 : s.permaSlow);
          if (s.ebb && (!b.camo || s.camo)) b.aura = Math.min(b.aura, b.def.moab ? Math.max(0.85, s.ebb) : s.ebb);
        }
      }
    }
    // Türme
    for (const t of this.towers) this.updateTower(t, dt);
    // Projektile
    for (const p of this.projs) this.updateProj(p, dt);
    // Fallen
    for (const pl of this.piles) this.updatePile(pl, dt);
    // Wale (Krill B3)
    for (const w of this.whales) {
      w.t += dt;
      if (!w.ate && w.t > w.dur * 0.4) {
        w.ate = true;
        for (const b of this.bloons) {
          if (b.dead || b.dist < w.d0 || b.dist > w.d1) continue;
          if (b.def.moab) this.hit(b, 300, 'pure', null);
          else {
            b.dead = true;
            this.stats.pops += b.def.rbe;
            if (this.mode === 'classic') this.money += b.def.rbe;
          }
        }
        if (this.local) SC.audio.whale();
      }
    }
    this.whales = this.whales.filter((w) => w.t < w.dur);
    // Kisten
    for (const c of this.crates) {
      c.t += dt;
      if (!c.done && c.t >= c.auto) this.collectCrate(c);
    }
    this.crates = this.crates.filter((c) => !c.done);
    // Aufräumen
    if (this.bloons.length) this.bloons = this.bloons.filter((b) => !b.dead);
    if (this.projs.length) this.projs = this.projs.filter((p) => !p.dead);
    if (this.piles.length) this.piles = this.piles.filter((p) => !p.dead);
    for (const f of this.fx) f.t += dt;
    if (this.fx.length) this.fx = this.fx.filter((f) => f.t < f.dur);
  }

  // ---------------- Spezialfähigkeiten (Stufe 4) ----------------
  visibleBloons() {
    const P = this.path;
    return this.bloons.filter((b) => !b.dead && b.dist >= P.visStart && b.dist <= P.visEnd);
  }
  strongest() {
    let best = null;
    for (const b of this.visibleBloons()) if (!best || b.def.rbe * 1000 + b.hp > best.def.rbe * 1000 + best.hp) best = b;
    return best;
  }
  canUseAbility(t) {
    return !!(t.ab && t.ab.cd <= 0);
  }
  useAbility(t) {
    if (!this.canUseAbility(t)) return false;
    const a = t.ab.def;
    t.ab.cd = a.cd;
    t.anim = 1;
    const vis = this.visibleBloons();
    switch (a.id) {
      case 'screenDmg':
        for (const b of vis) this.hit(b, a.dmg, 'pure', { stun: a.stun, moabStun: a.moabStun });
        this.addFx({ k: 'flash', x: t.x, y: t.y, dur: 0.6, c: a.col });
        if (this.local) SC.audio.boom();
        break;
      case 'selfBoost':
        t.boostT = a.dur;
        t.boostMul = a.mul;
        this.addFx({ k: 'ring', x: t.x, y: t.y, r: 60, dur: 0.6, c: '#ffd23f' });
        break;
      case 'smite': {
        const b = this.strongest();
        if (b) {
          this.addFx({ k: 'boom', x: b.x, y: b.y, r: 70, dur: 0.5, c: '#ffffff' });
          this.hit(b, a.dmg, 'pure', null);
          this.explode(b.x, b.y, 80, 20, 'pure', 60, null, '#bdf3ff');
        }
        if (this.local) SC.audio.boom();
        break;
      }
      case 'mark':
        for (const b of vis) {
          b.camo = false;
          b.regrow = false;
          b.markT = a.dur;
        }
        this.addFx({ k: 'flash', x: t.x, y: t.y, dur: 0.6, c: '#ff8de0' });
        break;
      case 'tornado':
        t.tornadoT = a.dur;
        break;
      case 'salvo':
        t.salvoN = a.n;
        t.salvoI = a.dur / a.n;
        t.salvoT = 0;
        break;
      case 'meteor': {
        const b = this.strongest();
        const tx = b ? b.x : SC.W / 2, ty = b ? b.y : SC.H / 2;
        this.projs.push({ id: this.nid++, kind: 'meteor', mode: 'lob', x0: tx - 160, y0: ty - 300, x1: tx, y1: ty, x: tx, y: ty, t: 0, dur: 0.75, dmg: a.dmg, type: 'pure', pierce: 400, aoe: a.r, moabMul: a.moabMul, big: true });
        break;
      }
      case 'storm':
        t.stormN = a.n;
        t.stormI = a.dur / a.n;
        t.stormT = 0;
        break;
      case 'reef': {
        const P = this.path, pts = [];
        const R = t.s.range + 60;
        for (let i = 0; i < P.n; i += 3) {
          if (P.xs[i] < 0 || P.ys[i] < 0 || P.xs[i] > SC.W || P.ys[i] > SC.H) continue;
          if (SC.d2(P.xs[i], P.ys[i], t.x, t.y) <= R * R) pts.push(i);
        }
        for (let k = 0; k < a.n && pts.length; k++) {
          const i = pts[Math.floor((k / a.n) * pts.length)];
          this.piles.push({ id: this.nid++, owner: t.id, x: P.xs[i], y: P.ys[i], sx: t.x, sy: t.y, fly: 0, pierce: 80, maxP: 80, dmg: 3, type: 'punch', life: 60, big: true, hits: new Set() });
        }
        break;
      }
      case 'plague':
        for (const b of vis) b.dotT = a.dur;
        this.addFx({ k: 'flash', x: t.x, y: t.y, dur: 0.6, c: '#b25cff' });
        break;
      case 'globalBoost':
        this.gBoostT = a.dur;
        this.buffT = 0;
        this.addFx({ k: 'flash', x: t.x, y: t.y, dur: 0.6, c: '#ff6fb5' });
        break;
      case 'slowAll':
        this.slowAllT = a.dur;
        this.slowAllF = a.f;
        this.addFx({ k: 'flash', x: t.x, y: t.y, dur: 0.6, c: '#ffd23f' });
        break;
      case 'erupt':
        t.eruptT = a.dur;
        break;
      case 'freezeAll':
        for (const b of vis) {
          if (b.def.moab) {
            b.slowF = 0.4;
            b.slowT = a.dur;
          } else if (b.type !== 'ice' && b.type !== 'stripe') b.frozen = Math.max(b.frozen, a.dur);
        }
        this.addFx({ k: 'flash', x: t.x, y: t.y, dur: 0.7, c: '#bfefff' });
        if (this.local) SC.audio.freeze(false);
        break;
      case 'swarm':
        t.extraT = a.dur;
        t.extraN = a.n;
        break;
      case 'whale': {
        const ds = vis.map((b) => b.dist).sort((x, y) => x - y);
        let d0 = this.path.visStart + 40;
        if (ds.length) {
          let best = 0, j = 0;
          for (let i = 0; i < ds.length; i++) {
            while (ds[i] - ds[j] > a.len) j++;
            if (i - j + 1 > best) {
              best = i - j + 1;
              d0 = ds[j] - 20;
            }
          }
        }
        this.whales.push({ d0, d1: d0 + a.len, t: 0, dur: 2.2, ate: false, big: true });
        break;
      }
      case 'cash':
        this.spawnCrate(t, a.amount, 'coin');
        break;
      case 'bank':
        this.spawnCrate(t, Math.min(a.max, Math.floor(this.money * a.pct)), 'coin');
        break;
      // ---- neue Türme ----
      case 'cage': {
        let best = null;
        for (const b of vis) {
          if (b.type === 'kraken') continue;
          if (!best || b.def.rbe * 1000 + b.hp > best.def.rbe * 1000 + best.hp) best = b;
        }
        if (best) {
          this.addFx({ k: 'net', x: best.x, y: best.y, r: best.def.r * 1.6, dur: 0.6 });
          this.capture(best);
          this.shipPost(t, [best.type], true);
        }
        break;
      }
      case 'mail':
        this.shipPost(t, ['puffer'], true);
        break;
      case 'surge':
        for (const b of vis) {
          const k = b.type === 'kraken' ? 0.35 : 1;
          b.dist = Math.max(0, b.dist - (b.def.moab ? a.moabPush * k : a.push));
          if (!b.def.moab) b.stun = Math.max(b.stun, 1);
        }
        this.addFx({ k: 'flash', x: t.x, y: t.y, dur: 0.7, c: '#4fd6ff' });
        if (this.local) SC.audio.whale();
        break;
      case 'moon':
        for (const b of vis) {
          b.slowF = b.def.moab ? 0.5 : 0.2;
          b.slowT = Math.max(b.slowT, a.dur);
          b.dotT = Math.max(b.dotT, a.dur);
        }
        this.addFx({ k: 'flash', x: t.x, y: t.y, dur: 0.7, c: '#dfe8ff' });
        break;
      case 'ancient':
        this.explode(t.x, t.y, a.r, a.dmg, 'pure', 300, { moabMul: 3 }, '#ffcf8a');
        this.addFx({ k: 'bigboom', x: t.x, y: t.y, r: a.r, dur: 0.7 });
        if (this.local) SC.audio.boom();
        break;
      case 'bigmolt':
        t.xp = Math.max(t.xp, SC.MOLT_XP[Math.min(SC.MOLT_XP.length - 1, t.lvl + 1)]);
        t.boostT = a.dur;
        t.boostMul = a.mul;
        this.addFx({ k: 'ring', x: t.x, y: t.y, r: 60, dur: 0.6, c: '#ffd23f' });
        break;
      case 'lucky':
        t.luckyT = a.dur;
        this.addFx({ k: 'ring', x: t.x, y: t.y, r: 60, dur: 0.6, c: '#ffe14d' });
        break;
      case 'jackpot': {
        let sum = 0;
        const faces = [];
        for (let i = 0; i < 3; i++) {
          const r = 1 + this.rng.int(6);
          faces.push(r);
          sum += r;
        }
        this.money += sum * 50;
        for (const b of vis) this.hit(b, sum * 2, 'pure', null);
        this.addFx({ k: 'text', x: t.x, y: t.y - 34, txt: faces.join(' + ') + ' = ' + sum * 50, dur: 1.6, c: '#ffe14d' });
        this.addFx({ k: 'flash', x: t.x, y: t.y, dur: 0.6, c: '#ffe14d' });
        if (this.local) SC.audio.coin();
        break;
      }
    }
    if (this.local) SC.audio.ability();
    this.shake = Math.max(this.shake || 0, 0.3);
    if (this.game.notify) this.game.notify('ability', { t, field: this });
    return true;
  }
  updateAbilityFx(t, dt) {
    if (t.tornadoT > 0) t.tornadoT -= dt;
    if (t.eruptT > 0) {
      t.eruptT -= dt;
      t.cd = Math.min(t.cd, 0.25);
    }
    if (t.extraT > 0) t.extraT -= dt;
    if (t.salvoN > 0) {
      t.salvoT -= dt;
      while (t.salvoN > 0 && t.salvoT <= 0) {
        t.salvoT += t.salvoI;
        t.salvoN--;
        const vis = this.visibleBloons();
        if (!vis.length) continue;
        const b = vis[this.rng.int(vis.length)];
        const ang = Math.atan2(b.y - t.y, b.x - t.x);
        t.ang = ang;
        this.projs.push({ id: this.nid++, kind: 'cannon', x: t.x, y: t.y, vx: Math.cos(ang) * 520, vy: Math.sin(ang) * 520, r: 7, pierce: 1, dmg: 6, type: 'blast', life: 2.5, hits: new Set(), moabMul: 3, explode: { r: 60, pierce: 25 } });
      }
    }
    if (t.stormN > 0) {
      t.stormT -= dt;
      while (t.stormN > 0 && t.stormT <= 0) {
        t.stormT += t.stormI;
        t.stormN--;
        const P = this.path;
        const d = P.visStart + this.rnd() * (P.visEnd - P.visStart);
        const L = P.pos(d, { x: 0, y: 0, a: 0 });
        this.projs.push({ id: this.nid++, kind: 'coco', mode: 'lob', x0: L.x - 80, y0: L.y - 200, x1: L.x, y1: L.y, x: L.x, y: L.y, t: 0, dur: 0.5, dmg: 6, type: 'pure', pierce: 30, aoe: 60, moabMul: 2, big: true, fire: true });
      }
    }
  }

  rateMul(t) {
    return (1 + t.buff.speed) * (t.buff.dance ? 2 : 1) * (this.gBoostT > 0 ? 2 : 1) * (t.boostT > 0 ? t.boostMul : 1) * (this.rageT > 0 ? 1.5 : 1);
  }

  // Flaschenpost: Blase verschwindet im Netz (zählt als gepoppt)
  capture(b) {
    b.dead = true;
    this.stats.pops += b.def.rbe;
    this.addFx({ k: 'pop', x: b.x, y: b.y, dur: 0.18, s: 0.7 });
  }
  shipPost(t, types, now) {
    if (!now) {
      for (const ty of types) t.bag.push(ty);
      if (t.bag.length < t.s.cap) return;
      types = t.bag;
      t.bag = [];
    }
    this.addFx({ k: 'bottle', x: t.x, y: t.y, dur: 0.9 });
    if (this.mode === 'classic') {
      let v = 0;
      for (const ty of types) v += SC.BLOONS[ty].rbe;
      v = Math.min(v, 2500);
      this.money += v;
      this.addFx({ k: 'text', x: t.x, y: t.y - 26, txt: '+' + v, dur: 1, c: '#ffe14d' });
      return;
    }
    this.emit('post', { types: types.slice(), mods: { camo: !!t.s.sendCamo, regrow: !!t.s.sendRegrow } });
  }

  // Würfelkrabbe: ein Wurf (1..6), deterministisch über den Feld-Zufall
  rollDie(t, s) {
    if (t.luckyT > 0) return 6;
    let r = 1 + this.rng.int(6);
    if (s.adv) r = Math.max(r, 1 + this.rng.int(6));
    if (s.noOne) while (r === 1) r = 1 + this.rng.int(6);
    return r;
  }
  throwDie(t, s, b, range, pierce, armorBreak, face) {
    const crit = face === 6 || (s.crit5 && face === 5);
    const dmg = face === 1 ? 0 : crit ? s.dmg * s.critMul : s.dmg + (face >= 4 ? 1 : 0);
    const L = this.lead(b, s.speed, t.x, t.y);
    const a = Math.atan2(L.y - t.y, L.x - t.x);
    this.projs.push({
      id: this.nid++, kind: 'die', x: t.x, y: t.y, vx: Math.cos(a) * s.speed, vy: Math.sin(a) * s.speed, r: 7, pierce: crit ? pierce + 2 : pierce, dmg, type: s.type,
      life: (range * 1.4) / s.speed, hits: new Set(), armorBreak, a, face, crit, explode: crit ? s.critBoom : null, moabMul: crit ? 2 : 1,
    });
    if (crit && s.chips) {
      this.money += s.chips;
      this.addFx({ k: 'text', x: t.x, y: t.y - 24, txt: '+' + s.chips, dur: 0.8, c: '#ffe14d' });
    }
    return crit;
  }

  updateTower(t, dt) {
    let s = t.sx || t.s;
    if (t.ab && t.ab.cd > 0) t.ab.cd -= dt;
    if (t.boostT > 0) t.boostT -= dt;
    if (t.luckyT > 0) t.luckyT -= dt;
    this.updateAbilityFx(t, dt);
    const mul = this.rateMul(t);
    t.anim = Math.max(0, t.anim - dt * 4);
    t.cd -= dt * mul;
    let range = (s.range || 0) * (1 + t.buff.range);
    if (this.hexFogT > 0 && !s.global) range *= 0.7;
    const camo = !!(s.camo || t.buff.camo || this.radarT > 0 || (t.kind === 'molt' && t.lvl >= 5));
    const pierce = (s.pierce || 1) + t.buff.pierce;
    const armorBreak = t.buff.armor;
    const face = (x, y) => (t.ang = Math.atan2(y - t.y, x - t.x));

    switch (t.kind) {
      case 'knall': {
        if (t.cd > 0) break;
        const b = this.findTarget(t, range, camo);
        if (!b) break;
        t.cd = s.rate;
        t.anim = 1;
        t.cnt++;
        const L = this.lead(b, s.speed, t.x, t.y);
        face(L.x, L.y);
        const ca = Math.cos(t.ang), sa = Math.sin(t.ang);
        this.projs.push({
          id: this.nid++, kind: s.proj, x: t.x + ca * 22 - sa * 10, y: t.y + sa * 22 + ca * 10, vx: ca * s.speed, vy: sa * s.speed,
          r: s.pr, pierce, dmg: s.dmg, type: s.type, life: (range * 1.35) / s.speed, hits: new Set(),
          explode: s.explode, moabMul: s.moabMul, armorBreak, a: t.ang,
        });
        if (s.boom && t.cnt % 3 === 0) {
          this.explode(t.x, t.y, 160, s.dmg + 3, s.type, 80, { stun: 0.6, moabStun: 0.25, moabMul: s.moabMul, armorBreak }, '#bdf3ff');
        }
        if (this.local) SC.audio.snap();
        break;
      }
      case 'fang': {
        if (t.cd > 0) break;
        const list = this.findTargets(t, range, camo, s.targets);
        if (!list.length) break;
        t.cd = s.rate;
        t.anim = 1;
        face(list[0].x, list[0].y);
        const o = { moabMul: s.moabMul, strip: s.strip, armorBreak, id: 0 };
        for (const b of list) {
          if (s.ranged) {
            const L = this.lead(b, 650, t.x, t.y);
            const a = Math.atan2(L.y - t.y, L.x - t.x);
            this.projs.push({
              id: this.nid++, kind: 'spear', x: t.x, y: t.y, vx: Math.cos(a) * 650, vy: Math.sin(a) * 650, r: 6, pierce, dmg: s.dmg, type: s.type,
              life: (range * 1.3) / 650, hits: new Set(), moabMul: s.moabMul, strip: s.strip, armorBreak, a, shockOnce: s.shock,
            });
          } else {
            this.hit(b, s.dmg, s.type, o);
            this.addFx({ k: 'punch', x: b.x, y: b.y, dur: 0.15 });
            if (s.shock) this.explode(b.x, b.y, s.shock.r, s.shock.dmg, 'punch', s.shock.pierce, o, '#e0fbff');
          }
        }
        if (this.local) SC.audio.punch();
        break;
      }
      case 'einsiedler': {
        if (s.orbit) {
          const torn = t.tornadoT > 0;
          const no = torn ? 16 : s.orbit, orr = torn ? 130 : 50;
          t.orbN = no;
          t.orbR = orr;
          t.orbitA += dt * (torn ? 5 : 3.2);
          for (let i = 0; i < no; i++) {
            const a = t.orbitA + (i / no) * Math.PI * 2;
            const ox = t.x + Math.cos(a) * orr, oy = t.y + Math.sin(a) * orr;
            for (const b of this.bloons) {
              if (b.dead) continue;
              const rr = 11 + b.def.r;
              if (SC.d2(ox, oy, b.x, b.y) > rr * rr) continue;
              const last = t.orbHit.get(b.id) || -9;
              if (this.time - last < 0.3) continue;
              t.orbHit.set(b.id, this.time);
              this.hit(b, s.dmg + (torn ? 2 : 0), s.type, { armorBreak });
            }
          }
          if (t.orbHit.size > 300) t.orbHit.clear();
        }
        if (s.cannon) {
          t.cannonCd -= dt * mul;
          if (t.cannonCd <= 0) {
            const b = this.findTarget(t, range * 1.1, camo);
            if (b) {
              t.cannonCd = s.cannon.rate;
              const L = this.lead(b, 420, t.x, t.y);
              const a = Math.atan2(L.y - t.y, L.x - t.x);
              face(L.x, L.y);
              this.projs.push({
                id: this.nid++, kind: 'cannon', x: t.x, y: t.y, vx: Math.cos(a) * 420, vy: Math.sin(a) * 420, r: 7, pierce: 1, dmg: s.cannon.dmg,
                type: 'blast', life: (range * 1.4) / 420, hits: new Set(), moabMul: 3, explode: { r: s.cannon.r, pierce: s.cannon.pierce },
              });
              if (this.local) SC.audio.boom();
            }
          }
        }
        if (t.cd > 0) break;
        const b = this.findTarget(t, range, camo);
        if (!b) break;
        t.cd = s.rate;
        t.anim = 1;
        face(b.x, b.y);
        const R = range * 1.05;
        for (let k = 0; k < s.count; k++) {
          this.projs.push({
            id: this.nid++, kind: 'shell', mode: 'boom', ox: t.x, oy: t.y, x: t.x, y: t.y, a: t.ang, R, side: k % 2 ? -1 : 1, t: 0, dur: (2.4 * R) / s.speed,
            r: 10, pierce, dmg: s.dmg, type: s.type, hits: new Set(), shatter: s.shatter, armorBreak, shell: s.shell,
          });
        }
        if (this.local) SC.audio.whoosh();
        break;
      }
      case 'kokos': {
        if (t.cd > 0) break;
        const list = this.findTargets(t, s.global ? 1e9 : range, camo, s.count, s.count > 1 ? 'strong' : null);
        if (!list.length) break;
        t.cd = s.rate;
        t.anim = 1;
        for (let k = 0; k < s.count; k++) {
          const b = list[k % list.length];
          const d = SC.dist(t.x, t.y, b.x, b.y);
          const dur = SC.clamp(d / 380, 0.35, 1.0);
          const bs = b.frozen > 0 || b.stun > 0 ? 0 : b.def.speed * SC.SPEED * (b.slowT > 0 ? b.slowF : 1) * b.aura * this.rush;
          const L = this.path.pos(b.dist + bs * dur, { x: 0, y: 0, a: 0 });
          const jx = k ? (this.rnd() - 0.5) * 30 : 0, jy = k ? (this.rnd() - 0.5) * 30 : 0;
          if (k === 0) face(L.x, L.y);
          this.projs.push({
            id: this.nid++, kind: 'coco', mode: 'lob', x0: t.x, y0: t.y, x1: L.x + jx, y1: L.y + jy, x: t.x, y: t.y, t: -k * 0.08, dur,
            dmg: s.dmg, type: s.type, pierce, aoe: s.aoe, moabMul: s.moabMul, coralMul: s.coralMul, slow: s.slow, knock: s.knock, frags: s.frags, big: t.tiers[1] >= 3, armorBreak,
          });
        }
        if (this.local) SC.audio.whoosh();
        break;
      }
      case 'pocke': {
        if (t.cd > 0) break;
        if (!t.pathPts) {
          t.pathPts = [];
          for (let i = 0; i < this.path.n; i += 3) {
            const x = this.path.xs[i], y = this.path.ys[i];
            if (x < 0 || y < 0 || x > SC.W || y > SC.H) continue;
            if (SC.d2(x, y, t.x, t.y) <= range * range) t.pathPts.push(i);
          }
        }
        if (!t.pathPts.length) break;
        const mine = this.piles.filter((p) => p.owner === t.id);
        if (mine.length >= 24) mine[0].dead = true;
        t.cd = s.rate;
        t.anim = 1;
        t.cnt++;
        const i = t.pathPts[this.rng.int(t.pathPts.length)];
        const jx = (this.rnd() - 0.5) * SC.PATH_W * 0.5, jy = (this.rnd() - 0.5) * SC.PATH_W * 0.5;
        const isMine = s.mine && t.cnt % (s.mineEvery || 3) === 0;
        this.piles.push({
          id: this.nid++, owner: t.id, x: this.path.xs[i] + jx, y: this.path.ys[i] + jy, sx: t.x, sy: t.y, fly: 0,
          pierce: isMine ? 1 : pierce, maxP: isMine ? 1 : pierce, dmg: s.dmg, type: s.type, life: s.life, big: s.big, hold: s.hold, mine: isMine ? s.mine : null,
          hits: new Set(), armorBreak,
        });
        break;
      }
      case 'winker': {
        if (s.dance) {
          t.danceCd -= dt;
          if (t.danceCd <= 0) {
            t.danceCd = 25;
            t.danceT = 8;
            this.buffT = 0;
            this.addFx({ k: 'ring', x: t.x, y: t.y, r: s.range, dur: 0.6, c: '#ff6fb5' });
          }
        }
        if (t.danceT > 0) {
          t.danceT -= dt;
          if (t.danceT <= 0) this.buffT = 0;
        }
        break;
      }
      case 'yeti': {
        if (t.cd > 0) break;
        let any = false;
        for (const b of this.bloons) if (!b.dead && this.inRange(t, b, range)) { any = true; break; }
        if (!any) break;
        t.cd = s.rate;
        t.anim = 1;
        t.cnt++;
        const hot = (s.thermal && t.cnt % 2 === 0) || t.eruptT > 0;
        let n = 0;
        const L = this.bloons.length;
        for (let i = 0; i < L && n < 50; i++) {
          const b = this.bloons[i];
          if (b.dead || !this.inRange(t, b, range)) continue;
          n++;
          if (hot) {
            this.hit(b, s.heatDmg || 4, 'heat', { moabMul: 2 });
            continue;
          }
          const immune = b.def.immune && b.def.immune.indexOf('cold') >= 0;
          if (b.def.moab) {
            if (s.dmg) this.hit(b, s.dmg, 'cold', null);
            b.slowF = Math.min(b.slowT > 0 ? b.slowF : 1, 0.75);
            b.slowT = Math.max(b.slowT, 1);
            continue;
          }
          if (immune) continue;
          if (s.dmg) this.hit(b, s.dmg, 'cold', null);
          if (!b.dead) {
            b.frozen = Math.max(b.frozen, s.freeze);
            if (s.sticky) {
              b.slowF = 0.5;
              b.slowT = s.freeze + 2;
            }
          }
        }
        this.addFx({ k: 'ring', x: t.x, y: t.y, r: range, dur: 0.35, c: hot ? '#ff8a3d' : '#9fe8ff', fill: true });
        if (this.local) SC.audio.freeze(hot);
        break;
      }
      case 'spinne': {
        if (t.cd > 0) break;
        const list = this.findTargets(t, range, camo, s.hits, 'close');
        if (!list.length) break;
        t.cd = s.rate;
        t.anim = 1;
        t.cnt++;
        face(list[0].x, list[0].y);
        for (const b of list) {
          this.hit(b, s.dmg, s.type, { armorBreak });
          this.addFx({ k: 'stomp', x: b.x, y: b.y, dur: 0.12 });
        }
        if (s.titan && t.cnt % 4 === 0) {
          this.explode(t.x, t.y, s.titan.r, s.titan.dmg, 'punch', s.titan.pierce, { stun: 1, moabStun: 0.8, moabMul: 2 }, '#ffd59a');
          if (this.local) SC.audio.boom();
        } else if (this.local) SC.audio.stomp();
        break;
      }
      case 'krill': {
        const nd = s.count + (t.extraT > 0 ? t.extraN : 0);
        while (t.drones.length < nd) t.drones.push({ x: t.x + (this.rnd() - 0.5) * 20, y: t.y + (this.rnd() - 0.5) * 20, a: 0, cd: 0, tgt: null, ph: this.rnd() * 6 });
        if (t.drones.length > nd) t.drones.length = nd;
        const o = { moabMul: s.moabMul, slow: s.slow, armorBreak };
        for (const d of t.drones) {
          d.cd -= dt * mul;
          if (!d.tgt || d.tgt.dead || (d.tgt.camo && !camo) || d.tgt.dist < this.path.visStart) {
            d.tgt = null;
            let bd = Infinity;
            for (const b of this.bloons) {
              if (b.dead || (b.camo && !camo) || b.dist < this.path.visStart || b.dist > this.path.visEnd) continue;
              const dd = SC.d2(d.x, d.y, b.x, b.y);
              if (dd < bd) {
                bd = dd;
                d.tgt = b;
              }
            }
          }
          let tx, ty;
          if (d.tgt) {
            tx = d.tgt.x;
            ty = d.tgt.y;
          } else {
            d.ph += dt * 2;
            tx = t.x + Math.cos(d.ph) * 30;
            ty = t.y + Math.sin(d.ph) * 30;
          }
          const dx = tx - d.x, dy = ty - d.y, dl = Math.hypot(dx, dy) || 1;
          const st = Math.min(dl, s.speed * dt);
          d.x += (dx / dl) * st;
          d.y += (dy / dl) * st;
          d.a = Math.atan2(dy, dx);
          if (d.tgt && dl < 10 + d.tgt.def.r && d.cd <= 0) {
            d.cd = s.rate;
            this.hit(d.tgt, s.dmg, s.type, o);
          }
        }
        if (s.whale) {
          t.whaleT -= dt;
          if (t.whaleT <= 0) {
            const ds = this.bloons.filter((b) => !b.dead && b.dist > this.path.visStart && b.dist < this.path.visEnd).map((b) => b.dist).sort((a, b) => a - b);
            if (ds.length >= 3) {
              t.whaleT = s.whaleCd || 20;
              let best = 0, bi = 0, j = 0;
              for (let i = 0; i < ds.length; i++) {
                while (ds[i] - ds[j] > 240) j++;
                if (i - j + 1 > best) {
                  best = i - j + 1;
                  bi = j;
                }
              }
              const d0 = ds[bi] - 20;
              this.whales.push({ d0, d1: d0 + 280, t: 0, dur: 1.8, ate: false });
            } else t.whaleT = 2;
          }
        }
        break;
      }
      case 'post': {
        if (t.cd > 0) break;
        const cand = [];
        for (const b of this.bloons) {
          if (b.dead || b.def.moab || b.def.idx > s.catchMax || (b.camo && !camo)) continue;
          if (b.dist < this.path.visStart || !this.inRange(t, b, range)) continue;
          cand.push(b);
        }
        if (!cand.length) break;
        if (cand.length > s.catchN) {
          cand.sort((a, b) => this.score(b, t.target, t) - this.score(a, t.target, t));
          cand.length = s.catchN;
        }
        t.cd = s.rate;
        t.anim = 1;
        face(cand[0].x, cand[0].y);
        const got = [];
        for (const b of cand) {
          got.push(b.type);
          this.addFx({ k: 'net', x: b.x, y: b.y, r: b.def.r * 1.4, dur: 0.4 });
          this.capture(b);
        }
        this.shipPost(t, got, false);
        if (this.local) SC.audio.whoosh();
        break;
      }
      case 'tide': {
        if (t.cd > 0) break;
        const hitList = [];
        for (const b of this.bloons) {
          if (b.dead || (b.camo && !camo) || b.dist < this.path.visStart || !this.inRange(t, b, range)) continue;
          hitList.push(b);
        }
        if (!hitList.length) break;
        t.cd = s.rate;
        t.anim = 1;
        for (const b of hitList) {
          let pushed = false;
          if (b.def.moab) {
            if (s.moabPush) {
              b.dist = Math.max(0, b.dist - s.moabPush * (b.type === 'kraken' ? 0.35 : 1));
              pushed = true;
            }
          } else if (b.pushes < s.maxPush) {
            b.dist = Math.max(0, b.dist - s.push);
            b.pushes++;
            pushed = true;
          }
          if (pushed && s.soak) b.soakT = s.soak;
          if (s.dmg) this.hit(b, s.dmg, 'punch', { armorBreak });
        }
        this.addFx({ k: 'tide', x: t.x, y: t.y, r: range, dur: 0.6 });
        if (this.local) SC.audio.whoosh();
        break;
      }
      case 'molt': {
        // Level aus Erfahrung, Mindest-Level durch Uralter Hummer
        if (s.minLvl && t.lvl < s.minLvl) t.xp = Math.max(t.xp, SC.MOLT_XP[s.minLvl - 1]);
        const lvl = SC.moltLevel(t.xp);
        if (lvl > t.lvl) {
          t.lvl = lvl;
          this.buffT = 0;
          this.addFx({ k: 'text', x: t.x, y: t.y - 28, txt: 'LEVEL ' + lvl + '!', dur: 1.1, c: '#ffd23f' });
          this.addFx({ k: 'ring', x: t.x, y: t.y, r: 36, dur: 0.5, c: '#ff9a5a' });
          if (s.shells) this.dropShell(t, range);
        }
        if (s.shells) {
          t.shellT -= dt;
          if (t.shellT <= 0) {
            t.shellT = 15;
            this.dropShell(t, range);
          }
        }
        if (t.cd > 0) break;
        const L = t.lvl - 1;
        const r2 = range + L * 4;
        const list = this.findTargets(t, r2, camo, s.pierce);
        if (!list.length) break;
        t.cd = s.rate * Math.max(0.46, 1 - L * 0.06);
        t.anim = 1;
        face(list[0].x, list[0].y);
        const dmg = s.dmg + Math.floor(t.lvl / 3);
        const o = { moabMul: s.moabMul, armorBreak };
        for (const b of list) {
          if (this.hit(b, dmg, s.type, o)) t.xp += dmg * s.xpMul;
          this.addFx({ k: 'punch', x: b.x, y: b.y, dur: 0.15 });
        }
        if (this.local) SC.audio.punch();
        break;
      }
      case 'dice': {
        if (t.cd > 0) break;
        const b = this.findTarget(t, range, camo);
        if (!b) break;
        t.cd = s.rate * (t.luckyT > 0 ? 0.5 : 1);
        t.anim = 1;
        t.cnt++;
        face(b.x, b.y);
        let n = s.count, extra = 0;
        for (let k = 0; k < n; k++) {
          const crit = this.throwDie(t, s, b, range, pierce, armorBreak, this.rollDie(t, s));
          if (crit && s.chain && extra < 3) {
            extra++;
            n++;
          }
        }
        if (s.jackpot && t.cnt % s.jackpot === 0) {
          this.money += 150;
          this.addFx({ k: 'text', x: t.x, y: t.y - 30, txt: 'JACKPOT +150', dur: 1.3, c: '#ffe14d' });
          this.projs.push({ id: this.nid++, kind: 'die', mode: 'lob', x0: t.x, y0: t.y, x1: b.x, y1: b.y, x: t.x, y: t.y, t: 0, dur: 0.5, dmg: 10, type: 'pure', pierce: 60, aoe: 90, face: 6, big: true });
          if (this.local) SC.audio.coin();
        }
        if (this.local) SC.audio.whoosh();
        break;
      }
      case 'farm': {
        if (s.pearl) {
          t.pearlT -= dt;
          if (t.pearlT <= 0) {
            t.pearlT = 30;
            this.spawnCrate(t, s.pearl, 'pearl');
          }
        }
        if (s.bank) {
          t.bankT -= dt;
          if (t.bankT <= 0) {
            t.bankT = 30;
            this.spawnCrate(t, Math.min(s.bankCap || 800, Math.floor(this.money * 0.1)), 'coin');
          }
        }
        break;
      }
    }
  }

  updateProj(p, dt) {
    if (p.mode === 'lob') {
      p.t += dt;
      if (p.t < 0) return;
      const u = Math.min(1, p.t / p.dur);
      p.x = SC.lerp(p.x0, p.x1, u);
      p.y = SC.lerp(p.y0, p.y1, u);
      p.h = Math.sin(u * Math.PI);
      if (u >= 1) {
        p.dead = true;
        this.explode(p.x1, p.y1, p.aoe, p.dmg, p.type, p.pierce, p, '#fff1c4');
        if (p.frags) {
          for (let i = 0; i < p.frags; i++) {
            const a = (i / p.frags) * Math.PI * 2;
            this.projs.push({ id: this.nid++, kind: 'frag', x: p.x1, y: p.y1, vx: Math.cos(a) * 260, vy: Math.sin(a) * 260, r: 4, pierce: 1, dmg: 1, type: 'sharp', life: 0.3, hits: new Set(), a });
          }
        }
        if (this.local) SC.audio.boom();
      }
      return;
    }
    if (p.mode === 'boom') {
      p.t += dt;
      const u = p.t / p.dur;
      if (u >= 1) {
        p.dead = true;
        return;
      }
      const ca = Math.cos(p.a), sa = Math.sin(p.a);
      const f = p.R * Math.sin(Math.PI * u);
      const sd = p.side * p.R * 0.38 * Math.sin(2 * Math.PI * u);
      p.x = p.ox + ca * f - sa * sd;
      p.y = p.oy + sa * f + ca * sd;
      p.spin = (p.spin || 0) + dt * 14;
    } else {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      if (p.kind === 'wave') p.r = Math.min(p.r + dt * 30, 28);
      if (p.life <= 0 || p.x < -30 || p.y < -30 || p.x > SC.W + 30 || p.y > SC.H + 30) {
        p.dead = true;
        return;
      }
    }
    // Kollision
    for (let i = 0, L = this.bloons.length; i < L; i++) {
      const b = this.bloons[i];
      if (b.dead || b.immP === p.id || p.hits.has(b.id)) continue;
      const rr = p.r + b.def.r;
      if (SC.d2(p.x, p.y, b.x, b.y) > rr * rr) continue;
      p.hits.add(b.id);
      this.hit(b, p.dmg, p.type, p);
      p.pierce--;
      if (p.explode && !p.exploded) {
        p.exploded = true;
        this.explode(p.x, p.y, p.explode.r, p.dmg, p.type, p.explode.pierce, p, p.type === 'heat' ? '#ffcf4d' : '#ffffff');
        if (p.kind !== 'plasma') p.dead = true;
      }
      if (p.shockOnce && !p.exploded) {
        p.exploded = true;
        this.explode(b.x, b.y, p.shockOnce.r, p.shockOnce.dmg, 'punch', p.shockOnce.pierce, p, '#e0fbff');
      }
      if (p.shatter && !p.shattered) {
        p.shattered = true;
        for (let k = 0; k < 8; k++) {
          const a = (k / 8) * Math.PI * 2;
          this.projs.push({ id: this.nid++, kind: 'shard', x: p.x, y: p.y, vx: Math.cos(a) * 300, vy: Math.sin(a) * 300, r: 4, pierce: 3, dmg: 1, type: 'sharp', life: 0.28, hits: new Set([b.id]), a });
        }
      }
      if (p.pierce <= 0 || p.dead) {
        p.dead = true;
        return;
      }
    }
  }

  updatePile(pl, dt) {
    if (pl.fly < 1) {
      pl.fly = Math.min(1, pl.fly + dt * 3);
      return;
    }
    pl.life -= dt;
    if (pl.life <= 0) {
      pl.dead = true;
      return;
    }
    const pr = pl.big ? 14 : 10;
    for (let i = 0, L = this.bloons.length; i < L; i++) {
      const b = this.bloons[i];
      if (b.dead || pl.hits.has(b.id)) continue;
      const rr = pr + b.def.r;
      if (SC.d2(pl.x, pl.y, b.x, b.y) > rr * rr) continue;
      pl.hits.add(b.id);
      if (pl.mine) {
        this.explode(pl.x, pl.y, pl.mine.r, pl.mine.dmg, 'blast', pl.mine.pierce, { moabMul: 3 }, '#ffb35c');
        if (this.local) SC.audio.boom();
        pl.dead = true;
        return;
      }
      this.hit(b, pl.dmg, pl.type, pl.armorBreak ? { armorBreak: true } : null);
      if (pl.hold && !b.def.moab && !b.dead) b.stun = Math.max(b.stun, pl.hold);
      pl.pierce--;
      if (pl.pierce <= 0) {
        pl.dead = true;
        return;
      }
    }
    if (pl.hits.size > 200) pl.hits.clear();
  }

  // ---------------- Wirtschaft ----------------
  ecoTick() {
    if (this.mode === 'battle') {
      this.money += this.eco;
      this.addFx({ k: 'eco', x: 0, y: 0, dur: 0.6 });
    }
    for (const t of this.towers) {
      if (t.kind !== 'farm') continue;
      const v = Math.round(t.s.income * (t.s.market || 1));
      const n = v > 200 ? 3 : v > 90 ? 2 : 1;
      for (let i = 0; i < n; i++) this.spawnCrate(t, Math.round(v / n), 'crate');
    }
  }
  spawnCrate(t, val, kind) {
    // Position ist nur Optik (Math.random), Einsammeln läuft über die ID
    const a = Math.random() * Math.PI * 2, r = 24 + Math.random() * 18;
    this.crates.push({ id: this.cid++, x0: t.x, y0: t.y, x: t.x, y: t.y, tx: SC.clamp(t.x + Math.cos(a) * r, 12, SC.W - 12), ty: SC.clamp(t.y + Math.sin(a) * r, 12, SC.H - 12), val, kind, t: 0, auto: t.s.market ? 0.8 : 2.4, done: false });
  }
  crateAt(x, y) {
    for (const c of this.crates) if (!c.done && c.t > 0.3 && SC.d2(x, y, c.tx, c.ty) < 26 * 26) return c;
    return null;
  }
  collectById(id) {
    for (const c of this.crates) {
      if (c.id === id && !c.done && c.t > 0.3) {
        this.collectCrate(c);
        return true;
      }
    }
    return false;
  }
  // Häutungs-Hummer B2: alte Schale als Falle auf die Strecke
  dropShell(t, range) {
    const P = this.path;
    let bi = -1, bd = Infinity;
    for (let i = 0; i < P.n; i += 3) {
      const x = P.xs[i], y = P.ys[i];
      if (x < 0 || y < 0 || x > SC.W || y > SC.H) continue;
      const d = SC.d2(x, y, t.x, t.y);
      if (d < bd && d <= range * range * 1.6) {
        bd = d;
        bi = i;
      }
    }
    if (bi < 0) return;
    this.piles.push({ id: this.nid++, owner: t.id, x: P.xs[bi], y: P.ys[bi], sx: t.x, sy: t.y, fly: 0, pierce: 20, maxP: 20, dmg: 2, type: 'punch', life: 30, big: true, shell: true, hits: new Set() });
  }

  // ---------------- Kräfte (Battle-Powers) ----------------
  powerState(i, round) {
    const p = this.powers[i];
    if (!p) return { ok: false, why: 'none' };
    const def = SC.POWER_BY_ID[p.id];
    if (round < def.round) return { ok: false, why: 'round', def, p };
    if (p.cd > 0) return { ok: false, why: 'cd', def, p };
    if (this.money < def.cost) return { ok: false, why: 'money', def, p };
    return { ok: true, def, p };
  }
  usePower(i, x, y, round) {
    const st = this.powerState(i, round);
    if (!st.ok) return false;
    const def = st.def;
    if (def.target === 'map' && !(x >= 0 && y >= 0 && x <= SC.W && y <= SC.H)) return false;
    this.money -= def.cost;
    st.p.cd = def.cd;
    const vis = this.visibleBloons();
    switch (def.id) {
      case 'spikes': {
        const P = this.path;
        let bi = 0, bd = Infinity;
        for (let k = 0; k < P.n; k += 2) {
          const d = SC.d2(x, y, P.xs[k], P.ys[k]);
          if (d < bd) {
            bd = d;
            bi = k;
          }
        }
        this.piles.push({ id: this.nid++, owner: 0, x: P.xs[bi], y: P.ys[bi], sx: x, sy: y - 40, fly: 0, pierce: 60, maxP: 60, dmg: 1, type: 'sharp', life: 45, big: true, urchin: true, hits: new Set() });
        break;
      }
      case 'bomb':
        this.explode(x, y, 85, 20, 'pure', 120, { moabMul: 3 }, '#ffb35c');
        this.addFx({ k: 'bigboom', x, y, r: 110, dur: 0.6 });
        this.shake = Math.max(this.shake || 0, 0.3);
        if (this.local) SC.audio.boom();
        break;
      case 'cash': {
        const v = 150 + 15 * Math.max(0, round);
        this.money += v;
        this.addFx({ k: 'text', x: SC.W / 2, y: SC.H / 2, txt: '+' + v, dur: 1.2, c: '#ffe14d' });
        if (this.local) SC.audio.coin();
        break;
      }
      case 'freeze':
        for (const b of vis) {
          if (b.def.moab) {
            b.slowF = Math.min(b.slowT > 0 ? b.slowF : 1, 0.6);
            b.slowT = Math.max(b.slowT, 3);
          } else if (b.type !== 'ice' && b.type !== 'stripe') b.frozen = Math.max(b.frozen, 3);
        }
        this.addFx({ k: 'flash', x: SC.W / 2, y: SC.H / 2, dur: 0.6, c: '#bfefff' });
        if (this.local) SC.audio.freeze(false);
        break;
      case 'rage':
        this.rageT = 8;
        break;
      case 'shield':
        this.shieldT = 8;
        this.shieldHp = 40;
        break;
      case 'radar':
        this.radarT = 15;
        break;
      case 'heal':
        this.lives = Math.min(this.maxLives, this.lives + 20);
        this.addFx({ k: 'text', x: SC.W / 2, y: SC.H / 2, txt: '+20 Leben', dur: 1.2, c: '#ff8ac4' });
        break;
      case 'boost':
      case 'fog':
        this.emit('hex', { id: def.id, dur: def.dur });
        break;
    }
    if (this.local) SC.audio.ability();
    if (this.game && this.game.notify) this.game.notify('power', { field: this, def });
    return true;
  }

  // ---------------- Zustand speichern/laden (Server-Resync) ----------------
  // Kopiert nur einfache Werte (Zahlen, Text, Listen aus einfachen Werten)
  static plain(o, skip) {
    const r = {};
    for (const k in o) {
      if (skip && skip[k]) continue;
      const v = o[k];
      if (v === null || typeof v === 'number' || typeof v === 'string' || typeof v === 'boolean') r[k] = v;
      else if (Array.isArray(v) && v.every((x) => x === null || typeof x !== 'object')) r[k] = v.slice();
    }
    return r;
  }
  serialize() {
    const P = SC.Field.plain;
    const skip = { mode: 1, name: 1, local: 1, headless: 1 };
    return {
      f: P(this, skip),
      rng: this.rng.a,
      allowed: this.allowed,
      powers: this.powers.map((p) => ({ id: p.id, cd: p.cd })),
      bloons: this.bloons.filter((b) => !b.dead).map((b) => P(b, { x: 1, y: 1, a: 1 })),
      towers: this.towers.map((t) => Object.assign(P(t), { ab: t.ab ? t.ab.cd : null })),
      spawns: this.spawns.map((s) => P(s)),
      queue: this.sendQueue.map((q) => ({ id: q.send.id, types: q.send.types || null, mods: { camo: !!q.mods.camo, regrow: !!q.mods.regrow } })),
      piles: this.piles.filter((p) => !p.dead).map((p) => Object.assign(P(p), { mine: p.mine || null })),
      crates: this.crates.filter((c) => !c.done).map((c) => P(c)),
      cur: this.curSend ? P(this.curSend) : null,
    };
  }
  restore(d) {
    Object.assign(this, d.f);
    this.rng.a = d.rng;
    this.allowed = d.allowed;
    this.powers = d.powers.map((p) => ({ id: p.id, cd: p.cd }));
    this.bloons = d.bloons.map((b) => {
      const o = Object.assign({}, b, { def: SC.BLOONS[b.type], x: 0, y: 0, a: 0 });
      this.path.pos(o.dist, this._p);
      o.x = this._p.x;
      o.y = this._p.y;
      o.a = this._p.a;
      return o;
    });
    this.towers = d.towers.map((td) => {
      const t = this.newTower(td.kind, td.x, td.y, td.id);
      Object.assign(t, td);
      t.tiers = td.tiers.slice();
      t.s = SC.towerStats(t.kind, t.tiers);
      t.ab = null;
      for (let p = 0; p < 2; p++) if (t.tiers[p] >= SC.MAX_TIER) t.ab = { def: t.def.paths[p][SC.MAX_TIER - 1].ability, cd: td.ab || 0 };
      t.pathPts = null;
      return t;
    });
    this.spawns = d.spawns.map((s) => Object.assign({}, s));
    this.sendQueue = d.queue.map((q) => {
      if (q.types) return { send: { id: 'post', types: q.types, type: q.types[0], count: q.types.length, spacing: q.types.some((t) => SC.BLOONS[t].moab) ? 1.2 : 0.22 }, mods: q.mods };
      return { send: SC.SENDS.find((s) => s.id === q.id), mods: q.mods };
    });
    this.piles = d.piles.map((p) => Object.assign({}, p, { hits: new Set() }));
    this.crates = d.crates.map((c) => Object.assign({}, c));
    this.curSend = d.cur ? Object.assign({}, d.cur) : null;
    this.projs = [];
    this.whales = [];
    this.fx = [];
    this.buffT = 0;
  }
  // kurze Prüfsumme der Blasen (Abweichung Client/Server erkennen)
  bloonSum() {
    let n = 0, r = 0;
    for (const b of this.bloons) {
      if (b.dead) continue;
      n++;
      r += b.def.rbe;
    }
    return n * 100000 + r;
  }
  collectCrate(c) {
    if (c.done) return;
    c.done = true;
    this.money += c.val;
    this.addFx({ k: 'text', x: c.tx, y: c.ty, txt: '+' + c.val, dur: 0.9, c: '#ffe14d' });
    if (this.local) SC.audio.coin();
  }
  collectAt(x, y) {
    let got = false;
    for (const c of this.crates) {
      if (!c.done && c.t > 0.3 && SC.d2(x, y, c.tx, c.ty) < 26 * 26) {
        this.collectCrate(c);
        got = true;
      }
    }
    return got;
  }
  towerAt(x, y) {
    for (let i = this.towers.length - 1; i >= 0; i--) {
      const t = this.towers[i];
      const r = SC.towerRadius(t.kind) + 3;
      if (SC.d2(x, y, t.x, t.y) < r * r) return t;
    }
    return null;
  }
  // grobe Stärke der Verteidigung (für KI)
  defenseValue() {
    let v = 0;
    for (const t of this.towers) if (t.kind !== 'farm') v += t.spent;
    return v;
  }
};
