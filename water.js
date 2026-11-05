'use strict';
/*
 * L'eau aménagée par la ville : biefs de moulin, îles, ponts habités.
 * Appelé pendant le tracé des rues : biefs et îles deviennent des obstacles pour les rues et les maisons.
 * Dépend de geo.js. Données pures.
 */

function makeWaterworks(T) {
  const { rivers, rand, domainAt, slopeAt, addBarrier, cellR, nCanals = 1, nIslands = 1, X } = T;
  const norm = v => { const l = Math.hypot(v[0], v[1]) || 1; return [v[0] / l, v[1] / l]; };
  const resample = (pts, step) => {
    const out = [pts[0]];
    for (let i = 0; i + 1 < pts.length; i++) {
      const L = Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]), n = Math.max(1, Math.round(L / step));
      for (let k = 1; k <= n; k++) out.push([pts[i][0] + (pts[i + 1][0] - pts[i][0]) * k / n, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * k / n]);
    }
    return out;
  };
  const canals = [], mills = [], islands = [];
  const usedMill = new Set(), usedIsl = new Set();
  const pick = (list, used) => { const free = list.filter(x => !used.has(x)); const v = free[Math.floor(rand() * free.length)] || list[0]; used.add(v); return v; };

  rivers.forEach((rv, ri) => {
    const P = resample(rv.points, 5);
    const tangent = i => norm([P[Math.min(P.length - 1, i + 2)][0] - P[Math.max(0, i - 2)][0], P[Math.min(P.length - 1, i + 2)][1] - P[Math.max(0, i - 2)][1]]);
    // Bief de moulin : un canal dérivé qui longe la rivière puis la rejoint, avec un ou deux moulins dessus
    if (ri === 0) for (let tries = 0, made = 0; tries < 30 * Math.max(1, nCanals) && made < nCanals; tries++) {
      const n = 26 + Math.floor(rand() * 10), i0 = Math.floor(rand() * (P.length - n - 1));
      if (i0 < 2) continue;
      const side = rand() < 0.5 ? -1 : 1, off = rv.w / 2 + 16;
      const pts = [];
      for (let k = 0; k <= n; k++) {
        const t = tangent(i0 + k), nrm = [-t[1] * side, t[0] * side], o = off * Math.sin((Math.PI * k) / n) ** 0.6;
        pts.push([P[i0 + k][0] + nrm[0] * o, P[i0 + k][1] + nrm[1] * o]);
      }
      const dom = domainAt(pts[Math.floor(n / 2)]);
      if (!pts.every(p => domainAt(p) === dom && slopeAt(p) < 12)) continue;
      if (canals.some(c2 => c2.points.some(q => pts.some(p => Math.hypot(p[0] - q[0], p[1] - q[1]) < 30)))) continue;
      canals.push({ points: pts, w: 5 });
      addBarrier(pts, 4.5);
      for (const f of [0.38, 0.66]) {
        const k = Math.floor(n * f), t = tangent(i0 + k), c = pts[k];
        mills.push({ at: c, axis: t, name: pick(X.mills, usedMill) });
      }
      made++;
    }
    // Île : la rivière s'élargit et se partage autour d'une île (en ville, sur la rivière principale)
    if (ri === 0) for (let tries = 0, made = 0; tries < 40 * Math.max(1, nIslands) && made < nIslands; tries++) {
      const i = 4 + Math.floor(rand() * (P.length - 8));
      if (domainAt(P[i]) !== 'town' || rand() < 0.4) continue;
      const t = tangent(i), len = 45 + rand() * 30, wid = rv.w * 0.9 + 6;
      const ellipse = (a, b) => Array.from({ length: 20 }, (_, k) => {
        const th = (k / 20) * Math.PI * 2, x = Math.cos(th) * a, y = Math.sin(th) * b;
        return [P[i][0] + t[0] * x - t[1] * y, P[i][1] + t[1] * x + t[0] * y];
      });
      const water = ellipse(len / 2 + 14, wid / 2 + rv.w * 0.9), land = ellipse(len / 2, wid / 2);
      if (!water.every(p => domainAt(p) === 'town')) continue;
      if (islands.some(o => Math.hypot(o.at[0] - P[i][0], o.at[1] - P[i][1]) < o.len + len)) continue;
      islands.push({ water, land, at: P[i], axis: t, len, wid, name: pick(X.islands, usedIsl) });
      addBarrier([...water, water[0]], 1);
      made++;
    }
  });
  return { canals, mills, islands };
}
