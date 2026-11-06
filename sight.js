'use strict';
/*
 * Sight: what can be seen from one point of the city.
 * The ground comes from the terrain grid; houses, landmarks and walls stand on it and block the view.
 * Rays leave the observer in every direction; along each ray, a point is visible if nothing nearer
 * rises above the line from the eye to it (a radial sweep: fast enough to follow a click).
 * Works in the browser and in Node. Depends on geo.js (Geo.centroid is not needed; only plain geometry).
 */

const SIGHT_HEIGHTS = { house: 9, landmark: 16, wall: 11, innerWall: 9, eye: 1.7, tower: 20 };

// Height grid (ground + what stands on it), and the faction of each grid cell. Built once per city.
function sightGrid(city) {
  const E = city.E, T = city.terrain;
  const n = Math.min(520, Math.max(200, Math.round((2 * E) / 3)));
  const g = (2 * E) / n;
  const ground = new Float32Array(n * n), top = new Float32Array(n * n), owner = new Int8Array(n * n).fill(-2);
  // Ground: bilinear in the terrain grid
  const alt = (x, y) => {
    if (!T) return 0;
    const fx = Math.max(0, Math.min(T.G - 1e-6, (x + T.E) / T.step)), fy = Math.max(0, Math.min(T.G - 1e-6, (y + T.E) / T.step));
    const i = Math.floor(fx), j = Math.floor(fy), u = fx - i, v = fy - j, W = T.G + 1;
    const a = T.alt[j * W + i], b = T.alt[j * W + i + 1], c = T.alt[(j + 1) * W + i], d = T.alt[(j + 1) * W + i + 1];
    return a * (1 - u) * (1 - v) + b * u * (1 - v) + c * (1 - u) * v + d * u * v;
  };
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) { const h = alt(-E + (i + 0.5) * g, -E + (j + 0.5) * g); ground[j * n + i] = h; top[j * n + i] = h; }
  // Fill a polygon on the grid
  const fillPoly = (poly, fn) => {
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    for (const p of poly) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); }
    const i0 = Math.max(0, Math.floor((x0 + E) / g)), i1 = Math.min(n - 1, Math.floor((x1 + E) / g));
    const j0 = Math.max(0, Math.floor((y0 + E) / g)), j1 = Math.min(n - 1, Math.floor((y1 + E) / g));
    let hit = false;
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
      const x = -E + (i + 0.5) * g, y = -E + (j + 0.5) * g;
      let c = false;
      for (let a = 0, b = poly.length - 1; a < poly.length; b = a++) {
        const p = poly[a], q = poly[b];
        if ((p[1] > y) !== (q[1] > y) && x < ((q[0] - p[0]) * (y - p[1])) / (q[1] - p[1]) + p[0]) c = !c;
      }
      if (c) { fn(j * n + i); hit = true; }
    }
    // A house smaller than a grid cell still blocks the cell it stands in
    if (!hit) { const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, i = Math.floor((cx + E) / g), j = Math.floor((cy + E) / g); if (i >= 0 && j >= 0 && i < n && j < n) fn(j * n + i); }
  };
  const raise = h => k => { top[k] = Math.max(top[k], ground[k] + h); };
  for (const poly of [...city.houses.stone, ...city.houses.timber, ...city.houses.thatch]) fillPoly(poly, raise(SIGHT_HEIGHTS.house));
  // Le Purificateur, « visible de trois jours de marche » : sa tour monte bien plus haut que tout
  for (const s of city.specials || []) for (const sh of s.shapes || []) for (const poly of sh.polys || []) fillPoly(poly, raise(s.id === 'purificateur' ? 45 : SIGHT_HEIGHTS.landmark));
  // Walls: a thick line
  const line = (a, b, h, w) => {
    const L = Math.hypot(b[0] - a[0], b[1] - a[1]), steps = Math.max(1, Math.ceil(L / (g / 2)));
    for (let s = 0; s <= steps; s++) {
      const x = a[0] + ((b[0] - a[0]) * s) / steps, y = a[1] + ((b[1] - a[1]) * s) / steps;
      const r = Math.max(1, Math.round(w / g));
      for (let dj = -r + 1; dj < r; dj++) for (let di = -r + 1; di < r; di++) {
        const i = Math.floor((x + E) / g) + di, j = Math.floor((y + E) / g) + dj;
        if (i >= 0 && j >= 0 && i < n && j < n) top[j * n + i] = Math.max(top[j * n + i], ground[j * n + i] + h);
      }
    }
  };
  city.wall.forEach((p, k) => line(p, city.wall[(k + 1) % city.wall.length], SIGHT_HEIGHTS.wall, 3));
  (city.innerWalls || []).forEach(([a, b]) => line(a, b, SIGHT_HEIGHTS.innerWall, 2));
  if (city.citadel) city.citadel.edges.forEach(([a, b]) => line(a, b, SIGHT_HEIGHTS.wall, 3));
  // Owner of each cell: a faction, -1 for the mayor's quarter (the rest of the town), -2 outside
  for (const f of city.factions || []) for (const poly of f.polys) fillPoly(poly, k => { owner[k] = f.index; });
  return { n, g, E, ground, top, owner };
}

// What can be seen from point p. eyeExtra: height of the eye above the ground (standing, or up a tower).
function sightFrom(grid, p, eyeExtra = SIGHT_HEIGHTS.eye) {
  const { n, g, E, ground, top } = grid;
  const ci = Math.max(0, Math.min(n - 1, Math.floor((p[0] + E) / g))), cj = Math.max(0, Math.min(n - 1, Math.floor((p[1] + E) / g)));
  // Standing in the street (the esplanade and hills are part of the ground); a tower adds its height
  const eye = ground[cj * n + ci] + eyeExtra, own = cj * n + ci;
  const seen = new Uint8Array(n * n);
  seen[cj * n + ci] = 1;
  const rays = 2880, maxD = Math.SQRT2 * 2 * E, step = g * 0.5;
  for (let r = 0; r < rays; r++) {
    const a = (r / rays) * Math.PI * 2, dx = Math.cos(a), dy = Math.sin(a);
    let best = -Infinity;
    for (let d = step; d < maxD; d += step) {
      const x = p[0] + dx * d, y = p[1] + dy * d;
      const i = Math.floor((x + E) / g), j = Math.floor((y + E) / g);
      if (i < 0 || j < 0 || i >= n || j >= n) break;
      const k = j * n + i;
      if (k === own) continue;   // the house one stands beside does not hide the whole city
      // A person in the street (or a roof top) is seen if it rises above everything nearer
      const target = Math.max(ground[k] + SIGHT_HEIGHTS.eye, top[k]);
      const t = (target - eye) / d;
      if (t >= best) seen[k] = 1;
      const block = (top[k] - eye) / d;
      if (block > best) best = block;
    }
  }
  return seen;
}

// Share of each faction's ground that can be seen (only factions seen on at least 2 % of their quarter)
function sightSummary(grid, seen) {
  const tot = new Map(), vis = new Map();
  for (let k = 0; k < seen.length; k++) {
    const o = grid.owner[k];
    if (o < 0) continue;
    tot.set(o, (tot.get(o) || 0) + 1);
    if (seen[k]) vis.set(o, (vis.get(o) || 0) + 1);
  }
  return [...tot].map(([o, t]) => ({ faction: o, share: (vis.get(o) || 0) / t })).filter(x => x.share >= 0.02).sort((a, b) => b.share - a.share);
}
