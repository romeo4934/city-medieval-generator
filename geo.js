'use strict';
/* Outils de base : hasard reproductible, géométrie des polygones convexes, Voronoi, plus courts chemins. */

// ---------- hasard reproductible ----------

function seedHash(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(a) {
  return function () {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------- géométrie (polygones convexes = tableaux de [x, y]) ----------

const Geo = {
  area(p) {
    let s = 0;
    for (let i = 0; i < p.length; i++) {
      const a = p[i], b = p[(i + 1) % p.length];
      s += a[0] * b[1] - b[0] * a[1];
    }
    return s / 2;
  },

  centroid(p) {
    let x = 0, y = 0, s = 0;
    for (let i = 0; i < p.length; i++) {
      const a = p[i], b = p[(i + 1) % p.length];
      const c = a[0] * b[1] - b[0] * a[1];
      s += c; x += (a[0] + b[0]) * c; y += (a[1] + b[1]) * c;
    }
    if (Math.abs(s) < 1e-9) {
      return [p.reduce((t, q) => t + q[0], 0) / p.length, p.reduce((t, q) => t + q[1], 0) / p.length];
    }
    return [x / (3 * s), y / (3 * s)];
  },

  // Garde la partie du polygone où (q - P)·n >= 0
  clip(poly, px, py, nx, ny) {
    const out = [];
    for (let i = 0; i < poly.length; i++) {
      const A = poly[i], B = poly[(i + 1) % poly.length];
      const da = (A[0] - px) * nx + (A[1] - py) * ny;
      const db = (B[0] - px) * nx + (B[1] - py) * ny;
      if (da >= 0) out.push(A);
      if ((da >= 0) !== (db >= 0)) {
        const t = da / (da - db);
        out.push([A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t]);
      }
    }
    return out;
  },

  // Rétrécit un polygone convexe ; dists = un nombre ou une distance par côté
  inset(poly, dists) {
    const s = Geo.area(poly) > 0 ? 1 : -1;
    let out = poly;
    for (let i = 0; i < poly.length; i++) {
      const A = poly[i], B = poly[(i + 1) % poly.length];
      const dx = B[0] - A[0], dy = B[1] - A[1];
      const L = Math.hypot(dx, dy);
      if (L < 1e-6) continue;
      const nx = (-dy / L) * s, ny = (dx / L) * s;
      const d = typeof dists === 'number' ? dists : dists[i];
      out = Geo.clip(out, A[0] + nx * d, A[1] + ny * d, nx, ny);
      if (out.length < 3) return [];
    }
    return out;
  },

  scale(p, k) {
    const c = Geo.centroid(p);
    return p.map(q => [c[0] + (q[0] - c[0]) * k, c[1] + (q[1] - c[1]) * k]);
  },

  distToSegment(p, a, b) {
    const dx = b[0] - a[0], dy = b[1] - a[1];
    const L2 = dx * dx + dy * dy;
    let t = L2 ? ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / L2 : 0;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy);
  },
};

// Lissage de Chaikin (garde les extrémités)
function smooth(pts, iterations) {
  for (let it = 0; it < iterations; it++) {
    const out = [pts[0]];
    for (let i = 0; i + 1 < pts.length; i++) {
      const a = pts[i], b = pts[i + 1];
      out.push([a[0] * 0.75 + b[0] * 0.25, a[1] * 0.75 + b[1] * 0.25], [a[0] * 0.25 + b[0] * 0.75, a[1] * 0.25 + b[1] * 0.75]);
    }
    out.push(pts[pts.length - 1]);
    pts = out;
  }
  return pts;
}

// Cellule de Voronoi de chaque point, par découpages successifs d'un carré
function voronoi(sites, E) {
  const box = [[-E, -E], [E, -E], [E, E], [-E, E]];
  return sites.map((s, i) => {
    let poly = box;
    const others = [];
    sites.forEach((t, j) => { if (j !== i) others.push([j, (t[0] - s[0]) ** 2 + (t[1] - s[1]) ** 2]); });
    others.sort((a, b) => a[1] - b[1]);
    for (const [j, d2] of others) {
      let maxR2 = 0;
      for (const q of poly) maxR2 = Math.max(maxR2, (q[0] - s[0]) ** 2 + (q[1] - s[1]) ** 2);
      if (d2 / 4 > maxR2) break; // plus aucun voisin ne peut couper la cellule
      const t = sites[j];
      poly = Geo.clip(poly, (s[0] + t[0]) / 2, (s[1] + t[1]) / 2, s[0] - t[0], s[1] - t[1]);
    }
    return poly;
  });
}

// Plus court chemin (Dijkstra simple, quelques centaines de sommets)
function shortestPaths(adj, nVerts, sources) {
  const dist = new Float64Array(nVerts).fill(Infinity);
  const prev = new Int32Array(nVerts).fill(-1);
  const done = new Uint8Array(nVerts);
  for (const s of sources) dist[s] = 0;
  for (;;) {
    let u = -1, best = Infinity;
    for (let v = 0; v < nVerts; v++) if (!done[v] && dist[v] < best) { best = dist[v]; u = v; }
    if (u < 0) break;
    done[u] = 1;
    for (const e of adj[u] || []) {
      const d = best + e.cost;
      if (d < dist[e.to]) { dist[e.to] = d; prev[e.to] = u; }
    }
  }
  return { dist, prev };
}

function tracePath(prev, from) {
  const path = [from];
  let cur = from;
  while (prev[cur] >= 0) { cur = prev[cur]; path.push(cur); }
  return path;
}

// ---------- outils pour le tracé (rues, parcelles, monuments) ----------

const between = (r, [a, b]) => a + r() * (b - a);
const circle = (c, r, n = 36) => Array.from({ length: n }, (_, i) => [c[0] + Math.cos((i / n) * 2 * Math.PI) * r, c[1] + Math.sin((i / n) * 2 * Math.PI) * r]);
const inradius = poly => {
  const c = Geo.centroid(poly);
  let r = Infinity;
  for (let i = 0; i < poly.length; i++) r = Math.min(r, Geo.distToSegment(c, poly[i], poly[(i + 1) % poly.length]));
  return [c, r];
};
const rect = (c, ax, len, wid) => {
  const v = [-ax[1], ax[0]];
  return [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([a, b]) => [c[0] + ax[0] * a * len / 2 + v[0] * b * wid / 2, c[1] + ax[1] * a * len / 2 + v[1] * b * wid / 2]);
};
const inside = (poly, p) => {     // polygone convexe
  const s = Math.sign(Geo.area(poly));
  for (let i = 0; i < poly.length; i++) {
    const A = poly[i], B = poly[(i + 1) % poly.length];
    if (((B[0] - A[0]) * (p[1] - A[1]) - (B[1] - A[1]) * (p[0] - A[0])) * s < 0) return false;
  }
  return true;
};
const inPoly = (poly, p) => {     // polygone quelconque (lancer de rayon)
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i], b = poly[j];
    if ((a[1] > p[1]) !== (b[1] > p[1]) && p[0] < ((b[0] - a[0]) * (p[1] - a[1])) / (b[1] - a[1]) + a[0]) c = !c;
  }
  return c;
};
const stripCut = (poly, dir, widths, rand) => {
  const n = [-dir[1], dir[0]];
  const ts = poly.map(p => p[0] * n[0] + p[1] * n[1]);
  const out = [];
  for (let t = Math.min(...ts); t < Math.max(...ts);) {
    const w = between(rand, widths);
    let s = Geo.clip(poly, n[0] * t, n[1] * t, n[0], n[1]);
    s = Geo.clip(s, n[0] * (t + w), n[1] * (t + w), -n[0], -n[1]);
    if (s.length >= 3 && Math.abs(Geo.area(s)) > 15) out.push(s);
    t += w;
  }
  return out;
};
const norm = v => { const l = Math.hypot(v[0], v[1]) || 1; return [v[0] / l, v[1] / l]; };
const polyLen = pts => pts.reduce((acc, p, i) => (i ? acc + Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1]) : 0), 0);
// Point d'intersection de deux segments (ou null)
const segHit = (a, b, c, d) => {
  const den = (b[0] - a[0]) * (d[1] - c[1]) - (b[1] - a[1]) * (d[0] - c[0]);
  if (Math.abs(den) < 1e-9) return null;
  const t = ((c[0] - a[0]) * (d[1] - c[1]) - (c[1] - a[1]) * (d[0] - c[0])) / den;
  const u = ((c[0] - a[0]) * (b[1] - a[1]) - (c[1] - a[1]) * (b[0] - a[0])) / den;
  return t >= 0 && t <= 1 && u >= 0 && u <= 1 ? { t, u, at: [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t] } : null;
};
// Simplification (Douglas-Peucker) puis lissage d'une ligne
const simplify = (pts, tol) => {
  if (pts.length < 3) return pts;
  let best = 0, bi = 0;
  for (let i = 1; i < pts.length - 1; i++) { const d = Geo.distToSegment(pts[i], pts[0], pts[pts.length - 1]); if (d > best) { best = d; bi = i; } }
  if (best < tol) return [pts[0], pts[pts.length - 1]];
  return simplify(pts.slice(0, bi + 1), tol).slice(0, -1).concat(simplify(pts.slice(bi), tol));
};
