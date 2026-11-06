'use strict';
/*
 * Tests sans dépendance :   node test.js        (ou   node test.js 200   pour plus de villes)
 * Les villes sont réparties sur tous les cœurs du processeur. Pour chaque ville on vérifie :
 *  - pas d'erreur, et même graine = même ville ;
 *  - rempart et au moins deux portes, fiche complète, SVG bien formé (les trois vues) ;
 *  - aucune maison ne chevauche une autre, n'empiète sur une rue, n'est dans l'eau
 *    ou à cheval sur un ressaut ;
 *  - les grandes routes ne traversent le rempart qu'aux portes ; les petites rues ne traversent pas les rivières.
 */
const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const os = require('os');

const FILES = ['i18n.js', 'geo.js', 'terrain.js', 'catalog.js', 'land.js', 'water.js', 'outskirts.js', 'factions.js', 'presets.js', 'monuments.js', 'names.js', 'generator.js', 'lore.js', 'lore-en.js', 'render.js', 'sight.js'];

function optionsFor(i) {
  const sizes = ['petite', 'moyenne', 'grande', i % 16 === 15 ? 'mega' : i % 8 === 7 ? 'metropole' : 'capitale'];
  const reliefs = ['plaine', 'colline', 'collines', 'vallee'];
  const rivers = ['non', 'oui', 'deux', 'auto'];
  const ages = ['jeune', 'ancienne', 'tresancienne', 'auto'];
  const hills = ['butte', 'crete', 'eperon', 'table', 'dissymetrique'];
  const valleys = ['large', 'gorge', 'confluence', 'meandre'];
  return {
    seed: 'test' + i, size: sizes[i % 4], relief: reliefs[(i >> 2) % 4], river: rivers[(i >> 4) % 4], age: ages[(i >> 1) % 4],
    plan: i % 5 === 0 ? 'bastide' : 'organique', walls: i % 3 === 0 ? 'double' : 'simple', twin: i % 7 === 3 ? 'oui' : 'non',
    ledges: i % 2 ? 'oui' : 'non', hillType: hills[i % 5], valleyType: valleys[(i >> 1) % 4],
    lang: i % 2 ? 'fr' : 'en',
    nHills: i % 11 === 5 ? 10 : i % 11 === 6 ? 6 : null, nLedges: i % 13 === 4 ? 3 : null, nFactions: i % 3 === 1 ? 2 + (i % 7) : null,
    terrainEdits: i % 6 === 2 ? [{ t: 'r', x: 60, y: -40, r: 90, a: 8, g: 1 }, { t: 'l', x: -80, y: 30, r: 70, a: 5, g: 2 }, { t: 's', x: 0, y: 0, r: 120, a: 4, g: 3 }] : [],
    citadel: i % 4 === 1 ? 'non' : i % 4 === 3 ? 'auto' : 'oui',
    preset: i % 10 === 7 ? 'kades' : '',
    userRivers: i % 9 === 4 ? [[[-300, -50], [0, 20], [250, 120]]] : null,
    buildings: i % 3 ? ['temple', 'chateau', 'palais', 'guildes', 'universite', 'caserne', 'prison', 'hospice', 'bains', 'arene', 'cimetiere', 'port', 'monastere', 'moulin'] : ['temple', 'chateau'],
  };
}

