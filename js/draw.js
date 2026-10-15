'use strict';
// ============================================================
//  PFAD (Catmull-Rom, gleichmäßig abgetastet)
// ============================================================
SC.buildPath = function (map) {
  if (map._path) return map._path;
  const P = map.pts;
  const raw = [];
  for (let i = 0; i < P.length - 1; i++) {
    const p0 = P[Math.max(i - 1, 0)], p1 = P[i], p2 = P[i + 1], p3 = P[Math.min(i + 2, P.length - 1)];
    for (let s = 0; s < 24; s++) {
      const t = s / 24, t2 = t * t, t3 = t2 * t;
      const x = 0.5 * (2 * p1[0] + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3);
      const y = 0.5 * (2 * p1[1] + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3);
      raw.push([x, y]);
    }
  }
  raw.push(P[P.length - 1]);
  const step = 2;
  const xs = [raw[0][0]], ys = [raw[0][1]];
  let carry = 0;
  for (let i = 1; i < raw.length; i++) {
    const ax = raw[i - 1][0], ay = raw[i - 1][1];
    const bx = raw[i][0], by = raw[i][1];
    const seg = Math.hypot(bx - ax, by - ay);
    let pos = step - carry;
    while (pos <= seg) {
      const t = pos / seg;
      xs.push(ax + (bx - ax) * t);
      ys.push(ay + (by - ay) * t);
      pos += step;
    }
    carry = seg - (pos - step);
  }
  const n = xs.length;
  const path = {
    xs: Float32Array.from(xs),
    ys: Float32Array.from(ys),
    n,
    step,
    len: (n - 1) * step,
    pos(d, out) {
      const f = SC.clamp(d / step, 0, n - 1.001);
      const i = Math.floor(f), t = f - i;
      out.x = this.xs[i] + (this.xs[i + 1] - this.xs[i]) * t;
      out.y = this.ys[i] + (this.ys[i + 1] - this.ys[i]) * t;
      out.a = Math.atan2(this.ys[i + 1] - this.ys[i], this.xs[i + 1] - this.xs[i]);
      return out;
    },
    distTo(x, y) {
      let best = 1e9;
      for (let i = 0; i < n; i += 4) {
        const d = SC.d2(x, y, this.xs[i], this.ys[i]);
        if (d < best) best = d;
      }
      return Math.sqrt(best);
    },
  };
  let firstIn = 0, lastIn = n - 1;
  while (firstIn < n - 1 && (xs[firstIn] < 0 || xs[firstIn] > SC.W || ys[firstIn] < 0 || ys[firstIn] > SC.H)) firstIn++;
  while (lastIn > 0 && (xs[lastIn] < 0 || xs[lastIn] > SC.W || ys[lastIn] < 0 || ys[lastIn] > SC.H)) lastIn--;
  path.visStart = firstIn * step;
  path.visEnd = lastIn * step;
  path.endInside = lastIn === n - 1;
  map._path = path;
  return path;
};

// ============================================================
//  FARBEN & SCHATTIERUNG (BTD-Look: Verlauf + dunkle Farb-Outline)
// ============================================================
const _rgbCache = {};
function rgb(h) {
  if (_rgbCache[h]) return _rgbCache[h];
  let s = h.replace('#', '');
  if (s.length === 3) s = s.split('').map((c) => c + c).join('');
  const n = parseInt(s, 16);
  return (_rgbCache[h] = [(n >> 16) & 255, (n >> 8) & 255, n & 255]);
}
function mix(a, b, t) {
  const A = rgb(a), B = rgb(b);
  const r = Math.round(A[0] + (B[0] - A[0]) * t), g = Math.round(A[1] + (B[1] - A[1]) * t), bl = Math.round(A[2] + (B[2] - A[2]) * t);
  return '#' + ((1 << 24) | (r << 16) | (g << 8) | bl).toString(16).slice(1);
}
const LT = (c, t) => mix(c, '#ffffff', t);
const DK = (c, t) => mix(c, '#000000', t);
const OL = (c) => mix(c, '#1a0d05', 0.72); // Outline: dunkler Farbton
SC.OUT = '#1b1208';

