'use strict';
// ============================================================
//  TÜRME – Krebse mit sichtbaren Veränderungen je Upgrade-Stufe
//  lokale Koordinaten, Blick nach +x, Körper ~ Radius 18
//  (nutzt die Schattierungs-Helfer aus draw.js)
// ============================================================
(function () {
  const { LT, DK, shade, E, C, gloss, stroke3, leg, eye, claw, shadowBlob, aura, star, crown } = SC.art;
  const T = {};
  SC.TOWER_ART = T;

  T.knall = function (ctx, A, B, atk) {
    const body = B >= 4 ? '#c71f35' : B >= 1 ? '#ff5f2e' : '#ff8a3d';
    if (A >= 4) aura(ctx, 34, 'rgba(90,200,255,A)', 0.5);
    if (B >= 4) aura(ctx, 34, 'rgba(255,190,40,A)', 0.55);
    for (const y of [-6, 0, 6]) E(ctx, -29, y, 6, 3.4, y * 0.09, LT(body, 0.1), 1.6);
    for (let i = 0; i < 3; i++) {
      leg(ctx, -3 + i * 5, 6, 1.6, 10, LT(body, 0.25), 1.6, 0.4);
      leg(ctx, -3 + i * 5, -6, -1.6, 10, LT(body, 0.25), 1.6, -0.4);
    }
    for (let i = 0; i < 3; i++) {
      E(ctx, -22 + i * 6.5, 0, 7, 6.4 + i * 0.6, 0, body, 1.8);
      if (B >= 4) E(ctx, -22 + i * 6.5, 0, 3.6, 4.6, 0, '#ffcf2e', 1.2);
    }
    E(ctx, 4, 0, 13, 9, 0, body, 2.2);
    gloss(ctx, 1, -4, 7, 2.6, 0.7, 0);
    ctx.beginPath();
    ctx.moveTo(15, -3);
    ctx.bezierCurveTo(26, -14, 34, -12, 40, -5);
    ctx.moveTo(15, 3);
    ctx.bezierCurveTo(26, 14, 34, 12, 40, 5);
    stroke3(ctx, 1.1, '#ffb27a');
    eye(ctx, 14, -6, 4.2, [10, -3], { stalk: body, lid: 1 });
    eye(ctx, 14, 6, 4.2, [10, 3], { stalk: body, lid: -1 });
    if (A >= 3) {
      ctx.beginPath();
      ctx.roundRect(11, -11, 8, 22, 3);
      ctx.globalAlpha = 0.75;
      shade(ctx, '#38c6ff', 15, 0, 11, 1.6);
      ctx.globalAlpha = 1;
      gloss(ctx, 14, -5, 2, 4, 0.8, 0);
    }
    claw(ctx, 14, -9, -0.35, 5, body, 0.25);
    const s = 11 + (A >= 2 ? 2 : 0) + (A >= 4 ? 2.5 : 0) + (B >= 3 ? 1 : 0);
    const cc = A >= 4 ? '#ffcb2e' : B >= 3 ? '#ffd23f' : B >= 1 ? '#ff3b1f' : '#e8442e';
    claw(ctx, 12, 11, 0.22, s, cc, atk ? 0 : 0.5, { band: A >= 1 ? '#ffe14d' : null, tips: B >= 2 ? '#fff1a8' : null });
    if (B >= 2) {
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        const x = 8 + i * 5, y = 11 + s * 0.45;
        ctx.moveTo(x - 2, y);
        ctx.lineTo(x, y + 5 + (i % 2) * 2);
        ctx.lineTo(x + 2, y);
        ctx.closePath();
        shade(ctx, '#ffb02e', x, y + 2, 4, 1);
      }
    }
    if (A >= 2 || B >= 3) {
      ctx.save();
      ctx.globalAlpha = 0.85;
      for (let i = 0; i < (A >= 2 ? 2 : 1); i++) {
        ctx.beginPath();
        ctx.arc(12 + s * 1.6, 13, 6 + i * 5, -0.9, 0.9);
        ctx.strokeStyle = B >= 3 ? '#fff2a8' : '#8fe3ff';
        ctx.lineWidth = 2.2;
        ctx.stroke();
      }
      ctx.restore();
    }
    if (atk) star(ctx, 12 + s * 1.5, 13, 9, 4, 8, B >= 1 ? '#fff1a8' : '#ffffff', 1.4);
  };

  T.fang = function (ctx, A, B, atk) {
    if (B >= 4) {
      const rb = ['#ff4d4d', '#ff9f2e', '#ffe14d', '#4fd34a', '#3aa8ff', '#9a5cff'];
      for (let i = 0; i < 6; i++) {
        ctx.beginPath();
        ctx.arc(0, 0, 30 - i * 1.6, 0, Math.PI * 2);
        ctx.strokeStyle = rb[i];
        ctx.globalAlpha = 0.55;
        ctx.lineWidth = 1.7;
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }
    if (A >= 4) aura(ctx, 32, 'rgba(255,215,60,A)', 0.5);
    E(ctx, -30, -6, 7, 3.6, -0.45, '#ff5a36', 1.6);
    E(ctx, -30, 6, 7, 3.6, 0.45, '#ff5a36', 1.6);
    E(ctx, -29, 0, 6, 3.2, 0, '#2a6fdb', 1.6);
    const cols = ['#2a6fdb', '#2a8fd0', '#22ae9a', '#2fbf71', '#4fcf5e'];
    const rb2 = ['#ff4d4d', '#ffe14d', '#3aa8ff', '#ff9f2e', '#9a5cff'];
    for (let i = 0; i < 5; i++) {
      E(ctx, -22 + i * 6.4, 0, 6, 8, 0, cols[i], 1.8);
      if (A >= 4 && i > 0) E(ctx, -22 + i * 6.4, 0, 3.6, 6, 0, '#ffcb2e', 1.2);
      if (B >= 3) {
        ctx.beginPath();
        ctx.moveTo(-24 + i * 6.4, -6);
        ctx.lineTo(-24 + i * 6.4, 6);
        ctx.strokeStyle = rb2[i];
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }
    E(ctx, 11, 0, 8, 7, 0, '#56d36b', 2);
    gloss(ctx, 9, -3, 4, 1.8, 0.7, 0);
    const ext = atk ? 14 : 0;
    const spear = B >= 1;
    const armC = spear ? '#e9eef2' : '#ff7a2e';
    for (const sy of [-1, 1]) {
      const r = sy === 1 ? ext : ext * 0.5;
      ctx.beginPath();
      ctx.moveTo(10, sy * 5);
      ctx.lineTo(20 + r, sy * 8);
      stroke3(ctx, 4.2, armC);
      if (spear) {
        ctx.beginPath();
        ctx.moveTo(30 + r, sy * 8);
        ctx.lineTo(20 + r, sy * 8 - 3);
        ctx.lineTo(20 + r, sy * 8 + 3);
        ctx.closePath();
        shade(ctx, '#ff7a2e', 24 + r, sy * 8, 5, 1.4);
      } else {
        const club = A >= 1 ? 5.2 + A * 0.5 : 4.4;
        const cc = A >= 4 ? '#ffcb2e' : A >= 1 ? '#d6332a' : '#ff7a2e';
        C(ctx, 22 + r, sy * 8, club, cc, 1.8);
        if (A >= 2) {
          ctx.beginPath();
          ctx.arc(22 + r, sy * 8, club * 0.75, 0, Math.PI * 2);
          ctx.strokeStyle = '#c9d2db';
          ctx.lineWidth = 1.6;
          ctx.stroke();
        }
        if (A >= 3) {
          ctx.beginPath();
          ctx.arc(22 + r, sy * 8, club + 2.5, 0, Math.PI * 2);
          ctx.strokeStyle = 'rgba(140,230,255,0.85)';
          ctx.lineWidth = 2;
          ctx.stroke();
        }
        gloss(ctx, 20.5 + r, sy * 8 - 2, club * 0.5, club * 0.25, 0.8, 0);
      }
    }
    const er = B >= 2 ? 5 : 4.2;
    for (const sy of [-1, 1]) eye(ctx, 18, sy * 9, er, [13, sy * 3], { stalk: '#56d36b', iris: B >= 2 ? '#ff4dc4' : '#22c49a', lid: sy });
    if (atk && !spear) star(ctx, 36, 8, 8, 3.5, 7, '#ffffff', 1.2);
  };

  T.einsiedler = function (ctx, A, B) {
    if (A >= 4) aura(ctx, 32, 'rgba(255,215,60,A)', 0.5);
    if (B >= 4) aura(ctx, 36, 'rgba(120,255,190,A)', 0.4);
    const red = '#e8493a';
    for (let i = 0; i < 2; i++) {
      leg(ctx, 7 + i * 5, 7, 1.15, 11, red, 2.2, 0.5);
      leg(ctx, 7 + i * 5, -7, -1.15, 11, red, 2.2, -0.5);
    }
    if (B >= 3) {
      const ghost = B >= 4;
      if (ghost) ctx.globalAlpha = 0.92;
      ctx.beginPath();
      ctx.moveTo(-32, -14);
      ctx.lineTo(6, -16);
      ctx.quadraticCurveTo(20, 0, 6, 16);
      ctx.lineTo(-32, 14);
      ctx.closePath();
      shade(ctx, ghost ? '#4fbf8f' : '#8a5a30', -12, 0, 24, 2.4, ghost ? { ol: '#0f4a36' } : null);
      ctx.globalAlpha = 1;
      for (let i = -26; i < 4; i += 7) {
        ctx.beginPath();
        ctx.moveTo(i, -13);
        ctx.lineTo(i, 13);
        ctx.strokeStyle = ghost ? 'rgba(10,70,50,0.35)' : 'rgba(60,30,10,0.4)';
        ctx.lineWidth = 1.4;
        ctx.stroke();
      }
      if (ghost) {
        E(ctx, -12, 0, 12, 9, 0, '#d8fff3', 1.6, { ol: '#0f4a36' });
        ctx.beginPath();
        ctx.moveTo(-12, -9);
        ctx.lineTo(-12, 9);
        stroke3(ctx, 2.4, '#6b4a2a');
      } else {
        ctx.beginPath();
        ctx.moveTo(-10, 0);
        ctx.lineTo(10, 0);
        stroke3(ctx, 5, '#3d3d44');
        C(ctx, -11, 0, 5, '#4a4a52', 1.6);
      }
    } else if (B >= 2) {
      E(ctx, -9, 0, 16, 11, 0, '#4cc27a', 2.2, { ol: '#11502c' });
      ctx.beginPath();
      ctx.roundRect(4, -4.5, 10, 9, 2);
      shade(ctx, '#4cc27a', 9, 0, 6, 2, { ol: '#11502c' });
      E(ctx, 15, 0, 2.5, 5, 0, '#c9a66b', 1.4);
      gloss(ctx, -12, -5, 9, 2.8, 0.85, 0);
    } else if (B >= 1) {
      E(ctx, -7, 0, 15, 13, 0, '#b9c3cf', 2.2);
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(-7, 0, 15, 13, 0, 0, Math.PI * 2);
      ctx.clip();
      ctx.beginPath();
      ctx.rect(-14, -14, 10, 28);
      shade(ctx, '#e0393f', -9, 0, 14, 0);
      ctx.restore();
      E(ctx, 7, 0, 3.2, 12, 0, '#e8edf2', 1.6);
    } else {
      const sc = A >= 4 ? '#ffcb2e' : A >= 3 ? '#f2b6a0' : '#efcf95';
      if (A >= 3) {
        for (let i = 0; i < 7; i++) {
          const a = (i / 7) * Math.PI * 2;
          ctx.beginPath();
          ctx.moveTo(-6 + Math.cos(a - 0.2) * 12, Math.sin(a - 0.2) * 12);
          ctx.lineTo(-6 + Math.cos(a) * 18, Math.sin(a) * 18);
          ctx.lineTo(-6 + Math.cos(a + 0.2) * 12, Math.sin(a + 0.2) * 12);
          ctx.closePath();
          shade(ctx, sc, -6 + Math.cos(a) * 14, Math.sin(a) * 14, 5, 1.4);
        }
      }
      C(ctx, -6, 0, 14, sc, 2.2);
      ctx.beginPath();
      for (let a = 0; a < 12.5; a += 0.25) {
        const r = 12 - a * 0.9;
        ctx.lineTo(-6 + Math.cos(a) * r, Math.sin(a) * r);
      }
      ctx.strokeStyle = DK(sc, 0.45);
      ctx.lineWidth = 2;
      ctx.stroke();
      if (A >= 1) {
        for (let i = 0; i < 3; i++) {
          ctx.beginPath();
          ctx.arc(-6, 0, 5 + i * 3.5, 0.3 + i, 1.4 + i);
          ctx.strokeStyle = '#c0573a';
          ctx.lineWidth = 1.6;
          ctx.stroke();
        }
      }
      gloss(ctx, -11, -6, 6, 3, 0.75);
    }
    E(ctx, 11, 0, 8, 8, 0, red, 2);
    gloss(ctx, 9, -3, 4, 1.8, 0.7, 0);
    claw(ctx, 16, 7, 0.35, 7, red, 0.35);
    claw(ctx, 16, -6, -0.35, 5, red, 0.3);
    if (A >= 2 && B < 3) C(ctx, 27, 9, 4.5, A >= 4 ? '#ffcb2e' : '#efcf95', 1.4);
    eye(ctx, 19, -4.5, 3.8, [14, -2], { stalk: red, lid: 1 });
    eye(ctx, 19, 4.5, 3.8, [14, 2], { stalk: red, lid: -1 });
  };

  T.kokos = function (ctx, A, B, atk) {
    if (A >= 4) aura(ctx, 34, 'rgba(120,255,120,A)', 0.4);
    if (B >= 4) aura(ctx, 34, 'rgba(255,120,40,A)', 0.55);
    const legC = '#e5783a';
    for (let i = 0; i < 3; i++) {
      leg(ctx, -5 + i * 6, 10, 1.25 + i * 0.12, 17, legC, 3.2, 0.6);
      leg(ctx, -5 + i * 6, -10, -1.25 - i * 0.12, 17, legC, 3.2, -0.6);
    }
    if (A >= 3) {
      for (let i = 0; i < 6; i++) {
        const a = Math.PI + (i - 2.5) * 0.45;
        ctx.beginPath();
        ctx.moveTo(-6, 0);
        ctx.quadraticCurveTo(-6 + Math.cos(a) * 12 + 3, Math.sin(a) * 12, -6 + Math.cos(a) * 22, Math.sin(a) * 22);
        stroke3(ctx, 4.5, A >= 4 ? '#ffcb2e' : '#3fae4a');
      }
    }
    const shell = B >= 1 ? '#4a3fb0' : '#6b5bd6';
    E(ctx, -2, 0, 16, 14, 0, shell, 2.6);
    E(ctx, -4, 0, 9, 8, 0, LT(shell, 0.2), 0);
    gloss(ctx, -6, -6, 8, 3, 0.65, -0.3);
    claw(ctx, 12, -10, -0.3, 9.5, legC, 0.25);
    claw(ctx, 12, 10, 0.3, 7.5, legC, 0.25);
    eye(ctx, 13, -4.5, 4, [8, -2], { stalk: shell, lid: 1 });
    eye(ctx, 13, 4.5, 4, [8, 2], { stalk: shell, lid: -1 });
    if (!atk) {
      const r = B >= 3 ? 11 : A >= 1 ? 8.5 : 7.5;
      if (B >= 4) {
        for (let i = 0; i < 5; i++) {
          ctx.beginPath();
          const a = Math.PI + (i - 2) * 0.35;
          ctx.moveTo(24, 0);
          ctx.quadraticCurveTo(24 + Math.cos(a) * r * 1.4, Math.sin(a) * r * 1.4 + 2, 24 + Math.cos(a) * r * 2, Math.sin(a) * r * 2);
          ctx.strokeStyle = i % 2 ? '#ffd23f' : '#ff6a2a';
          ctx.lineWidth = 4;
          ctx.lineCap = 'round';
          ctx.stroke();
        }
      }
      C(ctx, 24, 0, r, B >= 1 ? '#5e3a1c' : '#7b4a22', 2.2);
      for (let i = 0; i < 3; i++) C(ctx, 24 + Math.cos(i * 2.1) * r * 0.35, Math.sin(i * 2.1) * r * 0.35, r * 0.13, '#2b190a', 0);
      if (B >= 1) {
        ctx.beginPath();
        ctx.arc(24, 0, r * 0.82, 0, Math.PI * 2);
        ctx.strokeStyle = '#c9d2db';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
      if (B >= 2) for (let i = 0; i < 3; i++) E(ctx, 24 + (i - 1) * 4, r * 0.9 + 1, 1.8, 3, 0, '#ffffff', 1);
      if (A >= 2) {
        ctx.beginPath();
        ctx.moveTo(24 - r * 0.6, -r * 0.2);
        ctx.lineTo(24, r * 0.1);
        ctx.lineTo(24 + r * 0.5, -r * 0.4);
        ctx.strokeStyle = '#f6e7c8';
        ctx.lineWidth = 1.6;
        ctx.stroke();
      }
      if (A >= 4) C(ctx, 24, 0, r * 0.4, '#ffcb2e', 1.2);
      gloss(ctx, 22, -r * 0.4, r * 0.4, r * 0.2, 0.5);
    }
  };

  T.pocke = function (ctx, A, B, atk, f) {
    if (A >= 4) aura(ctx, 34, 'rgba(255,140,190,A)', 0.45);
    if (B >= 4) aura(ctx, 34, 'rgba(180,90,255,A)', 0.45);
    const base = A >= 4 ? '#ff7fb0' : A >= 3 ? '#ff9ab8' : A >= 2 ? '#a9b8ca' : '#e6dfcd';
    const pos = [[-10, -8, 8.5], [9, -9, 7.5], [0, 7, 9.5], [-13, 9, 6.5], [13, 8, 7], [0, -17, 5.5], [-19, -1, 5.5], [19, -1, 5.5]];
    const n = 5 + Math.min(3, A);
    if (A >= 4) {
      for (let i = 0; i < 5; i++) {
        const a = -Math.PI / 2 + (i - 2) * 0.4;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(a) * 30, Math.sin(a) * 30);
        stroke3(ctx, 3, '#ff5d8f');
      }
    }
    for (let i = 0; i < n; i++) {
      const [x, y, r] = pos[i];
      ctx.beginPath();
      for (let k = 0; k < 7; k++) {
        const a = (k / 7) * Math.PI * 2;
        ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
      }
      ctx.closePath();
      shade(ctx, base, x, y, r, 1.8);
      for (let k = 0; k < 7; k += 2) {
        const a = (k / 7) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(x + Math.cos(a) * r * 0.45, y + Math.sin(a) * r * 0.45);
        ctx.lineTo(x + Math.cos(a) * r * 0.95, y + Math.sin(a) * r * 0.95);
        ctx.strokeStyle = 'rgba(0,0,0,0.18)';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
      const mine = B >= 3 && i === 0;
      C(ctx, x, y, r * 0.48, mine ? '#e83a2e' : '#5b4a3a', 1.4);
      if (B >= 4 && i % 2) C(ctx, x + r * 0.5, y - r * 0.3, 1.6, '#b25cff', 0);
      if (atk || (f + i) % 2 === 0) {
        for (let k = -1; k <= 1; k++) {
          const a = -Math.PI / 2 + k * 0.45 + (f ? 0.15 : -0.15);
          ctx.beginPath();
          ctx.moveTo(x, y);
          const L = r * (B >= 1 ? 1.9 : 1.5);
          ctx.quadraticCurveTo(x + Math.cos(a) * L * 0.6, y + Math.sin(a) * L * 0.8, x + Math.cos(a) * L + 2, y + Math.sin(a) * L);
          ctx.strokeStyle = B >= 2 ? '#ffd166' : '#fff6e6';
          ctx.lineWidth = 1.4;
          ctx.lineCap = 'round';
          ctx.stroke();
        }
      }
      gloss(ctx, x - r * 0.35, y - r * 0.4, r * 0.35, r * 0.18, 0.6);
    }
  };

  T.winker = function (ctx, A, B, atk, f, dance) {
    if (A >= 4) aura(ctx, 34, 'rgba(255,111,181,A)', 0.5);
    if (B >= 4) aura(ctx, 34, 'rgba(255,210,63,A)', 0.5);
    const body = '#2fa7c9';
    if (B >= 3) {
      ctx.beginPath();
      ctx.moveTo(4, -10);
      ctx.quadraticCurveTo(-26, -20, -28, 0);
      ctx.quadraticCurveTo(-26, 20, 4, 10);
      ctx.closePath();
      shade(ctx, B >= 4 ? '#7b2fd6' : '#d6332a', -12, 0, 20, 2);
    }
    for (let i = 0; i < 3; i++) {
      leg(ctx, -4 + i * 5, 8, 1.35, 12, '#2790b3', 2.2, 0.5);
      leg(ctx, -4 + i * 5, -8, -1.35, 12, '#2790b3', 2.2, -0.5);
    }
    E(ctx, 0, 0, 12, 10, 0, body, 2.2);
    E(ctx, -1, 0, 6, 5, 0, LT(body, 0.25), 0);
    gloss(ctx, -3, -4, 6, 2.4, 0.7, -0.2);
    if (B >= 2) {
      E(ctx, 2, 0, 9, 8.5, 0, '#aab4be', 1.8);
      gloss(ctx, 0, -3, 5, 2, 0.8, 0);
    }
    claw(ctx, 10, -7, -0.35, 4.5, body, 0.2);
    eye(ctx, 17, -6, 4, [9, -3], { stalk: body, lid: 1 });
    eye(ctx, 17, 6, 4, [9, 3], { stalk: body, lid: -1 });
    if (B >= 1 && B < 4) {
      ctx.beginPath();
      ctx.roundRect(14, -10, 6, 20, 2.5);
      shade(ctx, '#1c1c24', 17, 0, 10, 1.4);
      gloss(ctx, 16, -6, 1.6, 3, 0.7, 0);
    }
    if (A >= 4 || B >= 4) crown(ctx, -2, 0, 6.5, Math.PI / 2);
    const wave = dance ? (f ? 1.5 : 0.3) : f ? 1.05 : 0.7;
    const cc = A >= 4 ? '#ffcb2e' : A >= 3 ? '#ff6fb5' : '#ffb02e';
    claw(ctx, 8, 11, wave, 16 + Math.min(A, 2) * 1.5, cc, 0.35, { band: A >= 1 ? '#ffffff' : null });
    if (A >= 2) {
      const fx = 8 + Math.cos(wave) * 30, fy = 11 + Math.sin(wave) * 30;
      ctx.beginPath();
      ctx.moveTo(fx, fy);
      ctx.lineTo(fx + 10, fy - 4);
      ctx.lineTo(fx + 2, fy - 9);
      ctx.closePath();
      shade(ctx, '#ff4d4d', fx + 4, fy - 4, 6, 1.4);
    }
  };

  T.yeti = function (ctx, A, B) {
    if (A >= 4) aura(ctx, 34, 'rgba(255,120,40,A)', 0.5);
    if (B >= 4) aura(ctx, 36, 'rgba(150,230,255,A)', 0.6);
    for (let i = 0; i < 3; i++) {
      leg(ctx, -6 + i * 6, 9, 1.35, 14, '#efe9de', 3.2, 0.5);
      leg(ctx, -6 + i * 6, -9, -1.35, 14, '#efe9de', 3.2, -0.5);
    }
    if (A >= 3) {
      ctx.beginPath();
      ctx.moveTo(-30, -8);
      ctx.lineTo(-22, -6);
      ctx.lineTo(-20, 6);
      ctx.lineTo(-32, 8);
      ctx.closePath();
      shade(ctx, '#3a3330', -26, 0, 10, 1.8);
      for (let i = 0; i < (A >= 4 ? 4 : 2); i++) C(ctx, -30 - i * 3, -2 + (i % 2) * 4, 3.5 + i * 0.8, i % 2 ? '#6b6461' : '#4a4441', 1);
    }
    ctx.lineCap = 'round';
    for (let i = 0; i < 40; i++) {
      const a = (i / 40) * Math.PI * 2;
      const r2 = 18 + (i % 3) * 1.6 + (A >= 1 ? 1.5 : 0);
      const warm = A >= 3 && i % 3 === 0;
      const icy = A === 2 && i % 2 === 0;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * 12, Math.sin(a) * 10);
      ctx.lineTo(Math.cos(a + 0.05) * r2, Math.sin(a + 0.05) * r2 * 0.85);
      ctx.strokeStyle = warm ? '#ff7a3d' : icy ? '#8fdcff' : '#d9d2c3';
      ctx.lineWidth = 2.6;
      ctx.stroke();
    }
    E(ctx, 0, 0, 15, 12, 0, '#f6f2ea', 2.2, { ol: '#7d7466' });
    if (B >= 1) for (let i = 0; i < 2 + B * 2; i++) C(ctx, -8 + ((i * 7) % 16), -6 + ((i * 5) % 12), 1.6, '#5fd36a', 0.8);
    gloss(ctx, -4, -5, 7, 3, 0.8, -0.3);
    claw(ctx, 13, 9, 0.4, 8.5, '#f1ece2', 0.3);
    claw(ctx, 13, -9, -0.4, 8.5, '#f1ece2', 0.3);
    eye(ctx, 15, -4, 3.5, [10, -2], { stalk: '#efe9de', lid: 1 });
    eye(ctx, 15, 4, 3.5, [10, 2], { stalk: '#efe9de', lid: -1 });
    if (B >= 3) {
      const n = B >= 4 ? 10 : 6;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + 0.3;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a - 0.15) * 13, Math.sin(a - 0.15) * 11);
        ctx.lineTo(Math.cos(a) * (B >= 4 ? 25 : 21), Math.sin(a) * (B >= 4 ? 22 : 18));
        ctx.lineTo(Math.cos(a + 0.15) * 13, Math.sin(a + 0.15) * 11);
        ctx.closePath();
        shade(ctx, '#bfefff', Math.cos(a) * 16, Math.sin(a) * 14, 6, 1.2, { ol: '#4d8fb3' });
      }
    }
  };

  T.spinne = function (ctx, A, B, atk, f) {
    if (A >= 4) aura(ctx, 38, 'rgba(255,215,60,A)', 0.45);
    const L = 22 + (A >= 1 ? 6 : 0) + (atk ? 4 : 0);
    const col = B >= 4 ? '#8a7f74' : B >= 1 ? '#c4cad1' : '#ee8a3c';
    for (let i = 0; i < 4; i++) {
      const a = 0.75 + i * 0.5;
      const w = (f ? 0.06 : -0.06) * (A >= 3 ? 2 : 1);
      leg(ctx, -2 + i * 2, 5, a + w, L, col, 2.3, 0.65);
      leg(ctx, -2 + i * 2, -5, -a - w, L, col, 2.3, -0.65);
      const kx = -2 + i * 2 + Math.cos(a + w) * L * 0.55, ky = 5 + Math.sin(a + w) * L * 0.55;
      if (A >= 2) {
        C(ctx, kx, ky, 1.6, '#ffffff', 0.8);
        C(ctx, kx, -ky, 1.6, '#ffffff', 0.8);
      }
      if (A >= 4) {
        const ex = kx + Math.cos(a + w + 0.65) * L * 0.5, ey = ky + Math.sin(a + w + 0.65) * L * 0.5;
        C(ctx, ex, ey, 2, '#ffcb2e', 0.8);
        C(ctx, ex, -ey, 2, '#ffcb2e', 0.8);
      }
    }
    const br = B >= 3 ? 13 : 10.5;
    if (B >= 3) {
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a - 0.2) * br, Math.sin(a - 0.2) * br);
        ctx.lineTo(Math.cos(a) * (br + 5), Math.sin(a) * (br + 5));
        ctx.lineTo(Math.cos(a + 0.2) * br, Math.sin(a + 0.2) * br);
        ctx.closePath();
        shade(ctx, '#d65a24', Math.cos(a) * br, Math.sin(a) * br, 4, 1);
      }
    }
    E(ctx, 0, 0, br, br * 0.9, 0, B >= 4 ? '#9a8a78' : '#e26b2c', 2.2);
    for (let i = 0; i < 5; i++) C(ctx, -5 + (i % 3) * 4, -3 + Math.floor(i / 3) * 5, 1.5, B >= 4 ? '#5a5048' : '#ffe3c4', 0);
    if (B >= 2) {
      for (let i = 0; i < 5; i++) {
        ctx.beginPath();
        ctx.moveTo(-6 + i * 3, -2);
        ctx.quadraticCurveTo(-9 + i * 3, -8, -6 + i * 3, -13);
        stroke3(ctx, 2.2, '#3fae4a');
      }
    }
    gloss(ctx, -3, -4, 5, 2, 0.7, -0.3);
    leg(ctx, 8, 4, 0.3, 20, col, 2.2, -0.25);
    leg(ctx, 8, -4, -0.3, 20, col, 2.2, 0.25);
    eye(ctx, 11, -3.5, 3.2, [7, -1.5], { stalk: '#e26b2c', lid: 1 });
    eye(ctx, 11, 3.5, 3.2, [7, 1.5], { stalk: '#e26b2c', lid: -1 });
  };

  T.krill = function (ctx, A, B, atk, f) {
    const glow = A >= 2;
    if (A >= 4) {
      const cs = ['rgba(150,120,255,0.6)', 'rgba(90,220,255,0.6)', 'rgba(255,140,220,0.5)'];
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.arc(0, 0, 20 + i * 5, i, i + 3.5);
        ctx.strokeStyle = cs[i];
        ctx.lineWidth = 3;
        ctx.stroke();
      }
    }
    if (glow) aura(ctx, 26, 'rgba(90,230,255,A)', 0.55);
    E(ctx, 0, 2, 14, 11, 0, '#7f8a96', 2);
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2;
      const sw = f ? 3 : -3;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * 6, Math.sin(a) * 6);
      ctx.quadraticCurveTo(Math.cos(a) * 12 + sw, Math.sin(a) * 12, Math.cos(a) * 20, Math.sin(a) * 20 + sw);
      stroke3(ctx, 3.6, B >= 1 ? '#4f9a3a' : '#6aa83a');
    }
    C(ctx, 0, 0, 8, glow ? '#5fe3ff' : '#ffb3a7', 2);
    gloss(ctx, -2.5, -3, 3.5, 1.8, 0.85);
    if (B >= 3) {
      ctx.beginPath();
      ctx.moveTo(-14, 12);
      ctx.lineTo(-4, 8);
      ctx.lineTo(-6, 16);
      ctx.closePath();
      shade(ctx, '#f5e1c0', -8, 12, 6, 1.4);
    }
  };

  // Garnelenfarm: große Holzplattform mit Zuchtbecken, Hütte und Ausbauten
  T.farm = function (ctx, A, B, atk, f) {
    const wood = A >= 3 ? '#d9a63a' : '#b07a42';
    // Pfähle
    for (const [x, y] of [[-38, -28], [38, -28], [-38, 28], [38, 28], [0, 30], [0, -30]]) C(ctx, x, y, 4.2, '#6b4422', 1.6);
    // Plattform (Planken)
    ctx.beginPath();
    ctx.roundRect(-40, -30, 80, 60, 7);
    shade(ctx, wood, 0, 0, 46, 2.6, { hi: 0.3, lo: 0.25 });
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(-40, -30, 80, 60, 7);
    ctx.clip();
    for (let y = -24; y < 30; y += 7.5) {
      ctx.beginPath();
      ctx.moveTo(-40, y);
      ctx.lineTo(40, y);
      ctx.strokeStyle = 'rgba(70,40,15,0.35)';
      ctx.lineWidth = 1.2;
      ctx.stroke();
      for (let x = -36 + ((y * 3) % 17); x < 40; x += 26) {
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x, y + 7.5);
        ctx.stroke();
      }
    }
    ctx.restore();
    // Zuchtbecken
    const ponds = A >= 4 ? [[-25, -14, 22, 18], [1, -14, 22, 18], [-25, 8, 22, 18], [1, 8, 22, 18]] : A >= 1 ? [[-34, -20, 22, 20], [-10, -20, 22, 20], [-22, 4, 22, 20]] : [[-33, -18, 24, 20], [-7, -18, 24, 20]];
    const rim = A >= 3 ? '#ffcf2e' : '#8a8f98';
    ponds.forEach(([x, y, w, h], i) => {
      ctx.beginPath();
      ctx.roundRect(x - 1.5, y - 1.5, w + 3, h + 3, 5);
      shade(ctx, rim, x + w / 2, y + h / 2, w * 0.7, 1.8);
      ctx.beginPath();
      ctx.roundRect(x + 1.5, y + 1.5, w - 3, h - 3, 3.5);
      const g = ctx.createLinearGradient(0, y, 0, y + h);
      g.addColorStop(0, '#7fe0ff');
      g.addColorStop(1, '#1f86c0');
      ctx.fillStyle = g;
      ctx.fill();
      // Garnelen im Becken
      for (let k = 0; k < 2; k++) {
        const sx = x + 6 + k * 9 + (f ? 1.5 : -1.5) * (k ? 1 : -1), sy = y + 7 + ((i + k) % 2) * 6;
        ctx.beginPath();
        ctx.arc(sx, sy, 2.8, Math.PI * 0.2, Math.PI * 1.55);
        ctx.strokeStyle = '#9a2a14';
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.stroke();
        ctx.strokeStyle = '#ff8a5c';
        ctx.lineWidth = 1.8;
        ctx.stroke();
      }
      gloss(ctx, x + w * 0.35, y + 4.5, w * 0.25, 1.5, 0.75, 0);
      if (A >= 2) {
        // Sprudler
        for (let k = 0; k < 3; k++) C(ctx, x + w - 5, y + h - 5 - k * 3.5 - (f ? 1.5 : 0), 1 + k * 0.3, '#e8fbff', 0.6, { ol: '#5ab8e0' });
      }
    });
    // springende Garnele
    if (f) {
      const [x, y, w] = ponds[0];
      ctx.save();
      ctx.translate(x + w / 2, y - 3);
      ctx.rotate(-0.6);
      ctx.beginPath();
      ctx.arc(0, 0, 4.2, Math.PI * 0.15, Math.PI * 1.6);
      ctx.strokeStyle = '#9a2a14';
      ctx.lineWidth = 4;
      ctx.stroke();
      ctx.strokeStyle = '#ff9a6a';
      ctx.lineWidth = 2.6;
      ctx.stroke();
      ctx.restore();
      for (let k = 0; k < 3; k++) C(ctx, x + w / 2 - 4 + k * 4, y + 3, 1.2, '#ffffff', 0);
    }
    if (A >= 2 && A < 4) {
      // Rohrleitungen
      ctx.beginPath();
      ctx.moveTo(-23, 2);
      ctx.lineTo(-23, 4);
      ctx.moveTo(12, 0);
      ctx.lineTo(18, 0);
      stroke3(ctx, 2.6, '#9fb0c0');
    }
    // Hütte (oben rechts) bzw. Ausbauten Pfad B
    const hx = A >= 4 ? 30 : 24, hy = A >= 4 ? -2 : -10;
    if (B >= 4) {
      // Tresor-Gebäude mit goldener Kuppel
      ctx.beginPath();
      ctx.roundRect(hx - 13, hy - 6, 26, 24, 3);
      shade(ctx, '#e8e2d2', hx, hy + 6, 16, 2);
      ctx.beginPath();
      ctx.arc(hx, hy - 6, 13, Math.PI, 0);
      ctx.closePath();
      shade(ctx, '#ffcf2e', hx, hy - 10, 13, 2);
      C(ctx, hx, hy + 8, 6, '#7d8894', 1.6);
      C(ctx, hx, hy + 8, 2, '#3a3f46', 0);
    } else {
      ctx.beginPath();
      ctx.roundRect(hx - 11, hy - 4, 22, 20, 2);
      shade(ctx, '#e9d8b0', hx, hy + 6, 14, 2);
      ctx.beginPath();
      ctx.moveTo(hx - 14, hy - 2);
      ctx.lineTo(hx, hy - 13);
      ctx.lineTo(hx + 14, hy - 2);
      ctx.closePath();
      shade(ctx, '#d6332a', hx, hy - 6, 14, 2);
      ctx.beginPath();
      ctx.roundRect(hx - 3.5, hy + 6, 7, 10, 1.5);
      shade(ctx, '#7a4a20', hx, hy + 11, 5, 1.2);
      // Schild mit Garnele
      ctx.beginPath();
      ctx.arc(hx, hy - 3, 2.6, Math.PI * 0.2, Math.PI * 1.5);
      ctx.strokeStyle = '#ff8a5c';
      ctx.lineWidth = 1.8;
      ctx.stroke();
    }
    if (B >= 1) {
      // Perlmuschel-Beet (unten)
      for (let i = 0; i < 3; i++) {
        const x = 2 + i * 11, y = 22;
        ctx.beginPath();
        ctx.arc(x, y, 5.5, Math.PI, 0);
        ctx.closePath();
        shade(ctx, '#f7c9d9', x, y - 2, 6, 1.4);
        C(ctx, x, y - 1.5, 2.1, '#ffffff', 1, { ol: '#b9a6c2' });
      }
    }
    if (B >= 2) {
      // Marktstand
      ctx.beginPath();
      ctx.moveTo(-40, 14);
      ctx.lineTo(-14, 14);
      ctx.lineTo(-17, 30);
      ctx.lineTo(-37, 30);
      ctx.closePath();
      shade(ctx, '#ffffff', -27, 22, 14, 1.8);
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.moveTo(-38 + i * 8, 14);
        ctx.lineTo(-34 + i * 8, 14);
        ctx.lineTo(-35 + i * 7, 30);
        ctx.lineTo(-38 + i * 7, 30);
        ctx.closePath();
        ctx.fillStyle = '#e8302a';
        ctx.fill();
      }
      ctx.beginPath();
      ctx.moveTo(-40, 14);
      ctx.lineTo(-14, 14);
      ctx.strokeStyle = '#1b1208';
      ctx.lineWidth = 1.6;
      ctx.stroke();
    }
    if (B >= 3) {
      // Münzhaufen
      for (let i = 0; i < (B >= 4 ? 6 : 3); i++) C(ctx, 34 - (i % 3) * 5, 26 - Math.floor(i / 3) * 4, 3.6, '#ffd23f', 1.2);
    }
    if (A >= 4) {
      // goldene Garnelen-Statue
      ctx.save();
      ctx.translate(30, -20);
      ctx.beginPath();
      ctx.arc(0, 0, 7, Math.PI * 0.15, Math.PI * 1.6);
      ctx.strokeStyle = '#5a3a08';
      ctx.lineWidth = 6;
      ctx.lineCap = 'round';
      ctx.stroke();
      ctx.strokeStyle = '#ffd23f';
      ctx.lineWidth = 4;
      ctx.stroke();
      ctx.restore();
      star(ctx, 30, -20, 3, 1.4, 4, '#ffffff', 0);
    }
    // Kisten & Netz
    if (B < 2) {
      ctx.beginPath();
      ctx.roundRect(-38, 16, 11, 11, 1.5);
      shade(ctx, '#c08040', -32, 21, 7, 1.4);
      ctx.beginPath();
      ctx.roundRect(-26, 19, 9, 9, 1.5);
      shade(ctx, '#b0703a', -21, 23, 6, 1.4);
    }
  };

  // ---------- Sprite-Ausgabe ----------
  const ROT_FREE = { pocke: true, farm: true, krill: true, tide: true };
  SC.ROT_FREE = ROT_FREE;
  const SIZE = 124, SCALE = 1.08;

  function frame(t, time) {
    if (t.kind === 'winker') return Math.floor(time * (t.danceT > 0 ? 7 : 2.5)) % 2;
    if (t.kind === 'pocke' || t.kind === 'farm' || t.kind === 'krill' || t.kind === 'spinne' || t.kind === 'post' || t.kind === 'tide' || t.kind === 'dice') return Math.floor(time * 2) % 2;
    return 0;
  }
  // BTD5-typischer Schlagschatten: dunkle, versetzte Silhouette
  function withShadow(x, fn) {
    x.save();
    x.shadowColor = 'rgba(0,0,0,0.35)';
    x.shadowBlur = 3 * SC.spr.scale;
    x.shadowOffsetX = 3 * SC.spr.scale;
    x.shadowOffsetY = 4 * SC.spr.scale;
    fn();
    x.restore();
  }
  SC.towerSprite = function (kind, tiers, atk, f, dance) {
    const key = 't' + kind + tiers[0] + tiers[1] + (atk ? 1 : 0) + (f || 0) + (dance ? 'd' : '');
    return SC.spr.get(key, SIZE, (x) => {
      x.scale(SCALE, SCALE);
      // Silhouette einmal mit Schatten in Offscreen, dann Detail drüber
      const tmp = document.createElement('canvas');
      tmp.width = tmp.height = x.canvas.width;
      const tx = tmp.getContext('2d');
      tx.setTransform(x.getTransform());
      T[kind](tx, tiers[0], tiers[1], atk, f || 0, dance);
      x.save();
      x.setTransform(1, 0, 0, 1, 0, 0);
      withShadow(x, () => x.drawImage(tmp, 0, 0));
      x.restore();
    });
  };
  SC.drawTower = function (ctx, t, time, opts) {
    const atk = (t.anim || 0) > 0.45 && (!ROT_FREE[t.kind] || t.kind === 'tide') && t.kind !== 'winker' && t.kind !== 'yeti';
    const e = SC.towerSprite(t.kind, t.tiers, atk, frame(t, time || 0), t.danceT > 0);
    if (t.tiers[0] >= 4 || t.tiers[1] >= 4) {
      ctx.beginPath();
      ctx.arc(t.x, t.y, 26, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255,215,60,0.9)';
      ctx.lineWidth = 2.5;
      ctx.setLineDash([5, 4]);
      ctx.lineDashOffset = -(time || 0) * 12;
      ctx.stroke();
      ctx.setLineDash([]);
    }
    // Platzier-Bounce & leichtes Atmen
    let sc = 1 + Math.sin((time || 0) * 2.4 + (t.id || 0)) * 0.018;
    if (t.kind === 'molt') sc *= 1 + ((t.lvl || 1) - 1) * 0.028; // wächst mit jeder Häutung
    if (t.born != null && time - t.born < 0.45) {
      const u = (time - t.born) / 0.45;
      sc *= 1 + Math.sin(u * Math.PI * 2.2) * (1 - u) * 0.35 - (1 - u) * 0.25;
    }
    SC.spr.blit(ctx, e, t.x, t.y, ROT_FREE[t.kind] ? 0 : t.ang || 0, sc);
    if (t.kind === 'yeti' && t.anim > 0) {
      ctx.beginPath();
      ctx.arc(t.x, t.y, 20 + (1 - t.anim) * 10, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(190,240,255,' + t.anim + ')';
      ctx.lineWidth = 3;
      ctx.stroke();
    }
  };

  // Porträt für Karten & Upgrade-Panel
  SC.towerIcon = function (kind, size, tiers) {
    tiers = tiers || [0, 0];
    const key = 'I' + kind + size + tiers.join('');
    SC._iconCache = SC._iconCache || {};
    if (SC._iconCache[key]) return SC._iconCache[key];
    const c = document.createElement('canvas');
    c.width = c.height = size * 2;
    const ctx = c.getContext('2d');
    const span = kind === 'spinne' || kind === 'farm' ? 98 : kind === 'tide' ? 84 : 76;
    ctx.scale((size * 2) / span, (size * 2) / span);
    ctx.translate(span / 2, span / 2 + 1);
    ctx.shadowColor = 'rgba(0,0,0,0.35)';
    ctx.shadowOffsetX = (size * 2) / span * 2;
    ctx.shadowOffsetY = (size * 2) / span * 3;
    ctx.shadowBlur = 2;
    ctx.rotate(ROT_FREE[kind] ? 0 : -Math.PI / 2 + 0.35);
    T[kind](ctx, tiers[0], tiers[1], false, 0, false);
    ctx.shadowColor = 'transparent';
    if (kind === 'krill') {
      SC.drawKrill(ctx, -20, -18, 0.6, tiers[0] >= 2, true);
      SC.drawKrill(ctx, 22, -12, 2.2, tiers[0] >= 2, true);
      SC.drawKrill(ctx, 18, 22, -2.4, tiers[0] >= 2, true);
    }
    return (SC._iconCache[key] = c.toDataURL());
  };

  function krillArt(c, glow) {
    if (glow) aura(c, 11, 'rgba(120,230,255,A)', 0.6);
    E(c, -6, 0, 3.5, 2.6, 0, '#ff9b84', 1.2);
    c.beginPath();
    c.moveTo(-8, 0);
    c.lineTo(-12, -3.5);
    c.lineTo(-12, 3.5);
    c.closePath();
    shade(c, '#ff8f7a', -10, 0, 4, 1);
    E(c, 0, 0, 6.5, 3.2, 0, '#ffae9a', 1.3);
    c.beginPath();
    c.moveTo(5, -1);
    c.quadraticCurveTo(10, -5, 12, -3);
    c.moveTo(5, 1);
    c.quadraticCurveTo(10, 5, 12, 3);
    c.strokeStyle = '#a8321c';
    c.lineWidth = 0.9;
    c.stroke();
    for (const s of [-1, 1]) {
      C(c, 4, s * 1.6, 1.4, '#ffffff', 0.7);
      C(c, 4.4, s * 1.6, 0.7, '#111111', 0);
    }
  }
  SC.drawKrill = function (ctx, x, y, a, glow, direct) {
    if (direct) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(a);
      krillArt(ctx, glow);
      ctx.restore();
      return;
    }
    const e = SC.spr.get('krill' + (glow ? 1 : 0), 28, (c) => krillArt(c, glow));
    SC.spr.blit(ctx, e, x, y, a);
  };
})();
