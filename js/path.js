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
