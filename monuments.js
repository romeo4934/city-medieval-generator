'use strict';
/* Dessin des bâtiments importants dans leur enclos (cathédrale, château, palais…). Dépend de geo.js. */

function drawMonument(b, yard, rand, c, K) {
  const { city, cellEdges, ek, unkey, verts, riverEdgeW } = K;
  const S = { id: b.id, label: b.label, minor: !!b.minor, district: c.district, inner: !!c.inner, yard: [yard], yardColor: 'court', shapes: [] };
  const [ctr, ir] = inradius(yard);
  const label = { at: ctr, text: b.label, small: !!b.minor };
  const fill = color => ({ fill: color, stroke: 1.1 });
  switch (b.id) {
    case 'temple': {
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
    case 'palais': case 'universite': case 'hospice': case 'caserne': case 'monastere': {
      const color = { palais: 'noble', universite: 'school', hospice: 'temple', caserne: 'military', monastere: 'temple' }[b.id];
      S.shapes.push({ polys: [Geo.scale(yard, 0.72), Geo.scale(yard, 0.42)], fill: color, stroke: 1.1, evenodd: true });
      if (b.id === 'monastere') S.shapes.push({ polys: [rect([ctr[0], ctr[1] - ir * 0.95], [1, 0], ir * 0.9, ir * 0.28)], fill: 'temple', stroke: 1.1 });
      if (b.id === 'monastere' || b.id === 'hospice') S.shapes.push({ polys: [Geo.scale(yard, 0.36)], fill: 'green' });
      break;
    }
    case 'guildes': case 'prison': case 'bains': {
      const color = { guildes: 'guild', prison: 'military', bains: 'baths' }[b.id];
      S.shapes.push({ polys: [Geo.scale(yard, 0.55)], fill: color, stroke: 1.2 });
      break;
    }
    case 'arene':
      S.shapes.push({ polys: [circle(ctr, ir * 0.85)], fill: 'stone', stroke: 1.2 });
      S.shapes.push({ polys: [circle(ctr, ir * 0.5)], fill: 'sand', stroke: 0.8 });
      break;
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
      S.yardColor = 'quay';
      const rk = cellEdges(c).map(([a, b2]) => ek(a, b2)).find(k => riverEdgeW.has(k));
      let dir = [1, 0];
      if (rk) { const [a, b2] = unkey(rk); dir = norm([verts[b2][0] - verts[a][0], verts[b2][1] - verts[a][1]]); }
      const ware = stripCut(Geo.inset(yard, 8), [-dir[1], dir[0]], [9, 14], rand).filter((_, i) => i % 2 === 0);
      S.shapes.push({ polys: ware.map(p => Geo.inset(p, 1)).filter(p => p.length >= 3), fill: 'tile', stroke: 0.8 });
      break;
    }
    case 'sanctuaire': {
      S.yardColor = 'green';
      const r = Math.min(ir * 0.8, 16);
      S.shapes.push({ polys: [rect(ctr, [1, 0], r * 1.5, r * 0.8)], fill: 'temple', stroke: 1.1 });
      const cols = [];
      for (let i = 0; i < 6; i++) for (const sy of [-1, 1]) cols.push(circle([ctr[0] - r * 0.6 + i * r * 0.24, ctr[1] + sy * r * 0.48], 0.9, 8));
      S.shapes.push({ polys: cols, fill: 'stone', stroke: 0.4 });
      S.yard = [Geo.scale(yard, 0.75)];
      label.at = [ctr[0], ctr[1] + r * 0.9];
      label.italic = true;
      break;
    }
    // Grands enclos (enclosures.js n'existe pas : tout est ici) — repères dans le local de l'enclos
    case 'couvent': case 'hotel': case 'college': {
      const u = norm([yard[1][0] - yard[0][0], yard[1][1] - yard[0][1]]), v = [-u[1], u[0]];
      const L = Math.hypot(yard[1][0] - yard[0][0], yard[1][1] - yard[0][1]), W = Math.hypot(yard[2][0] - yard[1][0], yard[2][1] - yard[1][1]);
      const at = (x, y) => [ctr[0] + u[0] * x + v[0] * y, ctr[1] + u[1] * x + v[1] * y];
      const box = (x, y, l, w, ax = u) => rect(at(x, y), ax, l, w);
      if (b.id === 'couvent') {
        // Clos du couvent : jardins, église le long d'un côté, cloître carré accolé, potager en planches
        S.yardColor = 'garden';
        S.shapes.push({ polys: [yard], fill: 'none', stroke: 1.8, strokeColor: 'buildingLine' });
        S.shapes.push({ polys: [box(-L * 0.12, -W * 0.3, L * 0.62, W * 0.2)], fill: 'temple', stroke: 1.1 });
        const q = Math.min(L * 0.3, W * 0.42);
        S.shapes.push({ polys: [box(-L * 0.2, W * 0.05, q, q), box(-L * 0.2, W * 0.05, q * 0.56, q * 0.56)], fill: 'temple', stroke: 1, evenodd: true });
        S.shapes.push({ polys: [box(-L * 0.2, W * 0.05, q * 0.56, q * 0.56)], fill: 'green' });
        S.shapes.push({ lines: [0, 1, 2, 3, 4, 5].map(k => [at(L * 0.12, -W * 0.36 + k * W * 0.13), at(L * 0.42, -W * 0.36 + k * W * 0.13)]), stroke: 0.6 });
        label.at = at(L * 0.27, W * 0.42);
      } else if (b.id === 'hotel') {
        // Hôtel : cour d'honneur sur la rue, corps de logis au fond, deux ailes, jardin derrière
        S.shapes.push({ polys: [box(0, W * 0.3, L * 0.9, W * 0.36)], fill: 'green' });
        S.shapes.push({ lines: [[at(-L * 0.35, W * 0.3), at(L * 0.35, W * 0.3)], [at(0, W * 0.15), at(0, W * 0.45)]], stroke: 0.5 });
        S.shapes.push({ polys: [box(0, W * 0.02, L * 0.78, W * 0.22), box(-L * 0.33, -W * 0.22, L * 0.12, W * 0.32), box(L * 0.33, -W * 0.22, L * 0.12, W * 0.32)], fill: 'noble', stroke: 1.1, outline: true });
        S.shapes.push({ polys: [yard], fill: 'none', stroke: 1.4, strokeColor: 'buildingLine' });
        label.at = at(0, -W * 0.3);
      } else {
        // Collège : bâtiments autour d'une cour carrée, chapelle à part
        S.shapes.push({ polys: [box(-L * 0.08, 0, L * 0.7, W * 0.8), box(-L * 0.08, 0, L * 0.44, W * 0.46)], fill: 'school', stroke: 1.1, evenodd: true });
        S.shapes.push({ polys: [box(L * 0.38, -W * 0.15, L * 0.16, W * 0.5)], fill: 'temple', stroke: 1.1 });
        label.at = at(0, W * 0.5);
      }
      break;
    }
    case 'moulin':
      S.yardColor = 'field1';
      S.shapes.push({ polys: [circle(ctr, 6, 16)], fill: 'building', stroke: 1 });
      S.shapes.push({ lines: [0, 1, 2, 3].map(i => { const a = Math.PI / 4 + (i * Math.PI) / 2; return [ctr, [ctr[0] + Math.cos(a) * 15, ctr[1] + Math.sin(a) * 15]]; }), stroke: 2 });
      label.at = [ctr[0], ctr[1] + 24];
      break;
  }
  city.specials.push(S);
  city.labels.push(label);
}
