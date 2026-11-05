'use strict';
/*
 * Hors les murs : ce qui vit dans les faubourgs et le long des routes.
 * Église de faubourg, maladrerie (à l'écart), tanneries (au bord de l'eau, en aval), moulins sur la rivière,
 * gibet (fourches patibulaires, sur une hauteur au bord d'une route).
 * Dépend de geo.js. Données pures.
 */

function makeOutskirts(T) {
  const { roads, rivers, rand, R, wallDist, moatOuter, slopeAt, altitude, free, reserve, rect, saint, X } = T;
  const norm = v => { const l = Math.hypot(v[0], v[1]) || 1; return [v[0] / l, v[1] / l]; };
  const items = [];
  // Un point le long d'une route, à une distance donnée du centre, et la direction de la route
  const along = (rd, r0, r1) => {
    const cands = [];
    for (let k = 0; k + 1 < rd.length; k++) {
      const p = rd[k], q = rd[k + 1], r = Math.hypot(p[0], p[1]);
      if (r >= r0 && r <= r1 && wallDist(p) > moatOuter + 25) cands.push([p, norm([q[0] - p[0], q[1] - p[1]])]);
    }
    return cands;
  };
  // Pose un enclos rectangulaire au bord de la route, si la place est libre
  const besideRoad = (cands, len, wid, half) => {
    for (const [p, u] of cands.sort(() => rand() - 0.5)) for (const side of [-1, 1]) {
      const n = [-u[1] * side, u[0] * side], c = [p[0] + n[0] * (half + wid / 2 + 3), p[1] + n[1] * (half + wid / 2 + 3)];
      const poly = rect(c, u, len, wid);
      if (poly.every(q => slopeAt(q) < 15) && free(poly)) { reserve(poly); return { poly, c, u }; }
    }
    return null;
  };

  const roadsByLen = roads.slice().sort((a, b) => b.length - a.length);
  // Église de faubourg : sur la plus longue route, juste après les dernières maisons
  if (roadsByLen[0]) {
    const spot = besideRoad(along(roadsByLen[0], R * 1.2, R * 1.5), 30, 22, 4.5);
    if (spot) items.push({ kind: 'church', poly: spot.poly, at: spot.c, axis: spot.u, label: X.withoutWalls(saint()) });
  }
  // Maladrerie : loin, sur une autre route (on tenait les lépreux à l'écart)
  if (roadsByLen.length > 1) {
    const spot = besideRoad(along(roadsByLen[1], R * 1.6, R * 2.1), 44, 32, 4.5);
    if (spot) items.push({ kind: 'leper', poly: spot.poly, at: spot.c, axis: spot.u, label: X.outskirts.leper });
  }
  // Gibet : sur le point le plus haut le long d'une route, bien visible
  {
    let best = null;
    for (const rd of roads) for (const [p, u] of along(rd, R * 1.4, R * 2.2)) if (!best || altitude(p) > altitude(best[0])) best = [p, u];
    if (best) {
      const n = [-best[1][1], best[1][0]], c = [best[0][0] + n[0] * 14, best[0][1] + n[1] * 14];
      const poly = rect(c, best[1], 10, 6);
      if (free(poly)) { reserve(poly); items.push({ kind: 'gallows', poly, at: c, axis: best[1], label: X.outskirts.gallows }); }
    }
  }
  // Au bord de la rivière, hors les murs : tanneries (en aval) et moulins
  if (rivers.length) {
    const rv = rivers[0], P = rv.points;
    const outside = P.map((p, i) => [p, i]).filter(([p]) => wallDist(p) > moatOuter + 20 && Math.hypot(p[0], p[1]) < R * 1.9);
    const down = outside.filter(([, i]) => i > P.length * 0.55), up = outside.filter(([, i]) => i < P.length * 0.45);
    const bank = ([p, i], len, wid) => {
      const q = P[Math.min(P.length - 1, i + 1)], o = P[Math.max(0, i - 1)], u = norm([q[0] - o[0], q[1] - o[1]]);
      for (const side of [-1, 1]) {
        const n = [-u[1] * side, u[0] * side], c = [p[0] + n[0] * (rv.w / 2 + wid / 2 + 2), p[1] + n[1] * (rv.w / 2 + wid / 2 + 2)];
        const poly = rect(c, u, len, wid);
        if (poly.every(q2 => slopeAt(q2) < 15) && free(poly)) { reserve(poly); return { poly, c, u }; }
      }
      return null;
    };
    for (const cand of down.sort(() => rand() - 0.5)) { const s = bank(cand, 40, 18); if (s) { items.push({ kind: 'tannery', poly: s.poly, at: s.c, axis: s.u, label: X.outskirts.tannery }); break; } }
    let mills = 0;
    for (const cand of up.sort(() => rand() - 0.5)) { if (mills >= 2) break; const s = bank(cand, 12, 9); if (s) { items.push({ kind: 'watermill', poly: s.poly, at: s.c, axis: s.u, label: X.outskirts.watermill }); mills++; } }
  }
  return items;
}
