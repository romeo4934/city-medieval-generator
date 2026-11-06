'use strict';
/*
 * Terrain tools shared by the generator and the editor.
 * - A height grid: the relief is computed once on a fine grid, then read by bilinear interpolation
 *   (fast, and the place where hand edits are applied).
 * - Smooth value noise, for continuous rolling ground.
 * - Brush edits (raise, lower, smooth) and their compact text form for the page address.
 * Pure data. No dependency.
 */

// Smooth value noise in [-1, 1], seeded; fbm = a few octaves
function makeNoise(seed) {
  const hash = (i, j) => {
    let h = (i * 374761393 + j * 668265263 + seed * 2246822519) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967295 * 2 - 1;
  };
  const sm = t => t * t * (3 - 2 * t);
  const value = (x, y) => {
    const i = Math.floor(x), j = Math.floor(y), u = sm(x - i), v = sm(y - j);
    const a = hash(i, j), b = hash(i + 1, j), c = hash(i, j + 1), d = hash(i + 1, j + 1);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  };
  return (x, y, octaves = 3) => {
    let s = 0, amp = 1, f = 1, norm = 0;
    for (let o = 0; o < octaves; o++) { s += amp * value(x * f + o * 17.3, y * f - o * 9.1); norm += amp; amp *= 0.5; f *= 2.03; }
    return s / norm;
  };
}

// Height grid over [-E, E]²: n×n points, step metres apart
function makeGrid(E, step, fn) {
  const n = Math.ceil((2 * E) / step) + 1, data = new Float32Array(n * n);
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) data[j * n + i] = fn(-E + i * step, -E + j * step);
  return { E, step, n, data };
}
function sampleGrid(g, x, y) {
  const fx = Math.max(0, Math.min(g.n - 1.000001, (x + g.E) / g.step)), fy = Math.max(0, Math.min(g.n - 1.000001, (y + g.E) / g.step));
  const i = Math.floor(fx), j = Math.floor(fy), u = fx - i, v = fy - j, n = g.n, d = g.data;
  const a = d[j * n + i], b = d[j * n + i + 1], c = d[(j + 1) * n + i], e = d[(j + 1) * n + i + 1];
  return a + (b - a) * u + (c - a) * v + (a - b - c + e) * u * v;
}

// One brush stamp: { t: 'r' raise | 'l' lower | 's' smooth, x, y, r (radius, m), a (metres per stamp) }
// unit: how many metres one grid unit is (the generator works in relief units, the editor in metres)
function applyEdit(g, e, unit = 1) {
  const { n, step, E, data } = g;
  const i0 = Math.max(0, Math.floor((e.x - e.r + E) / step)), i1 = Math.min(n - 1, Math.ceil((e.x + e.r + E) / step));
  const j0 = Math.max(0, Math.floor((e.y - e.r + E) / step)), j1 = Math.min(n - 1, Math.ceil((e.y + e.r + E) / step));
  const fall = d => (d >= e.r ? 0 : 0.5 * (1 + Math.cos((Math.PI * d) / e.r)));
  if (e.t === 's') {
    // Smooth: each point moves towards the average of a neighbourhood a fifth of the brush wide
    const k = Math.max(1, Math.round(e.r / 5 / step)), src = data.slice();
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
      const f = fall(Math.hypot(-E + i * step - e.x, -E + j * step - e.y)) * Math.min(1, e.a / 6);
      if (!f) continue;
      let s = 0, c = 0;
      for (let dj = -k; dj <= k; dj++) for (let di = -k; di <= k; di++) {
        const ii = i + di, jj = j + dj;
        if (ii >= 0 && jj >= 0 && ii < n && jj < n) { s += src[jj * n + ii]; c++; }
      }
      data[j * n + i] += (s / c - src[j * n + i]) * f;
    }
    return;
  }
  const sign = e.t === 'l' ? -1 : 1;
  for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
    const f = fall(Math.hypot(-E + i * step - e.x, -E + j * step - e.y));
    if (f) data[j * n + i] += (sign * e.a * f) / unit;
  }
}

// Text form for the page address: "r.120.-40.60.6~l.10.20.40.5" ; rivers "x.y.x.y~x.y.x.y"
const editsToText = edits => edits.map(e => [e.t, Math.round(e.x), Math.round(e.y), Math.round(e.r), Math.round(e.a * 10) / 10, e.g || 0].join('.')).join('~');
const editsFromText = s => (s || '').split('~').filter(Boolean).map(p => {
  const [t, x, y, r, a, g] = parseEdit(p);
  return { t, x, y, r, a, g };
}).filter(e => e.t && 'rls'.includes(e.t) && [e.x, e.y, e.r, e.a].every(Number.isFinite) && e.r > 0);
function parseEdit(p) {
  // the amount may hold a decimal point: t.x.y.r.a[.d].g → read from both ends
  const parts = p.split('.');
  const t = parts[0], x = +parts[1], y = +parts[2], r = +parts[3], g = +parts[parts.length - 1];
  const a = +parts.slice(4, parts.length - 1).join('.');
  return [t, x, y, r, a, g];
}
const riversToText = rivers => rivers.map(pts => pts.map(p => Math.round(p[0]) + '.' + Math.round(p[1])).join('.')).join('~');
const riversFromText = s => (s || '').split('~').filter(Boolean).map(r => {
  const v = r.split('.').map(Number), pts = [];
  for (let k = 0; k + 1 < v.length; k += 2) if (Number.isFinite(v[k]) && Number.isFinite(v[k + 1])) pts.push([v[k], v[k + 1]]);
  return pts;
}).filter(p => p.length >= 2);
