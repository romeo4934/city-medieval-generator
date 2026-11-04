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
  dryMoat: '#d4d3b4',
  dryMoatLine: '#aea883',
  inn: '#a8573f',
  church: '#b3a6c2',
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
// Lissage léger d'une ligne (pour écrire les noms de rues le long des courbes)
const smoothLine = pts => {
  let p = pts;
  for (let it = 0; it < 2; it++) {
    const o = [p[0]];
    for (let i = 0; i + 1 < p.length; i++) {
      const a = p[i], b = p[i + 1];
      o.push([a[0] * 0.75 + b[0] * 0.25, a[1] * 0.75 + b[1] * 0.25], [a[0] * 0.25 + b[0] * 0.75, a[1] * 0.25 + b[1] * 0.75]);
    }
    o.push(p[p.length - 1]);
    p = o;
  }
  return p;
};

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
    .small{font-size:${z(fs * 0.68)};fill:${COLORS.ink};text-anchor:middle;dominant-baseline:middle;paint-order:stroke;stroke:#fff;stroke-width:${z(fs / 5)};stroke-linejoin:round}
    .inn{font-size:${z(fs * 0.62)};font-style:italic;fill:#7a3a26;text-anchor:middle;dominant-baseline:middle;paint-order:stroke;stroke:#fff;stroke-width:${z(fs / 5)};stroke-linejoin:round}
    .st-main{font-size:${z(fs * 0.62)};fill:#4a4036;letter-spacing:.03em}
    .st-rue{font-size:${z(fs * 0.5)};fill:#5b5044}
    .st-ruelle{font-size:${z(fs * 0.42)};fill:#6b604f;font-style:italic}
    .st-road{font-size:${z(fs * 0.55)};fill:#6b604f;font-style:italic}
    .st{paint-order:stroke;stroke:${COLORS.street};stroke-width:${z(fs / 6)};stroke-linejoin:round;dominant-baseline:middle}
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

  // Fossé en anneau autour du rempart : en eau ou à sec. Tracé comme un trait large centré sur le
  // rempart, puis la berme (bande de terre au pied du mur) ; l'intérieur est ensuite recouvert par la ville.
  if (city.moat) {
    const H = city.moat.outer, wallD = pathD([city.wall]);
    const edge = city.moat.water ? COLORS.waterLine : COLORS.dryMoatLine, body = city.moat.water ? COLORS.water : COLORS.dryMoat;
    out.push(`<path d="${wallD}" fill="none" stroke="${edge}" stroke-width="${n1(2 * H + 3)}" stroke-linejoin="round"/>`);
    out.push(`<path d="${wallD}" fill="none" stroke="${body}" stroke-width="${n1(2 * H)}" stroke-linejoin="round"/>`);
    out.push(`<path d="${wallD}" fill="none" stroke="${COLORS.meadow}" stroke-width="${n1(2 * (H - city.moat.width))}" stroke-linejoin="round"/>`);
  }

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

  // Églises de paroisse : cimetière, nef, abside à l'est, clocher à l'ouest
  for (const ch of city.churches) {
    fill(ch.tombs, 'tomb');
    out.push(`<path d="${pathD([ch.nave, ch.apse, ch.tower])}" fill="none" stroke="${COLORS.buildingLine}" stroke-width="2.2" stroke-linejoin="round"/>`);
    fill([ch.nave, ch.apse], 'church');
    fill([ch.tower], 'church', ` stroke="${COLORS.buildingLine}" stroke-width="1.1"`);
  }
  // Auberges
  fill(city.inns.map(i => i.poly), 'inn', ` stroke="${COLORS.buildingLine}" stroke-width="1"`);

  // Courbes de niveau par-dessus la ville, très discrètes
  if (contourD) out.push(`<path d="${contourD}" fill="none" stroke="${COLORS.contour}" stroke-opacity=".22" stroke-width="1.1"/>`);

  // Anciennes enceintes : seuls les tronçons encore debout sont dessinés (les démolis sont devenus boulevards)
  const standing = city.oldWalls.filter(w => w.standing);
  if (standing.length) {
    // Une brèche (rue qui traverse) raccourcit le mur de quelques mètres à cet endroit
    const cut = (p, q, k) => { const L = Math.hypot(q[0] - p[0], q[1] - p[1]) || 1, t = Math.min(0.45, 5 / L); return [p[0] + (q[0] - p[0]) * t * k, p[1] + (q[1] - p[1]) * t * k]; };
    out.push(`<path d="${standing.map(w => lineD([w.breachA ? cut(w.a, w.b, 1) : w.a, w.breachB ? cut(w.b, w.a, 1) : w.b])).join('')}" fill="none" stroke="${COLORS.oldWall}" stroke-width="5" stroke-linecap="butt"/>`);
    const placed = [];
    for (const w of standing) for (const [p, br] of [[w.a, w.breachA], [w.b, w.breachB]]) {
      if (br || placed.some(t => Math.hypot(p[0] - t[0], p[1] - t[1]) < 30)) continue;
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
  // Ponts sur le fossé, devant chaque porte
  const wc = city.wall.reduce((a, p) => [a[0] + p[0] / city.wall.length, a[1] + p[1] / city.wall.length], [0, 0]);
  if (city.moat) for (const g of city.gates) {
    let ox = g.at[0] - wc[0], oy = g.at[1] - wc[1];
    const L = Math.hypot(ox, oy) || 1; ox /= L; oy /= L;
    const len = city.moat.outer + 4, ang = (Math.atan2(oy, ox) * 180) / Math.PI;
    out.push(`<rect x="0" y="-5" width="${n1(len)}" height="10" fill="${COLORS.street}" stroke="${COLORS.buildingLine}" stroke-width="1.2" transform="translate(${n1(g.at[0])} ${n1(g.at[1])}) rotate(${n1(ang)})"/>`);
  }
  out.push(`<path d="${pathD([city.wall])}" fill="none" stroke="${COLORS.wall}" stroke-width="7" stroke-linejoin="round"/>`);
  // Tours : à chaque angle et tous les ~38 m, en saillie vers l'extérieur (demi-cercle hors du mur)
  {
    const W = city.wall, n = W.length, towers = [];
    const area = W.reduce((acc, p, i) => acc + p[0] * W[(i + 1) % n][1] - W[(i + 1) % n][0] * p[1], 0);
    const sg = area > 0 ? -1 : 1;   // signe de la normale extérieure
    const near = (p, list, d) => list.some(q => Math.hypot(p[0] - q[0], p[1] - q[1]) < d);
    const gatePts = city.gates.map(g => g.at);
    for (let i = 0; i < n; i++) {
      const A = W[i], B = W[(i + 1) % n], L = Math.hypot(B[0] - A[0], B[1] - A[1]);
      if (L < 1) continue;
      const nx = (-(B[1] - A[1]) / L) * sg, ny = ((B[0] - A[0]) / L) * sg;
      const steps = Math.max(1, Math.round(L / 38));
      for (let k = 0; k < steps; k++) {
        const t = k / steps, p = [A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t];
        if (near(p, gatePts, 18) || near(p, towers, 22)) continue;
        towers.push(p);
        out.push(`<circle cx="${n1(p[0] + nx * 2.5)}" cy="${n1(p[1] + ny * 2.5)}" r="6" fill="${COLORS.wall}"/>`);
      }
    }
  }
  gateMarks(city.gates, 12, COLORS.wall);

  // Portes d'eau : arche au-dessus de la rivière, tours sur chaque berge, herse
  for (const g of city.waterGates) {
    const [dx, dy] = g.dir, nx = -dy, ny = dx, h = g.w / 2;
    const ang = (Math.atan2(dy, dx) * 180) / Math.PI;
    out.push(`<rect x="-7" y="${n1(-h)}" width="14" height="${n1(g.w)}" fill="${COLORS.water}" transform="translate(${n1(g.at[0])} ${n1(g.at[1])}) rotate(${n1(ang)})"/>`);
    out.push(`<path d="M${n1(g.at[0] - nx * h)} ${n1(g.at[1] - ny * h)}L${n1(g.at[0] + nx * h)} ${n1(g.at[1] + ny * h)}" stroke="${COLORS.wall}" stroke-width="1.6" stroke-dasharray="2 2"/>`);
    for (const sgn of [-1, 1]) {
      out.push(`<rect x="-6" y="-6" width="12" height="12" fill="${COLORS.wall}" transform="translate(${n1(g.at[0] + nx * (h + 5) * sgn)} ${n1(g.at[1] + ny * (h + 5) * sgn)}) rotate(${n1(ang)})"/>`);
    }
  }

  // Étiquettes : placement sans chevauchement (les plus importantes d'abord)
  const boxes = [];
  const hit = b => boxes.some(o => b[0] < o[2] && b[2] > o[0] && b[1] < o[3] && b[3] > o[1]);
  const boxOf = (x, y, text, size) => { const w = text.length * size * 0.55, h = size * 1.25; return [x - w / 2, y - h / 2, x + w / 2, y + h / 2]; };
  const place = (x, y, text, size, mustShow) => {
    const h = size * 1.3, w = text.length * size * 0.55;
    for (const [ox, oy] of [[0, 0], [0, -h], [0, h], [w * 0.6, 0], [-w * 0.6, 0], [0, -2 * h], [0, 2 * h], [w * 0.6, -h], [-w * 0.6, h]]) {
      const b = boxOf(x + ox, y + oy, text, size);
      if (!hit(b)) { boxes.push(b); return [x + ox, y + oy]; }
    }
    if (!mustShow) return null;
    boxes.push(boxOf(x, y, text, size));
    return [x, y];
  };
  const textAt = (cls, size, l, must) => {
    const p = place(l.at[0], l.at[1], l.text, size, must);
    if (p) out.push(`<text class="${cls}" x="${n1(p[0])}" y="${n1(p[1])}">${esc(l.text)}</text>`);
  };
  for (const l of city.labels) textAt(l.italic ? 'qtr' : 'lbl', l.italic ? fs * 1.15 : fs, l, true);
  for (const d of city.districts) textAt('qtr', fs * 1.15, { at: d.at, text: d.name }, true);
  for (const g of city.gateNames) textAt('gate', fs * 0.8, g, true);
  for (const sq of city.squares) textAt('small', fs * 0.68, { at: [sq.at[0], sq.at[1] + fs * 0.9], text: sq.name }, false);
  for (const ch of city.churches) textAt('small', fs * 0.68, { at: ch.at, text: ch.name }, false);
  for (const inn of city.inns) textAt('inn', fs * 0.62, { at: [inn.at[0], inn.at[1] - fs * 0.9], text: inn.name }, false);

  // Noms de rues, écrits le long de la rue (dans le sens de la lecture)
  const stSize = { main: fs * 0.62, rue: fs * 0.5, ruelle: fs * 0.42, road: fs * 0.55 };
  const stPaths = [], stTexts = [];
  city.streetLabels.forEach((sl, k) => {
    let pts = sl.points.length > 2 ? smoothLine(sl.points) : sl.points;
    if (pts[pts.length - 1][0] < pts[0][0]) pts = pts.slice().reverse();
    let L = 0;
    for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    const size = stSize[sl.cls] || fs * 0.5, tw = sl.name.length * size * 0.52;
    if (tw > L * 0.85) return;
    // Cases occupées par le texte, prises autour du milieu de la rue
    const samples = [];
    let acc = 0;
    for (let i = 1; i < pts.length; i++) {
      const sl2 = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
      for (let t = 0; t < sl2; t += size) {
        const pos = acc + t;
        if (Math.abs(pos - L / 2) <= tw / 2) {
          const x = pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * (t / sl2), y = pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * (t / sl2);
          samples.push([x - size * 0.5, y - size * 0.5, x + size * 0.5, y + size * 0.5]);
        }
      }
      acc += sl2;
    }
    if (samples.some(hit)) return;
    samples.forEach(b => boxes.push(b));
    stPaths.push(`<path id="cmg-st-${k}" d="${lineD(pts)}"/>`);
    stTexts.push(`<text class="st st-${sl.cls}"><textPath href="#cmg-st-${k}" startOffset="50%" text-anchor="middle">${esc(sl.name)}</textPath></text>`);
  });
  if (stPaths.length) out.push(`<defs>${stPaths.join('')}</defs>`, ...stTexts);

  // Titre
  const ts = E / 16;
  out.push(`<text x="0" y="${n1(-E + ts * 1.4)}" font-size="${n1(ts)}" text-anchor="middle" fill="${COLORS.ink}" paint-order="stroke" stroke="${COLORS.land}" stroke-width="${n1(ts / 5)}" stroke-linejoin="round">${esc(city.name)}</text>`);

  // Légende des toits
  const lx = E - E * 0.3, ly = E - E * 0.17, sw = fs * 0.9;
  out.push(`<rect x="${n1(lx - sw * 0.6)}" y="${n1(ly - sw * 2.6)}" width="${n1(E * 0.27)}" height="${n1(sw * 6.7)}" rx="4" fill="${COLORS.land}" fill-opacity=".85"/>`);
  [['tile', 'Tuile (colombages)'], ['slate', 'Ardoise (pierre)'], ['thatch', 'Chaume'], ['inn', 'Auberge']].forEach(([k, t], i) => {
    const y = ly - sw * 1.5 + i * sw * 1.5;
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
