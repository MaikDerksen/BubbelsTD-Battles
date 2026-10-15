'use strict';
// ============================================================
//  Titelbild, Setup, Ausrüstung, Vorrunde (Würfel), Direkt-Duell, Lexikon
// ============================================================
SC.Menu = {
  setup: { mode: 'ai', map: 'bucht', diff: 'normal' },
  onlineMap: 'bucht',

  init() {
    this.loadout = SC.checkLoadout(SC.store.get('loadout', null)) || SC.checkLoadout(SC.DEFAULT_LOADOUT);
    for (const b of document.querySelectorAll('[data-go]')) {
      b.addEventListener('click', () => {
        SC.audio.init();
        SC.audio.click();
        this.go(b.dataset.go);
      });
    }
    const sb = SC.$('#btn-sound'), mb = SC.$('#btn-music');
    const upd = () => {
      sb.innerHTML = SC.ICON.sound(SC.audio.on);
      mb.innerHTML = SC.ICON.music(SC.audio.musicOn);
    };
    upd();
    sb.addEventListener('click', () => {
      SC.audio.init();
      SC.audio.toggle();
      upd();
    });
    mb.addEventListener('click', () => {
      SC.audio.init();
      SC.audio.toggleMusic();
      upd();
    });
    // Audio darf erst nach der ersten Berührung starten (iOS)
    SC.music.play('menu');
    const unlock = () => SC.audio.init();
    document.addEventListener('pointerdown', unlock, { passive: true });
    document.addEventListener('keydown', unlock);
    SC.$('#btn-play').addEventListener('click', () => {
      SC.audio.init();
      const cfg = Object.assign({}, this.setup);
      if (cfg.mode === 'classic') {
        this.stopBg();
        cfg.loadout = { towers: null, powers: this.loadout.powers.slice() };
        SC.UI.start(cfg);
      } else this.preAI(cfg);
    });
    SC.$('#btn-host').addEventListener('click', () => this.host());
    SC.$('#btn-join').addEventListener('click', () => this.join());
    SC.$('#btn-reroll').addEventListener('click', () => this.preReroll());
    SC.$('#btn-ready').addEventListener('click', () => this.preReady());
    SC.$('#pre-back').addEventListener('click', () => this.preBack());
    SC.paintIcons(document);
    if (SC.Online) SC.Online.init();

    const standalone = window.navigator.standalone || window.matchMedia('(display-mode: standalone)').matches;
    if (/iPhone|iPad|iPod/.test(navigator.userAgent) && !standalone) SC.$('#install-hint').classList.remove('hidden');
    this.drawTitleArt();
    window.addEventListener('resize', () => SC.$('#title').classList.contains('active') && this.drawTitleArt());
    this.startBg();
  },

  drawTitleArt() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const paint = (c, fn, w, h, ox, oy) => {
      const r = c.getBoundingClientRect();
      if (!r.width) return;
      c.width = r.width * dpr;
      c.height = r.height * dpr;
      const x = c.getContext('2d');
      x.setTransform(c.width / w, 0, 0, c.height / h, c.width * ox, c.height * oy);
      fn(x);
    };
    paint(SC.$('#hero-l'), (x) => SC.drawHero(x, '#2f7fe8', 1), 230, 240, 0.5, 0.52);
    paint(SC.$('#hero-r'), (x) => {
      x.scale(-1, 1);
      SC.drawHero(x, '#e8302a', 1);
    }, 230, 240, 0.5, 0.52);
    paint(SC.$('#trophy'), (x) => SC.drawTrophy(x), 200, 200, 0.5, 0.48);
  },

  go(where) {
    if (where === 'title') {
      if (this.net) {
        this.net.close();
        this.net = null;
      }
      if (SC.Online) SC.Online.leaveLobby();
      SC.showScreen('title');
      this.drawTitleArt();
      this.startBg();
      return;
    }
    this.stopBg();
    if (where === 'setup-ai' || where === 'setup-classic') {
      this.setup.mode = where === 'setup-ai' ? 'ai' : 'classic';
      SC.$('#setup-title').textContent = this.setup.mode === 'ai' ? 'Duell gegen KI' : 'Klassik-Wellen';
      SC.$('#diff-title').textContent = this.setup.mode === 'ai' ? 'Gegner wählen' : 'Schwierigkeit';
      this.renderMaps('#map-list', this.setup.map, (id) => (this.setup.map = id));
      this.renderDiff();
      SC.showScreen('setup');
    } else if (where === 'online') {
      this.renderMaps('#map-list-online', this.onlineMap, (id) => (this.onlineMap = id));
      SC.$('#online-status').innerHTML = '';
      SC.showScreen('online');
      if (SC.Online) SC.Online.open();
    } else if (where === 'lexikon') {
      this.renderLexikon();
      SC.showScreen('lexikon');
    } else if (where === 'loadout') {
      const body = SC.$('#loadout-body');
      const draft = { towers: this.loadout.towers.slice(), powers: this.loadout.powers.slice() };
      this.editor(body, draft, (lo) => {
        const ok = SC.checkLoadout(lo);
        if (ok) this.saveLoadout(ok);
      });
      SC.showScreen('loadout');
    }
  },
  saveLoadout(lo) {
    this.loadout = lo;
    SC.store.set('loadout', lo);
    if (SC.Online) SC.Online.saveLoadout(lo);
  },

  mapThumb(map) {
    if (map._thumb) return map._thumb;
    const bg = SC.renderMapBG(map, 0.36);
    return (map._thumb = bg.toDataURL('image/jpeg', 0.85));
  },
  renderMaps(sel, cur, set) {
    const el = SC.$(sel);
    el.innerHTML = SC.MAPS.map((m) => {
      const best = SC.store.get('best.' + m.id, 0);
      return '<button class="map-card' + (m.id === cur ? ' on' : '') + '" data-map="' + m.id + '"><img src="' + this.mapThumb(m) + '" alt=""><b>' + m.name + '</b><small>' + m.desc + (best ? ' Rekord: Runde ' + best : '') + '</small></button>';
    }).join('');
    for (const b of el.querySelectorAll('.map-card')) {
      b.addEventListener('click', () => {
        SC.audio.click();
        set(b.dataset.map);
        for (const x of el.querySelectorAll('.map-card')) x.classList.toggle('on', x === b);
      });
    }
  },
  renderDiff() {
    const ai = this.setup.mode === 'ai';
    const list = ai
      ? [['easy', 'Krabbel-KI', 'Gemütlich – zum Lernen'], ['normal', 'Hummer-KI', 'Ausgewogen'], ['hard', 'Kraken-KI', 'Gnadenlos']]
      : Object.entries(SC.CLASSIC_DIFF).map(([k, v]) => [k, v.name, v.lives + ' Leben, ' + v.money + ' Startgeld']);
    const el = SC.$('#diff-list');
    el.innerHTML = list.map(([k, n, s]) => '<button data-d="' + k + '" class="' + (k === this.setup.diff ? 'on' : '') + '">' + n + '<small>' + s + '</small></button>').join('');
    for (const b of el.querySelectorAll('button')) {
      b.addEventListener('click', () => {
        SC.audio.click();
        this.setup.diff = b.dataset.d;
        for (const x of el.querySelectorAll('button')) x.classList.toggle('on', x === b);
      });
    }
  },

  // ---------------- Ausrüstungs-Editor (3 Türme + 3 Kräfte) ----------------
  // lo wird direkt verändert; onChange bekommt den neuen Stand
  editor(el, lo, onChange, opts) {
    opts = opts || {};
    const render = () => {
      let h = '<h3>Türme <small>3 wählen – der 4. kommt vom Würfel</small></h3><div class="lo-grid">';
      for (const k of SC.TOWER_ORDER) {
        const d = SC.TOWERS[k];
        const i = lo.towers.indexOf(k);
        const isDice = (typeof opts.dice === 'function' ? opts.dice() : opts.dice) === k;
        h += '<button class="lo-card' + (i >= 0 ? ' on' : '') + (isDice ? ' isdice' : '') + '" data-t="' + k + '"><img src="' + SC.towerIcon(k, 48) + '" alt=""><b>' + d.short + '</b><span class="price">' + d.cost + '</span>' +
          (i >= 0 ? '<span class="lo-n">' + (i + 1) + '</span>' : '') + (isDice ? '<span class="lo-n dice">' + SC.ICON.dice(6) + '</span>' : '') + (SC.NEW_TOWERS[k] ? '<span class="lo-new">NEU</span>' : '') + '</button>';
      }
      h += '</div><h3>Kräfte <small>3 wählen – im Spiel gegen Muscheln einsetzbar</small></h3><div class="lo-grid powers">';
      for (const p of SC.POWERS) {
        const i = lo.powers.indexOf(p.id);
        h += '<button class="lo-card pw' + (i >= 0 ? ' on' : '') + '" data-p="' + p.id + '">' + SC.ICON.power(p.id) + '<b>' + p.name + '</b><span class="price">' + (p.cost || 'gratis') + '</span>' + (i >= 0 ? '<span class="lo-n">' + (i + 1) + '</span>' : '') + (p.target === 'opp' ? '<span class="lo-new atk">Angriff</span>' : '') + '</button>';
      }
      h += '</div><div class="lo-info" id="lo-info">' + (this.loInfo || 'Tippe auf einen Turm oder eine Kraft, um sie aus- oder abzuwählen.') + '</div>';
      el.innerHTML = h;
    };
    const info = (html) => {
      this.loInfo = html;
      const e = el.querySelector('.lo-info');
      if (e) e.innerHTML = html;
    };
    el.onclick = (e) => {
      const b = e.target.closest('.lo-card');
      if (!b || (opts.locked && opts.locked())) return;
      SC.audio.click();
      if (b.dataset.t) {
        const k = b.dataset.t, d = SC.TOWERS[k];
        const i = lo.towers.indexOf(k);
        if (i >= 0) lo.towers.splice(i, 1);
        else {
          if (lo.towers.length >= SC.LOADOUT.towers) lo.towers.shift();
          lo.towers.push(k);
        }
        this.loInfo = '<b>' + d.name + '</b> (' + d.cost + '): ' + d.desc;
      } else {
        const id = b.dataset.p, p = SC.POWER_BY_ID[id];
        const i = lo.powers.indexOf(id);
        if (i >= 0) lo.powers.splice(i, 1);
        else {
          if (lo.powers.length >= SC.LOADOUT.powers) lo.powers.shift();
          lo.powers.push(id);
        }
        this.loInfo = '<b>' + p.name + '</b> – ' + p.desc + ' Kosten ' + (p.cost || 'keine') + ', Abklingzeit ' + p.cd + ' s, ab Runde ' + p.round + '.';
      }
      render();
      info(this.loInfo + (SC.checkLoadout(lo) ? '' : ' <span class="warn">Wähle genau 3 Türme und 3 Kräfte.</span>'));
      onChange(lo);
    };
    this.loInfo = '';
    render();
    return { render };
  },

  // ---------------- Vorrunde: Würfel-Turm & Ausrüstung ----------------
  // o: { mode: 'ai'|'p2p'|'server', map, opp, onStart(loadoutMitWürfel), onBack }
  openPre(o) {
    this.stopBg();
    const pre = (this.pre = Object.assign({ ready: false, oppReady: false, rerolls: SC.LOADOUT.rerolls }, o));
    pre.lo = { towers: this.loadout.towers.slice(), powers: this.loadout.powers.slice() };
    if (o.mode !== 'server') pre.dice = SC.rollDice(pre.lo.towers);
    this.preEditor = this.editor(SC.$('#pre-edit'), pre.lo, (lo) => this.preChanged(lo), { dice: () => pre.dice, locked: () => pre.ready });
    SC.$('#pre-status').textContent = '';
    this.preRender(true);
    SC.showScreen('prematch');
    clearInterval(this.preT);
    this.preT = setInterval(() => this.preTick(), 250);
  },
  preChanged(lo) {
    const pre = this.pre;
    if (!SC.checkLoadout(lo)) return this.preRender();
    this.saveLoadout(SC.checkLoadout(lo));
    if (pre.mode === 'server') pre.net.send({ t: 'pre.loadout', loadout: SC.checkLoadout(lo) });
    else if (lo.towers.indexOf(pre.dice) >= 0) {
      pre.dice = SC.rollDice(lo.towers);
      this.preRender(true);
      return;
    }
    this.preRender();
  },
  // Server meldet den Stand der Vorrunde
  preUpdate(m) {
    const pre = this.pre;
    if (!pre || pre.mode !== 'server') return;
    const rolled = m.me.dice !== pre.dice;
    pre.dice = m.me.dice;
    pre.rerolls = m.me.rerolls;
    pre.ready = m.me.ready;
    pre.oppReady = m.opp.ready;
    pre.deadline = m.deadline;
    pre.opp = m.opp;
    const lo = SC.checkLoadout(m.me.loadout);
    if (lo && (lo.towers.join() !== pre.lo.towers.join() || lo.powers.join() !== pre.lo.powers.join())) {
      pre.lo.towers = lo.towers;
      pre.lo.powers = lo.powers;
    }
    this.preRender(rolled);
  },
  preRender(rolled) {
    const pre = this.pre;
    if (!pre) return;
    const lo = pre.lo;
    SC.$('#pre-slots').innerHTML =
      lo.towers.map((k) => '<div class="pslot"><img src="' + SC.towerIcon(k, 48) + '" alt=""><b>' + SC.TOWERS[k].short + '</b></div>').join('') +
      '<div class="pslot pw">' + lo.powers.map((id) => '<span title="' + SC.esc(SC.POWER_BY_ID[id].name) + '">' + SC.ICON.power(id) + '</span>').join('') + '</div>';
    const card = SC.$('#dice-card');
    const showTower = () => {
      card.classList.remove('rolling');
      card.innerHTML = pre.dice ? '<img src="' + SC.towerIcon(pre.dice, 64) + '" alt=""><b>' + SC.TOWERS[pre.dice].short + '</b><span class="dmark">' + SC.ICON.dice(6) + '</span>' : '';
    };
    if (rolled && pre.dice) {
      card.classList.add('rolling');
      card.innerHTML = '<span class="dspin">' + SC.ICON.dice(1 + Math.floor(Math.random() * 6)) + '</span>';
      SC.audio.click();
      clearTimeout(this.diceT);
      this.diceT = setTimeout(showTower, 650);
    } else if (!card.classList.contains('rolling')) showTower();
    const rb = SC.$('#btn-reroll');
    rb.querySelector('span').textContent = 'Neu würfeln (' + pre.rerolls + ')';
    rb.disabled = pre.rerolls <= 0 || pre.ready;
    const ok = !!SC.checkLoadout(lo);
    const ready = SC.$('#btn-ready');
    ready.disabled = !ok || pre.ready;
    ready.lastChild.textContent = pre.ready ? 'Warte …' : 'Bereit!';
    const opp = pre.opp;
    SC.$('#pre-vs').innerHTML = opp ? 'gegen <b>' + SC.esc(opp.name) + '</b>' + (opp.guest ? ' <small>(Gast)</small>' : opp.rating != null ? ' <small>(' + opp.rating + ')</small>' : '') + (pre.oppReady ? ' <span class="okmark">bereit</span>' : '') : '';
    if (this.preEditor) this.preEditor.render();
    SC.$('#pre-edit').classList.toggle('locked', pre.ready);
  },
  preTick() {
    const pre = this.pre;
    if (!pre || !SC.$('#prematch').classList.contains('active')) return clearInterval(this.preT);
    const el = SC.$('#pre-clock');
    if (pre.deadline) {
      const now = pre.net && pre.net.serverNow ? pre.net.serverNow() : Date.now();
      const s = Math.max(0, Math.ceil((pre.deadline - now) / 1000));
      el.textContent = s + ' s';
      el.classList.toggle('urgent', s <= 5);
    } else el.textContent = '';
  },
  preReroll() {
    const pre = this.pre;
    if (!pre || pre.ready || pre.rerolls <= 0) return SC.audio.error();
    if (pre.mode === 'server') return pre.net.send({ t: 'pre.reroll' });
    pre.rerolls--;
    pre.dice = SC.rollDice(pre.lo.towers, Math.random, pre.dice);
    this.preRender(true);
  },
  preReady() {
    const pre = this.pre;
    if (!pre || pre.ready) return;
    const lo = SC.checkLoadout(pre.lo);
    if (!lo) return SC.audio.error();
    SC.audio.click();
    pre.ready = true;
    this.preRender();
    if (pre.mode === 'server') return pre.net.send({ t: 'pre.ready' });
    if (pre.mode === 'p2p') {
      pre.net.send({ t: 'ready', name: this.playerName() });
      SC.$('#pre-status').textContent = pre.oppReady ? '' : 'Warte auf deinen Gegner …';
    }
    this.preMaybeStart();
  },
  preMaybeStart() {
    const pre = this.pre;
    if (!pre.ready || (pre.mode === 'p2p' && !pre.oppReady)) return;
    clearInterval(this.preT);
    const full = { towers: pre.lo.towers.concat([pre.dice]), powers: pre.lo.powers.slice() };
    this.pre = null;
    pre.onStart(full);
  },
  preBack() {
    const pre = this.pre;
    SC.audio.click();
    clearInterval(this.preT);
    this.pre = null;
    if (pre && pre.onBack) pre.onBack();
  },
  playerName() {
    return (SC.Online && SC.Online.name) || 'Du';
  },

  // ---------------- Duell gegen KI ----------------
  preAI(cfg) {
    this.openPre({
      mode: 'ai',
      map: cfg.map,
      opp: { name: { easy: 'Krabbel-KI', normal: 'Hummer-KI', hard: 'Kraken-KI' }[cfg.diff] },
      onStart: (lo) => SC.UI.start(Object.assign({}, cfg, { loadout: lo, name: 'Du' })),
      onBack: () => this.go('setup-ai'),
    });
  },
  again(cfg) {
    SC.UI.quit();
    this.preAI(Object.assign({}, cfg));
  },

  // ---------------- Direkt-Duell (P2P, ohne eigenen Server) ----------------
  status(html) {
    SC.$('#online-status').innerHTML = html;
  },
  async host() {
    SC.audio.init();
    if (this.net) this.net.close();
    const net = (this.net = new SC.Net());
    this.status('Verbinde …');
    try {
      await net.host(
        (code) => this.status('Dein Code: <span class="code">' + code + '</span><br>Warte auf Gegner …'),
        () => {
          const map = this.onlineMap;
          net.send({ t: 'start', map });
          this.preP2P(net, map);
        },
        (e) => this.status('Fehler: ' + SC.esc(e.type || e.message || e))
      );
    } catch (e) {
      this.status(SC.esc(e.message));
    }
  },
  async join() {
    SC.audio.init();
    const code = SC.$('#join-code').value.trim().toUpperCase();
    if (!/^[A-Z0-9]{4}$/.test(code)) return this.status('Bitte den 4-stelligen Code eingeben.');
    if (this.net) this.net.close();
    const net = (this.net = new SC.Net());
    this.status('Suche Code ' + code + ' …');
    net.onmsg = (m) => {
      if (m && m.t === 'start' && SC.MAPS.some((x) => x.id === m.map)) this.preP2P(net, m.map);
    };
    try {
      await net.join(
        code,
        () => this.status('Verbunden! Warte auf Start …'),
        (e) => this.status(e.type === 'peer-unavailable' ? 'Code nicht gefunden.' : 'Fehler: ' + SC.esc(e.type || e))
      );
    } catch (e) {
      this.status(SC.esc(e.message));
    }
  },
  preP2P(net, map) {
    this.net = null;
    let oppName = 'Gegner';
    const back = () => {
      net.send({ t: 'bye' });
      net.close();
      this.go('online');
    };
    this.openPre({
      mode: 'p2p', net, map, opp: { name: oppName },
      onStart: (lo) => SC.UI.start({ mode: 'p2p', map, net, loadout: lo, name: this.playerName(), oppName }),
      onBack: back,
    });
    const pre = this.pre;
    net.onmsg = (m) => {
      if (!m || typeof m !== 'object' || this.pre !== pre) return;
      if (m.t === 'ready') {
        oppName = typeof m.name === 'string' && m.name.trim() ? m.name.trim().slice(0, 16) : 'Gegner';
        pre.opp = { name: oppName };
        pre.oppReady = true;
        SC.$('#pre-status').textContent = '';
        this.preRender();
        this.preMaybeStart();
      } else if (m.t === 'bye') {
        this.pre = null;
        net.close();
        this.go('online');
        this.status('Dein Gegner hat die Vorrunde verlassen.');
      }
    };
    net.onclose = () => {
      if (this.pre !== pre) return;
      this.pre = null;
      this.go('online');
      this.status('Verbindung getrennt.');
    };
  },

  // ---------------- Lexikon ----------------
  renderLexikon() {
    let h = '';
    for (const k of SC.TOWER_ORDER) {
      const d = SC.TOWERS[k];
      h += '<div class="lex-tower"><img src="' + SC.towerIcon(k, 76, [2, 0]) + '" alt=""><div><h4>' + d.name + ' – ' + d.cost + (SC.NEW_TOWERS[k] ? ' <span class="lo-new">NEU</span>' : '') + '</h4><p>' + d.desc + '</p><div class="lex-paths">';
      for (let p = 0; p < 2; p++) {
        h += '<div>' + d.paths[p].map((u, i) => '<b>Stufe ' + (i + 1) + ': ' + u.name + '</b> (' + u.cost + ') – ' + u.desc).join('<br>') + '</div>';
      }
      h += '</div></div></div>';
    }
    h += '<h3>Kräfte</h3><div class="lex-powers">';
    for (const p of SC.POWERS) h += '<div>' + SC.ICON.power(p.id) + '<p><b>' + p.name + '</b> – ' + p.desc + '<br><small>Kosten ' + (p.cost || 'keine') + ' · Abklingzeit ' + p.cd + ' s · ab Runde ' + p.round + '</small></p></div>';
    h += '</div><h3>Blasen</h3><div class="lex-bloons">';
    const IM = { blast: 'Explosion', cold: 'Kälte', sharp: 'Spitzes', sonic: 'Schall' };
    for (const t of SC.BLOON_ORDER) {
      const b = SC.BLOONS[t];
      const imm = b.immune ? '<br>immun: ' + b.immune.map((x) => IM[x]).join(', ') : '';
      h += '<div><img src="' + SC.bloonIcon(t, 48) + '" alt=""><br><b>' + b.name + '</b><br>RBE ' + b.rbe + imm + '</div>';
    }
    h += '</div><p class="hint">Ausrüstung wie in BTD Battles: 3 Türme frei wählen, der 4. kommt vom Würfel (2x neu würfeln). Upgrade-Regel: ein Pfad bis Stufe 4, der andere höchstens bis Stufe 2. Stufe 4 schaltet eine Spezialfähigkeit frei.</p>';
    SC.$('#lex-content').innerHTML = h;
  },

  // ---------------- animierter Titel-Hintergrund ----------------
  startBg() {
    if (this.bgRun) return;
    this.bgRun = true;
    const cv = SC.$('#title-bg');
    const ctx = cv.getContext('2d');
    const types = ['red', 'blue', 'green', 'yellow', 'pink', 'rainbow', 'red', 'blue'];
    const parts = [];
    for (let i = 0; i < 18; i++) parts.push({ x: Math.random(), y: Math.random(), s: 1.6 + Math.random() * 1.8, v: 0.03 + Math.random() * 0.04, t: types[i % types.length], id: i });
    let last = performance.now();
    const loop = (now) => {
      if (!this.bgRun) return;
      requestAnimationFrame(loop);
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = cv.clientWidth, h = cv.clientHeight;
      if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) {
        cv.width = Math.round(w * dpr);
        cv.height = Math.round(h * dpr);
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      // Strahlenkranz
      const cx = w / 2, cy = h * 0.42;
      const g = ctx.createRadialGradient(cx, cy, 10, cx, cy, Math.max(w, h) * 0.75);
      g.addColorStop(0, '#9fe0ff');
      g.addColorStop(0.25, '#3c8ff0');
      g.addColorStop(0.6, '#2a4fc8');
      g.addColorStop(1, '#2a1f7a');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(now / 9000);
      ctx.fillStyle = 'rgba(255,255,255,' + (0.07 + 0.06 * Math.pow(1 - (SC.music.beat() % 1), 2)) + ')';
      for (let i = 0; i < 16; i++) {
        ctx.rotate((Math.PI * 2) / 16);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.max(w, h), -60);
        ctx.lineTo(Math.max(w, h), 60);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
      // Blasen
      for (const p of parts) {
        p.y -= p.v * dt;
        if (p.y < -0.12) {
          p.y = 1.12;
          p.x = Math.random();
        }
        const d = SC.BLOONS[p.t];
        ctx.save();
        ctx.translate(p.x * w + Math.sin(now / 900 + p.id) * 14, p.y * h);
        ctx.scale(p.s, p.s);
        SC.drawBloon(ctx, { def: d, type: p.t, x: 0, y: 0, hp: d.hp, id: p.id }, now / 1000);
        ctx.restore();
      }
      // Krebse tanzen im Takt der Musik
      const beat = SC.music.beat();
      const bp = beat % 1, bounce = Math.pow(1 - bp, 3);
      const sway = Math.sin(beat * Math.PI) * 7;
      const hl = SC.$('#hero-l'), hr = SC.$('#hero-r');
      hl.style.transform = 'translateY(' + (-16 * bounce) + 'px) rotate(' + sway + 'deg) scale(' + (1 + bounce * 0.04) + ',' + (1 - bounce * 0.04) + ')';
      hr.style.transform = 'translateY(' + (-16 * bounce) + 'px) rotate(' + -sway + 'deg) scale(' + (1 + bounce * 0.04) + ',' + (1 - bounce * 0.04) + ')';
      // Hügel unten
      ctx.beginPath();
      ctx.moveTo(0, h);
      ctx.lineTo(0, h * 0.86);
      ctx.quadraticCurveTo(w * 0.25, h * 0.76, w * 0.5, h * 0.84);
      ctx.quadraticCurveTo(w * 0.78, h * 0.92, w, h * 0.8);
      ctx.lineTo(w, h);
      ctx.closePath();
      const hg = ctx.createLinearGradient(0, h * 0.78, 0, h);
      hg.addColorStop(0, '#7ad83c');
      hg.addColorStop(1, '#3a9a1a');
      ctx.fillStyle = hg;
      ctx.fill();
      ctx.lineWidth = 4;
      ctx.strokeStyle = '#1b3a0a';
      ctx.stroke();
    };
    requestAnimationFrame(loop);
  },
  stopBg() {
    this.bgRun = false;
  },
};

window.addEventListener('load', () => {
  SC.UI.init();
  SC.Menu.init();
  document.addEventListener('gesturestart', (e) => e.preventDefault());
  document.addEventListener('contextmenu', (e) => e.preventDefault());
  if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('sw.js').catch(() => {});
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => SC.Menu.drawTitleArt());
});
