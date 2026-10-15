'use strict';
// ============================================================
//  Eine Partie: Runden, Eco-Ticks, Senden, Sieg/Niederlage
// ============================================================
SC.CLASSIC_DIFF = {
  easy: { lives: 200, money: 850, name: 'Leicht' },
  normal: { lives: 150, money: 650, name: 'Normal' },
  hard: { lives: 100, money: 600, name: 'Schwer' },
};

SC.Game = class Game {
  constructor(cfg) {
    this.cfg = cfg;
    this.mode = cfg.mode; // 'ai' | 'online' | 'classic'
    this.battle = cfg.mode !== 'classic';
    this.map = SC.MAPS.find((m) => m.id === cfg.map) || SC.MAPS[0];
    const CL = SC.CLASSIC_DIFF[cfg.diff || 'normal'];
    this.me = new SC.Field(this, {
      map: this.map, mode: this.battle ? 'battle' : 'classic', name: 'Du',
      lives: this.battle ? 150 : CL.lives, money: this.battle ? 650 : CL.money, eco: this.battle ? 250 : 0,
    });
    this.opp = null;
    if (cfg.mode === 'ai') {
      const names = { easy: 'Krabbel-KI', normal: 'Hummer-KI', hard: 'Kraken-KI' };
      this.opp = new SC.Field(this, { map: this.map, mode: 'battle', lives: 150, money: 650, eco: 250, name: names[cfg.diff] || 'KI', local: false });
      this.ai = new SC.AI(this.opp, this.me, this, cfg.diff);
    } else if (cfg.mode === 'online') {
      this.opp = new SC.Ghost(this.map);
      this.net = cfg.net;
      this.net.onmsg = (m) => this.onNet(m);
      this.net.onclose = () => {
        if (!this.over) this.end(true, 'Dein Gegner hat die Verbindung getrennt.');
      };
    }
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
  }

  update(dt) {
    if (this.over || this.paused) return;
    this.time += dt;
    if (this.battle) {
      if (this.time >= this.nextRoundAt) this.startRound();
    } else {
      if (this.roundActive && !this.me.spawns.length && !this.me.bloons.length) this.endClassicRound();
      if (!this.roundActive && this.auto) {
        this.autoT -= dt;
        if (this.autoT <= 0) this.startRound();
      }
    }
    if (this.battle || this.roundActive) {
      this.ecoT -= dt;
      if (this.ecoT <= 0) {
        this.ecoT += SC.ECO_INTERVAL;
        this.me.ecoTick();
        if (this.mode === 'ai') this.opp.ecoTick();
      }
    }
    this.me.update(dt);
    if (this.mode === 'ai' && !this.over) {
      this.opp.update(dt);
      this.ai.update(dt);
    }
    if (this.mode === 'online') {
      this.snapT -= dt;
      if (this.snapT <= 0) {
        this.snapT = 0.1;
        this.net.send(SC.Ghost.snapshot(this.me));
      }
    }
  }

  canStartRound() {
    return !this.battle && !this.roundActive && !this.over;
  }
  startRound() {
    this.round++;
    this.me.queueRound(this.round);
    if (this.mode === 'ai') this.opp.queueRound(this.round);
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

  sendCost(send, mods) {
    let c = send.cost;
    if (mods.camo) c *= SC.SEND_MOD.camo.mul;
    if (mods.regrow) c *= SC.SEND_MOD.regrow.mul;
    return Math.round(c);
  }
  queueLen(field) {
    if (field instanceof SC.Ghost) return field.q;
    return field.sendQueue.length;
  }
  doSend(from, to, send, mods) {
    if (this.over || send.round > Math.max(1, this.round)) return false;
    if (mods.camo && this.round < SC.SEND_MOD.camo.round) mods.camo = false;
    if (mods.regrow && this.round < SC.SEND_MOD.regrow.round) mods.regrow = false;
    const cost = this.sendCost(send, mods);
    if (from.money < cost) return false;
    if (this.queueLen(to) >= SC.SEND_QUEUE_MAX) return false;
    if (to instanceof SC.Ghost) {
      this.net.send({ t: 'send', id: send.id, mods });
      to.q++;
    } else if (!to.receiveSend(send, mods)) return false;
    from.money -= cost;
    from.eco = Math.max(0, from.eco + send.eco);
    from.stats.sent++;
    if (to === this.me) this.notify('incoming', { send, mods, who: from.name });
    return true;
  }

  onNet(m) {
    if (!m || this.over) return;
    if (m.t === 's') this.opp.apply(m);
    else if (m.t === 'send') {
      const s = SC.SENDS.find((x) => x.id === m.id);
      if (s && this.me.receiveSend(s, m.mods || {})) this.notify('incoming', { send: s, mods: m.mods || {}, who: 'Gegner' });
    } else if (m.t === 'dead') this.end(true);
    else if (m.t === 'bye') this.end(true, 'Dein Gegner hat aufgegeben.');
  }

  onFieldDead(f) {
    if (this.over) return;
    if (f === this.me) {
      if (this.mode === 'online') this.net.send({ t: 'dead' });
      this.end(false);
    } else this.end(true);
  }
  end(win, reason) {
    if (this.over) return;
    this.over = true;
    this.result = { win, reason };
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