// Füllt den aktuellen Pfad mit kugeligem Verlauf und zeichnet die Outline
function shade(ctx, base, cx, cy, r, lw, opt) {
  const g = ctx.createRadialGradient(cx - r * 0.38, cy - r * 0.42, r * 0.05, cx, cy, r * 1.25);
  g.addColorStop(0, LT(base, (opt && opt.hi) || 0.5));
  g.addColorStop(0.45, base);
  g.addColorStop(1, DK(base, (opt && opt.lo) || 0.32));
  ctx.fillStyle = g;
  ctx.fill();
  if (lw !== 0) {
    ctx.lineWidth = lw || 2.2;
    ctx.strokeStyle = (opt && opt.ol) || OL(base);
    ctx.lineJoin = 'round';
    ctx.stroke();
  }
}
function E(ctx, x, y, rx, ry, rot, base, lw, opt) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, rot || 0, 0, Math.PI * 2);
  if (base) shade(ctx, base, x, y, Math.max(rx, ry), lw, opt);
}
function C(ctx, x, y, r, base, lw, opt) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  if (base) shade(ctx, base, x, y, r, lw, opt);
}
function gloss(ctx, x, y, rx, ry, a, rot) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, rot == null ? -0.5 : rot, 0, Math.PI * 2);
  const g = ctx.createLinearGradient(x, y - ry, x, y + ry);
  g.addColorStop(0, 'rgba(255,255,255,' + (a || 0.75) + ')');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fill();
}
function stroke3(ctx, w, base) {
  // Outline, Grundfarbe, Lichtkante – für Beine, Fühler, Stiele
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = OL(base);
  ctx.lineWidth = w + 2.6;
  ctx.stroke();
  ctx.strokeStyle = base;
  ctx.lineWidth = w;
  ctx.stroke();
  ctx.strokeStyle = LT(base, 0.45);
  ctx.lineWidth = Math.max(0.8, w * 0.32);
  ctx.globalAlpha *= 0.8;
  ctx.stroke();
  ctx.globalAlpha /= 0.8;
}
function leg(ctx, x, y, a, l, base, w, bend) {
  const kx = x + Math.cos(a) * l * 0.55, ky = y + Math.sin(a) * l * 0.55;
  const ex = kx + Math.cos(a + bend) * l * 0.5, ey = ky + Math.sin(a + bend) * l * 0.5;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(kx, ky);
  ctx.lineTo(ex, ey);
  stroke3(ctx, w, base);
}
// Comic-Auge auf Stiel: Blick nach +x
function eye(ctx, x, y, r, stalkFrom, opt) {
  opt = opt || {};
  if (stalkFrom) {
    ctx.beginPath();
    ctx.moveTo(stalkFrom[0], stalkFrom[1]);
    ctx.lineTo(x, y);
    stroke3(ctx, r * 0.55, opt.stalk || '#d9573a');
  }
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.35, r * 0.1, x, y, r);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(1, opt.white || '#d7e2ec');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.lineWidth = Math.max(1.4, r * 0.28);
  ctx.strokeStyle = '#1d140c';
  ctx.stroke();
  const px = x + r * 0.32, py = y + (opt.lookY || 0) * r * 0.25;
  ctx.beginPath();
  ctx.arc(px, py, r * 0.56, 0, Math.PI * 2);
  ctx.fillStyle = opt.iris || '#1b1b22';
  ctx.fill();
  if (opt.iris) {
    ctx.beginPath();
    ctx.arc(px, py, r * 0.3, 0, Math.PI * 2);
    ctx.fillStyle = '#111';
    ctx.fill();
  }
  ctx.beginPath();
  ctx.arc(px - r * 0.18, py - r * 0.22, r * 0.2, 0, Math.PI * 2);
  ctx.fillStyle = '#fff';
  ctx.fill();
  if (opt.lid) {
    // entschlossener Lidstrich
    ctx.beginPath();
    ctx.moveTo(x - r * 0.9, y - r * 0.55 * opt.lid);
    ctx.lineTo(x + r * 0.95, y - r * 0.15 * opt.lid - r * 0.5);
    ctx.lineWidth = r * 0.45;
    ctx.strokeStyle = '#1d140c';
    ctx.lineCap = 'round';
    ctx.stroke();
  }
}
// Schere (Draufsicht) Richtung a
function claw(ctx, x, y, a, s, base, open, opt) {
  opt = opt || {};
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(a);
  const o = open == null ? 0.35 : open;
  // Arm
  E(ctx, -s * 0.35, 0, s * 0.7, s * 0.4, 0, base, 2);
  // fester Finger
  ctx.beginPath();
  ctx.moveTo(s * 0.15, -s * 0.42);
  ctx.bezierCurveTo(s * 0.9, -s * 0.8 - o * s * 0.3, s * 1.45, -s * 0.45 - o * s * 0.35, s * 1.42, -s * 0.06 - o * s * 0.22);
  ctx.quadraticCurveTo(s * 0.95, -s * 0.12, s * 0.45, -s * 0.02);
  ctx.closePath();
  shade(ctx, base, s * 0.6, -s * 0.3, s * 0.9, 2);
  // beweglicher Finger
  ctx.beginPath();
  ctx.moveTo(s * 0.15, s * 0.42);
  ctx.bezierCurveTo(s * 0.85, s * 0.75 + o * s * 0.3, s * 1.35, s * 0.45 + o * s * 0.35, s * 1.32, s * 0.1 + o * s * 0.22);
  ctx.quadraticCurveTo(s * 0.9, s * 0.1, s * 0.45, s * 0.04);
  ctx.closePath();
  shade(ctx, DK(base, 0.08), s * 0.6, s * 0.3, s * 0.9, 2);
  // Handballen
  E(ctx, s * 0.2, 0, s * 0.62, s * 0.55, 0, base, 2);
  gloss(ctx, s * 0.05, -s * 0.22, s * 0.38, s * 0.16, 0.7, -0.2);
  if (opt.band) {
    ctx.beginPath();
    ctx.ellipse(-s * 0.25, 0, s * 0.14, s * 0.42, 0, 0, Math.PI * 2);
    shade(ctx, opt.band, -s * 0.25, 0, s * 0.42, 1.5);
  }
  if (opt.tips) {
    C(ctx, s * 1.4, -s * 0.12 - o * s * 0.2, s * 0.17, opt.tips, 1.2);
    C(ctx, s * 1.3, s * 0.14 + o * s * 0.2, s * 0.15, opt.tips, 1.2);
  }
  ctx.restore();
}
function shadowBlob(ctx, rx, ry) {
  ctx.beginPath();
  ctx.ellipse(1.5, 3, rx, ry, 0, 0, Math.PI * 2);
  const g = ctx.createRadialGradient(1.5, 3, 0, 1.5, 3, Math.max(rx, ry));
  g.addColorStop(0, 'rgba(0,25,30,0.38)');
  g.addColorStop(1, 'rgba(0,25,30,0)');
  ctx.fillStyle = g;
  ctx.fill();
}
function aura(ctx, r, col, a) {
  const g = ctx.createRadialGradient(0, 0, r * 0.2, 0, 0, r);
  g.addColorStop(0, col.replace('A', a || 0.55));
  g.addColorStop(1, col.replace('A', 0));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();
}
function star(ctx, x, y, r1, r2, n, base, lw) {
  ctx.beginPath();
  for (let i = 0; i < n * 2; i++) {
    const a = (i / (n * 2)) * Math.PI * 2 - Math.PI / 2;
    const r = i % 2 ? r2 : r1;
    ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
  }
  ctx.closePath();
  shade(ctx, base, x, y, r1, lw == null ? 1.6 : lw);
}
function crown(ctx, x, y, s, rot) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot || 0);
  ctx.beginPath();
  ctx.moveTo(-s, s * 0.5);
  ctx.lineTo(-s, -s * 0.3);
  ctx.lineTo(-s * 0.5, s * 0.05);
  ctx.lineTo(0, -s * 0.6);
  ctx.lineTo(s * 0.5, s * 0.05);
  ctx.lineTo(s, -s * 0.3);
  ctx.lineTo(s, s * 0.5);
  ctx.closePath();
  shade(ctx, '#ffcf2e', 0, 0, s, 1.8);
  C(ctx, 0, s * 0.15, s * 0.18, '#e8304a', 1);
  ctx.restore();
}
SC.art = { rgb, mix, LT, DK, OL, shade, E, C, gloss, stroke3, leg, eye, claw, shadowBlob, aura, star, crown };

