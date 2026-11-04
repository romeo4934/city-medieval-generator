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

const BUILDINGS = [
  { id: 'temple',     label: 'Cathédrale' },
  { id: 'chateau',    label: 'Château' },
  { id: 'palais',     label: 'Palais' },
  { id: 'guildes',    label: 'Halle des guildes' },
  { id: 'universite', label: 'Université' },
  { id: 'caserne',    label: 'Caserne' },
  { id: 'prison',     label: 'Prison' },
  { id: 'hospice',    label: 'Hospice' },
  { id: 'bains',      label: 'Bains publics' },
  { id: 'arene',      label: 'Arène' },
  { id: 'cimetiere',  label: 'Cimetière' },
  { id: 'port',       label: 'Port' },
  { id: 'monastere',  label: 'Monastère' },
  { id: 'moulin',     label: 'Moulin' },
];
const DEFAULT_BUILDINGS = ['temple', 'chateau'];

const DISTRICT_NAMES = ['Quartier des Marchands', 'Quartier des Artisans', 'Quartier des Forgerons',
  'Quartier des Tisserands', 'Quartier des Orfèvres', 'Les Halles', 'Quartier des Potiers',
  'Quartier des Bouchers', 'Quartier des Cordiers', 'Quartier des Charpentiers',
  'Quartier des Verriers', 'Quartier des Selliers', 'Les Ruelles'];
const COMPASS = ['Est', 'Sud-Est', 'Sud', 'Sud-Ouest', 'Ouest', 'Nord-Ouest', 'Nord', 'Nord-Est'];
const GATE_EXTRA = ['des Corbeaux', 'du Roi', 'aux Loups', 'des Vignes', 'de la Reine', 'du Pèlerin', 'des Morts'];

// Maisons selon la zone : largeur de façade, profondeur, matériaux (pierre / colombage / chaume),
// dépendances dans les cours, sol des cours
const ZONES = {
  vieille:  { front: [5, 8],  depth: [13, 20], mat: [0.55, 0.45, 0],    annex: 0.6,  court: 'court',  people: 9 },
  bourg:    { front: [6, 10], depth: [10, 15], mat: [0.25, 0.68, 0.07], annex: 0.4,  court: 'yard',   people: 7 },
  neuf:     { front: [7, 12], depth: [8, 12],  mat: [0.12, 0.68, 0.2],  annex: 0.2,  court: 'garden', people: 6 },
  faubourg: { front: [9, 15], depth: [7, 10],  mat: [0, 0.4, 0.6],      annex: 0.3,  court: 'garden', people: 5 },
  citadelle:{ front: [10, 18], depth: [8, 12], mat: [1, 0, 0],          annex: 0.1,  court: 'court',  people: 4 },
};

// ---------- la ville ----------

