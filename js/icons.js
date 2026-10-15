'use strict';
// ============================================================
//  SVG-Icons im Battles-Look (Verlauf, dunkle Outline, Glanz)
// ============================================================
SC.ICON = (function () {
  let n = 0;
  const id = () => 'g' + n++;
  const wrap = (vb, body) => '<svg class="ico" viewBox="' + vb + '" xmlns="http://www.w3.org/2000/svg">' + body + '</svg>';
  const lin = (i, a, b) => '<defs><linearGradient id="' + i + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + a + '"/><stop offset="1" stop-color="' + b + '"/></linearGradient></defs>';
  const OL = '#1b1208';

  function coin() {
    const g = id();
    return wrap('0 0 32 32', lin(g, '#fff27a', '#f0a20e') + '<circle cx="16" cy="16" r="13" fill="url(#' + g + ')" stroke="' + OL + '" stroke-width="2.4"/><circle cx="16" cy="16" r="9" fill="none" stroke="#c07a06" stroke-width="1.6"/><path d="M11 18 Q16 9 21 18 Z" fill="#e9900a" stroke="#a35d04" stroke-width="1.2"/><path d="M13 17 L16 11.5 M16 17 V11.5 M19 17 L16 11.5" stroke="#a35d04" stroke-width="1"/><ellipse cx="11.5" cy="10" rx="4" ry="2" fill="#fff" opacity=".7" transform="rotate(-30 11.5 10)"/>');
  }
  function heart() {
    const g = id();
    return wrap('0 0 32 32', lin(g, '#ff8a8a', '#d61d2a') + '<path d="M16 28 C5 20 2 14 4 9 C6 4 13 4 16 9 C19 4 26 4 28 9 C30 14 27 20 16 28 Z" fill="url(#' + g + ')" stroke="' + OL + '" stroke-width="2.4" stroke-linejoin="round"/><ellipse cx="10" cy="10" rx="3.5" ry="2" fill="#fff" opacity=".75" transform="rotate(-35 10 10)"/>');
  }
  function eco() {
    const g = id();
    return wrap('0 0 32 32', lin(g, '#b6ff6a', '#2fa514') + '<path d="M16 4 L29 26 H3 Z" fill="url(#' + g + ')" stroke="' + OL + '" stroke-width="2.6" stroke-linejoin="round"/><path d="M16 9 L9 22" stroke="#fff" stroke-width="2" opacity=".6" stroke-linecap="round"/>');
  }
  function hourglass() {
    const g = id();
    return wrap('0 0 32 32', lin(g, '#ffe9a8', '#f2b23a') + '<rect x="6" y="3" width="20" height="4" rx="1.5" fill="#9a5a24" stroke="' + OL + '" stroke-width="2"/><rect x="6" y="25" width="20" height="4" rx="1.5" fill="#9a5a24" stroke="' + OL + '" stroke-width="2"/><path d="M9 7 H23 Q23 13 16 16 Q23 19 23 25 H9 Q9 19 16 16 Q9 13 9 7 Z" fill="#dff4ff" stroke="' + OL + '" stroke-width="2"/><path d="M11 23 Q16 17 21 23 Z M12 9 H20 Q19 12 16 13.5 Q13 12 12 9 Z" fill="url(#' + g + ')"/>');
  }
  function flag() {
    const g = id();
    return wrap('0 0 32 32', lin(g, '#ffffff', '#cfd8e0') + '<path d="M8 4 V29" stroke="' + OL + '" stroke-width="3.4" stroke-linecap="round"/><path d="M8 4 V29" stroke="#8a5a2a" stroke-width="1.6" stroke-linecap="round"/><path d="M9 5 Q16 2 20 6 T28 6 V17 Q23 20 19 16 T9 16 Z" fill="url(#' + g + ')" stroke="' + OL + '" stroke-width="2.2" stroke-linejoin="round"/>');
  }
  function lock() {
    const g = id();
    return wrap('0 0 32 32', lin(g, '#ffe46a', '#e09a0a') + '<path d="M10 14 V10 a6 6 0 0 1 12 0 V14" fill="none" stroke="' + OL + '" stroke-width="5"/><path d="M10 14 V10 a6 6 0 0 1 12 0 V14" fill="none" stroke="#c9ced4" stroke-width="2.4"/><rect x="5.5" y="13" width="21" height="16" rx="4" fill="url(#' + g + ')" stroke="' + OL + '" stroke-width="2.4"/><circle cx="16" cy="20" r="2.4" fill="' + OL + '"/><rect x="15" y="20" width="2" height="5" fill="' + OL + '"/>');
  }
  function gear() {
    const g = id();
    let teeth = '';
    for (let i = 0; i < 8; i++) teeth += '<rect x="13.5" y="1.5" width="5" height="7" rx="1.2" transform="rotate(' + i * 45 + ' 16 16)" fill="url(#' + g + ')" stroke="' + OL + '" stroke-width="2"/>';
    return wrap('0 0 32 32', lin(g, '#f2f6fa', '#9fb0c0') + teeth + '<circle cx="16" cy="16" r="9.5" fill="url(#' + g + ')" stroke="' + OL + '" stroke-width="2.2"/><circle cx="16" cy="16" r="3.6" fill="#4a5866" stroke="' + OL + '" stroke-width="1.6"/>');
  }
  function play() {
    const g = id();
    return wrap('0 0 32 32', lin(g, '#ffffff', '#d9f2c6') + '<path d="M10 6 L26 16 L10 26 Z" fill="url(#' + g + ')" stroke="' + OL + '" stroke-width="2.6" stroke-linejoin="round"/>');
  }
  function ffwd() {
    const g = id();
    return wrap('0 0 32 32', lin(g, '#ffffff', '#d9f2c6') + '<path d="M4 7 L16 16 L4 25 Z M16 7 L28 16 L16 25 Z" fill="url(#' + g + ')" stroke="' + OL + '" stroke-width="2.4" stroke-linejoin="round"/>');
  }
  function sound(on) {
    const g = id();
    return wrap('0 0 32 32', lin(g, '#ffffff', '#cfd8e0') + '<path d="M4 12 H10 L18 5 V27 L10 20 H4 Z" fill="url(#' + g + ')" stroke="' + OL + '" stroke-width="2.4" stroke-linejoin="round"/>' + (on ? '<path d="M22 11 Q26 16 22 21 M25 8 Q31 16 25 24" fill="none" stroke="' + OL + '" stroke-width="2.6" stroke-linecap="round"/>' : '<path d="M22 11 L29 21 M29 11 L22 21" stroke="#e8302a" stroke-width="3.4" stroke-linecap="round"/>'));
  }
  function close() {
    const g = id();
    return wrap('0 0 32 32', lin(g, '#ff8a6a', '#d7261b') + '<circle cx="16" cy="16" r="13" fill="url(#' + g + ')" stroke="' + OL + '" stroke-width="2.4"/><path d="M11 11 L21 21 M21 11 L11 21" stroke="#fff" stroke-width="3.6" stroke-linecap="round"/>');
  }
  function arrow(dir) {
    const g = id();
    const d = dir === 'l' ? 'M21 5 L9 16 L21 27 Z' : 'M11 5 L23 16 L11 27 Z';
    return wrap('0 0 32 32', lin(g, '#ffffff', '#cfe6ff') + '<path d="' + d + '" fill="url(#' + g + ')" stroke="' + OL + '" stroke-width="2.6" stroke-linejoin="round"/>');
  }
  function bolt() {
    const g = id();
    return wrap('0 0 32 32', lin(g, '#fff27a', '#ff9d0a') + '<path d="M19 2 L6 18 H14 L11 30 L26 12 H17 Z" fill="url(#' + g + ')" stroke="' + OL + '" stroke-width="2.4" stroke-linejoin="round"/>');
  }
  function eye() {
    return wrap('0 0 32 32', '<path d="M2 16 Q16 3 30 16 Q16 29 2 16 Z" fill="#fff" stroke="' + OL + '" stroke-width="2.4"/><circle cx="16" cy="16" r="6" fill="#3fae4a" stroke="' + OL + '" stroke-width="1.8"/><circle cx="16" cy="16" r="2.6" fill="' + OL + '"/>');
  }
  function leaf() {
    const g = id();
    return wrap('0 0 32 32', lin(g, '#b6ff6a', '#2fa514') + '<path d="M6 26 Q4 8 26 5 Q26 26 6 26 Z" fill="url(#' + g + ')" stroke="' + OL + '" stroke-width="2.4"/><path d="M8 24 Q14 14 22 9" stroke="#1f6b10" stroke-width="1.8" fill="none"/>');
  }
  function target() {
    return wrap('0 0 32 32', '<circle cx="16" cy="16" r="12" fill="#fff" stroke="' + OL + '" stroke-width="2.4"/><circle cx="16" cy="16" r="7.5" fill="#e8302a" stroke="' + OL + '" stroke-width="1.8"/><circle cx="16" cy="16" r="3" fill="#fff"/>');
  }
  function trophy() {
    const g = id();
    return wrap('0 0 32 32', lin(g, '#fff27a', '#e09a0a') + '<path d="M9 4 H23 V12 a7 7 0 0 1 -14 0 Z" fill="url(#' + g + ')" stroke="' + OL + '" stroke-width="2.2"/><path d="M9 7 H4 Q4 14 10 15 M23 7 H28 Q28 14 22 15" fill="none" stroke="' + OL + '" stroke-width="2.2"/><rect x="13" y="19" width="6" height="5" fill="#e09a0a" stroke="' + OL + '" stroke-width="2"/><rect x="9" y="24" width="14" height="5" rx="1.5" fill="#9a5a24" stroke="' + OL + '" stroke-width="2"/>');
  }
  function swords() {
    return wrap('0 0 32 32', '<path d="M5 5 L22 22 M27 5 L10 22" stroke="' + OL + '" stroke-width="5.4" stroke-linecap="round"/><path d="M5 5 L22 22 M27 5 L10 22" stroke="#e6edf3" stroke-width="2.6" stroke-linecap="round"/><path d="M19 25 L25 19 M7 19 L13 25" stroke="' + OL + '" stroke-width="5" stroke-linecap="round"/><path d="M19 25 L25 19 M7 19 L13 25" stroke="#ffcf2e" stroke-width="2.4" stroke-linecap="round"/>');
  }
  function globe() {
    const g = id();
    return wrap('0 0 32 32', lin(g, '#7fd6ff', '#1f78c9') + '<circle cx="16" cy="16" r="13" fill="url(#' + g + ')" stroke="' + OL + '" stroke-width="2.4"/><path d="M8 10 Q12 8 13 12 Q11 16 14 18 Q12 23 9 21 Q6 16 8 10 Z M18 6 Q24 8 25 13 Q21 14 20 11 Q17 10 18 6 Z M19 19 Q24 18 25 22 Q21 26 18 24 Z" fill="#5ed14a" stroke="#1f6b10" stroke-width="1.2"/>');
  }
  function wave() {
    return wrap('0 0 32 32', '<circle cx="16" cy="16" r="13" fill="#ff5d5d" stroke="' + OL + '" stroke-width="2.4"/><circle cx="12" cy="13" r="6" fill="#54b6ff" stroke="' + OL + '" stroke-width="1.8"/><circle cx="20" cy="19" r="5" fill="#ffe14d" stroke="' + OL + '" stroke-width="1.8"/><ellipse cx="10" cy="10" rx="2" ry="1.2" fill="#fff"/>');
  }
  function book() {
    const g = id();
    return wrap('0 0 32 32', lin(g, '#ff9a5a', '#d7501b') + '<path d="M5 6 Q11 4 16 7 Q21 4 27 6 V26 Q21 24 16 27 Q11 24 5 26 Z" fill="url(#' + g + ')" stroke="' + OL + '" stroke-width="2.4" stroke-linejoin="round"/><path d="M16 7 V27" stroke="' + OL + '" stroke-width="2"/><path d="M8 10 Q11 9 13 10 M8 14 Q11 13 13 14 M19 10 Q21 9 24 10 M19 14 Q21 13 24 14" stroke="#fff" stroke-width="1.6" opacity=".8"/>');
  }
  function music(on) {
    const g = id();
    return wrap('0 0 32 32', lin(g, '#ffffff', '#cfd8e0') + '<path d="M12 6 L26 3 V21" fill="none" stroke="' + OL + '" stroke-width="5" stroke-linejoin="round"/><path d="M12 6 L26 3 V21" fill="none" stroke="url(#' + g + ')" stroke-width="2.4" stroke-linejoin="round"/><path d="M12 6 V24" stroke="' + OL + '" stroke-width="5"/><path d="M12 6 V24" stroke="#fff" stroke-width="2.4"/><ellipse cx="8.5" cy="24.5" rx="5" ry="4" fill="url(#' + g + ')" stroke="' + OL + '" stroke-width="2.2"/><ellipse cx="22.5" cy="21.5" rx="5" ry="4" fill="url(#' + g + ')" stroke="' + OL + '" stroke-width="2.2"/>' + (on ? '' : '<path d="M4 4 L28 28" stroke="#e8302a" stroke-width="3.6" stroke-linecap="round"/>'));
  }
  function back() {
    return arrow('l');
  }
  function dice(face) {
    const g = id();
    const P = { 1: [[16, 16]], 2: [[11, 11], [21, 21]], 3: [[10, 10], [16, 16], [22, 22]], 4: [[11, 11], [21, 11], [11, 21], [21, 21]], 5: [[10, 10], [22, 10], [16, 16], [10, 22], [22, 22]], 6: [[11, 9], [21, 9], [11, 16], [21, 16], [11, 23], [21, 23]] }[face || 5];
    return wrap('0 0 32 32', lin(g, '#ffffff', '#d4dde6') + '<rect x="4" y="4" width="24" height="24" rx="6" fill="url(#' + g + ')" stroke="' + OL + '" stroke-width="2.4"/>' + P.map(([x, y]) => '<circle cx="' + x + '" cy="' + y + '" r="2.6" fill="' + (face === 1 ? '#e8302a' : OL) + '"/>').join('') + '<path d="M8 8 Q12 6 15 7" stroke="#fff" stroke-width="1.6" fill="none" stroke-linecap="round"/>');
  }
  function user() {
    const g = id();
    return wrap('0 0 32 32', lin(g, '#ffe9a8', '#f2a23a') + '<circle cx="16" cy="11" r="6.5" fill="url(#' + g + ')" stroke="' + OL + '" stroke-width="2.2"/><path d="M5 28 Q6 18 16 18 Q26 18 27 28 Z" fill="url(#' + g + ')" stroke="' + OL + '" stroke-width="2.2" stroke-linejoin="round"/>');
  }
  function crate() {
    const g = id();
    return wrap('0 0 32 32', lin(g, '#e0a05a', '#9a5a24') + '<rect x="4" y="7" width="24" height="19" rx="3" fill="url(#' + g + ')" stroke="' + OL + '" stroke-width="2.4"/><path d="M4 14 H28 M16 7 V26" stroke="' + OL + '" stroke-width="1.8"/>');
  }
  // Symbole der Kräfte (runde Plakette in der Farbe der Kraft)
  const POWER_ART = {
    spikes: '<circle cx="16" cy="17" r="6" fill="#7a4bd6" stroke="#1b1208" stroke-width="1.8"/>' + Array.from({ length: 12 }, (_, i) => { const a = (i / 12) * Math.PI * 2; return '<path d="M' + (16 + Math.cos(a) * 6) + ' ' + (17 + Math.sin(a) * 6) + ' L' + (16 + Math.cos(a) * 11.5) + ' ' + (17 + Math.sin(a) * 11.5) + '" stroke="#2a1650" stroke-width="2" stroke-linecap="round"/>'; }).join(''),
    bomb: '<circle cx="15" cy="18" r="9" fill="#2b2f3a" stroke="#1b1208" stroke-width="2"/><rect x="17" y="6" width="6" height="5" rx="1" fill="#555" stroke="#1b1208" stroke-width="1.5" transform="rotate(35 20 8)"/><path d="M23 6 Q26 2 28 4" stroke="#a0703a" stroke-width="2" fill="none"/><circle cx="28" cy="4" r="2.2" fill="#ffd23f"/><ellipse cx="11" cy="14" rx="3" ry="1.6" fill="#fff" opacity=".6"/>',
    cash: '<ellipse cx="16" cy="22" rx="10" ry="4" fill="#e9a20e" stroke="#1b1208" stroke-width="1.8"/><ellipse cx="16" cy="18" rx="10" ry="4" fill="#ffd23f" stroke="#1b1208" stroke-width="1.8"/><ellipse cx="16" cy="13" rx="10" ry="4" fill="#ffe14d" stroke="#1b1208" stroke-width="1.8"/><path d="M12 13 Q16 8 20 13" stroke="#c07a06" stroke-width="1.6" fill="none"/>',
    freeze: '<g stroke="#1b1208" stroke-width="4.2" stroke-linecap="round"><path d="M16 4 V28 M5.6 10 L26.4 22 M5.6 22 L26.4 10"/></g><g stroke="#dff6ff" stroke-width="2.2" stroke-linecap="round"><path d="M16 4 V28 M5.6 10 L26.4 22 M5.6 22 L26.4 10"/></g>',
    rage: '<path d="M16 3 C20 9 26 12 24 20 C23 26 19 29 16 29 C11 29 7 25 8 19 C9 15 12 14 12 9 C14 11 15 13 16 3 Z" fill="#ff5a36" stroke="#1b1208" stroke-width="2" stroke-linejoin="round"/><path d="M16 14 C18 18 21 19 20 23 C19 26 13 26 12 23 C12 20 15 19 16 14 Z" fill="#ffd23f"/>',
    shield: '<path d="M16 3 L27 7 V15 C27 22 22 27 16 29 C10 27 5 22 5 15 V7 Z" fill="#58c4ff" stroke="#1b1208" stroke-width="2.2" stroke-linejoin="round"/><path d="M16 7 V25 M9 13 H23" stroke="#fff" stroke-width="2" opacity=".7"/>',
    radar: '<path d="M6 16 Q6 5 16 5 Q26 5 26 16 Z" fill="#b6ff6a" stroke="#1b1208" stroke-width="2" stroke-linejoin="round"/><path d="M9 16 Q8 22 10 27 M14 16 Q13 23 15 28 M19 16 Q20 23 18 28 M23 16 Q25 22 23 27" stroke="#5fae2a" stroke-width="2" fill="none" stroke-linecap="round"/><ellipse cx="12" cy="10" rx="3" ry="1.6" fill="#fff" opacity=".7"/>',
    heal: '<path d="M16 28 C5 20 3 14 5 9 C7 4 13 4 16 9 C19 4 25 4 27 9 C29 14 27 20 16 28 Z" fill="#ff6fb5" stroke="#1b1208" stroke-width="2" stroke-linejoin="round"/><path d="M16 11 V21 M11 16 H21" stroke="#fff" stroke-width="3" stroke-linecap="round"/>',
    boost: '<path d="M5 9 L14 16 L5 23 M15 9 L24 16 L15 23" stroke="#1b1208" stroke-width="6" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M5 9 L14 16 L5 23 M15 9 L24 16 L15 23" stroke="#ff9a2e" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/><circle cx="27" cy="16" r="2.5" fill="#e8352b" stroke="#1b1208" stroke-width="1.2"/>',
    fog: '<path d="M7 22 C3 22 3 16 7 15 C7 10 13 8 16 11 C18 7 25 8 25 13 C29 13 30 21 25 22 Z" fill="#2b2440" stroke="#1b1208" stroke-width="2" stroke-linejoin="round"/><circle cx="12" cy="26" r="2" fill="#2b2440"/><circle cx="19" cy="27" r="1.6" fill="#2b2440"/><ellipse cx="13" cy="14" rx="3" ry="1.4" fill="#8a7ab0" opacity=".8"/>',
  };
  function power(pid) {
    const def = SC.POWER_BY_ID[pid];
    const g = id();
    return wrap('0 0 32 32', '<defs><radialGradient id="' + g + '" cx=".4" cy=".35" r=".75"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="' + (def ? def.col : '#888') + '"/></radialGradient></defs><circle cx="16" cy="16" r="15" fill="url(#' + g + ')" opacity=".55"/>' + (POWER_ART[pid] || ''));
  }
  return { music, coin, heart, eco, hourglass, flag, lock, gear, play, ffwd, sound, close, arrow, bolt, eye, leaf, target, trophy, swords, globe, wave, book, back, dice, user, crate, power };
})();
