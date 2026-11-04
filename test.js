'use strict';
/*
 * Tests sans dépendance :   node test.js        (ou   node test.js 200   pour plus de villes)
 * Vérifie sur des villes variées : pas d'erreur, même graine = même ville, pas de maisons qui se
 * chevauchent, portes et remparts présents, fiche générée.
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ctx = {};
vm.createContext(ctx);
for (const f of ['geo.js', 'catalog.js', 'generator.js', 'lore.js', 'render.js']) {
  vm.runInContext(fs.readFileSync(path.join(__dirname, f), 'utf8'), ctx, { filename: f });
}
vm.runInContext('this.api = { generateCity, renderSVG, citySheet, BUILDINGS, Geo }', ctx);
const { generateCity, renderSVG, citySheet, BUILDINGS, Geo } = ctx.api;

const COUNT = Number(process.argv[2]) || 60;
const sizes = ['petite', 'moyenne', 'grande', 'capitale'];
const reliefs = ['plaine', 'colline', 'collines', 'vallee'];
const rivers = ['non', 'oui', 'deux', 'auto'];
const ages = ['jeune', 'ancienne', 'tresancienne', 'auto'];
const all = BUILDINGS.map(b => b.id);

let failures = 0;
const fail = (msg, o) => { failures++; console.log('ÉCHEC', msg, JSON.stringify(o)); };

// Deux polygones convexes se chevauchent-ils (de plus de 0,5 m) ?
const overlaps = (a, b) => {
  for (const P of [a, b]) for (let i = 0; i < P.length; i++) {
    const A = P[i], B = P[(i + 1) % P.length], nx = -(B[1] - A[1]), ny = B[0] - A[0];
    const len = Math.hypot(nx, ny);
    if (len < 1e-6) continue;
    let a0 = Infinity, a1 = -Infinity, b0 = Infinity, b1 = -Infinity;
    for (const q of a) { const v = q[0] * nx + q[1] * ny; a0 = Math.min(a0, v); a1 = Math.max(a1, v); }
    for (const q of b) { const v = q[0] * nx + q[1] * ny; b0 = Math.min(b0, v); b1 = Math.max(b1, v); }
    if (a1 <= b0 + 0.5 * len || b1 <= a0 + 0.5 * len) return false;
  }
  return true;
};

const t0 = Date.now();
let slowest = 0;
for (let i = 0; i < COUNT; i++) {
  const opts = {
    seed: 'test' + i, size: sizes[i % 4], relief: reliefs[(i >> 2) % 4], river: rivers[(i >> 4) % 4], age: ages[(i >> 1) % 4],
    buildings: i % 3 ? all : ['temple', 'chateau'],
  };
  try {
    const t = Date.now();
    const city = generateCity(opts);
    slowest = Math.max(slowest, Date.now() - t);
    const svg = renderSVG(city);
    const sheet = citySheet(city);

    // Même graine, même ville
    if (renderSVG(generateCity(opts)) !== svg) fail('non déterministe', opts);
    if (city.wall.length < 4) fail('rempart absent', opts);
    if (city.gates.length < 2) fail('moins de 2 portes', { ...opts, gates: city.gates.length });
    if (!sheet.includes('# ' + city.name)) fail('fiche incomplète', opts);
    if (!svg.startsWith('<svg') || !svg.endsWith('</svg>')) fail('SVG mal formé', opts);

    // Aucune maison ne doit en chevaucher une autre
    const houses = [...city.houses.stone, ...city.houses.timber, ...city.houses.thatch, ...city.annexes];
    const cen = houses.map(h => Geo.centroid(h));
    const grid = new Map();
    cen.forEach((c, k) => { const key = Math.floor(c[0] / 30) + ',' + Math.floor(c[1] / 30); if (!grid.has(key)) grid.set(key, []); grid.get(key).push(k); });
    let overlapsFound = 0;
    cen.forEach((c, k) => {
      const gx = Math.floor(c[0] / 30), gy = Math.floor(c[1] / 30);
      for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) for (const j of grid.get((gx + dx) + ',' + (gy + dy)) || []) {
        if (j > k && overlaps(houses[k], houses[j])) overlapsFound++;
      }
    });
    if (overlapsFound) fail('maisons qui se chevauchent', { ...opts, overlapsFound });
  } catch (e) {
    fail('exception : ' + e.message, opts);
  }
}
console.log(`${COUNT} villes en ${((Date.now() - t0) / 1000).toFixed(1)} s (la plus lente : ${slowest} ms) — ${failures ? failures + ' échec(s)' : 'tout est bon'}`);
process.exit(failures ? 1 : 0);
