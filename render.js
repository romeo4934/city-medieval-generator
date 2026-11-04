'use strict';
/* Dessin d'une ville (objet produit par generateCity) en SVG autonome. */

const COLORS = {
  land: '#e9e5d6',
  field1: '#dde2c2',
  field2: '#e5e3c4',
  field3: '#d8dcbc',
  fieldLine: '#c9c8a4',
  lotLine: '#c7bea8',
  fence: '#9a8d76',
  tree: '#b7c294',
  treeLine: '#8a9666',
  stall: '#d9b98e',
  meadow: '#dfe0c5',
  vine: '#d3d6b0',
  vineDot: '#8f9a63',
  terrace: '#d8dcb8',
  green: '#cdd8ad',
  street: '#f7f4ec',
  roadEdge: '#bdb29b',
  court: '#e4ddcd',
  yard: '#e2dcc6',
  garden: '#dcdcbf',
  citadel: '#dcd6ca',
  castleYard: '#d3cec4',
  quay: '#d9d6cb',
  plaza: '#f2ecdc',
  // toits
  slate: '#9ea5ab',
  tile: '#c79a80',
  thatch: '#d9c88f',
  building: '#c6b595',
  buildingLine: '#5f5446',
  annex: '#cbbfa6',
  ridge: '#5f5446',
  // bâtiments importants
  temple: '#a99bb8',
  noble: '#c99a73',
  guild: '#c2a46b',
  school: '#9fb59c',
  military: '#9a948c',
  baths: '#8fb7c9',
  stone: '#cfc6b4',
  sand: '#eadbb5',
  tomb: '#7f7a6d',
  castle: '#8f8a84',
  // eau, relief, murs
  water: '#a9c9dc',
  waterLine: '#7ea8c0',
  contour: '#a8946a',
  wall: '#4a433c',
  oldWall: '#625a52',
  district: '#8a7d66',
  ink: '#2f2a24',
};

const n1 = v => (Math.round(v * 10) / 10).toString();
const pathD = polys => polys.map(p => 'M' + p.map(q => n1(q[0]) + ' ' + n1(q[1])).join('L') + 'Z').join('');
const lineD = pts => 'M' + pts.map(q => n1(q[0]) + ' ' + n1(q[1])).join('L');
const esc = s => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const col = c => (c === 'none' ? 'none' : COLORS[c] || c);

