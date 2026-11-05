'use strict';
/*
 * Factions: the city is shared between rival factions, the Mayor's among them. Each holds a territory
 * (an irregular region around its own heart, anywhere in the city: the Mayor is not necessarily central).
 * Every territory is walled all round (a fantasy city); along the borders the ground adds its own barrier:
 *   - a ridge (a long steep hill line: nobody builds on it, and it hides one quarter from the other),
 *   - a ravine (a gorge between two cliffs, crossed only by bridges),
 *   - water (a canal, crossed only by bridges),
 *   - or nothing but the wall.
 * Some borders are lined with waste ground: a no man's land where nobody dares build any more.
 * The Mayor's territory holds the Esplanade: a terrace on top of a cliff, above the square where the crowd listens.
 *
 * Territories are the regions nearest to each heart, measured through a gentle warp (so borders wind),
 * which makes "which faction?" and "how far from a border?" cheap to answer anywhere
 * (the elevation is computed millions of times).
 * Pure data. Depends on nothing but the random generator it is given.
 */

const BARRIER_TYPES = ['ridge', 'ravine', 'water', 'wall'];

function makeFactions({ K, R, E, cellR, rand, terrace }) {
  const TAU = Math.PI * 2;
  const smoothstep = t => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));
  const n = K >= 2 ? K + 1 : 0;   // K rival factions + the Mayor's (the last one)
  const mayor = n ? n - 1 : -1;

  // --- Hearts of the territories: spread over the town, the Mayor's anywhere among them ---
  const seeds = [];
  for (let k = 0; k < n; k++) {
    let best = null, bs = -1;
    for (let t = 0; t < 40; t++) {
      const a = rand() * TAU, r = Math.sqrt(rand()) * 0.62 * R, p = [Math.cos(a) * r, Math.sin(a) * r];
      const s = Math.min(Infinity, ...seeds.map(q => Math.hypot(p[0] - q[0], p[1] - q[1])), 0.9 * R - r * 0.3);
      if (s > bs) { bs = s; best = p; }
    }
    seeds.push(best);
  }
  // The Mayor's heart: any of them (shuffle the last place)
  if (n) { const m = Math.floor(rand() * n); [seeds[m], seeds[mayor]] = [seeds[mayor], seeds[m]]; }

  // A gentle warp, so that borders wind instead of running straight
  const wA = 0.07 * R, wL1 = 0.22 * R, wL2 = 0.13 * R, ph = [rand(), rand(), rand(), rand()].map(x => x * TAU);
  const warp = (x, y) => [x + wA * (Math.sin(y / wL1 + ph[0]) + 0.5 * Math.sin((x + y) / wL2 + ph[1])),
    y + wA * (Math.sin(x / wL1 + ph[2]) + 0.5 * Math.sin((x - y) / wL2 + ph[3]))];
  // The two nearest hearts of a point (in the warped space): its territory and the neighbour across the nearest border
  const nearest2 = (x, y) => {
    const [wx, wy] = warp(x, y);
    let i = -1, j = -1, d1 = Infinity, d2 = Infinity;
    for (let k = 0; k < n; k++) {
      const d = Math.hypot(wx - seeds[k][0], wy - seeds[k][1]);
      if (d < d1) { j = i; d2 = d1; i = k; d1 = d; } else if (d < d2) { j = k; d2 = d; }
    }
    return { i, j, d1, d2 };
  };
  const pairKey = (a, b) => (a < b ? a + '-' + b : b + '-' + a);

  // --- Borders: every pair of neighbouring territories, each with its barrier and maybe waste ground ---
  const borders = [], byPair = new Map();
  if (n) {
    const step = R / 40;
    for (let y = -1.2 * R; y <= 1.2 * R; y += step) for (let x = -1.2 * R; x <= 1.2 * R; x += step) {
      if (Math.hypot(x, y) > 1.2 * R) continue;
      const q = nearest2(x, y);
      if (q.d2 - q.d1 < 0.06 * R && !byPair.has(pairKey(q.i, q.j))) byPair.set(pairKey(q.i, q.j), { a: Math.min(q.i, q.j), b: Math.max(q.i, q.j) });
    }
    const types = [];
    while (types.length < byPair.size) types.push(...BARRIER_TYPES.slice().sort(() => rand() - 0.5));
    [...byPair.values()].forEach((b, k) => {
      b.k = k; b.type = types[k];
      if (b.type === 'ridge') { b.H = 26 + rand() * 18; b.w = Math.max(28, 0.06 * R) * (0.9 + rand() * 0.4); }
      if (b.type === 'ravine') { b.D = 16 + rand() * 14; b.floor = 4 + rand() * 4; b.edge = 6 + rand() * 3; }
      if (b.type === 'water') b.w = 7 + rand() * 3;
      // No man's land: on one border out of two, a strip of waste ground on both sides of the wall
      b.waste = rand() < 0.5 ? (0.3 + rand() * 0.35) * cellR : 0;
      borders.push(b);
    });
  }
  const borderOf = q => (q.j >= 0 ? byPair.get(pairKey(q.i, q.j)) : null);
  const fade = r => 1 - smoothstep((r - 1.05 * R) / (0.3 * R));   // barriers fade out past the walls

  const factionAt = p => (n ? nearest2(p[0], p[1]).i : -1);
  const borderNear = p => (n ? borderOf(nearest2(p[0], p[1])) : null);
  const isWaste = p => {
    if (!n) return false;
    const q = nearest2(p[0], p[1]), b = borderOf(q);
    return !!b && b.waste > 0 && (q.d2 - q.d1) / 2 < b.waste;
  };

  // --- The esplanade: a terrace with a cliff facing the square where the crowd gathers ---
  const T = terrace ? (() => {
    const base = n ? seeds[mayor] : [0, 0];
    const dir = rand() * TAU;
    const rT = Math.max(26, 0.9 * cellR);              // radius of the flat top
    const front = [-Math.cos(dir), -Math.sin(dir)];      // the cliff faces the square, towards the heart of the territory
    const d0 = rT + Math.max(18, 0.8 * cellR);
    const c = [base[0] + Math.cos(dir) * d0, base[1] + Math.sin(dir) * d0];
    return { c, r: rT, front, H: 11 + rand() * 6, sharp: 3.5, soft: 0.8 * rT, foot: [c[0] + front[0] * (rT + 0.9 * cellR), c[1] + front[1] * (rT + 0.9 * cellR)] };
  })() : null;
  const terraceBand = cosA => T.soft + (T.sharp - T.soft) * smoothstep((cosA - 0.25) / 0.45);
  const terraceLevel = p => {
    if (!T) return 0;
    const dx = p[0] - T.c[0], dy = p[1] - T.c[1], d = Math.hypot(dx, dy);
    if (d > T.r + T.soft) return 0;
    const cosA = d ? (dx * T.front[0] + dy * T.front[1]) / d : 0;
    return 1 - smoothstep((d - T.r) / terraceBand(cosA));
  };

  // --- Elevation added by barriers and the terrace, in metres ---
  const meters = (x, y) => {
    let h = 0;
    if (n) {
      const q = nearest2(x, y), b = borderOf(q);
      if (b && (b.type === 'ridge' || b.type === 'ravine')) {
        const d = (q.d2 - q.d1) / 2, r = Math.hypot(x, y);
        if (b.type === 'ridge' && d < b.w) h += b.H * (1 - smoothstep(d / b.w)) * fade(r);
        if (b.type === 'ravine' && d < b.floor + b.edge) h -= b.D * (1 - smoothstep((d - b.floor) / b.edge)) * fade(r - 0.2 * R);
      }
    }
    if (T) h += T.H * terraceLevel([x, y]);
    return h;
  };

  // --- Lines along a border, at a given distance from it (positive: on side a) ---
  const lines = (b, off) => {
    const si = seeds[b.a], sj = seeds[b.b];
    const L = Math.hypot(sj[0] - si[0], sj[1] - si[1]) || 1, u = [(sj[0] - si[0]) / L, (sj[1] - si[1]) / L], v = [-u[1], u[0]];
    const m = [(si[0] + sj[0]) / 2, (si[1] + sj[1]) / 2];
    const g = p => { const q = nearest2(p[0], p[1]); return { ok: (q.i === b.a && q.j === b.b) || (q.i === b.b && q.j === b.a), s: (q.i === b.a ? 1 : -1) * (q.d2 - q.d1) / 2 - off }; };
    const out = [];
    let cur = [];
    for (let t = -1.5 * R; t <= 1.5 * R; t += 6) {
      const q0 = [m[0] + v[0] * t, m[1] + v[1] * t];
      let lo = -0.4 * R, hi = 0.4 * R;
      const at = s => [q0[0] + u[0] * s, q0[1] + u[1] * s];
      let glo = g(at(lo)).s, ghi = g(at(hi)).s, p = null;
      if (glo * ghi < 0) {
        for (let it = 0; it < 30; it++) { const mid = (lo + hi) / 2, gm = g(at(mid)).s; if ((gm > 0) === (glo > 0)) { lo = mid; glo = gm; } else hi = mid; }
        p = at((lo + hi) / 2);
        if (!g(p).ok || Math.hypot(p[0], p[1]) > 1.6 * R) p = null;
      }
      if (p && (!cur.length || Math.hypot(p[0] - cur[cur.length - 1][0], p[1] - cur[cur.length - 1][1]) < 25)) cur.push(p);
      else { if (cur.length > 2) out.push(cur); cur = p ? [p] : []; }
    }
    if (cur.length > 2) out.push(cur);
    return out;
  };

  // Ravine rims (cliffs on both sides) and the terrace's cliff
  const cliffs = [];
  for (const b of borders) if (b.type === 'ravine') {
    for (const off of [b.floor + b.edge / 2, -(b.floor + b.edge / 2)]) for (const pts of lines(b, off)) {
      if (pts.every(p => Math.hypot(p[0], p[1]) > 1.35 * R)) continue;
      cliffs.push({ points: pts.filter(p => Math.hypot(p[0], p[1]) < 1.35 * R), side: off > 0 ? -1 : 1, drop: Math.round(b.D), kind: 'ravine', border: b.k });
    }
  }
  if (T) {
    const pts = [], a0 = Math.atan2(T.front[1], T.front[0]);
    for (let i = -24; i <= 24; i++) {
      const a = a0 + (i / 24) * 1.05, d = T.r + terraceBand(Math.cos(a - a0)) * 0.5;
      pts.push([T.c[0] + Math.cos(a) * d, T.c[1] + Math.sin(a) * d]);
    }
    cliffs.push({ points: pts, center: T.c, drop: Math.round(T.H), kind: 'terrace' });
  }
  for (const cl of cliffs) if (cl.points.length < 2) cl.points = [];

  return { K: n, mayor, seeds, borders, factionAt, borderNear, isWaste, meters, cliffs: cliffs.filter(c => c.points.length > 1), lines, terrace: T, terraceLevel };
}
