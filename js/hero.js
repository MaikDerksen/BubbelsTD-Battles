'use strict';
// ============================================================
//  Frontansicht-Charaktere für Titelbild & VS-Screen
// ============================================================
(function () {
  const { LT, DK, shade, E, C, gloss, stroke3, star } = SC.art;
  const OL = '#1b1208';

  function pupil(ctx, x, y, r, look) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.35, r * 0.1, x, y, r);
    g.addColorStop(0, '#ffffff');
    g.addColorStop(1, '#d5e0ea');
    ctx.fillStyle = g;
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = OL;
    ctx.stroke();
    const px = x + look * r * 0.32, py = y + r * 0.12;
    C(ctx, px, py, r * 0.52, '#2a1a10', 0);
    C(ctx, px - r * 0.18, py - r * 0.22, r * 0.18, '#ffffff', 0);
  }

  // Held: Krabbe mit Helm, verschränkten Scheren, Grinsen
  SC.drawHero = function (ctx, helmet, look) {
    const body = '#ee5a2e', legC = '#e8692e';
    // Beine
    for (const s of [-1, 1]) {
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.moveTo(s * (40 + i * 10), 40 + i * 6);
        ctx.lineTo(s * (75 + i * 8), 50 + i * 14);
        ctx.lineTo(s * (82 + i * 6), 92 + i * 6);
        stroke3(ctx, 10, legC);
      }
    }
    // Panzer
    ctx.beginPath();
    ctx.ellipse(0, 22, 78, 52, 0, 0, Math.PI * 2);
    shade(ctx, body, 0, 22, 78, 5);
    ctx.beginPath();
    ctx.ellipse(0, 44, 46, 22, 0, 0, Math.PI * 2);
    shade(ctx, '#ffb07a', 0, 44, 46, 0);
    // Stielaugen
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(s * 18, -10);
      ctx.lineTo(s * 26, -52);
      stroke3(ctx, 9, body);
    }
    // Helm
    ctx.beginPath();
    ctx.moveTo(-66, 6);
    ctx.bezierCurveTo(-64, -46, 64, -46, 66, 6);
    ctx.closePath();
    shade(ctx, helmet, -10, -20, 70, 5);
    ctx.beginPath();
    ctx.roundRect(-72, -2, 144, 16, 8);
    shade(ctx, DK(helmet, 0.12), 0, 6, 72, 4);
    // Chevron-Emblem
    ctx.beginPath();
    ctx.moveTo(-16, -6);
    ctx.lineTo(0, -24);
    ctx.lineTo(16, -6);
    ctx.lineTo(8, -6);
    ctx.lineTo(0, -15);
    ctx.lineTo(-8, -6);
    ctx.closePath();
    shade(ctx, '#ffd23f', 0, -14, 18, 3);
    gloss(ctx, -26, -24, 22, 7, 0.55, -0.3);
    // Augen
    pupil(ctx, -28, -62, 19, look);
    pupil(ctx, 28, -62, 19, look);
    // Augenbrauen (entschlossen)
    ctx.lineCap = 'round';
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(s * 46, -88);
      ctx.lineTo(s * 12, -80);
      ctx.strokeStyle = OL;
      ctx.lineWidth = 7;
      ctx.stroke();
    }
    // Grinsen
    ctx.beginPath();
    ctx.moveTo(-26, 24);
    ctx.quadraticCurveTo(0, 46, 26, 24);
    ctx.quadraticCurveTo(0, 32, -26, 24);
    ctx.closePath();
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.strokeStyle = OL;
    ctx.lineWidth = 4;
    ctx.stroke();
    // Scheren verschränkt
    claw(ctx, -52, 62, -0.35, 34, look);
    claw(ctx, 52, 66, Math.PI + 0.35, 34, look);
  };
  function claw(ctx, x, y, a, s) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(a);
    ctx.beginPath();
    ctx.ellipse(-s * 0.5, 0, s * 0.62, s * 0.36, 0, 0, Math.PI * 2);
    shade(ctx, '#e8542a', -s * 0.5, 0, s * 0.6, 4);
    ctx.beginPath();
    ctx.moveTo(s * 0.1, -s * 0.42);
    ctx.bezierCurveTo(s * 0.9, -s * 0.75, s * 1.45, -s * 0.45, s * 1.4, -s * 0.05);
    ctx.quadraticCurveTo(s * 0.9, -s * 0.12, s * 0.4, -s * 0.02);
    ctx.closePath();
    shade(ctx, '#f0602e', s * 0.7, -s * 0.3, s * 0.8, 4);
    ctx.beginPath();
    ctx.moveTo(s * 0.1, s * 0.42);
    ctx.bezierCurveTo(s * 0.85, s * 0.7, s * 1.3, s * 0.45, s * 1.28, s * 0.12);
    ctx.quadraticCurveTo(s * 0.9, s * 0.12, s * 0.4, s * 0.04);
    ctx.closePath();
    shade(ctx, '#d84a22', s * 0.7, s * 0.3, s * 0.8, 4);
    ctx.beginPath();
    ctx.ellipse(s * 0.15, 0, s * 0.6, s * 0.52, 0, 0, Math.PI * 2);
    shade(ctx, '#f0602e', s * 0.15, 0, s * 0.6, 4);
    gloss(ctx, 0, -s * 0.22, s * 0.36, s * 0.14, 0.7, -0.2);
    ctx.restore();
  }

  // Pokal voller Muschel-Münzen
  SC.drawTrophy = function (ctx) {
    // Henkel
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(s * 62, -6, 26, 30, 0, 0, Math.PI * 2);
      ctx.lineWidth = 16;
      ctx.strokeStyle = OL;
      ctx.stroke();
      ctx.lineWidth = 9;
      ctx.strokeStyle = '#cfe6f5';
      ctx.stroke();
    }
    // Münzhaufen
    const coins = [];
    for (let i = 0; i < 26; i++) coins.push([-50 + ((i * 37) % 100), -38 - ((i * 13) % 30) + Math.abs(-50 + ((i * 37) % 100)) * 0.25]);
    coins.sort((a, b) => a[1] - b[1]);
    for (const [x, y] of coins) {
      ctx.beginPath();
      ctx.ellipse(x, y, 14, 9, (x % 3) * 0.2, 0, Math.PI * 2);
      shade(ctx, '#ffd23f', x, y, 14, 3);
      ctx.beginPath();
      ctx.ellipse(x, y, 8, 5, 0, 0, Math.PI * 2);
      ctx.strokeStyle = '#c07a06';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    // Schale
    ctx.beginPath();
    ctx.moveTo(-70, -30);
    ctx.lineTo(70, -30);
    ctx.bezierCurveTo(68, 30, 30, 50, 0, 52);
    ctx.bezierCurveTo(-30, 50, -68, 30, -70, -30);
    ctx.closePath();
    const g = ctx.createLinearGradient(-70, 0, 70, 0);
    g.addColorStop(0, '#9fc3dc');
    g.addColorStop(0.3, '#ffffff');
    g.addColorStop(0.55, '#d6eaf7');
    g.addColorStop(1, '#7aa3c2');
    ctx.fillStyle = g;
    ctx.fill();
    ctx.lineWidth = 6;
    ctx.strokeStyle = OL;
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(0, -30, 70, 12, 0, 0, Math.PI);
    ctx.lineWidth = 4;
    ctx.stroke();
    // Fuß
    ctx.beginPath();
    ctx.roundRect(-14, 50, 28, 26, 4);
    shade(ctx, '#bcd8ec', 0, 60, 20, 5);
    ctx.beginPath();
    ctx.roundRect(-46, 74, 92, 20, 8);
    shade(ctx, '#9fc3dc', 0, 84, 46, 5);
    star(ctx, 0, 12, 18, 8, 5, '#ffd23f', 3);
  };

  // Logo-Text in Canvas (für VS-Screen-Banner nicht nötig – Logo ist HTML/CSS)
})();