if (isMainThread) {
  const COUNT = Number(process.argv[2]) || 48;
  const nw = Math.max(1, Math.min(os.cpus().length - 1, 8));
  const t0 = Date.now();
  const jobs = Array.from({ length: nw }, (_, w) => Array.from({ length: COUNT }, (_, i) => i).filter(i => i % nw === w));
  let failures = [], slowest = 0, done = 0;
  for (const list of jobs) {
    const wk = new Worker(__filename, { workerData: list });
    wk.on('message', m => {
      failures = failures.concat(m.failures);
      slowest = Math.max(slowest, m.slowest);
      if (++done === nw) {
        failures.forEach(f => console.log('ÉCHEC', f.msg, JSON.stringify(f.opts)));
        console.log(`${COUNT} villes en ${((Date.now() - t0) / 1000).toFixed(1)} s sur ${nw} cœurs (la plus lente : ${slowest} ms) — ${failures.length ? failures.length + ' échec(s)' : 'tout est bon'}`);
        process.exit(failures.length ? 1 : 0);
      }
    });
    wk.on('error', e => { console.log('ÉCHEC du test lui-même :', e); process.exit(1); });
  }
} else {
  const ctx = {};
  vm.createContext(ctx);
  for (const f of FILES) vm.runInContext(fs.readFileSync(path.join(__dirname, f), 'utf8'), ctx, { filename: f });
  vm.runInContext('this.api = { generateCity, renderSVG, citySheet, Geo, sightGrid, sightFrom }', ctx);
  const { generateCity, renderSVG, citySheet, Geo, sightGrid, sightFrom } = ctx.api;
  const failures = [];
  let slowest = 0;
  const fail = (msg, opts) => failures.push({ msg, opts });
  const cross = (a, b, c, d) => {
    const f = (p, q, r) => (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]);
    return f(a, b, c) * f(a, b, d) < 0 && f(c, d, a) * f(c, d, b) < 0;
  };
  const overlaps = (a, b) => {
    for (const P of [a, b]) for (let i = 0; i < P.length; i++) {
      const A = P[i], B = P[(i + 1) % P.length], nx = -(B[1] - A[1]), ny = B[0] - A[0], len = Math.hypot(nx, ny);
      if (len < 1e-6) continue;
      let a0 = Infinity, a1 = -Infinity, b0 = Infinity, b1 = -Infinity;
      for (const q of a) { const v = q[0] * nx + q[1] * ny; a0 = Math.min(a0, v); a1 = Math.max(a1, v); }
      for (const q of b) { const v = q[0] * nx + q[1] * ny; b0 = Math.min(b0, v); b1 = Math.max(b1, v); }
      if (a1 <= b0 + 0.5 * len || b1 <= a0 + 0.5 * len) return false;
    }
    return true;
  };
  // Petite grille d'accès rapide aux segments
  const gridOf = (segs, cell) => {
    const g = new Map();
    for (const s of segs) {
      const k = Math.floor((s[0][0] + s[1][0]) / 2 / cell) + ',' + Math.floor((s[0][1] + s[1][1]) / 2 / cell);
      if (!g.has(k)) g.set(k, []);
      g.get(k).push(s);
    }
    return (p, r = 2) => {
      const out = [], x = Math.floor(p[0] / cell), y = Math.floor(p[1] / cell);
      for (let dx = -r; dx <= r; dx++) for (let dy = -r; dy <= r; dy++) out.push(...(g.get((x + dx) + ',' + (y + dy)) || []));
      return out;
    };
  };

  for (const i of workerData) {
    const opts = optionsFor(i);
    try {
      const t = Date.now();
      const city = generateCity(opts);
      slowest = Math.max(slowest, Date.now() - t);
      const svg = renderSVG(city);
      renderSVG(city, { winter: true, labels: false, factions: false });
      renderSVG(city, { view: 'relief' });
      renderSVG(city, { view: 'pentes' });
      const sheet = citySheet(city);
      if (renderSVG(generateCity(opts)) !== svg) fail('non déterministe', opts);
      if (city.wall.length < 4) fail('rempart absent', opts);
      if (city.gates.length < 2) fail('moins de 2 portes', opts);
      if (!sheet.includes('# ' + city.name)) fail('fiche incomplète', opts);
      if (!svg.startsWith('<svg') || !svg.endsWith('</svg>')) fail('SVG mal formé', opts);
      if (opts.preset === 'kades') {
        if (city.factions.length < 7) fail(`Kades : ${city.factions.length} factions`, opts);
        if (!city.islands.some(i => i.kind === 'esplanade') || !city.islands.some(i => i.kind === 'theatres')) fail('Kades : îles manquantes', opts);
        if (!city.specials.some(s => s.id === 'purificateur')) fail('Kades : pas de Purificateur', opts);
        if (!city.citadel) fail('Kades : pas de fort', opts);
      }
      if (opts.nFactions && !opts.preset) {
        if (city.factions.length < 2) fail(`${city.factions.length} faction(s) sur ${opts.nFactions}`, opts);
        if (!city.esplanade) fail('pas d\'esplanade', opts);
        if (!sheet.includes('## Factions')) fail('factions absentes de la fiche', opts);
        if (i % 9 === 1) { const G = sightGrid(city); if (!sightFrom(G, city.esplanade.c).some(Boolean)) fail('vue vide', opts); }
      }

      const houses = [...city.houses.stone, ...city.houses.timber, ...city.houses.thatch, ...city.annexes];
      const cen = houses.map(h => Geo.centroid(h));
      // Chevauchements
      const hg = new Map();
      cen.forEach((c, k) => { const key = Math.floor(c[0] / 30) + ',' + Math.floor(c[1] / 30); if (!hg.has(key)) hg.set(key, []); hg.get(key).push(k); });
      let n = 0;
      cen.forEach((c, k) => {
        const gx = Math.floor(c[0] / 30), gy = Math.floor(c[1] / 30);
        for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) for (const j of hg.get((gx + dx) + ',' + (gy + dy)) || []) if (j > k && overlaps(houses[k], houses[j])) n++;
      });
      if (n) fail(`${n} maisons qui se chevauchent`, opts);
      // Maisons sur une rue
      const streetSegs = (city.streetNet || []).flatMap(st => st.points.slice(1).map((p, k) => [st.points[k], p, city.streetHalf[st.cls] || 3]));
      const nearStreet = gridOf(streetSegs, 30);
      n = houses.filter((h, k) => nearStreet(cen[k]).some(([a, b, half]) => h.some(q => Geo.distToSegment(q, a, b) < half - 0.6) || Geo.distToSegment(cen[k], a, b) < half)).length;
      if (n) fail(`${n} maisons sur une rue`, opts);
      // Maisons dans l'eau
      const riverSegs = city.rivers.flatMap(rv => rv.points.slice(1).map((p, k) => [rv.points[k], p, rv.w]));
      const nearRiver = gridOf(riverSegs, 40);
      n = cen.filter(c => nearRiver(c).some(([a, b, w]) => Geo.distToSegment(c, a, b) < w / 2)).length;
      if (n) fail(`${n} maisons dans l'eau`, opts);
      // Maisons à cheval sur un ressaut
      const cliffSegs = city.cliffs.flatMap(cl => cl.points.slice(1).map((p, k) => [cl.points[k], p]));
      const nearCliff = gridOf(cliffSegs, 40);
      n = houses.filter((h, k) => nearCliff(cen[k]).some(([a, b]) => h.some((p, m) => cross(p, h[(m + 1) % h.length], a, b)))).length;
      if (n) fail(`${n} maisons à cheval sur un ressaut`, opts);
      // Grandes routes : le rempart n'est franchi qu'aux portes
      const wallSegs = city.wall.map((p, k) => [p, city.wall[(k + 1) % city.wall.length]]);
      let bad = 0;
      for (const st of city.streetNet.filter(s => s.cls === 'main' || s.cls === 'road')) {
        for (let k = 0; k + 1 < st.points.length; k++) for (const [a, b] of wallSegs) {
          if (!cross(st.points[k], st.points[k + 1], a, b)) continue;
          const m = st.points[k];
          // Toléré : la route de la citadelle passe le mur commun là où la citadelle s'adosse au rempart
          const atCitadel = (st.kind || '').startsWith('citadel') && city.citadel && city.citadel.edges.some(([p, q]) => Geo.distToSegment(m, p, q) < 25);
          if (!atCitadel && !city.gates.some(g => Math.hypot(g.at[0] - m[0], g.at[1] - m[1]) < 20)) bad++;
        }
      }
      if (bad) fail(`${bad} traversées du rempart hors des portes`, opts);
      // Petites rues : pas de traversée de rivière
      bad = 0;
      for (const st of city.streetNet.filter(s => s.cls === 'rue' || s.cls === 'ruelle')) {
        for (let k = 0; k + 1 < st.points.length; k++) for (const [a, b] of nearRiver(st.points[k], 1)) if (cross(st.points[k], st.points[k + 1], a, b)) bad++;
      }
      if (bad) fail(`${bad} petites rues qui traversent une rivière`, opts);
    } catch (e) {
      fail('exception : ' + (e.stack || e.message).split('\n').slice(0, 3).join(' | '), opts);
    }
  }
  parentPort.postMessage({ failures, slowest });
}
