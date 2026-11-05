'use strict';
/*
 * Génération d'une ville : données géométriques pures (aucun dessin ici). Dépend de geo.js et catalog.js.
 *
 * Étapes, chacune déduite des précédentes :
 *   1. Îlots : Voronoi sur une spirale de points
 *   2. Relief : plaine, colline(s) ou vallée → pentes, plateau, sommets
 *   3. Rivières : elles suivent les creux
 *   4-6. Marché, croissance de la ville, enceintes successives (enveloppes convexes)
 *   7-9. Citadelle, portes, grandes routes et ponts
 *   10-11. Bâtiments importants et quartiers, chacun placé selon une règle
 *   12-14. Parcellaire fin : îlots irréguliers, rues, ruelles, maisons sur rue, cours et jardins
 *   15. Noms (rues, routes, auberges), portes d'eau, brèches
 */

// ---------- la ville ----------

function generateCity(opts) {
  const size = SIZES[opts.size] || SIZES.moyenne;
  const wanted = opts.buildings || DEFAULT_BUILDINGS;
  const customNames = opts.names || [];
  // Un tirage par élément : ajouter une rivière ou un bâtiment ne déplace pas le reste
  const rng = tag => mulberry32(seedHash(opts.seed + '|' + tag));
  const lang = opts.lang === 'fr' ? 'fr' : 'en';
  const X = textFor(lang);   // tous les noms et textes dans la langue choisie (i18n.js)
  const autoName = townName(rng('nom'), X);
  // Quantités choisies par l'utilisateur (null = au hasard)
  const num = (v, lo, hi) => (v === null || v === undefined || v === '' || isNaN(+v) ? null : Math.max(lo, Math.min(hi, Math.round(+v))));
  const want = {
    hills: num(opts.nHills, 0, 10), rivers: num(opts.nRivers, 0, 3), gates: num(opts.nGates, 2, 8), rings: num(opts.nRings, 1, 3),
    districts: num(opts.nDistricts, 2, 12), ledges: num(opts.nLedges, 0, 3), squares: num(opts.nSquares, 0, 8),
    churches: num(opts.nChurches, 0, 12), inns: num(opts.nInns, 0, 10), islands: num(opts.nIslands, 0, 3), canals: num(opts.nCanals, 0, 3),
    forest: num(opts.forest, 0, 100),
  };
  // Options de structure : plan (organique / bastide), enceinte (simple / double), ville haute + ville basse
  const rOpt = rng('structure|' + opts.size);
  const optRolls = [rOpt(), rOpt(), rOpt()];
  const bastide = opts.plan === 'bastide' || (opts.plan === 'auto' && optRolls[0] < 0.12);
  const big = opts.size === 'grande' || opts.size === 'capitale' || opts.size === 'metropole';
  const doubleWall = opts.walls === 'double' || (opts.walls === 'auto' && big && optRolls[1] < 0.35);
  const twin = !bastide && (opts.twin === 'oui' || (opts.twin === 'auto' && ['colline', 'collines'].includes(opts.relief) && optRolls[2] < 0.3));
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
  const reliefFromHills = want.hills === null ? null : want.hills === 0 ? 'plaine' : want.hills === 1 ? 'colline' : 'collines';
  const relief = twin && !['colline', 'collines'].includes(opts.relief) && !(want.hills > 0) ? 'colline'
    : opts.relief === 'vallee' ? 'vallee'
    : reliefFromHills && !(twin && want.hills === 0) ? reliefFromHills
    : ['plaine', 'colline', 'collines', 'vallee'].includes(opts.relief) ? opts.relief
    : reliefRoll < 0.28 ? 'plaine' : reliefRoll < 0.6 ? 'colline' : reliefRoll < 0.78 ? 'collines' : 'vallee';
  const hilly = relief === 'colline' || relief === 'collines';
  const ph = Array.from({ length: 8 }, () => rT() * Math.PI * 2);
  const hAng = rT() * Math.PI * 2, hDist = (0.45 + rT() * 0.35) * R;
  const hill = { c: [Math.cos(hAng) * hDist, Math.sin(hAng) * hDist], r0: (0.16 + rT() * 0.08) * R, band: (0.2 + rT() * 0.08) * R };
  const vAng = rT() * Math.PI, vOff = (rT() - 0.5) * 0.3 * R;
  const valley = { dir: [Math.cos(vAng), Math.sin(vAng)], off: vOff, a: (1.0 + rT() * 0.15) * R, band: 0.4 * R };
  // Formes de vallée : large, gorge étroite, confluence de deux vallées, méandre (la ville dans une boucle, comme Besançon)
  const VALLEY_TYPES = ['large', 'gorge', 'confluence', 'meandre'];
  const rV = rng('forme-vallee');
  valley.type = VALLEY_TYPES.includes(opts.valleyType) ? opts.valleyType : VALLEY_TYPES[Math.floor(rV() * VALLEY_TYPES.length)];
  {
    const d = valley.dir, n = [-d[1], d[0]], o = [n[0] * vOff, n[1] * vOff], far = 3 * E;
    const line = (p, q) => [p, q];
    valley.axes = [line([o[0] - d[0] * far, o[1] - d[1] * far], [o[0] + d[0] * far, o[1] + d[1] * far])];
    if (valley.type === 'gorge') { valley.a = (0.42 + rV() * 0.15) * R; valley.band = 0.16 * R; }
    if (valley.type === 'confluence') {
      valley.a = (0.7 + rV() * 0.15) * R; valley.band = 0.35 * R;
      const ang = vAng + (rV() < 0.5 ? 1 : -1) * (0.9 + rV() * 0.5);
      valley.axes.push(line(o, [o[0] + Math.cos(ang) * far, o[1] + Math.sin(ang) * far]));
    }
    if (valley.type === 'meandre') {
      // La rivière arrive, fait presque le tour d'un cœur rond (la ville) et repart près de son entrée : le cou
      const rm = (0.62 + rV() * 0.12) * R, neck = Math.atan2(-d[1], -d[0]), gap = 0.42;
      const loop = [];
      const entry = [Math.cos(neck - gap) * (rm + 0.1 * R), Math.sin(neck - gap) * (rm + 0.1 * R)];
      const exit = [Math.cos(neck + gap) * (rm + 0.1 * R), Math.sin(neck + gap) * (rm + 0.1 * R)];
      // Les couloirs d'arrivée et de départ s'écartent pour atteindre le bord de la carte loin l'un de l'autre
      const out1 = [Math.cos(neck - 0.75), Math.sin(neck - 0.75)], out2 = [Math.cos(neck + 0.75), Math.sin(neck + 0.75)];
      loop.push([entry[0] + out1[0] * far, entry[1] + out1[1] * far]);
      for (let i = 0; i <= 40; i++) { const t = neck - gap - (i / 40) * (2 * Math.PI - 2 * gap); loop.push([Math.cos(t) * rm, Math.sin(t) * rm]); }
      loop.push([exit[0] + out2[0] * far, exit[1] + out2[1] * far]);
      valley.axes = [loop];
      valley.a = 0.22 * R; valley.band = 0.3 * R; valley.core = rm; valley.neck = neck; valley.gap = gap;
    }
  }
  const polyDist = (p, pts) => { let m = Infinity; for (let i = 0; i + 1 < pts.length; i++) m = Math.min(m, Geo.distToSegment(p, pts[i], pts[i + 1])); return m; };
  if (twin) { hill.r0 *= 1.7; hill.band *= 0.9; }   // ville haute : un large plateau, comme à Provins
  const smoothstep = t => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));
  // Formes de collines tirées de sites réels : butte isolée (Vézelay), crête allongée (Nuremberg, Édimbourg),
  // éperon avancé d'un plateau (Provins, Laon, Langres), table aux flancs abrupts (Orvieto, Cordes),
  // colline dissymétrique (douce d'un côté, falaise de l'autre)
  const HILL_TYPES = ['butte', 'crete', 'eperon', 'table', 'dissymetrique'];
  const HILL_HEIGHT = { butte: [30, 75], crete: [40, 90], eperon: [35, 70], table: [25, 55], dissymetrique: [45, 110] };
  const shapeHill = (hl, rand, type) => {
    hl.type = type;
    hl.phi = rand() * Math.PI * 2; hl.ex = 1; hl.asym = 0; hl.asymDir = rand() * Math.PI * 2; hl.spur = false;
    if (type === 'butte') { hl.ex = 1 + rand() * 0.35; hl.asym = rand() * 0.25; }
    if (type === 'crete') { hl.ex = 2.2 + rand() * 1.2; hl.r0 *= 0.7; hl.band *= 0.9; }
    if (type === 'eperon') { hl.ex = 2.5 + rand() * 1; hl.r0 *= 0.75; hl.spur = true; hl.phi = Math.atan2(hl.c[1], hl.c[0]); }   // le plateau s'étend vers l'extérieur
    if (type === 'table') { hl.ex = 1.1 + rand() * 0.5; hl.r0 *= 1.25; hl.band *= 0.45; }
    if (type === 'dissymetrique') { hl.ex = 1.2 + rand() * 0.6; hl.asym = 0.65 + rand() * 0.15; }
    // Contour irrégulier : quelques harmoniques d'amplitude et de phase propres à chaque colline
    hl.harm = [2, 3, 4, 5, 6].map(k => [k, (rand() * 0.22) / (k - 1), rand() * Math.PI * 2]);
    return hl;
  };
  const rForm = rng('forme-colline');
  const mainType = HILL_TYPES.includes(opts.hillType) ? opts.hillType : HILL_TYPES[Math.floor(rForm() * HILL_TYPES.length)];
  // Collines : la principale (acropole) + pour "collines" 2 à 4 collines secondaires plus basses
  const hills = [shapeHill({ ...hill, h: 1 }, rForm, mainType)];
  if (relief === 'collines') {
    const rH = rng('collines');
    const wantHills = want.hills !== null ? want.hills - 1 : 2 + Math.floor(rH() * 3);
    const reach = hl => hl.r0 + hl.band;
    // Beaucoup de collines (jusqu'à 10, comme Rome ou Lisbonne) : chacune est plus petite pour qu'elles tiennent
    const shrink = Math.sqrt(4 / Math.max(4, wantHills + 1));
    for (let tries = 0; hills.length < wantHills + 1 && tries < 150 * (wantHills + 1); tries++) {
      const a = rH() * Math.PI * 2, d = (0.35 + rH() * (wantHills > 4 ? 1.1 : 0.9)) * R;
      const hl = { c: [Math.cos(a) * d, Math.sin(a) * d], r0: (0.08 + rH() * 0.06) * R * shrink, band: (0.15 + rH() * 0.08) * R * shrink, h: 0.4 + rH() * 0.5, ph: rH() * 6.28 };
      shapeHill(hl, rH, ['butte', 'crete', 'dissymetrique', 'table'][Math.floor(rH() * 4)]);
      if (Math.max(Math.abs(hl.c[0]), Math.abs(hl.c[1])) > E - reach(hl)) continue;
      if (hills.some(o => dist(o.c, hl.c) < (reach(o) + reach(hl)) * 0.95)) continue;
      hills.push(hl);
    }
  }
  // Esplanades : la colline monte par paliers plats séparés par des ressauts (falaise ou mur de soutènement),
  // comme à Lyon, Édimbourg ou au bord de la ville haute de Provins
  const rL = rng('ressauts');
  const ledgeRoll = rL();
  const ledges = ['colline', 'collines'].includes(relief) && (want.ledges !== null ? want.ledges > 0 : opts.ledges === 'oui' || (opts.ledges === 'auto' && ledgeRoll < 0.5));
  if (ledges) hills.forEach((hl, k) => {
    const skip = rL(), mRoll = rL();
    if (want.ledges === null && k > 0 && skip < 0.5) return;
    const m = want.ledges !== null ? want.ledges : mRoll < 0.5 ? 1 : 2;
    // m ressauts régulièrement répartis sur la pente, avec un peu d'irrégularité
    hl.steps = Array.from({ length: m }, (_, i) => 0.2 + ((i + 0.5) * 0.6) / m + (rL() - 0.5) * (0.25 / m));
  });
  const LEDGE_W = 0.045;   // largeur du ressaut, en fraction de la pente de la colline (quelques mètres)
  // Repère propre à la colline : tourné, étiré (crête, éperon), et pour un éperon le plateau continue vers l'extérieur
  const hillWob = (hl, te) => 1 + hl.harm.reduce((acc, [k, a, p]) => acc + a * Math.sin(k * te + p), 0);
  const spurLedgeEnd = hl => hl.r0 * 0.9, spurLedgeFade = hl => hl.r0 * 0.9;
  const hillBand = (hl, te) => hl.band * (1 - hl.asym * Math.cos(te - hl.asymDir));   // côté raide = pente courte
  const hillLocal = (hl, x, y) => {
    const dx = x - hl.c[0], dy = y - hl.c[1], cp = Math.cos(hl.phi), sp = Math.sin(hl.phi);
    let xr = dx * cp + dy * sp;
    let yr = -dx * sp + dy * cp;
    const along = xr;
    if (hl.spur && xr > 0) { yr /= 1 + xr / (hl.r0 * 1.5); xr = 0; }   // l'éperon s'élargit en rejoignant le plateau
    const xe = xr / hl.ex;
    return { de: Math.hypot(xe, yr), te: Math.atan2(yr, xe), along };
  };
  const fromLocal = (hl, xe, ye) => {
    const xr = xe * hl.ex, cp = Math.cos(hl.phi), sp = Math.sin(hl.phi);
    return [hl.c[0] + xr * cp - ye * sp, hl.c[1] + xr * sp + ye * cp];
  };
  const hillHeight = (k, x, y) => {
    const hl = hills[k];
    const { de, te, along } = hillLocal(hl, x, y);
    const wob = hillWob(hl, te);
    const u = (de - hl.r0 * wob) / (hillBand(hl, te) * wob);
    if (!hl.steps) return hl.h * (1 - smoothstep(u));
    // Paliers : 20 % de pente douce + 80 % répartis en ressauts presque verticaux
    let p = 0.2 * (1 - smoothstep(u));
    for (const uk of hl.steps) p += (0.8 / hl.steps.length) * (1 - smoothstep((u - uk) / LEDGE_W + 0.5));
    // Éperon : les ressauts bordent la pointe puis s'effacent le long du plateau (sinon des falaises sans fin)
    if (hl.spur && along > spurLedgeEnd(hl)) {
      const w = smoothstep((along - spurLedgeEnd(hl)) / spurLedgeFade(hl));
      p = p * (1 - w) + (1 - smoothstep(u)) * w;
    }
    return hl.h * p;
  };
  const elev = (x, y) => {
    let h = 0.03 * (Math.sin(x / 97 + ph[0]) + Math.sin(y / 131 + ph[1]) + Math.sin((x + y) / 173 + ph[2])) / 3;
    if (hilly) {
      let m = 0;
      for (let k = 0; k < hills.length; k++) m = Math.max(m, hillHeight(k, x, y));
      h += m;
    } else if (relief === 'vallee') {
      const { dir, a, band } = valley;
      const along = dir[0] * x + dir[1] * y;
      const aw = a + (valley.type === 'meandre' ? 0 : 0.12 * R * Math.sin(along / (0.45 * R) + ph[5]));
      let dLow = Math.min(...valley.axes.map(ax => polyDist([x, y], ax)));
      if (valley.core) {
        // Méandre : le cœur rond est bas aussi, mais légèrement bombé pour que la rivière en fasse le tour
        const r = Math.hypot(x, y);
        if (r < valley.core) { dLow = 0; h += 0.3 * (1 - (r / valley.core) ** 4); }   // plat au centre, berge raide au bord
        // Le cou : une crête de terre haute entre l'arrivée et le départ de la rivière (le rocher de la citadelle à Besançon)
        let da = Math.atan2(y, x) - valley.neck; da = Math.atan2(Math.sin(da), Math.cos(da));
        if (Math.abs(da) < valley.gap * 0.8 && r > valley.core * 0.9 && r < valley.core + 0.7 * R) dLow = Math.max(dLow, valley.a + valley.band * (1 - Math.abs(da) / (valley.gap * 0.8)));
      }
      h += smoothstep((dLow - aw) / band);
    }
    return h;
  };
  const slope = (x, y) => Math.hypot(elev(x + 3, y) - elev(x - 3, y), elev(x, y + 3) - elev(x, y - 3)) / 6;
  // Altitudes réelles : la colline (ou les versants) mesure quelques dizaines de mètres ; la plaine est presque plate
  const rAlt = rng('altitude');
  const baseAlt = Math.round(60 + rAlt() * 180);
  const hRange = HILL_HEIGHT[mainType], hRoll = rAlt();
  const VALLEY_HEIGHT = { large: [55, 85], gorge: [80, 130], confluence: [50, 80], meandre: [60, 100] };
  const vRange = VALLEY_HEIGHT[valley.type];
  const reliefHeight = relief === 'plaine' ? 6 : relief === 'vallee' ? vRange[0] + hRoll * (vRange[1] - vRange[0]) : hRange[0] + hRoll * (hRange[1] - hRange[0]);
  const altitude = (x, y) => baseAlt + elev(x, y) * reliefHeight;              // en mètres
  const slopePct = (x, y) => slope(x, y) * reliefHeight * 100;                 // pente en %
  const gradient = (x, y) => [elev(x + 3, y) - elev(x - 3, y), elev(x, y + 3) - elev(x, y - 3)];
  // Seuils (urbanisme médiéval réel) : on bâtit jusqu'à ~15 %, en terrasses et clairsemé jusqu'à 25 %, rien au-delà
  const SLOPE_EASY = 15, SLOPE_MAX = 25;

  // Lignes de ressaut (haut de la falaise) et index de leurs segments pour tester les maisons
  const cliffs = [];
  hills.forEach((hl, k) => (hl.steps || []).forEach(uk => {
    const pts = [];
    const dAt = te => { const wob = hillWob(hl, te); return hl.r0 * wob + (uk - LEDGE_W / 2) * hillBand(hl, te) * wob; };
    if (hl.spur) {
      // Éperon : la falaise borde les deux flancs et la pointe, et file vers le plateau
      const d1 = dAt(Math.PI / 2), d2 = dAt(-Math.PI / 2);
      const widen = x => 1 + x / (hl.r0 * 1.5);
      const outer = (x, d) => { const cp = Math.cos(hl.phi), sp = Math.sin(hl.phi), y = d * widen(x); return [hl.c[0] + x * cp - y * sp, hl.c[1] + x * sp + y * cp]; };
      const xEnd = spurLedgeEnd(hl) + spurLedgeFade(hl) * 0.5;   // là où le ressaut s'est effacé de moitié
      for (let x = xEnd; x > 0; x -= 10) pts.push(outer(x, d1));
      for (let i = 0; i <= 60; i++) { const te = Math.PI / 2 + (i / 60) * Math.PI, d = dAt(te); pts.push(fromLocal(hl, Math.cos(te) * d, Math.sin(te) * d)); }
      for (let x = 0; x <= xEnd; x += 10) pts.push(outer(x, d2));
    } else {
      for (let i = 0; i <= 120; i++) { const te = (i / 120) * Math.PI * 2, d = dAt(te); pts.push(fromLocal(hl, Math.cos(te) * d, Math.sin(te) * d)); }
    }
    cliffs.push({ points: pts, hill: k, center: hl.c, drop: Math.round((0.8 / hl.steps.length) * hl.h * reliefHeight) });
  }));
  const cliffSegs = cliffs.flatMap(cl => cl.points.slice(1).map((p, i) => [cl.points[i], p]));
  const segX = (a, b, c, d) => {
    const d1 = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]), d2 = (b[0] - a[0]) * (d[1] - a[1]) - (b[1] - a[1]) * (d[0] - a[0]);
    const d3 = (d[0] - c[0]) * (a[1] - c[1]) - (d[1] - c[1]) * (a[0] - c[0]), d4 = (d[0] - c[0]) * (b[1] - c[1]) - (d[1] - c[1]) * (b[0] - c[0]);
    return d1 * d2 < 0 && d3 * d4 < 0;
  };
  // Un polygone (maison) chevauche-t-il un ressaut ? (le bord de la falaise passe à travers, ou à moins de 2 m)
  const onCliff = poly => {
    if (!cliffSegs.length) return false;
    const xs = poly.map(p => p[0]), ys = poly.map(p => p[1]);
    const x0 = Math.min(...xs) - 4, x1 = Math.max(...xs) + 4, y0 = Math.min(...ys) - 4, y1 = Math.max(...ys) + 4;
    for (const [a, b] of cliffSegs) {
      if (Math.max(a[0], b[0]) < x0 || Math.min(a[0], b[0]) > x1 || Math.max(a[1], b[1]) < y0 || Math.min(a[1], b[1]) > y1) continue;
      for (let i = 0; i < poly.length; i++) if (segX(poly[i], poly[(i + 1) % poly.length], a, b)) return true;
      const c = Geo.centroid(poly);
      if (Geo.distToSegment(c, a, b) < 3) return true;
    }
    return false;
  };
  // Pente "raide" : plus de 40 % de la pente maximale du relief
  // Un îlot est "raide" si sa pente dépasse 25 % en son centre ou en son point d'origine
  cells.forEach(c => {
    const ctr = Geo.centroid(c.ids.map(id => verts[id]));
    c.elev = elev(...c.site);
    c.slope = Math.max(slopePct(...c.site), slopePct(...ctr));
    c.steep = c.slope > SLOPE_MAX;
    c.top = hilly && !c.steep && hillHeight(0, ...c.site) > 0.8;   // plateau de la colline principale
  });

  // Sommets secondaires : un petit sanctuaire porte le nom de la colline
  const HILL_NAMES = X.hills;
  const hillNames = [];
  {
    const rHN = rng('noms-collines');
    const pool = HILL_NAMES.slice();
    for (let k = 1; k < hills.length; k++) {
      const name = pool.splice(Math.floor(rHN() * pool.length), 1)[0];
      const top = cells.filter(c => !c.ids.some(id => Math.max(Math.abs(verts[id][0]), Math.abs(verts[id][1])) > E - 0.5))
        .reduce((m, c) => (!m || hillHeight(k, ...c.site) > hillHeight(k, ...m.site) ? c : m), null);
      if (top && hillHeight(k, ...top.site) > hills[k].h * 0.5) {
        top.building = { id: 'sanctuaire', label: name };
        hillNames.push({ name, at: hills[k].c });
      }
    }
  }

  // ================= 3. Rivières : elles suivent les creux =================
  const entries = new Set();
  for (const key of edgeCells.keys()) {
    const [a, b] = unkey(key);
    if (isBorder(a) !== isBorder(b)) entries.add(isBorder(a) ? a : b);
  }
  const nearestEntry = T => [...entries].reduce((m, v) => (m < 0 || dist(verts[v], T) < dist(verts[m], T) ? v : m), -1);

  const rR = rng('rivieres');
  const autoCount = rR();
  let count = want.rivers !== null ? want.rivers : opts.river === 'non' ? 0 : opts.river === 'oui' ? 1 : opts.river === 'deux' ? 2
    : autoCount < 0.4 ? 0 : autoCount < 0.85 ? 1 : 2;
  // Une vallée a sa rivière ; un méandre ou une confluence n'existent que par elle
  if (relief === 'vallee' && opts.river !== 'non' && want.rivers !== 0) count = Math.max(count, valley.type === 'confluence' ? 2 : 1);
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
      let c = dist(A, B) * wiggle.get(key) * (1 + 30 * h);   // l'eau évite de monter
      // Méandre : la rivière suit la boucle (elle a creusé la vallée autour du cœur)
      if (relief === 'vallee' && valley.type === 'meandre' && !exclude.size) {
        const m = [(A[0] + B[0]) / 2, (A[1] + B[1]) / 2];
        c *= 1 + (polyDist(m, valley.axes[0]) / (0.08 * R)) ** 2;
        if (Math.hypot(m[0], m[1]) < valley.core * 0.85) c *= 40;   // jamais à travers le cœur du méandre
      }
      link(adj, a, b, c);
    }
    return adj;
  };
  const rivers = [];
  if (count >= 1) {
    const dir = [Math.cos(a0), Math.sin(a0)], P0 = [-dir[1] * off0, dir[0] * off0];
    let from = nearestEntry([P0[0] - dir[0] * 2 * E, P0[1] - dir[1] * 2 * E]);
    let to = nearestEntry([P0[0] + dir[0] * 2 * E, P0[1] + dir[1] * 2 * E]);
    if (relief === 'vallee') { const ax = valley.axes[0]; from = nearestEntry(ax[0]); to = nearestEntry(ax[ax.length - 1]); }
    const sp = shortestPaths(riverGraph(new Set()), verts.length, [to]);
    if (from !== to && isFinite(sp.dist[from])) rivers.push({ path: tracePath(sp.prev, from), w: 14 + N * 0.15 });
  }
  // Affluents : chacun arrive d'un autre côté et se jette dans la rivière principale
  for (let t = 1; t < count && rivers.length; t++) {
    const main = rivers[0].path;
    const mainKeys = new Set(rivers.flatMap(rv => rv.path.slice(1).map((v, k) => ek(rv.path[k], v))));
    const at = t === 1 ? a1 : a0 - (a1 - a0) + (rR() - 0.5) * 0.4, ot = t === 1 ? off1 : -off1;
    const dir = [Math.cos(at), Math.sin(at)], P1 = [-dir[1] * ot, dir[0] * ot];
    const from = t === 1 && relief === 'vallee' && valley.axes[1] ? nearestEntry(valley.axes[1][1]) : nearestEntry([P1[0] - dir[0] * 2 * E, P1[1] - dir[1] * 2 * E]);
    if (rivers.some(rv => rv.path.includes(from))) continue;
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
  const flat = c => !c.steep && !c.top && !c.building && !touchesBorder(c);
  const onUpperHill = c => twin && hillHeight(0, ...c.site) > 0.2;
  const plaza = cells.filter(c => flat(c) && !touchesRiver(c) && !onUpperHill(c))
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
  const age = want.rings || { jeune: 1, ancienne: 2, tresancienne: 3 }[opts.age] || (bastide ? 1 : 0)
    || (ageRoll < 0.3 ? 1 : ageRoll < (['capitale', 'grande', 'metropole'].includes(opts.size) ? 0.55 : 0.75) ? 2 : 3);
  const fractions = age === 1 ? [1] : age === 2 ? [0.45, 1] : [0.25, 0.55, 1];
  // Une enceinte prend le tracé le plus court à défendre : l'enveloppe convexe de la zone bâtie.
  // Les pentes et collines enfermées restent à l'intérieur (vignes, terrasses), comme à Athènes ou Rome.
  const convexify = set => {
    const pts = [...set].map(ci => cells[ci].site).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    if (pts.length < 3) return set;
    const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
    const lower = [], upper = [];
    for (const p of pts) { while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop(); lower.push(p); }
    for (const p of pts.slice().reverse()) { while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop(); upper.push(p); }
    const hull = lower.slice(0, -1).concat(upper.slice(0, -1));
    const inHull = q => hull.every((a, i) => cross(a, hull[(i + 1) % hull.length], q) >= -1e-6);
    cells.forEach(c => { if (!touchesBorder(c) && inHull(c.site)) set.add(c.index); });
    return fillHoles(set);
  };
  const withoutHill = set => {
    if (!twin) return set;
    for (const ci of [...set]) if (onUpperHill(cells[ci])) set.delete(ci);
    return set;
  };
  const ringSets = fractions.map(f => withoutHill(convexify(takeFlat(Math.max(2, Math.round(N * f))))));
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
  let wall = loopOf(boundary(innerSet));
  let wallEdges = new Set(wall.map((a, k) => ek(a, wall[(k + 1) % wall.length])));

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
  let citadelSet = new Set(cells.filter(c => (c.top || (twin && !c.steep && hillHeight(0, ...c.site) > 0.6)) && !touchesBorder(c)).map(c => c.index));
  if (hilly && !citadelSet.size) {
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
  // Une citadelle reste petite : sur un éperon ou une crête, le plateau peut être immense ; on garde seulement
  // le bout du sommet (les îlots les plus proches du centre de la colline, d'un seul tenant)
  const citadelCap = twin ? Math.ceil(N * 0.35) : Math.max(2, Math.ceil(N * 0.1));
  if (citadelSet.size > citadelCap) {
    const dc = ci => dist(cells[ci].site, hills[0].c);
    const seed0 = [...citadelSet].reduce((m, ci) => (m < 0 || dc(ci) < dc(m) ? ci : m), -1);
    const keep = new Set([seed0]);
    while (keep.size < citadelCap) {
      let best = -1;
      for (const ci of keep) for (const nb of neighbours(cells[ci])) if (citadelSet.has(nb.index) && !keep.has(nb.index) && (best < 0 || dc(nb.index) < dc(best))) best = nb.index;
      if (best < 0) break;
      keep.add(best);
    }
    citadelSet = keep;
  }
  // Une citadelle à cheval sur l'enceinte n'existe pas : on l'inclut entière dans la ville (château intégré au rempart)
  if (!twin && citadelSet.size) {
    const inside = [...citadelSet].filter(ci => innerSet.has(ci)).length;
    if (inside > 0 && inside < citadelSet.size) {
      citadelSet.forEach(ci => innerSet.add(ci));
      fillHoles(innerSet);
      cells.forEach(c => { if (innerSet.has(c.index) && !c.inner) { c.inner = true; c.ring = ringSets.length - 1; } });
      wall = loopOf(boundary(innerSet));
      wallEdges = new Set(wall.map((a, k) => ek(a, wall[(k + 1) % wall.length])));
    }
  }
  cells.forEach(c => { c.citadel = citadelSet.has(c.index); });
  const citadelEdges = new Set(boundary(citadelSet).map(([a, b]) => ek(a, b)));

  // ================= 8. Portes =================
  // Porte possible : un sommet du rempart dont un seul îlot touche l'extérieur (angle rentrant)
  // ou l'intérieur (angle saillant) ; cet îlot sera coupé pour faire passer la route.
  const outsideOf = vid => (cellsAt.get(vid) || []).filter(c => !c.inner);
  const insideOf = vid => (cellsAt.get(vid) || []).filter(c => c.inner);
  const candidates = wall.filter(vid => (outsideOf(vid).length === 1 || insideOf(vid).length === 1)
    && !outsideOf(vid).some(c => c.steep) && riverDist(verts[vid]) > 20);
  const rG = rng('portes|' + opts.size);
  const gates = [];
  const base = rG() * Math.PI * 2;
  const nGates = want.gates || size.gates;
  for (let g = 0; g < nGates; g++) {
    const target = base + (g * Math.PI * 2) / size.gates + (rG() - 0.5) * 0.5;
    let best = -1, bd = Infinity;
    for (const vid of candidates) {
      if (gates.some(o => dist(verts[o], verts[vid]) < cellR)) continue;
      const v = verts[vid];
      const da = Math.abs((((Math.atan2(v[1], v[0]) - target) % (2 * Math.PI)) + 3 * Math.PI) % (2 * Math.PI) - Math.PI);
      if (da < bd) { bd = da; best = vid; }
    }
    if (best >= 0 && bd < Math.PI / nGates) gates.push(best);
  }
  // Second passage si la ville manque de portes (versants raides partout) : on accepte une porte
  // face à une pente, la route la contournera
  if (gates.length < 2) {
    const loose = wall.filter(vid => (outsideOf(vid).length === 1 || insideOf(vid).length === 1) && riverDist(verts[vid]) > 20);
    while (gates.length < 2) {
      const far = loose.filter(v => !gates.includes(v))
        .map(v => [v, gates.length ? Math.min(...gates.map(g => dist(verts[g], verts[v]))) : -dist(verts[v], [0, 0])])
        .sort((x, y) => y[1] - x[1])[0];
      if (!far) break;
      gates.push(far[0]);
    }
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
    for (const side of [outsideOf(g), insideOf(g)]) {
      if (side.length !== 1 || side[0].type === 'plaza' || side[0].citadel) continue;
      const far = farOf(side[0], g);
      if (far >= 0) splitAt(side[0], g, far);
    }
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
  const roads = [], roadMeta = [];
  const exits = [...entries];
  for (const [gi, g] of gates.entries()) {
    roads.push(tracePath(fromPlaza.prev, g)); roadMeta.push({ kind: 'inner', gate: gi });
    const out = shortestPaths(outerAdj, verts.length, [g]);
    const gv = verts[g], gl = Math.hypot(gv[0], gv[1]) || 1;
    const T = [(gv[0] / gl) * E * 1.4, (gv[1] / gl) * E * 1.4];
    let best = -1, bd = Infinity;
    for (const v of exits) {
      if (!isFinite(out.dist[v])) continue;
      const d = dist(verts[v], T) + out.dist[v] * 0.3;
      if (d < bd) { bd = d; best = v; }
    }
    if (best >= 0) { roads.push(tracePath(out.prev, best).reverse()); roadMeta.push({ kind: 'outer', gate: gi }); }
  }
  // Route du marché à la citadelle (elle grimpe la pente)
  let citadelGate = -1;
  if (citadelSet.size) {
    const sp = shortestPaths(allAdj, verts.length, plaza.ids);
    const rim = new Set(boundary(citadelSet).map(([a]) => a));
    for (const v of rim) if (isFinite(sp.dist[v]) && (citadelGate < 0 || sp.dist[v] < sp.dist[citadelGate])) citadelGate = v;
    if (citadelGate >= 0) { roads.push(tracePath(sp.prev, citadelGate)); roadMeta.push({ kind: 'citadel' }); }
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
    temple:     { pool: c => freeInner(c) && c.ring === 0, score: dPlaza, why: X.why.oldTown },
    chateau:    citadelSet.size
      ? { pool: citadelFree, score: c => -c.elev, why: '' }
      : { pool: c => freeInner(c) && touches(c, wallEdges), score: c => (rivers.length ? Math.max(0, riverDist(c.site)) : -gateDist(c)), why: X.why.wall },
    palais:     { pool: c => (citadelSet.size > 1 ? citadelFree(c) : freeInner(c) && c.ring <= 1), score: dPlaza, why: X.why.room },
    guildes:    { pool: c => freeInner(c) && c.ring === 0, score: dPlaza, why: X.why.oldTown },
    universite: { pool: c => freeInner(c) && c.ring === Math.min(1, lastRing), score: dPlaza, why: X.why.room },
    caserne:    { pool: c => freeInner(c) && touches(c, wallEdges), score: gateDist, why: X.why.gate },
    prison:     { pool: c => (citadelSet.size > 1 ? citadelFree(c) : freeInner(c) && touches(c, wallEdges)), score: c => -dPlaza(c), why: X.why.room },
    hospice:    { pool: c => freeInner(c) && c.ring === lastRing, score: gateDist, why: X.why.gate },
    bains:      { pool: c => freeInner(c) && (!rivers.length || touchesRiver(c)), score: dPlaza, why: rivers.length ? X.why.bank : X.why.room },
    arene:      { pool: c => (freeInner(c) && c.ring === lastRing) || (freeOuter(c) && touches(c, roadEdges)), score: c => Math.abs(dC(c) - R), why: X.why.room },
    cimetiere:  { pool: c => freeOuter(c) && touches(c, roadEdges) && dC(c) < 1.5 * R, score: dC, why: X.why.outside },
    port:       rivers.length
      ? { pool: c => freeInner(c) && touchesRiver(c), score: c => -downOf(c), why: X.why.freeBank }
      : { pool: () => false, score: () => 0, why: X.why.noRiver },
    monastere:  { pool: c => freeOuter(c) && dC(c) > 1.1 * R && dC(c) < 1.6 * R, score: c => -neighbours(c).filter(n => n.steep).length * 100 - (rivers.length && touchesRiver(c) ? 80 : 0), why: X.why.outside },
    moulin:     rivers.length
      ? { pool: c => freeOuter(c) && touchesRiver(c), score: c => -downOf(c) * 0 + dC(c), why: X.why.freeBank }
      : { pool: c => freeOuter(c) && dC(c) < 1.6 * R, score: c => -c.elev * 1000 + dC(c) * 0.1, why: X.why.room },
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
    if (best) best.building = { ...b, label: X.buildings[b.id] }; else missing.push(X.buildings[b.id] + (rule.why ? ' (' + rule.why + ')' : ''));
  }

  // ================= 11. Quartiers (chacun dans une seule enceinte) =================
  const rD = rng('quartiers|' + opts.size);
  const town = cells.filter(c => c.inner && !c.citadel);
  const K = Math.min(want.districts || size.districts, town.length);
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
  const compassOf = p => X.compass[((Math.round(Math.atan2(p[1], p[0]) / (Math.PI / 4)) % 8) + 8) % 8];
  const riverDistricts = districts.map((d, k) => ({ k, down: Math.max(-1, ...d.cells.map(downOf)) })).filter(x => x.down >= 0).sort((a, b) => b.down - a.down);
  districts.forEach((d, k) => {
    const has = id => d.cells.some(c => (c.building && c.building.id === id) || c.type === id);
    const gateCell = d.cells.find(c => c.ids.some(id => gates.includes(id)));
    const nearHill = citadelSet.size && d.cells.some(c => neighbours(c).some(n => n.steep));
    let auto = null;
    const D = X.districts;
    if (has('plaza')) auto = fixed(D.oldTown);
    if (!auto && d.ring === 0 && has('temple')) auto = fixed(D.cathedral);
    if (!auto && d.ring === 0) auto = take(D.oldCore);
    if (!auto && has('port')) auto = fixed(D.quays);
    if (!auto && riverDistricts.length && riverDistricts[0].k === k) auto = fixed(D.tanners); // en aval : ça sent
    if (!auto && riverDistricts.length > 1 && riverDistricts[riverDistricts.length - 1].k === k) auto = fixed(D.millers);
    if (!auto && has('universite')) auto = fixed(D.schools);
    if (!auto && nearHill) auto = take(D.belowCastle);
    if (!auto && d.ring === lastRing && lastRing > 0 && rN() < 0.5) auto = take(D.newTown);
    if (!auto && gateCell && rN() < 0.5) auto = fixed(X.gateQuarter(compassOf(gateCell.site)));
    if (!auto) auto = take(D.trades) || D.fallback(k + 1);
    d.auto = auto;
    d.name = (customNames[k] || '').trim() || auto;
    const mid = [d.cells.reduce((s, c) => s + c.site[0], 0) / d.cells.length, d.cells.reduce((s, c) => s + c.site[1], 0) / d.cells.length];
    const plain = d.cells.filter(c => !c.type && !c.building && !c.steep);
    d.labelCell = (plain.length ? plain : d.cells).reduce((m, c) => (dist(c.site, mid) < dist(m.site, mid) ? c : m));
  });

  // Fossé : un anneau autour du rempart principal. En eau en plaine ou près d'une rivière, à sec sur les hauteurs.
  const moat = { water: relief === 'plaine' || relief === 'vallee' || rivers.length > 0, width: 11 + N * 0.12 };
  // Double enceinte (Carcassonne) : un mur extérieur plus bas, séparé du rempart par les lices
  moat.lices = doubleWall ? 14 : 0;
  moat.outer = 3.5 + (doubleWall ? moat.lices + 2.5 : 0) + 3 + moat.width;    // distance du rempart au bord extérieur du fossé
  // L'eau ne monte pas : le fossé n'est en eau que sur les tronçons bas du rempart, à sec ailleurs
  {
    const W = wall.map(id => verts[id]);
    const alts = W.map(p => altitude(...p)), low = Math.min(...alts);
    moat.segs = W.map((p, i) => {
      const q = W[(i + 1) % W.length], m = [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
      return { a: p, b: q, water: moat.water && altitude(...m) - low < 4 };
    });
  }

  // ================= 13. Les rues d'abord =================
  // Comme dans une vraie ville : les chemins existent avant les maisons. Les grandes rues sont les chemins
  // les moins pénibles sur le terrain (portes → marché), les rues secondaires poussent depuis elles,
  // et les maisons s'alignent le long des rues. Les îlots sont simplement ce qui reste entre les rues.
  // (outils géométriques : voir geo.js)

  const zoneOf = c => {
    if (!c) return 'faubourg';
    if (c.citadel) return twin ? 'vieille' : 'citadelle';   // une ville haute est une vraie ville, dense et en pierre
    if (!c.inner) return 'faubourg';
    if (age === 1) return 'bourg';
    if (c.ring === 0) return 'vieille';
    return c.ring === lastRing ? 'neuf' : 'bourg';
  };

  // --- Domaines : la ville (intra-muros) et la ville haute / citadelle ---
  const wallPoly = wall.map(id => verts[id]);
  const citadelPoly = citadelSet.size ? loopOf(boundary(citadelSet)).map(id => verts[id]) : null;
  const inCitadel = p => !!citadelPoly && inPoly(citadelPoly, p);
  const inTown = p => inPoly(wallPoly, p) && !inCitadel(p);
  const domainAt = p => (inCitadel(p) ? 'cit' : inPoly(wallPoly, p) ? 'town' : 'out');
  const cellCache = new Map();
  const cellAt = p => {
    const key = Math.round(p[0] / 6) + ',' + Math.round(p[1] / 6);
    if (cellCache.has(key)) return cellCache.get(key);
    const c = cellAtRaw(p);
    cellCache.set(key, c);
    return c;
  };
  const cellAtRaw = p => {
    const near = cells.map(c => [c, dist(c.site, p)]).sort((a, b) => a[1] - b[1]).slice(0, 8);
    for (const [c] of near) if (c.ids.length >= 3 && inside(c.ids.map(id => verts[id]), p)) return c;
    return near[0][0];
  };

  // --- Réserves : zones où l'on ne trace pas de rue et ne bâtit pas de maison ---
  const reserves = [];
  const inReserve = p => reserves.some(r => inPoly(r.poly, p));
  const reserveOf = p => reserves.find(r => inPoly(r.poly, p));

  // Bastide : le damier, centré sur la place
  const rB = rng('bastide|' + opts.size);
  const lat = { th: rB() * Math.PI, a: between(rB, [30, 38]), b: between(rB, [55, 72]) };
  lat.u = [Math.cos(lat.th), Math.sin(lat.th)]; lat.v = [-lat.u[1], lat.u[0]];
  lat.o = [plaza.site[0] - lat.u[0] * lat.a / 2 - lat.v[0] * lat.b / 2, plaza.site[1] - lat.u[1] * lat.a / 2 - lat.v[1] * lat.b / 2];
  const latPoint = (x, y) => [lat.o[0] + lat.u[0] * x * lat.a + lat.v[0] * y * lat.b, lat.o[1] + lat.u[1] * x * lat.a + lat.v[1] * y * lat.b];

  // Place du marché : un quadrilatère irrégulier orienté vers la porte principale (rectangle exact dans une bastide)
  const rMk = rng('marche|' + opts.size);
  let marketPoly;
  if (bastide) marketPoly = [latPoint(0, 0), latPoint(1, 0), latPoint(1, 1), latPoint(0, 1)];
  else {
    const g0 = gates.length ? verts[gates[0]] : [plaza.site[0] + 1, plaza.site[1]];
    const ax = norm([g0[0] - plaza.site[0], g0[1] - plaza.site[1]]);
    const w = 30 + N * 0.35, h = w * between(rMk, [1.15, 1.5]);
    marketPoly = rect(plaza.site, ax, h, w).map(p => [p[0] + (rMk() - 0.5) * 8, p[1] + (rMk() - 0.5) * 8]);
  }
  reserves.push({ poly: marketPoly, kind: 'market', frontage: true });
  // Enclos des monuments (cathédrale, château…) : autour de leur emplacement, dans la ville
  // Chaque enclos est un rectangle à la taille du bâtiment, tourné vers la place (plus de forme de cellule)
  const PRECINCT = { temple: [70, 46], chateau: [64, 64], palais: [52, 40], guildes: [38, 26], universite: [54, 42], caserne: [52, 36],
    prison: [32, 30], hospice: [46, 36], bains: [32, 26], arene: [64, 56], cimetiere: [56, 42], port: [64, 30], monastere: [72, 56],
    moulin: [26, 26], sanctuaire: [34, 26] };
  const sizeK = { petite: 0.85, moyenne: 1, grande: 1.08, capitale: 1.15, metropole: 1.2 }[opts.size] || 1;
  const precinctOf = new Map();
  for (const c of cells) {
    if (!c.building) continue;
    const [L0, W0] = PRECINCT[c.building.id] || [40, 30];
    let ax = norm([plaza.site[1] - c.site[1], c.site[0] - plaza.site[0]]);   // façade face à la place
    if (c.building.id === 'port' && rivers.length) {
      let best = null, bd = Infinity;
      for (const rv of rivers) for (let k = 0; k + 1 < rv.path.length; k++) { const a = verts[rv.path[k]], b = verts[rv.path[k + 1]], d = Geo.distToSegment(c.site, a, b); if (d < bd) { bd = d; best = norm([b[0] - a[0], b[1] - a[1]]); } }
      if (best) ax = best;
    }
    if (!isFinite(ax[0])) ax = [1, 0];
    const dom = c.citadel ? 'cit' : c.inner ? 'town' : 'out';
    let pr = null;
    for (let k = 1; k >= 0.55 && !pr; k -= 0.15) {
      const r0 = rect(c.site, ax, L0 * sizeK * k, W0 * sizeK * k);
      if (dom === 'out' || r0.every(q => domainAt(q) === dom)) pr = r0;
    }
    pr = pr || rect(c.site, ax, L0 * 0.5, W0 * 0.5);
    precinctOf.set(c.index, pr);
    if (c.inner || c.citadel) reserves.push({ poly: pr, kind: 'monument', frontage: false, cell: c });
  }

  // ================= 13a. Grandes rues : le chemin le moins pénible sur le terrain =================
  const GS = 5, GN = Math.ceil((2 * E) / GS);
  const gIdx = (i, j) => j * GN + i;
  const gPos = (i, j) => [-E + (i + 0.5) * GS, -E + (j + 0.5) * GS];
  const gCell = p => [Math.max(0, Math.min(GN - 1, Math.floor((p[0] + E) / GS))), Math.max(0, Math.min(GN - 1, Math.floor((p[1] + E) / GS)))];
  const gAlt = new Float32Array(GN * GN), gDom = new Uint8Array(GN * GN), gWater = new Uint8Array(GN * GN), gWall = new Uint8Array(GN * GN);
  const gCliff = new Uint8Array(GN * GN), gRes = new Uint8Array(GN * GN), gRoad = new Uint8Array(GN * GN), gGrid = new Uint8Array(GN * GN);
  const DOM = { out: 0, town: 1, cit: 2 };
  const wallSegs = wallPoly.map((p, i) => [p, wallPoly[(i + 1) % wallPoly.length]]);
  const citSegs = citadelPoly ? citadelPoly.map((p, i) => [p, citadelPoly[(i + 1) % citadelPoly.length]]) : [];
  const gatePts = gates.map(g => verts[g]);
  const citGatePt = citadelGate >= 0 ? verts[citadelGate] : null;
  // Murs et rivières "peints" sur la grille (rapide), sauf les ouvertures des portes
  const paint = (segList, radius, arr) => {
    for (const [a, b] of segList) {
      const L = dist(a, b), n = Math.max(1, Math.ceil(L / 2));
      for (let s2 = 0; s2 <= n; s2++) {
        const p = [a[0] + (b[0] - a[0]) * s2 / n, a[1] + (b[1] - a[1]) * s2 / n];
        const r = Math.ceil(radius / GS), [ci, cj] = gCell(p);
        for (let dj = -r; dj <= r; dj++) for (let di = -r; di <= r; di++) {
          const i2 = ci + di, j2 = cj + dj;
          if (i2 < 0 || j2 < 0 || i2 >= GN || j2 >= GN) continue;
          if (dist(gPos(i2, j2), p) <= radius) arr[gIdx(i2, j2)] = 1;
        }
      }
    }
  };
  paint([...wallSegs, ...citSegs], 6.5, gWall);   // assez large pour qu'un pas en diagonale ne saute pas le mur
  for (const g of [...gatePts, ...(citGatePt ? [citGatePt] : [])]) {
    const [ci, cj] = gCell(g);
    for (let dj = -3; dj <= 3; dj++) for (let di = -3; di <= 3; di++) { const i2 = ci + di, j2 = cj + dj; if (i2 >= 0 && j2 >= 0 && i2 < GN && j2 < GN && dist(gPos(i2, j2), g) < 11) gWall[gIdx(i2, j2)] = 0; }
  }
  rivers.forEach(rv => { const P = smooth(rv.path.map(id => verts[id]), 3); paint(P.slice(1).map((q, i) => [P[i], q]), rv.w / 2 + 1, gWater); });
  for (let j = 0; j < GN; j++) for (let i = 0; i < GN; i++) {
    const p = gPos(i, j), k = gIdx(i, j);
    gAlt[k] = altitude(...p);
    gDom[k] = DOM[domainAt(p)];
    if (reserves.some(r => r.kind === 'monument' && inPoly(r.poly, p))) gRes[k] = 1;
    if (bastide) {
      const x = ((p[0] - lat.o[0]) * lat.u[0] + (p[1] - lat.o[1]) * lat.u[1]) / lat.a, y = ((p[0] - lat.o[0]) * lat.v[0] + (p[1] - lat.o[1]) * lat.v[1]) / lat.b;
      const dx = Math.abs(x - Math.round(x)) * lat.a, dy = Math.abs(y - Math.round(y)) * lat.b;
      gGrid[k] = Math.min(dx, dy) < 3.5 ? 1 : 0;
    }
  }
  // Pente sur la grille (différences finies de l'altitude déjà calculée) : bien plus rapide que le relief analytique
  const gSlope = new Float32Array(GN * GN);
  for (let j = 0; j < GN; j++) for (let i = 0; i < GN; i++) {
    const a = gAlt[gIdx(Math.min(GN - 1, i + 1), j)] - gAlt[gIdx(Math.max(0, i - 1), j)];
    const b = gAlt[gIdx(i, Math.min(GN - 1, j + 1))] - gAlt[gIdx(i, Math.max(0, j - 1))];
    const sp = (Math.hypot(a, b) / (2 * GS)) * 100;
    gSlope[gIdx(i, j)] = sp;
    gCliff[gIdx(i, j)] = sp > 60 ? 1 : 0;
  }
  const slopeAt = p => { const [i, j] = gCell(p); return gSlope[gIdx(i, j)]; };
  // A* sur la grille : la pente est comptée le long du trajet (d'où les lacets sur les fortes pentes)
  const astar = (start, isGoal, allowed, heurTarget) => {
    const [si, sj] = gCell(start);
    const N2 = GN * GN, g = new Float32Array(N2).fill(Infinity), prev = new Int32Array(N2).fill(-1), closed = new Uint8Array(N2);
    const heap = [];
    const push = (k, f) => { heap.push([f, k]); let i = heap.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (heap[p][0] <= heap[i][0]) break; [heap[p], heap[i]] = [heap[i], heap[p]]; i = p; } };
    const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let i = 0; for (;;) { const l = 2 * i + 1, r = l + 1; let m = i; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === i) break; [heap[m], heap[i]] = [heap[i], heap[m]]; i = m; } } return top; };
    const h = k => (heurTarget ? dist(gPos(k % GN, Math.floor(k / GN)), heurTarget) * 0.9 : 0);
    const s0 = gIdx(si, sj);
    g[s0] = 0; push(s0, h(s0));
    const NB = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
    while (heap.length) {
      const [, k] = pop();
      if (closed[k]) continue;
      closed[k] = 1;
      const i = k % GN, j = Math.floor(k / GN);
      if (isGoal(k, i, j)) {
        const path = [];
        for (let c = k; c >= 0; c = prev[c]) path.push(gPos(c % GN, Math.floor(c / GN)));
        return path.reverse();
      }
      for (const [di, dj] of NB) {
        const ni = i + di, nj = j + dj;
        if (ni < 0 || nj < 0 || ni >= GN || nj >= GN) continue;
        const nk = gIdx(ni, nj);
        if (closed[nk] || !allowed(nk)) continue;
        const len = Math.hypot(di, dj) * GS, grade = Math.abs(gAlt[nk] - gAlt[k]) / len;
        let c = len * (1 + (grade / 0.07) ** 2);
        if (gWater[nk]) c += 35;                 // un pont coûte cher
        if (gCliff[nk]) c += 250;                // une falaise : presque jamais
        if (gRoad[nk]) c *= 0.4;                 // on rejoint volontiers une route existante
        if (bastide && gDom[nk] === DOM.town) c *= gGrid[nk] ? 0.35 : 3;   // bastide : on suit le damier
        const ng = g[k] + c;
        if (ng < g[nk]) { g[nk] = ng; prev[nk] = k; push(nk, ng + h(nk)); }
      }
    }
    return null;
  };
  const markRoad = pts => { for (const p of pts) { const [i, j] = gCell(p); gRoad[gIdx(i, j)] = 1; } };
  // Lissage d'un tracé, sauf s'il lui fait franchir un mur (on garde alors le tracé exact)
  const crossesWallAway = pts => pts.some((p, i) => i + 1 < pts.length && [...wallSegs, ...citSegs].some(([a, b2]) => segX(p, pts[i + 1], a, b2))
    && !gatePts.some(g => dist(g, p) < 22) && !(citGatePt && dist(citGatePt, p) < 22));
  const finishLine = pts => { const sm = smooth(simplify(pts, 2.2), 2); return crossesWallAway(sm) ? simplify(pts, 0.8) : sm; };
  const towardCenter = (p, d) => { const v = norm([plaza.site[0] - p[0], plaza.site[1] - p[1]]); return [p[0] + v[0] * d, p[1] + v[1] * d]; };

  const streets = [];   // { points, cls, kind, gate, coarse, deadEnd }
  const HALF = { main: 5, road: 4.5, boulevard: 4.5, quai: 3, rue: 3, ruelle: 1.8 };
  const marketGoal = k => inPoly(marketPoly, gPos(k % GN, Math.floor(k / GN)));
  // Routes des portes vers le marché
  gates.forEach((g, gi) => {
    const gp = verts[g], start = towardCenter(gp, 7);
    const path = astar(start, marketGoal, k => (gDom[k] === DOM.town || marketGoal(k)) && !gWall[k] && !gRes[k], plaza.site);
    if (!path) return;
    const pts = finishLine([gp, ...path]);
    markRoad(path);
    streets.push({ points: pts, cls: 'main', kind: 'inner', gate: gi });
  });
  // Montée vers la citadelle / la ville haute, puis jusqu'à son centre
  if (citGatePt) {
    const path = astar(marketPoly.reduce((a, p) => [a[0] + p[0] / 4, a[1] + p[1] / 4], [0, 0]), k => dist(gPos(k % GN, Math.floor(k / GN)), citGatePt) < 7,
      k => !gWall[k] && !gRes[k], citGatePt);   // si la citadelle est hors les murs, on sort par une porte de la ville
    if (path) {
      const pts = finishLine([...path, citGatePt]);
      markRoad(path);
      streets.push({ points: pts, cls: 'main', kind: 'citadel' });
      const cc = citadelPoly.reduce((a, p) => [a[0] + p[0] / citadelPoly.length, a[1] + p[1] / citadelPoly.length], [0, 0]);
      const inner = astar(citGatePt, k => dist(gPos(k % GN, Math.floor(k / GN)), cc) < 10, k => gDom[k] === DOM.cit && !gRes[k], cc);
      if (inner && inner.length > 3) streets.push({ points: finishLine([citGatePt, ...inner]), cls: 'main', kind: 'citadel-inner' });
    }
  }
  // Routes vers les villes voisines
  gates.forEach((g, gi) => {
    const gp = verts[g], l = Math.hypot(gp[0], gp[1]) || 1, start = [gp[0] + (gp[0] / l) * 7, gp[1] + (gp[1] / l) * 7];
    const target = [(gp[0] / l) * E * 1.5, (gp[1] / l) * E * 1.5];
    const path = astar(start, (k, i, j) => i === 0 || j === 0 || i === GN - 1 || j === GN - 1, k => gDom[k] === DOM.out && !gWall[k], target);
    if (!path) return;
    markRoad(path);
    streets.push({ points: finishLine([gp, ...path]), cls: 'road', kind: 'outer', gate: gi });
  });

  // ================= 13b. Réseau : boulevards, quais, damier, puis croissance =================
  // Index spatial des segments (rues et obstacles)
  const SH = 24, hash = new Map();
  const segs = [];   // { a, b, half, kind: 'street'|'wall'|'river'|'cliff'|'old'|'reserve', street }
  const addSeg = sg => {
    segs.push(sg);
    const x0 = Math.floor(Math.min(sg.a[0], sg.b[0]) / SH), x1 = Math.floor(Math.max(sg.a[0], sg.b[0]) / SH);
    const y0 = Math.floor(Math.min(sg.a[1], sg.b[1]) / SH), y1 = Math.floor(Math.max(sg.a[1], sg.b[1]) / SH);
    for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) { const k = x + ',' + y; if (!hash.has(k)) hash.set(k, []); hash.get(k).push(sg); }
  };
  const near = (p, r) => {
    const out = new Set();
    for (let x = Math.floor((p[0] - r) / SH); x <= Math.floor((p[0] + r) / SH); x++) for (let y = Math.floor((p[1] - r) / SH); y <= Math.floor((p[1] + r) / SH); y++) {
      for (const sg of hash.get(x + ',' + y) || []) out.add(sg);
    }
    return out;
  };
  const addStreet = st => {
    if (st.points.length < 2) return;
    streets.includes(st) || streets.push(st);
    for (let i = 0; i + 1 < st.points.length; i++) addSeg({ a: st.points[i], b: st.points[i + 1], half: HALF[st.cls], kind: 'street', street: st });
  };
  streets.slice().forEach(addStreet);
  wallSegs.forEach(([a, b]) => addSeg({ a, b, half: 7, kind: 'wall' }));
  citSegs.forEach(([a, b]) => addSeg({ a, b, half: 5, kind: 'wall' }));
  rivers.forEach(rv => { const P = smooth(rv.path.map(id => verts[id]), 3); for (let i = 0; i + 1 < P.length; i++) addSeg({ a: P[i], b: P[i + 1], half: rv.w / 2 + 2, kind: 'river' }); });
  cliffs.forEach(cl => { for (let i = 0; i + 1 < cl.points.length; i++) addSeg({ a: cl.points[i], b: cl.points[i + 1], half: 2, kind: 'cliff' }); });
  oldWalls.filter(w => w.standing).forEach(w => addSeg({ a: verts[w.a], b: verts[w.b], half: 2.5, kind: 'old' }));
  reserves.forEach(r => r.poly.forEach((p, i) => addSeg({ a: p, b: r.poly[(i + 1) % r.poly.length], half: 0.5, kind: 'reserve', reserve: r })));

  const rS2 = rng('reseau|' + opts.size);
  const okGround = (p, dom) => domainAt(p) === dom && !inReserve(p) && slopeAt(p) <= SLOPE_MAX && !(rivers.length && riverDist(p) < 2);
  // Tracé d'une ligne "possible" en tronçons continus (pour quais, boulevards, damier)
  const runsAlong = (pts, dom, minLen) => {
    const runs = [];
    let cur = [];
    for (const p of pts) { if (okGround(p, dom)) cur.push(p); else { if (cur.length > 1) runs.push(cur); cur = []; } }
    if (cur.length > 1) runs.push(cur);
    return runs.filter(r => polyLen(r) >= minLen).map(r => simplify(r, 0.6));
  };
  const resample = (pts, step) => {
    const out = [pts[0]];
    for (let i = 0; i + 1 < pts.length; i++) {
      const L = dist(pts[i], pts[i + 1]), n = Math.max(1, Math.round(L / step));
      for (let k = 1; k <= n; k++) out.push([pts[i][0] + (pts[i + 1][0] - pts[i][0]) * k / n, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * k / n]);
    }
    return out;
  };
  // Boulevards : le tracé des vieux murs démolis
  {
    const ruined = oldWalls.filter(w => !w.standing).map(w => [verts[w.a], verts[w.b]]);
    for (const [a, b] of ruined) for (const run of runsAlong(resample([a, b], 4), 'town', 20)) addStreet({ points: run, cls: 'boulevard', kind: 'boulevard' });
  }
  // Quais : des rues le long de la rivière, sur une partie des berges en ville
  const rQ = rng('quais');
  rivers.forEach(rv => {
    const P = resample(smooth(rv.path.map(id => verts[id]), 3), 4);
    for (const side of [-1, 1]) {
      const off = rv.w / 2 + 2 + HALF.quai;
      const line = P.map((p, i) => {
        const q = P[Math.min(P.length - 1, i + 1)], o = P[Math.max(0, i - 1)], t = norm([q[0] - o[0], q[1] - o[1]]);
        return [p[0] - t[1] * off * side, p[1] + t[0] * off * side];
      });
      for (const run of runsAlong(line, 'town', 40)) if (rQ() < 0.55) addStreet({ points: run, cls: 'quai', kind: 'quai' });
    }
  });

  // Eau aménagée : biefs de moulin et îles (obstacles pour les rues et les maisons, voir water.js)
  const waterworks = makeWaterworks({
    rivers: rivers.map(rv => ({ w: rv.w, points: smooth(rv.path.map(id => verts[id]), 3) })), rand: rng('eau|' + opts.size), domainAt, slopeAt, cellR,
    nCanals: want.canals !== null ? want.canals : 1, nIslands: want.islands !== null ? want.islands : 1, X,
    addBarrier: (pts, half) => { for (let i = 0; i + 1 < pts.length; i++) addSeg({ a: pts[i], b: pts[i + 1], half, kind: 'river' }); },
  });
  const junctions = [];   // croisements créés par la croissance (pour les placettes)
  const breaches = [];
  const SPACING = { vieille: [30, 46], bourg: [38, 58], neuf: [48, 72], citadelle: [36, 54], faubourg: [60, 90] };
  if (bastide) {
    // Damier : chaque ligne de la grille, coupée là où l'on ne peut pas bâtir
    const span = Math.ceil(E / Math.min(lat.a, lat.b)) + 2;
    for (let k = -span; k <= span; k++) {
      const axis = k === 0 || k === 1;
      const uLine = resample([latPoint(k, -span * 2), latPoint(k, span * 2)], 4);
      const vLine = resample([latPoint(-span * 2, k), latPoint(span * 2, k)], 4);
      for (const run of runsAlong(uLine, 'town', 20)) addStreet({ points: run, cls: axis ? 'main' : 'rue', kind: 'grid', axis: axis ? 'u' + k : null });
      for (const run of runsAlong(vLine, 'town', 20)) addStreet({ points: run, cls: axis ? 'main' : 'rue', kind: 'grid', axis: axis ? 'v' + k : null });
    }
  } else {
    // Croissance : des rues partent régulièrement des rues existantes, à peu près perpendiculaires ;
    // en pente elles suivent les courbes de niveau ; elles s'arrêtent sur une autre rue, un mur, l'eau,
    // une falaise ou une pente trop forte.
    const queue = [];
    const seedFrom = (st, gen) => {
      const pts = st.points, L = polyLen(pts);
      const zone = zoneOf(cellAt(pts[Math.floor(pts.length / 2)]));
      const sp = SPACING[zone] || SPACING.bourg;
      let acc = 0, nextAt = between(rS2, sp) * 0.6;
      for (let i = 0; i + 1 < pts.length; i++) {
        const a = pts[i], b = pts[i + 1], l = dist(a, b);
        while (acc + l >= nextAt) {
          const t = (nextAt - acc) / l, p = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t], u = norm([b[0] - a[0], b[1] - a[1]]);
          for (const side of [-1, 1]) if (rS2() < 0.85) queue.push({ p, n: [-u[1] * side, u[0] * side], half: HALF[st.cls], gen, parent: st });
          nextAt += between(rS2, sp);
        }
        acc += l;
      }
      return L;
    };
    streets.filter(st => ['main', 'boulevard', 'quai'].includes(st.cls) && st.kind !== 'outer').forEach(st => seedFrom(st, 1));
    let guard = 0;
    const runQueue = () => { while (queue.length && guard++ < 6000) {
      const sd = queue.shift();
      const start = [sd.p[0] + sd.n[0] * (sd.half + 0.5), sd.p[1] + sd.n[1] * (sd.half + 0.5)];
      const dom = domainAt(start);
      if (dom === 'out' || !okGround(start, dom)) continue;
      const zone = zoneOf(cellAt(start));
      const maxLen = sd.gen === 1 ? 240 : sd.gen === 2 ? 140 : 80;
      let dir = norm([sd.n[0] + (rS2() - 0.5) * 0.35, sd.n[1] + (rS2() - 0.5) * 0.35]);
      const pts = [sd.p], step = 6;
      let cur = start, connected = false, endedAt = null;
      pts.push(start);
      for (let len = 0; len < maxLen; len += step) {
        // En pente, la rue suit la courbe de niveau
        if (slopeAt(cur) > 8) {
          const g = gradient(...cur), c = norm([-g[1], g[0]]), s = c[0] * dir[0] + c[1] * dir[1] >= 0 ? 1 : -1;
          dir = norm([dir[0] * 0.55 + c[0] * s * 0.45, dir[1] * 0.55 + c[1] * s * 0.45]);
        } else dir = norm([dir[0] + (rS2() - 0.5) * 0.08, dir[1] + (rS2() - 0.5) * 0.08]);
        const nxt = [cur[0] + dir[0] * step, cur[1] + dir[1] * step];
        // Croise une rue ou un obstacle ?
        let hit = null;
        for (const sg of near(nxt, 16)) {
          if (sg.street === sd.parent && len < 14) continue;
          if (sg.street && sg.street.points === pts) continue;
          const h = segHit(cur, nxt, sg.a, sg.b);
          if (h && (!hit || h.t < hit.h.t)) hit = { h, sg };
        }
        if (hit) {
          const k = hit.sg.kind;
          if (k === 'street') { pts.push(hit.h.at); connected = true; junctions.push(hit.h.at); break; }
          if ((k === 'cliff' && rS2() < 0.35) || (k === 'old' && rS2() < 0.4)) {   // escalier ou brèche
            if (k === 'old') breaches.push(hit.h.at);
          } else { endedAt = k; break; }
        }
        if (domainAt(nxt) !== dom || !okGround(nxt, dom)) { endedAt = 'edge'; break; }
        // Trop près d'une autre rue : on s'y raccorde
        let snap = null, sd2 = Infinity;
        for (const sg of near(nxt, 12)) {
          if (sg.kind !== 'street' || (sg.street === sd.parent && len < 20)) continue;
          const d = Geo.distToSegment(nxt, sg.a, sg.b);
          if (d < 9 && d < sd2) { sd2 = d; snap = sg; }
        }
        if (snap && len > 10) {
          const ab = [snap.b[0] - snap.a[0], snap.b[1] - snap.a[1]], L2 = ab[0] ** 2 + ab[1] ** 2 || 1;
          const t = Math.max(0, Math.min(1, ((nxt[0] - snap.a[0]) * ab[0] + (nxt[1] - snap.a[1]) * ab[1]) / L2));
          const at = [snap.a[0] + ab[0] * t, snap.a[1] + ab[1] * t];
          pts.push(at); connected = true; junctions.push(at); break;
        }
        pts.push(nxt);
        cur = nxt;
      }
      const L = polyLen(pts);
      if (L < 20 || (!connected && L < 28)) continue;
      const deadEnd = !connected && endedAt !== 'wall' && endedAt !== 'edge';
      const cls = sd.gen >= 2 && (L < 70 || zone === 'vieille' && rS2() < 0.4) ? 'ruelle' : 'rue';
      const st = { points: simplify(pts, 1.2), cls, kind: 'growth', deadEnd, gen: sd.gen, coarse: cellAt(pts[Math.floor(pts.length / 2)]) };
      addStreet(st);
      if (sd.gen < (zone === 'vieille' ? 3 : 2) && cls === 'rue') seedFrom(st, sd.gen + 1);
    } };
    runQueue();
    // Terrain constructible resté vide dans les murs (loin de toute rue) : une nouvelle rue part de la rue
    // la plus proche vers ce vide. Une enceinte ne protège pas des champs : la ville a fini par s'y étendre.
    const wx = wallPoly.map(p => p[0]), wy = wallPoly.map(p => p[1]);
    for (let round = 0; round < 4; round++) {
      const gaps = [];
      for (let y = Math.min(...wy); y <= Math.max(...wy); y += 20) for (let x = Math.min(...wx); x <= Math.max(...wx); x += 20) {
        const g = [x, y];
        const dg = domainAt(g);
        if (dg === 'out' || !okGround(g, dg) || slopeAt(g) > SLOPE_EASY) continue;
        if ([...near(g, 36)].some(sg => sg.kind === 'street' && Geo.distToSegment(g, sg.a, sg.b) < 36)) continue;
        if (gaps.some(o => dist(o, g) < 70)) continue;
        gaps.push(g);
      }
      if (!gaps.length) break;
      for (const g of gaps) {
        let best = null, bd = Infinity;
        for (const sg of near(g, 130)) {
          if (sg.kind !== 'street' || domainAt(sg.a) !== domainAt(g)) continue;
          const d = Geo.distToSegment(g, sg.a, sg.b);
          if (d < bd) { bd = d; best = sg; }
        }
        if (!best) continue;
        const ab = [best.b[0] - best.a[0], best.b[1] - best.a[1]], L2 = ab[0] ** 2 + ab[1] ** 2 || 1;
        const t = Math.max(0, Math.min(1, ((g[0] - best.a[0]) * ab[0] + (g[1] - best.a[1]) * ab[1]) / L2));
        const at = [best.a[0] + ab[0] * t, best.a[1] + ab[1] * t];
        queue.push({ p: at, n: norm([g[0] - at[0], g[1] - at[1]]), half: best.half, gen: 1, parent: best.street });
      }
      runQueue();
    }
  }

  // Placettes : quelques croisements s'élargissent en petite place (comme le Weinmarkt de Nuremberg)
  const squares = [];
  if (!bastide) {
    const rSq = rng('placettes|' + opts.size);
    const wantSq = want.squares !== null ? want.squares : Math.max(1, Math.round(N / 9));
    const cand = junctions.filter(p => domainAt(p) === 'town' && !inReserve(p) && slopeAt(p) < 12);
    for (let tries = 0; squares.length < wantSq && tries < 60 && cand.length; tries++) {
      const p = cand[Math.floor(rSq() * cand.length)];
      if (squares.some(o => dist(o.at, p) < cellR * 1.6) || dist(p, plaza.site) < cellR * 1.5) continue;
      const r = between(rSq, [9, 13]);
      const poly = circle(p, r, 10).map(q => [q[0] + (rSq() - 0.5) * 3, q[1] + (rSq() - 0.5) * 3]);
      const res = { poly, kind: 'square', frontage: true };
      reserves.push(res);
      poly.forEach((q, i) => addSeg({ a: q, b: poly[(i + 1) % poly.length], half: 0.5, kind: 'reserve', reserve: res }));
      squares.push({ at: p, poly, cell: cellAt(p) });
    }
  }

  // Églises de paroisse : un enclos le long d'une rue, au cœur de chaque quartier (sauf celui de la cathédrale)
  const churchSpots = [];
  {
    const rC = rng('paroisses');
    const saints = X.saints.slice();
    const streetCandidates = streets.filter(st => ['rue', 'main', 'boulevard'].includes(st.cls) && st.kind !== 'outer');
    const tryChurch = (mid, dom, filterCell) => {
      let best = null, bd = Infinity;
      for (const st of streetCandidates) {
        const P = resample(st.points, 10);
        for (let i = 1; i + 1 < P.length; i++) {
          if (dist(P[i], mid) > cellR * 2.5) continue;
          const u = norm([P[i + 1][0] - P[i - 1][0], P[i + 1][1] - P[i - 1][1]]);
          for (const side of [-1, 1]) {
            const n = [-u[1] * side, u[0] * side], c = [P[i][0] + n[0] * (HALF[st.cls] + 15), P[i][1] + n[1] * (HALF[st.cls] + 15)];
            const poly = rect(c, u, 32, 26);
            if (filterCell && !filterCell(cellAt(c))) continue;
            if (!poly.every(q => domainAt(q) === dom && !inReserve(q) && slopeAt(q) < SLOPE_EASY)) continue;
            if ([...near(c, 30)].some(sg => sg.kind !== 'reserve' && poly.some((q, k) => segHit(q, poly[(k + 1) % 4], sg.a, sg.b)))) continue;
            const d = dist(c, mid);
            if (d < bd) { bd = d; best = poly; }
          }
        }
      }
      return best;
    };
    districts.forEach((d, k) => {
      if (d.cells.some(c => c.building && c.building.id === 'temple')) return;
      if (want.churches !== null && churchSpots.filter(c => c.district >= 0).length >= want.churches) return;
      const poly = tryChurch(d.labelCell.site, 'town', c => c.district === k);
      if (!poly) return;
      const res = { poly, kind: 'church', frontage: false };
      reserves.push(res);
      poly.forEach((q, i) => addSeg({ a: q, b: poly[(i + 1) % 4], half: 0.5, kind: 'reserve', reserve: res }));
      churchSpots.push({ poly, district: k, name: saints.splice(Math.floor(rC() * saints.length), 1)[0] || X.defaultSaint });
    });
    if (twin && citadelPoly) {
      const cc = citadelPoly.reduce((a, p) => [a[0] + p[0] / citadelPoly.length, a[1] + p[1] / citadelPoly.length], [0, 0]);
      const poly = tryChurch(cc, 'cit');
      if (poly) {
        const res = { poly, kind: 'church', frontage: false };
        reserves.push(res);
        poly.forEach((q, i) => addSeg({ a: q, b: poly[(i + 1) % 4], half: 0.5, kind: 'reserve', reserve: res }));
        churchSpots.push({ poly, district: -1, name: X.collegiate(saints.splice(Math.floor(rC() * saints.length), 1)[0] || X.defaultSaint) });
      }
    }
  }

  // ================= 14. Parcelles et maisons, le long des rues =================
  const city = {
    lang, name, autoName, seed: opts.seed, size: opts.size, R, E, relief, age, moat,
    rivers: rivers.map(rv => ({ w: rv.w, points: smooth(rv.path.map(id => verts[id]), 3) })),
    bridges: [],
    wall: wallPoly,
    gates: gates.map(id => {
      const k = wall.indexOf(id);
      return { at: verts[id], prev: verts[wall[(k - 1 + wall.length) % wall.length]], next: verts[wall[(k + 1) % wall.length]] };
    }),
    oldWalls: [], oldGates: [],
    citadel: citadelSet.size ? {
      edges: boundary(citadelSet).map(([a, b]) => [verts[a], verts[b]]),
      gate: citGatePt,
    } : null,
    streetNet: [], streetHalf: HALF, roads: [],
    suburbGround: [],
    ground: { court: [], yard: [], garden: [] },
    houses: { stone: [], timber: [], thatch: [] },
    roofs: { slate: [], tile: [], thatch: [] },
    ridges: [], annexes: [], lotLines: [], fences: [], trees: [],
    terraces: [], vineyards: [], fieldStrips: [[], [], []], meadows: [],
    plaza: [], stalls: [], wells: [], specials: [], labels: [],
    plan: bastide ? 'bastide' : 'organique', twin, doubleWall, arcades: [], halls: [],
    cliffs: cliffs.map(cl => ({ points: cl.points, center: cl.center, drop: cl.drop })), stairs: [],
    canals: waterworks.canals, mills: waterworks.mills, islands: waterworks.islands, outskirts: [],
    valleyType: relief === 'vallee' ? valley.type : null,
    hills: hillNames.map(h => h.name),
    hillShapes: hilly ? hills.map((hl, k) => ({ type: hl.type, height: Math.round(hl.h * reliefHeight), name: k === 0 ? null : (hillNames[k - 1] || {}).name,
      steepDir: hl.asym > 0.4 ? [Math.cos(hl.phi + hl.asymDir), Math.sin(hl.phi + hl.asymDir)] : null, along: [Math.cos(hl.phi), Math.sin(hl.phi)] })) : [],
    squares: [], churches: [], inns: [], waterGates: [], streetLabels: [], streets: [], neighbours: [],
    gateNames: [],
    districts: districts.map(d => ({
      name: d.name, auto: d.auto, ring: d.ring, zone: zoneOf(d.cells[0]), size: d.cells.length,
      nearRiver: d.cells.some(c => touchesRiver(c)), onSlope: d.cells.some(c => neighbours(c).some(n => n.steep)),
      at: Geo.centroid(d.labelCell.ids.map(id => verts[id])),
    })),
  };

  // Noms des portes
  {
    const usedDirs = new Set();
    const rP = rng('portes-noms');
    for (const g of gates) {
      const v = verts[g], dir = compassOf(v);
      const text = usedDirs.has(dir) ? X.gateExtra[Math.floor(rP() * X.gateExtra.length)] : X.gate(dir);
      usedDirs.add(dir);
      const l = Math.hypot(v[0], v[1]) || 1;
      city.gateNames.push({ at: [v[0] + (v[0] / l) * 34, v[1] + (v[1] / l) * 34], text });
    }
  }

  // Terrain : grille d'altitude (m) et de pente (%), pour les courbes de niveau et les vues Relief / Pentes
  {
    const G = 150, step = (2 * E) / G;
    const alt = [], slp = [];
    for (let j = 0; j <= G; j++) for (let i = 0; i <= G; i++) alt.push(Math.round(altitude(-E + i * step, -E + j * step) * 10) / 10);
    // Pente déduite des altitudes voisines (bien plus rapide que de recalculer le relief)
    for (let j = 0; j <= G; j++) for (let i = 0; i <= G; i++) {
      const A = (ii, jj) => alt[Math.max(0, Math.min(G, jj)) * (G + 1) + Math.max(0, Math.min(G, ii))];
      const gx = (A(i + 1, j) - A(i - 1, j)) / (2 * step), gy = (A(i, j + 1) - A(i, j - 1)) / (2 * step);
      slp.push(Math.round(Math.hypot(gx, gy) * 1000) / 10);
    }
    city.terrain = { G, step, E, alt, slope: slp, flat: relief === 'plaine', easy: SLOPE_EASY, max: SLOPE_MAX,
      min: Math.min(...alt), maxAlt: Math.max(...alt), base: baseAlt,
      summits: hilly ? hills.map((hl, k) => ({ at: hl.c, alt: Math.round(altitude(...hl.c)), name: k === 0 ? (citadelSet.size ? (twin ? X.labels.upperTown : X.labels.citadel) : X.labels.hill) : (hillNames[k - 1] || {}).name })) : [] };
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
  const overlaps = (a, b) => {
    let ax0 = Infinity, ax1 = -Infinity, ay0 = Infinity, ay1 = -Infinity, bx0 = Infinity, bx1 = -Infinity, by0 = Infinity, by1 = -Infinity;
    for (const q of a) { ax0 = Math.min(ax0, q[0]); ax1 = Math.max(ax1, q[0]); ay0 = Math.min(ay0, q[1]); ay1 = Math.max(ay1, q[1]); }
    for (const q of b) { bx0 = Math.min(bx0, q[0]); bx1 = Math.max(bx1, q[0]); by0 = Math.min(by0, q[1]); by1 = Math.max(by1, q[1]); }
    if (ax1 < bx0 || bx1 < ax0 || ay1 < by0 || by1 < ay0) return false;
    for (const P of [a, b]) for (let i = 0; i < P.length; i++) {
      const A = P[i], B = P[(i + 1) % P.length], nx = -(B[1] - A[1]), ny = B[0] - A[0];
      if (Math.hypot(nx, ny) < 1e-6) continue;
      let amin = Infinity, amax = -Infinity, bmin = Infinity, bmax = -Infinity;
      for (const q of a) { const v = q[0] * nx + q[1] * ny; amin = Math.min(amin, v); amax = Math.max(amax, v); }
      for (const q of b) { const v = q[0] * nx + q[1] * ny; bmin = Math.min(bmin, v); bmax = Math.max(bmax, v); }
      const tol = 0.3 * Math.hypot(nx, ny);
      if (amax <= bmin + tol || bmax <= amin + tol) return false;
    }
    return true;
  };
  const bbox = poly => { let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity; for (const q of poly) { x0 = Math.min(x0, q[0]); x1 = Math.max(x1, q[0]); y0 = Math.min(y0, q[1]); y1 = Math.max(y1, q[1]); } return [x0, x1, y0, y1]; };
  // Index des bâtiments posés (pour éviter les chevauchements)
  const BH = new Map();
  const bKeys = poly => { const c = Geo.centroid(poly); return [Math.floor(c[0] / 20), Math.floor(c[1] / 20)]; };
  const placeB = poly => { const [x, y] = bKeys(poly), k = x + ',' + y; if (!BH.has(k)) BH.set(k, []); BH.get(k).push({ poly, bb: bbox(poly) }); };
  const clashB = poly => {
    const [x, y] = bKeys(poly), b = bbox(poly);
    for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) for (const q of BH.get((x + dx) + ',' + (y + dy)) || []) {
      if (q.bb[1] < b[0] || b[1] < q.bb[0] || q.bb[3] < b[2] || b[3] < q.bb[2]) continue;
      if (overlaps(q.poly, poly)) return true;
    }
    return false;
  };
  // Un bâtiment empiète-t-il sur une rue, un mur, l'eau, une falaise ou une réserve ?
  const segPolyDist = (a, b, poly) => {
    let m = Infinity;
    for (let i = 0; i < poly.length; i++) {
      const p = poly[i], q = poly[(i + 1) % poly.length];
      if (segHit(a, b, p, q)) return 0;
      m = Math.min(m, Geo.distToSegment(p, a, b), Geo.distToSegment(a, p, q), Geo.distToSegment(b, p, q));
    }
    return m;
  };
  const blocked = poly => {
    const c = Geo.centroid(poly);
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    for (const q of poly) { x0 = Math.min(x0, q[0]); x1 = Math.max(x1, q[0]); y0 = Math.min(y0, q[1]); y1 = Math.max(y1, q[1]); }
    const r = Math.hypot(x1 - x0, y1 - y0) / 2 + 8;
    for (const sg of near(c, r)) {
      const h = sg.half;
      if (Math.max(sg.a[0], sg.b[0]) < x0 - h || Math.min(sg.a[0], sg.b[0]) > x1 + h || Math.max(sg.a[1], sg.b[1]) < y0 - h || Math.min(sg.a[1], sg.b[1]) > y1 + h) continue;
      if (segPolyDist(sg.a, sg.b, poly) < h) return true;
    }
    return poly.some(q => inReserve(q)) || inReserve(c);
  };
  // Distance libre devant soi (jusqu'à la rue d'en face, un mur, l'eau…) et ce qu'on rencontre
  const reachAlong = (o, n, maxD) => {
    let best = maxD, what = null;
    for (let s = 0; s <= maxD; s += SH) for (const sg of near([o[0] + n[0] * s, o[1] + n[1] * s], SH)) {
      const h = segHit(o, [o[0] + n[0] * maxD, o[1] + n[1] * maxD], sg.a, sg.b);
      if (!h) continue;
      const d = h.t * maxD - sg.half;
      if (d < best) { best = d; what = sg.kind; }
    }
    return [best, what];
  };

  const TREES = { vieille: 0.05, bourg: 0.25, neuf: 0.45, faubourg: 0.5, citadelle: 0.15 };
  const mainHouses = [];
  let people = 0;
  // Une rangée de lots le long d'une ligne (bord de rue ou bord de place), d'un côté
  const frontageLine = (pts, side, cls, opt) => {
    const rand = rng('lots|' + opts.size + '|' + opt.key);
    const half = opt.offset != null ? opt.offset : HALF[cls] + 0.4;
    const rich = ['main', 'place', 'boulevard', 'quai'].includes(cls);
    const alley = cls === 'ruelle';
    let acc = 0, segI = 0, segT = 0;
    const P = pts, L = polyLen(P);
    const pointAt = s => {
      let a = 0;
      for (let i = 0; i + 1 < P.length; i++) { const l = dist(P[i], P[i + 1]); if (a + l >= s) { const t = (s - a) / (l || 1); return [P[i][0] + (P[i + 1][0] - P[i][0]) * t, P[i][1] + (P[i + 1][1] - P[i][1]) * t]; } a += l; }
      return P[P.length - 1];
    };
    let t = opt.startGap || 0, rowDepth = null, zone0 = null;
    while (t < L - 3) {
      const mid0 = pointAt(t + 3);
      const zone = opt.zone || zoneOf(cellAt(mid0));
      const Z = ZONES[zone];
      if (zone !== zone0) { rowDepth = between(rand, Z.depth) * (rich ? 1.2 : alley ? 0.8 : 1); zone0 = zone; }
      const front = rich ? [Z.front[0], Z.front[0] + 2.5] : alley ? [Z.front[0] + 2, Z.front[1] + 3] : Z.front;
      let w = between(rand, front);
      if (L - (t + w) < 3) w = L - t;
      const A = pointAt(t), B = pointAt(t + w);
      t += w;
      const u = norm([B[0] - A[0], B[1] - A[1]]), n = [-u[1] * side, u[0] * side];
      const F0 = [A[0] + n[0] * half, A[1] + n[1] * half], F1 = [B[0] + n[0] * half, B[1] + n[1] * half];
      const Fm = [(F0[0] + F1[0]) / 2, (F0[1] + F1[1]) / 2];
      const dom = domainAt(Fm);
      if (opt.domain ? dom !== opt.domain : dom === 'out') continue;
      if (opt.suburb && wallSegs.some(([a, b]) => Geo.distToSegment(Fm, a, b) < moat.outer + 5)) continue;
      const sl = slopeAt(Fm);
      if (sl > SLOPE_MAX) continue;
      const onSlope = sl > SLOPE_EASY;
      const [reach, what] = reachAlong([Fm[0] + n[0] * 0.2, Fm[1] + n[1] * 0.2], n, 70);
      const lotDepth = Math.min(what === 'street' ? reach / 2 : reach - 1, 42);
      if (lotDepth < 5) continue;
      const skip = (alley ? 0.45 : opt.suburb ? 0.35 : zone === 'neuf' ? 0.08 : 0.03) + (onSlope ? 0.3 : 0);
      if (rand() < skip) { city.fences.push([F0, F1]); continue; }
      let d = Math.min(rowDepth * between(rand, [0.85, 1.15]) * (onSlope ? 0.7 : 1), lotDepth * 0.85);
      let house = null;
      const trims = [[0, 0], [0, 0.35], [0.35, 0], [0, 0.6], [0.6, 0]];
      for (const df of [1, 0.65]) for (const [ta, tb] of trims) {
        if (house) break;
        const tryD = d * df;
        if (tryD < 4) continue;
        const Q0 = [F0[0] + u[0] * w * ta, F0[1] + u[1] * w * ta], Q1 = [F1[0] - u[0] * w * tb, F1[1] - u[1] * w * tb];
        const r0 = [Q0, Q1, [Q1[0] + n[0] * tryD, Q1[1] + n[1] * tryD], [Q0[0] + n[0] * tryD, Q0[1] + n[1] * tryD]];
        if (Math.abs(Geo.area(r0)) > 12 && r0.every(q => domainAt(q) === dom && slopeAt(q) <= SLOPE_MAX) && !onCliff(r0) && !clashB(r0) && !blocked(r0)) { house = r0; d = tryD; }
      }
      if (!house) continue;
      placeB(house);
      addHouse(house, zone, rand, rich);
      people += Z.people;
      if (cls === 'main' && !opt.suburb) mainHouses.push({ poly: house, at: Geo.centroid(house), district: cellAt(Fm).district });
      const ridge = ridgeOf(house, w < d ? n : u);   // pignon sur rue si la façade est étroite
      if (ridge) city.ridges.push(ridge);
      // Cour ou jardin derrière la maison, jusqu'au fond de la parcelle
      const back = [house[3], house[2], [house[2][0] + n[0] * (lotDepth - d), house[2][1] + n[1] * (lotDepth - d)], [house[3][0] + n[0] * (lotDepth - d), house[3][1] + n[1] * (lotDepth - d)]];
      if (lotDepth - d > 2 && !blocked(back)) city.ground[opt.suburb ? 'garden' : Z.court].push(back);
      if (t < L - 3) city.lotLines.push([house[2], [house[2][0] + n[0] * (lotDepth - d), house[2][1] + n[1] * (lotDepth - d)]]);
      // Arrière-corps (logis, atelier) ou dépendance au fond de la cour
      let rearBuilt = false;
      if (rand() < Z.rear) {
        const gap = between(rand, [2, 4]), d2 = between(rand, [5, 9]);
        if (d + gap + d2 < lotDepth) {
          const a0 = d + gap, a1 = d + gap + d2;
          const r1 = [[F0[0] + u[0] * w * 0.05 + n[0] * a0, F0[1] + u[1] * w * 0.05 + n[1] * a0], [F1[0] - u[0] * w * 0.05 + n[0] * a0, F1[1] - u[1] * w * 0.05 + n[1] * a0],
            [F1[0] - u[0] * w * 0.05 + n[0] * a1, F1[1] - u[1] * w * 0.05 + n[1] * a1], [F0[0] + u[0] * w * 0.05 + n[0] * a1, F0[1] + u[1] * w * 0.05 + n[1] * a1]];
          if (r1.every(q => domainAt(q) === dom) && !onCliff(r1) && !clashB(r1) && !blocked(r1)) {
            placeB(r1); addHouse(r1, zone, rand, false); people += Z.people; rearBuilt = true;
            const rr = ridgeOf(r1, u); if (rr) city.ridges.push(rr);
          }
        }
      }
      if (!rearBuilt && rand() < Z.annex) {
        const ad = between(rand, [3, 5.5]), gap = between(rand, [1.5, 4]);
        if (d + gap + ad < lotDepth) {
          const cc = [Fm[0] + n[0] * (d + gap + ad / 2), Fm[1] + n[1] * (d + gap + ad / 2)];
          const shed = rect(cc, u, w * between(rand, [0.4, 0.75]), ad);
          if (shed.every(q => domainAt(q) === dom) && !onCliff(shed) && !clashB(shed) && !blocked(shed)) { placeB(shed); city.annexes.push(shed); }
        }
      }
    }
  };
  // Maisons le long de toutes les rues de la ville, des deux côtés
  streets.forEach((st, si) => {
    if (st.cls === 'road') return;
    for (const side of [-1, 1]) frontageLine(st.points, side, st.cls, { key: 's' + si + side });
  });
  // Maisons autour de la place du marché et des placettes (tournées vers la place)
  reserves.filter(r => r.frontage).forEach((r, ri) => {
    const P = [...r.poly, r.poly[0]], s = Geo.area(r.poly) > 0 ? -1 : 1;
    for (let i = 0; i + 1 < P.length; i++) frontageLine([P[i], P[i + 1]], s, 'place', { key: 'r' + ri + '-' + i, offset: 0.8 });
  });
  // Faubourgs : maisons le long des routes, juste hors les murs
  streets.forEach((st, si) => {
    if (st.cls !== 'road') return;
    const inReach = st.points.filter(p => Math.hypot(...p) < R * 1.45);
    if (inReach.length > 1) for (const side of [-1, 1]) frontageLine(inReach, side, 'road', { key: 'f' + si + side, domain: 'out', zone: 'faubourg', suburb: true });
  });

  // Maisons sur les îles
  for (const isl of waterworks.islands) {
    const rand = rng('ile|' + isl.name), t = isl.axis, n = [-t[1], t[0]];
    for (let x = -isl.len / 2 + 6; x < isl.len / 2 - 6; x += between(rand, [7, 10])) for (const side of [-1, 1]) {
      const c = [isl.at[0] + t[0] * x + n[0] * side * isl.wid / 4, isl.at[1] + t[1] * x + n[1] * side * isl.wid / 4];
      const h = rect(c, t, between(rand, [5, 8]), isl.wid / 2 - 3);
      if (h.every(q => inPoly(isl.land, q)) && !clashB(h) && !blocked(h) && rand() < 0.75) { placeB(h); addHouse(h, 'bourg', rand, false); people += ZONES.bourg.people; }
    }
  }
  // Hors les murs : église de faubourg, maladrerie, gibet, tanneries, moulins (voir outskirts.js)
  {
    const saintsLeft = X.saints.filter(x => !churchSpots.some(c => c.name.endsWith(x)));
    const rO = rng('faubourgs|' + opts.size);
    city.outskirts = makeOutskirts({
      roads: streets.filter(st => st.cls === 'road').map(st => st.points), rivers: city.rivers, rand: rO, R,
      wallDist: p => Math.min(...wallSegs.map(([a, b]) => Geo.distToSegment(p, a, b))), moatOuter: moat.outer, slopeAt, altitude,
      free: poly => !clashB(poly) && !blocked(poly) && poly.every(q => domainAt(q) === 'out'), reserve: poly => placeB(poly), rect,
      saint: () => saintsLeft.splice(Math.floor(rO() * saintsLeft.length), 1)[0] || X.defaultSaint, X,
    });
  }

  // Arbres dans les cœurs d'îlots (plus nombreux dans les quartiers récents)
  {
    const rT2 = rng('arbres|' + opts.size);
    const xs = wallPoly.map(p => p[0]), ys = wallPoly.map(p => p[1]);
    const area = Math.abs(Geo.area(wallPoly));
    for (let k = 0, n = Math.round(area / 140); k < n; k++) {
      const p = [between(rT2, [Math.min(...xs), Math.max(...xs)]), between(rT2, [Math.min(...ys), Math.max(...ys)])];
      const dom = domainAt(p);
      if (dom === 'out') continue;
      const zone = zoneOf(cellAt(p));
      if (rT2() > TREES[zone] * 1.6) continue;
      const r = between(rT2, [2.5, 4.5]), blob = rect(p, [1, 0], r * 2, r * 2);
      if (slopeAt(p) > SLOPE_MAX || clashB(blob) || blocked(blob)) continue;
      placeB(blob);
      city.trees.push([p[0], p[1], r]);
    }
  }

  // Réseau dessiné : toutes les rues, avec leur largeur
  city.streetNet = streets.map(st => ({ points: st.points, cls: st.cls, kind: st.kind }));
  city.roads = streets.filter(st => st.cls === 'main' || st.cls === 'road').map(st => st.points);

  // ================= 14b. Place, monuments, églises, champs =================
  const withRiver = (k, d) => (riverEdgeW.has(k) ? Math.max(d, riverEdgeW.get(k) / 2 + 2.5) : d);
  const edgeInset = k => withRiver(k,
    wallEdges.has(k) ? 7 : citadelEdges.has(k) ? 6 : oldWallEdges.has(k) ? 4 : roadEdges.has(k) ? 5.5 : 3.5);

  // Place du marché (couverts et halle dans une bastide)
  {
    const rand = rng('marche-dessin|' + opts.size);
    city.plaza.push(marketPoly);
    const [ctr, ir] = inradius(marketPoly);
    if (bastide) {
      const arc = Geo.inset(marketPoly, 3.5);
      if (arc.length >= 3) city.arcades.push(arc);
      city.halls.push(rect(ctr, lat.u, Math.min(ir * 1.2, 22), Math.min(ir * 0.7, 12)));
      const wOff = Math.min(ir * 0.7, 12) / 2 + 5;
      city.wells.push([ctr[0] + lat.v[0] * wOff, ctr[1] + lat.v[1] * wOff, 2.4]);
    } else {
      city.wells.push([ctr[0], ctr[1], 2.6]);
      const ax = norm([marketPoly[1][0] - marketPoly[0][0], marketPoly[1][1] - marketPoly[0][1]]);
      for (let k = 0; k < 10; k++) {
        const a = rand() * Math.PI * 2, d = between(rand, [8, Math.max(9, ir * 0.75)]);
        const st = rect([ctr[0] + Math.cos(a) * d, ctr[1] + Math.sin(a) * d], ax, between(rand, [3, 5]), between(rand, [2, 3]));
        if (st.every(q => inPoly(marketPoly, q))) city.stalls.push(st);
      }
    }
    city.labels.push({ at: [ctr[0], ctr[1] - Math.min(ir * 0.55, 14)], text: X.labels.market });
  }
  // Placettes
  for (const sq of squares) { city.plaza.push(sq.poly); city.wells.push([sq.at[0], sq.at[1], 1.8]); }
  // Églises de paroisse
  for (const sp of churchSpots) {
    const rand = rng('eglise|' + sp.name);
    city.ground.garden.push(sp.poly);
    const [ctr, ir] = inradius(sp.poly);
    const len = Math.min(ir * 1.7, 26), wid = len * 0.34;
    const nave = rect(ctr, [1, 0], len, wid);
    const apse = circle([ctr[0] + len / 2, ctr[1]], wid / 2, 16);
    const tower = rect([ctr[0] - len / 2 - wid * 0.3, ctr[1]], [1, 0], wid * 0.7, wid * 0.7);
    const tombs = [];
    for (let k = 0; k < 14; k++) {
      const p = [ctr[0] + (rand() - 0.5) * 26, ctr[1] + (rand() - 0.5) * 20];
      const t = rect(p, [1, 0], 1.6, 2.8);
      if (t.every(q => inPoly(sp.poly, q)) && !overlaps(t, nave) && !overlaps(t, tower) && !overlaps(t, rect([ctr[0] + len / 2, ctr[1]], [1, 0], wid, wid))) tombs.push(t);
    }
    city.churches.push({ name: sp.name, district: sp.district, nave, apse, tower, tombs, yard: sp.poly, at: [ctr[0], ctr[1] + wid * 0.5 + 6] });
  }

  const special = (b, yard, rand, c) => drawMonument(b, yard, rand, c, { city, cellEdges, ek, unkey, verts, riverEdgeW });

  for (const c of cells) {
    const poly = c.ids.map(id => verts[id]);
    if (poly.length < 3) continue;
    const keys = cellEdges(c).map(([a, b]) => ek(a, b));
    const rand = rng('ilot|' + opts.size + '|' + c.index);
    if (c.building) {
      const yard = precinctOf.get(c.index);
      if (yard && yard.length >= 3) special(c.building, yard, rand, c);
    }
  }
  // Campagne : champs en lanières le long des routes, prés, forêts (voir land.js)
  {
    const land = makeLand({
      E, R, rand: rng('campagne|' + opts.size), roads: streets.filter(st => st.cls === 'road').map(st => st.points), forest: want.forest,
      rivers: city.rivers, wallPoly, moatOuter: moat.outer, slopeAt,
      occupied: [...city.houses.stone, ...city.houses.timber, ...city.houses.thatch, ...city.specials.flatMap(sp => sp.yard), ...city.outskirts.map(o => o.poly)],
    });
    city.fieldStrips = land.fieldStrips;
    city.meadows = land.meadows;
    city.forest = land.forest;
    city.forestCell = land.forestCell;
  }

  // ================= 15. Noms : rues, routes, auberges ; ponts, portes, escaliers (voir names.js) =================
  nameCity({ X, nInns: want.inns, rng, opts, city, streets, bastide, twin, wanted, churchSpots, districts, zoneOf, cellAt, altitude, baseAlt, reliefHeight, rivers, riverDist, cellR, squares, cliffSegs, oldWalls, verts, domainAt, mainHouses, plaza, gates, edgeCells, cells, wall, wallEdges, ek, dist });

  // La citadelle a son étiquette
  if (citadelPoly) {
    const cc = citadelPoly.reduce((a, p) => [a[0] + p[0] / citadelPoly.length, a[1] + p[1] / citadelPoly.length], [0, 0]);
    city.labels.push({ at: [cc[0], cc[1] - 18], text: twin ? X.labels.upperTown : X.labels.citadel, italic: true });
  }

  city.stats = {
    houses: city.houses.stone.length + city.houses.timber.length + city.houses.thatch.length,
    stone: city.houses.stone.length, timber: city.houses.timber.length, thatch: city.houses.thatch.length,
    population: Math.round(people / 50) * 50,
    gates: gates.length,
    rivers: rivers.length,
    relief, age,
    diameter: Math.round((Math.max(...wallPoly.map(p => p[0])) - Math.min(...wallPoly.map(p => p[0]))) / 10) * 10,
    streets: streets.filter(st => st.cls === 'rue').length,
    alleys: streets.filter(st => st.cls === 'ruelle').length,
    churches: city.churches.length,
    altitude: { base: baseAlt, min: Math.round(city.terrain.min), max: Math.round(city.terrain.maxAlt), plaza: Math.round(altitude(...plaza.site)),
      steepest: Math.round(Math.max(...city.terrain.slope)) },
    missing,
  };
  // Quantités demandées mais impossibles à placer (manque de place, de rivière…) : on le dit
  {
    const got = { hills: hilly ? hills.length : 0, rivers: rivers.length, gates: gates.length, rings: age, districts: city.districts.length,
      squares: city.squares.length, churches: city.churches.filter(c => c.district >= 0).length, inns: city.inns.length,
      islands: city.islands.length, canals: city.canals.length };
    city.stats.shortfalls = Object.keys(got).filter(k => want[k] !== null && got[k] < want[k]).map(k => X.shortfall.format(X.shortfall[k], got[k], want[k]));
  }
  return city;
}
