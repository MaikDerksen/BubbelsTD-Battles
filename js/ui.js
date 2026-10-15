'use strict';
// ============================================================
//  Spiel-Bildschirm im BTD-Battles-Layout
// ============================================================
const $ = (s, r) => (r || document).querySelector(s);
const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
SC.$ = $;

SC.paintIcons = function (root) {
  for (const el of $$('i[data-icon]', root)) {
    if (el.dataset.done) continue;
    const fn = SC.ICON[el.dataset.icon];
    if (fn) el.innerHTML = fn();
    el.dataset.done = 1;
  }
};
const ico = (name) => '<i data-icon="' + name + '"></i>';

SC.showScreen = function (id) {
  for (const s of $$('.screen')) s.classList.toggle('active', s.id === id);
};
SC.modal = function (html, handlers) {
  const m = $('#modal');
  $('#modal-box').innerHTML = html;
  SC.paintIcons($('#modal-box'));
  m.classList.remove('hidden');
  for (const b of $$('#modal-box [data-act]')) {
    b.addEventListener('click', () => {
      SC.audio.click();
      const h = handlers[b.dataset.act];
      if (h && h() === false) return;
      m.classList.add('hidden');
    });
  }
};
SC.closeModal = () => $('#modal').classList.add('hidden');

const STEP = 1 / 60;
const TARGETS = ['first', 'last', 'strong', 'close'];
const TARGET_NAME = { first: 'Erste', last: 'Letzte', strong: 'Stärkste', close: 'Nächste' };
const TARGET_KINDS = ['knall', 'fang', 'einsiedler', 'kokos'];
const fmt = (n) => SC.fmt(n);

