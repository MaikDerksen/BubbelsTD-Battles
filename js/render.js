'use strict';
// ============================================================
//  Rendern eines Spielfelds (eigenes Feld, KI-Feld oder Online-Geist)
// ============================================================
(function () {
  const { LT, DK, shade, E, C, gloss, stroke3, star } = SC.art;
  const _tmp = { x: 0, y: 0, a: 0 };

  SC.renderField = function (ctx, f, time, bg, opts) {
    opts = opts || {};
    ctx.drawImage(bg, 0, 0, SC.W, SC.H);

    for (const pl of f.piles || []) drawPile(ctx, pl, time);

    const bl = f.bloons;
    for (let i = 0; i < bl.length; i++) if (!bl[i].dead && !bl[i].def.moab) SC.drawBloon(ctx, bl[i], time);
    for (let i = 0; i < bl.length; i++) if (!bl[i].dead && bl[i].def.moab) SC.drawBloon(ctx, bl[i], time);

    for (const t of f.towers) {
      if (opts.selected === t) SC.drawRange(ctx, t.x, t.y, t.s.global ? 0 : (t.s.range || 0) * (1 + (t.buff ? t.buff.range : 0)), true);
      SC.drawTower(ctx, t, time);
      if ((t.buff && t.buff.dance) || f.gBoostT > 0 || t.boostT > 0) {
        ctx.save();
        ctx.globalAlpha = 0.6 + Math.sin(time * 12) * 0.3;
        star(ctx, t.x + 16, t.y - 18, 5, 2.2, 4, '#ffe14d', 1);
        ctx.restore();
      }
    }
    const fl = fieldFlags(f);
    for (const t of f.towers) {
      if (t.kind === 'molt' && t.lvl > 1) levelBadge(ctx, t.x + 15, t.y + 15, t.lvl);
      if (fl.rage) {
        ctx.save();
        ctx.globalAlpha = 0.35 + Math.sin(time * 14 + t.x) * 0.15;
        ctx.beginPath();
        ctx.arc(t.x, t.y, 22, 0, Math.PI * 2);
        ctx.strokeStyle = '#ff5a36';
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.restore();
      }
    }
    for (const t of f.towers) {
      if (t.kind === 'krill' && t.drones) for (const d of t.drones) SC.drawKrill(ctx, d.x, d.y, d.a, t.s.camo);
      if (t.s.orbit) {
        const n = t.orbN || t.s.orbit, r = t.orbR || 50;
        for (let i = 0; i < n; i++) {
          const a = (t.orbitA || 0) + (i / n) * Math.PI * 2;
          drawShell(ctx, t.x + Math.cos(a) * r, t.y + Math.sin(a) * r, time * 10 + i, t.s.shell);
        }
      }
    }
    drawFieldEffects(ctx, f, fl, time);
    if (opts.mini) return;

    for (const p of f.projs) drawProj(ctx, p, time);

    for (const w of f.whales || []) {
      const u = w.t / w.dur;
      f.path.pos(SC.lerp(w.d0 - 60, w.d1 + 60, u), _tmp);
      ctx.save();
      ctx.globalAlpha = u < 0.15 ? u / 0.15 : u > 0.85 ? (1 - u) / 0.15 : 1;
      const sc = w.big ? 2.2 : 1.5;
      ctx.translate(_tmp.x, _tmp.y);
      ctx.scale(sc, sc);
      SC.drawBloon(ctx, { def: SC.BLOONS.whale, type: 'whale', x: 0, y: 0, a: _tmp.a, hp: 700, id: 3 }, time);
      ctx.restore();
    }

    for (const e of f.fx) drawFx(ctx, e);
    for (const c of f.crates || []) drawCrate(ctx, c, time);
  };

  SC.drawRange = function (ctx, x, y, r, ok) {
    if (!r) return;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = ok ? 'rgba(0,0,0,0.22)' : 'rgba(230,30,30,0.32)';
    ctx.fill();
    ctx.strokeStyle = ok ? 'rgba(255,255,255,0.75)' : 'rgba(255,90,90,0.9)';
    ctx.lineWidth = 2;
    ctx.stroke();
  };

  // Zustände eines Feldes (echtes Feld oder Gegner-Spiegelbild)
  function fieldFlags(f) {
    if (f instanceof SC.Ghost) {
      const F = f.flags || 0;
      return { shield: !!(F & 1), fog: !!(F & 2), boost: !!(F & 4), rage: !!(F & 8), radar: false };
    }
    return { shield: f.shieldT > 0 && f.shieldHp > 0, fog: f.hexFogT > 0, boost: f.hexBoostT > 0, rage: f.rageT > 0, radar: f.radarT > 0 };
  }
  function drawFieldEffects(ctx, f, fl, time) {
    if (fl.shield) {
      // Schild am Ende der Strecke
      const P = f.path;
      P.pos(P.visEnd - 30, _tmp);
      ctx.save();
      ctx.globalAlpha = 0.55 + Math.sin(time * 6) * 0.15;
      ctx.beginPath();
      ctx.arc(_tmp.x, _tmp.y, 40, 0, Math.PI * 2);
      const g = ctx.createRadialGradient(_tmp.x, _tmp.y, 10, _tmp.x, _tmp.y, 40);
      g.addColorStop(0, 'rgba(120,210,255,0.05)');
      g.addColorStop(1, 'rgba(120,210,255,0.6)');
      ctx.fillStyle = g;
      ctx.fill();
      ctx.strokeStyle = '#d8f4ff';
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.restore();
    }
    if (fl.fog) {
      ctx.save();
      for (let i = 0; i < 7; i++) {
        const x = ((i * 173 + time * 18) % (SC.W + 200)) - 100, y = 80 + ((i * 97) % 440);
        const g = ctx.createRadialGradient(x, y, 10, x, y, 150);
        g.addColorStop(0, 'rgba(30,20,50,0.42)');
        g.addColorStop(1, 'rgba(30,20,50,0)');
        ctx.fillStyle = g;
        ctx.fillRect(x - 150, y - 150, 300, 300);
      }
      ctx.restore();
    }
    if (fl.boost) {
      ctx.save();
      ctx.strokeStyle = 'rgba(255,170,60,0.7)';
      ctx.lineWidth = 2;
      for (const b of f.bloons) {
        if (b.dead) continue;
        const a = (b.a || 0) + Math.PI;
        ctx.beginPath();
        ctx.moveTo(b.x + Math.cos(a) * b.def.r, b.y + Math.sin(a) * b.def.r);
        ctx.lineTo(b.x + Math.cos(a) * (b.def.r + 12), b.y + Math.sin(a) * (b.def.r + 12));
        ctx.stroke();
      }
      ctx.restore();
    }
    if (fl.radar) {
      ctx.save();
      ctx.globalAlpha = 0.1 + Math.sin(time * 4) * 0.04;
      ctx.fillStyle = '#b6ff6a';
      ctx.fillRect(0, 0, SC.W, SC.H);
      ctx.restore();
    }
  }
  function levelBadge(ctx, x, y, lvl) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, 8, 0, Math.PI * 2);
    ctx.fillStyle = lvl >= 10 ? '#ffd23f' : '#ff7a3d';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#1b1208';
    ctx.stroke();
    ctx.font = '400 10px "Luckiest Guy", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#fff';
    ctx.fillText(String(lvl), x, y + 1);
    ctx.restore();
  }
  // Würfel mit Augenzahl (lokal, Mitte 0/0)
  const PIPS = { 1: [[0, 0]], 2: [[-1, -1], [1, 1]], 3: [[-1, -1], [0, 0], [1, 1]], 4: [[-1, -1], [1, -1], [-1, 1], [1, 1]], 5: [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]], 6: [[-1, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [1, 1]] };
  function dieArt(c, s, face, gold) {
    c.beginPath();
    c.roundRect(-s, -s, s * 2, s * 2, s * 0.35);
    shade(c, gold ? '#ffd23f' : '#ffffff', 0, 0, s * 1.3, 1.4);
    c.fillStyle = face === 1 ? '#e8302a' : '#1b1208';
    for (const [px, py] of PIPS[face] || PIPS[1]) {
      c.beginPath();
      c.arc(px * s * 0.5, py * s * 0.5, s * 0.17, 0, Math.PI * 2);
      c.fill();
    }
  }
  SC.dieArt = dieArt;

  function drawShell(ctx, x, y, spin, shell) {
    const key = 'shell' + (shell || 'snail');
    const e = SC.spr.getShadowed(key, 26, (c) => {
      if (shell === 'can') {
        E(c, 0, 0, 8, 6, 0, '#c4cdd6', 1.5);
        c.beginPath();
        c.rect(-3, -5, 4, 10);
        c.fillStyle = '#e0393f';
        c.fill();
      } else if (shell === 'bottle') {
        E(c, 0, 0, 9, 5, 0, '#4cc27a', 1.5, { ol: '#11502c' });
        gloss(c, -2, -2, 4, 1.5, 0.8, 0);
      } else if (shell === 'wreck') {
        C(c, 0, 0, 6, '#3a3a40', 1.5);
      } else {
        C(c, 0, 0, 7.5, '#efcf95', 1.6);
        c.beginPath();
        for (let a = 0; a < 9; a += 0.4) c.lineTo(Math.cos(a) * (6.5 - a * 0.65), Math.sin(a) * (6.5 - a * 0.65));
        c.strokeStyle = '#a0703a';
        c.lineWidth = 1.3;
        c.stroke();
      }
    }, 2);
    SC.spr.blit(ctx, e, x, y, spin);
  }

  function drawProj(ctx, p, time) {
    switch (p.kind) {
      case 'bubble': {
        const e = SC.spr.get('pb' + p.type, 20, (c) => {
          C(c, 0, 0, 6.5, p.type === 'heat' ? '#ffb347' : '#bfefff', 1.6, { ol: p.type === 'heat' ? '#a8321c' : '#2a7fb0' });
          gloss(c, -2, -2.5, 3, 1.5, 0.95);
        });
        SC.spr.blit(ctx, e, p.x, p.y, 0, p.r / 7);
        break;
      }
      case 'wave': {
        const a = Math.atan2(p.vy, p.vx);
        ctx.beginPath();
        ctx.arc(p.x - Math.cos(a) * p.r * 0.6, p.y - Math.sin(a) * p.r * 0.6, p.r, a - 0.9, a + 0.9);
        ctx.strokeStyle = SC.OUT;
        ctx.lineWidth = 7;
        ctx.lineCap = 'round';
        ctx.stroke();
        ctx.strokeStyle = p.type === 'heat' ? '#ffb347' : '#cdf4ff';
        ctx.lineWidth = 4;
        ctx.stroke();
        break;
      }
      case 'plasma': {
        const e = SC.spr.get('plasma', 40, (c) => {
          const g = c.createRadialGradient(0, 0, 0, 0, 0, 18);
          g.addColorStop(0, '#ffffff');
          g.addColorStop(0.35, '#fff2a0');
          g.addColorStop(0.7, 'rgba(255,150,40,0.7)');
          g.addColorStop(1, 'rgba(255,90,20,0)');
          c.fillStyle = g;
          c.beginPath();
          c.arc(0, 0, 18, 0, Math.PI * 2);
          c.fill();
        });
        SC.spr.blit(ctx, e, p.x, p.y, time * 6, p.r / 10);
        break;
      }
      case 'spear': {
        const e = SC.spr.getShadowed('spear', 34, (c) => {
          c.beginPath();
          c.moveTo(-13, 0);
          c.lineTo(5, 0);
          stroke3(c, 2.4, '#e9eef2');
          c.beginPath();
          c.moveTo(12, 0);
          c.lineTo(4, -4);
          c.lineTo(4, 4);
          c.closePath();
          shade(c, '#ff7a2e', 8, 0, 5, 1.3);
        }, 2);
        SC.spr.blit(ctx, e, p.x, p.y, p.a);
        break;
      }
      case 'shell':
        drawShell(ctx, p.x, p.y, p.spin || 0, p.shell);
        break;
      case 'coco':
      case 'meteor': {
        if (p.t < 0) break;
        const h = p.h || 0;
        const big = p.kind === 'meteor';
        ctx.beginPath();
        ctx.ellipse(p.x1 + 3, p.y1 + 3, (big ? 26 : 8) * (0.5 + p.t / p.dur * 0.5), (big ? 14 : 4.5) * (0.5 + p.t / p.dur * 0.5), 0, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0,0,0,0.25)';
        ctx.fill();
        const r = (big ? 24 : p.big ? 10 : 7) * (1 + h * 0.45);
        const y = p.y - h * (big ? 0 : 45);
        if (p.fire || big) {
          ctx.beginPath();
          ctx.arc(p.x - 4, y - 5, r * 1.5, 0, Math.PI * 2);
          const g = ctx.createRadialGradient(p.x, y, r * 0.5, p.x - 4, y - 5, r * 1.5);
          g.addColorStop(0, 'rgba(255,230,120,0.9)');
          g.addColorStop(1, 'rgba(255,90,20,0)');
          ctx.fillStyle = g;
          ctx.fill();
        }
        C(ctx, p.x, y, r, big ? '#8a4a20' : '#7b4a22', 2);
        for (let i = 0; i < 3; i++) C(ctx, p.x + Math.cos(i * 2.1) * r * 0.35, y + Math.sin(i * 2.1) * r * 0.35, r * 0.13, '#2b190a', 0);
        gloss(ctx, p.x - r * 0.3, y - r * 0.35, r * 0.35, r * 0.18, 0.5);
        break;
      }
      case 'frag':
      case 'shard': {
        const e = SC.spr.get('pf' + p.kind, 14, (c) => {
          c.beginPath();
          c.moveTo(5, 0);
          c.lineTo(-3, -3);
          c.lineTo(-3, 3);
          c.closePath();
          shade(c, p.kind === 'shard' ? '#7fe0a0' : '#8a5a2b', 0, 0, 4, 1);
        });
        SC.spr.blit(ctx, e, p.x, p.y, p.a + time * 20);
        break;
      }
      case 'die': {
        if (p.mode === 'lob') {
          if (p.t < 0) break;
          const h = p.h || 0;
          const e = SC.spr.getShadowed('diebig', 44, (c) => dieArt(c, 13, 6, true), 3);
          SC.spr.blit(ctx, e, p.x, p.y - h * 60, time * 9, 1 + h * 0.4);
          break;
        }
        if (p.crit) {
          ctx.beginPath();
          ctx.arc(p.x, p.y, 13, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(255,225,77,0.45)';
          ctx.fill();
        }
        const e = SC.spr.getShadowed('die' + p.face + (p.crit ? 'g' : ''), 22, (c) => dieArt(c, 6, p.face, p.crit), 2);
        SC.spr.blit(ctx, e, p.x, p.y, (p.a || 0) + time * 14);
        break;
      }
      case 'cannon': {
        const e = SC.spr.getShadowed('cball', 18, (c) => {
          C(c, 0, 0, 5.5, '#3a3a42', 1.5);
          gloss(c, -1.6, -2, 2.2, 1.2, 0.8);
        }, 2);
        SC.spr.blit(ctx, e, p.x, p.y, 0);
        break;
      }
    }
  }

  function drawPile(ctx, pl, time) {
    const u = pl.fly;
    const x = SC.lerp(pl.sx, pl.x, u), y = SC.lerp(pl.sy, pl.y, u) - Math.sin(u * Math.PI) * 30;
    const sc = (pl.big ? 1.5 : 1) * (0.55 + 0.45 * Math.max(0.2, pl.pierce / pl.maxP));
    const key = 'pile' + (pl.urchin ? 'u' : pl.shell ? 'h' : pl.mine ? 'm' : pl.big ? 'b' : pl.type === 'punch' ? 's' : 'n');
    const e = SC.spr.getShadowed(key, 30, (c) => {
      if (pl.urchin) {
        // Seeigel: Kugel mit Stacheln
        c.strokeStyle = '#2a1650';
        c.lineWidth = 1.6;
        for (let i = 0; i < 16; i++) {
          const a = (i / 16) * Math.PI * 2;
          c.beginPath();
          c.moveTo(Math.cos(a) * 4, Math.sin(a) * 4);
          c.lineTo(Math.cos(a) * 11, Math.sin(a) * 11);
          c.stroke();
        }
        C(c, 0, 0, 6, '#7a4bd6', 1.4);
        gloss(c, -2, -2, 2.2, 1.2, 0.8);
        return;
      }
      if (pl.shell) {
        // alte Hummerschale
        E(c, 0, 0, 9, 6, 0.3, '#f2c2a6', 1.4, { ol: '#8a4a2a' });
        for (let i = -1; i <= 1; i++) {
          c.beginPath();
          c.moveTo(i * 4 - 2, -5);
          c.lineTo(i * 4 + 2, 5);
          c.strokeStyle = 'rgba(138,74,42,0.6)';
          c.lineWidth = 1.2;
          c.stroke();
        }
        return;
      }
      if (pl.mine) {
        C(c, 0, 0, 8, '#9aa1a8', 2);
        C(c, 0, 0, 3.5, '#e8302a', 1);
        return;
      }
      const col = pl.big ? '#ff8fab' : pl.type === 'punch' ? '#a9b6c6' : '#e6dfcd';
      for (let i = 0; i < 3; i++) {
        const a = (i / 3) * Math.PI * 2 + 0.4;
        const cx = Math.cos(a) * 4.5, cy = Math.sin(a) * 4.5;
        c.beginPath();
        for (let k = 0; k < 6; k++) {
          const b = (k / 6) * Math.PI * 2;
          c.lineTo(cx + Math.cos(b) * 4.3, cy + Math.sin(b) * 4.3);
        }
        c.closePath();
        shade(c, col, cx, cy, 4.3, 1.3);
        C(c, cx, cy, 1.6, '#5a4a3a', 0);
      }
    }, 2);
    SC.spr.blit(ctx, e, x, y, 0, sc);
    if (pl.mine && Math.sin(time * 10) > 0) {
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fillStyle = '#ff6a5c';
      ctx.fill();
    }
  }

  const POP = SC.spr ? null : null;
  function popSprite() {
    return SC.spr.get('popfx', 40, (c) => {
      c.beginPath();
      for (let i = 0; i < 18; i++) {
        const a = (i / 18) * Math.PI * 2;
        const r = i % 2 ? 7 : 15 + (i % 4 === 0 ? 3 : 0);
        c.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      }
      c.closePath();
      c.fillStyle = '#ffffff';
      c.fill();
      c.strokeStyle = '#2b2b33';
      c.lineWidth = 1.6;
      c.lineJoin = 'round';
      c.stroke();
    });
  }

  function drawFx(ctx, e) {
    const u = e.t / e.dur;
    switch (e.k) {
      case 'pop': {
        ctx.save();
        ctx.globalAlpha = 1 - u * u;
        SC.spr.blit(ctx, popSprite(), e.x, e.y, e.x, (e.s || 1) * (0.7 + u * 0.5));
        ctx.restore();
        break;
      }
      case 'boom': {
        ctx.save();
        ctx.globalAlpha = (1 - u) * 0.75;
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.r * (0.35 + 0.65 * u), 0, Math.PI * 2);
        const g = ctx.createRadialGradient(e.x, e.y, 0, e.x, e.y, e.r);
        g.addColorStop(0, '#ffffff');
        g.addColorStop(0.5, e.c);
        g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = g;
        ctx.fill();
        ctx.restore();
        break;
      }
      case 'ring':
        ctx.save();
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.r * (0.4 + 0.6 * u), 0, Math.PI * 2);
        ctx.globalAlpha = 1 - u;
        if (e.fill) {
          ctx.fillStyle = e.c;
          ctx.globalAlpha = (1 - u) * 0.25;
          ctx.fill();
          ctx.globalAlpha = 1 - u;
        }
        ctx.strokeStyle = e.c;
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.restore();
        break;
      case 'flash':
        ctx.save();
        ctx.globalAlpha = (1 - u) * 0.45;
        ctx.fillStyle = e.c;
        ctx.fillRect(0, 0, SC.W, SC.H);
        ctx.globalAlpha = 1 - u;
        ctx.beginPath();
        ctx.arc(e.x, e.y, 40 + u * 1100, 0, Math.PI * 2);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 8 * (1 - u) + 1;
        ctx.stroke();
        ctx.restore();
        break;
      case 'tink':
        ctx.save();
        ctx.globalAlpha = 1 - u;
        for (let i = 0; i < 4; i++) {
          const a = i * 1.57 + 0.6;
          ctx.beginPath();
          ctx.moveTo(e.x + Math.cos(a) * 4, e.y + Math.sin(a) * 4);
          ctx.lineTo(e.x + Math.cos(a) * (8 + u * 6), e.y + Math.sin(a) * (8 + u * 6));
          ctx.strokeStyle = '#e8e8e8';
          ctx.lineWidth = 2;
          ctx.stroke();
        }
        ctx.restore();
        break;
      case 'punch':
        ctx.save();
        ctx.globalAlpha = 1 - u;
        star(ctx, e.x, e.y, 11 + u * 6, 5, 6, '#fff6c2', 1.4);
        ctx.restore();
        break;
      case 'dust':
        ctx.save();
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2;
          const d = e.r * (0.5 + u * 0.7);
          ctx.globalAlpha = 0.55 * (1 - u);
          ctx.beginPath();
          ctx.arc(e.x + Math.cos(a) * d, e.y + Math.sin(a) * d * 0.6, 6 + u * 6, 0, Math.PI * 2);
          ctx.fillStyle = '#f3e4c0';
          ctx.fill();
        }
        ctx.restore();
        break;
      case 'spark':
      case 'confetti': {
        const t = e.t;
        const x = e.x + e.vx * t, y = e.y + e.vy * t + (e.k === 'confetti' ? 260 * t * t : 60 * t * t);
        ctx.save();
        ctx.globalAlpha = Math.min(1, (1 - u) * 1.6);
        ctx.translate(x, y);
        ctx.rotate(e.rot + t * 9);
        if (e.k === 'confetti') {
          ctx.fillStyle = e.c;
          ctx.fillRect(-e.s, -e.s * 0.5, e.s * 2, e.s);
        } else star(ctx, 0, 0, e.s * 1.4, e.s * 0.55, 4, e.c, 0);
        ctx.restore();
        break;
      }
      case 'pillar': {
        ctx.save();
        const a = u < 0.2 ? u / 0.2 : 1 - (u - 0.2) / 0.8;
        const g = ctx.createLinearGradient(0, 0, 0, e.y);
        g.addColorStop(0, 'rgba(255,230,120,0)');
        g.addColorStop(1, 'rgba(255,230,120,0.75)');
        ctx.globalAlpha = a;
        ctx.fillStyle = g;
        const w = 26 + Math.sin(e.t * 30) * 3;
        ctx.fillRect(e.x - w / 2, 0, w, e.y);
        ctx.beginPath();
        ctx.ellipse(e.x, e.y, 34, 14, 0, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,240,170,0.7)';
        ctx.fill();
        ctx.restore();
        break;
      }
      case 'bigboom': {
        ctx.save();
        for (let i = 0; i < 3; i++) {
          const uu = Math.min(1, u * (1 + i * 0.4));
          ctx.globalAlpha = (1 - uu) * 0.8;
          ctx.beginPath();
          ctx.arc(e.x, e.y, e.r * (0.3 + uu) * (1 - i * 0.2), 0, Math.PI * 2);
          ctx.strokeStyle = ['#ffffff', '#ffe14d', '#ff8a3d'][i];
          ctx.lineWidth = 8 * (1 - uu) + 1;
          ctx.stroke();
        }
        ctx.globalAlpha = Math.max(0, 1 - u * 2.2);
        const g = ctx.createRadialGradient(e.x, e.y, 0, e.x, e.y, e.r);
        g.addColorStop(0, '#ffffff');
        g.addColorStop(0.4, '#ffe680');
        g.addColorStop(1, 'rgba(255,140,40,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        break;
      }
      case 'net': {
        ctx.save();
        ctx.globalAlpha = 1 - u;
        const r = e.r * (0.6 + u * 0.6);
        ctx.beginPath();
        ctx.arc(e.x, e.y, r, 0, Math.PI * 2);
        ctx.strokeStyle = '#f5e6bd';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.beginPath();
        for (let i = -2; i <= 2; i++) {
          ctx.moveTo(e.x - r, e.y + (i * r) / 2.5);
          ctx.lineTo(e.x + r, e.y + (i * r) / 2.5);
          ctx.moveTo(e.x + (i * r) / 2.5, e.y - r);
          ctx.lineTo(e.x + (i * r) / 2.5, e.y + r);
        }
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.restore();
        break;
      }
      case 'tide': {
        ctx.save();
        for (let k = 0; k < 3; k++) {
          const v = u - k * 0.15;
          if (v <= 0 || v >= 1) continue;
          ctx.globalAlpha = (1 - v) * 0.8;
          ctx.beginPath();
          ctx.arc(e.x, e.y, 18 + v * (e.r - 18), 0, Math.PI * 2);
          ctx.strokeStyle = k ? '#bff4ff' : '#3ec6f0';
          ctx.lineWidth = 6 - k * 1.5;
          ctx.stroke();
        }
        ctx.restore();
        break;
      }
      case 'bottle': {
        // Flaschenpost fliegt zum Gegner (nach rechts oben aus dem Bild)
        const x = e.x + u * u * 520, y = e.y - Math.sin(u * Math.PI * 0.9) * 120 - u * 80;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(u * 9);
        E(ctx, 0, 0, 10, 5, 0, '#4cc27a', 1.5, { ol: '#11502c' });
        ctx.fillStyle = '#a0703a';
        ctx.fillRect(9, -2.2, 5, 4.4);
        ctx.fillStyle = '#fff6dc';
        ctx.fillRect(-5, -2, 8, 4);
        ctx.restore();
        break;
      }
      case 'stomp':
        ctx.beginPath();
        ctx.ellipse(e.x, e.y, 10 + u * 8, 6 + u * 4, 0, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(140,110,70,' + 0.4 * (1 - u) + ')';
        ctx.fill();
        break;
      case 'text':
        ctx.save();
        ctx.globalAlpha = Math.min(1, (1 - u) * 2);
        ctx.font = '22px "Luckiest Guy", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.lineWidth = 5;
        ctx.lineJoin = 'round';
        ctx.strokeStyle = '#1b1208';
        ctx.strokeText(e.txt, e.x, e.y - u * 26);
        ctx.fillStyle = e.c;
        ctx.fillText(e.txt, e.x, e.y - u * 26);
        ctx.restore();
        break;
    }
  }

  function drawCrate(ctx, c, time) {
    const u = Math.min(1, c.t / 0.4);
    const x = SC.lerp(c.x0, c.tx, u), y = SC.lerp(c.y0, c.ty, u) - Math.sin(u * Math.PI) * 26;
    const bob = u >= 1 ? Math.sin(c.t * 6) * 1.5 : 0;
    const e = SC.spr.getShadowed('crate' + c.kind, 30, (k) => {
      if (c.kind === 'pearl') {
        C(k, 0, 0, 8, '#fdf7ff', 1.8, { ol: '#9a8aa8' });
        gloss(k, -2.5, -2.5, 3, 1.5, 0.9);
      } else if (c.kind === 'coin') {
        C(k, 0, 0, 9, '#ffd23f', 2);
        k.beginPath();
        k.arc(0, 0, 5.5, 0, Math.PI * 2);
        k.strokeStyle = '#c89b10';
        k.lineWidth = 1.5;
        k.stroke();
        gloss(k, -3, -3, 3, 1.5, 0.9);
      } else {
        k.beginPath();
        k.roundRect(-10, -8, 20, 16, 3);
        shade(k, '#c08040', 0, 0, 12, 2);
        k.beginPath();
        k.moveTo(-10, 0);
        k.lineTo(10, 0);
        k.strokeStyle = 'rgba(60,30,10,0.4)';
        k.lineWidth = 1.5;
        k.stroke();
        k.beginPath();
        k.arc(0, -0.5, 4.2, Math.PI * 0.2, Math.PI * 1.5);
        k.strokeStyle = '#ff7a5c';
        k.lineWidth = 2.6;
        k.lineCap = 'round';
        k.stroke();
      }
    }, 2);
    SC.spr.blit(ctx, e, x, y + bob, 0);
  }
})();
