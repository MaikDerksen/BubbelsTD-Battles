'use strict';
// ============================================================
//  KARTEN im BTD5/Battles-Look: sattes Gras oder Sand, beiger
//  Pflasterweg, Palmen/Büsche/Felsen mit kräftigen Schlagschatten
// ============================================================
(function () {
  const { LT, DK, shade, E, C, gloss, stroke3 } = SC.art;

  const THEMES = {
    grass: { ground: '#6cc535', light: '#8fdc4f', dark: '#4fa82a', tuft: '#3f8f22', path: '#ead7a4', pathEdge: '#a8894f', stone: '#f3e4b8' },
    sand: { ground: '#e9cf8f', light: '#f6e2ad', dark: '#d6b673', tuft: '#8fb848', path: '#f1dfae', pathEdge: '#b08d50', stone: '#f8ebc4' },
    coast: { ground: '#78c93c', light: '#97dc58', dark: '#58ad2e', tuft: '#3f8f22', path: '#d9c08a', pathEdge: '#8a6a3a', stone: '#e6d1a0' },
  };

  SC.renderMapBG = function (map, scale) {
    const P = SC.buildPath(map);
    const th = THEMES[map.theme || 'grass'];
    const W = SC.W, H = SC.H;
    const c = document.createElement('canvas');
    c.width = Math.round(W * scale);
    c.height = Math.round(H * scale);
    const ctx = c.getContext('2d');
    ctx.scale(scale, scale);
    const rnd = SC.rng(map.id.length * 7777 + map.id.charCodeAt(0) * 31);
    const free = (x, y, pad) => P.distTo(x, y) > SC.PATH_W / 2 + pad;

    // ---------- Boden ----------
    ctx.fillStyle = th.ground;
    ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < 90; i++) {
      const x = rnd() * W, y = rnd() * H, r = 30 + rnd() * 80;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      const col = rnd() < 0.55 ? th.light : th.dark;
      g.addColorStop(0, col + 'aa');
      g.addColorStop(1, col + '00');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(x, y, r, r * (0.5 + rnd() * 0.5), rnd() * 3, 0, Math.PI * 2);
      ctx.fill();
    }
    // Grasbüschel / Sandkörner
    for (let i = 0; i < 520; i++) {
      const x = rnd() * W, y = rnd() * H;
      if (map.theme === 'sand') {
        ctx.fillStyle = rnd() < 0.5 ? 'rgba(160,120,60,0.25)' : 'rgba(255,255,255,0.35)';
        ctx.fillRect(x, y, 1.6, 1.6);
        continue;
      }
      ctx.beginPath();
      ctx.moveTo(x - 3, y + 2);
      ctx.lineTo(x - 1, y - 3);
      ctx.lineTo(x, y + 1);
      ctx.lineTo(x + 1.5, y - 4);
      ctx.lineTo(x + 3, y + 2);
      ctx.strokeStyle = rnd() < 0.7 ? th.tuft : LT(th.light, 0.2);
      ctx.lineWidth = 1.2;
      ctx.stroke();
    }
    // Blümchen
    for (let i = 0; i < 26; i++) {
      const x = rnd() * W, y = rnd() * H;
      if (!free(x, y, 6)) continue;
      for (let k = 0; k < 5; k++) {
        const a = (k / 5) * Math.PI * 2;
        C(ctx, x + Math.cos(a) * 2.6, y + Math.sin(a) * 2.6, 2, '#ffffff', 0.6, { ol: '#c9c9c9' });
      }
      C(ctx, x, y, 1.6, '#ffd23f', 0);
    }

    // ---------- Wasserflächen (Gezeitentümpel) ----------
    const pools = [];
    for (let i = 0; i < 60 && pools.length < (map.pools || 3); i++) {
      const x = 70 + rnd() * (W - 140), y = 60 + rnd() * (H - 120), r = 28 + rnd() * 26;
      if (!free(x, y, r + 14)) continue;
      if (pools.some((p) => SC.dist(p.x, p.y, x, y) < p.r + r + 40)) continue;
      pools.push({ x, y, r, rot: rnd() * 3 });
    }
    for (const p of pools) drawPool(ctx, p, rnd);
    if (map.id === 'wrack') drawWreck(ctx, 255, 420);

    // ---------- Pflasterweg ----------
    drawPath(ctx, P, th, scale, rnd);

    // Strudel am Ende (Korallenring)
    if (P.endInside) {
      const ex = P.xs[P.n - 1], ey = P.ys[P.n - 1];
      drawPool(ctx, { x: ex, y: ey, r: 38, rot: 0 }, rnd, true);
    }

    // ---------- Deko mit Schatten ----------
    const decos = [];
    // Rand: Palmen & Büsche einrahmen (wie BTD-Bäume am Kartenrand)
    for (let i = 0; i < 260 && decos.length < 46; i++) {
      const edge = rnd() < 0.55;
      let x, y;
      if (edge) {
        const side = Math.floor(rnd() * 4);
        x = side === 0 ? rnd() * 40 : side === 1 ? W - rnd() * 40 : rnd() * W;
        y = side === 2 ? rnd() * 40 : side === 3 ? H - rnd() * 40 : rnd() * H;
      } else {
        x = 20 + rnd() * (W - 40);
        y = 20 + rnd() * (H - 40);
      }
      const k = edge ? (rnd() < 0.5 ? 'palm' : 'bush') : ['rock', 'bush', 'shell', 'star', 'palm', 'rock'][Math.floor(rnd() * 6)];
      const big = k === 'palm' ? 40 : k === 'bush' ? 26 : 14;
      if (!free(x, y, big * 0.7)) continue;
      if (pools.some((p) => SC.dist(p.x, p.y, x, y) < p.r + big)) continue;
      if (decos.some((d) => SC.dist(d.x, d.y, x, y) < (d.big + big) * 0.55)) continue;
      decos.push({ x, y, k, big, s: 0.75 + rnd() * 0.45, r: rnd() * 6.28 });
    }
    decos.sort((a, b) => (a.k === 'palm') - (b.k === 'palm'));
    for (const d of decos) drawDeco(ctx, d, rnd);

    // Vignette
    const v = ctx.createRadialGradient(W / 2, H / 2, H * 0.45, W / 2, H / 2, W * 0.7);
    v.addColorStop(0, 'rgba(0,0,0,0)');
    v.addColorStop(1, 'rgba(0,30,0,0.22)');
    ctx.fillStyle = v;
    ctx.fillRect(0, 0, W, H);
    return c;
  };

  function strokePath(ctx, P, w, col) {
    ctx.beginPath();
    for (let i = 0; i < P.n; i += 2) i ? ctx.lineTo(P.xs[i], P.ys[i]) : ctx.moveTo(P.xs[i], P.ys[i]);
    ctx.lineTo(P.xs[P.n - 1], P.ys[P.n - 1]);
    ctx.strokeStyle = col;
    ctx.lineWidth = w;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
  }

  function drawPath(ctx, P, th, scale, rnd) {
    const PW = SC.PATH_W;
    // weicher Schatten unter dem Weg
    ctx.save();
    ctx.translate(2, 3);
    strokePath(ctx, P, PW + 10, 'rgba(0,0,0,0.18)');
    ctx.restore();
    strokePath(ctx, P, PW + 6, th.pathEdge);
    strokePath(ctx, P, PW, th.path);
    // Pflastersteine auf Offscreen, dann auf Wegform maskieren
    const off = document.createElement('canvas');
    off.width = ctx.canvas.width;
    off.height = ctx.canvas.height;
    const o = off.getContext('2d');
    o.scale(scale, scale);
    for (let i = 0; i < P.n; i += 5) {
      const x = P.xs[i], y = P.ys[i];
      const nx = i + 1 < P.n ? P.xs[i + 1] - x : 1, ny = i + 1 < P.n ? P.ys[i + 1] - y : 0;
      const l = Math.hypot(nx, ny) || 1;
      const px = -ny / l, py = nx / l;
      for (let k = -2; k <= 2; k++) {
        const off2 = k * 9.5 + (rnd() - 0.5) * 3 + ((i / 5) % 2) * 4.5;
        const sx = x + px * off2, sy = y + py * off2;
        const r = 4.2 + rnd() * 1.6;
        o.beginPath();
        o.ellipse(sx, sy, r * 1.15, r, Math.atan2(ny, nx), 0, Math.PI * 2);
        const g = o.createRadialGradient(sx - r * 0.4, sy - r * 0.4, 0, sx, sy, r * 1.3);
        g.addColorStop(0, LT(th.stone, 0.35));
        g.addColorStop(1, DK(th.stone, 0.12));
        o.fillStyle = g;
        o.fill();
        o.strokeStyle = DK(th.path, 0.22);
        o.lineWidth = 1;
        o.stroke();
      }
    }
    o.globalCompositeOperation = 'destination-in';
    strokePath(o, P, PW - 3, '#000');
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(off, 0, 0);
    ctx.restore();
  }

  function shadowed(ctx, dx, dy, fn) {
    ctx.save();
    ctx.translate(dx, dy);
    ctx.globalAlpha = 0.28;
    ctx.filter = 'blur(1.5px)';
    fn(true);
    ctx.restore();
    fn(false);
  }

  function drawPool(ctx, p, rnd, whirl) {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rot);
    const pts = [];
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2;
      const r = p.r * (0.82 + 0.25 * Math.sin(i * 2.3 + p.r));
      pts.push([Math.cos(a) * r * 1.2, Math.sin(a) * r * 0.85]);
    }
    const blob = (sc) => {
      ctx.beginPath();
      for (let i = 0; i < pts.length; i++) {
        const a = pts[i], b = pts[(i + 1) % pts.length];
        const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
        if (i === 0) ctx.moveTo(mx * sc, my * sc);
        ctx.quadraticCurveTo(b[0] * sc, b[1] * sc, ((b[0] + pts[(i + 2) % pts.length][0]) / 2) * sc, ((b[1] + pts[(i + 2) % pts.length][1]) / 2) * sc);
      }
      ctx.closePath();
    };
    blob(1.12);
    ctx.fillStyle = '#e9dcae';
    ctx.fill();
    blob(1.04);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    blob(1);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, p.r * 1.2);
    g.addColorStop(0, '#2e9fd6');
    g.addColorStop(0.7, '#5ccbef');
    g.addColorStop(1, '#a6ecff');
    ctx.fillStyle = g;
    ctx.fill();
    if (whirl) {
      for (let k = 0; k < 4; k++) {
        ctx.beginPath();
        ctx.arc(0, 0, p.r * (0.85 - k * 0.2), k, k + 4);
        ctx.strokeStyle = 'rgba(255,255,255,0.75)';
        ctx.lineWidth = 3;
        ctx.stroke();
      }
    } else {
      for (let k = 0; k < 3; k++) {
        ctx.beginPath();
        ctx.ellipse(-p.r * 0.3 + k * p.r * 0.3, -p.r * 0.2 + k * 6, p.r * 0.25, 2, 0, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.fill();
      }
    }
    ctx.restore();
  }

  function palm(ctx, s, sh) {
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2 + 0.2;
      ctx.save();
      ctx.rotate(a);
      ctx.beginPath();
      ctx.moveTo(0, -3 * s);
      ctx.quadraticCurveTo(16 * s, -11 * s, 34 * s, -2 * s);
      ctx.quadraticCurveTo(17 * s, 9 * s, 0, 3 * s);
      ctx.closePath();
      if (sh) {
        ctx.fillStyle = '#000';
        ctx.fill();
      } else {
        shade(ctx, i % 2 ? '#2f9a3a' : '#3db347', 18 * s, 0, 20 * s, 1.8, { ol: '#123d16' });
        ctx.beginPath();
        ctx.moveTo(2 * s, 0);
        ctx.quadraticCurveTo(17 * s, -3 * s, 32 * s, -1 * s);
        ctx.strokeStyle = 'rgba(200,255,150,0.6)';
        ctx.lineWidth = 1.2;
        ctx.stroke();
        for (let k = 1; k < 6; k++) {
          ctx.beginPath();
          ctx.moveTo(k * 5.5 * s, -k * 0.3 * s);
          ctx.lineTo(k * 5.5 * s + 3 * s, -6 * s + k * 0.5 * s);
          ctx.moveTo(k * 5.5 * s, k * 0.1 * s);
          ctx.lineTo(k * 5.5 * s + 3 * s, 5 * s);
          ctx.strokeStyle = 'rgba(15,60,20,0.5)';
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }
      ctx.restore();
    }
    if (!sh) {
      for (let i = 0; i < 3; i++) C(ctx, Math.cos(i * 2.1) * 3.5 * s, Math.sin(i * 2.1) * 3.5 * s, 3.4 * s, '#7a4a20', 1.2);
    }
  }
  function bush(ctx, s, sh) {
    const blobs = [[0, 0, 13], [-11, 4, 9], [10, 5, 10], [-4, -10, 9], [8, -8, 8]];
    for (const [x, y, r] of blobs) {
      ctx.beginPath();
      ctx.arc(x * s, y * s, r * s, 0, Math.PI * 2);
      if (sh) {
        ctx.fillStyle = '#000';
        ctx.fill();
      } else shade(ctx, '#3a9e2c', x * s, y * s, r * s, 1.8, { ol: '#17461a', hi: 0.4 });
    }
    if (!sh) {
      for (let i = 0; i < 4; i++) C(ctx, (-6 + i * 4) * s, (-2 + (i % 2) * 5) * s, 1.8 * s, i % 2 ? '#ff5d8f' : '#ffd23f', 0.6);
    }
  }
  function rock(ctx, s, sh, r) {
    ctx.save();
    ctx.rotate(r);
    ctx.beginPath();
    ctx.moveTo(-14 * s, 4 * s);
    ctx.quadraticCurveTo(-15 * s, -9 * s, 0, -11 * s);
    ctx.quadraticCurveTo(15 * s, -10 * s, 15 * s, 3 * s);
    ctx.quadraticCurveTo(10 * s, 11 * s, 0, 10 * s);
    ctx.quadraticCurveTo(-12 * s, 10 * s, -14 * s, 4 * s);
    if (sh) {
      ctx.fillStyle = '#000';
      ctx.fill();
    } else {
      shade(ctx, '#a3a3a8', 0, 0, 14 * s, 1.8, { hi: 0.55 });
      gloss(ctx, -4 * s, -5 * s, 6 * s, 2.5 * s, 0.45, -0.3);
    }
    ctx.restore();
  }
  function drawDeco(ctx, d, rnd) {
    ctx.save();
    ctx.translate(d.x, d.y);
    const s = d.s;
    if (d.k === 'palm') {
      shadowed(ctx, 14 * s, 12 * s, (sh) => palm(ctx, s, sh));
    } else if (d.k === 'bush') {
      shadowed(ctx, 7 * s, 7 * s, (sh) => bush(ctx, s, sh));
    } else if (d.k === 'rock') {
      shadowed(ctx, 4 * s, 4 * s, (sh) => rock(ctx, s, sh, d.r));
    } else if (d.k === 'star') {
      ctx.rotate(d.r);
      SC.art.star(ctx, 0, 0, 10 * s, 4 * s, 5, '#ff8a3d', 1.4);
      for (let i = 0; i < 5; i++) C(ctx, Math.cos((i / 5) * 6.28 - 1.57) * 5 * s, Math.sin((i / 5) * 6.28 - 1.57) * 5 * s, 1 * s, '#ffe0b8', 0);
    } else if (d.k === 'shell') {
      ctx.rotate(d.r);
      ctx.beginPath();
      ctx.moveTo(0, 6 * s);
      ctx.arc(0, 0, 9 * s, Math.PI * 1.1, Math.PI * 1.9);
      ctx.closePath();
      shade(ctx, '#ffd9e2', 0, -3 * s, 9 * s, 1.4);
      for (let i = 0; i < 5; i++) {
        const a = Math.PI * 1.15 + i * 0.17;
        ctx.beginPath();
        ctx.moveTo(0, 6 * s);
        ctx.lineTo(Math.cos(a) * 8 * s, Math.sin(a) * 8 * s);
        ctx.strokeStyle = '#d48a9a';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }
    ctx.restore();
  }
  function drawWreck(ctx, x, y) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(-0.35);
    const hull = (sh) => {
      ctx.beginPath();
      ctx.moveTo(-70, -24);
      ctx.lineTo(55, -28);
      ctx.quadraticCurveTo(95, 0, 55, 28);
      ctx.lineTo(-70, 24);
      ctx.closePath();
      if (sh) {
        ctx.fillStyle = '#000';
        ctx.fill();
      } else {
        shade(ctx, '#8a5a30', 0, 0, 70, 3);
        for (let i = -60; i < 55; i += 14) {
          ctx.beginPath();
          ctx.moveTo(i, -24);
          ctx.lineTo(i, 24);
          ctx.strokeStyle = 'rgba(50,25,8,0.35)';
          ctx.lineWidth = 2;
          ctx.stroke();
        }
        E(ctx, -12, 0, 22, 13, 0, '#4a2f18', 2);
        ctx.beginPath();
        ctx.moveTo(-12, 0);
        ctx.lineTo(-12, -62);
        stroke3(ctx, 4, '#8a5d34');
        ctx.beginPath();
        ctx.moveTo(-12, -58);
        ctx.quadraticCurveTo(14, -48, -10, -30);
        ctx.closePath();
        shade(ctx, '#efe6d2', -4, -45, 16, 1.8);
      }
    };
    shadowed(ctx, 10, 10, hull);
    ctx.restore();
  }
})();
