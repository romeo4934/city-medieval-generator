'use strict';
/* Dessin d'une ville (objet produit par generateCity) en SVG autonome. */

const COLORS = {
  land: '#e9e5d6',
  field1: '#dde2c2',
  field2: '#e5e3c4',
  garden: '#dfe0c5',
  green: '#cdd8ad',
  street: '#f7f4ec',
  roadEdge: '#bdb29b',
  block: '#e2d9c5',
  building: '#c6b595',
  buildingLine: '#6d604c',
  plaza: '#f2ecdc',
  quay: '#d9d6cb',
  temple: '#a99bb8',
  noble: '#c99a73',
  guild: '#c2a46b',
  school: '#9fb59c',
  military: '#9a948c',
  baths: '#8fb7c9',
  stone: '#cfc6b4',
  sand: '#eadbb5',
  tomb: '#7f7a6d',
  castleYard: '#d3cec4',
  castle: '#8f8a84',
  water: '#a9c9dc',
  waterLine: '#7ea8c0',
  contour: '#c4b890',
  wall: '#4a433c',
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
  out.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${n1(-E)} ${n1(-E)} ${n1(2 * E)} ${n1(2 * E)}" font-family="Georgia, 'Times New Roman', serif">`);
  // --z = zoom de l'interface (1 = carte entière) : garde les étiquettes lisibles quand on zoome
  const z = k => `calc(var(--z, 1) * ${n1(k)}px)`;
  out.push(`<style>
    .lbl{font-size:${z(fs)};fill:${COLORS.ink};text-anchor:middle;dominant-baseline:middle;paint-order:stroke;stroke:#fff;stroke-width:${z(fs / 4)};stroke-linejoin:round}
    .qtr{font-size:${z(fs * 1.15)};font-style:italic;fill:#5b4f3d;text-anchor:middle;dominant-baseline:middle;paint-order:stroke;stroke:${COLORS.street};stroke-width:${z(fs / 3)};stroke-linejoin:round;letter-spacing:.04em}
    .gate{font-size:${z(fs * 0.8)};fill:${COLORS.ink};text-anchor:middle;dominant-baseline:middle;paint-order:stroke;stroke:${COLORS.land};stroke-width:${z(fs / 4)};stroke-linejoin:round}
  </style>`);

  // Sol, relief, champs, jardins
  out.push(`<rect x="${n1(-E)}" y="${n1(-E)}" width="${n1(2 * E)}" height="${n1(2 * E)}" fill="${COLORS.land}"/>`);
  out.push(`<path d="${pathD(city.fields[0])}" fill="${COLORS.field1}"/>`);
  out.push(`<path d="${pathD(city.fields[1])}" fill="${COLORS.field2}"/>`);
  out.push(`<path d="${pathD(city.gardens)}" fill="${COLORS.garden}"/>`);
  if (city.hill) {
    out.push(`<path d="${pathD(city.hill.contours)}" fill="none" stroke="${COLORS.contour}" stroke-width="2"/>`);
  }

  // Sol pavé intra-muros (les rues = ce qui reste visible entre les îlots)
  out.push(`<path d="${pathD([city.wall])}" fill="${COLORS.street}"/>`);

  // Rivières
  for (const { P0, dir, nr, w } of city.rivers) {
    const L = E * 3, h = w / 2;
    const band = [
      [P0[0] - dir[0] * L + nr[0] * h, P0[1] - dir[1] * L + nr[1] * h],
      [P0[0] + dir[0] * L + nr[0] * h, P0[1] + dir[1] * L + nr[1] * h],
      [P0[0] + dir[0] * L - nr[0] * h, P0[1] + dir[1] * L - nr[1] * h],
      [P0[0] - dir[0] * L - nr[0] * h, P0[1] - dir[1] * L - nr[1] * h],
    ];
    out.push(`<path d="${pathD([band])}" fill="${COLORS.water}"/>`);
    out.push(`<path d="${lineD([band[0], band[1]])}${lineD([band[2], band[3]])}" stroke="${COLORS.waterLine}" stroke-width="1.5" fill="none"/>`);
  }
  // Repeindre l'eau au croisement de deux rivières (efface les berges)
  if (city.rivers.length > 1) {
    for (const { P0, dir, nr, w } of city.rivers) {
      const L = E * 3, h = w / 2 - 0.8;
      out.push(`<path d="M${n1(P0[0] - dir[0] * L + nr[0] * h)} ${n1(P0[1] - dir[1] * L + nr[1] * h)}L${n1(P0[0] + dir[0] * L + nr[0] * h)} ${n1(P0[1] + dir[1] * L + nr[1] * h)}L${n1(P0[0] + dir[0] * L - nr[0] * h)} ${n1(P0[1] + dir[1] * L - nr[1] * h)}L${n1(P0[0] - dir[0] * L - nr[0] * h)} ${n1(P0[1] - dir[1] * L - nr[1] * h)}Z" fill="${COLORS.water}"/>`);
    }
  }

  // Routes principales
  const roadsD = city.roads.map(lineD).join('');
  out.push(`<path d="${roadsD}" fill="none" stroke="${COLORS.roadEdge}" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/>`);
  out.push(`<path d="${roadsD}" fill="none" stroke="${COLORS.street}" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>`);

  for (const b of city.bridges) {
    out.push(`<rect x="${n1(-b.length / 2)}" y="-6" width="${n1(b.length)}" height="12" fill="${COLORS.street}" stroke="${COLORS.buildingLine}" stroke-width="1.5" transform="translate(${n1(b.x)} ${n1(b.y)}) rotate(${n1(b.angle)})"/>`);
  }

  // Limites de quartiers
  if (city.districtLines.length) {
    out.push(`<path d="${city.districtLines.map(lineD).join('')}" fill="none" stroke="${COLORS.district}" stroke-width="1.2" stroke-dasharray="5 4" stroke-linecap="round"/>`);
  }

  // Îlots et maisons
  out.push(`<path d="${pathD(city.blocks)}" fill="${COLORS.block}"/>`);
  out.push(`<path d="${pathD(city.buildings)}" fill="${COLORS.building}" stroke="${COLORS.buildingLine}" stroke-width="0.6" stroke-linejoin="round"/>`);

  // Place du marché
  out.push(`<path d="${pathD(city.plaza)}" fill="${COLORS.plaza}" stroke="${COLORS.roadEdge}" stroke-width="1"/>`);

  // Bâtiments importants
  for (const s of city.specials) {
    out.push(`<path d="${pathD(s.yard)}" fill="${col(s.yardColor)}"/>`);
    for (const sh of s.shapes) {
      if (sh.lines) {
        out.push(`<path d="${sh.lines.map(lineD).join('')}" stroke="${COLORS.buildingLine}" stroke-width="${sh.stroke}" stroke-linecap="round"/>`);
        continue;
      }
      if (!sh.polys.length) continue;
      const stroke = sh.stroke ? ` stroke="${col(sh.strokeColor || 'buildingLine')}" stroke-width="${sh.stroke}" stroke-linejoin="round"` : '';
      out.push(`<path d="${pathD(sh.polys)}" fill="${col(sh.fill)}"${sh.evenodd ? ' fill-rule="evenodd"' : ''}${stroke}/>`);
    }
  }

  // Ombrage de la colline (par-dessus les maisons, très léger)
  if (city.hill) {
    const { c, r } = city.hill;
    out.push(`<defs><radialGradient id="cmg-hill-shade"><stop offset="0" stop-color="#7a6440" stop-opacity=".22"/><stop offset="1" stop-color="#7a6440" stop-opacity="0"/></radialGradient></defs>`);
    out.push(`<circle cx="${n1(c[0])}" cy="${n1(c[1])}" r="${n1(r * 1.4)}" fill="url(#cmg-hill-shade)"/>`);
    out.push(`<path d="${pathD(city.hill.contours)}" fill="none" stroke="#8c7748" stroke-opacity=".3" stroke-width="1.4"/>`);
  }

  // Murs intérieurs
  if (city.innerWalls.length) {
    out.push(`<path d="${city.innerWalls.map(lineD).join('')}" fill="none" stroke="${COLORS.wall}" stroke-width="4.5" stroke-linecap="round"/>`);
    let last = [];
    for (const [a] of city.innerWalls) {
      if (last.some(t => Math.hypot(a[0] - t[0], a[1] - t[1]) < 30)) continue;
      out.push(`<circle cx="${n1(a[0])}" cy="${n1(a[1])}" r="4.5" fill="${COLORS.wall}"/>`);
      last.push(a);
    }
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
  for (const g of city.gates) {
    const dx = g.next[0] - g.prev[0], dy = g.next[1] - g.prev[1];
    const L = Math.hypot(dx, dy) || 1;
    const ux = dx / L, uy = dy / L;
    const ang = (Math.atan2(uy, ux) * 180) / Math.PI;
    for (const s of [-1, 1]) {
      const x = g.at[0] + ux * 10 * s, y = g.at[1] + uy * 10 * s;
      out.push(`<rect x="-6" y="-6" width="12" height="12" fill="${COLORS.wall}" transform="translate(${n1(x)} ${n1(y)}) rotate(${n1(ang)})"/>`);
    }
    out.push(`<rect x="-5" y="-6" width="10" height="12" fill="${COLORS.street}" transform="translate(${n1(g.at[0])} ${n1(g.at[1])}) rotate(${n1(ang)})"/>`);
  }

  // Étiquettes : quartiers, lieux, portes
  for (const d of city.districts) {
    out.push(`<text class="qtr" x="${n1(d.at[0])}" y="${n1(d.at[1])}">${esc(d.name)}</text>`);
  }
  for (const l of city.labels) {
    out.push(`<text class="lbl" x="${n1(l.at[0])}" y="${n1(l.at[1])}">${esc(l.text)}</text>`);
  }
  for (const g of city.gateNames) {
    out.push(`<text class="gate" x="${n1(g.at[0])}" y="${n1(g.at[1])}">${esc(g.text)}</text>`);
  }

  // Titre
  const ts = E / 16;
  out.push(`<text x="0" y="${n1(-E + ts * 1.4)}" font-size="${n1(ts)}" text-anchor="middle" fill="${COLORS.ink}" paint-order="stroke" stroke="${COLORS.land}" stroke-width="${n1(ts / 5)}" stroke-linejoin="round">${esc(city.name)}</text>`);

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
