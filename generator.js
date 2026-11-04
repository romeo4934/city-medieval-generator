'use strict';
/*
 * Génération d'une ville : données géométriques pures (aucun dessin ici).
 *
 * Principe :
 *  1. des points en spirale autour du centre → cellules de Voronoi (= îlots)
 *  2. les N premières cellules forment la ville, leur contour = les remparts
 *  3. portes sur les remparts, routes = plus court chemin le long des bords d'îlots
 *  4. chaque îlot est rétréci (les rues apparaissent entre eux) puis découpé en parcelles
 */

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

// ---------- noms ----------

const NAME_START = ['Val', 'Mont', 'Roc', 'Bel', 'Aube', 'Cor', 'Lis', 'Fer', 'Mar', 'Ys', 'Gal', 'Bran',
  'Ost', 'Vire', 'Haute', 'Clar', 'Dun', 'Sain', 'Pierre', 'Grand', 'Noir', 'Or'];
const NAME_END = ['beau', 'fort', 'mère', 'lune', 'bourg', 'morte', 'ange', 'gard', 'mont', 'vin', 'brume',
  'ombre', 'val', 'roche', 'castel', 'fleur', 'lac', 'sel', 'vent'];

function cityName(rand) {
  for (;;) {
    const a = NAME_START[Math.floor(rand() * NAME_START.length)];
    const b = NAME_END[Math.floor(rand() * NAME_END.length)];
    if (a.toLowerCase() !== b) return a + b;
  }
}

// ---------- catalogue ----------

const SIZES = {
  petite:   { cells: 12, gates: 3, districts: 3 },
  moyenne:  { cells: 25, gates: 4, districts: 5 },
  grande:   { cells: 45, gates: 5, districts: 7 },
  capitale: { cells: 70, gates: 6, districts: 9 },
};

// where : où le placer ; look : comment le dessiner ; hill : préfère la colline
const BUILDINGS = [
  { id: 'temple',     label: 'Cathédrale',        where: 'center',  look: 'big',      color: 'temple' },
  { id: 'chateau',    label: 'Château',           where: 'wall',    look: 'castle',   hill: true },
  { id: 'palais',     label: 'Palais',            where: 'center',  look: 'cloister', color: 'noble', hill: true },
  { id: 'guildes',    label: 'Halle des guildes', where: 'center',  look: 'big',      color: 'guild' },
  { id: 'universite', label: 'Université',        where: 'middle',  look: 'cloister', color: 'school' },
  { id: 'caserne',    label: 'Caserne',           where: 'gate',    look: 'cloister', color: 'military' },
  { id: 'prison',     label: 'Prison',            where: 'wall',    look: 'big',      color: 'military' },
  { id: 'hospice',    label: 'Hospice',           where: 'middle',  look: 'cloister', color: 'temple' },
  { id: 'bains',      label: 'Bains publics',     where: 'middle',  look: 'big',      color: 'baths' },
  { id: 'arene',      label: 'Arène',             where: 'middle',  look: 'arena' },
  { id: 'cimetiere',  label: 'Cimetière',         where: 'edge',    look: 'green' },
  { id: 'port',       label: 'Port',              where: 'river',   look: 'port' },
  { id: 'monastere',  label: 'Monastère',         where: 'outside', look: 'cloister', color: 'temple' },
  { id: 'moulin',     label: 'Moulin',            where: 'mill',    look: 'mill' },
];
const DEFAULT_BUILDINGS = ['temple', 'chateau'];

const DISTRICT_NAMES = ['Quartier des Marchands', 'Quartier des Artisans', 'Quartier des Forgerons',
  'Quartier des Tisserands', 'Bas-Quartier', 'Quartier des Orfèvres', 'Les Halles', 'Quartier des Potiers',
  'Quartier des Bouchers', 'Bourg-Neuf', 'Quartier des Cordiers', 'Quartier des Charpentiers',
  'Quartier des Verriers', 'Quartier des Selliers', 'Les Ruelles'];
const RIVER_DISTRICTS = ['Quartier des Tanneurs', 'Quartier des Bateliers', 'Quartier des Teinturiers',
  'Quartier des Lavandières', 'Les Berges'];
const HILL_DISTRICTS = ['La Butte', 'Haute-Ville', 'Le Mont'];
const GATE_EXTRA = ['des Corbeaux', 'du Roi', 'aux Loups', 'des Vignes', 'de la Reine', 'du Pèlerin', 'des Morts'];
const COMPASS = ['Est', 'Sud-Est', 'Sud', 'Sud-Ouest', 'Ouest', 'Nord-Ouest', 'Nord', 'Nord-Est'];

