'use strict';
/*
 * Factions: the city is shared between rival factions, each holding a wedge around a neutral centre.
 * The geography helps each one hold its ground: between two territories runs a barrier,
 *   - a ridge (a long steep hill line: nobody builds on it, and it hides one quarter from the other),
 *   - a ravine (a gorge with cliffs on both sides, crossed only by bridges),
 *   - water (a canal, crossed only by bridges),
 *   - an inner wall (with a gate where each main street passes).
 * The neutral centre holds the market and the Mayor's Esplanade: a terrace on top of a cliff,
 * from which the mayor speaks to the crowd gathered in the square below.
 *
 * Borders are curves θ_k(r) around the centre, so "which faction?" and "how far from a border?"
 * are cheap to answer anywhere (the elevation is computed millions of times).
 * Pure data. Depends on nothing but the random generator it is given.
 */

const BARRIER_TYPES = ['ridge', 'ravine', 'water', 'wall'];

function makeFactions({ K, R, E, cellR, rand, terrace }) {
  const TAU = Math.PI * 2;
  const smoothstep = t => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));
  const wrap = a => ((a % TAU) + TAU) % TAU;
  const rIn = Math.max(2 * cellR, 0.22 * R);   // the centre (the mayor's quarter): market and esplanade

  // --- Borders: K curves leaving the centre, roughly evenly spaced ---
  const base = rand() * TAU;
  const borders = [];
  // A mix of barriers: every type appears before any repeats, in a random order
  const types = [];
  while (types.length < K) types.push(...BARRIER_TYPES.slice().sort(() => rand() - 0.5));
  for (let k = 0; k < (K >= 2 ? K : 0); k++) {
    const b = {
      k, type: types[k],
      th0: base + (k / K) * TAU + (rand() - 0.5) * (TAU / K) * 0.35,
      A: 0.06 + rand() * 0.1, L: (0.18 + rand() * 0.15) * R, ph: rand() * TAU,
    };
    if (b.type === 'ridge') { b.H = 28 + rand() * 18; b.w = Math.max(28, 0.06 * R) * (0.9 + rand() * 0.4); }
    if (b.type === 'ravine') { b.D = 16 + rand() * 14; b.floor = 4 + rand() * 4; b.edge = 6 + rand() * 3; }
    if (b.type === 'water') b.w = 7 + rand() * 3;
    borders.push(b);
  }
  borders.sort((a, b) => wrap(a.th0 - base) - wrap(b.th0 - base));
  borders.forEach((b, i) => { b.k = i; });
  const thetaAt = (b, r) => b.th0 + b.A * Math.sin(r / b.L + b.ph);
  // Distance (m) from a point to a border, measured across it, and on which side
  const across = (b, r, th) => { let d = th - thetaAt(b, r); d = Math.atan2(Math.sin(d), Math.cos(d)); return d * r; };
  // Where barriers are felt: from just outside the centre to a little past the walls
  const along = (r, r1, r2) => smoothstep((r - rIn) / (0.12 * R)) * (1 - smoothstep((r - r1) / r2));

  // Faction of a point: -1 in the neutral centre, otherwise the wedge between border k and border k+1
  const factionAt = p => {
    const r = Math.hypot(p[0], p[1]);
    if (!borders.length || r < rIn) return -1;
    const th = Math.atan2(p[1], p[0]);
    let best = 0, bu = Infinity;
    borders.forEach((b, k) => { const u = wrap(th - thetaAt(b, r)); if (u < bu) { bu = u; best = k; } });
    return best;
  };

  // --- The esplanade: a terrace with a cliff facing the market square ---
  const T = terrace ? (() => {
    const dir = rand() * TAU;                     // where the terrace stands, seen from the square
    const rT = Math.max(26, 0.9 * cellR);         // radius of the flat top
    const front = [-Math.cos(dir), -Math.sin(dir)]; // the cliff faces the square (the centre)
    const d0 = rT + Math.max(18, 0.8 * cellR);    // the square in front, between the cliff and the centre
    return { c: [Math.cos(dir) * d0, Math.sin(dir) * d0], r: rT, front, H: 11 + rand() * 6, sharp: 3.5, soft: 0.8 * rT };
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
    const r = Math.hypot(x, y);
    if (r >= rIn) {
      const th = Math.atan2(y, x);
      for (const b of borders) {
        if (b.type === 'ridge') {
          const d = Math.abs(across(b, r, th));
          if (d < b.w) h += b.H * (1 - smoothstep(d / b.w)) * along(r, 1.05 * R, 0.3 * R);
        } else if (b.type === 'ravine') {
          const d = Math.abs(across(b, r, th));
          if (d < b.floor + b.edge) h -= b.D * (1 - smoothstep((d - b.floor) / b.edge)) * along(r, 1.25 * R, 0.4 * R);
        }
      }
    }
    if (T) h += T.H * terraceLevel([x, y]);
    return h;
  };

  // --- Lines for drawing and for streets/houses ---
  const curve = (b, off, r1, r2, step = 8) => {
    const pts = [];
    for (let r = r1; r <= r2; r += step) {
      const th = thetaAt(b, r) + off / r;
      pts.push([Math.cos(th) * r, Math.sin(th) * r]);
    }
    return pts;
  };
  // Ravine rims: cliffs on both sides, where the gorge is deep enough to matter
  const cliffs = [];
  for (const b of borders) if (b.type === 'ravine') {
    const r1 = rIn + 0.06 * R, r2 = 1.25 * R + 0.2 * R;
    for (const side of [1, -1]) cliffs.push({ points: curve(b, side * (b.floor + b.edge / 2), r1, r2), side: -side, drop: Math.round(b.D), kind: 'ravine', border: b.k });
  }
  if (T) {
    // The terrace's cliff: the part of its edge that faces the square
    const pts = [], a0 = Math.atan2(T.front[1], T.front[0]);
    for (let i = -24; i <= 24; i++) {
      const a = a0 + (i / 24) * 1.05, cosA = Math.cos(a - a0);
      const d = T.r + terraceBand(cosA) * 0.5;
      pts.push([T.c[0] + Math.cos(a) * d, T.c[1] + Math.sin(a) * d]);
    }
    cliffs.push({ points: pts, center: T.c, drop: Math.round(T.H), kind: 'terrace' });
  }
  // Axis of each border (inner walls and canals follow it; bridges cross ravines on it)
  const axis = b => curve(b, 0, rIn, 1.6 * R, 6);

  // The border running nearest to a point (to know which barrier separates two neighbouring blocks)
  const borderNear = p => {
    const r = Math.hypot(p[0], p[1]), th = Math.atan2(p[1], p[0]);
    let best = null, bd = Infinity;
    for (const b of borders) { const d = Math.abs(across(b, r, th)); if (d < bd) { bd = d; best = b; } }
    return best;
  };

  return { K: borders.length, rIn, borders, factionAt, borderNear, meters, cliffs, axis, terrace: T, terraceLevel, curve };
}
