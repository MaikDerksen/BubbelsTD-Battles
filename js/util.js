'use strict';
// Globaler Namespace für das ganze Spiel
const SC = (window.SC = {});

SC.W = 1000; // logische Breite der Karte
SC.H = 600; // logische Höhe der Karte
SC.SPEED = 62; // Pixel pro Sekunde für Tempo 1.0
SC.PATH_W = 46; // Breite des Strömungskanals
SC.ECO_INTERVAL = 6; // Sekunden pro Eco-Tick

SC.clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
SC.lerp = (a, b, t) => a + (b - a) * t;
SC.d2 = (ax, ay, bx, by) => (ax - bx) * (ax - bx) + (ay - by) * (ay - by);
SC.dist = (ax, ay, bx, by) => Math.sqrt(SC.d2(ax, ay, bx, by));

// Deterministischer Zufall (gleiche Wellen auf beiden Geräten)
SC.rng = function (seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

SC.fmt = (n) => {
  n = Math.floor(n);
  if (n >= 100000) return Math.round(n / 1000) + 'k';
  return String(n);
};

SC.store = {
  get(k, def) {
    try {
      const v = localStorage.getItem('scherenschlacht.' + k);
      return v === null ? def : JSON.parse(v);
    } catch (e) {
      return def;
    }
  },
  set(k, v) {
    try {
      localStorage.setItem('scherenschlacht.' + k, JSON.stringify(v));
    } catch (e) {}
  },
};
