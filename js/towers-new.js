'use strict';
// ============================================================
//  Artwork der neuen Türme (Flaschenpost, Gezeiten, Häutung, Würfel)
//  gleiche Konventionen wie towers.js: lokale Koordinaten,
//  Blick nach +x, Körper ~ Radius 18, alles innerhalb ~ ±38 px
// ============================================================
(function () {
  const { LT, DK, shade, E, C, gloss, stroke3, leg, eye, claw, aura, star, crown } = SC.art;
  const T = SC.TOWER_ART;
  const TAU = Math.PI * 2;

  // ---------- gemeinsame Helfer ----------

  // n symmetrische Beinpaare (Winkel a0 auf der +y-Seite, je Paar um da gedreht)
  function legs(ctx, n, x0, dx, y, a0, da, len, col, w, bend) {
    for (let i = 0; i < n; i++) {
      leg(ctx, x0 + i * dx, y, a0 + i * da, len, col, w, bend);
      leg(ctx, x0 + i * dx, -y, -a0 - i * da, len, col, w, -bend);
    }
  }

  // Hummer-Schwanz: Segmente nach -x, am Ende ein Schwanzfächer
  function lobsterTail(ctx, col, x0, n, step, w0, rim) {
    const xe = x0 - n * step;
    for (const s of [-1, 1]) E(ctx, xe - 2, s * 4.2, 5, 2.8, -s * 0.55, LT(col, 0.12), 1.5);
    E(ctx, xe - 3, 0, 5.4, 3, 0, LT(col, 0.12), 1.5);
    for (let i = n - 1; i >= 0; i--) {
      const x = x0 - i * step, w = w0 - i * 0.9;
      E(ctx, x, 0, step * 0.85, w, 0, col, 1.8);
      if (rim) {
        // harte Plattenkante (hellere Randlinie)
        ctx.beginPath();
        ctx.ellipse(x, 0, step * 0.85 - 1.1, w - 1.1, 0, Math.PI * 0.6, Math.PI * 1.4);
        ctx.strokeStyle = rim;
        ctx.lineWidth = 1.4;
        ctx.stroke();
      }
    }
  }

  // Kette aus abwechselnd gedrehten Gliedern
  function chain(ctx, x1, y1, x2, y2, col, n) {
    const a = Math.atan2(y2 - y1, x2 - x1);
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      ctx.beginPath();
      ctx.ellipse(x1 + (x2 - x1) * t, y1 + (y2 - y1) * t, 2.3, i % 2 ? 0.8 : 1.5, a, 0, TAU);
      ctx.strokeStyle = DK(col, 0.5);
      ctx.lineWidth = 2.4;
      ctx.stroke();
      ctx.strokeStyle = col;
      ctx.lineWidth = 1.1;
      ctx.stroke();
    }
  }

  // Goldmünze (Draufsicht)
  function coin(ctx, x, y, r) {
    C(ctx, x, y, r, '#ffd23f', 1.2);
    ctx.beginPath();
    ctx.arc(x, y, r * 0.62, 0, TAU);
    ctx.strokeStyle = '#c98a0a';
    ctx.lineWidth = 0.9;
    ctx.stroke();
  }

  // kleiner Glitzer-Stern (4 Zacken)
  function sparkle(ctx, x, y, r, col) {
    star(ctx, x, y, r, r * 0.35, 4, col || '#ffffff', 0);
  }

  // ============================================================
  //  FLASCHENPOST-KRABBE
  // ============================================================

  // Flaschenumriss (lokal: Boden bei -14, Hals nach +x)
  function bottlePath(ctx) {
    ctx.beginPath();
    ctx.moveTo(-11, -6.5);
    ctx.lineTo(4, -6.5);
    ctx.quadraticCurveTo(9, -6.5, 10, -3);
    ctx.lineTo(15, -3);
    ctx.lineTo(15, 3);
    ctx.lineTo(10, 3);
    ctx.quadraticCurveTo(9, 6.5, 4, 6.5);
    ctx.lineTo(-11, 6.5);
    ctx.quadraticCurveTo(-14, 6.5, -14, 0);
    ctx.quadraticCurveTo(-14, -6.5, -11, -6.5);
    ctx.closePath();
  }

  // Glasflasche mit gerolltem Brief, auf den Rücken geschnallt
  function postBottle(ctx, x, y, rot, B, f) {
    const poison = B === 2, clear = B >= 3;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.scale(0.84, 0.84);
    if (poison) aura(ctx, 21, 'rgba(160,90,255,A)', 0.6);
    // Glas
    bottlePath(ctx);
    ctx.save();
    ctx.globalAlpha = clear ? 0.5 : 0.85;
    shade(ctx, clear ? '#d8f4ff' : '#3fae6a', -2, 0, 13, 0);
    ctx.restore();
    // Inhalt: gerollter Brief (bei Gift in leuchtender Brühe)
    ctx.save();
    bottlePath(ctx);
    ctx.clip();
    ctx.beginPath();
    ctx.roundRect(-10, -3.2, 15, 6.4, 3);
    shade(ctx, '#f6ebcf', -3, 0, 8, 1.2, { ol: '#9a7a4a' });
    ctx.beginPath();
    for (const ly of [-1.2, 1.2]) {
      ctx.moveTo(-7, ly);
      ctx.lineTo(3, ly);
    }
    ctx.strokeStyle = '#b39a6a';
    ctx.lineWidth = 0.7;
    ctx.stroke();
    ctx.fillStyle = B >= 4 ? '#ffcf2e' : '#d6332a';
    ctx.fillRect(-3.4, -3.4, 2.2, 6.8);
    if (poison) {
      const g = ctx.createLinearGradient(-14, 0, 12, 0);
      g.addColorStop(0, 'rgba(150,70,255,0.7)');
      g.addColorStop(1, 'rgba(90,240,110,0.6)');
      ctx.fillStyle = g;
      ctx.fillRect(-15, -8, 26, 16);
      for (let i = 0; i < 4; i++) C(ctx, -10 + i * 5, (i % 2 ? 3 : -3) + (f ? -1 : 0), 1 + (i % 2) * 0.4, '#d9ffcf', 0);
    }
    ctx.restore();
    gloss(ctx, -3, -4, 8, 1.5, 0.85, 0);
    bottlePath(ctx);
    ctx.lineWidth = 2;
    ctx.strokeStyle = clear ? '#4f8fb3' : poison ? '#3d1f6b' : '#16502c';
    ctx.stroke();
    // Korken
    ctx.beginPath();
    ctx.roundRect(14, -2.4, 5, 4.8, 1.2);
    shade(ctx, B >= 4 ? '#ffcf2e' : '#c08a4a', 16, 0, 4, 1.3);
    // Gurte
    for (const sx of [-7, 3]) {
      ctx.beginPath();
      ctx.moveTo(sx, -9);
      ctx.lineTo(sx, 9);
      stroke3(ctx, 1.8, B >= 1 ? '#c0302a' : '#7a4a20');
    }
    if (clear) {
      sparkle(ctx, -12, -9, f ? 3.2 : 2.4, '#ffffff');
      sparkle(ctx, 9, -8, f ? 2.2 : 3, '#e8fbff');
      sparkle(ctx, 1, 9.5, 2.6, B >= 4 ? '#ffe14d' : '#ffffff');
    }
    ctx.restore();
  }

  // Kescher (A0–A2) bzw. Hummerkorb / Kraken-Käfig (A3/A4)
  function postNet(ctx, A, atk, f) {
    const w = f ? 1.2 : -1.2;
    const gx = 13, gy = 12; // Griff in der großen Schere
    if (A >= 3) {
      const gold = A >= 4;
      const cw = gold ? 17 : 14, ch = gold ? 26 : 21;
      const cx = 18 + cw / 2 + (atk ? 5 : 0), cy = (gold ? 2 : 4) + w * 0.5;
      const metal = gold ? '#ffcf2e' : '#9aa7b4';
      if (gold) {
        chain(ctx, gx, gy, cx - cw / 2, cy + ch * 0.3, metal, 6);
        chain(ctx, cx - cw / 2 + 2, cy - ch / 2, cx - cw / 2 - 6, cy - ch / 2 - 6, metal, 3);
      } else {
        ctx.beginPath();
        ctx.moveTo(gx, gy);
        ctx.quadraticCurveTo(gx + 6, gy + 6, cx - cw / 2, cy + ch * 0.3);
        stroke3(ctx, 1.5, '#c9a66b');
      }
      ctx.beginPath();
      ctx.roundRect(cx - cw / 2, cy - ch / 2, cw, ch, 3);
      ctx.fillStyle = gold ? 'rgba(90,40,120,0.4)' : 'rgba(30,50,70,0.35)';
      ctx.fill();
      if (gold) {
        // gefangener Krakenarm
        ctx.beginPath();
        ctx.moveTo(cx - 4, cy + ch / 2 - 3);
        ctx.bezierCurveTo(cx - 6, cy - 4, cx + 6, cy - 6, cx + 2, cy - 1);
        stroke3(ctx, 2.6, '#b04fd6');
      }
      // Gitterstäbe
      ctx.beginPath();
      for (let y = cy - ch / 2 + 3.5; y < cy + ch / 2 - 1; y += 3.5) {
        ctx.moveTo(cx - cw / 2, y);
        ctx.lineTo(cx + cw / 2, y);
      }
      ctx.strokeStyle = DK(metal, 0.4);
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.strokeStyle = metal;
      ctx.lineWidth = 1.1;
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx, cy - ch / 2);
      ctx.lineTo(cx, cy + ch / 2);
      stroke3(ctx, 1.5, metal);
      ctx.beginPath();
      ctx.roundRect(cx - cw / 2, cy - ch / 2, cw, ch, 3);
      stroke3(ctx, 2, metal);
      // Trichter-Eingang vorne
      E(ctx, cx + cw / 2, cy, 2.5, 5, 0, DK(metal, 0.15), 1.4);
      C(ctx, cx + cw / 2, cy, 1.6, '#1b1208', 0);
      if (gold) for (const [rx, ry] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) C(ctx, cx + (rx * cw) / 2, cy + (ry * ch) / 2, 1.8, '#ff4d6a', 1);
      return;
    }
    const rx = A >= 2 ? 7 : A >= 1 ? 6.5 : 5.5, ry = A >= 2 ? 14 : A >= 1 ? 10.5 : 8.5;
    const hx = 21 + rx + (atk ? 6 : 0), hy = (atk ? 1 : 5) + w;
    // Stiel
    ctx.beginPath();
    ctx.moveTo(gx - 4, gy + 1);
    ctx.lineTo(hx - rx * 0.7, hy + ry * 0.7);
    stroke3(ctx, 2.2, '#b07a42');
    if (atk) {
      // Schwung-Linien
      ctx.beginPath();
      ctx.arc(hx - 4, hy, ry + 3, 2.2, 3.3);
      ctx.strokeStyle = 'rgba(255,255,255,0.7)';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    // Netz
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(hx, hy, rx, ry, 0, 0, TAU);
    ctx.fillStyle = 'rgba(235,245,250,0.28)';
    ctx.fill();
    ctx.clip();
    ctx.beginPath();
    for (let d = -32; d <= 32; d += 3.2) {
      ctx.moveTo(hx + d - 16, hy - 16);
      ctx.lineTo(hx + d + 16, hy + 16);
      ctx.moveTo(hx + d + 16, hy - 16);
      ctx.lineTo(hx + d - 16, hy + 16);
    }
    ctx.strokeStyle = 'rgba(250,250,240,0.85)';
    ctx.lineWidth = 0.8;
    ctx.stroke();
    ctx.restore();
    ctx.beginPath();
    ctx.ellipse(hx, hy, rx, ry, 0, 0, TAU);
    stroke3(ctx, 1.8, A >= 2 ? '#d9b46a' : '#8a5a2e');
    if (A >= 2) {
      // Schwimmer am Schleppnetz
      [-1.9, -1.2, 1.2, 1.9].forEach((a, i) => {
        const bx = hx + Math.cos(a) * rx, by = hy + Math.sin(a) * ry;
        C(ctx, bx, by, 2.4, i % 2 ? '#ffffff' : '#ff4d3a', 1.1);
      });
    }
  }

  T.post = function (ctx, A, B, atk, f) {
    if (A >= 4) aura(ctx, 36, 'rgba(255,200,60,A)', 0.5);
    if (B >= 4) aura(ctx, 34, 'rgba(255,120,90,A)', 0.5);
    const body = B >= 4 ? '#e8442e' : '#f0643a';
    legs(ctx, 3, -7, 5.5, 8, 1.85, -0.25, 13, LT(body, 0.2), 2.2, 0.55);
    postNet(ctx, A, atk, f);
    E(ctx, 0, 0, 14, 12, 0, body, 2.2);
    gloss(ctx, -2, -6, 7, 2.6, 0.7, -0.2);
    claw(ctx, 11, -9, -0.4, 5.5, body, 0.3);
    postBottle(ctx, -12, 1, -2.75, B, f);
    if (B >= 4) {
      // Postkönig: Krone mit Brief-Emblem
      crown(ctx, 3, 0, 7.5, Math.PI / 2);
      ctx.beginPath();
      ctx.rect(-1.2, -3.2, 4.4, 6.4);
      shade(ctx, '#ffffff', 1, 0, 4, 1, { ol: '#7a5a10' });
      ctx.beginPath();
      ctx.moveTo(3.2, -3.2);
      ctx.lineTo(0.6, 0);
      ctx.lineTo(3.2, 3.2);
      ctx.strokeStyle = '#7a5a10';
      ctx.lineWidth = 0.8;
      ctx.stroke();
    } else if (B >= 1) {
      // rote Postmütze mit Schirm und Posthorn
      ctx.beginPath();
      ctx.ellipse(8.5, 0, 5, 7, 0, -Math.PI / 2, Math.PI / 2);
      ctx.closePath();
      shade(ctx, '#9a1e1e', 9, 0, 6, 1.4);
      E(ctx, 4, 0, 6.5, 7, 0, '#d6332a', 1.8);
      ctx.beginPath();
      ctx.arc(4, 0, 2.6, 0.4, Math.PI * 1.7);
      ctx.strokeStyle = '#ffd23f';
      ctx.lineWidth = 1.4;
      ctx.stroke();
      gloss(ctx, 2, -3, 3, 1.2, 0.7, 0);
    }
    eye(ctx, 14, -5, 3.8, [9, -2.5], { stalk: body, lid: 1 });
    eye(ctx, 14, 5, 3.8, [9, 2.5], { stalk: body, lid: -1 });
    claw(ctx, 13, 11, atk ? 0.05 : 0.3, 7.5, body, 0.25);
  };

  // ============================================================
  //  GEZEITEN-HUMMER (rotationsfrei)
  // ============================================================

  // Spiralarme eines Strudels (Mittelpunkt 0,0)
  function swirl(ctx, R, arms, col, lw, rot) {
    ctx.lineCap = 'round';
    for (let k = 0; k < arms; k++) {
      ctx.beginPath();
      for (let r = 6; r <= R; r += 1.5) {
        const a = rot + (k / arms) * TAU + r * 0.09;
        ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      }
      ctx.strokeStyle = col;
      ctx.lineWidth = lw;
      ctx.stroke();
    }
  }

  // Wellenkamm hinter dem Hummer + Sturmwolke mit Blitz (A4)
  function stormCrest(ctx, f) {
    ctx.beginPath();
    ctx.arc(0, 0, 33, Math.PI * 0.68, Math.PI * 1.32);
    stroke3(ctx, 6, '#2f8fe0');
    for (let a = Math.PI * 0.7; a <= Math.PI * 1.31; a += 0.13) {
      C(ctx, Math.cos(a) * 36.5, Math.sin(a) * 36.5, 2.3 + (f && Math.round(a * 10) % 2 ? 0.5 : 0), '#ffffff', 1, { ol: '#6fb4e0' });
    }
    const cx = -20, cy = -26;
    ctx.beginPath();
    ctx.moveTo(cx + 2, cy + 3);
    ctx.lineTo(cx + 7, cy + 9);
    ctx.lineTo(cx + 4, cy + 9.5);
    ctx.lineTo(cx + 9, cy + 16);
    ctx.lineTo(cx + 1, cy + 8);
    ctx.lineTo(cx + 4, cy + 7.5);
    ctx.closePath();
    shade(ctx, '#ffe14d', cx + 5, cy + 9, 7, 1.2);
    for (const [px, py, r] of [[-5, 1, 5], [5, 1, 5.5], [0, -2, 6.5]]) C(ctx, cx + px, cy + py, r, '#7d8796', 1.6);
    gloss(ctx, cx - 1, cy - 4, 4, 1.5, 0.5, 0);
  }

  // Mondsichel (Öffnung nach +x)
  function crescent(ctx, x, y, r) {
    const d = r * 0.75;
    const hy = Math.sqrt(r * r - (d * d) / 4);
    const al = Math.atan2(hy, d / 2), ga = Math.atan2(hy, d / 2);
    ctx.save();
    ctx.translate(x, y);
    aura(ctx, r * 2, 'rgba(220,235,255,A)', 0.7);
    ctx.beginPath();
    ctx.arc(0, 0, r, al, TAU - al, false);
    ctx.arc(d, 0, r, -Math.PI + ga, Math.PI - ga, true);
    ctx.closePath();
    shade(ctx, '#dfe6f2', -r * 0.4, 0, r, 1.8, { ol: '#5b6b85' });
    ctx.restore();
  }

  // Spiral-Muschelhorn (Mundstück bei x0, Trichter nach +x)
  function conch(ctx, x0, col, atk) {
    ctx.beginPath();
    ctx.moveTo(x0, -2.4);
    ctx.bezierCurveTo(x0 + 8, -3, x0 + 12, -9, x0 + 16, -10.5);
    ctx.quadraticCurveTo(x0 + 21, 0, x0 + 16, 10.5);
    ctx.bezierCurveTo(x0 + 12, 9, x0 + 8, 3, x0, 2.4);
    ctx.closePath();
    shade(ctx, col, x0 + 9, 0, 12, 2);
    // Spiralrillen
    ctx.beginPath();
    for (const k of [4, 8, 12]) {
      const h = 2.6 + k * 0.45;
      ctx.moveTo(x0 + k - 1, -h);
      ctx.quadraticCurveTo(x0 + k + 1.8, 0, x0 + k - 1, h);
    }
    ctx.strokeStyle = DK(col, 0.35);
    ctx.lineWidth = 1.2;
    ctx.stroke();
    // Trichteröffnung
    E(ctx, x0 + 16.5, 0, 3, 9.5, 0, '#ff9fb0', 1.6, { ol: DK(col, 0.55) });
    E(ctx, x0 + 17.2, 0, 1.5, 6, 0, '#b0405a', 0);
    // Spitze/Mundstück mit Windung
    C(ctx, x0, 0, 3.4, LT(col, 0.1), 1.5);
    ctx.beginPath();
    ctx.arc(x0, 0, 1.7, 0.5, Math.PI * 1.8);
    ctx.strokeStyle = DK(col, 0.4);
    ctx.lineWidth = 1;
    ctx.stroke();
    gloss(ctx, x0 + 9, -4.5, 5, 1.4, 0.75, -0.25);
    if (atk) {
      // Wasserring / Spritzer um den Trichter
      ctx.save();
      ctx.lineCap = 'round';
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.arc(x0 + 17, 0, 6 + i * 5, -1 + i * 0.12, 1 - i * 0.12);
        ctx.strokeStyle = 'rgba(190,245,255,' + (0.95 - i * 0.25) + ')';
        ctx.lineWidth = 2.6 - i * 0.5;
        ctx.stroke();
      }
      ctx.restore();
      for (const [dx, dy] of [[24, -9], [27, 7], [21, 12], [22, -13]]) C(ctx, x0 + dx, dy, 1.4, '#bff4ff', 0.8, { ol: '#3a8fc0' });
    }
  }

  T.tide = function (ctx, A, B, atk, f) {
    const rot = f ? 0.4 : 0;
    if (A >= 4) aura(ctx, 38, 'rgba(70,170,255,A)', 0.5);
    if (B >= 4) aura(ctx, 34, 'rgba(210,225,255,A)', 0.55);
    // Wasser unter dem Hummer (Strudel / Mahlstrom)
    if (A >= 2) {
      const R = A >= 3 ? 33 : 27;
      const g = ctx.createRadialGradient(0, 0, 4, 0, 0, R);
      g.addColorStop(0, A >= 3 ? 'rgba(15,110,130,0.8)' : 'rgba(20,90,170,0.6)');
      g.addColorStop(0.7, A >= 3 ? 'rgba(47,209,196,0.6)' : 'rgba(60,150,230,0.45)');
      g.addColorStop(1, 'rgba(120,230,255,0.15)');
      ctx.beginPath();
      ctx.arc(0, 0, R, 0, TAU);
      ctx.fillStyle = g;
      ctx.fill();
      if (A >= 3) {
        ctx.beginPath();
        ctx.arc(0, 0, R - 1.5, 0, TAU);
        ctx.strokeStyle = 'rgba(160,255,240,0.9)';
        ctx.lineWidth = 2.4;
        ctx.stroke();
      }
      swirl(ctx, R - 2, A >= 3 ? 5 : 4, 'rgba(255,255,255,0.55)', A >= 3 ? 2.2 : 1.7, rot);
    }
    if (A >= 4) stormCrest(ctx, f);
    if (A >= 1) {
      // Wasserwirbel an den Füßen
      ctx.lineCap = 'round';
      for (let k = 0; k < 4; k++) {
        const a = rot + (k * Math.PI) / 2;
        ctx.beginPath();
        ctx.arc(0, 0, 20 + (k % 2) * 3, a, a + 1);
        ctx.strokeStyle = 'rgba(143,227,255,0.9)';
        ctx.lineWidth = 2.2;
        ctx.stroke();
      }
    }
    const body = A >= 4 ? '#1f6fd0' : '#2f86e0';
    if (B >= 4) crescent(ctx, -15, -22, 8.5);
    legs(ctx, 4, -5, 4, 6.5, 1.95, -0.2, 10.5, LT(body, 0.25), 1.6, 0.55);
    // lange, nach hinten geschwungene Fühler
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(14, s * 3);
      ctx.bezierCurveTo(28, s * 8, 32, s * 24, 10, s * 33);
      ctx.lineCap = 'round';
      ctx.strokeStyle = DK(body, 0.55);
      ctx.lineWidth = 2.4;
      ctx.stroke();
      ctx.strokeStyle = '#9fd8ff';
      ctx.lineWidth = 1.1;
      ctx.stroke();
    }
    lobsterTail(ctx, body, -10, 4, 5, 7.5, B >= 3 ? '#e8fbff' : null);
    E(ctx, 3, 0, 12.5, 9, 0, body, 2.2);
    ctx.beginPath();
    ctx.moveTo(14, -2);
    ctx.lineTo(19, 0);
    ctx.lineTo(14, 2);
    ctx.closePath();
    shade(ctx, body, 16, 0, 3, 1.2);
    ctx.beginPath();
    ctx.arc(-3, 0, 7, -0.9, 0.9);
    ctx.strokeStyle = DK(body, 0.35);
    ctx.lineWidth = 1.2;
    ctx.stroke();
    gloss(ctx, 1, -4.5, 7, 2.2, 0.7, -0.1);
    if (B >= 1) {
      // Seetang-Girlande
      ctx.beginPath();
      ctx.moveTo(-5, -10);
      ctx.quadraticCurveTo(-10, 0, -5, 10);
      stroke3(ctx, 1.8, '#3fae4a');
      for (let i = 0; i < 5; i++) {
        const t = i / 4, ly = -9 + t * 18, lx = -5 - Math.sin(t * Math.PI) * 4.5;
        E(ctx, lx - 1.5, ly, 2.6, 1.3, i % 2 ? 0.6 : -0.6, '#4fc25a', 1);
      }
    }
    if (B >= 3) {
      // leuchtende Salzkristalle
      for (const [x, y, s] of [[3, -5, 3], [-1, 4, 2.6], [8, 3, 2.2], [-15, -2, 2.4], [-24, 2, 2]]) {
        ctx.save();
        ctx.translate(x, y);
        aura(ctx, s * 2.6, 'rgba(200,250,255,A)', 0.8);
        ctx.beginPath();
        ctx.moveTo(0, -s);
        ctx.lineTo(s * 0.65, 0);
        ctx.lineTo(0, s);
        ctx.lineTo(-s * 0.65, 0);
        ctx.closePath();
        shade(ctx, '#effdff', 0, 0, s, 1.1, { ol: '#4fa8d0' });
        ctx.restore();
      }
    }
    if (B >= 2) {
      // Perlenkette mit Muschel-Anhänger
      for (let a = -1.2; a <= 1.21; a += 0.24) C(ctx, -1 + Math.cos(a) * 8.5, Math.sin(a) * 8.5, 1.5, '#fbf7ff', 0.8, { ol: '#9a8fb3' });
      ctx.beginPath();
      ctx.moveTo(6.5, 0);
      ctx.arc(6.5, 0, 3.6, -0.85, 0.85);
      ctx.closePath();
      shade(ctx, '#ffb3c4', 8, 0, 3.6, 1.1);
    }
    const cc = B >= 4 ? '#e6ecf5' : A >= 4 ? '#ffd77a' : '#f5d2a8';
    conch(ctx, 15, cc, atk);
    // Scheren umgreifen das Horn seitlich
    const clc = LT(body, 0.18);
    claw(ctx, 11, 13, -0.65, 7.5, clc, 0.3, { tips: '#9fe6ff' });
    claw(ctx, 11, -13, 0.65, 7.5, clc, 0.3, { tips: '#9fe6ff' });
    eye(ctx, 10.5, -5, 3.4, [8, -2.5], { stalk: body, lid: 1 });
    eye(ctx, 10.5, 5, 3.4, [8, 2.5], { stalk: body, lid: -1 });
  };

  // ============================================================
  //  HÄUTUNGS-HUMMER
  // ============================================================

  // abgestreifte, leere Hülle (vereinfachte Silhouette)
  function shedShell(ctx, col) {
    lobsterTail(ctx, col, -8, 4, 4.2, 6.5, null);
    E(ctx, 3, 0, 10.5, 8, 0, col, 1.6);
    claw(ctx, 12, 7, 0.4, 7, col, 0.5);
    claw(ctx, 12, -7, -0.4, 6, col, 0.5);
    // Häutungsriss
    ctx.beginPath();
    ctx.moveTo(-6, 0);
    for (let i = 1; i <= 5; i++) ctx.lineTo(-6 + i * 3, i % 2 ? -1.5 : 1.5);
    ctx.strokeStyle = 'rgba(90,50,30,0.8)';
    ctx.lineWidth = 1.2;
    ctx.stroke();
  }

  // Häufchen alter Schalenstücke
  function shellPile(ctx, x, y) {
    const pale = '#efd0b5';
    claw(ctx, x + 6, y + 3, 2.4, 3.2, pale, 0.5);
    for (const [dx, dy, r] of [[-4, 2, 0.4], [3, -2, -0.3], [-1, -5, 1.1]]) {
      E(ctx, x + dx, y + dy, 5, 3.6, r, pale, 1.3);
      ctx.beginPath();
      ctx.ellipse(x + dx, y + dy, 3, 2, r, 0.3, 2.6);
      ctx.strokeStyle = 'rgba(120,70,40,0.6)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }

  // Stacheln an einer Schere (gleiche Transformation wie claw())
  function clawSpikes(ctx, x, y, a, s, col) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(a);
    for (const d of [-1, 1]) {
      for (const [px, py] of [[-0.5, 0.38], [0.35, 0.55], [0.85, 0.62]]) {
        const bx = px * s, by = d * py * s;
        ctx.beginPath();
        ctx.moveTo(bx - s * 0.16, by);
        ctx.lineTo(bx + s * 0.05, by + d * s * 0.42);
        ctx.lineTo(bx + s * 0.2, by);
        ctx.closePath();
        shade(ctx, col, bx, by + d * s * 0.15, s * 0.25, 1.2);
      }
    }
    ctx.restore();
  }

  T.molt = function (ctx, A, B, atk, f) {
    const anc = A >= 4, gold = B >= 4, big = A >= 1;
    if (anc) aura(ctx, 36, 'rgba(255,110,40,A)', 0.45);
    if (gold) {
      aura(ctx, 37, 'rgba(110,200,255,A)', 0.5);
      aura(ctx, 26, 'rgba(255,215,60,A)', 0.45);
    }
    let body = '#b8452a';
    if (A >= 3) body = '#8a2f1e';
    if (anc) body = '#4e3a40';
    if (gold) body = '#e0a92a';
    const rim = B >= 1 ? LT(body, 0.5) : null;
    if (A >= 2) {
      ctx.save();
      ctx.translate(-11, 21);
      ctx.rotate(0.35);
      ctx.scale(0.72, 0.72);
      ctx.globalAlpha = 0.7;
      shedShell(ctx, '#f3dcc8');
      ctx.restore();
    }
    if (B >= 2) shellPile(ctx, -19, -21);
    legs(ctx, 4, -6, 4, 6.5, 1.95, -0.2, 12, LT(body, 0.2), big ? 2.3 : 2, 0.55);
    // Fühler nach vorne
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(15, s * 2.5);
      ctx.bezierCurveTo(24, s * 6, 31, s * 3, 37, s * 13);
      stroke3(ctx, 1, LT(body, 0.25));
    }
    lobsterTail(ctx, body, -10, 5, 4, big ? 8.5 : 7.5, rim);
    if (gold) {
      // blauer Schimmer auf den Schwanzsegmenten
      ctx.save();
      ctx.globalAlpha = 0.7;
      for (let i = 1; i < 5; i++) E(ctx, -10 - i * 4, -1.5, 1.3, 4.5 - i * 0.5, 0, '#5ab8ff', 0);
      ctx.restore();
    }
    const rx = big ? 13.5 : 12.5, ry = big ? 10 : 9;
    E(ctx, 3, 0, rx, ry, 0, body, 2.2);
    ctx.beginPath();
    ctx.moveTo(3 + rx - 1, -2.2);
    ctx.lineTo(3 + rx + 5, 0);
    ctx.lineTo(3 + rx - 1, 2.2);
    ctx.closePath();
    shade(ctx, body, 3 + rx + 2, 0, 3, 1.2);
    ctx.beginPath();
    ctx.arc(-3, 0, 7, -0.9, 0.9);
    ctx.strokeStyle = DK(body, 0.35);
    ctx.lineWidth = 1.2;
    ctx.stroke();
    if (rim) {
      ctx.beginPath();
      ctx.ellipse(3, 0, rx - 2, ry - 2, 0, Math.PI * 0.55, Math.PI * 1.45);
      ctx.strokeStyle = rim;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
    if (gold) {
      // blau schimmernde Streifen
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(3, 0, rx, ry, 0, 0, TAU);
      ctx.clip();
      ctx.beginPath();
      for (let k = -14; k <= 16; k += 6) {
        ctx.moveTo(k, -12);
        ctx.lineTo(k + 8, 12);
      }
      ctx.strokeStyle = 'rgba(80,180,255,0.55)';
      ctx.lineWidth = 2.4;
      ctx.stroke();
      ctx.restore();
    }
    gloss(ctx, 1, -4.5, 7, 2.2, 0.7, -0.1);
    if (anc) {
      // Moos & Seepocken
      for (const [x, y, r] of [[-6, -5, 3], [-18, 4, 2.6], [8, 6, 2.2], [-26, -3, 2]]) {
        ctx.save();
        ctx.globalAlpha = 0.85;
        E(ctx, x, y, r * 1.4, r, 0.4, '#5f8f3a', 0);
        ctx.restore();
      }
      for (const [x, y, r] of [[0, -4, 2.6], [-4, 5, 2.2], [9, -3, 1.8], [-14, -3, 2], [-22, 3, 1.7]]) {
        C(ctx, x, y, r, '#d4cbb8', 1.1);
        C(ctx, x, y, r * 0.4, '#3a3028', 0);
      }
    }
    if (B >= 3) {
      // Lehrmeister-Schärpe mit Medaille
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(3, 0, rx, ry, 0, 0, TAU);
      ctx.clip();
      ctx.beginPath();
      ctx.moveTo(-6, -11);
      ctx.lineTo(10, 11);
      stroke3(ctx, 4, '#2a6fdb');
      ctx.restore();
      C(ctx, 5, 4, 3.4, '#ffcf2e', 1.3);
      star(ctx, 5, 4, 2.2, 0.9, 5, '#fff3a8', 0);
    }
    // Scheren (die rechte ist die große Knackschere)
    const sB = 9 + (big ? 1 : 0) + (A >= 3 ? 2.5 : 0) + (anc ? 1 : 0), sS = sB * 0.75;
    const fx = atk ? 4 : 0, op = atk ? 0.95 : 0.3, ca = atk ? 0.2 : 0.42;
    const cc = gold ? '#f0b830' : body;
    const opt = { tips: gold ? '#7fd4ff' : anc ? '#d4cbb8' : null, band: rim };
    if (A >= 3) {
      const sp = anc ? '#d4cbb8' : '#f2b6a0';
      clawSpikes(ctx, 17 + fx, 11, ca, sB, sp);
      clawSpikes(ctx, 17 + fx, -10, -ca, sS, sp);
    }
    // Oberarme
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(9, s * 5);
      ctx.lineTo(14 + fx, s * (s > 0 ? 11 : 10));
      stroke3(ctx, 3.6, cc);
    }
    claw(ctx, 17 + fx, 11, ca, sB, cc, op, opt);
    claw(ctx, 17 + fx, -10, -ca, sS, cc, op, opt);
    if (anc) {
      for (const s of [-1, 1]) {
        ctx.save();
        ctx.translate(15, s * 4);
        aura(ctx, 8, 'rgba(255,140,40,A)', 0.85);
        ctx.restore();
      }
    }
    const iris = anc ? '#ff7a2e' : gold ? '#3aa8ff' : null;
    eye(ctx, 15, -4, 3.3, [11, -2], { stalk: body, lid: 1, iris });
    eye(ctx, 15, 4, 3.3, [11, 2], { stalk: body, lid: -1, iris });
    if (gold) {
      sparkle(ctx, -20, f ? -9 : -7, 3, '#ffffff');
      sparkle(ctx, 10, -12, f ? 2 : 3, '#fff3a8');
      sparkle(ctx, -4, 12, 2.5, '#bfe8ff');
    }
  };

  // ============================================================
  //  WÜRFELKRABBE
  // ============================================================

  const PIPS = {
    1: [[0, 0]],
    2: [[-1, -1], [1, 1]],
    3: [[-1, -1], [0, 0], [1, 1]],
    4: [[-1, -1], [1, -1], [-1, 1], [1, 1]],
    5: [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]],
    6: [[-1, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [1, 1]],
  };

  // Würfel mit Pseudo-3D-Seitenfläche; rim = optionaler Goldrand
  function die(ctx, x, y, s, face, col, pipCol, rot, rim) {
    const h = s / 2;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot || 0);
    ctx.beginPath();
    ctx.roundRect(-h + s * 0.12, -h + s * 0.14, s, s, s * 0.24);
    shade(ctx, DK(col, 0.35), s * 0.12, s * 0.14, s * 0.7, 1.6);
    ctx.beginPath();
    ctx.roundRect(-h, -h, s, s, s * 0.24);
    shade(ctx, col, 0, 0, s * 0.75, 1.8);
    if (rim) {
      ctx.beginPath();
      ctx.roundRect(-h + 1.1, -h + 1.1, s - 2.2, s - 2.2, s * 0.18);
      ctx.strokeStyle = rim;
      ctx.lineWidth = 1.3;
      ctx.stroke();
    }
    ctx.fillStyle = pipCol;
    for (const [px, py] of PIPS[face]) {
      ctx.beginPath();
      ctx.arc(px * s * 0.26, py * s * 0.26, s * 0.1, 0, TAU);
      ctx.fill();
    }
    gloss(ctx, -s * 0.15, -s * 0.28, s * 0.25, s * 0.09, 0.8, -0.2);
    ctx.restore();
  }

  // Stapel Pokerchips (wächst Richtung +x)
  function chips(ctx, x, y, n, col) {
    for (let i = n - 1; i >= 0; i--) E(ctx, x - i * 1.6, y, 3.2, 4.6, 0, col, 1.2);
    ctx.save();
    ctx.setLineDash([1.6, 1.6]);
    ctx.beginPath();
    ctx.ellipse(x, y, 2.1, 3.1, 0, 0, TAU);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.1;
    ctx.stroke();
    ctx.restore();
  }

  // Spielautomaten-Schild "777" (liest sich mit +x als "oben")
  function sign777(ctx, x, y, f) {
    ctx.beginPath();
    ctx.roundRect(x - 5, y - 12.5, 10, 25, 2.5);
    shade(ctx, '#d6332a', x, y, 13, 1.8);
    ctx.beginPath();
    ctx.roundRect(x - 3.3, y - 10.5, 6.6, 21, 1.5);
    ctx.fillStyle = '#1b1430';
    ctx.fill();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (let i = -1; i <= 1; i++) {
      const cy = y + i * 6.6;
      ctx.beginPath();
      ctx.moveTo(x + 2.2, cy - 1.7);
      ctx.lineTo(x + 2.2, cy + 1.9);
      ctx.lineTo(x - 2.4, cy - 0.4);
      ctx.strokeStyle = '#ffe14d';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
    for (let k = -2; k <= 2; k++) {
      for (const s of [-1, 1]) C(ctx, x + s * 5, y + k * 5, 0.9, (k + s + (f || 0)) % 2 ? '#fff3a0' : '#ffb02e', 0);
    }
  }

  // Würfelbecher (Seitenansicht, Öffnung nach +x)
  function diceCup(ctx, x, y, a) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(a);
    ctx.beginPath();
    ctx.moveTo(-6, -4);
    ctx.lineTo(5, -6.2);
    ctx.lineTo(5, 6.2);
    ctx.lineTo(-6, 4);
    ctx.closePath();
    shade(ctx, '#a0401e', 0, 0, 8, 1.8);
    for (const bx of [-3, 2.5]) {
      const hw = 4 + ((bx + 6) / 11) * 2.2;
      ctx.beginPath();
      ctx.moveTo(bx, -hw + 0.6);
      ctx.lineTo(bx, hw - 0.6);
      ctx.strokeStyle = '#ffcf2e';
      ctx.lineWidth = 1.4;
      ctx.stroke();
    }
    E(ctx, 5, 0, 1.8, 6.2, 0, '#3a160a', 1.4);
    gloss(ctx, -1, -3, 4, 1.1, 0.6, -0.15);
    ctx.restore();
  }

  // Glücksklee-Abzeichen
  function clover(ctx, x, y) {
    C(ctx, x, y, 5.4, '#ffcf2e', 1.4);
    for (let i = 0; i < 4; i++) {
      const a = (i * Math.PI) / 2 + Math.PI / 4;
      C(ctx, x + Math.cos(a) * 2, y + Math.sin(a) * 2, 1.9, '#3fbf4a', 0.9);
    }
    C(ctx, x, y, 0.8, '#1f7a2a', 0);
  }

  T.dice = function (ctx, A, B, atk, f) {
    const goldD = A >= 4;
    if (goldD) aura(ctx, 36, 'rgba(255,215,60,A)', 0.5);
    if (B >= 4) {
      aura(ctx, 38, 'rgba(255,190,40,A)', 0.5);
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * TAU + (f ? 0.15 : 0);
        coin(ctx, Math.cos(a) * 31, Math.sin(a) * 31, 3.1);
      }
    }
    const body = B >= 4 ? '#8a3fd6' : '#7b4fd6', teal = '#2fbfae';
    if (B >= 1) {
      chips(ctx, -18, -20, 4, '#e8302a');
      chips(ctx, -24, -11, 3, '#2a6fdb');
    }
    if (B >= 3) {
      for (const [dx, dy] of [[-4, 3], [5, 2], [0, 6], [2, -3], [-3, -2], [3, 6]]) coin(ctx, -17 + dx, 19 + dy, 3.3);
      sign777(ctx, -27, 2, f);
    }
    legs(ctx, 3, -6, 5.5, 8, 1.85, -0.25, 13, teal, 2.2, 0.55);
    E(ctx, 0, 0, 14, 12, 0, body, 2.2);
    for (const [x, y] of [[-6, -6], [-9, 2], [-3, 7], [2, -8]]) C(ctx, x, y, 1.7, LT(teal, 0.2), 0);
    gloss(ctx, -2, -6, 7, 2.6, 0.7, -0.2);
    if (A >= 3) clover(ctx, -6, 5);
    if (B >= 4) crown(ctx, -3, 0, 7.5, Math.PI / 2);
    // grüner Casino-Schirm (Visor) mit Stirnband
    ctx.beginPath();
    ctx.ellipse(4, 0, 6, 11, 0, -Math.PI / 2, Math.PI / 2);
    ctx.strokeStyle = '#1f6f3a';
    ctx.lineWidth = 2.2;
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(10, 0, 10, 12, 0, -Math.PI / 2, Math.PI / 2);
    ctx.closePath();
    ctx.save();
    ctx.globalAlpha = 0.88;
    shade(ctx, '#2fbf5a', 14, 0, 11, 1.8, { ol: '#0f4a22' });
    ctx.restore();
    ctx.beginPath();
    ctx.ellipse(10, 0, 7, 9, 0, -Math.PI / 2, Math.PI / 2);
    ctx.strokeStyle = 'rgba(200,255,210,0.5)';
    ctx.lineWidth = 1;
    ctx.stroke();
    gloss(ctx, 15, -5, 3.5, 1.2, 0.6, 0.5);
    eye(ctx, 10, -5, 3.8, [6, -3], { stalk: body, lid: 1 });
    eye(ctx, 10, 5, 3.8, [6, 3], { stalk: body, lid: -1 });
    // kleine Schere (mit Würfelbecher ab B2)
    claw(ctx, 12, -11, -0.45, B >= 2 ? 6.5 : 5.5, body, 0.5);
    if (B >= 2) diceCup(ctx, 21, -16, -0.45 + (f ? 0.12 : 0));
    // große Schere mit Würfel(n)
    const ca = atk ? 0.05 : 0.35;
    claw(ctx, 12, 12, ca, 9, LT(body, 0.08), atk ? 0.9 : 0.75, { band: teal });
    let dx = 12 + Math.cos(ca) * 11.5, dy = 12 + Math.sin(ca) * 11.5 + (f ? -1.2 : 0.6);
    if (atk) {
      dx = 31;
      dy = 3;
      ctx.beginPath();
      for (let i = -1; i <= 1; i++) {
        ctx.moveTo(dx - 8, dy + i * 3.2);
        ctx.lineTo(dx - 16, dy + i * 3.2 + 3);
      }
      ctx.strokeStyle = 'rgba(255,255,255,0.75)';
      ctx.lineWidth = 1.6;
      ctx.lineCap = 'round';
      ctx.stroke();
    }
    const dcol = goldD ? '#ffd23f' : '#f7f5ee';
    const pip = goldD ? '#8a4a08' : A >= 1 ? '#e8302a' : '#1b1b22';
    const rimC = A >= 3 ? (goldD ? '#fff3a8' : '#e0a020') : null;
    if (goldD) {
      ctx.save();
      ctx.translate(dx + 2, dy - 3);
      aura(ctx, 16, 'rgba(255,240,140,A)', 0.8);
      ctx.restore();
    }
    if (A >= 2) die(ctx, dx + 6, dy - 7, 8, goldD ? 6 : 2, dcol, pip, atk ? -0.5 : -0.3, rimC);
    die(ctx, dx, dy, 9.5, goldD ? 6 : 5, dcol, pip, atk ? 0.7 : 0.15 + (f ? 0.1 : 0), rimC);
  };
})();
