'use strict';
/*
 * Campagne autour de la ville : champs, prés et forêts, sans aucune cellule.
 * - Les champs sont des quartiers de culture découpés en lanières perpendiculaires aux routes (openfield),
 *   puis d'autres quartiers plus loin, orientés comme la route la plus proche.
 * - Les forêts occupent ce qui reste loin de la ville et des routes, surtout sur les pentes.
 * Dépend de geo.js. Données pures (aucun dessin).
 */

function makeLand(S) {
  const { E, R, rand, roads, rivers, wallPoly, moatOuter, slopeAt, occupied: houses } = S;
  const between = ([a, b]) => a + rand() * (b - a);
  const dist = (p, q) => Math.hypot(p[0] - q[0], p[1] - q[1]);
  const norm = v => { const l = Math.hypot(v[0], v[1]) || 1; return [v[0] / l, v[1] / l]; };

  // Grille d'occupation (10 m) : maisons, ville, eau, routes
  const C = 10, GN = Math.ceil((2 * E) / C);
  const occ = new Uint8Array(GN * GN);   // 1 = déjà pris
  const cellOf = p => [Math.floor((p[0] + E) / C), Math.floor((p[1] + E) / C)];
  const mark = (p, v = 1) => { const [i, j] = cellOf(p); if (i >= 0 && j >= 0 && i < GN && j < GN) occ[j * GN + i] = Math.max(occ[j * GN + i], v); };
  const taken = p => { const [i, j] = cellOf(p); return i < 0 || j < 0 || i >= GN || j >= GN || occ[j * GN + i] > 0; };
  const wallSegs = wallPoly.map((p, i) => [p, wallPoly[(i + 1) % wallPoly.length]]);
  const inPoly = (poly, p) => {
    let c = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const a = poly[i], b = poly[j];
      if ((a[1] > p[1]) !== (b[1] > p[1]) && p[0] < ((b[0] - a[0]) * (p[1] - a[1])) / (b[1] - a[1]) + a[0]) c = !c;
    }
    return c;
  };
  const nearWall = p => inPoly(wallPoly, p) || wallSegs.some(([a, b]) => Geo.distToSegment(p, a, b) < moatOuter + 8);
  const riverSegs = rivers.flatMap(rv => rv.points.slice(1).map((q, i) => [rv.points[i], q, rv.w]));
  const inWater = (p, margin) => riverSegs.some(([a, b, w]) => Geo.distToSegment(p, a, b) < w / 2 + margin);
  // Ville et fossé, rivières : "peints" sur la grille (rapide)
  const paint = (a, b, radius) => {
    const L = dist(a, b), n = Math.max(1, Math.ceil(L / 4)), r = Math.ceil(radius / C);
    for (let s2 = 0; s2 <= n; s2++) {
      const p = [a[0] + (b[0] - a[0]) * s2 / n, a[1] + (b[1] - a[1]) * s2 / n], [ci, cj] = cellOf(p);
      for (let dj = -r; dj <= r; dj++) for (let di = -r; di <= r; di++) {
        const i2 = ci + di, j2 = cj + dj;
        if (i2 < 0 || j2 < 0 || i2 >= GN || j2 >= GN) continue;
        if (Math.hypot(-E + (i2 + 0.5) * C - p[0], -E + (j2 + 0.5) * C - p[1]) <= radius) occ[j2 * GN + i2] = 2;
      }
    }
  };
  wallSegs.forEach(([a, b]) => paint(a, b, moatOuter + 8));
  riverSegs.forEach(([a, b, w]) => paint(a, b, w / 2 + 3));
  const xs = wallPoly.map(p => p[0]), ys = wallPoly.map(p => p[1]);
  for (let j = Math.max(0, cellOf([0, Math.min(...ys)])[1]); j <= Math.min(GN - 1, cellOf([0, Math.max(...ys)])[1]); j++) {
    for (let i = Math.max(0, cellOf([Math.min(...xs), 0])[0]); i <= Math.min(GN - 1, cellOf([Math.max(...xs), 0])[0]); i++) {
      if (inPoly(wallPoly, [-E + (i + 0.5) * C, -E + (j + 0.5) * C])) occ[j * GN + i] = 2;
    }
  }
  for (const h of houses) for (const q of h) mark(q, 2);
  for (const rd of roads) for (let k = 0; k + 1 < rd.length; k++) {
    const a = rd[k], b = rd[k + 1], L = dist(a, b);
    for (let t = 0; t <= L; t += 4) { const p = [a[0] + (b[0] - a[0]) * t / L, a[1] + (b[1] - a[1]) * t / L]; mark(p, 2); }
  }

  const fieldStrips = [[], [], []], meadows = [];
  // Un quartier de culture : un quadrilatère découpé en lanières parallèles à sa profondeur
  const furlong = (P0, u, n, width, depth) => {
    const strips = [];
    const crop = Math.floor(rand() * 3);
    for (let x = 0; x < width;) {
      const w = between([9, 18]);
      const a = [P0[0] + u[0] * x, P0[1] + u[1] * x], b = [P0[0] + u[0] * Math.min(width, x + w), P0[1] + u[1] * Math.min(width, x + w)];
      x += w;
      // La lanière s'arrête dès qu'elle rencontre la ville, l'eau, une route, un autre champ ou une pente trop forte
      let d = 0;
      for (; d < depth; d += 6) {
        const m = [(a[0] + b[0]) / 2 + n[0] * (d + 3), (a[1] + b[1]) / 2 + n[1] * (d + 3)];
        if (taken(m) || slopeAt(m) > 22 || Math.abs(m[0]) > E || Math.abs(m[1]) > E) break;
      }
      if (d < 18) continue;
      const poly = [a, b, [b[0] + n[0] * d, b[1] + n[1] * d], [a[0] + n[0] * d, a[1] + n[1] * d]];
      strips.push([poly, rand() < 0.8 ? crop : Math.floor(rand() * 3)]);
    }
    for (const [poly, c] of strips) {
      fieldStrips[c].push(poly);
      const [a, b, c2, d] = poly;
      for (let s = 0; s <= 1; s += 0.1) for (let t = 0; t <= 1; t += 0.1) {
        const p = [a[0] + (b[0] - a[0]) * s + (d[0] - a[0]) * t, a[1] + (b[1] - a[1]) * s + (d[1] - a[1]) * t];
        mark(p, 1);
      }
    }
    return strips.length;
  };

  // 1. Le long des routes : quartiers de lanières perpendiculaires à la route, des deux côtés
  for (const rd of roads) {
    let acc = 0;
    for (let k = 0; k + 1 < rd.length; k++) {
      const a = rd[k], b = rd[k + 1], L = dist(a, b), u = norm([b[0] - a[0], b[1] - a[1]]);
      for (let t = 0; t < L; t += between([70, 120])) {
        const p = [a[0] + u[0] * t, a[1] + u[1] * t];
        if (Math.hypot(p[0], p[1]) < R * 1.25) continue;
        for (const side of [-1, 1]) {
          const n = [-u[1] * side, u[0] * side];
          const start = [p[0] + n[0] * 8, p[1] + n[1] * 8];
          furlong(start, u, n, Math.min(between([60, 110]), L - t), between([120, 260]));
        }
      }
      acc += L;
    }
  }
  // 2. Plus loin : d'autres quartiers, orientés comme la route la plus proche
  const roadDir = p => {
    let best = null, bd = Infinity;
    for (const rd of roads) for (let k = 0; k + 1 < rd.length; k++) {
      const d = Geo.distToSegment(p, rd[k], rd[k + 1]);
      if (d < bd) { bd = d; best = norm([rd[k + 1][0] - rd[k][0], rd[k + 1][1] - rd[k][1]]); }
    }
    return best || [1, 0];
  };
  for (let y = -E + 60; y < E - 60; y += 150) for (let x = -E + 60; x < E - 60; x += 150) {
    const p = [x + (rand() - 0.5) * 80, y + (rand() - 0.5) * 80];
    if (taken(p) || slopeAt(p) > 15 || Math.hypot(p[0], p[1]) < R * 1.2) continue;
    let u = roadDir(p);
    if (rand() < 0.5) u = [-u[1], u[0]];
    u = norm([u[0] + (rand() - 0.5) * 0.3, u[1] + (rand() - 0.5) * 0.3]);
    const n = [-u[1], u[0]], w = between([80, 160]), dpt = between([80, 160]);
    furlong([p[0] - u[0] * w / 2 - n[0] * dpt / 2, p[1] - u[1] * w / 2 - n[1] * dpt / 2], u, n, w, dpt);
  }

  // Forêts : ce qui reste loin de la ville et des routes, plus volontiers sur les pentes
  const ph = [rand() * 6.28, rand() * 6.28, rand() * 6.28, rand() * 6.28];
  const noise = (x, y) => (Math.sin(x / 90 + ph[0]) + Math.sin(y / 110 + ph[1]) + Math.sin((x + y) / 70 + ph[2]) + Math.sin((x - y) / 130 + ph[3])) / 4;
  const forest = [];
  const F = 22;
  for (let y = -E + F / 2; y < E; y += F) for (let x = -E + F / 2; x < E; x += F) {
    const p = [x + (rand() - 0.5) * 8, y + (rand() - 0.5) * 8];
    const [i, j] = cellOf(p);
    if (i < 0 || j < 0 || i >= GN || j >= GN || occ[j * GN + i]) continue;
    const far = Math.hypot(p[0], p[1]) / R, sl = slopeAt(p);
    const threshold = 0.35 - (sl > 20 ? 0.45 : 0) - Math.min(0.3, Math.max(0, far - 1.4) * 0.3);
    if (far < 1.3 || noise(p[0], p[1]) < threshold) continue;
    if (sl > 25 && far < 1.8) continue;   // près de la ville, les pentes sont en vignes
    forest.push([p[0], p[1]]);
  }
  return { fieldStrips, meadows, forest, forestCell: F };
}
