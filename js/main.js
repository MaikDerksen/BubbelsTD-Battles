'use strict';
// ============================================================
//  Titelbild, Setup, Online-Lobby, Lexikon, Start
// ============================================================
SC.Menu = {
  setup: { mode: 'ai', map: 'bucht', diff: 'normal' },
  onlineMap: 'bucht',

  init() {
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
      this.stopBg();
      SC.UI.start(Object.assign({}, this.setup));
    });
    SC.$('#btn-host').addEventListener('click', () => this.host());
    SC.$('#btn-join').addEventListener('click', () => this.join());
    SC.paintIcons(document);

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
    } else if (where === 'lexikon') {
      this.renderLexikon();
      SC.showScreen('lexikon');
    }
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

  // ---------------- Online ----------------
  status(html) {
    SC.$('#online-status').innerHTML = html;
  },
  async host() {
    SC.audio.init();
    if (this.net) this.net.close();
    const net = (this.net = new SC.Net());
    this.status('Verbinde mit dem Server …');
    try {
      await net.host(
        (code) => this.status('Dein Raumcode: <span class="code">' + code + '</span><br>Warte auf Gegner …'),
        () => {
          const map = this.onlineMap;
          net.send({ t: 'start', map });
          this.launchOnline(map);
        },
        (e) => this.status('Fehler: ' + (e.type || e.message || e))
      );
    } catch (e) {
      this.status(e.message);
    }
  },
  async join() {
    SC.audio.init();
    const code = SC.$('#join-code').value.trim().toUpperCase();
    if (code.length !== 4) return this.status('Bitte den 4-stelligen Code eingeben.');
    if (this.net) this.net.close();
    const net = (this.net = new SC.Net());
    this.status('Suche Raum ' + code + ' …');
    net.onmsg = (m) => {
      if (m && m.t === 'start') this.launchOnline(m.map);
    };
    try {
      await net.join(
        code,
        () => this.status('Verbunden! Warte auf Start …'),
        (e) => this.status(e.type === 'peer-unavailable' ? 'Raum nicht gefunden.' : 'Fehler: ' + (e.type || e))
      );
    } catch (e) {
      this.status(e.message);
    }
  },
  launchOnline(map) {
    const net = this.net;
    this.net = null;
    this.stopBg();
    SC.UI.start({ mode: 'online', map, net });
  },

  // ---------------- Lexikon ----------------
  renderLexikon() {
    let h = '';
    for (const k of SC.TOWER_ORDER) {
      const d = SC.TOWERS[k];
      h += '<div class="lex-tower"><img src="' + SC.towerIcon(k, 76, [2, 0]) + '" alt=""><div><h4>' + d.name + ' – ' + d.cost + '</h4><p>' + d.desc + '</p><div class="lex-paths">';
      for (let p = 0; p < 2; p++) {
        h += '<div>' + d.paths[p].map((u, i) => '<b>Stufe ' + (i + 1) + ': ' + u.name + '</b> (' + u.cost + ') – ' + u.desc).join('<br>') + '</div>';
      }
      h += '</div></div></div>';
    }
    h += '<h3>Blasen</h3><div class="lex-bloons">';
    const IM = { blast: 'Explosion', cold: 'Kälte', sharp: 'Spitzes', sonic: 'Schall' };
    for (const t of SC.BLOON_ORDER) {
      const b = SC.BLOONS[t];
      const imm = b.immune ? '<br>immun: ' + b.immune.map((x) => IM[x]).join(', ') : '';
      h += '<div><img src="' + SC.bloonIcon(t, 48) + '" alt=""><br><b>' + b.name + '</b><br>RBE ' + b.rbe + imm + '</div>';
    }
    h += '</div><p class="hint">Upgrade-Regel wie in BTD Battles: ein Pfad bis Stufe 4, der andere höchstens bis Stufe 2. Stufe 4 schaltet eine Spezialfähigkeit frei.</p>';
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