// ============================================================
//  SPRITE-CACHE (vorgerendert in Display-Auflösung)
// ============================================================
SC.spr = {
  scale: 2,
  cache: new Map(),
  setScale(s) {
    s = Math.min(3, Math.max(1, s));
    if (Math.abs(s - this.scale) > 0.05) {
      this.scale = s;
      this.cache.clear();
    }
  },
  get(key, size, fn) {
    let e = this.cache.get(key);
    if (e) return e;
    const S = this.scale;
    const c = document.createElement('canvas');
    const px = Math.ceil(size * S);
    c.width = c.height = px;
    const x = c.getContext('2d');
    x.scale(px / size, px / size);
    x.translate(size / 2, size / 2);
    fn(x);
    e = { c, size };
    this.cache.set(key, e);
    return e;
  },
  // Sprite mit BTD5-Schlagschatten (versetzte, weiche Silhouette)
  getShadowed(key, size, fn, off) {
    return this.get(key, size, (x) => {
      const tmp = document.createElement('canvas');
      tmp.width = tmp.height = x.canvas.width;
      const tx = tmp.getContext('2d');
      tx.setTransform(x.getTransform());
      fn(tx);
      const S = this.scale;
      x.save();
      x.setTransform(1, 0, 0, 1, 0, 0);
      x.shadowColor = 'rgba(0,0,0,0.32)';
      x.shadowBlur = 2.5 * S;
      x.shadowOffsetX = (off || 3) * S;
      x.shadowOffsetY = (off || 3) * 1.4 * S;
      x.drawImage(tmp, 0, 0);
      x.restore();
    });
  },
  blit(ctx, e, x, y, rot, sc) {
    const h = (e.size * (sc || 1)) / 2;
    if (rot) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rot);
      ctx.drawImage(e.c, -h, -h, h * 2, h * 2);
      ctx.restore();
    } else ctx.drawImage(e.c, x - h, y - h, h * 2, h * 2);
  },
};