// ---------- la ville ----------

function generateCity(opts) {
  const size = SIZES[opts.size] || SIZES.moyenne;
  const wanted = opts.buildings || DEFAULT_BUILDINGS;
  const customNames = opts.names || [];
  // Un flux de hasard par élément : ajouter une rivière ne déplace pas les maisons, etc.
  const rng = tag => mulberry32(seedHash(opts.seed + '|' + tag));
  const autoName = cityName(rng('nom'));
  const name = (opts.cityName || '').trim() || autoName;

  const N = size.cells;
  const R = 55 * Math.sqrt(N);        // rayon approximatif des remparts (1 unité = 1 m)
  const E = R * 1.65;                 // demi-largeur de la carte
  const cellR = R / Math.sqrt(N);     // rayon typique d'un îlot

  // 1. Points en spirale (angle d'or) : densité régulière, ville ronde
  const rS = rng('sites|' + opts.size);
  const sites = [];
  const total = Math.round(N * 4.5);
  for (let i = 0; i < total; i++) {
    let r = i === 0 ? 0 : 0.95 * R * Math.sqrt((i + 0.5) / N);
    r *= 1 + (rS() - 0.5) * 0.18;
    const th = i * 2.399963 + (rS() - 0.5) * 0.6;
    const x = r * Math.cos(th), y = r * Math.sin(th);
    if (Math.abs(x) < E - 5 && Math.abs(y) < E - 5) sites.push([x, y]);
  }

  // 2. Voronoi + soudure des sommets communs entre cellules voisines
  const polys = voronoi(sites, E);
  const verts = [], grid = new Map();
  const weld = p => {
    const gx = Math.floor(p[0]), gy = Math.floor(p[1]);
    for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) {
      const list = grid.get((gx + dx) + ',' + (gy + dy));
      if (list) for (const id of list) {
        const v = verts[id];
        if (Math.abs(v[0] - p[0]) < 0.5 && Math.abs(v[1] - p[1]) < 0.5) return id;
      }
    }
    const id = verts.length;
    verts.push([p[0], p[1]]);
    const k = gx + ',' + gy;
    if (!grid.has(k)) grid.set(k, []);
    grid.get(k).push(id);
    return id;
  };

  const cells = polys.map((poly, i) => {
    const ids = [];
    for (const p of poly) {
      const id = weld(p);
      if (ids[ids.length - 1] !== id) ids.push(id);
    }
    if (ids.length > 1 && ids[0] === ids[ids.length - 1]) ids.pop();
    return { index: i, site: sites[i], ids, inner: i < N, type: null, building: null };
  });

  const ek = (a, b) => (a < b ? a + '_' + b : b + '_' + a);
  const cellEdges = c => c.ids.map((a, k) => [a, c.ids[(k + 1) % c.ids.length]]);
  const edgeCells = new Map();
  const indexEdges = () => {
    edgeCells.clear();
    cells.forEach(c => cellEdges(c).forEach(([a, b]) => {
      const key = ek(a, b);
      if (!edgeCells.has(key)) edgeCells.set(key, []);
      edgeCells.get(key).push(c.index);
    }));
  };
  indexEdges();

  // Contour d'un ensemble de cellules : côtés dont la cellule voisine n'est pas dans l'ensemble
  const boundaryEdges = set => {
    const out = [];
    for (const ci of set) cellEdges(cells[ci]).forEach(([a, b]) => {
      if (!edgeCells.get(ek(a, b)).some(o => o !== ci && set.has(o))) out.push([a, b]);
    });
    return out;
  };

  // 3. Remparts
  const next = new Map();
  boundaryEdges(new Set(cells.filter(c => c.inner).map(c => c.index))).forEach(([a, b]) => next.set(a, b));
  let wall = [];
  const seen = new Set();
  for (const start of next.keys()) {
    if (seen.has(start)) continue;
    const loop = [start];
    seen.add(start);
    let cur = next.get(start), guard = 0;
    while (cur !== undefined && cur !== start && guard++ < 10000) {
      loop.push(cur); seen.add(cur); cur = next.get(cur);
    }
    if (loop.length > wall.length) wall = loop;
  }
  const wallEdges = new Set(wall.map((a, k) => ek(a, wall[(k + 1) % wall.length])));

  // 4. Rivières : bandes droites qui traversent la carte (la 2e croise la 1re)
  const rR = rng('rivieres');
  const autoCount = rR();
  const count = opts.river === 'non' ? 0 : opts.river === 'oui' ? 1 : opts.river === 'deux' ? 2
    : autoCount < 0.45 ? 0 : autoCount < 0.85 ? 1 : 2;
  const rivers = [];
  const a0 = rR() * Math.PI;
  for (let k = 0; k < 2; k++) {
    const a = k === 0 ? a0 : a0 + Math.PI / 4 + rR() * Math.PI / 2;
    const dir = [Math.cos(a), Math.sin(a)], nr = [-dir[1], dir[0]];
    const off = (rR() < 0.5 ? -1 : 1) * R * (0.3 + rR() * 0.3);
    const w = (14 + N * 0.15) * (k === 0 ? 1 : 0.7);
    if (k < count) rivers.push({ P0: [nr[0] * off, nr[1] * off], dir, nr, w });
  }
  const rf = (rv, q) => (q[0] - rv.P0[0]) * rv.nr[0] + (q[1] - rv.P0[1]) * rv.nr[1];
  const riverDist = q => rivers.reduce((m, rv) => Math.min(m, Math.abs(rf(rv, q)) - rv.w / 2), Infinity);

  // 5. Colline
  const rH = rng('colline');
  const hAng = rH() * Math.PI * 2, hDist = (0.15 + rH() * 0.4) * R, hSize = (0.35 + rH() * 0.15) * R;
  const hPhase = [rH() * 6.283, rH() * 6.283];
  const hill = opts.hill === 'oui' || (opts.hill !== 'non' && rH() < 0.4)
    ? { c: [Math.cos(hAng) * hDist, Math.sin(hAng) * hDist], r: hSize, phase: hPhase } : null;
  const hillDist = q => (hill ? Math.hypot(q[0] - hill.c[0], q[1] - hill.c[1]) : Infinity);

  // 6. Portes, dans les angles rentrants (deux cellules intérieures, une extérieure)
  const cellsAt = new Map();
  cells.forEach(c => c.ids.forEach(id => {
    if (!cellsAt.has(id)) cellsAt.set(id, []);
    cellsAt.get(id).push(c);
  }));
  const outsideOf = vid => (cellsAt.get(vid) || []).filter(c => !c.inner);
  const candidates = wall.filter(vid => outsideOf(vid).length === 1);
  const rG = rng('portes|' + opts.size);
  const gates = [];
  const base = rG() * Math.PI * 2;
  for (let g = 0; g < size.gates; g++) {
    const target = base + (g * Math.PI * 2) / size.gates + (rG() - 0.5) * 0.5;
    let best = -1, bd = Infinity;
    for (const vid of candidates.length >= size.gates ? candidates : wall) {
      if (gates.includes(vid)) continue;
      const v = verts[vid];
      if (riverDist(v) < 20) continue;
      const da = Math.abs((((Math.atan2(v[1], v[0]) - target) % (2 * Math.PI)) + 3 * Math.PI) % (2 * Math.PI) - Math.PI);
      if (da < bd) { bd = da; best = vid; }
    }
    if (best >= 0) gates.push(best);
  }

  // La cellule extérieure de chaque porte est coupée en deux : la route sort par là
  for (const g of gates) {
    const outside = outsideOf(g);
    if (outside.length !== 1) continue;
    const X = outside[0], ids = X.ids, n = ids.length;
    const i = ids.indexOf(g);
    if (n < 4 || i < 0) continue;
    let j = -1, bd = -1;
    for (let k = 2; k <= n - 2; k++) {
      const v = verts[ids[(i + k) % n]], d = Math.hypot(v[0] - verts[g][0], v[1] - verts[g][1]);
      if (d > bd) { bd = d; j = (i + k) % n; }
    }
    const span = (from, to) => { const out = [ids[from]]; for (let k = from; k !== to;) { k = (k + 1) % n; out.push(ids[k]); } return out; };
    const a = span(i, j), b = span(j, i);
    X.ids = a;
    X.site = Geo.centroid(a.map(id => verts[id]));
    const twin = { index: cells.length, site: Geo.centroid(b.map(id => verts[id])), ids: b, inner: false, type: null, building: null };
    cells.push(twin);
    (cellsAt.get(g) || []).push(twin);
  }
  indexEdges();

  // 7. Place du marché : la cellule la plus centrale qui n'est pas dans l'eau
  const innerCells = cells.filter(c => c.inner);
  const plaza = [...innerCells].sort((a, b) => Math.hypot(...a.site) - Math.hypot(...b.site))
    .find(c => riverDist(c.site) > 15) || innerCells[0];
  plaza.type = 'plaza';

  // 8. Routes : porte → place, et porte → bord de la carte
  const edgeCost = (a, b) => {
    const A = verts[a], B = verts[b];
    let c = Math.hypot(B[0] - A[0], B[1] - A[1]);
    for (const rv of rivers) {
      const fa = rf(rv, A), fb = rf(rv, B), hw = rv.w / 2;
      if (Math.abs((fa + fb) / 2) < hw + 4 || Math.abs(fa) < hw || Math.abs(fb) < hw) c *= 8; // pas dans l'eau
      else if (fa * fb < 0) c += 60;                                                        // un pont coûte cher
    }
    return c;
  };
  const innerAdj = [], outerAdj = [];
  const link = (adj, a, b, cost) => {
    (adj[a] = adj[a] || []).push({ to: b, cost });
    (adj[b] = adj[b] || []).push({ to: a, cost });
  };
  for (const [key, cs] of edgeCells) {
    const [a, b] = key.split('_').map(Number);
    if (cs.some(ci => cells[ci].inner)) link(innerAdj, a, b, edgeCost(a, b) * (wallEdges.has(key) ? 4 : 1));
    else link(outerAdj, a, b, edgeCost(a, b));
    if (wallEdges.has(key)) link(outerAdj, a, b, edgeCost(a, b) * 6); // dernier recours : longer le rempart
  }

  const fromPlaza = shortestPaths(innerAdj, verts.length, plaza.ids);
  const borderVerts = verts.map((v, i) => i).filter(i => Math.max(Math.abs(verts[i][0]), Math.abs(verts[i][1])) > E - 0.5);
  const roads = [];
  for (const g of gates) {
    roads.push(tracePath(fromPlaza.prev, g));
    const out = shortestPaths(outerAdj, verts.length, [g]);
    const gv = verts[g], gl = Math.hypot(gv[0], gv[1]) || 1;
    const T = [(gv[0] / gl) * E * 1.4, (gv[1] / gl) * E * 1.4];
    let best = -1, bd = Infinity;
    for (const v of borderVerts) {
      if (!isFinite(out.dist[v])) continue;
      const d = Math.hypot(verts[v][0] - T[0], verts[v][1] - T[1]);
      if (d < bd) { bd = d; best = v; }
    }
    if (best >= 0) roads.push(tracePath(out.prev, best).reverse());
  }
  const roadEdges = new Set();
  roads.forEach(p => { for (let k = 0; k + 1 < p.length; k++) roadEdges.add(ek(p[k], p[k + 1])); });

  const bridges = [];
  for (const rv of rivers) {
    const done = new Set();
    roads.forEach(p => {
      for (let k = 0; k + 1 < p.length; k++) {
        const key = ek(p[k], p[k + 1]);
        const A = verts[p[k]], B = verts[p[k + 1]];
        const fa = rf(rv, A), fb = rf(rv, B);
        if (fa * fb >= 0 || done.has(key)) continue;
        done.add(key);
        const t = fa / (fa - fb);
        const L = Math.hypot(B[0] - A[0], B[1] - A[1]);
        const d = [(B[0] - A[0]) / L, (B[1] - A[1]) / L];
        const cross = Math.max(0.3, Math.abs(d[0] * rv.nr[0] + d[1] * rv.nr[1]));
        bridges.push({
          x: A[0] + (B[0] - A[0]) * t, y: A[1] + (B[1] - A[1]) * t,
          angle: (Math.atan2(d[1], d[0]) * 180) / Math.PI,
          length: (rv.w + 8) / cross,
        });
      }
    });
  }

  // 9. Bâtiments importants
  const touches = (c, set) => cellEdges(c).some(([a, b]) => set.has(ek(a, b)));
  const dC = c => Math.hypot(c.site[0], c.site[1]);
  const gateVerts = gates.map(g => verts[g]);
  const missing = [];
  for (const b of BUILDINGS) {
    if (!wanted.includes(b.id)) continue;
    const jitter = rng('batiment|' + b.id);
    let pool = cells.filter(c => c.inner && !c.type);
    let score;
    switch (b.where) {
      case 'center': score = dC; break;
      case 'middle': score = c => Math.abs(dC(c) - 0.55 * R); break;
      case 'edge':   score = c => -dC(c); break;
      case 'wall':
        pool = pool.filter(c => touches(c, wallEdges));
        score = () => 0;
        break;
      case 'gate':
        score = c => Math.min(...gateVerts.map(v => Math.hypot(v[0] - c.site[0], v[1] - c.site[1])));
        break;
      case 'river':
        if (!rivers.length) { missing.push(b.label + ' (pas de rivière)'); continue; }
        pool = pool.filter(c => riverDist(c.site) < cellR);
        score = c => riverDist(c.site);
        break;
      case 'outside':
        pool = cells.filter(c => !c.inner && !c.type && touches(c, roadEdges) && dC(c) < R * 1.45);
        score = c => Math.abs(dC(c) - 1.2 * R);
        break;
      case 'mill':
        pool = cells.filter(c => !c.inner && !c.type && dC(c) < R * 1.5);
        score = rivers.length ? c => Math.max(0, riverDist(c.site)) : c => Math.abs(dC(c) - 1.25 * R);
        break;
    }
    if (b.hill && hill) {
      const onHill = pool.filter(c => hillDist(c.site) < hill.r);
      if (onHill.length) { pool = onHill; score = c => hillDist(c.site); }
    }
    let best = null, bs = Infinity;
    for (const c of pool) {
      const s = score(c) + jitter() * R * 0.15;
      if (s < bs) { bs = s; best = c; }
    }
    if (best) { best.type = b.id; best.building = b; } else missing.push(b.label + ' (plus de place)');
  }

  // 10. Quartiers : regroupement des îlots autour de "germes" bien répartis
  const rD = rng('quartiers|' + opts.size);
  const K = Math.min(size.districts, innerCells.length);
  const germs = [plaza];
  while (germs.length < K) {
    let best = null, bs = -1;
    for (const c of innerCells) {
      if (germs.includes(c)) continue;
      const d = Math.min(...germs.map(g => Math.hypot(g.site[0] - c.site[0], g.site[1] - c.site[1]))) * (0.8 + rD() * 0.4);
      if (d > bs) { bs = d; best = c; }
    }
    germs.push(best);
  }
  const crossesRiver = (p, q) => rivers.some(rv => rf(rv, p) * rf(rv, q) < 0);
  const owner = new Map(), cost = new Map();
  germs.forEach((g, k) => { owner.set(g.index, k); cost.set(g.index, 0); });
  const open = new Set(germs.map(g => g.index));
  while (open.size) {
    let u = null, bu = Infinity;
    for (const ci of open) if (cost.get(ci) < bu) { bu = cost.get(ci); u = ci; }
    open.delete(u);
    const cu = cells[u];
    cellEdges(cu).forEach(([a, b]) => edgeCells.get(ek(a, b)).forEach(vi => {
      const cv = cells[vi];
      if (vi === u || !cv.inner) return;
      const d = bu + Math.hypot(cv.site[0] - cu.site[0], cv.site[1] - cu.site[1]) + (crossesRiver(cu.site, cv.site) ? 400 : 0);
      if (d < (cost.has(vi) ? cost.get(vi) : Infinity)) { cost.set(vi, d); owner.set(vi, owner.get(u)); open.add(vi); }
    }));
  }
  const districts = germs.map(() => ({ cells: [] }));
  innerCells.forEach(c => { c.district = owner.get(c.index) || 0; districts[c.district].cells.push(c); });

  const rN = rng('noms|' + opts.size);
  const used = new Set();
  const take = list => {
    const free = list.filter(x => !used.has(x));
    if (!free.length) return null;
    const v = free[Math.floor(rN() * free.length)];
    used.add(v);
    return v;
  };
  const fixed = v => (used.has(v) ? null : (used.add(v), v));
  const compassOf = p => COMPASS[((Math.round(Math.atan2(p[1], p[0]) / (Math.PI / 4)) % 8) + 8) % 8];
  const ofDir = d => (d === 'Est' || d === 'Ouest' ? "de l'" : 'du ') + d;

  districts.forEach((d, k) => {
    const has = id => d.cells.some(c => c.type === id);
    const mid = [d.cells.reduce((s, c) => s + c.site[0], 0) / d.cells.length, d.cells.reduce((s, c) => s + c.site[1], 0) / d.cells.length];
    d.onHill = !!hill && (hillDist(mid) < hill.r * 0.8 || d.cells.some(c => hillDist(c.site) < hill.r * 0.4));
    const nearRiver = d.cells.some(c => riverDist(c.site) < cellR * 0.8);
    const gateCell = d.cells.find(c => c.ids.some(id => gates.includes(id)));
    let auto = null;
    if (has('plaza')) auto = fixed('Vieille Ville');
    if (!auto && has('chateau')) auto = fixed(d.onHill ? 'Haute-Ville' : 'Quartier du Château');
    if (!auto && d.onHill) auto = take(HILL_DISTRICTS);
    if (!auto && has('temple')) auto = fixed('Quartier de la Cathédrale');
    if (!auto && has('universite')) auto = fixed('Quartier des Écoles');
    if (!auto && has('port')) auto = fixed('Les Quais');
    if (!auto && nearRiver) auto = take(RIVER_DISTRICTS);
    if (!auto && gateCell && rN() < 0.5) auto = fixed('Quartier de la Porte ' + ofDir(compassOf(gateCell.site)));
    if (!auto) auto = take(DISTRICT_NAMES) || 'Quartier ' + (k + 1);
    d.auto = auto;
    d.name = (customNames[k] || '').trim() || auto;
    const free = d.cells.filter(c => !c.type);
    d.labelCell = (free.length ? free : d.cells).reduce((m, c) =>
      (Math.hypot(c.site[0] - mid[0], c.site[1] - mid[1]) < Math.hypot(m.site[0] - mid[0], m.site[1] - mid[1]) ? c : m));
  });

  // 11. Murs intérieurs autour de certains quartiers
  const rI = rng('murs|' + opts.size);
  const fortified = new Set();
  if (opts.inner === 'un' || opts.inner === 'plusieurs') {
    const primary = districts.findIndex(d => d.cells.some(c => c.type === 'chateau'));
    const hillD = districts.findIndex(d => d.onHill);
    fortified.add(primary >= 0 ? primary : hillD >= 0 ? hillD : plaza.district);
    if (opts.inner === 'plusieurs') {
      const others = districts.map((d, k) => k).filter(k => !fortified.has(k)).sort(() => rI() - 0.5);
      others.slice(0, Math.max(1, Math.round(K / 3))).forEach(k => fortified.add(k));
    }
  }
  const innerWallEdges = new Set();
  const innerWalls = [];
  for (const k of fortified) {
    const set = new Set(districts[k].cells.map(c => c.index));
    for (const [a, b] of boundaryEdges(set)) {
      const key = ek(a, b);
      if (wallEdges.has(key) || innerWallEdges.has(key)) continue;
      innerWallEdges.add(key);
      innerWalls.push([verts[a], verts[b]]);
    }
    districts[k].fortified = true;
  }

  // Limites entre quartiers (pointillés dans les rues)
  const districtLines = [];
  for (const [key, cs] of edgeCells) {
    if (cs.length !== 2 || innerWallEdges.has(key)) continue;
    const [p, q] = cs.map(ci => cells[ci]);
    if (p.inner && q.inner && p.district !== q.district) {
      const [a, b] = key.split('_').map(Number);
      districtLines.push([verts[a], verts[b]]);
    }
  }

  // Noms des portes
  const gateNames = [];
  const usedDirs = new Set();
  const rP = rng('portes-noms');
  for (const g of gates) {
    const v = verts[g], dir = compassOf(v);
    const label = usedDirs.has(dir) ? 'Porte ' + GATE_EXTRA[Math.floor(rP() * GATE_EXTRA.length)] : 'Porte ' + ofDir(dir);
    usedDirs.add(dir);
    const l = Math.hypot(v[0], v[1]) || 1;
    gateNames.push({ at: [v[0] + (v[0] / l) * 34, v[1] + (v[1] / l) * 34], text: label });
  }

  // 12. Îlots → parcelles → maisons
  const cutRivers = poly => {
    let parts = [poly];
    for (const rv of rivers) {
      const hw = rv.w / 2 + 2, P = rv.P0, n = rv.nr;
      parts = parts.flatMap(p => [
        Geo.clip(p, P[0] + n[0] * hw, P[1] + n[1] * hw, n[0], n[1]),
        Geo.clip(p, P[0] - n[0] * hw, P[1] - n[1] * hw, -n[0], -n[1]),
      ]);
    }
    return parts.filter(p => p.length >= 3 && Math.abs(Geo.area(p)) > 20);
  };

  const subdivide = (poly, minArea, rand, out, depth = 0) => {
    const a = Math.abs(Geo.area(poly));
    if (a < minArea * (0.6 + rand() * 0.8) || depth > 14) { out.push(poly); return; }
    let best = 0, bl = -1;
    for (let i = 0; i < poly.length; i++) {
      const A = poly[i], B = poly[(i + 1) % poly.length];
      const l = Math.hypot(B[0] - A[0], B[1] - A[1]);
      if (l > bl) { bl = l; best = i; }
    }
    const A = poly[best], B = poly[(best + 1) % poly.length];
    const t = 0.35 + rand() * 0.3;
    const P = [A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t];
    const d = [(B[0] - A[0]) / bl, (B[1] - A[1]) / bl];
    for (const half of [Geo.clip(poly, P[0], P[1], d[0], d[1]), Geo.clip(poly, P[0], P[1], -d[0], -d[1])]) {
      if (half.length >= 3 && Math.abs(Geo.area(half)) > minArea * 0.2) subdivide(half, minArea, rand, out, depth + 1);
    }
  };

  const city = {
    name, autoName, seed: opts.seed, size: opts.size, R, E, rivers, bridges, hill: null,
    wall: wall.map(id => verts[id]),
    gates: gates.map(id => {
      const k = wall.indexOf(id);
      return { at: verts[id], prev: verts[wall[(k - 1 + wall.length) % wall.length]], next: verts[wall[(k + 1) % wall.length]] };
    }),
    gateNames, innerWalls, districtLines,
    roads: roads.map(p => p.map(id => verts[id])),
    blocks: [], buildings: [], gardens: [], fields: [[], []],
    plaza: [], specials: [], labels: [],
    districts: districts.map((d, k) => ({
      name: d.name, auto: d.auto, fortified: !!d.fortified,
      at: Geo.centroid(d.labelCell.ids.map(id => verts[id])),
    })),
  };

  if (hill) {
    city.hill = {
      c: hill.c, r: hill.r,
      contours: [1.25, 0.95, 0.65, 0.35].map(k => {
        const pts = [];
        for (let i = 0; i < 48; i++) {
          const th = (i / 48) * Math.PI * 2;
          const rr = hill.r * k * (1 + 0.12 * Math.sin(3 * th + hill.phase[0]) + 0.07 * Math.sin(5 * th + hill.phase[1]));
          pts.push([hill.c[0] + Math.cos(th) * rr, hill.c[1] + Math.sin(th) * rr]);
        }
        return pts;
      }),
    };
  }

  const addLots = (parts, minArea, rand, skip, near) => {
    for (const part of parts) {
      const lots = [];
      subdivide(part, minArea, rand, lots);
      for (const lot of lots) {
        if (near && !near(Geo.centroid(lot))) continue;
        if (rand() < skip) continue;
        const b = Geo.inset(lot, minArea > 160 ? 1.2 : 0.8);
        if (b.length >= 3 && Math.abs(Geo.area(b)) > 25) city.buildings.push(b);
      }
    }
  };

  const circle = (c, r, n = 36) => Array.from({ length: n }, (_, i) => [c[0] + Math.cos((i / n) * 2 * Math.PI) * r, c[1] + Math.sin((i / n) * 2 * Math.PI) * r]);
  const inside = (poly, p) => {
    const s = Math.sign(Geo.area(poly));
    for (let i = 0; i < poly.length; i++) {
      const A = poly[i], B = poly[(i + 1) % poly.length];
      if (((B[0] - A[0]) * (p[1] - A[1]) - (B[1] - A[1]) * (p[0] - A[0])) * s < 0) return false;
    }
    return true;
  };

  const special = (b, parts, main, rand, outside) => {
    const S = { id: b.id, yard: parts, yardColor: outside ? 'garden' : 'plaza', shapes: [] };
    const label = { at: Geo.centroid(main), text: b.label };
    switch (b.look) {
      case 'big':
        S.shapes.push({ polys: [Geo.scale(main, 0.55)], fill: b.color, stroke: 1.2 });
        break;
      case 'cloister':
        S.shapes.push({ polys: [Geo.scale(main, 0.72), Geo.scale(main, 0.4)], fill: b.color, stroke: 1.2, evenodd: true });
        break;
      case 'castle': {
        S.yardColor = 'castleYard';
        const inner = Geo.inset(main, 6);
        if (inner.length) S.shapes.push({ polys: [inner], fill: 'none', stroke: 3.5, strokeColor: 'wall' });
        S.shapes.push({ polys: [Geo.scale(inner.length ? inner : main, 0.45)], fill: 'castle', stroke: 1.5, strokeColor: 'wall' });
        break;
      }
      case 'green': {
        S.yardColor = 'green';
        const zone = Geo.inset(main, 8), tombs = [];
        if (zone.length) {
          const xs = zone.map(p => p[0]), ys = zone.map(p => p[1]);
          for (let x = Math.min(...xs); x < Math.max(...xs); x += 9) for (let y = Math.min(...ys); y < Math.max(...ys); y += 11) {
            if (inside(zone, [x, y]) && rand() < 0.75) tombs.push([[x - 1.5, y - 2.5], [x + 1.5, y - 2.5], [x + 1.5, y + 2.5], [x - 1.5, y + 2.5]]);
          }
        }
        S.shapes.push({ polys: tombs, fill: 'tomb' });
        break;
      }
      case 'arena': {
        const c = Geo.centroid(main);
        let r = Infinity;
        for (let i = 0; i < main.length; i++) r = Math.min(r, Geo.distToSegment(c, main[i], main[(i + 1) % main.length]));
        r *= 0.85;
        S.shapes.push({ polys: [circle(c, r)], fill: 'stone', stroke: 1.2 });
        S.shapes.push({ polys: [circle(c, r * 0.6)], fill: 'sand', stroke: 0.8 });
        break;
      }
      case 'port':
        S.yardColor = 'quay';
        addLots(parts, 180, rand, 0.15);
        break;
      case 'mill': {
        S.yardColor = 'field1';
        const c = Geo.centroid(main);
        S.shapes.push({ polys: [circle(c, 6, 16)], fill: 'building', stroke: 1 });
        S.shapes.push({ lines: [0, 1, 2, 3].map(i => { const a = Math.PI / 4 + (i * Math.PI) / 2; return [c, [c[0] + Math.cos(a) * 15, c[1] + Math.sin(a) * 15]]; }), stroke: 2 });
        label.at = [c[0], c[1] + 24];
        break;
      }
    }
    city.specials.push(S);
    city.labels.push(label);
  };

  for (const c of cells) {
    const poly = c.ids.map(id => verts[id]);
    if (poly.length < 3) continue;
    const edges = cellEdges(c).map(([a, b]) => ek(a, b));
    const rand = rng('ilot|' + opts.size + '|' + c.index);

    if (c.inner) {
      const dists = edges.map(k => (wallEdges.has(k) ? 7 : innerWallEdges.has(k) ? 5 : roadEdges.has(k) ? 6 : 2.5));
      const yard = Geo.inset(poly, dists);
      if (yard.length < 3) continue;
      const parts = cutRivers(yard);
      if (!parts.length) continue;
      const main = parts.reduce((m, p) => (Math.abs(Geo.area(p)) > Math.abs(Geo.area(m)) ? p : m));
      if (c.type === 'plaza') {
        city.plaza.push(...parts);
        city.labels.push({ at: Geo.centroid(main), text: 'Marché' });
      } else if (c.building) {
        special(c.building, parts, main, rand, false);
      } else {
        city.blocks.push(...parts);
        addLots(parts, 140, rand, 0.06);
      }
    } else if (c.building) {
      const yard = Geo.inset(poly, edges.map(k => (roadEdges.has(k) ? 6 : 3)));
      const parts = yard.length >= 3 ? cutRivers(yard) : [];
      if (parts.length) special(c.building, parts, parts.reduce((m, p) => (Math.abs(Geo.area(p)) > Math.abs(Geo.area(m)) ? p : m)), rand, true);
    } else if (touches(c, roadEdges) && dC(c) < R * 1.45) {
      // Faubourg : jardins + maisons le long des routes
      const roadSegs = cellEdges(c).filter(([a, b]) => roadEdges.has(ek(a, b))).map(([a, b]) => [verts[a], verts[b]]);
      const yard = Geo.inset(poly, edges.map(k => (roadEdges.has(k) ? 6 : 3)));
      const parts = yard.length >= 3 ? cutRivers(yard) : [];
      city.gardens.push(...parts);
      addLots(parts, 200, rand, 0.3, ctr => roadSegs.some(([a, b]) => Geo.distToSegment(ctr, a, b) < 28));
    } else {
      const field = Geo.inset(poly, 3);
      if (field.length >= 3) for (const part of cutRivers(field)) city.fields[rand() < 0.5 ? 0 : 1].push(part);
    }
  }

  const innerBuildings = city.buildings.filter(b => Math.hypot(...Geo.centroid(b)) < R).length;
  city.stats = {
    buildings: city.buildings.length,
    population: Math.round((innerBuildings * 3 + (city.buildings.length - innerBuildings) * 2.5) / 50) * 50,
    gates: gates.length,
    rivers: rivers.length,
    hill: !!hill,
    diameter: Math.round(R * 2 / 10) * 10,
    missing,
  };
  return city;
}
