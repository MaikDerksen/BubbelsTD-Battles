'use strict';
// ============================================================
//  Promo-Video „Scherenschlacht V1“ – 1080×1920 (TikTok/Reels)
//  Spielt echte Spielszenen mit Kamera, Schnitten, Untertiteln,
//  Sprecher (Windows-TTS) und eigenem Rave-Track; nimmt als MP4 auf.
// ============================================================
(async function () {
  const cv = document.getElementById('cv');
  const ctx = cv.getContext('2d');
  const W = 1080, H = 1920;
  const OL = '#1b1208';
  const status = (t) => (document.getElementById('status').innerHTML = t);
  const ease = {
    out: (t) => 1 - Math.pow(1 - t, 3),
    back: (t) => {
      const c = 1.9;
      return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2);
    },
  };
  const cl = (v) => Math.max(0, Math.min(1, v));

  await document.fonts.load('80px "Luckiest Guy"');
  const script = await (await fetch('vo-script.json')).json();
  SC.spr.setScale(3);

  // ---------------- Spielwelt vorbereiten ----------------
  function makeField(mapId, plan) {
    const g = new SC.Game({ mode: 'classic', map: mapId, diff: 'normal' });
    g.onNotify = () => {};
    const f = g.me;
    f.money = 1e9;
    f.lives = 1e9;
    f.local = false;
    const spots = new SC.AI(f, null, g, 'hard').spots;
    const out = {};
    let i = 0;
    for (const [kind, tiers, name] of plan) {
      let t = null;
      if (kind === 'farm') {
        for (let k = 0; k < 400 && !t; k++) {
          const x = 60 + ((k * 137) % 880), y = 60 + ((k * 89) % 480);
          if (f.path.distTo(x, y) > 90) t = f.placeTower('farm', x, y);
        }
      } else {
        for (; i < spots.length && !t; i += 2) t = f.placeTower(kind, spots[i].x, spots[i].y);
      }
      if (!t) continue;
      for (let p = 0; p < 2; p++) for (let n = 0; n < tiers[p]; n++) f.upgrade(t, p);
      t.born = -10;
      if (name) out[name] = t;
    }
    f.fx = [];
    return { g, f, bg: SC.renderMapBG(SC.MAPS.find((m) => m.id === mapId), 3), t: out };
  }
  const main = makeField('bucht', [
    ['kokos', [0, 0], 'kokos'],
    ['knall', [2, 0]],
    ['fang', [0, 2]],
    ['einsiedler', [3, 0]],
    ['spinne', [2, 1]],
    ['krill', [2, 0]],
    ['yeti', [1, 0]],
    ['pocke', [1, 2]],
    ['winker', [1, 0]],
    ['knall', [0, 3]],
    ['farm', [2, 1], 'farm'],
  ]);
  const boss = makeField('riff', [
    ['knall', [2, 0]],
    ['fang', [2, 0]],
    ['einsiedler', [1, 0]],
    ['spinne', [1, 0]],
  ]);
  const MIX = ['red', 'blue', 'green', 'yellow', 'pink', 'red', 'blue', 'green', 'rainbow', 'ink', 'ice', 'stripe'];
  function feed(F, n) {
    const f = F.f;
    if (f.bloons.length + f.spawns.length < n) {
      for (let k = 0; k < 12; k++) {
        const ty = MIX[Math.floor(Math.random() * MIX.length)];
        f.spawns.push({ at: f.time + k * 0.11, type: ty, camo: false, regrow: Math.random() < 0.1 });
      }
    }
  }
  // Vorlauf, damit die Strecke voll ist
  for (let i = 0; i < 60 * 14; i++) {
    feed(main, 90);
    main.f.update(1 / 60);
    feed(boss, 50);
    boss.f.update(1 / 60);
  }

  // ---------------- Zeichen-Helfer ----------------
  function rays(t, c0, c1, c2) {
    const g = ctx.createRadialGradient(W / 2, H * 0.42, 20, W / 2, H * 0.42, H * 0.8);
    g.addColorStop(0, c0);
    g.addColorStop(0.35, c1);
    g.addColorStop(1, c2);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    ctx.save();
    ctx.translate(W / 2, H * 0.42);
    ctx.rotate(t * 0.25);
    ctx.fillStyle = 'rgba(255,255,255,0.09)';
    for (let i = 0; i < 18; i++) {
      ctx.rotate((Math.PI * 2) / 18);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(2400, -150);
      ctx.lineTo(2400, 150);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }
  let brickPat = null;
  function bricks() {
    if (!brickPat) {
      const c = document.createElement('canvas');
      c.width = 144;
      c.height = 72;
      const x = c.getContext('2d');
      x.fillStyle = '#c4a66c';
      x.fillRect(0, 0, 144, 72);
      const br = (bx, by) => {
        const g = x.createLinearGradient(0, by, 0, by + 30);
        g.addColorStop(0, '#f5e6bd');
        g.addColorStop(1, '#e3c991');
        x.fillStyle = g;
        x.beginPath();
        x.roundRect(bx, by, 66, 30, 5);
        x.fill();
      };
      br(3, 3);
      br(75, 3);
      br(-33, 39);
      br(39, 39);
      br(111, 39);
      brickPat = ctx.createPattern(c, 'repeat');
    }
    ctx.fillStyle = brickPat;
    ctx.fillRect(0, 0, W, H);
  }
  function txt(s, x, y, size, fill, opt) {
    opt = opt || {};
    ctx.save();
    ctx.font = size + 'px "Luckiest Guy"';
    ctx.textAlign = opt.align || 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillText(s, x + size * 0.04, y + size * 0.1);
    ctx.lineWidth = size * 0.22;
    ctx.strokeStyle = OL;
    ctx.strokeText(s, x, y);
    if (opt.white) {
      ctx.lineWidth = size * 0.1;
      ctx.strokeStyle = '#fff';
      ctx.strokeText(s, x, y);
    }
    if (Array.isArray(fill)) {
      const g = ctx.createLinearGradient(0, y - size / 2, 0, y + size / 2);
      fill.forEach((c, i) => g.addColorStop(i / (fill.length - 1), c));
      ctx.fillStyle = g;
    } else ctx.fillStyle = fill;
    ctx.fillText(s, x, y);
    ctx.restore();
  }
  // Untertitel im TikTok-Stil: *Wort* = gelb hervorgehoben, Pop-Animation
  function caption(str, y, st) {
    if (!str) return;
    const sc = ease.back(cl(st / 0.28));
    let size = 92;
    ctx.font = size + 'px "Luckiest Guy"';
    let lines = [str];
    if (ctx.measureText(str.replace(/\*/g, '')).width > 960) {
      const words = str.split(' ');
      const mid = Math.ceil(words.length / 2);
      lines = [words.slice(0, mid).join(' '), words.slice(mid).join(' ')];
    }
    for (const l of lines) while (ctx.measureText(l.replace(/\*/g, '')).width > 980 && size > 50) ctx.font = (size -= 4) + 'px "Luckiest Guy"';
    ctx.save();
    ctx.translate(W / 2, y);
    ctx.scale(sc, sc);
    ctx.rotate(-0.02);
    lines.forEach((l, li) => {
      const parts = l.split('*');
      const total = ctx.measureText(l.replace(/\*/g, '')).width;
      let x = -total / 2;
      const ly = (li - (lines.length - 1) / 2) * size * 1.08;
      parts.forEach((p, i) => {
        if (!p) return;
        const w = ctx.measureText(p).width;
        txt(p, x + w / 2, ly, size, i % 2 ? ['#fff7a0', '#ffc21f'] : '#ffffff');
        ctx.font = size + 'px "Luckiest Guy"';
        x += w;
      });
    });
    ctx.restore();
  }
  function logo(cx, cy, s) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(s, s);
    ctx.rotate(-0.05);
    const line = (t, y, size, cols) => {
      ctx.font = size + 'px "Luckiest Guy"';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.lineJoin = 'round';
      ctx.fillStyle = OL;
      ctx.fillText(t, 6, y + 12);
      ctx.lineWidth = size * 0.36;
      ctx.strokeStyle = OL;
      ctx.strokeText(t, 0, y);
      ctx.lineWidth = size * 0.2;
      ctx.strokeStyle = '#ffffff';
      ctx.strokeText(t, 0, y);
      const g = ctx.createLinearGradient(0, y - size / 2, 0, y + size / 2);
      cols.forEach((c, i) => g.addColorStop(i / (cols.length - 1), c));
      ctx.fillStyle = g;
      ctx.fillText(t, 0, y);
    };
    line('SCHEREN', -80, 170, ['#d8f2ff', '#3ea6ff', '#1259c9']);
    line('SCHLACHT', 95, 190, ['#fff07a', '#ffa21f', '#e8380f']);
    ctx.restore();
  }
  function hero(x, y, s, helmet, flip, beatPh) {
    const b = Math.pow(1 - (beatPh % 1), 3);
    ctx.save();
    ctx.translate(x, y - b * 30);
    ctx.rotate(Math.sin(beatPh * Math.PI) * 0.1 * (flip ? -1 : 1));
    ctx.scale(s * (flip ? -1 : 1) * (1 + b * 0.04), s * (1 - b * 0.04));
    ctx.shadowColor = 'rgba(0,0,0,0.35)';
    ctx.shadowOffsetY = 18;
    ctx.shadowBlur = 20;
    SC.drawHero(ctx, helmet, 1);
    ctx.restore();
  }
  function drawField(F, cam, rect, time, shake) {
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(rect.x, rect.y, rect.w, rect.h, 26);
    ctx.clip();
    ctx.fillStyle = '#4fa82a';
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    const sh = (shake || 0) * 30;
    ctx.translate(rect.x + rect.w / 2 + (Math.random() - 0.5) * sh, rect.y + rect.h / 2 + (Math.random() - 0.5) * sh);
    ctx.scale(cam.s, cam.s);
    // Kamera in der Karte halten
    const hw = rect.w / 2 / cam.s, hh = rect.h / 2 / cam.s;
    const cx = Math.max(Math.min(cam.x, SC.W - hw), hw > SC.W / 2 ? SC.W / 2 : hw);
    const cy = Math.max(Math.min(cam.y, SC.H - hh), hh > SC.H / 2 ? SC.H / 2 : hh);
    ctx.translate(-cx, -cy);
    SC.renderField(ctx, F.f, time, F.bg, {});
    ctx.restore();
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(rect.x, rect.y, rect.w, rect.h, 26);
    ctx.lineWidth = 16;
    ctx.strokeStyle = OL;
    ctx.stroke();
    ctx.lineWidth = 8;
    ctx.strokeStyle = '#ffd23f';
    ctx.stroke();
    ctx.restore();
  }
  const bubbles = [];
  for (let i = 0; i < 16; i++) bubbles.push({ x: Math.random() * W, y: Math.random() * H, s: 3 + Math.random() * 4, v: 90 + Math.random() * 140, t: MIX[i % 9] });
  function floatBubbles(dt, time) {
    for (const b of bubbles) {
      b.y -= b.v * dt;
      if (b.y < -120) {
        b.y = H + 120;
        b.x = Math.random() * W;
      }
      ctx.save();
      ctx.translate(b.x + Math.sin(time * 2 + b.s) * 20, b.y);
      ctx.scale(b.s, b.s);
      const d = SC.BLOONS[b.t];
      SC.drawBloon(ctx, { def: d, type: b.t, x: 0, y: 0, hp: d.hp, id: b.s }, time);
      ctx.restore();
    }
  }
  const coins = [];
  function coinRain(dt, on) {
    if (on && coins.length < 90) coins.push({ x: Math.random() * W, y: -60, v: 500 + Math.random() * 500, r: Math.random() * 6, s: 26 + Math.random() * 20 });
    for (const c of coins) {
      c.y += c.v * dt;
      c.r += dt * 6;
      ctx.save();
      ctx.translate(c.x, c.y);
      ctx.scale(Math.abs(Math.cos(c.r)), 1);
      SC.art.C(ctx, 0, 0, c.s, '#ffd23f', 5);
      ctx.beginPath();
      ctx.arc(0, 0, c.s * 0.62, 0, Math.PI * 2);
      ctx.strokeStyle = '#c07a06';
      ctx.lineWidth = 4;
      ctx.stroke();
      ctx.restore();
    }
    for (let i = coins.length - 1; i >= 0; i--) if (coins[i].y > H + 80) coins.splice(i, 1);
  }
  function burst(col1, col2, time) {
    rays(time, '#ffffff', col1, col2);
  }
  function cutBand(st, t, name) {
    if (st < 0 || st > 1.1) return;
    const u = st / 1.1;
    const x = u < 0.2 ? -W * (1 - ease.out(u / 0.2)) : u > 0.82 ? W * ((u - 0.82) / 0.18) : 0;
    ctx.save();
    ctx.translate(x, 860);
    ctx.transform(1, -0.07, 0, 1, 0, 0);
    const g = ctx.createLinearGradient(0, 0, W, 0);
    g.addColorStop(0, 'rgba(20,60,160,0.97)');
    g.addColorStop(1, 'rgba(40,140,255,0.9)');
    ctx.fillStyle = g;
    ctx.fillRect(-40, -120, W + 80, 240);
    ctx.fillStyle = 'rgba(255,255,255,0.16)';
    for (let i = -2; i < 20; i++) ctx.fillRect(i * 70 + ((st * 900) % 70), -120, 10, 240);
    ctx.fillStyle = OL;
    ctx.fillRect(-40, -128, W + 80, 10);
    ctx.fillRect(-40, 118, W + 80, 10);
    ctx.save();
    ctx.translate(200, 0);
    ctx.scale(5.2, 5.2);
    ctx.rotate(-Math.PI / 2 + 0.35);
    SC.TOWER_ART[t.kind](ctx, t.tiers[0], t.tiers[1], false, 0);
    ctx.restore();
    txt('SPEZIALFÄHIGKEIT', 640, -50, 44, '#bfe8ff');
    txt(name, 640, 30, 92, ['#fff7a0', '#ffc21f']);
    ctx.restore();
  }

  // ---------------- Szenen ----------------
  const TOWERS4 = [
    ['knall', [4, 0], 'KNALLKREBS', '#ff9a3d', '#c4330d'],
    ['fang', [2, 4], 'FANGSCHRECKE', '#4fd34a', '#14705a'],
    ['kokos', [1, 4], 'KOKOSKRABBE', '#9a7bff', '#3a1f9a'],
    ['yeti', [4, 0], 'YETI-KRABBE', '#8fe3ff', '#1f6fb0'],
  ];
  const BAND = { x: 30, y: 520, w: W - 60, h: 960 };
  let pops0 = 0;
  const scenes = {
    s01(st, dt, time, beat) {
      rays(time, '#9fe0ff', '#3c8ff0', '#2a1f7a');
      floatBubbles(dt, time);
      hero(300, 1430, 2.25, '#2f7fe8', false, beat);
      hero(780, 1430, 2.25, '#e8302a', true, beat + 0.5);
      caption(this.cap, 470, st);
    },
    s02(st, dt, time) {
      rays(time, '#fff3a8', '#ff9a2e', '#7a1f0a');
      const s = ease.back(cl(st / 0.4));
      for (let i = 0; i < 3; i++) {
        const u = cl((st - 0.25 - i * 0.08) / 0.6);
        if (u > 0 && u < 1) {
          ctx.beginPath();
          ctx.arc(W / 2, 780, 200 + u * 900, 0, Math.PI * 2);
          ctx.lineWidth = 40 * (1 - u);
          ctx.strokeStyle = 'rgba(255,255,255,' + (1 - u) + ')';
          ctx.stroke();
        }
      }
      logo(W / 2, 780, 0.92 + (1 - s) * 1.6);
      ctx.save();
      ctx.translate(W / 2, 1230);
      ctx.scale(2.3, 2.3);
      SC.drawTrophy(ctx);
      ctx.restore();
      caption(this.cap, 1620, st - 0.25);
    },
    s03(st, dt, time) {
      bricks();
      if (st === 0) pops0 = main.f.stats.pops;
      drawField(main, { x: 330 + st * 70, y: 300, s: 1.45 + st * 0.05 }, BAND, time);
      caption(this.cap, 300, st);
      txt('POPPS: ' + (main.f.stats.pops - pops0), W / 2, 1620, 80, ['#ffffff', '#bfe8ff']);
    },
    s04(st, dt, time) {
      const n = TOWERS4.length, seg = this.dur / n;
      const k = Math.min(n - 1, Math.floor(st / seg)), sub = st - k * seg;
      const [kind, tiers, name, c1, c2] = TOWERS4[k];
      burst(c1, c2, time);
      const s = ease.back(cl(sub / 0.3));
      ctx.save();
      ctx.translate(W / 2, 880);
      ctx.scale(10 * s, 10 * s);
      ctx.rotate(-Math.PI / 2 + 0.3 + Math.sin(time * 3) * 0.05);
      ctx.shadowColor = 'rgba(0,0,0,0.4)';
      ctx.shadowOffsetY = 2;
      ctx.shadowBlur = 3;
      SC.TOWER_ART[kind](ctx, tiers[0], tiers[1], false, 0);
      ctx.restore();
      caption(name, 1480, sub);
      txt('STUFE ' + Math.max(tiers[0], tiers[1]), W / 2, 1610, 60, ['#fff7a0', '#ffc21f']);
      this.flashK = this.flashK === undefined ? -1 : this.flashK;
      if (sub < 0.1 && k > 0) {
        ctx.fillStyle = 'rgba(255,255,255,' + (1 - sub / 0.1) + ')';
        ctx.fillRect(0, 0, W, H);
      }
    },
    s05(st, dt, time) {
      bricks();
      const t = main.t.kokos;
      const marks = [0.25, 0.65, 1.05, 1.45];
      marks.forEach((m, i) => {
        if (st >= m && t.tiers[0] === i) {
          main.f.upgrade(t, 0);
          SC.audio[i === 3 ? 'tier4' : 'upgrade']();
        }
      });
      drawField(main, { x: t.x, y: t.y, s: 3.1 - st * 0.15 }, BAND, time, main.f.shake);
      caption(this.cap, 300, st);
      // Upgrade-Leiste
      ctx.save();
      ctx.translate(W / 2, 1640);
      ctx.beginPath();
      ctx.roundRect(-330, -70, 660, 140, 28);
      ctx.fillStyle = 'rgba(20,60,160,0.92)';
      ctx.fill();
      ctx.lineWidth = 8;
      ctx.strokeStyle = OL;
      ctx.stroke();
      for (let i = 0; i < 4; i++) {
        ctx.beginPath();
        ctx.roundRect(-290 + i * 150, -40, 120, 80, 18);
        ctx.fillStyle = i < t.tiers[0] ? (i === 3 ? '#ffc21f' : '#55c425') : '#2a3a5a';
        ctx.fill();
        ctx.lineWidth = 6;
        ctx.strokeStyle = OL;
        ctx.stroke();
      }
      ctx.restore();
      if (t.tiers[0] > 0) txt(SC.TOWERS.kokos.paths[0][t.tiers[0] - 1].name.toUpperCase(), W / 2, 1490, 64, ['#fff7a0', '#ffc21f']);
    },
    s06(st, dt, time) {
      bricks();
      const t = main.t.kokos;
      if (!this.did) {
        this.did = true;
        for (let i = 0; i < 2; i++) main.f.spawnBloon('puffer', main.f.path.len * (0.35 + i * 0.05));
      }
      if (st > 0.35 && !this.used) {
        this.used = true;
        if (t.ab) t.ab.cd = 0;
        main.f.useAbility(t);
      }
      drawField(main, { x: t.x, y: t.y, s: 1.55 }, BAND, time, main.f.shake);
      cutBand(st - 0.02, t, 'KOKOS-METEOR!');
      caption(this.cap, 300, st);
    },
    s07(st, dt, time) {
      const u = ease.out(cl(st / 0.35));
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(W * 0.62, 0);
      ctx.lineTo(W * 0.38, H);
      ctx.lineTo(0, H);
      ctx.closePath();
      ctx.clip();
      ctx.translate(-W * (1 - u), 0);
      rays(time, '#bfe8ff', '#3c8ff0', '#13307a');
      hero(W * 0.3, 720, 1.9, '#2f7fe8', false, 0.3);
      txt('DU', W * 0.22, 1060, 90, '#ffffff', { white: false });
      ctx.restore();
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(W * 0.62, 0);
      ctx.lineTo(W, 0);
      ctx.lineTo(W, H);
      ctx.lineTo(W * 0.38, H);
      ctx.closePath();
      ctx.clip();
      ctx.translate(W * (1 - u), 0);
      rays(time, '#ffd0c0', '#e8402a', '#6a0d05');
      hero(W * 0.72, 1320, 1.9, '#e8302a', true, 0.3);
      txt('KRAKEN-KI', W * 0.7, 1640, 80, '#ffffff');
      ctx.restore();
      const v = ease.back(cl((st - 0.3) / 0.35));
      if (v > 0) {
        ctx.save();
        ctx.translate(W / 2, 1060);
        ctx.rotate(-0.12);
        ctx.scale(v, v);
        txt('VS', 0, 0, 330, '#ffffff');
        ctx.restore();
      }
      caption(this.cap, 260, st - 0.4);
    },
    s08(st, dt, time) {
      bricks();
      if (!this.did) {
        this.did = true;
        this.k = boss.f.spawnBloon('kraken', boss.f.path.visStart + 380);
        boss.f.spawnBloon('whale', boss.f.path.visStart + 200);
      }
      const k = this.k;
      drawField(boss, { x: k.x, y: k.y, s: 2.0 - st * 0.12 }, BAND, time, 0.08);
      ctx.fillStyle = 'rgba(255,30,20,' + (0.12 + 0.12 * Math.sin(time * 10)) + ')';
      ctx.fillRect(0, 0, W, H);
      ctx.save();
      ctx.translate(0, 1560);
      for (let i = -1; i < 14; i++) {
        ctx.beginPath();
        ctx.moveTo(i * 90 + ((time * 160) % 90), 0);
        ctx.lineTo(i * 90 + 45 + ((time * 160) % 90), 0);
        ctx.lineTo(i * 90 + ((time * 160) % 90), 80);
        ctx.lineTo(i * 90 - 45 + ((time * 160) % 90), 80);
        ctx.closePath();
        ctx.fillStyle = '#ffd23f';
        ctx.fill();
      }
      ctx.restore();
      txt('BOSS!', W / 2, 1600, 110, ['#ffffff', '#ffb0a0']);
      caption(this.cap, 300, st);
    },
    s09(st, dt, time) {
      bricks();
      const fm = main.t.farm;
      this.cT = (this.cT || 0) - dt;
      if (this.cT <= 0) {
        this.cT = 0.28;
        main.f.spawnCrate(fm, 250, Math.random() < 0.5 ? 'coin' : 'crate');
        SC.audio.coin();
      }
      drawField(main, { x: fm.x, y: fm.y, s: 2.7 }, BAND, time);
      coinRain(dt, st > 0.4);
      caption(this.cap, 300, st);
      txt('+$' + Math.floor(st * 3700), W / 2, 1640, 120, ['#fff7a0', '#ffc21f']);
    },
    s10(st, dt, time, beat) {
      rays(time, '#9fe0ff', '#3c8ff0', '#2a1f7a');
      floatBubbles(dt, time);
      logo(W / 2, 400, 0.88 + Math.sin(time * 4) * 0.02);
      ctx.save();
      ctx.translate(W / 2, 760);
      ctx.scale(1.6, 1.6);
      SC.drawTrophy(ctx);
      ctx.restore();
      // CTA-Button
      const p = 1 + Math.sin(time * 8) * 0.04;
      ctx.save();
      ctx.translate(W / 2, 1060);
      ctx.scale(p, p);
      ctx.beginPath();
      ctx.roundRect(-420, -80, 840, 160, 40);
      const g = ctx.createLinearGradient(0, -80, 0, 80);
      g.addColorStop(0, '#b7f26a');
      g.addColorStop(0.55, '#55c425');
      g.addColorStop(1, '#2f8c12');
      ctx.fillStyle = g;
      ctx.fill();
      ctx.lineWidth = 12;
      ctx.strokeStyle = OL;
      ctx.stroke();
      txt('JETZT KOSTENLOS SPIELEN', 0, 4, 64, '#ffffff');
      ctx.restore();
      hero(270, 1520, 1.6, '#2f7fe8', false, beat);
      hero(810, 1520, 1.6, '#e8302a', true, beat + 0.5);
      caption(this.cap, 1290, st - 0.2);
    },
  };

  // ---------------- Timeline aus Sprecher-Längen ----------------
  let timeline = null;
  async function prepare() {
    SC.audio.init();
    const ac = SC.audio.ctx();
    let t = 0;
    timeline = [];
    for (const l of script) {
      const buf = await SC.audio.decode(await (await fetch('vo/' + l.id + '.wav')).arrayBuffer());
      const dur = Math.max(1.6, buf.duration + (l.id === 's04' ? 0.3 : 0.35));
      const sc = Object.create(scenes[l.id]);
      Object.assign(sc, { id: l.id, start: t, dur, buf, cap: l.caption, render: scenes[l.id] });
      timeline.push(sc);
      t += dur;
    }
    timeline.total = t + 0.6;
    return ac;
  }

  // ---------------- Abspielen / Aufnehmen ----------------
  async function run(record) {
    document.getElementById('btn-preview').disabled = document.getElementById('btn-rec').disabled = true;
    const ac = await prepare();
    SC.music.play('menu', { restart: true, startBar: 8 });
    let rec = null, chunks = [];
    if (record) {
      const vs = cv.captureStream(30);
      const as = SC.audio.recordStream();
      const stream = new MediaStream([...vs.getVideoTracks(), ...as.getAudioTracks()]);
      const types = ['video/mp4;codecs=avc1.640028,mp4a.40.2', 'video/mp4;codecs=avc1.4D0028,mp4a.40.2', 'video/mp4', 'video/webm;codecs=vp9,opus'];
      const mime = types.find((x) => MediaRecorder.isTypeSupported(x));
      rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 12e6, audioBitsPerSecond: 192000 });
      rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
      rec.start(250);
      status('Aufnahme läuft … (' + mime + ')');
    } else status('Vorschau läuft …');
    const T0 = ac.currentTime + 0.3;
    for (const sc of timeline) SC.audio.voice(sc.buf, T0 + sc.start + 0.08, 1.9);
    let lastT = 0, frames = 0;
    await new Promise((resolve) => {
      const frame = () => {
        const now = ac.currentTime - T0;
        const dt = Math.min(0.05, Math.max(0, now - lastT));
        lastT = now;
        frames++;
        const sc = timeline.find((s) => now >= s.start && now < s.start + s.dur) || (now < 0 ? timeline[0] : timeline[timeline.length - 1]);
        const st = Math.max(0, now - sc.start);
        // Welt weiterlaufen lassen
        feed(main, 90);
        main.f.update(dt);
        if (sc.id >= 's07') {
          feed(boss, 50);
          boss.f.update(dt);
        }
        ctx.save();
        // Zoom-Punch bei jedem Schnitt
        const punch = 1 + 0.06 * Math.max(0, 1 - st / 0.2);
        ctx.translate(W / 2, H / 2);
        ctx.scale(punch, punch);
        ctx.translate(-W / 2, -H / 2);
        sc.render.call(sc, st, dt, now, SC.music.beat());
        ctx.restore();
        if (st < 0.1 && sc !== timeline[0]) {
          ctx.fillStyle = 'rgba(255,255,255,' + (1 - st / 0.1) * 0.85 + ')';
          ctx.fillRect(0, 0, W, H);
        }
        // Wasserzeichen
        ctx.globalAlpha = 0.85;
        txt('SCHERENSCHLACHT', W / 2, H - 70, 40, '#ffffff');
        ctx.globalAlpha = 1;
        if (now < timeline.total) requestAnimationFrame(frame);
        else resolve();
      };
      requestAnimationFrame(frame);
    });
    SC.music.stop(0.4);
    if (rec) {
      await new Promise((r) => setTimeout(r, 500));
      await new Promise((r) => {
        rec.onstop = r;
        rec.stop();
      });
      const blob = new Blob(chunks, { type: rec.mimeType });
      const ext = rec.mimeType.includes('mp4') ? 'mp4' : 'webm';
      const url = URL.createObjectURL(blob);
      status('Fertig: ' + (blob.size / 1e6).toFixed(1) + ' MB, ' + frames + ' Frames. <a download="scherenschlacht_tiktok.' + ext + '" href="' + url + '">Herunterladen</a>');
      window._video = { blob, ext, frames, total: timeline.total };
      try {
        const r = await fetch('http://127.0.0.1:8767/video.' + ext, { method: 'POST', body: blob });
        status(document.getElementById('status').innerHTML + '<br>Gespeichert: ' + (await r.text()));
      } catch (e) {}
    } else status('Vorschau fertig (' + frames + ' Frames).');
    document.getElementById('btn-preview').disabled = document.getElementById('btn-rec').disabled = false;
  }
  document.getElementById('btn-preview').onclick = () => run(false);
  document.getElementById('btn-rec').onclick = () => run(true);
  window.PROMO = { run };
  // Standbild
  scenes.s02.call({ cap: '' }, 1, 0, 0);
})();