// ============================================================
//  BLASEN
// ============================================================
const RB = ['#ff3b3b', '#ff9a2e', '#ffe23d', '#4fd34a', '#3aa8ff', '#9a5cff'];
function bubbleBase(ctx, r, base, opt) {
  opt = opt || {};
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  const g = ctx.createRadialGradient(-r * 0.35, -r * 0.4, r * 0.08, 0, 0, r * 1.05);
  g.addColorStop(0, LT(base, opt.hi || 0.55));
  g.addColorStop(0.5, base);
  g.addColorStop(1, DK(base, opt.lo || 0.35));
  ctx.fillStyle = g;
  ctx.fill();
}
function bubbleFinish(ctx, r, base, opt) {
  opt = opt || {};
  // Lichtreflex unten (Blasen-Rand)
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.82, Math.PI * 0.15, Math.PI * 0.85);
  ctx.strokeStyle = 'rgba(255,255,255,' + (opt.rim || 0.28) + ')';
  ctx.lineWidth = r * 0.12;
  ctx.lineCap = 'round';
  ctx.stroke();
  // Outline
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.lineWidth = 2.2;
  ctx.strokeStyle = opt.ol || OL(base);
  ctx.stroke();
  // Glanz
  gloss(ctx, -r * 0.34, -r * 0.42, r * 0.42, r * 0.24, opt.gloss || 0.9, -0.6);
  ctx.beginPath();
  ctx.arc(-r * 0.62, -r * 0.05, r * 0.09, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.fill();
}
function drawBloonArt(ctx, type, dmgStage, camo, regrow) {
  const d = SC.BLOONS[type];
  const r = d.r * 1.12;
  if (d.moab) return drawMoabArt(ctx, type, dmgStage);
  if (type === 'rainbow') {
    for (let i = 0; i < 6; i++) {
      ctx.beginPath();
      ctx.arc(0, 0, r * (1 - i * 0.155), 0, Math.PI * 2);
      const g = ctx.createRadialGradient(-r * 0.3, -r * 0.35, 0, 0, 0, r * (1 - i * 0.155));
      g.addColorStop(0, LT(RB[i], 0.3));
      g.addColorStop(1, RB[i]);
      ctx.fillStyle = g;
      ctx.fill();
    }
    bubbleFinish(ctx, r, '#8a4bd6', { ol: '#3a1f55' });
  } else if (type === 'stripe') {
    bubbleBase(ctx, r, '#f4f6f8');
    ctx.save();
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.clip();
    ctx.rotate(0.65);
    ctx.fillStyle = '#1f1b2a';
    for (let i = -3; i <= 3; i += 2) {
      ctx.beginPath();
      ctx.moveTo(i * r * 0.3, -r);
      ctx.quadraticCurveTo(i * r * 0.3 + r * 0.15, 0, i * r * 0.3, r);
      ctx.lineTo(i * r * 0.3 + r * 0.26, r);
      ctx.quadraticCurveTo(i * r * 0.3 + r * 0.4, 0, i * r * 0.3 + r * 0.26, -r);
      ctx.fill();
    }
    ctx.restore();
    bubbleFinish(ctx, r, '#777777', { ol: '#1a1a22' });
  } else if (type === 'armor') {
    bubbleBase(ctx, r, '#8d96a3', { hi: 0.6 });
    // Muschel-Rippen
    ctx.save();
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.clip();
    for (let i = -3; i <= 3; i++) {
      ctx.beginPath();
      ctx.moveTo(0, r * 1.1);
      ctx.quadraticCurveTo(i * r * 0.25, 0, i * r * 0.32, -r * 1.05);
      ctx.strokeStyle = 'rgba(40,46,58,0.45)';
      ctx.lineWidth = 1.6;
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(1.2, r * 1.1);
      ctx.quadraticCurveTo(i * r * 0.25 + 1.2, 0, i * r * 0.32 + 1.2, -r * 1.05);
      ctx.strokeStyle = 'rgba(255,255,255,0.25)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    ctx.restore();
    bubbleFinish(ctx, r, '#5b6370', { gloss: 0.95 });
  } else if (type === 'coral') {
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      C(ctx, Math.cos(a) * r * 0.84, Math.sin(a) * r * 0.84, r * 0.3, '#ff8a5c', 1.6);
    }
    C(ctx, 0, 0, r * 0.88, '#ff9a68', 0);
    for (let i = 0; i < 6; i++) {
      const a = i * 1.1 + 0.3;
      C(ctx, Math.cos(a) * r * 0.45, Math.sin(a) * r * 0.45, r * 0.13, '#d9562e', 0);
    }
    ctx.strokeStyle = 'rgba(90,25,8,0.75)';
    ctx.lineWidth = 1.8;
    ctx.lineCap = 'round';
    const cracks = [[[-0.6, -0.35], [-0.15, 0], [0.1, 0.35]], [[0.5, -0.55], [0.2, -0.15], [0.45, 0.15]], [[-0.3, 0.65], [0.05, 0.4], [0.55, 0.45]]];
    for (let k = 0; k < dmgStage; k++) {
      ctx.beginPath();
      cracks[k].forEach(([x, y], i) => (i ? ctx.lineTo(x * r, y * r) : ctx.moveTo(x * r, y * r)));
      ctx.stroke();
    }
    gloss(ctx, -r * 0.3, -r * 0.4, r * 0.4, r * 0.2, 0.75, -0.6);
  } else {
    const base = d.color;
    bubbleBase(ctx, r, base, type === 'ink' ? { hi: 0.25, lo: 0.4 } : type === 'ice' ? { hi: 0.1, lo: 0.18 } : null);
    if (type === 'ink') {
      ctx.beginPath();
      ctx.arc(r * 0.15, r * 0.2, r * 0.55, 0, Math.PI * 2);
      const g = ctx.createRadialGradient(r * 0.15, r * 0.2, 0, r * 0.15, r * 0.2, r * 0.55);
      g.addColorStop(0, 'rgba(150,90,230,0.55)');
      g.addColorStop(1, 'rgba(150,90,230,0)');
      ctx.fillStyle = g;
      ctx.fill();
    }
    if (type === 'ice') {
      ctx.strokeStyle = 'rgba(110,170,210,0.8)';
      ctx.lineWidth = 1.3;
      for (let i = 0; i < 3; i++) {
        const a = (i / 3) * Math.PI + 0.3;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * r * 0.55, Math.sin(a) * r * 0.55);
        ctx.lineTo(-Math.cos(a) * r * 0.55, -Math.sin(a) * r * 0.55);
        ctx.stroke();
      }
    }
    bubbleFinish(ctx, r, base, type === 'ice' ? { ol: '#5d8fb0' } : type === 'ink' ? { ol: '#05040a', gloss: 0.55 } : null);
  }
  if (regrow) {
    ctx.save();
    ctx.translate(r * 0.55, -r * 0.8);
    ctx.rotate(0.5);
    ctx.beginPath();
    ctx.moveTo(0, 4);
    ctx.quadraticCurveTo(6, -2, 0, -8);
    ctx.quadraticCurveTo(-6, -2, 0, 4);
    shade(ctx, '#58d34a', 0, -2, 6, 1.4);
    ctx.restore();
  }
  if (camo) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(0, 0, r - 1, 0, Math.PI * 2);
    ctx.clip();
    ctx.globalAlpha = 0.45;
    const cols = ['#2f6b2a', '#5a8f3a', '#a7c46a'];
    for (let i = 0; i < 7; i++) {
      ctx.beginPath();
      ctx.ellipse(Math.cos(i * 2.3) * r * 0.55, Math.sin(i * 1.7) * r * 0.55, r * 0.35, r * 0.22, i, 0, Math.PI * 2);
      ctx.fillStyle = cols[i % 3];
      ctx.fill();
    }
    ctx.restore();
  }
}