function renderSVG(city) {
  const E = city.E;
  const out = [];
  const fs = E / 38;
  const z = k => `calc(var(--z, 1) * ${n1(k)}px)`;  // --z : zoom de l'interface, garde les étiquettes lisibles
  const fill = (polys, color, extra = '') => polys.length && out.push(`<path d="${pathD(polys)}" fill="${col(color)}"${extra}/>`);

  out.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${n1(-E)} ${n1(-E)} ${n1(2 * E)} ${n1(2 * E)}" font-family="Georgia, 'Times New Roman', serif">`);
  out.push(`<style>
    .lbl{font-size:${z(fs)};fill:${COLORS.ink};text-anchor:middle;dominant-baseline:middle;paint-order:stroke;stroke:#fff;stroke-width:${z(fs / 4)};stroke-linejoin:round}
    .qtr{font-size:${z(fs * 1.15)};font-style:italic;fill:#5b4f3d;text-anchor:middle;dominant-baseline:middle;paint-order:stroke;stroke:${COLORS.street};stroke-width:${z(fs / 3)};stroke-linejoin:round;letter-spacing:.04em}
    .gate{font-size:${z(fs * 0.8)};fill:${COLORS.ink};text-anchor:middle;dominant-baseline:middle;paint-order:stroke;stroke:${COLORS.land};stroke-width:${z(fs / 4)};stroke-linejoin:round}
    .leg{font-size:${n1(fs * 0.85)}px;fill:${COLORS.ink};dominant-baseline:middle}
  </style>`);
  out.push(`<defs><pattern id="cmg-vines" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(30)"><rect width="7" height="7" fill="${COLORS.vine}"/><circle cx="3.5" cy="3.5" r="1.1" fill="${COLORS.vineDot}"/></pattern></defs>`);

  // Sol, champs, prés, vignes
  out.push(`<rect x="${n1(-E)}" y="${n1(-E)}" width="${n1(2 * E)}" height="${n1(2 * E)}" fill="${COLORS.land}"/>`);
  // Champs en lanières : trois cultures, sillons visibles
  ['field1', 'field2', 'field3'].forEach((k, i) => fill(city.fieldStrips[i], k, ` stroke="${COLORS.fieldLine}" stroke-width="0.6"`));
  fill(city.meadows, 'meadow');
  fill(city.suburbGround, 'garden');
  fill(city.vineyards, 'url(#cmg-vines)');

  // Courbes de niveau sous la ville
  const contourD = city.contours.map(segs => segs.map(s => lineD(s)).join('')).join('');
  if (contourD) out.push(`<path d="${contourD}" fill="none" stroke="${COLORS.contour}" stroke-opacity=".55" stroke-width="1.3"/>`);

  // Sol pavé intra-muros (les rues = ce qui reste visible entre les îlots)
  fill([city.wall], 'street');

  // Rivières : berge puis eau
  const riverD = city.rivers.map(rv => lineD(rv.points));
  city.rivers.forEach((rv, k) => out.push(`<path d="${riverD[k]}" fill="none" stroke="${COLORS.waterLine}" stroke-width="${n1(rv.w + 3)}" stroke-linecap="round" stroke-linejoin="round"/>`));
  city.rivers.forEach((rv, k) => out.push(`<path d="${riverD[k]}" fill="none" stroke="${COLORS.water}" stroke-width="${n1(rv.w)}" stroke-linecap="round" stroke-linejoin="round"/>`));

  // Routes
  const roadsD = city.roads.map(lineD).join('');
  out.push(`<path d="${roadsD}" fill="none" stroke="${COLORS.roadEdge}" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/>`);
  out.push(`<path d="${roadsD}" fill="none" stroke="${COLORS.street}" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>`);
  for (const b of city.bridges) {
    out.push(`<rect x="${n1(-b.length / 2)}" y="-6" width="${n1(b.length)}" height="12" fill="${COLORS.street}" stroke="${COLORS.buildingLine}" stroke-width="1.5" transform="translate(${n1(b.x)} ${n1(b.y)}) rotate(${n1(b.angle)})"/>`);
  }

  // Îlots : cours, jardins, terrasses, limites de parcelles
  fill(city.ground.court, 'court');
  fill(city.ground.yard, 'yard');
  fill(city.ground.garden, 'garden');
  fill(city.terraces, 'url(#cmg-vines)');
  if (city.lotLines.length) out.push(`<path d="${city.lotLines.map(lineD).join('')}" stroke="${COLORS.lotLine}" stroke-width="0.5"/>`);
  if (city.fences.length) out.push(`<path d="${city.fences.map(lineD).join('')}" stroke="${COLORS.fence}" stroke-width="1"/>`);
  fill(city.annexes, 'annex', ` stroke="${COLORS.buildingLine}" stroke-width="0.4"`);
  for (const [x, y, r] of city.trees) out.push(`<circle cx="${n1(x)}" cy="${n1(y)}" r="${n1(r)}" fill="${COLORS.tree}" stroke="${COLORS.treeLine}" stroke-width="0.5"/>`);

  // Maisons : la couleur du toit dit le matériau (ardoise, tuile, chaume)
  for (const roof of ['tile', 'slate', 'thatch']) {
    fill(city.roofs[roof], roof, ` stroke="${COLORS.buildingLine}" stroke-width="0.5" stroke-linejoin="round"`);
  }
  // Maisons de pierre : trait plus épais
  fill(city.houses.stone, 'none', ` stroke="${COLORS.buildingLine}" stroke-width="1" stroke-linejoin="round"`);
  if (city.ridges.length) out.push(`<path d="${city.ridges.map(lineD).join('')}" stroke="${COLORS.ridge}" stroke-opacity=".55" stroke-width="0.6"/>`);

  // Place du marché
  fill(city.plaza, 'plaza', ` stroke="${COLORS.roadEdge}" stroke-width="1"`);
  fill(city.stalls, 'stall', ` stroke="${COLORS.buildingLine}" stroke-width="0.5"`);
  for (const [x, y, r] of city.wells) out.push(`<circle cx="${n1(x)}" cy="${n1(y)}" r="${n1(r)}" fill="${COLORS.water}" stroke="${COLORS.buildingLine}" stroke-width="1.2"/>`);

  // Bâtiments importants
  for (const s of city.specials) {
    fill(s.yard, s.yardColor);
    for (const sh of s.shapes) {
      if (sh.lines) {
        out.push(`<path d="${sh.lines.map(lineD).join('')}" stroke="${COLORS.buildingLine}" stroke-width="${sh.stroke}" stroke-linecap="round"/>`);
        continue;
      }
      if (!sh.polys.length) continue;
      if (sh.outline) {
        // contour commun puis remplissage : les formes qui se chevauchent n'ont qu'un seul trait extérieur
        out.push(`<path d="${pathD(sh.polys)}" fill="none" stroke="${COLORS.buildingLine}" stroke-width="${sh.stroke * 2}" stroke-linejoin="round"/>`);
        fill(sh.polys, sh.fill);
        continue;
      }
      const stroke = sh.stroke ? ` stroke="${col(sh.strokeColor || 'buildingLine')}" stroke-width="${sh.stroke}" stroke-linejoin="round"` : '';
      fill(sh.polys, sh.fill, `${sh.evenodd ? ' fill-rule="evenodd"' : ''}${stroke}`);
    }
  }

  // Courbes de niveau par-dessus la ville, très discrètes
  if (contourD) out.push(`<path d="${contourD}" fill="none" stroke="${COLORS.contour}" stroke-opacity=".22" stroke-width="1.1"/>`);

  // Anciennes enceintes : seuls les tronçons encore debout sont dessinés (les démolis sont devenus boulevards)
  const standing = city.oldWalls.filter(w => w.standing);
  if (standing.length) {
    out.push(`<path d="${standing.map(w => lineD([w.a, w.b])).join('')}" fill="none" stroke="${COLORS.oldWall}" stroke-width="5" stroke-linecap="round"/>`);
    const placed = [];
    for (const w of standing) for (const p of [w.a, w.b]) {
      if (placed.some(t => Math.hypot(p[0] - t[0], p[1] - t[1]) < 30)) continue;
      out.push(`<circle cx="${n1(p[0])}" cy="${n1(p[1])}" r="5" fill="${COLORS.oldWall}"/>`);
      placed.push(p);
    }
  }
  const gateMarks = (list, size, color) => {
    for (const g of list) {
      const dx = g.next[0] - g.prev[0], dy = g.next[1] - g.prev[1];
      const L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L;
      const ang = (Math.atan2(uy, ux) * 180) / Math.PI;
      for (const s of [-1, 1]) {
        out.push(`<rect x="${-size / 2}" y="${-size / 2}" width="${size}" height="${size}" fill="${color}" transform="translate(${n1(g.at[0] + ux * size * 0.85 * s)} ${n1(g.at[1] + uy * size * 0.85 * s)}) rotate(${n1(ang)})"/>`);
      }
      out.push(`<rect x="${-size * 0.4}" y="${-size / 2}" width="${size * 0.8}" height="${size}" fill="${COLORS.street}" transform="translate(${n1(g.at[0])} ${n1(g.at[1])}) rotate(${n1(ang)})"/>`);
    }
  };
  gateMarks(city.oldGates, 8, COLORS.oldWall);

  // Citadelle
  if (city.citadel) {
    out.push(`<path d="${city.citadel.edges.map(lineD).join('')}" fill="none" stroke="${COLORS.wall}" stroke-width="5.5" stroke-linecap="round"/>`);
    const placed = [];
    for (const [a] of city.citadel.edges) {
      if (placed.some(t => Math.hypot(a[0] - t[0], a[1] - t[1]) < 25)) continue;
      out.push(`<circle cx="${n1(a[0])}" cy="${n1(a[1])}" r="5" fill="${COLORS.wall}"/>`);
      placed.push(a);
    }
    if (city.citadel.gate) out.push(`<circle cx="${n1(city.citadel.gate[0])}" cy="${n1(city.citadel.gate[1])}" r="4.5" fill="${COLORS.street}" stroke="${COLORS.wall}" stroke-width="2"/>`);
  }

  // Remparts, tours, portes
  out.push(`<path d="${pathD([city.wall])}" fill="none" stroke="${COLORS.wall}" stroke-width="7" stroke-linejoin="round"/>`);
  let last = null;
  const gateSet = new Set(city.gates.map(g => g.at));
  city.wall.forEach(v => {
    if (gateSet.has(v)) return;
    if (last && Math.hypot(v[0] - last[0], v[1] - last[1]) < 30) return;
    out.push(`<circle cx="${n1(v[0])}" cy="${n1(v[1])}" r="6.5" fill="${COLORS.wall}"/>`);
    last = v;
  });
  gateMarks(city.gates, 12, COLORS.wall);

  // Étiquettes
  for (const d of city.districts) out.push(`<text class="qtr" x="${n1(d.at[0])}" y="${n1(d.at[1])}">${esc(d.name)}</text>`);
  for (const l of city.labels) out.push(`<text class="${l.italic ? 'qtr' : 'lbl'}" x="${n1(l.at[0])}" y="${n1(l.at[1])}">${esc(l.text)}</text>`);
  for (const g of city.gateNames) out.push(`<text class="gate" x="${n1(g.at[0])}" y="${n1(g.at[1])}">${esc(g.text)}</text>`);

  // Titre
  const ts = E / 16;
  out.push(`<text x="0" y="${n1(-E + ts * 1.4)}" font-size="${n1(ts)}" text-anchor="middle" fill="${COLORS.ink}" paint-order="stroke" stroke="${COLORS.land}" stroke-width="${n1(ts / 5)}" stroke-linejoin="round">${esc(city.name)}</text>`);

  // Légende des toits
  const lx = E - E * 0.3, ly = E - E * 0.17, sw = fs * 0.9;
  out.push(`<rect x="${n1(lx - sw * 0.6)}" y="${n1(ly - sw * 1.1)}" width="${n1(E * 0.27)}" height="${n1(sw * 5.2)}" rx="4" fill="${COLORS.land}" fill-opacity=".85"/>`);
  [['tile', 'Tuile (colombages)'], ['slate', 'Ardoise (pierre)'], ['thatch', 'Chaume']].forEach(([k, t], i) => {
    const y = ly + i * sw * 1.5;
    out.push(`<rect x="${n1(lx)}" y="${n1(y - sw / 2)}" width="${n1(sw)}" height="${n1(sw)}" fill="${COLORS[k]}" stroke="${COLORS.buildingLine}" stroke-width="0.6"/>`);
    out.push(`<text class="leg" x="${n1(lx + sw * 1.5)}" y="${n1(y)}">${t}</text>`);
  });

  // Échelle (1 unité = 1 m)
  const sx = -E + E * 0.06, sy = E - E * 0.06;
  const bar = city.R > 300 ? 200 : 100;
  out.push(`<g stroke="${COLORS.ink}" stroke-width="2" fill="none"><path d="M${n1(sx)} ${n1(sy - 6)}V${n1(sy)}H${n1(sx + bar)}V${n1(sy - 6)}M${n1(sx + bar / 2)} ${n1(sy)}V${n1(sy - 4)}"/></g>`);
  out.push(`<text x="${n1(sx + bar / 2)}" y="${n1(sy - 12)}" font-size="${n1(E / 45)}" text-anchor="middle" fill="${COLORS.ink}">${bar} m</text>`);

  // Nord
  const cx = E - E * 0.08, cy = -E + E * 0.1, cs = E * 0.035;
  out.push(`<path d="M${n1(cx)} ${n1(cy - cs * 1.6)}L${n1(cx + cs * 0.6)} ${n1(cy + cs)}L${n1(cx)} ${n1(cy + cs * 0.5)}L${n1(cx - cs * 0.6)} ${n1(cy + cs)}Z" fill="${COLORS.ink}"/>`);
  out.push(`<text x="${n1(cx)}" y="${n1(cy - cs * 2.1)}" font-size="${n1(E / 40)}" text-anchor="middle" fill="${COLORS.ink}">N</text>`);

  out.push('</svg>');
  return out.join('\n');
}