function generateCity(opts) {
  const size = SIZES[opts.size] || SIZES.moyenne;
  const wanted = opts.buildings || DEFAULT_BUILDINGS;
  const customNames = opts.names || [];
  // Un tirage par élément : ajouter une rivière ou un bâtiment ne déplace pas le reste
  const rng = tag => mulberry32(seedHash(opts.seed + '|' + tag));
  const autoName = cityName(rng('nom'));
  const name = (opts.cityName || '').trim() || autoName;

  const N = size.cells;                 // nombre d'îlots constructibles intra-muros
  const R = 55 * Math.sqrt(N);          // rayon approximatif de la ville (1 unité = 1 m)
  const E = R * 1.65;                   // demi-largeur de la carte
  const cellR = R / Math.sqrt(N);       // rayon typique d'un îlot

  // ================= 1. Îlots (Voronoi sur une spirale) =================
  const rS = rng('sites|' + opts.size);
  const sites = [];
  for (let i = 0, total = Math.round(N * 5); i < total; i++) {
    let r = i === 0 ? 0 : 0.95 * R * Math.sqrt((i + 0.5) / N);
    r *= 1 + (rS() - 0.5) * 0.18;
    const th = i * 2.399963 + (rS() - 0.5) * 0.6;
    const x = r * Math.cos(th), y = r * Math.sin(th);
    if (Math.abs(x) < E - 5 && Math.abs(y) < E - 5) sites.push([x, y]);
  }
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
    return { index: i, site: sites[i], ids, inner: false, type: null, building: null, ring: -1 };
  });

  const ek = (a, b) => (a < b ? a + '_' + b : b + '_' + a);
  const unkey = key => key.split('_').map(Number);
  const cellEdges = c => c.ids.map((a, k) => [a, c.ids[(k + 1) % c.ids.length]]);
  const edgeCells = new Map();
  const cellsAt = new Map();
  const reindex = () => {
    edgeCells.clear();
    cellsAt.clear();
    cells.forEach(c => {
      cellEdges(c).forEach(([a, b]) => {
        const key = ek(a, b);
        if (!edgeCells.has(key)) edgeCells.set(key, []);
        edgeCells.get(key).push(c.index);
      });
      c.ids.forEach(id => {
        if (!cellsAt.has(id)) cellsAt.set(id, []);
        cellsAt.get(id).push(c);
      });
    });
  };
  reindex();
  const neighbours = c => {
    const out = new Set();
    cellEdges(c).forEach(([a, b]) => edgeCells.get(ek(a, b)).forEach(ci => { if (ci !== c.index) out.add(ci); }));
    return [...out].map(ci => cells[ci]);
  };
  const touches = (c, set) => cellEdges(c).some(([a, b]) => set.has(ek(a, b)));
  const isBorder = id => Math.max(Math.abs(verts[id][0]), Math.abs(verts[id][1])) > E - 0.5;
  const touchesBorder = c => c.ids.some(isBorder);
  const dist = (p, q) => Math.hypot(p[0] - q[0], p[1] - q[1]);
  const link = (adj, a, b, cost) => {
    (adj[a] = adj[a] || []).push({ to: b, cost });
    (adj[b] = adj[b] || []).push({ to: a, cost });
  };

  // ================= 2. Relief =================
  // Une seule fonction d'altitude décide de tout : pentes, rivières, citadelle, routes.
  const rT = rng('relief');
  const reliefRoll = rT();
  const relief = ['plaine', 'colline', 'vallee'].includes(opts.relief) ? opts.relief
    : reliefRoll < 0.3 ? 'plaine' : reliefRoll < 0.75 ? 'colline' : 'vallee';
  const ph = Array.from({ length: 8 }, () => rT() * Math.PI * 2);
  const hAng = rT() * Math.PI * 2, hDist = (0.45 + rT() * 0.35) * R;
  const hill = { c: [Math.cos(hAng) * hDist, Math.sin(hAng) * hDist], r0: (0.16 + rT() * 0.08) * R, band: (0.2 + rT() * 0.08) * R };
  const vAng = rT() * Math.PI, vOff = (rT() - 0.5) * 0.3 * R;
  const valley = { dir: [Math.cos(vAng), Math.sin(vAng)], off: vOff, a: (1.0 + rT() * 0.15) * R, band: 0.4 * R };
  const smoothstep = t => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));
  const elev = (x, y) => {
    let h = 0.03 * (Math.sin(x / 97 + ph[0]) + Math.sin(y / 131 + ph[1]) + Math.sin((x + y) / 173 + ph[2])) / 3;
    if (relief === 'colline') {
      const dx = x - hill.c[0], dy = y - hill.c[1], d = Math.hypot(dx, dy), th = Math.atan2(dy, dx);
      const wob = 1 + 0.14 * Math.sin(3 * th + ph[3]) + 0.07 * Math.sin(5 * th + ph[4]);
      h += 1 - smoothstep((d - hill.r0 * wob) / (hill.band * wob));
    } else if (relief === 'vallee') {
      const { dir, off, a, band } = valley;
      const across = -dir[1] * x + dir[0] * y - off, along = dir[0] * x + dir[1] * y;
      const aw = a + 0.12 * R * Math.sin(along / (0.45 * R) + ph[5]);
      h += smoothstep((Math.abs(across) - aw) / band);
    }
    return h;
  };
  const slope = (x, y) => Math.hypot(elev(x + 3, y) - elev(x - 3, y), elev(x, y + 3) - elev(x, y - 3)) / 6;
  // Pente "raide" : plus de 40 % de la pente maximale du relief
  const steepLimit = relief === 'colline' ? 0.6 / hill.band : relief === 'vallee' ? 0.6 / valley.band : Infinity;
  cells.forEach(c => {
    const ctr = Geo.centroid(c.ids.map(id => verts[id]));
    c.elev = elev(...c.site);
    c.steep = Math.max(slope(...c.site), slope(...ctr)) > steepLimit;
    c.top = relief === 'colline' && !c.steep && c.elev > 0.8;
  });

  // ================= 3. Rivières : elles suivent les creux =================
  const entries = new Set();
  for (const key of edgeCells.keys()) {
    const [a, b] = unkey(key);
    if (isBorder(a) !== isBorder(b)) entries.add(isBorder(a) ? a : b);
  }
  const nearestEntry = T => [...entries].reduce((m, v) => (m < 0 || dist(verts[v], T) < dist(verts[m], T) ? v : m), -1);

  const rR = rng('rivieres');
  const autoCount = rR();
  const count = opts.river === 'non' ? 0 : opts.river === 'oui' ? 1 : opts.river === 'deux' ? 2
    : autoCount < 0.4 ? 0 : autoCount < 0.85 ? 1 : 2;
  let a0 = rR() * Math.PI * 2, off0 = (rR() - 0.5) * R * 0.7;
  if (relief === 'vallee') { a0 = vAng + (rR() < 0.5 ? 0 : Math.PI); off0 = vOff; }
  const a1 = a0 + Math.PI / 2 + (rR() - 0.5) * Math.PI / 2, off1 = (rR() - 0.5) * R * 0.6;
  const rM = rng('meandres');
  const wiggle = new Map();
  for (const key of edgeCells.keys()) wiggle.set(key, 0.35 + rM() * 1.3);
  const riverGraph = exclude => {
    const adj = [];
    for (const key of edgeCells.keys()) {
      const [a, b] = unkey(key);
      if ((isBorder(a) && isBorder(b)) || exclude.has(key)) continue;
      const A = verts[a], B = verts[b];
      const h = Math.max(0, elev((A[0] + B[0]) / 2, (A[1] + B[1]) / 2));
      link(adj, a, b, dist(A, B) * wiggle.get(key) * (1 + 30 * h)); // l'eau évite de monter
    }
    return adj;
  };
  const rivers = [];
  if (count >= 1) {
    const dir = [Math.cos(a0), Math.sin(a0)], P0 = [-dir[1] * off0, dir[0] * off0];
    const from = nearestEntry([P0[0] - dir[0] * 2 * E, P0[1] - dir[1] * 2 * E]);
    const to = nearestEntry([P0[0] + dir[0] * 2 * E, P0[1] + dir[1] * 2 * E]);
    const sp = shortestPaths(riverGraph(new Set()), verts.length, [to]);
    if (from !== to && isFinite(sp.dist[from])) rivers.push({ path: tracePath(sp.prev, from), w: 14 + N * 0.15 });
  }
  if (count >= 2 && rivers.length) {
    const main = rivers[0].path;
    const mainKeys = new Set(main.slice(1).map((v, k) => ek(main[k], v)));
    const dir = [Math.cos(a1), Math.sin(a1)], P1 = [-dir[1] * off1, dir[0] * off1];
    const from = nearestEntry([P1[0] - dir[0] * 2 * E, P1[1] - dir[1] * 2 * E]);
    const sp = shortestPaths(riverGraph(mainKeys), verts.length, [from]);
    let to = -1;
    for (const v of main) if (!isBorder(v) && isFinite(sp.dist[v]) && (to < 0 || sp.dist[v] < sp.dist[to])) to = v;
    if (to >= 0 && !main.includes(from)) rivers.push({ path: tracePath(sp.prev, to).reverse(), w: (14 + N * 0.15) * 0.65 });
  }
  const riverEdgeW = new Map();
  const downstream = new Map();  // sommet → position le long de la rivière principale (0 amont, 1 aval)
  rivers.forEach((rv, r) => rv.path.forEach((v, k) => {
    if (r === 0) downstream.set(v, k / (rv.path.length - 1));
    if (k + 1 < rv.path.length) {
      const key = ek(v, rv.path[k + 1]);
      riverEdgeW.set(key, Math.max(riverEdgeW.get(key) || 0, rv.w));
    }
  }));
  const riverDist = q => {
    let m = Infinity;
    for (const rv of rivers) for (let k = 0; k + 1 < rv.path.length; k++) {
      m = Math.min(m, Geo.distToSegment(q, verts[rv.path[k]], verts[rv.path[k + 1]]) - rv.w / 2);
    }
    return m;
  };
  const touchesRiver = c => touches(c, riverEdgeW);
  const downOf = c => Math.max(-1, ...c.ids.map(id => (downstream.has(id) ? downstream.get(id) : -1)));

  // ================= 4. Le noyau : la place du marché =================
  // Terrain plat, près du centre, près d'un gué si une rivière passe.
  const flat = c => !c.steep && !c.top && !touchesBorder(c);
  const plaza = cells.filter(c => flat(c) && !touchesRiver(c))
    .reduce((m, c) => {
      const s = c2 => Math.hypot(...c2.site) + (rivers.length ? 0.6 * Math.max(0, riverDist(c2.site) - cellR) : 0);
      return !m || s(c) < s(m) ? c : m;
    }, null) || cells[0];
  plaza.type = 'plaza';

  // ================= 5. Croissance de la ville =================
  // La ville s'étend depuis le marché ; les pentes et la rivière freinent l'extension.
  const growth = new Map([[plaza.index, 0]]);
  {
    const open = new Set([plaza.index]);
    const done = new Set();
    while (open.size) {
      let u = -1, bu = Infinity;
      for (const ci of open) if (growth.get(ci) < bu) { bu = growth.get(ci); u = ci; }
      open.delete(u); done.add(u);
      const cu = cells[u];
      cellEdges(cu).forEach(([a, b]) => edgeCells.get(ek(a, b)).forEach(vi => {
        if (vi === u || done.has(vi)) return;
        const cv = cells[vi];
        if (touchesBorder(cv)) return;
        const step = dist(cu.site, cv.site) * (cv.steep ? 7 : cv.top ? 3 : 1) + (riverEdgeW.has(ek(a, b)) ? 2 * cellR : 0);
        if (bu + step < (growth.has(vi) ? growth.get(vi) : Infinity)) { growth.set(vi, bu + step); open.add(vi); }
      }));
    }
  }
  const byGrowth = cells.filter(c => growth.has(c.index)).sort((a, b) => growth.get(a.index) - growth.get(b.index));

  // Comble les trous : ce qui n'est pas relié au bord de la carte est à l'intérieur
  const fillHoles = set => {
    const outside = new Set(cells.filter(c => !set.has(c.index) && touchesBorder(c)).map(c => c.index));
    const stack = [...outside];
    while (stack.length) {
      for (const nb of neighbours(cells[stack.pop()])) {
        if (!set.has(nb.index) && !outside.has(nb.index)) { outside.add(nb.index); stack.push(nb.index); }
      }
    }
    cells.forEach(c => { if (!outside.has(c.index)) set.add(c.index); });
    return set;
  };
  const takeFlat = n => {
    const set = new Set();
    let flatCount = 0;
    for (const c of byGrowth) {
      if (flatCount >= n) break;
      set.add(c.index);
      if (!c.steep && !c.top) flatCount++;
    }
    return fillHoles(set);
  };

  // ================= 6. Âge : enceintes successives =================
  const rA = rng('age|' + opts.size);
  const ageRoll = rA();
  const age = { jeune: 1, ancienne: 2, tresancienne: 3 }[opts.age]
    || (ageRoll < 0.3 ? 1 : ageRoll < (opts.size === 'capitale' || opts.size === 'grande' ? 0.55 : 0.75) ? 2 : 3);
  const fractions = age === 1 ? [1] : age === 2 ? [0.45, 1] : [0.25, 0.55, 1];
  const ringSets = fractions.map(f => takeFlat(Math.max(2, Math.round(N * f))));
  const innerSet = ringSets[ringSets.length - 1];
  cells.forEach(c => {
    c.inner = innerSet.has(c.index);
    c.ring = c.inner ? ringSets.findIndex(s => s.has(c.index)) : -1;
  });

  // Contour d'un ensemble de cellules
  const boundary = set => {
    const out = [];
    for (const ci of set) cellEdges(cells[ci]).forEach(([a, b]) => {
      if (!edgeCells.get(ek(a, b)).some(o => o !== ci && set.has(o))) out.push([a, b]);
    });
    return out;
  };
  const loopOf = edges => {
    const next = new Map(edges);
    let best = [];
    const seen = new Set();
    for (const start of next.keys()) {
      if (seen.has(start)) continue;
      const loop = [start];
      seen.add(start);
      let cur = next.get(start), guard = 0;
      while (cur !== undefined && cur !== start && guard++ < 10000) { loop.push(cur); seen.add(cur); cur = next.get(cur); }
      if (loop.length > best.length) best = loop;
    }
    return best;
  };
  const wall = loopOf(boundary(innerSet));
  const wallEdges = new Set(wall.map((a, k) => ek(a, wall[(k + 1) % wall.length])));

  // Anciennes enceintes : restent à l'intérieur, en partie démolies (brèches)
  const oldWallEdges = new Set();
  const oldWalls = [];
  // On suit le tracé dans l'ordre : le mur est conservé ou démoli par longs tronçons, jamais
  // segment par segment. Là où une rivière longe le tracé, c'est elle qui défendait : rien à dessiner.
  for (let k = ringSets.length - 2; k >= 0; k--) {
    const loop = loopOf(boundary(ringSets[k]));
    const keep = k === 0 && age === 3 ? 0.45 : 0.65;   // part encore debout (la plus vieille enceinte a plus souffert)
    let standing = rA() < keep, run = 0, runLen = 2 + Math.floor(rA() * 5);
    for (let i = 0; i < loop.length; i++) {
      const a = loop[i], b = loop[(i + 1) % loop.length], key = ek(a, b);
      if (run++ >= runLen) { standing = rA() < keep; run = 1; runLen = 2 + Math.floor(rA() * 6); }
      if (wallEdges.has(key) || oldWallEdges.has(key) || riverEdgeW.has(key)) continue;
      oldWallEdges.add(key);
      oldWalls.push({ a, b, standing, ring: k });
    }
  }

  // ================= 7. Citadelle sur le sommet =================
  let citadelSet = new Set(cells.filter(c => c.top && !touchesBorder(c)).map(c => c.index));
  if (relief === 'colline' && !citadelSet.size) {
    const highest = cells.filter(c => !touchesBorder(c) && c.type !== 'plaza').reduce((m, c) => (!m || c.elev > m.elev ? c : m), null);
    if (highest && highest.elev > 0.6) citadelSet = new Set([highest.index]);
  }
  // Ne garder que le plateau le plus proche du marché (un seul bloc)
  if (citadelSet.size > 1) {
    const start = [...citadelSet].reduce((m, ci) => (m < 0 || dist(cells[ci].site, plaza.site) < dist(cells[m].site, plaza.site) ? ci : m), -1);
    const keep = new Set([start]), stack = [start];
    while (stack.length) for (const nb of neighbours(cells[stack.pop()])) {
      if (citadelSet.has(nb.index) && !keep.has(nb.index)) { keep.add(nb.index); stack.push(nb.index); }
    }
    citadelSet = keep;
  }
  cells.forEach(c => { c.citadel = citadelSet.has(c.index); });
  const citadelEdges = new Set(boundary(citadelSet).map(([a, b]) => ek(a, b)));

  // ================= 8. Portes =================
  const outsideOf = vid => (cellsAt.get(vid) || []).filter(c => !c.inner);
  const candidates = wall.filter(vid => outsideOf(vid).length === 1 && !outsideOf(vid)[0].steep && riverDist(verts[vid]) > 20);
  const rG = rng('portes|' + opts.size);
  const gates = [];
  const base = rG() * Math.PI * 2;
  for (let g = 0; g < size.gates; g++) {
    const target = base + (g * Math.PI * 2) / size.gates + (rG() - 0.5) * 0.5;
    let best = -1, bd = Infinity;
    for (const vid of candidates) {
      if (gates.some(o => dist(verts[o], verts[vid]) < cellR)) continue;
      const v = verts[vid];
      const da = Math.abs((((Math.atan2(v[1], v[0]) - target) % (2 * Math.PI)) + 3 * Math.PI) % (2 * Math.PI) - Math.PI);
      if (da < bd) { bd = da; best = vid; }
    }
    if (best >= 0 && bd < Math.PI / size.gates) gates.push(best);
  }

  // Coupe une cellule en deux, du sommet v vers le sommet le plus éloigné
  const farOf = (X, v) => {
    const ids = X.ids, n = ids.length, i = ids.indexOf(v);
    if (n < 4 || i < 0) return -1;
    let j = -1, bd = -1;
    for (let k = 2; k <= n - 2; k++) {
      const q = ids[(i + k) % n], d = dist(verts[q], verts[v]);
      if (d > bd) { bd = d; j = q; }
    }
    return j;
  };
  const splitAt = (X, v, far) => {
    const ids = X.ids, n = ids.length, i = ids.indexOf(v), j = ids.indexOf(far);
    if (i < 0 || j < 0) return false;
    const span = (from, to) => { const out = [ids[from]]; for (let k = from; k !== to;) { k = (k + 1) % n; out.push(ids[k]); } return out; };
    const a = span(i, j), b = span(j, i);
    if (a.length < 3 || b.length < 3) return false;
    X.ids = a;
    X.site = Geo.centroid(a.map(id => verts[id]));
    cells.push({ ...X, index: cells.length, ids: b, site: Geo.centroid(b.map(id => verts[id])), type: null, building: null });
    return true;
  };
  for (const g of gates) {
    const out = outsideOf(g);
    if (out.length === 1) { const far = farOf(out[0], g); if (far >= 0) splitAt(out[0], g, far); }
  }
  reindex();

  // ================= 9. Routes =================
  // Elles évitent les pentes et ne longent jamais l'eau ; pour traverser une rivière elles passent
  // par un pont "virtuel" (à travers l'îlot d'en face, coupé ensuite).
  const steepEdge = key => edgeCells.get(key).some(ci => cells[ci].steep);
  const edgeCost = (a, b) => dist(verts[a], verts[b]) * (steepEdge(ek(a, b)) ? 3 : 1);
  const innerAdj = [], outerAdj = [], allAdj = [];
  for (const [key, cs] of edgeCells) {
    if (riverEdgeW.has(key)) continue;
    const [a, b] = unkey(key);
    const c = edgeCost(a, b);
    if (cs.some(ci => cells[ci].inner)) link(innerAdj, a, b, c * (wallEdges.has(key) ? 4 : 1));
    else link(outerAdj, a, b, c);
    if (wallEdges.has(key)) link(outerAdj, a, b, c * 6);
    link(allAdj, a, b, c * (wallEdges.has(key) ? 6 : 1));
  }
  const virtual = new Map();
  for (const rv of rivers) {
    const p = rv.path;
    for (let k = 1; k + 1 < p.length; k++) {
      const v = p[k];
      if (isBorder(v) || gates.includes(v)) continue;
      const X = (cellsAt.get(v) || []).find(c => {
        const i = c.ids.indexOf(v), n = c.ids.length;
        const nb = [c.ids[(i + 1) % n], c.ids[(i - 1 + n) % n]];
        return nb.includes(p[k - 1]) && nb.includes(p[k + 1]);
      });
      if (!X || X.type === 'plaza' || X.steep) continue;
      const far = farOf(X, v);
      if (far < 0 || riverEdgeW.has(ek(v, far))) continue;
      const others = (cellsAt.get(v) || []).filter(c => c !== X);
      const cost = dist(verts[v], verts[far]) + 80;
      link(X.inner && others.some(c => c.inner) ? innerAdj : outerAdj, v, far, cost);
      link(allAdj, v, far, cost);
      virtual.set(ek(v, far), { X, v, far, w: rv.w });
    }
  }

  const fromPlaza = shortestPaths(innerAdj, verts.length, plaza.ids);
  const roads = [];
  const exits = [...entries];
  for (const g of gates) {
    roads.push(tracePath(fromPlaza.prev, g));
    const out = shortestPaths(outerAdj, verts.length, [g]);
    const gv = verts[g], gl = Math.hypot(gv[0], gv[1]) || 1;
    const T = [(gv[0] / gl) * E * 1.4, (gv[1] / gl) * E * 1.4];
    let best = -1, bd = Infinity;
    for (const v of exits) {
      if (!isFinite(out.dist[v])) continue;
      const d = dist(verts[v], T) + out.dist[v] * 0.3;
      if (d < bd) { bd = d; best = v; }
    }
    if (best >= 0) roads.push(tracePath(out.prev, best).reverse());
  }
  // Route du marché à la citadelle (elle grimpe la pente)
  let citadelGate = -1;
  if (citadelSet.size) {
    const sp = shortestPaths(allAdj, verts.length, plaza.ids);
    const rim = new Set(boundary(citadelSet).map(([a]) => a));
    for (const v of rim) if (isFinite(sp.dist[v]) && (citadelGate < 0 || sp.dist[v] < sp.dist[citadelGate])) citadelGate = v;
    if (citadelGate >= 0) roads.push(tracePath(sp.prev, citadelGate));
  }

  const bridges = [];
  const built = new Set();
  roads.forEach(p => {
    for (let k = 0; k + 1 < p.length; k++) {
      const key = ek(p[k], p[k + 1]);
      const vb = virtual.get(key);
      if (!vb || built.has(key)) continue;
      built.add(key);
      splitAt(vb.X, vb.v, vb.far);
      const at = verts[vb.v], to = verts[vb.far];
      const other = p[p[k] === vb.v ? Math.max(0, k - 1) : Math.min(p.length - 1, k + 2)];
      const ang = Math.atan2(to[1] - verts[other][1], to[0] - verts[other][0]);
      bridges.push({ x: at[0], y: at[1], angle: (ang * 180) / Math.PI, length: vb.w + 12 });
    }
  });
  reindex();
  const roadEdges = new Set();
  roads.forEach(p => { for (let k = 0; k + 1 < p.length; k++) roadEdges.add(ek(p[k], p[k + 1])); });

  // Portes des anciennes enceintes : là où une route franchit un vieux mur
  const standingOld = oldWalls.filter(w => w.standing);   // une porte n'existe que dans un mur encore debout
  const oldWallVerts = new Set(standingOld.flatMap(w => [w.a, w.b]));
  const oldGates = [];
  roads.forEach(p => {
    for (let k = 1; k + 1 < p.length; k++) {
      const v = p[k];
      if (!oldWallVerts.has(v) || oldWallEdges.has(ek(p[k - 1], v)) || oldWallEdges.has(ek(v, p[k + 1]))) continue;
      if (oldGates.some(g => g.v === v)) continue;
      const ws = standingOld.filter(w => w.a === v || w.b === v).map(w => (w.a === v ? w.b : w.a));
      if (ws.length === 2) oldGates.push({ v, at: verts[v], prev: verts[ws[0]], next: verts[ws[1]] });
    }
  });

  // ================= 10. Bâtiments importants : chacun a une raison d'être où il est =================
  const lastRing = ringSets.length - 1;
  const free = c => !c.type && !c.building;
  const freeInner = c => c.inner && free(c) && !c.steep && !c.citadel;
  const freeOuter = c => !c.inner && free(c) && !c.steep && !c.citadel && !touchesBorder(c);
  const gateDist = c => (gates.length ? Math.min(...gates.map(g => dist(verts[g], c.site))) : 0);
  const dPlaza = c => dist(c.site, plaza.site);
  const dC = c => Math.hypot(...c.site);
  const citadelFree = c => c.citadel && free(c);
  const rules = {
    temple:     { pool: c => freeInner(c) && c.ring === 0, score: dPlaza, why: 'pas de place dans la vieille ville' },
    chateau:    citadelSet.size
      ? { pool: citadelFree, score: c => -c.elev, why: '' }
      : { pool: c => freeInner(c) && touches(c, wallEdges), score: c => (rivers.length ? Math.max(0, riverDist(c.site)) : -gateDist(c)), why: 'pas de place sur les remparts' },
    palais:     { pool: c => (citadelSet.size > 1 ? citadelFree(c) : freeInner(c) && c.ring <= 1), score: dPlaza, why: 'pas de place' },
    guildes:    { pool: c => freeInner(c) && c.ring === 0, score: dPlaza, why: 'pas de place dans la vieille ville' },
    universite: { pool: c => freeInner(c) && c.ring === Math.min(1, lastRing), score: dPlaza, why: 'pas de place' },
    caserne:    { pool: c => freeInner(c) && touches(c, wallEdges), score: gateDist, why: 'pas de place près des portes' },
    prison:     { pool: c => (citadelSet.size > 1 ? citadelFree(c) : freeInner(c) && touches(c, wallEdges)), score: c => -dPlaza(c), why: 'pas de place' },
    hospice:    { pool: c => freeInner(c) && c.ring === lastRing, score: gateDist, why: 'pas de place près des portes' },
    bains:      { pool: c => freeInner(c) && (!rivers.length || touchesRiver(c)), score: dPlaza, why: rivers.length ? 'pas de place au bord de l\'eau' : 'pas de place' },
    arene:      { pool: c => (freeInner(c) && c.ring === lastRing) || (freeOuter(c) && touches(c, roadEdges)), score: c => Math.abs(dC(c) - R), why: 'pas de place' },
    cimetiere:  { pool: c => freeOuter(c) && touches(c, roadEdges) && dC(c) < 1.5 * R, score: dC, why: 'pas de place hors les murs' },
    port:       rivers.length
      ? { pool: c => freeInner(c) && touchesRiver(c), score: c => -downOf(c), why: 'pas de rive libre' }
      : { pool: () => false, score: () => 0, why: 'pas de rivière' },
    monastere:  { pool: c => freeOuter(c) && dC(c) > 1.1 * R && dC(c) < 1.6 * R, score: c => -neighbours(c).filter(n => n.steep).length * 100 - (rivers.length && touchesRiver(c) ? 80 : 0), why: 'pas de place hors les murs' },
    moulin:     rivers.length
      ? { pool: c => freeOuter(c) && touchesRiver(c), score: c => -downOf(c) * 0 + dC(c), why: 'pas de rive libre' }
      : { pool: c => freeOuter(c) && dC(c) < 1.6 * R, score: c => -c.elev * 1000 + dC(c) * 0.1, why: 'pas de place' },
  };
  const missing = [];
  for (const b of BUILDINGS) {
    if (!wanted.includes(b.id)) continue;
    const rule = rules[b.id];
    const jitter = rng('batiment|' + b.id);
    let best = null, bs = Infinity;
    for (const c of cells) {
      if (!rule.pool(c)) continue;
      const s = rule.score(c) + jitter() * cellR * 0.4;
      if (s < bs) { bs = s; best = c; }
    }
    if (best) best.building = b; else missing.push(b.label + (rule.why ? ' (' + rule.why + ')' : ''));
  }

  // ================= 11. Quartiers (chacun dans une seule enceinte) =================
  const rD = rng('quartiers|' + opts.size);
  const town = cells.filter(c => c.inner && !c.citadel);
  const K = Math.min(size.districts, town.length);
  const germs = [plaza];
  ringSets.forEach((s, k) => {
    const ringCells = town.filter(c => c.ring === k);
    const want = Math.max(k === 0 ? 1 : ringCells.length ? 1 : 0, Math.round((K * ringCells.length) / town.length));
    while (germs.filter(g => g.ring === k).length < want) {
      let best = null, bs = -1;
      for (const c of ringCells) {
        if (germs.includes(c)) continue;
        const d = Math.min(...germs.map(g => dist(g.site, c.site))) * (0.8 + rD() * 0.4);
        if (d > bs) { bs = d; best = c; }
      }
      if (!best) break;
      germs.push(best);
    }
  });
  const owner = new Map(), cost = new Map();
  germs.forEach((g, k) => { owner.set(g.index, k); cost.set(g.index, 0); });
  {
    const open = new Set(germs.map(g => g.index));
    while (open.size) {
      let u = -1, bu = Infinity;
      for (const ci of open) if (cost.get(ci) < bu) { bu = cost.get(ci); u = ci; }
      open.delete(u);
      const cu = cells[u];
      cellEdges(cu).forEach(([a, b]) => edgeCells.get(ek(a, b)).forEach(vi => {
        const cv = cells[vi];
        if (vi === u || !cv.inner || cv.citadel || cv.ring !== cu.ring) return;
        const d = bu + dist(cu.site, cv.site) + (riverEdgeW.has(ek(a, b)) ? 400 : 0);
        if (d < (cost.has(vi) ? cost.get(vi) : Infinity)) { cost.set(vi, d); owner.set(vi, owner.get(u)); open.add(vi); }
      }));
    }
  }
  const districts = germs.map(g => ({ cells: [], ring: g.ring }));
  town.forEach(c => { c.district = owner.has(c.index) ? owner.get(c.index) : 0; districts[c.district].cells.push(c); });

  const rN = rng('noms|' + opts.size);
  const used = new Set();
  const take = list => {
    const left = list.filter(x => !used.has(x));
    if (!left.length) return null;
    const v = left[Math.floor(rN() * left.length)];
    used.add(v);
    return v;
  };
  const fixed = v => (used.has(v) ? null : (used.add(v), v));
  const compassOf = p => COMPASS[((Math.round(Math.atan2(p[1], p[0]) / (Math.PI / 4)) % 8) + 8) % 8];
  const ofDir = d => (d === 'Est' || d === 'Ouest' ? "de l'" : 'du ') + d;
  const riverDistricts = districts.map((d, k) => ({ k, down: Math.max(-1, ...d.cells.map(downOf)) })).filter(x => x.down >= 0).sort((a, b) => b.down - a.down);
  districts.forEach((d, k) => {
    const has = id => d.cells.some(c => (c.building && c.building.id === id) || c.type === id);
    const gateCell = d.cells.find(c => c.ids.some(id => gates.includes(id)));
    const nearHill = citadelSet.size && d.cells.some(c => neighbours(c).some(n => n.steep));
    let auto = null;
    if (has('plaza')) auto = fixed('Vieille Ville');
    if (!auto && d.ring === 0 && has('temple')) auto = fixed('Quartier de la Cathédrale');
    if (!auto && d.ring === 0) auto = take(['Quartier du Marché', 'Le Vieux Bourg', 'Quartier de la Halle']);
    if (!auto && riverDistricts.length && riverDistricts[0].k === k) auto = fixed('Quartier des Tanneurs'); // en aval : ça sent
    if (!auto && riverDistricts.length > 1 && riverDistricts[riverDistricts.length - 1].k === k) auto = fixed('Quartier des Meuniers');
    if (!auto && has('port')) auto = fixed('Les Quais');
    if (!auto && has('universite')) auto = fixed('Quartier des Écoles');
    if (!auto && nearHill) auto = take(['Sous-le-Château', 'Le Pied-du-Mont']);
    if (!auto && d.ring === lastRing && lastRing > 0 && rN() < 0.5) auto = take(['Bourg-Neuf', 'La Ville-Neuve']);
    if (!auto && gateCell && rN() < 0.5) auto = fixed('Quartier de la Porte ' + ofDir(compassOf(gateCell.site)));
    if (!auto) auto = take(DISTRICT_NAMES) || 'Quartier ' + (k + 1);
    d.auto = auto;
    d.name = (customNames[k] || '').trim() || auto;
    const mid = [d.cells.reduce((s, c) => s + c.site[0], 0) / d.cells.length, d.cells.reduce((s, c) => s + c.site[1], 0) / d.cells.length];
    const plain = d.cells.filter(c => !c.type && !c.building && !c.steep);
    d.labelCell = (plain.length ? plain : d.cells).reduce((m, c) => (dist(c.site, mid) < dist(m.site, mid) ? c : m));
  });

  // ================= 13. Parcellaire fin =================
  // Chaque quartier bâti est redécoupé en petites cellules. Les îlots sont des assemblages
  // irréguliers de ces cellules, séparés par les grandes routes puis par des rues et ruelles
  // tracées à travers les îlots trop grands. Les maisons ne bordent que les rues.
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
  const inside = (poly, p) => {
    const s = Math.sign(Geo.area(poly));
    for (let i = 0; i < poly.length; i++) {
      const A = poly[i], B = poly[(i + 1) % poly.length];
      if (((B[0] - A[0]) * (p[1] - A[1]) - (B[1] - A[1]) * (p[0] - A[0])) * s < 0) return false;
    }
    return true;
  };
  // Distance jusqu'à la sortie d'un polygone convexe en partant de P dans la direction d
  const rayExit = (poly, P, d) => {
    let best = Infinity;
    for (let i = 0; i < poly.length; i++) {
      const A = poly[i], B = poly[(i + 1) % poly.length];
      const ex = B[0] - A[0], ey = B[1] - A[1];
      const den = d[0] * ey - d[1] * ex;
      if (Math.abs(den) < 1e-9) continue;
      const t = ((A[0] - P[0]) * ey - (A[1] - P[1]) * ex) / den;
      const s = ((A[0] - P[0]) * d[1] - (A[1] - P[1]) * d[0]) / den;
      if (t > 0.05 && s >= -1e-6 && s <= 1 + 1e-6) best = Math.min(best, t);
    }
    return best;
  };
  // Découpe un polygone convexe en bandes parallèles (champs, entrepôts)
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
  const voronoiIn = (pts, poly) => pts.map((s, i) => {
    let p = poly;
    for (let j = 0; j < pts.length && p.length >= 3; j++) {
      if (j === i) continue;
      const t = pts[j];
      p = Geo.clip(p, (s[0] + t[0]) / 2, (s[1] + t[1]) / 2, s[0] - t[0], s[1] - t[1]);
    }
    return p;
  });

  const zoneOf = c => {
    if (c.citadel) return 'citadelle';
    if (!c.inner) return 'faubourg';
    if (age === 1) return 'bourg';
    if (c.ring === 0) return 'vieille';
    return c.ring === lastRing ? 'neuf' : 'bourg';
  };
  const isSuburb = c => !c.inner && !c.citadel && !c.steep && !c.building && c.type !== 'plaza'
    && touches(c, roadEdges) && dC(c) < 1.5 * R && !touchesBorder(c);
  const isFine = c => !c.building && c.type !== 'plaza' && !c.steep && (c.inner || c.citadel || isSuburb(c));
  const domainOf = c => (c.citadel ? 'cit' : c.inner ? 'town' : 'sub');
  const FINE_AREA = { vieille: 1300, bourg: 1800, neuf: 2400, faubourg: 2400, citadelle: 2000 };

  // --- cellules fines ---
  const fverts = [], fgrid = new Map();
  const fweld = p => {
    const gx = Math.floor(p[0]), gy = Math.floor(p[1]);
    for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) {
      const list = fgrid.get((gx + dx) + ',' + (gy + dy));
      if (list) for (const id of list) {
        const v = fverts[id];
        if (Math.abs(v[0] - p[0]) < 0.3 && Math.abs(v[1] - p[1]) < 0.3) return id;
      }
    }
    const id = fverts.length;
    fverts.push([p[0], p[1]]);
    const k = gx + ',' + gy;
    if (!fgrid.has(k)) fgrid.set(k, []);
    fgrid.get(k).push(id);
    return id;
  };
  const fcells = [];
  const childrenOf = new Map();
  for (const c of cells) {
    if (!isFine(c)) continue;
    const poly = c.ids.map(id => verts[id]);
    if (poly.length < 3) continue;
    const zone = zoneOf(c);
    const k = Math.max(1, Math.round(Math.abs(Geo.area(poly)) / FINE_AREA[zone]));
    const r = rng('fin|' + opts.size + '|' + c.index);
    const xs = poly.map(p => p[0]), ys = poly.map(p => p[1]);
    let pts = [];
    for (let tries = 0; pts.length < k && tries < k * 60; tries++) {
      const p = [between(r, [Math.min(...xs), Math.max(...xs)]), between(r, [Math.min(...ys), Math.max(...ys)])];
      if (inside(poly, p)) pts.push(p);
    }
    if (!pts.length) pts = [Geo.centroid(poly)];
    for (let it = 0; it < 2 && pts.length > 1; it++) pts = voronoiIn(pts, poly).map((pc, i) => (pc.length >= 3 ? Geo.centroid(pc) : pts[i]));
    const kids = [];
    for (const pc of pts.length > 1 ? voronoiIn(pts, poly) : [poly]) {
      if (pc.length < 3) continue;
      const ids = [];
      for (const p of pc) { const id = fweld(p); if (ids[ids.length - 1] !== id) ids.push(id); }
      if (ids.length > 1 && ids[0] === ids[ids.length - 1]) ids.pop();
      if (ids.length < 3) continue;
      kids.push(fcells.length);
      fcells.push({ index: fcells.length, ids, coarse: c, zone, suburb: !c.inner && !c.citadel });
    }
    childrenOf.set(c.index, kids);
  }

  // --- raccords le long des bords de quartier (sommets en T) ---
  const fek = (a, b) => (a < b ? a + '_' + b : b + '_' + a);
  const coarseLists = new Map();
  const coarseList = key => {
    if (coarseLists.has(key)) return coarseLists.get(key);
    const [u, v] = unkey(key), U = verts[u], V = verts[v], L = dist(U, V);
    const cand = new Set();
    for (const ci of edgeCells.get(key) || []) for (const fi of childrenOf.get(ci) || []) fcells[fi].ids.forEach(id => cand.add(id));
    const list = [...cand].filter(id => Geo.distToSegment(fverts[id], U, V) < 0.4)
      .map(id => [id, ((fverts[id][0] - U[0]) * (V[0] - U[0]) + (fverts[id][1] - U[1]) * (V[1] - U[1])) / L])
      .sort((a, b) => a[1] - b[1]).map(x => x[0]);
    coarseLists.set(key, list);
    return list;
  };
  const fineOnCoarse = new Map();   // bord fin → bord de quartier sur lequel il se trouve
  for (const fc of fcells) {
    const lists = cellEdges(fc.coarse).map(([a, b]) => [ek(a, b), coarseList(ek(a, b))]);
    const out = [];
    const ids = fc.ids;
    for (let k = 0; k < ids.length; k++) {
      const p = ids[k], q = ids[(k + 1) % ids.length];
      out.push(p);
      for (const [ck, L] of lists) {
        const ip = L.indexOf(p), iq = L.indexOf(q);
        if (ip < 0 || iq < 0) continue;
        const seq = ip < iq ? L.slice(ip, iq + 1) : L.slice(iq, ip + 1).reverse();
        for (let m = 1; m + 1 < seq.length; m++) out.push(seq[m]);
        for (let m = 0; m + 1 < seq.length; m++) fineOnCoarse.set(fek(seq[m], seq[m + 1]), ck);
        break;
      }
    }
    fc.ids = out;
  }
  const fEdges = fc => fc.ids.map((a, k) => [a, fc.ids[(k + 1) % fc.ids.length]]);
  const fEdgeCells = new Map();
  fcells.forEach(fc => fEdges(fc).forEach(([a, b]) => {
    const key = fek(a, b);
    if (!fEdgeCells.has(key)) fEdgeCells.set(key, []);
    fEdgeCells.get(key).push(fc.index);
  }));

  // --- nature de chaque bord : grande route, rue, ruelle, place, rempart, berge… ---
  const oldWallStanding = new Map(oldWalls.map(w => [ek(w.a, w.b), w.standing]));
  const coarseClass = (ck, from) => {
    if (wallEdges.has(ck)) return 'wall';
    if (riverEdgeW.has(ck)) return 'river';
    if (citadelEdges.has(ck)) return 'wall2';
    if (roadEdges.has(ck)) return 'main';
    if (oldWallStanding.has(ck)) return oldWallStanding.get(ck) ? 'oldwall' : 'boulevard'; // mur démoli → boulevard
    const other = (edgeCells.get(ck) || []).map(ci => cells[ci]).find(o => o !== from);
    if (!other) return 'edge';
    if (other.type === 'plaza' || other.building) return 'place';
    if (isFine(other)) return domainOf(other) === domainOf(from) ? 'none' : 'edge';
    if (other.steep) return 'back';
    return 'edge';
  };
  const fclass = new Map();
  for (const [key, cs] of fEdgeCells) {
    const ck = fineOnCoarse.get(key);
    fclass.set(key, ck ? coarseClass(ck, fcells[cs[0]].coarse) : 'none');
  }

  // --- rues secondaires, ruelles et impasses ---
  const fArea = fcells.map(fc => Math.abs(Geo.area(fc.ids.map(id => fverts[id]))));
  const MAX_BLOCK = { vieille: 5500, bourg: 8000, neuf: 12000, citadelle: 9000 };
  const blocksNow = () => {
    const parent = fcells.map((_, i) => i);
    const find = i => (parent[i] === i ? i : (parent[i] = find(parent[i])));
    for (const [key, cs] of fEdgeCells) if (cs.length === 2 && fclass.get(key) === 'none') parent[find(cs[0])] = find(cs[1]);
    const groups = new Map();
    fcells.forEach((fc, i) => { const r = find(i); if (!groups.has(r)) groups.set(r, []); groups.get(r).push(i); });
    return [...groups.values()];
  };
  const localPath = (adj, s, t) => {
    const d = new Map([[s, 0]]), prev = new Map(), done = new Set();
    for (;;) {
      let u = -1, bu = Infinity;
      for (const [v, dv] of d) if (!done.has(v) && dv < bu) { bu = dv; u = v; }
      if (u < 0 || u === t) break;
      done.add(u);
      for (const e of adj.get(u) || []) if (bu + e.cost < (d.has(e.to) ? d.get(e.to) : Infinity)) { d.set(e.to, bu + e.cost); prev.set(e.to, u); }
    }
    if (!d.has(t)) return null;
    const path = [t];
    while (path[path.length - 1] !== s) path.push(prev.get(path[path.length - 1]));
    return path;
  };
  const rStreets = rng('rues|' + opts.size);
  const cutBlock = (group, cls, deadEnd) => {
    const set = new Set(group);
    const internal = [], border = new Set();
    for (const fi of group) for (const [a, b] of fEdges(fcells[fi])) {
      const key = fek(a, b), cs = fEdgeCells.get(key);
      if (fclass.get(key) === 'none' && cs.length === 2 && set.has(cs[0]) && set.has(cs[1])) internal.push([a, b]);
      else { border.add(a); border.add(b); }
    }
    if (!internal.length) return false;
    // Axe principal de l'îlot ; la nouvelle rue le coupe en travers
    let W = 0, cx = 0, cy = 0;
    const cents = group.map(fi => [Geo.centroid(fcells[fi].ids.map(id => fverts[id])), fArea[fi]]);
    cents.forEach(([p, w]) => { W += w; cx += p[0] * w; cy += p[1] * w; });
    cx /= W; cy /= W;
    let sxx = 0, syy = 0, sxy = 0;
    cents.forEach(([p, w]) => { sxx += w * (p[0] - cx) ** 2; syy += w * (p[1] - cy) ** 2; sxy += w * (p[0] - cx) * (p[1] - cy); });
    const th = 0.5 * Math.atan2(2 * sxy, sxx - syy) + (rStreets() - 0.5) * 0.5;
    const ax = [Math.cos(th), Math.sin(th)], cut = [-ax[1], ax[0]];
    const offLine = m => Math.abs((m[0] - cx) * ax[0] + (m[1] - cy) * ax[1]);
    const adj = new Map();
    const add = (a, b, c) => { if (!adj.has(a)) adj.set(a, []); adj.get(a).push({ to: b, cost: c }); };
    for (const [a, b] of internal) {
      const m = [(fverts[a][0] + fverts[b][0]) / 2, (fverts[a][1] + fverts[b][1]) / 2];
      const c = dist(fverts[a], fverts[b]) * (1 + (deadEnd ? 0 : offLine(m) / 6));
      add(a, b, c); add(b, a, c);
    }
    const entry = [...border].filter(id => adj.has(id));
    if (!entry.length) return false;
    let s, t;
    if (deadEnd) {
      const inner = [...adj.keys()].filter(id => !border.has(id));
      if (!inner.length) return false;
      t = inner.reduce((m, id) => (dist(fverts[id], [cx, cy]) < dist(fverts[m], [cx, cy]) ? id : m));
      s = entry.reduce((m, id) => (dist(fverts[id], fverts[t]) < dist(fverts[m], fverts[t]) ? id : m));
    } else {
      if (entry.length < 2) return false;
      const P1 = [cx + cut[0] * 1e4, cy + cut[1] * 1e4], P2 = [cx - cut[0] * 1e4, cy - cut[1] * 1e4];
      s = entry.reduce((m, id) => (dist(fverts[id], P1) < dist(fverts[m], P1) ? id : m));
      t = entry.filter(id => id !== s).reduce((m, id) => (dist(fverts[id], P2) < dist(fverts[m], P2) ? id : m));
    }
    const path = localPath(adj, s, t);
    if (!path || path.length < 2) return false;
    for (let k = 0; k + 1 < path.length; k++) fclass.set(fek(path[k], path[k + 1]), cls);
    return true;
  };
  {
    const stuck = new Set();
    for (let guard = 0; guard < 500; guard++) {
      let target = null, bestArea = 0;
      for (const g of blocksNow()) {
        const zone = fcells[g[0]].zone;
        if (!MAX_BLOCK[zone] || stuck.has(Math.min(...g))) continue;
        const a = g.reduce((s, i) => s + fArea[i], 0);
        if (a > MAX_BLOCK[zone] && a > bestArea) { bestArea = a; target = g; }
      }
      if (!target) break;
      if (!cutBlock(target, 'rue')) stuck.add(Math.min(...target));
    }
    // Ruelles et impasses dans les îlots encore grands
    for (const g of blocksNow()) {
      const zone = fcells[g[0]].zone;
      if (!MAX_BLOCK[zone]) continue;
      const a = g.reduce((s, i) => s + fArea[i], 0);
      if (a > MAX_BLOCK[zone] * 0.5 && rStreets() < 0.45) cutBlock(g, 'ruelle', false);
      else if (a > MAX_BLOCK[zone] * 0.35 && rStreets() < 0.35) cutBlock(g, 'ruelle', true);
    }
  }

  // ================= 14. Dessin des parcelles et des maisons =================
  const city = {
    name, autoName, seed: opts.seed, size: opts.size, R, E, relief, age,
    rivers: rivers.map(rv => ({ w: rv.w, points: smooth(rv.path.map(id => verts[id]), 3) })),
    bridges,
    wall: wall.map(id => verts[id]),
    gates: gates.map(id => {
      const k = wall.indexOf(id);
      return { at: verts[id], prev: verts[wall[(k - 1 + wall.length) % wall.length]], next: verts[wall[(k + 1) % wall.length]] };
    }),
    oldWalls: oldWalls.map(w => ({ a: verts[w.a], b: verts[w.b], standing: w.standing })),
    oldGates,
    citadel: citadelSet.size ? {
      edges: boundary(citadelSet).map(([a, b]) => [verts[a], verts[b]]),
      gate: citadelGate >= 0 ? verts[citadelGate] : null,
    } : null,
    roads: roads.map(p => p.map(id => verts[id])),
    suburbGround: [],
    ground: { court: [], yard: [], garden: [] },
    houses: { stone: [], timber: [], thatch: [] },
    roofs: { slate: [], tile: [], thatch: [] },
    ridges: [], annexes: [], lotLines: [], fences: [], trees: [],
    terraces: [], vineyards: [], fieldStrips: [[], [], []], meadows: [],
    plaza: [], stalls: [], wells: [], specials: [], labels: [],
    contours: [],
    gateNames: [],
    districts: districts.map(d => ({
      name: d.name, auto: d.auto, ring: d.ring,
      at: Geo.centroid(d.labelCell.ids.map(id => verts[id])),
    })),
  };

  // Noms des portes
  {
    const usedDirs = new Set();
    const rP = rng('portes-noms');
    for (const g of gates) {
      const v = verts[g], dir = compassOf(v);
      const text = usedDirs.has(dir) ? 'Porte ' + GATE_EXTRA[Math.floor(rP() * GATE_EXTRA.length)] : 'Porte ' + ofDir(dir);
      usedDirs.add(dir);
      const l = Math.hypot(v[0], v[1]) || 1;
      city.gateNames.push({ at: [v[0] + (v[0] / l) * 34, v[1] + (v[1] / l) * 34], text });
    }
  }

  // Courbes de niveau (carrés marchants sur une grille d'altitude)
  if (relief !== 'plaine') {
    const G = 90, step = (2 * E) / G;
    const H = [];
    for (let j = 0; j <= G; j++) { H.push([]); for (let i = 0; i <= G; i++) H[j].push(elev(-E + i * step, -E + j * step)); }
    const levels = relief === 'colline' ? [0.12, 0.3, 0.48, 0.66, 0.84] : [0.12, 0.3, 0.5, 0.7, 0.9];
    for (const L of levels) {
      const segs = [];
      for (let j = 0; j < G; j++) for (let i = 0; i < G; i++) {
        const v = [H[j][i], H[j][i + 1], H[j + 1][i + 1], H[j + 1][i]];
        const x0 = -E + i * step, y0 = -E + j * step;
        const P = [[x0, y0], [x0 + step, y0], [x0 + step, y0 + step], [x0, y0 + step]];
        const e = k => { const a = P[k], b = P[(k + 1) % 4], va = v[k], vb = v[(k + 1) % 4], t = (L - va) / (vb - va); return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]; };
        const idx = (v[0] > L ? 1 : 0) | (v[1] > L ? 2 : 0) | (v[2] > L ? 4 : 0) | (v[3] > L ? 8 : 0);
        const T = { 1: [[3, 0]], 2: [[0, 1]], 3: [[3, 1]], 4: [[1, 2]], 5: [[3, 0], [1, 2]], 6: [[0, 2]], 7: [[3, 2]],
          8: [[2, 3]], 9: [[0, 2]], 10: [[0, 1], [2, 3]], 11: [[1, 2]], 12: [[1, 3]], 13: [[0, 1]], 14: [[3, 0]] }[idx];
        if (T) for (const [p, q] of T) segs.push([e(p), e(q)]);
      }
      city.contours.push(segs);
    }
  }

  const ridgeOf = (poly, u) => {
    const c = Geo.centroid(poly);
    const v = [-u[1], u[0]];
    let lo = Infinity, hi = -Infinity, wlo = Infinity, whi = -Infinity;
    for (const p of poly) {
      const t = (p[0] - c[0]) * u[0] + (p[1] - c[1]) * u[1], s = (p[0] - c[0]) * v[0] + (p[1] - c[1]) * v[1];
      lo = Math.min(lo, t); hi = Math.max(hi, t); wlo = Math.min(wlo, s); whi = Math.max(whi, s);
    }
    const half = (whi - wlo) / 2 * 0.6;
    if (hi - lo - 2 * half < 1) return null;
    return [[c[0] + u[0] * (lo + half), c[1] + u[1] * (lo + half)], [c[0] + u[0] * (hi - half), c[1] + u[1] * (hi - half)]];
  };
  const addHouse = (poly, zone, rand, rich) => {
    let [pStone, pTimber] = ZONES[zone].mat;
    if (rich) { pStone = Math.min(1, pStone + 0.35); pTimber = 1 - pStone; }
    const r = rand();
    const mat = r < pStone ? 'stone' : r < pStone + pTimber ? 'timber' : 'thatch';
    const roof = mat === 'stone' ? (rand() < 0.55 ? 'slate' : 'tile') : mat === 'timber' ? (rand() < 0.85 ? 'tile' : 'slate') : 'thatch';
    city.houses[mat].push(poly);
    city.roofs[roof].push(poly);
  };
  const treeIn = (poly, rand, p) => {
    if (rand() >= p || Math.abs(Geo.area(poly)) < 50) return;
    const [c, ir] = inradius(poly);
    if (ir < 3) return;
    const a = rand() * Math.PI * 2, d = rand() * Math.max(0, ir - 4);
    city.trees.push([c[0] + Math.cos(a) * d, c[1] + Math.sin(a) * d, Math.min(ir * 0.9, between(rand, [2.5, 4.5]))]);
  };

  const INSET = { main: 5, boulevard: 4.5, rue: 2.6, ruelle: 1.5, place: 2.5, wall: 7, wall2: 5, oldwall: 3, edge: 2.5, back: 1.5, none: 0 };
  const FRONTS = new Set(['main', 'boulevard', 'rue', 'ruelle', 'place']);
  const TREES = { vieille: 0.05, bourg: 0.25, neuf: 0.45, faubourg: 0.5, citadelle: 0.15 };
  const interiorGround = zone => (zone === 'vieille' || zone === 'citadelle' ? 'court' : 'garden');

  // Intersection de deux polygones convexes, et test de chevauchement (axes séparateurs)
  const intersectConvex = (poly, clipPoly) => {
    const sg = Geo.area(clipPoly) > 0 ? 1 : -1;
    let out = poly;
    for (let i = 0; i < clipPoly.length && out.length >= 3; i++) {
      const A = clipPoly[i], B = clipPoly[(i + 1) % clipPoly.length];
      out = Geo.clip(out, A[0], A[1], -(B[1] - A[1]) * sg, (B[0] - A[0]) * sg);
    }
    return out.filter((p, i) => dist(p, out[(i + 1) % out.length]) > 0.05);   // sans sommets en double
  };
  const overlaps = (a, b) => {
    for (const P of [a, b]) for (let i = 0; i < P.length; i++) {
      const A = P[i], B = P[(i + 1) % P.length], nx = -(B[1] - A[1]), ny = B[0] - A[0];
      if (Math.hypot(nx, ny) < 1e-6) continue;   // côté de longueur nulle : pas un axe
      let amin = Infinity, amax = -Infinity, bmin = Infinity, bmax = -Infinity;
      for (const q of a) { const v = q[0] * nx + q[1] * ny; amin = Math.min(amin, v); amax = Math.max(amax, v); }
      for (const q of b) { const v = q[0] * nx + q[1] * ny; bmin = Math.min(bmin, v); bmax = Math.max(bmax, v); }
      const tol = 0.3 * Math.hypot(nx, ny);
      if (amax <= bmin + tol || bmax <= amin + tol) return false;
    }
    return true;
  };

  // Façades sur rue : maisons rectangulaires alignées sur la rue, cour ou jardin derrière
  const frontage = (block0, classes0, zone, rand, suburb) => {
    const Z = ZONES[zone];
    // Fusionne les segments alignés d'une même rue : une rangée de maisons continue
    let block = block0.slice(), classes = classes0.slice();
    for (let changed = true; changed && block.length > 3;) {
      changed = false;
      for (let k = 0; k < block.length && block.length > 3; k++) {
        const pk = (k - 1 + block.length) % block.length, nk = (k + 1) % block.length;
        if (classes[pk] !== classes[k]) continue;
        const a1 = Math.atan2(block[k][1] - block[pk][1], block[k][0] - block[pk][0]);
        const a2 = Math.atan2(block[nk][1] - block[k][1], block[nk][0] - block[k][0]);
        let da = Math.abs(a1 - a2); if (da > Math.PI) da = 2 * Math.PI - da;
        if (da < 0.2 || dist(block[k], block[pk]) < 1.5) {
          block.splice(k, 1); classes.splice(k, 1); changed = true; break;
        }
      }
    }
    const s = Geo.area(block) > 0 ? 1 : -1;
    const placed = [];
    city.ground[suburb ? 'garden' : interiorGround(zone)].push(block);
    let count = 0;
    for (let i = 0; i < block.length; i++) {
      const A = block[i], B = block[(i + 1) % block.length];
      const L = dist(A, B);
      const cls = classes[i];
      if (!FRONTS.has(cls) || (suburb && cls !== 'main') || L < 4) continue;
      const u = [(B[0] - A[0]) / L, (B[1] - A[1]) / L], n = [-u[1] * s, u[0] * s];
      const rich = cls === 'main' || cls === 'place' || cls === 'boulevard';
      const alley = cls === 'ruelle';
      const front = rich ? [Z.front[0], Z.front[0] + 2.5] : alley ? [Z.front[0] + 2, Z.front[1] + 3] : Z.front;
      const skip = alley ? 0.45 : suburb ? 0.35 : zone === 'neuf' ? 0.08 : 0.03;
      const rowDepth = between(rand, Z.depth) * (rich ? 1.2 : alley ? 0.8 : 1);   // profondeur commune à la rangée
      let t = 0;
      while (t < L - 1) {
        let w = between(rand, front);
        if (L - (t + w) < front[0] * 0.7) w = L - t;
        const P0 = [A[0] + u[0] * t, A[1] + u[1] * t], P1 = [A[0] + u[0] * (t + w), A[1] + u[1] * (t + w)];
        const mid = [A[0] + u[0] * (t + w / 2), A[1] + u[1] * (t + w / 2)];
        t += w;
        const reach = rayExit(block, [mid[0] + n[0] * 0.1, mid[1] + n[1] * 0.1], n);
        if (!isFinite(reach) || reach < 5) continue;
        if (rand() < skip) {
          city.fences.push([P0, P1]);          // mur de jardin sur la rue
          continue;
        }
        let d = Math.min(rowDepth * between(rand, [0.85, 1.15]), reach * 0.5);
        // Maison d'angle : si elle gêne, on la raccourcit côté coin, puis en profondeur
        let house = null;
        const trims = [[0, 0], [0, 0.35], [0.35, 0], [0, 0.6], [0.6, 0]];
        for (const df of [1, 0.65]) for (const [ta, tb] of trims) {
          if (house) break;
          const tryD = d * df;
          if (tryD < 4) continue;
          const Q0 = [P0[0] + u[0] * w * ta, P0[1] + u[1] * w * ta], Q1 = [P1[0] - u[0] * w * tb, P1[1] - u[1] * w * tb];
          const r0 = intersectConvex([Q0, Q1, [Q1[0] + n[0] * tryD, Q1[1] + n[1] * tryD], [Q0[0] + n[0] * tryD, Q0[1] + n[1] * tryD]], block);
          if (r0.length >= 3 && Math.abs(Geo.area(r0)) > 12 && !placed.some(p => overlaps(p, r0))) { house = r0; d = tryD; }
        }
        if (!house) continue;
        placed.push(house);
        addHouse(house, zone, rand, rich);
        count++;
        const ridge = ridgeOf(house, w < d ? n : u);   // pignon sur rue si la façade est étroite
        if (ridge) city.ridges.push(ridge);
        // Limite de parcelle derrière la maison
        if (t < L - 1) {
          const len = Math.min(reach * 0.75, d + between(rand, [8, 18]));
          city.lotLines.push([[P1[0] + n[0] * d, P1[1] + n[1] * d], [P1[0] + n[0] * len, P1[1] + n[1] * len]]);
        }
        // Dépendance au fond de la cour
        if (rand() < Z.annex) {
          const ad = between(rand, [3, 5.5]), gap = between(rand, [1.5, 4]);
          const cc = [mid[0] + n[0] * (d + gap + ad / 2), mid[1] + n[1] * (d + gap + ad / 2)];
          const shed = rect(cc, u, w * between(rand, [0.4, 0.75]), ad);
          if (shed.every(q => inside(block, q)) && !placed.some(p => overlaps(p, shed))) { city.annexes.push(shed); placed.push(shed); }
        }
      }
    }
    // Arbres dans les cœurs d'îlots
    const [c, ir] = inradius(block);
    const nTrees = Math.round(TREES[zone] * Math.abs(Geo.area(block)) / 250);
    for (let k = 0; k < nTrees * 3 && k < 40; k++) {
      if (city.trees.length && k >= nTrees * 3) break;
      const a = rand() * Math.PI * 2, dd = rand() * ir;
      const p = [c[0] + Math.cos(a) * dd, c[1] + Math.sin(a) * dd], r = between(rand, [2.5, 4.5]);
      const blob = rect(p, [1, 0], r * 2, r * 2);
      if (inside(block, p) && !placed.some(q => overlaps(q, blob))) { city.trees.push([p[0], p[1], r]); placed.push(blob); }
    }
    return count;
  };

  // Correspondance bord rétréci → bord d'origine (pour connaître la nature de la rue)
  const classesAfterInset = (poly, dists, classes, block) => {
    const s = Geo.area(poly) > 0 ? 1 : -1;
    return block.map((P, j) => {
      const Q = block[(j + 1) % block.length], M = [(P[0] + Q[0]) / 2, (P[1] + Q[1]) / 2];
      for (let i = 0; i < poly.length; i++) {
        const A = poly[i], B = poly[(i + 1) % poly.length], L = dist(A, B);
        if (L < 1e-6) continue;
        const u = [(B[0] - A[0]) / L, (B[1] - A[1]) / L], n = [-u[1] * s, u[0] * s];
        const sd = (M[0] - A[0]) * n[0] + (M[1] - A[1]) * n[1], tt = (M[0] - A[0]) * u[0] + (M[1] - A[1]) * u[1];
        if (Math.abs(sd - dists[i]) < 0.35 && tt > -1 && tt < L + 1) return classes[i];
      }
      return 'none';
    });
  };

  let people = 0;
  for (const fc of fcells) {
    const poly = fc.ids.map(id => fverts[id]);
    const keys = fEdges(fc).map(([a, b]) => fek(a, b));
    const classes = keys.map(k => fclass.get(k));
    const dists = keys.map((k, i) => (classes[i] === 'river' ? riverEdgeW.get(fineOnCoarse.get(k)) / 2 + 2.5 : INSET[classes[i]]));
    const block = Geo.inset(poly, dists);
    if (block.length < 3) {
      // Cellule trop fine pour bâtir : un bout de jardin plutôt qu'un vide
      const sliver = Geo.inset(poly, dists.map(d => d * 0.6));
      if (sliver.length >= 3) city.ground.garden.push(sliver);
      continue;
    }
    const rand = rng('parcelle|' + opts.size + '|' + fc.coarse.index + '|' + fc.index);
    if (fc.suburb) city.suburbGround.push(block);
    people += frontage(block, classesAfterInset(poly, dists, classes, block), fc.zone, rand, fc.suburb) * ZONES[fc.zone].people;
  }

  // Quartiers non redécoupés : place, monuments, pentes, champs
  const withRiver = (k, d) => (riverEdgeW.has(k) ? Math.max(d, riverEdgeW.get(k) / 2 + 2.5) : d);
  const edgeInset = k => withRiver(k,
    wallEdges.has(k) ? 7 : citadelEdges.has(k) ? 6 : oldWallEdges.has(k) ? 4 : roadEdges.has(k) ? 5.5 : 3.5);

  const special = (b, yard, rand, c) => {
    const S = { id: b.id, yard: [yard], yardColor: 'court', shapes: [] };
    const [ctr, ir] = inradius(yard);
    const label = { at: ctr, text: b.label };
    const fill = color => ({ fill: color, stroke: 1.1 });
    switch (b.id) {
      case 'temple': {
        // Croix latine orientée vers l'est (chœur à l'est), parvis à l'ouest
        const r = ir * 0.95, e = [1, 0];
        S.shapes.push({ polys: [rect([ctr[0] - r * 0.1, ctr[1]], e, r * 1.6, r * 0.42), rect([ctr[0] + r * 0.25, ctr[1]], [0, 1], r * 1.15, r * 0.34)], ...fill('temple'), outline: true });
        S.shapes.push({ polys: [circle([ctr[0] + r * 0.7, ctr[1]], r * 0.21, 20)], ...fill('temple'), outline: true });
        S.shapes.push({ lines: [[[ctr[0] - r * 0.9, ctr[1]], [ctr[0] + r * 0.7, ctr[1]]], [[ctr[0] + r * 0.25, ctr[1] - r * 0.57], [ctr[0] + r * 0.25, ctr[1] + r * 0.57]]], stroke: 0.8 });
        label.at = [ctr[0], ctr[1] + r * 0.75];
        break;
      }
      case 'chateau': {
        S.yardColor = 'castleYard';
        const w = Geo.inset(yard, 6);
        if (!c.citadel && w.length) S.shapes.push({ polys: [w], fill: 'none', stroke: 3.5, strokeColor: 'wall' });
        const k = rect(ctr, [1, 0], ir * 0.7, ir * 0.7);
        S.shapes.push({ polys: [k], fill: 'castle', stroke: 1.5, strokeColor: 'wall' });
        S.shapes.push({ polys: k.map(p => circle(p, ir * 0.12, 14)), fill: 'castle', stroke: 1.2, strokeColor: 'wall' });
        label.at = [ctr[0], ctr[1] + ir * 0.62];
        break;
      }
      case 'palais':
      case 'universite':
      case 'hospice':
      case 'caserne':
      case 'monastere': {
        const color = { palais: 'noble', universite: 'school', hospice: 'temple', caserne: 'military', monastere: 'temple' }[b.id];
        S.shapes.push({ polys: [Geo.scale(yard, 0.72), Geo.scale(yard, 0.42)], fill: color, stroke: 1.1, evenodd: true });
        if (b.id === 'monastere') S.shapes.push({ polys: [rect([ctr[0], ctr[1] - ir * 0.95], [1, 0], ir * 0.9, ir * 0.28)], fill: 'temple', stroke: 1.1 });
        if (b.id === 'monastere' || b.id === 'hospice') {
          const g = Geo.scale(yard, 0.36);
          S.shapes.push({ polys: [g], fill: 'green' });
        }
        break;
      }
      case 'guildes':
      case 'prison':
      case 'bains': {
        const color = { guildes: 'guild', prison: 'military', bains: 'baths' }[b.id];
        S.shapes.push({ polys: [Geo.scale(yard, 0.55)], fill: color, stroke: 1.2 });
        break;
      }
      case 'arene': {
        S.shapes.push({ polys: [circle(ctr, ir * 0.85)], fill: 'stone', stroke: 1.2 });
        S.shapes.push({ polys: [circle(ctr, ir * 0.5)], fill: 'sand', stroke: 0.8 });
        break;
      }
      case 'cimetiere': {
        S.yardColor = 'green';
        const zone = Geo.inset(yard, 6), tombs = [];
        if (zone.length) {
          const xs = zone.map(p => p[0]), ys = zone.map(p => p[1]);
          for (let x = Math.min(...xs); x < Math.max(...xs); x += 8) for (let y = Math.min(...ys); y < Math.max(...ys); y += 10) {
            if (inside(zone, [x, y]) && rand() < 0.7) tombs.push(rect([x, y], [1, 0], 2.5, 4.5));
          }
        }
        S.shapes.push({ polys: tombs, fill: 'tomb' });
        S.shapes.push({ polys: [rect(ctr, [1, 0], ir * 0.35, ir * 0.22)], fill: 'temple', stroke: 1 });
        S.shapes.push({ polys: [yard], fill: 'none', stroke: 1, strokeColor: 'fence' });
        break;
      }
      case 'port': {
        // Quai et entrepôts parallèles à la rive
        S.yardColor = 'quay';
        const rk = cellEdges(c).map(([a, b]) => ek(a, b)).find(k => riverEdgeW.has(k));
        let dir = [1, 0];
        if (rk) { const [a, b] = unkey(rk); const L = dist(verts[a], verts[b]); dir = [(verts[b][0] - verts[a][0]) / L, (verts[b][1] - verts[a][1]) / L]; }
        const ware = stripCut(Geo.inset(yard, 8), [-dir[1], dir[0]], [9, 14], rand).filter((_, i) => i % 2 === 0);
        S.shapes.push({ polys: ware.map(p => Geo.inset(p, 1)).filter(p => p.length >= 3), fill: 'tile', stroke: 0.8 });
        break;
      }
      case 'moulin': {
        S.yardColor = 'field1';
        S.shapes.push({ polys: [circle(ctr, 6, 16)], fill: 'building', stroke: 1 });
        S.shapes.push({ lines: [0, 1, 2, 3].map(i => { const a = Math.PI / 4 + (i * Math.PI) / 2; return [ctr, [ctr[0] + Math.cos(a) * 15, ctr[1] + Math.sin(a) * 15]]; }), stroke: 2 });
        label.at = [ctr[0], ctr[1] + 24];
        break;
      }
    }
    city.specials.push(S);
    city.labels.push(label);
  };

  for (const c of cells) {
    if (isFine(c)) continue;
    const poly = c.ids.map(id => verts[id]);
    if (poly.length < 3) continue;
    const keys = cellEdges(c).map(([a, b]) => ek(a, b));
    const rand = rng('ilot|' + opts.size + '|' + c.index);
    const block = Geo.inset(poly, keys.map(edgeInset));
    if (block.length < 3) continue;

    if (c.type === 'plaza') {
      city.plaza.push(block);
      // Puits et étals du marché
      const [ctr, ir] = inradius(block);
      city.wells.push([ctr[0], ctr[1], 2.6]);
      const ax = [Math.cos(rand() * Math.PI), 0]; ax[1] = Math.sqrt(1 - ax[0] ** 2);
      for (let k = 0; k < 9; k++) {
        const a = rand() * Math.PI * 2, d = between(rand, [8, Math.max(9, ir * 0.7)]);
        const st = rect([ctr[0] + Math.cos(a) * d, ctr[1] + Math.sin(a) * d], ax, between(rand, [3, 5]), between(rand, [2, 3]));
        if (st.every(q => inside(block, q))) city.stalls.push(st);
      }
      city.labels.push({ at: [ctr[0], ctr[1] - Math.min(ir * 0.55, 14)], text: 'Marché' });
    } else if (c.building) {
      special(c.building, block, rand, c);
    } else if (c.steep) {
      (c.inner ? city.terraces : city.vineyards).push(block);   // pente : terrasses ou vignes, pas de maisons
    } else {
      // Champs en lanières (openfield), orientation propre à chaque quartier de terre
      const field = Geo.inset(poly, keys.map(k => withRiver(k, roadEdges.has(k) ? 5.5 : 2)));
      if (field.length < 3) continue;
      const a = rand() * Math.PI;
      const strips = stripCut(field, [Math.cos(a), Math.sin(a)], [10, 22], rand);
      strips.forEach(st => city.fieldStrips[Math.floor(rand() * 3)].push(st));
      if (rand() < 0.15) city.meadows.push(field);
    }
  }

  // La citadelle a son étiquette
  if (citadelSet.size > 1) {
    const free = cells.filter(c => c.citadel && !c.building);
    const ref = cells[[...citadelSet][0]].site;
    const at = free.length ? free.reduce((m, c) => (dist(c.site, ref) < dist(m.site, ref) ? c : m)).site : ref;
    city.labels.push({ at, text: 'Citadelle', italic: true });
  }

  city.stats = {
    houses: city.houses.stone.length + city.houses.timber.length + city.houses.thatch.length,
    stone: city.houses.stone.length, timber: city.houses.timber.length, thatch: city.houses.thatch.length,
    population: Math.round(people / 50) * 50,
    gates: gates.length,
    rivers: rivers.length,
    relief, age,
    diameter: Math.round((Math.max(...wall.map(id => verts[id][0])) - Math.min(...wall.map(id => verts[id][0]))) / 10) * 10,
    streets: [...fclass.values()].filter(v => v === 'rue').length,
    alleys: [...fclass.values()].filter(v => v === 'ruelle').length,
    missing,
  };
  return city;
}