function drawMoabArt(ctx, type, dmg) {
  const d = SC.BLOONS[type];
  const r = d.r;
  if (type === 'puffer') {
    // Stacheln
    for (let i = 0; i < 18; i++) {
      const a = (i / 18) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a - 0.12) * r * 0.92, Math.sin(a - 0.12) * r * 0.92);
      ctx.lineTo(Math.cos(a) * r * 1.3, Math.sin(a) * r * 1.3);
      ctx.lineTo(Math.cos(a + 0.12) * r * 0.92, Math.sin(a + 0.12) * r * 0.92);
      ctx.closePath();
      shade(ctx, '#d6a94a', Math.cos(a) * r, Math.sin(a) * r, 8, 1.6);
    }
    // Schwanzflosse
    ctx.beginPath();
    ctx.moveTo(-r * 0.85, 0);
    ctx.quadraticCurveTo(-r * 1.4, -r * 0.6, -r * 1.55, -r * 0.4);
    ctx.quadraticCurveTo(-r * 1.3, 0, -r * 1.55, r * 0.4);
    ctx.quadraticCurveTo(-r * 1.4, r * 0.6, -r * 0.85, 0);
    shade(ctx, '#f0b94e', -r * 1.2, 0, r * 0.5, 2);
    C(ctx, 0, 0, r, '#f2cd6b', 2.6, { hi: 0.55 });
    // Bauch
    E(ctx, r * 0.05, r * 0.32, r * 0.72, r * 0.5, 0, '#fff4d6', 0);
    for (let i = 0; i < 7; i++) {
      C(ctx, -r * 0.55 + (i % 4) * r * 0.32, -r * 0.5 + Math.floor(i / 4) * r * 0.28, r * 0.08, '#8a5d1d', 0);
    }
    // Seitenflossen
    E(ctx, -r * 0.05, -r * 0.92, r * 0.28, r * 0.14, 0.4, '#f0b94e', 1.6);
    E(ctx, -r * 0.05, r * 0.92, r * 0.28, r * 0.14, -0.4, '#f0b94e', 1.6);
    // Augen
    eye(ctx, r * 0.5, -r * 0.42, r * 0.22, null, { lid: 1 });
    eye(ctx, r * 0.5, r * 0.42, r * 0.22, null, { lid: -1 });
    E(ctx, r * 0.9, 0, r * 0.1, r * 0.17, 0, '#d24a55', 1.4);
    gloss(ctx, -r * 0.25, -r * 0.45, r * 0.5, r * 0.18, 0.6, -0.4);
  } else if (type === 'whale') {
    ctx.beginPath();
    ctx.moveTo(-r * 1.1, 0);
    ctx.quadraticCurveTo(-r * 1.5, -r * 0.2, -r * 1.75, -r * 0.65);
    ctx.quadraticCurveTo(-r * 1.5, -r * 0.05, -r * 1.55, 0);
    ctx.quadraticCurveTo(-r * 1.5, r * 0.05, -r * 1.75, r * 0.65);
    ctx.quadraticCurveTo(-r * 1.5, r * 0.2, -r * 1.1, 0);
    shade(ctx, '#2f5fa6', -r * 1.4, 0, r * 0.6, 2.4);
    E(ctx, -r * 0.05, -r * 0.78, r * 0.36, r * 0.13, 0.5, '#2f5fa6', 2);
    E(ctx, -r * 0.05, r * 0.78, r * 0.36, r * 0.13, -0.5, '#2f5fa6', 2);
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 1.25, r * 0.72, 0, 0, Math.PI * 2);
    shade(ctx, '#3f78c8', 0, 0, r * 1.1, 3);
    // Bauchfurchen
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 1.25, r * 0.72, 0, 0, Math.PI * 2);
    ctx.clip();
    E(ctx, r * 0.2, r * 0.5, r * 1.0, r * 0.32, 0, '#bcd8f5', 0);
    for (let i = 0; i < 6; i++) {
      ctx.beginPath();
      ctx.moveTo(-r * 0.3 + i * r * 0.22, r * 0.28);
      ctx.lineTo(-r * 0.2 + i * r * 0.22, r * 0.7);
      ctx.strokeStyle = 'rgba(60,100,160,0.5)';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    ctx.restore();
    eye(ctx, r * 0.72, -r * 0.3, r * 0.12, null, { lid: 1 });
    C(ctx, r * 0.15, 0, r * 0.08, '#1d3a66', 0);
    gloss(ctx, r * 0.1, -r * 0.42, r * 0.7, r * 0.15, 0.55, -0.1);
  } else {
    for (let i = 0; i < 8; i++) {
      const a = Math.PI + (i - 3.5) * 0.3;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * r * 0.4, Math.sin(a) * r * 0.4);
      const w = (i % 2 ? 1 : -1) * 10;
      ctx.bezierCurveTo(Math.cos(a) * r * 1.0 + w, Math.sin(a) * r * 1.0, Math.cos(a) * r * 1.4 - w, Math.sin(a) * r * 1.4, Math.cos(a) * r * 1.75, Math.sin(a) * r * 1.75 + w);
      stroke3(ctx, 9, '#a92a63');
    }
    ctx.beginPath();
    ctx.ellipse(0, 0, r, r * 0.86, 0, 0, Math.PI * 2);
    shade(ctx, '#c93b7b', 0, 0, r, 3);
    for (let i = 0; i < 8; i++) C(ctx, -r * 0.55 + (i % 4) * r * 0.28, -r * 0.42 + Math.floor(i / 4) * r * 0.6, r * 0.08, '#ec8ab6', 0);
    eye(ctx, r * 0.42, -r * 0.32, r * 0.2, null, { iris: '#ffd23f', lid: 1 });
    eye(ctx, r * 0.42, r * 0.32, r * 0.2, null, { iris: '#ffd23f', lid: -1 });
    crown(ctx, -r * 0.3, 0, r * 0.32, -Math.PI / 2);
    gloss(ctx, -r * 0.1, -r * 0.5, r * 0.5, r * 0.15, 0.5, -0.2);
  }
  // Schaden
  ctx.strokeStyle = 'rgba(40,15,10,0.7)';
  ctx.lineWidth = 2.6;
  ctx.lineCap = 'round';
  if (dmg >= 1) {
    ctx.beginPath();
    ctx.moveTo(-r * 0.4, -r * 0.5);
    ctx.lineTo(-r * 0.1, -r * 0.15);
    ctx.lineTo(r * 0.15, -r * 0.3);
    ctx.stroke();
  }
  if (dmg >= 2) {
    ctx.beginPath();
    ctx.moveTo(r * 0.1, r * 0.6);
    ctx.lineTo(-r * 0.15, r * 0.2);
    ctx.lineTo(-r * 0.45, r * 0.3);
    ctx.stroke();
  }
  if (dmg >= 3) {
    ctx.beginPath();
    ctx.moveTo(-r * 0.75, r * 0.05);
    ctx.lineTo(-r * 0.45, -r * 0.05);
    ctx.stroke();
  }
}