SC.UI = {
  init() {
    this.cv = $('#cv');
    this.ctx = this.cv.getContext('2d');
    this.cvo = $('#cv-opp');
    this.ctxo = this.cvo.getContext('2d');
    this.k = 1;
    this.ghost = { x: 0, y: 0, ok: false, show: false };
    window.addEventListener('resize', () => this.game && this.resize());
    window.addEventListener('orientationchange', () => setTimeout(() => this.game && this.resize(), 300));

    this.cv.addEventListener('pointerdown', (e) => this.onDown(e));
    window.addEventListener('pointermove', (e) => this.onMove(e));
    window.addEventListener('pointerup', (e) => this.onUp(e));
    window.addEventListener('pointercancel', () => {
      this.downP = null;
      this.dragging = false;
    });
    window.addEventListener('keydown', (e) => {
      if (!this.game) return;
      if (e.key === 'Escape') this.cancelPlacing(), this.select(null);
      if (e.key === ' ' && this.game.canStartRound()) this.game.startRound();
    });
    $('#wrap-opp').addEventListener('click', () => {
      this.viewOpp = !this.viewOpp;
      SC.audio.click();
    });

    $('#shop').addEventListener('click', (e) => {
      const c = e.target.closest('.card');
      if (!c) return;
      SC.audio.init();
      const k = c.dataset.kind;
      if (this.placing === k) this.cancelPlacing();
      else this.startPlacing(k);
    });
    $('#sends').addEventListener('click', (e) => {
      const b = e.target.closest('.card');
      if (!b) return;
      SC.audio.init();
      const s = SC.SENDS.find((x) => x.id === b.dataset.send);
      const g = this.game;
      if (g.doSend(g.me, g.opp, s, Object.assign({}, this.mods))) {
        SC.audio.send();
        b.animate([{ transform: 'scale(0.86)' }, { transform: 'scale(1)' }], { duration: 140 });
      } else SC.audio.error();
    });
    for (const b of $$('.mods button')) {
      b.addEventListener('click', () => {
        const m = b.dataset.mod;
        this.mods[m] = !this.mods[m];
        b.classList.toggle('on', this.mods[m]);
        SC.audio.click();
      });
    }
    $('#upgrade').addEventListener('click', (e) => {
      const b = e.target.closest('[data-a]');
      if (!b || !this.sel) return;
      const f = this.game.me, t = this.sel;
      switch (b.dataset.a) {
        case 'close':
          this.select(null);
          SC.audio.click();
          break;
        case 'up':
          if (f.upgrade(t, +b.dataset.p)) {
            SC.audio.upgrade();
            this.upKey = '';
          } else SC.audio.error();
          break;
        case 'sell':
          f.sell(t);
          SC.audio.coin();
          this.select(null);
          break;
        case 'tprev':
        case 'tnext': {
          const i = TARGETS.indexOf(t.target);
          t.target = TARGETS[(i + (b.dataset.a === 'tnext' ? 1 : TARGETS.length - 1)) % TARGETS.length];
          $('#tg').textContent = TARGET_NAME[t.target];
          SC.audio.click();
          break;
        }
      }
    });
    $('#abilities').addEventListener('click', (e) => {
      const b = e.target.closest('.ability');
      if (!b) return;
      const g = this.abilityGroups().find((x) => x.key === b.dataset.g);
      const t = g && g.list.find((x) => this.game.me.canUseAbility(x));
      if (t && this.game.me.useAbility(t)) {
        b.animate([{ transform: 'scale(1.25)' }, { transform: 'scale(1)' }], { duration: 200 });
        this.banner(t.ab.def.name + '!');
        this.abKey = '';
      } else SC.audio.error();
    });
    $('#btn-menu').addEventListener('click', () => this.pauseMenu());
    $('#btn-start').addEventListener('click', () => {
      SC.audio.init();
      if (this.game.canStartRound()) this.game.startRound();
    });
    $('#btn-speed').addEventListener('click', () => {
      this.speed = this.speed >= 3 ? 1 : this.speed + 1;
      const b = $('#btn-speed');
      b.classList.toggle('on', this.speed > 1);
      b.dataset.sp = this.speed;
      SC.audio.click();
    });
    $('#btn-auto').addEventListener('click', () => {
      this.game.auto = !this.game.auto;
      this.game.autoT = 0.5;
      $('#btn-auto').classList.toggle('on', this.game.auto);
      SC.audio.click();
    });
  },

  // ---------------- Start / Ende ----------------
  start(cfg) {
    if (this.game) this.game.destroy();
    this.cfg = cfg;
    const g = (this.game = new SC.Game(cfg));
    g.onNotify = (k, d) => this.onNotify(k, d);
    this.sel = null;
    this.placing = null;
    this.viewOpp = false;
    this.mods = {};
    this.speed = 1;
    this.acc = 0;
    this.hud = {};
    this.upKey = '';
    this.abKey = '';
    this.qKey = '';
    $('#btn-speed').classList.remove('on');
    $('#btn-auto').classList.remove('on');
    for (const b of $$('.mods button')) b.classList.remove('on');
    $('#game').className = 'screen bricks ' + (g.battle ? 'battle' : 'classic');
    SC.showScreen('game');
    $('#name-me').textContent = 'Du';
    if (g.opp) $('#name-opp').textContent = g.opp.name;
    $('#upgrade').classList.add('hidden');
    $('#abilities').innerHTML = '';
    $('#queue').innerHTML = '';
    $('#toasts').innerHTML = '';
    $('#view-label').classList.add('hidden');
    this.buildShop();
    this.buildSends();
    SC.paintIcons($('#game'));
    SC.music.play('game');
    this.resize();
    this.last = performance.now();
    if (g.battle) this.vsIntro();
    if (!this.running) {
      this.running = true;
      requestAnimationFrame((t) => this.frame(t));
    }
  },
  vsIntro() {
    const g = this.game;
    g.paused = true;
    const vs = $('#vs');
    vs.classList.remove('hidden');
    vs.style.animation = 'none';
    void vs.offsetWidth;
    vs.style.animation = '';
    for (const side of ['l', 'r']) {
      const c = $('#vs-' + side);
      const r = c.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      c.width = Math.max(10, r.width * dpr);
      c.height = Math.max(10, r.height * dpr);
      const x = c.getContext('2d');
      x.setTransform(c.width / 230, 0, 0, c.height / 240, c.width / 2, c.height * 0.52);
      if (side === 'r') x.scale(-1, 1);
      SC.drawHero(x, side === 'l' ? '#2f7fe8' : '#e8302a', 1);
    }
    $('#vs-name-l').textContent = 'Du';
    $('#vs-name-r').textContent = g.opp.name;
    SC.audio.vs();
    clearTimeout(this.vsT);
    this.vsT = setTimeout(() => {
      vs.classList.add('hidden');
      if (this.game === g) g.paused = false;
    }, 2650);
  },
  quit() {
    if (this.game) this.game.destroy();
    this.game = null;
    this.running = false;
    clearTimeout(this.vsT);
    $('#vs').classList.add('hidden');
    SC.closeModal();
    SC.showScreen('title');
    SC.Menu.drawTitleArt();
    SC.Menu.startBg();
    SC.music.play('menu');
  },

  resize() {
    const g = this.game;
    const ar = $('#arena').getBoundingClientRect();
    const Wa = ar.width - 16, Ha = ar.height - 10;
    const div = g.battle ? $('#divider').getBoundingClientRect().width + 16 : 0;
    let meW, oppW = 0;
    if (g.battle) {
      meW = Math.min((Ha * SC.W) / SC.H, (Wa - div) * 0.66);
      oppW = Math.min(Wa - div - meW, meW * 0.62);
    } else meW = Math.min((Ha * SC.W) / SC.H, Wa);
    meW = Math.max(60, Math.floor(meW));
    const meH = Math.floor((meW * SC.H) / SC.W);
    const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    this.cv.style.width = meW + 'px';
    this.cv.style.height = meH + 'px';
    this.cv.width = Math.round(meW * dpr);
    this.cv.height = Math.round(meH * dpr);
    this.k = this.cv.width / SC.W;
    $('#wrap-me').style.flex = '0 0 ' + meW + 'px';
    if (g.battle) {
      oppW = Math.max(60, Math.floor(oppW));
      const oppH = Math.floor((oppW * SC.H) / SC.W);
      this.cvo.style.width = oppW + 'px';
      this.cvo.style.height = oppH + 'px';
      this.cvo.width = Math.round(oppW * dpr);
      this.cvo.height = Math.round(oppH * dpr);
      this.ko = this.cvo.width / SC.W;
      $('#wrap-opp').style.width = oppW + 'px';
    }
    SC.spr.setScale(this.k * 1.05);
    const scale = Math.min(this.k, 3);
    const key = g.map.id + scale.toFixed(2);
    if (this.bgKey !== key) {
      this.bg = SC.renderMapBG(g.map, scale);
      this.bgKey = key;
    }
  },

  // ---------------- Eingabe ----------------
  toLogical(e) {
    const r = this.cv.getBoundingClientRect();
    return {
      x: ((e.clientX - r.left) / r.width) * SC.W,
      y: ((e.clientY - r.top) / r.height) * SC.H,
      inside: e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom,
    };
  },
  onDown(e) {
    if (!this.game) return;
    SC.audio.init();
    const p = this.toLogical(e);
    if (this.viewOpp) {
      this.viewOpp = false;
      return;
    }
    if (this.placing) {
      this.dragging = true;
      this.updateGhost(p);
      return;
    }
    this.downP = p;
  },
  onMove(e) {
    if (!this.game || !this.placing) return;
    if (!this.dragging && e.pointerType !== 'mouse') return;
    this.updateGhost(this.toLogical(e));
  },
  onUp(e) {
    if (!this.game) return;
    if (this.placing && this.dragging) {
      this.dragging = false;
      const p = this.toLogical(e);
      this.updateGhost(p);
      if (p.inside) this.tryPlace();
      return;
    }
    if (this.placing && e.pointerType === 'mouse' && e.target === this.cv) {
      this.tryPlace();
      return;
    }
    if (this.downP && e.target === this.cv) {
      const p = this.downP;
      this.downP = null;
      const f = this.game.me;
      if (f.collectAt(p.x, p.y)) return;
      const t = f.towerAt(p.x, p.y);
      this.select(t);
      if (t) SC.audio.click();
    }
    this.downP = null;
  },
  updateGhost(p) {
    const g = this.ghost;
    g.x = p.x;
    g.y = p.y;
    g.show = p.inside;
    g.ok = p.inside && this.game.me.canPlace(this.placing, p.x, p.y) && this.game.me.money >= SC.TOWERS[this.placing].cost;
  },
  tryPlace() {
    const g = this.ghost, f = this.game.me;
    if (!g.show) return;
    if (!g.ok) {
      SC.audio.error();
      return;
    }
    const t = f.placeTower(this.placing, g.x, g.y);
    if (t) {
      SC.audio.place();
      this.cancelPlacing();
      this.select(t);
    }
  },
  startPlacing(kind) {
    this.select(null);
    this.placing = kind;
    this.ghost.show = false;
    for (const c of $$('#shop .card')) c.classList.toggle('on', c.dataset.kind === kind);
    const lbl = $('#view-label');
    lbl.textContent = SC.TOWERS[kind].name + ' – tippe auf die Karte';
    lbl.classList.remove('hidden');
    SC.audio.click();
  },
  cancelPlacing() {
    this.placing = null;
    this.dragging = false;
    this.ghost.show = false;
    for (const c of $$('#shop .card')) c.classList.remove('on');
    $('#view-label').classList.add('hidden');
  },
  select(t) {
    this.sel = t;
    this.upKey = '';
    if (t) {
      this.cancelPlacing();
      $('#upgrade').classList.remove('hidden');
      this.refreshPanel();
    } else $('#upgrade').classList.add('hidden');
  },

  // ---------------- Leisten ----------------
  buildShop() {
    $('#shop').innerHTML = SC.TOWER_ORDER.map((k) => '<button class="card" data-kind="' + k + '" title="' + SC.TOWERS[k].name + '"><img src="' + SC.towerIcon(k, 44) + '" alt=""><span class="price">' + SC.TOWERS[k].cost + '</span></button>').join('');
  },
  buildSends() {
    $('#sends').innerHTML = SC.SENDS.map((s) => {
      const eco = s.eco > 0 ? '+' + s.eco.toFixed(1) : s.eco < 0 ? String(s.eco) : '';
      return (
        '<button class="card send" data-send="' + s.id + '" title="' + SC.BLOONS[s.type].name + '"><img src="' + SC.bloonIcon(s.type, 34) + '" alt="">' +
        '<span class="cnt">x' + s.count + '</span>' + (eco ? '<span class="ecov' + (s.eco < 0 ? ' neg' : '') + '">' + eco + '</span>' : '') +
        '<span class="price">' + s.cost + '</span><span class="lockov">' + ico('lock') + '<b>R' + s.round + '</b></span></button>'
      );
    }).join('');
    SC.paintIcons($('#sends'));
  },
  buildUpgrade() {
    const t = this.sel, f = this.game.me, d = t.def;
    let h = '<div class="up-tower"><button class="up-close" data-a="close" aria-label="Schließen">' + SC.ICON.close() + '</button>';
    h += '<div class="nm">' + (d.name.length > 14 ? d.short : d.name) + '</div><div class="ut-row"><img src="' + SC.towerIcon(t.kind, 54, t.tiers) + '" alt=""><div class="ut-col">';
    if (TARGET_KINDS.includes(t.kind)) h += '<div class="tgt"><button data-a="tprev">' + SC.ICON.arrow('l') + '</button><span id="tg">' + TARGET_NAME[t.target] + '</span><button data-a="tnext">' + SC.ICON.arrow('r') + '</button></div>';
    else if (t.kind === 'farm') h += '<div class="tgt"><span>+' + Math.round(t.s.income * (t.s.market || 1)) + '/Tick</span></div>';
    h += '<button class="btn red sell" data-a="sell">' + ico('coin') + f.sellValue(t) + '</button></div></div></div>';
    for (let p = 0; p < 2; p++) {
      const tier = t.tiers[p];
      const st = f.upgradeState(t, p);
      h += '<div class="up-path' + (st.why === 'locked' ? ' locked' : st.why === 'max' ? ' max' : '') + '"><div class="pips">';
      for (let i = 0; i < SC.MAX_TIER; i++) h += '<i class="' + (i < tier ? 'f' : '') + (i === 3 ? ' t4' : '') + '"></i>';
      h += '</div>';
      if (st.why === 'max') h += '<div class="up-state">' + ico('trophy') + 'Maximal</div>';
      else if (st.why === 'locked') h += '<div class="up-state">' + ico('lock') + 'Pfad gesperrt</div>';
      else {
        const nt = t.tiers.slice();
        nt[p]++;
        h += '<div class="up-next"><img src="' + SC.towerIcon(t.kind, 64, nt) + '" alt=""><div class="up-info"><span class="unm' + (tier === 3 ? ' t4' : '') + '">' + st.u.name + '</span><small>' + st.u.desc + '</small>';
        h += '<button class="btn buy ' + (st.ok ? 'green' : 'red') + '" data-a="up" data-p="' + p + '">' + ico('coin') + st.u.cost + '</button></div></div>';
      }
      h += '</div>';
    }
    $('#upgrade').innerHTML = h;
    SC.paintIcons($('#upgrade'));
  },
  refreshPanel() {
    const g = this.game, f = g.me;
    if (this.sel) {
      if (!f.towers.includes(this.sel)) return this.select(null);
      const key = this.sel.id + ':' + this.sel.tiers.join(',');
      if (key !== this.upKey) {
        this.upKey = key;
        this.buildUpgrade();
      }
      for (const b of $$('#upgrade .buy')) {
        const ok = f.upgradeState(this.sel, +b.dataset.p).ok;
        b.classList.toggle('green', ok);
        b.classList.toggle('red', !ok);
      }
    }
    for (const c of $$('#shop .card')) c.classList.toggle('poor', f.money < SC.TOWERS[c.dataset.kind].cost);
    if (g.battle) {
      const r = Math.max(1, g.round);
      for (const b of $$('#sends .card')) {
        const s = SC.SENDS.find((x) => x.id === b.dataset.send);
        const cost = g.sendCost(s, this.mods);
        b.classList.toggle('locked', s.round > r);
        b.classList.toggle('poor', s.round <= r && f.money < cost);
        const ce = b.querySelector('.price');
        if (ce.textContent !== String(cost)) ce.textContent = cost;
      }
      $('#mod-camo').disabled = r < SC.SEND_MOD.camo.round;
      $('#mod-regrow').disabled = r < SC.SEND_MOD.regrow.round;
      // eingehende Sends (gegen mich)
      const q = f.sendQueue;
      const qk = q.map((x) => x.send.id).join(',');
      if (qk !== this.qKey) {
        this.qKey = qk;
        $('#queue').innerHTML = q.slice(0, 6).map((x) => '<div class="qcard"><img src="' + SC.bloonIcon(x.send.type, 24) + '"><b>' + x.send.count + '</b></div>').join('');
      }
    } else $('#btn-start').disabled = !g.canStartRound();
    this.refreshAbilities();
  },
  // Gleiche Fähigkeiten werden wie in BTD zu einem Button gebündelt
  abilityGroups() {
    const groups = new Map();
    for (const t of this.game.me.towers) {
      if (!t.ab) continue;
      const key = t.kind + (t.tiers[0] >= SC.MAX_TIER ? 'a' : 'b');
      if (!groups.has(key)) groups.set(key, { key, list: [], icon: t });
      groups.get(key).list.push(t);
    }
    return [...groups.values()];
  },
  refreshAbilities() {
    const gs = this.abilityGroups();
    const key = gs.map((g) => g.key + g.list.length).join(',');
    const box = $('#abilities');
    if (key !== this.abKey) {
      this.abKey = key;
      box.innerHTML = gs.map((g) => '<button class="ability" data-g="' + g.key + '" title="' + g.icon.ab.def.name + '"><img src="' + SC.towerIcon(g.icon.kind, 44, g.icon.tiers) + '" alt=""><span class="cd"></span>' + (g.list.length > 1 ? '<span class="abn"></span>' : '') + '</button>').join('');
    }
    for (const b of $$('.ability', box)) {
      const g = gs.find((x) => x.key === b.dataset.g);
      if (!g) continue;
      let best = 1, ready = 0;
      for (const t of g.list) {
        const pct = Math.max(0, t.ab.cd / t.ab.def.cd);
        best = Math.min(best, pct);
        if (pct <= 0) ready++;
      }
      b.classList.toggle('ready', ready > 0);
      b.querySelector('.cd').style.background = best > 0 ? 'conic-gradient(rgba(10,20,40,0.62) ' + best * 100 + '%, transparent 0)' : 'none';
      const n = b.querySelector('.abn');
      if (n) n.textContent = ready + '/' + g.list.length;
    }
  },
  setText(id, v) {
    if (this.hud[id] === v) return;
    this.hud[id] = v;
    const el = $(id);
    if (el) el.textContent = v;
  },
  setHp(which, lives, max) {
    const pct = Math.max(0, Math.min(1, lives / max));
    const key = which + Math.round(pct * 200);
    if (this.hud['hp' + which] === key) return;
    this.hud['hp' + which] = key;
    const el = $('#hpf-' + which);
    el.style.width = pct * 100 + '%';
    el.classList.toggle('mid', pct <= 0.5 && pct > 0.2);
    el.classList.toggle('low', pct <= 0.2);
  },
  updateHud() {
    const g = this.game, f = g.me;
    const maxL = g.battle ? 150 : SC.CLASSIC_DIFF[g.cfg.diff || 'normal'].lives;
    this.setText('#hp-me', Math.max(0, Math.ceil(f.lives)));
    this.setHp('me', f.lives, maxL);
    this.setText('#money', fmt(f.money));
    this.setText('#round-n', g.battle ? String(g.round) : g.round + '/40');
    const s = Math.floor(g.time);
    this.setText('#clock', String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0'));
    if (g.battle) {
      this.setText('#eco', fmt(f.eco));
      this.setText('#hp-opp', Math.max(0, Math.ceil(g.opp.lives)));
      this.setHp('opp', g.opp.lives, 150);
      const w = Math.round((1 - g.ecoT / SC.ECO_INTERVAL) * 100) + '%';
      const bar = $('#ecobar');
      if (bar.style.width !== w) bar.style.width = w;
    } else this.setText('#lives-c', Math.max(0, Math.ceil(f.lives)));
  },

  // ---------------- Meldungen ----------------
  banner(txt) {
    const b = $('#banner');
    b.textContent = txt;
    b.classList.remove('show');
    void b.offsetWidth;
    b.classList.add('show');
  },
  toast(html) {
    const el = document.createElement('div');
    el.className = 'toast';
    el.innerHTML = html;
    $('#toasts').appendChild(el);
    setTimeout(() => el.remove(), 2700);
    while ($('#toasts').children.length > 3) $('#toasts').firstChild.remove();
  },
  onNotify(kind, d) {
    const g = this.game;
    if (kind === 'round') {
      this.banner('Runde ' + d);
      SC.audio.round();
    } else if (kind === 'ability') {
      if (d.field === g.me) this.cutin(d.t);
      else this.toast('<img src="' + SC.towerIcon(d.t.kind, 22, d.t.tiers) + '">' + g.opp.name + ': ' + d.t.ab.def.name + '!');
    } else if (kind === 'tier4') {
      if (g.me.towers.includes(d)) this.banner('MEISTER-UPGRADE!');
    } else if (kind === 'rush') {
      setTimeout(() => this.banner('Die Strömung wird stärker!'), 1700);
    } else if (kind === 'incoming') {
      const mods = (d.mods.camo ? ' Glas' : '') + (d.mods.regrow ? ' Nachwachs' : '');
      this.toast('<img src="' + SC.bloonIcon(d.send.type, 22) + '">' + d.send.count + 'x ' + SC.BLOONS[d.send.type].name + mods);
    } else if (kind === 'won40') {
      SC.audio.win();
      g.paused = true;
      SC.modal('<h2>Geschafft!</h2><p>Du hast alle 40 Wellen überlebt!</p><div class="btns"><button class="btn green" data-act="go">Freispiel</button><button class="btn blue" data-act="menu">Menü</button></div>', {
        go: () => {
          g.paused = false;
        },
        menu: () => this.quit(),
      });
    } else if (kind === 'end') setTimeout(() => this.endScreen(d), 700);
  },
  endScreen(res) {
    const g = this.game;
    if (!g) return;
    SC.music.stop(0.4);
    res.win ? SC.audio.win() : SC.audio.lose();
    if (res.win) this.confetti();
    let title, txt;
    if (g.battle) {
      title = res.win ? 'SIEG!' : 'NIEDERLAGE';
      txt = res.reason || (res.win ? 'Deine Krebse haben die Schlacht gewonnen!' : 'Zu viele Blasen sind durchgekommen.');
    } else {
      title = 'GAME OVER';
      txt = 'Rekord auf dieser Karte: Runde ' + SC.store.get('best.' + g.map.id, 0);
    }
    const st = g.me.stats;
    SC.modal(
      '<h2 class="' + (res.win ? '' : 'lose') + '">' + title + '</h2><p>' + txt + '</p>' +
        '<div class="stats"><div>Runde<b>' + g.round + '</b></div><div>Popps<b>' + fmt(st.pops) + '</b></div>' + (g.battle ? '<div>Gesendet<b>' + st.sent + '</b></div>' : '') + '<div>Zeit<b>' + $('#clock').textContent + '</b></div></div>' +
        '<div class="btns">' + (g.mode !== 'online' ? '<button class="btn green" data-act="again">' + ico('play') + 'Nochmal</button>' : '') + '<button class="btn blue" data-act="menu">Menü</button></div>',
      { again: () => this.start(this.cfg), menu: () => this.quit() }
    );
  },
  cutin(t) {
    const c = $('#cutin');
    $('#cutin-img').src = SC.towerIcon(t.kind, 150, t.tiers);
    $('#cutin-name').textContent = t.ab.def.name + '!';
    c.classList.remove('hidden');
    const band = $('.cutin-band', c);
    band.style.animation = 'none';
    void band.offsetWidth;
    band.style.animation = '';
    clearTimeout(this.cutT);
    this.cutT = setTimeout(() => c.classList.add('hidden'), 1200);
  },
  confetti() {
    const cv = $('#confetti');
    cv.classList.remove('hidden');
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = innerWidth * dpr;
    cv.height = innerHeight * dpr;
    const x = cv.getContext('2d');
    const cols = ['#ff4d4d', '#ffe14d', '#4fd34a', '#3aa8ff', '#ff6fb5', '#ffffff', '#ff9a2e'];
    const P = [];
    for (let i = 0; i < 160; i++) P.push({ x: Math.random() * innerWidth, y: -Math.random() * innerHeight * 0.8, vx: (Math.random() - 0.5) * 60, vy: 120 + Math.random() * 160, r: Math.random() * 6, vr: (Math.random() - 0.5) * 10, c: cols[i % cols.length], w: 6 + Math.random() * 6 });
    const t0 = performance.now();
    let last = t0;
    const loop = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      x.setTransform(dpr, 0, 0, dpr, 0, 0);
      x.clearRect(0, 0, innerWidth, innerHeight);
      for (const p of P) {
        p.x += p.vx * dt + Math.sin(now / 300 + p.r) * 0.6;
        p.y += p.vy * dt;
        p.r += p.vr * dt;
        x.save();
        x.translate(p.x, p.y);
        x.rotate(p.r);
        x.fillStyle = p.c;
        x.fillRect(-p.w / 2, -p.w / 4, p.w, p.w / 2);
        x.restore();
      }
      if (now - t0 < 4500) requestAnimationFrame(loop);
      else cv.classList.add('hidden');
    };
    requestAnimationFrame(loop);
  },
  pauseMenu() {
    const g = this.game;
    SC.audio.click();
    const canPause = g.mode !== 'online';
    if (canPause) g.paused = true;
    SC.modal(
      '<h2>' + (canPause ? 'Pause' : 'Menü') + '</h2>' + (canPause ? '' : '<p>Online läuft das Spiel weiter!</p>') +
        '<div class="btns"><button class="btn green" data-act="resume">' + ico('play') + 'Weiter</button>' +
        (canPause ? '<button class="btn blue" data-act="restart">Neustart</button>' : '') +
        '<button class="btn grey" data-act="music">' + SC.ICON.music(SC.audio.musicOn) + (SC.audio.musicOn ? 'Musik an' : 'Musik aus') + '</button>' +
        '<button class="btn grey" data-act="sound"><i data-icon="sound"></i>' + (SC.audio.on ? 'Ton an' : 'Ton aus') + '</button>' +
        '<button class="btn red" data-act="quit">' + ico('flag') + (g.battle ? 'Aufgeben' : 'Hauptmenü') + '</button></div>',
      {
        resume: () => {
          g.paused = false;
        },
        restart: () => this.start(this.cfg),
        sound: () => {
          SC.audio.toggle();
          this.pauseMenu();
          return false;
        },
        music: () => {
          SC.audio.toggleMusic();
          this.pauseMenu();
          return false;
        },
        quit: () => {
          if (g.mode === 'online' && g.net) g.net.send({ t: 'bye' });
          this.quit();
        },
      }
    );
    const sb = $('#modal-box [data-act="sound"] i');
    if (sb) sb.innerHTML = SC.ICON.sound(SC.audio.on);
  },

  // ---------------- Loop ----------------
  frame(now) {
    if (!this.running || !this.game) {
      this.running = false;
      return;
    }
    requestAnimationFrame((t) => this.frame(t));
    const dt = Math.min(0.1, (now - this.last) / 1000);
    this.last = now;
    const g = this.game;
    this.acc += dt * (g.battle ? 1 : this.speed);
    let n = 0;
    while (this.acc >= STEP && n < 12) {
      g.update(STEP);
      this.acc -= STEP;
      n++;
    }
    if (n >= 12) this.acc = 0;
    this.render();
    this.updateHud();
    this.panelT = (this.panelT || 0) - dt;
    if (this.panelT <= 0) {
      this.panelT = 0.15;
      this.refreshPanel();
    }
  },
  render() {
    const ctx = this.ctx, g = this.game, time = g.time;
    const sh = (g.me.shake || 0) > 0 ? g.me.shake * 16 * this.k : 0;
    ctx.setTransform(this.k, 0, 0, this.k, (Math.random() - 0.5) * sh, (Math.random() - 0.5) * sh);
    const lbl = $('#view-label');
    if (this.viewOpp && g.opp) {
      SC.renderField(ctx, g.opp, time, this.bg, {});
      if (!this.placing) {
        lbl.textContent = g.opp.name + ' – tippen zum Zurückkehren';
        lbl.classList.remove('hidden');
      }
    } else {
      if (!this.placing && !lbl.classList.contains('hidden')) lbl.classList.add('hidden');
      SC.renderField(ctx, g.me, time, this.bg, { selected: this.sel });
      if (this.placing && this.ghost.show) {
        const gh = this.ghost, def = SC.TOWERS[this.placing];
        const r = def.base.global ? 30 : def.base.range || SC.towerRadius(this.placing) + 4;
        SC.drawRange(ctx, gh.x, gh.y, r, gh.ok);
        ctx.globalAlpha = 0.8;
        SC.drawTower(ctx, { kind: this.placing, x: gh.x, y: gh.y, tiers: [0, 0], s: def.base, ang: -Math.PI / 2, anim: 0 }, time);
        ctx.globalAlpha = 1;
      }
    }
    if (g.me.leakFlash > 0 && !this.viewOpp) {
      ctx.setTransform(this.k, 0, 0, this.k, 0, 0);
      const vg = ctx.createRadialGradient(SC.W / 2, SC.H / 2, SC.H * 0.35, SC.W / 2, SC.H / 2, SC.W * 0.62);
      vg.addColorStop(0, 'rgba(255,0,0,0)');
      vg.addColorStop(1, 'rgba(255,20,10,' + Math.min(0.55, g.me.leakFlash) + ')');
      ctx.fillStyle = vg;
      ctx.fillRect(0, 0, SC.W, SC.H);
    }
    if (g.battle && g.opp) {
      this.oppFrame = (this.oppFrame || 0) + 1;
      if (this.oppFrame % 2 === 0) {
        const c = this.ctxo;
        c.setTransform(this.ko, 0, 0, this.ko, 0, 0);
        SC.renderField(c, this.viewOpp ? g.me : g.opp, time, this.bg, { mini: true });
      }
    }
  },
};