SC.drawBloon = function (ctx, b, time) {
  const d = b.def;
  const st = d.hp > 1 ? Math.min(3, Math.floor((1 - b.hp / d.hp) * 4)) : 0;
  const key = 'b' + b.type + st + (b.camo ? 'c' : '') + (b.regrow ? 'r' : '');
  const size = d.moab ? d.r * 4 : d.r * 3;
  const e = SC.spr.getShadowed(key, size, (x) => drawBloonArt(x, b.type, st, b.camo, b.regrow), d.moab ? 6 : 3);
  ctx.save();
  if (b.camo) ctx.globalAlpha = 0.6;
  if (d.moab) {
    SC.spr.blit(ctx, e, b.x, b.y, b.a || 0);
    if (b.slowT > 0 || b.stun > 0) {
      ctx.beginPath();
      ctx.arc(b.x, b.y, d.r + 8, 0, Math.PI * 2);
      ctx.strokeStyle = b.stun > 0 ? 'rgba(255,240,120,0.75)' : 'rgba(150,230,255,0.7)';
      ctx.lineWidth = 3;
      ctx.stroke();
    }
  } else {
    const w = Math.sin(time * 6 + b.id) * 0.05;
    ctx.translate(b.x, b.y);
    ctx.scale(1 + w, 1 - w);
    ctx.drawImage(e.c, -size / 2, -size / 2, size, size);
    if (b.frozen > 0) {
      const ie = SC.spr.get('ice' + Math.round(d.r), d.r * 3.2, (x) => {
        const r = d.r * 1.12 + 4;
        x.beginPath();
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2 + 0.5;
          x.lineTo(Math.cos(a) * r, Math.sin(a) * r);
        }
        x.closePath();
        x.globalAlpha = 0.7;
        shade(x, '#bfefff', 0, 0, r, 1.6, { ol: '#ffffff' });
        x.globalAlpha = 1;
        gloss(x, -r * 0.3, -r * 0.35, r * 0.4, r * 0.2, 0.8);
      });
      ctx.drawImage(ie.c, -ie.size / 2, -ie.size / 2, ie.size, ie.size);
    }
    if (b.dotT > 0) {
      ctx.globalAlpha = 0.8;
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.arc(Math.cos(i * 2.1 + time * 3) * d.r * 0.7, Math.sin(i * 2.1 + time * 3) * d.r * 0.7, 2.4, 0, Math.PI * 2);
        ctx.fillStyle = '#b25cff';
        ctx.fill();
      }
    }
  }
  ctx.restore();
};

SC.bloonIcon = function (type, size) {
  const key = 'B' + type + size;
  SC._iconCache = SC._iconCache || {};
  if (SC._iconCache[key]) return SC._iconCache[key];
  const c = document.createElement('canvas');
  c.width = c.height = size * 2;
  const ctx = c.getContext('2d');
  const d = SC.BLOONS[type];
  const span = d.moab ? d.r * 3.6 : d.r * 2.6;
  ctx.scale((size * 2) / span, (size * 2) / span);
  ctx.translate(span / 2, span / 2);
  drawBloonArt(ctx, type, 0, false, false);
  return (SC._iconCache[key] = c.toDataURL());
};
