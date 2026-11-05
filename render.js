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
  townGround: '#e7e1cd',
  forest: '#b9c79c',
  forestDark: '#9fb184',
  mainStreet: '#fdfaf2',
  mainEdge: '#9c8e72',
  alley: '#ece6d6',
  dryMoat: '#d4d3b4',
  lices: '#e6e1cf',
  hall: '#b88f62',
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
  court: '#ddd3bd',
  yard: '#dbd8b8',
  garden: '#cdd6a6',
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


// ---------- Terrain : courbes de niveau, ombrage, couleurs d'altitude et de pente ----------

// Courbes de niveau d'une altitude donnée (carrés marchants sur la grille du terrain)
function contourSegments(T, level) {
  const { G, step, E, alt } = T, segs = [];
  const at = (i, j) => alt[j * (G + 1) + i];
  const TABLE = { 1: [[3, 0]], 2: [[0, 1]], 3: [[3, 1]], 4: [[1, 2]], 5: [[3, 0], [1, 2]], 6: [[0, 2]], 7: [[3, 2]],
    8: [[2, 3]], 9: [[0, 2]], 10: [[0, 1], [2, 3]], 11: [[1, 2]], 12: [[1, 3]], 13: [[0, 1]], 14: [[3, 0]] };
  for (let j = 0; j < G; j++) for (let i = 0; i < G; i++) {
    const v = [at(i, j), at(i + 1, j), at(i + 1, j + 1), at(i, j + 1)];
    const idx = (v[0] > level ? 1 : 0) | (v[1] > level ? 2 : 0) | (v[2] > level ? 4 : 0) | (v[3] > level ? 8 : 0);
    const T2 = TABLE[idx];
    if (!T2) continue;
    const x0 = -E + i * step, y0 = -E + j * step;
    const P = [[x0, y0], [x0 + step, y0], [x0 + step, y0 + step], [x0, y0 + step]];
    const e = k => { const a = P[k], b = P[(k + 1) % 4], t = (level - v[k]) / (v[(k + 1) % 4] - v[k]); return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]; };
    for (const [p, q] of T2) segs.push([e(p), e(q)]);
  }
  return segs;
}

// Image du terrain (navigateur seulement) : 'shade' = ombrage seul, 'relief' = couleurs d'altitude ombrées, 'slope' = classes de pente
function terrainImage(T, mode) {
  if (typeof document === 'undefined') return null;
  const { G, step, alt, slope } = T;
  const S = G * 2, cv = document.createElement('canvas');
  cv.width = cv.height = S;
  const ctx = cv.getContext('2d'), img = ctx.createImageData(S, S);
  const sample = (arr, x, y) => {   // interpolation bilinéaire dans la grille
    const i = Math.min(G - 1, Math.floor(x)), j = Math.min(G - 1, Math.floor(y)), fx = x - i, fy = y - j;
    const a = arr[j * (G + 1) + i], b = arr[j * (G + 1) + i + 1], c = arr[(j + 1) * (G + 1) + i], d = arr[(j + 1) * (G + 1) + i + 1];
    return (a * (1 - fx) + b * fx) * (1 - fy) + (c * (1 - fx) + d * fx) * fy;
  };
  const span = Math.max(1, T.maxAlt - T.min);
  const HYPSO = [[0, [199, 214, 168]], [0.3, [222, 222, 170]], [0.55, [226, 204, 150]], [0.8, [200, 168, 124]], [1, [176, 150, 120]]];
  const hypso = t => {
    for (let k = 1; k < HYPSO.length; k++) if (t <= HYPSO[k][0]) {
      const [t0, c0] = HYPSO[k - 1], [t1, c1] = HYPSO[k], f = (t - t0) / (t1 - t0);
      return c0.map((v, n) => v + (c1[n] - v) * f);
    }
    return HYPSO[HYPSO.length - 1][1];
  };
  const SLOPE_COLORS = [[8, [233, 237, 220]], [15, [243, 227, 161]], [25, [240, 179, 107]], [45, [217, 105, 79]], [Infinity, [168, 71, 58]]];
  for (let py = 0; py < S; py++) for (let px = 0; px < S; px++) {
    const gx = (px + 0.5) / 2, gy = (py + 0.5) / 2;
    const dzdx = (sample(alt, Math.min(G, gx + 1), gy) - sample(alt, Math.max(0, gx - 1), gy)) / (2 * step);
    const dzdy = (sample(alt, gx, Math.min(G, gy + 1)) - sample(alt, gx, Math.max(0, gy - 1))) / (2 * step);
    // Ombrage : lumière venant du nord-ouest (haut-gauche), relief exagéré 3 fois pour la lisibilité
    const nx = -3 * dzdx, ny = -3 * dzdy, nz = 1, nl = Math.hypot(nx, ny, nz);
    const lx = -0.6, ly = -0.6, lz = 0.53;
    const illum = Math.max(0, (nx * lx + ny * ly + nz * lz) / nl / Math.hypot(lx, ly, lz));
    const o = (py * S + px) * 4;
    if (mode === 'shade') {
      const dark = Math.max(0, 0.86 - illum);           // seulement les versants à l'ombre
      img.data[o] = 70; img.data[o + 1] = 55; img.data[o + 2] = 35; img.data[o + 3] = Math.min(255, dark * 330);
    } else if (mode === 'relief') {
      const c = hypso((sample(alt, gx, gy) - T.min) / span), k = 0.62 + 0.72 * illum;   // terrain plat ≈ couleur pure
      img.data[o] = Math.min(255, c[0] * k); img.data[o + 1] = Math.min(255, c[1] * k); img.data[o + 2] = Math.min(255, c[2] * k); img.data[o + 3] = 255;
    } else {
      const sp = sample(slope, gx, gy), c = SLOPE_COLORS.find(([lim]) => sp <= lim)[1], k = 0.85 + 0.2 * illum;
      img.data[o] = Math.min(255, c[0] * k); img.data[o + 1] = Math.min(255, c[1] * k); img.data[o + 2] = Math.min(255, c[2] * k); img.data[o + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return cv.toDataURL('image/png');
}

// Courbes de niveau en mètres : fines tous les `minor` m, épaisses tous les `major` m
function contourLevels(T, minor) {
  const levels = [];
  for (let l = Math.ceil(T.min / minor) * minor; l < T.maxAlt; l += minor) levels.push(l);
  return levels;
}

// Ressauts : ligne du haut de la falaise, hachures vers le bas ; escaliers là où une rue la franchit
function drawCliffs(out, city) {
  for (const cl of city.cliffs || []) {
    const P = cl.points, ticks = [];
    out.push(`<path d="${lineD(P)}" fill="none" stroke="#6e5a44" stroke-width="2" stroke-linejoin="round"/>`);
    for (let i = 0; i + 1 < P.length; i++) {
      const a = P[i], b = P[i + 1], L = Math.hypot(b[0] - a[0], b[1] - a[1]);
      let nx = -(b[1] - a[1]) / L, ny = (b[0] - a[0]) / L;
      const m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
      if (cl.side) { nx *= cl.side; ny *= cl.side; }   // ravin : vers le fond
      else if ((m[0] - cl.center[0]) * nx + (m[1] - cl.center[1]) * ny < 0) { nx = -nx; ny = -ny; }   // vers l'extérieur = vers le bas
      for (let t = 0; t < L; t += 3.5) {
        const p = [a[0] + (b[0] - a[0]) * (t / L), a[1] + (b[1] - a[1]) * (t / L)];
        ticks.push([p, [p[0] + nx * 4.5, p[1] + ny * 4.5]]);
      }
    }
    out.push(`<path d="${ticks.map(lineD).join('')}" stroke="#6e5a44" stroke-width="0.9"/>`);
  }
  for (const st of city.stairs || []) {
    out.push(`<g transform="translate(${n1(st.at[0])} ${n1(st.at[1])}) rotate(${n1(st.angle)})"><rect x="-5" y="-3.5" width="10" height="7" fill="${COLORS.street}" stroke="${COLORS.buildingLine}" stroke-width="0.8"/><path d="M-3 -3.5V3.5M-1 -3.5V3.5M1 -3.5V3.5M3 -3.5V3.5" stroke="${COLORS.buildingLine}" stroke-width="0.6"/></g>`);
  }
}

// Vues Relief et Pentes : le terrain d'abord, la ville en surimpression légère
function renderTerrainView(city, view) {
  const E = city.E, T = city.terrain, fs = E / 38, out = [];
  const z = k => `calc(var(--z, 1) * ${n1(k)}px)`;
  out.push(`<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="${n1(-E)} ${n1(-E)} ${n1(2 * E)} ${n1(2 * E)}" font-family="Georgia, 'Times New Roman', serif">`);
  out.push(`<style>
    .alt{font-size:${z(fs * 0.55)};fill:#5e4a2c;text-anchor:middle;dominant-baseline:middle;paint-order:stroke;stroke:rgba(255,255,255,.7);stroke-width:${z(fs / 6)}}
    .sum{font-size:${z(fs * 0.8)};fill:${COLORS.ink};text-anchor:middle;dominant-baseline:middle;paint-order:stroke;stroke:#fff;stroke-width:${z(fs / 4)};stroke-linejoin:round}
    .leg{font-size:${n1(fs * 0.8)}px;fill:${COLORS.ink};dominant-baseline:middle}
  </style>`);
  const img = terrainImage(T, view === 'relief' ? 'relief' : 'slope');
  if (img) out.push(`<image x="${n1(-E)}" y="${n1(-E)}" width="${n1(2 * E)}" height="${n1(2 * E)}" preserveAspectRatio="none" href="${img}"/>`);
  else out.push(`<rect x="${n1(-E)}" y="${n1(-E)}" width="${n1(2 * E)}" height="${n1(2 * E)}" fill="${COLORS.land}"/>`);

  // Eau
  if (city.moat && city.moat.water) out.push(`<path d="${pathD([city.wall])}" fill="none" stroke="${COLORS.water}" stroke-width="${n1(2 * city.moat.outer)}" stroke-opacity=".6" stroke-linejoin="round"/>`);
  city.rivers.forEach(rv => out.push(`<path d="${lineD(rv.points)}" fill="none" stroke="${COLORS.water}" stroke-width="${n1(rv.w)}" stroke-linecap="round" stroke-linejoin="round"/>`));

  // Courbes de niveau
  if (!T.flat) {
    const minor = view === 'relief' ? 5 : 10, major = 25;
    for (const l of contourLevels(T, minor)) {
      const segs = contourSegments(T, l), isMajor = l % major === 0;
      if (!segs.length) continue;
      out.push(`<path d="${segs.map(sg => lineD(sg)).join('')}" fill="none" stroke="#6b5233" stroke-opacity="${isMajor ? 0.7 : 0.35}" stroke-width="${isMajor ? 1.6 : 0.8}"/>`);
      if (isMajor && view === 'relief') {
        // Altitude écrite le long de la courbe, quelques fois
        const placed = [];
        segs.forEach((sg, k) => {
          if (k % 40 !== 7) return;
          const m = [(sg[0][0] + sg[1][0]) / 2, (sg[0][1] + sg[1][1]) / 2];
          if (placed.some(p => Math.hypot(p[0] - m[0], p[1] - m[1]) < E * 0.35)) return;
          placed.push(m);
          let ang = (Math.atan2(sg[1][1] - sg[0][1], sg[1][0] - sg[0][0]) * 180) / Math.PI;
          if (ang > 90) ang -= 180; if (ang < -90) ang += 180;
          out.push(`<text class="alt" transform="translate(${n1(m[0])} ${n1(m[1])}) rotate(${n1(ang)})">${l} m</text>`);
        });
      }
    }
  }

  drawCliffs(out, city);

  // La ville en surimpression : remparts, rues principales, maisons
  const houses = [...city.houses.stone, ...city.houses.timber, ...city.houses.thatch];
  const houseFill = view === 'relief' ? 'rgba(70,58,44,.45)' : 'rgba(40,32,24,.8)';
  if (houses.length) out.push(`<path d="${pathD(houses)}" fill="${houseFill}"/>`);
  out.push(`<path d="${city.roads.map(lineD).join('')}" fill="none" stroke="#fff" stroke-opacity=".75" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`);
  out.push(`<path d="${pathD([city.wall])}" fill="none" stroke="${COLORS.wall}" stroke-width="4" stroke-linejoin="round"/>`);
  if (city.citadel) out.push(`<path d="${city.citadel.edges.map(lineD).join('')}" fill="none" stroke="${COLORS.wall}" stroke-width="3"/>`);

  // Sommets cotés
  for (const sm of T.summits) {
    out.push(`<path d="M${n1(sm.at[0])} ${n1(sm.at[1] - 7)}L${n1(sm.at[0] + 6)} ${n1(sm.at[1] + 4)}L${n1(sm.at[0] - 6)} ${n1(sm.at[1] + 4)}Z" fill="${COLORS.ink}"/>`);
    out.push(`<text class="sum" x="${n1(sm.at[0])}" y="${n1(sm.at[1] + fs * 1.2)}">${esc((sm.name ? sm.name + ' · ' : '') + sm.alt + ' m')}</text>`);
  }

  // Titre
  const ts = E / 16;
  out.push(`<text x="0" y="${n1(-E + ts * 1.4)}" font-size="${n1(ts)}" text-anchor="middle" fill="${COLORS.ink}" paint-order="stroke" stroke="#fff" stroke-width="${n1(ts / 5)}" stroke-linejoin="round">${esc(city.name)} — ${view === 'relief' ? textFor(city.lang).render.relief : textFor(city.lang).render.slopes}</text>`);

  // Légende
  const lx = E - E * 0.36, sw = fs * 0.9;
  if (view === 'relief') {
    const ly = E - E * 0.13;
    out.push(`<rect x="${n1(lx - sw * 0.6)}" y="${n1(ly - sw * 1.8)}" width="${n1(E * 0.33)}" height="${n1(sw * 4)}" rx="4" fill="#fff" fill-opacity=".85"/>`);
    out.push(`<defs><linearGradient id="cmg-alt-grad"><stop offset="0" stop-color="rgb(199,214,168)"/><stop offset=".3" stop-color="rgb(222,222,170)"/><stop offset=".55" stop-color="rgb(226,204,150)"/><stop offset=".8" stop-color="rgb(200,168,124)"/><stop offset="1" stop-color="rgb(176,150,120)"/></linearGradient></defs>`);
    out.push(`<rect x="${n1(lx)}" y="${n1(ly - sw * 0.5)}" width="${n1(E * 0.22)}" height="${n1(sw)}" fill="url(#cmg-alt-grad)" stroke="${COLORS.buildingLine}" stroke-width="0.6"/>`);
    out.push(`<text class="leg" x="${n1(lx)}" y="${n1(ly + sw * 1.3)}">${Math.round(T.min)} m</text>`);
    out.push(`<text class="leg" x="${n1(lx + E * 0.22)}" y="${n1(ly + sw * 1.3)}" text-anchor="end">${Math.round(T.maxAlt)} m</text>`);
    out.push(`<text class="leg" x="${n1(lx)}" y="${n1(ly - sw * 1.1)}">${textFor(city.lang).render.altitude}${T.flat ? textFor(city.lang).render.plain : textFor(city.lang).render.contours5}</text>`);
  } else {
    const rows = ['rgb(233,237,220)', 'rgb(243,227,161)', 'rgb(240,179,107)', 'rgb(217,105,79)', 'rgb(168,71,58)'].map((c, i) => [c, textFor(city.lang).render.slopeRows(T)[i]]);
    const ly = E - E * 0.06 - rows.length * sw * 1.5;
    out.push(`<rect x="${n1(lx - sw * 0.6)}" y="${n1(ly - sw * 2.2)}" width="${n1(E * 0.35)}" height="${n1(sw * (rows.length * 1.5 + 2.6))}" rx="4" fill="#fff" fill-opacity=".85"/>`);
    out.push(`<text class="leg" x="${n1(lx)}" y="${n1(ly - sw * 1.1)}">${textFor(city.lang).render.slopeTitle}</text>`);
    rows.forEach(([c, t], i) => {
      const y = ly + i * sw * 1.5 + sw * 0.4;
      out.push(`<rect x="${n1(lx)}" y="${n1(y - sw / 2)}" width="${n1(sw)}" height="${n1(sw)}" fill="${c}" stroke="${COLORS.buildingLine}" stroke-width="0.6"/>`);
      out.push(`<text class="leg" x="${n1(lx + sw * 1.5)}" y="${n1(y)}">${t}</text>`);
    });
  }
  // Échelle et nord
  const sx = -E + E * 0.06, sy = E - E * 0.06, bar = city.R > 300 ? 200 : 100;
  out.push(`<g stroke="${COLORS.ink}" stroke-width="2" fill="none"><path d="M${n1(sx)} ${n1(sy - 6)}V${n1(sy)}H${n1(sx + bar)}V${n1(sy - 6)}"/></g>`);
  out.push(`<text x="${n1(sx + bar / 2)}" y="${n1(sy - 12)}" font-size="${n1(E / 45)}" text-anchor="middle" fill="${COLORS.ink}">${bar} m</text>`);
  out.push('</svg>');
  return out.join('\n');
}

function renderSVG(city, options = {}) {
  if (options.view === 'relief' || options.view === 'pentes') return renderTerrainView(city, options.view);
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
    .fac{font-size:${z(fs * 1.7)};font-weight:bold;font-variant:small-caps;text-anchor:middle;dominant-baseline:middle;paint-order:stroke;stroke:#fffaf0;stroke-width:${z(fs / 2.5)};stroke-linejoin:round;letter-spacing:.06em}
  </style>`);
  out.push(`<defs><pattern id="cmg-vines" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(30)"><rect width="7" height="7" fill="${COLORS.vine}"/><circle cx="3.5" cy="3.5" r="1.1" fill="${COLORS.vineDot}"/></pattern><pattern id="cmg-beds" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(${Math.round((city.seed.length * 37) % 180)})"><rect width="6" height="6" fill="${COLORS.garden}"/><rect width="6" height="1.6" fill="#b8c48c"/></pattern><pattern id="cmg-waste" width="14" height="14" patternUnits="userSpaceOnUse"><rect width="14" height="14" fill="#ddd5bf"/><circle cx="3" cy="4" r="1.6" fill="#b9b48f"/><circle cx="10" cy="10" r="2.1" fill="#b9b48f"/><path d="M8 3l2 1M2 10l2-1" stroke="#a89f86" stroke-width=".7"/></pattern></defs>`);

  // Sol, champs, prés, vignes
  out.push(`<rect x="${n1(-E)}" y="${n1(-E)}" width="${n1(2 * E)}" height="${n1(2 * E)}" fill="${COLORS.land}"/>`);
  // Champs en lanières : trois cultures, sillons visibles
  ['field1', 'field2', 'field3'].forEach((k, i) => fill(city.fieldStrips[i], k, ` stroke="${COLORS.fieldLine}" stroke-width="0.6"`));
  fill(city.meadows, 'meadow');
  // Forêts : couronnes d'arbres serrées (une tache par case), puis quelques cimes plus sombres
  if (city.forest && city.forest.length) {
    const fr = (city.forestCell || 22) * 0.78;
    out.push(`<path d="${city.forest.map(([x, y]) => `M${n1(x - fr)} ${n1(y)}a${n1(fr)} ${n1(fr)} 0 1 0 ${n1(2 * fr)} 0a${n1(fr)} ${n1(fr)} 0 1 0 ${n1(-2 * fr)} 0`).join('')}" fill="${COLORS.forest}"/>`);
    out.push(`<path d="${city.forest.map(([x, y], i) => { const r = 4 + (i % 3); return `M${n1(x - r + (i % 5) - 2)} ${n1(y + (i % 7) - 3)}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0`; }).join('')}" fill="${COLORS.forestDark}"/>`);
  }
  fill(city.suburbGround, 'garden');
  fill(city.vineyards, 'url(#cmg-vines)');

  // Courbes de niveau sous la ville
  const contourD = city.terrain && !city.terrain.flat
    ? contourLevels(city.terrain, 10).map(l => contourSegments(city.terrain, l).map(sg => lineD(sg)).join('')).join('') : '';
  if (contourD) out.push(`<path d="${contourD}" fill="none" stroke="${COLORS.contour}" stroke-opacity=".55" stroke-width="1.3"/>`);

  // Fossé en anneau autour du rempart : en eau ou à sec. Tracé comme un trait large centré sur le
  // rempart, puis la berme (bande de terre au pied du mur) ; l'intérieur est ensuite recouvert par la ville.
  if (city.moat) {
    const H = city.moat.outer, wallD = pathD([city.wall]);
    // Tronçons en eau (en bas) et à sec (sur les hauteurs)
    const segs = city.moat.segs || city.wall.map((p, i) => ({ a: p, b: city.wall[(i + 1) % city.wall.length], water: city.moat.water }));
    for (const water of [false, true]) {
      const d = segs.filter(sg => sg.water === water).map(sg => lineD([sg.a, sg.b])).join('');
      if (!d) continue;
      out.push(`<path d="${d}" fill="none" stroke="${water ? COLORS.waterLine : COLORS.dryMoatLine}" stroke-width="${n1(2 * H + 3)}" stroke-linecap="round" stroke-linejoin="round"/>`);
    }
    for (const water of [false, true]) {
      const d = segs.filter(sg => sg.water === water).map(sg => lineD([sg.a, sg.b])).join('');
      if (d) out.push(`<path d="${d}" fill="none" stroke="${water ? COLORS.water : COLORS.dryMoat}" stroke-width="${n1(2 * H)}" stroke-linecap="round" stroke-linejoin="round"/>`);
    }
    out.push(`<path d="${wallD}" fill="none" stroke="${COLORS.meadow}" stroke-width="${n1(2 * (H - city.moat.width))}" stroke-linejoin="round"/>`);
    if (city.moat.lices) {
      // Double enceinte : le mur extérieur (plus bas) puis les lices, bande de terre entre les deux murs
      const Lw = 3.5 + city.moat.lices;
      out.push(`<path d="${wallD}" fill="none" stroke="${COLORS.wall}" stroke-width="${n1(2 * (Lw + 2.5))}" stroke-linejoin="round"/>`);
      out.push(`<path d="${wallD}" fill="none" stroke="${COLORS.lices}" stroke-width="${n1(2 * Lw)}" stroke-linejoin="round"/>`);
    }
  }

  // Sol de la ville (cœurs d'îlots), puis cours et jardins des parcelles
  fill([city.wall], 'townGround');
  if (city.citadel) fill([city.citadel.edges.map(e => e[0])], 'townGround');
  // Terrains vagues entre factions : sol nu, broussailles
  if ((city.waste || []).length) {
    out.push(`<path d="${pathD(city.waste)}" fill="url(#cmg-waste)" stroke="none"/>`);
  }
  // Terres ouvertes dans les murs : vergers, jardins maraîchers (planches), prés, vignes ; une clôture autour
  for (const o of city.openLand || []) {
    const f = { orchard: COLORS.garden, garden: COLORS.garden, meadow: COLORS.field1, vines: 'url(#cmg-vines)' }[o.land];
    out.push(`<path d="${pathD([o.poly])}" fill="${o.land === 'garden' ? 'url(#cmg-beds)' : f}" stroke="${COLORS.fence}" stroke-width="1" stroke-dasharray="3 2"/>`);
    if (o.trees.length) out.push(`<path d="${o.trees.map(([x, y, r]) => `M${n1(x - r)} ${n1(y)}a${n1(r)} ${n1(r)} 0 1 0 ${n1(2 * r)} 0a${n1(r)} ${n1(r)} 0 1 0 ${n1(-2 * r)} 0`).join('')}" fill="${COLORS.tree}" stroke="${COLORS.treeLine}" stroke-width="0.7"/>`);
  }
  fill(city.ground.court, 'court');
  fill(city.ground.yard, 'yard');
  fill(city.ground.garden, 'garden');
  fill(city.terraces, 'url(#cmg-vines)');
  // Pentes trop raides pour bâtir (près de la ville) : rangées de vigne en terrasses, le long des courbes de niveau
  if (city.terrain && !city.terrain.flat) {
    const T = city.terrain, segs = [];
    const slopeAtGrid = p => { const i = Math.round((p[0] + T.E) / T.step), j = Math.round((p[1] + T.E) / T.step); return T.slope[Math.max(0, Math.min(T.G, j)) * (T.G + 1) + Math.max(0, Math.min(T.G, i))]; };
    for (const l of contourLevels(T, 5)) for (const sg of contourSegments(T, l)) {
      const m = [(sg[0][0] + sg[1][0]) / 2, (sg[0][1] + sg[1][1]) / 2], sl = slopeAtGrid(m);
      if (sl > T.max && sl < 70 && Math.hypot(m[0], m[1]) < city.R * 1.8) segs.push(sg);   // pas de vigne sur les falaises
    }
    if (segs.length) out.push(`<path d="${segs.map(sg => lineD(sg)).join('')}" fill="none" stroke="${COLORS.vineDot}" stroke-opacity=".75" stroke-width="1.2" stroke-dasharray="1 3" stroke-linecap="round"/>`);
  }

  // Rivières : berge puis eau
  const riverD = city.rivers.map(rv => lineD(rv.points));
  city.rivers.forEach((rv, k) => out.push(`<path d="${riverD[k]}" fill="none" stroke="${COLORS.waterLine}" stroke-width="${n1(rv.w + 3)}" stroke-linecap="round" stroke-linejoin="round"/>`));
  city.rivers.forEach((rv, k) => out.push(`<path d="${riverD[k]}" fill="none" stroke="${COLORS.water}" stroke-width="${n1(rv.w)}" stroke-linecap="round" stroke-linejoin="round"/>`));

  // Fond des ravins entre factions : une bande d'ombre entre les deux falaises
  for (const rv of city.ravines || []) out.push(`<path d="${lineD(rv.points)}" fill="none" stroke="#b9ad93" stroke-width="${n1(rv.w + 6)}" stroke-linecap="round" stroke-linejoin="round" opacity=".7"/>`);
  // Biefs de moulin, canaux des frontières, îles
  for (const cn of [...(city.canals || []), ...(city.borderCanals || [])]) {
    out.push(`<path d="${lineD(cn.points)}" fill="none" stroke="${COLORS.waterLine}" stroke-width="${n1(cn.w + 2)}" stroke-linecap="round" stroke-linejoin="round"/>`);
    out.push(`<path d="${lineD(cn.points)}" fill="none" stroke="${COLORS.water}" stroke-width="${n1(cn.w)}" stroke-linecap="round" stroke-linejoin="round"/>`);
  }
  for (const isl of city.islands || []) {
    fill([isl.water], 'water', ` stroke="${COLORS.waterLine}" stroke-width="1.2"`);
    fill([isl.land], 'townGround', ` stroke="${COLORS.waterLine}" stroke-width="1"`);
  }

  // Rues : chaque rue avec sa vraie largeur (bordure d'abord pour que les croisements se fondent)
  const net = city.streetNet || [];
  const widthOf = cls => 2 * ((city.streetHalf || {})[cls] || 3);
  const byCls = new Map();
  for (const st of net) { if (!byCls.has(st.cls)) byCls.set(st.cls, []); byCls.get(st.cls).push(lineD(st.points)); }
  // Hiérarchie : grandes rues larges, claires et bien bordées ; ruelles étroites, plus sombres, sans bordure
  const ORDER = ['ruelle', 'rue', 'quai', 'boulevard', 'road', 'main'];
  const EDGE = { main: [COLORS.mainEdge, 2.4], road: [COLORS.roadEdge, 2], boulevard: [COLORS.mainEdge, 2], quai: [COLORS.roadEdge, 1.4], rue: [COLORS.roadEdge, 1.2], ruelle: [null, 0] };
  const FILL = { main: COLORS.mainStreet, road: COLORS.street, boulevard: COLORS.mainStreet, quai: COLORS.street, rue: COLORS.street, ruelle: COLORS.alley };
  const clsList = [...byCls.keys()].sort((a, b) => ORDER.indexOf(a) - ORDER.indexOf(b));
  for (const cls of clsList) { const [c, w] = EDGE[cls] || [COLORS.roadEdge, 1.2]; if (c) out.push(`<path d="${byCls.get(cls).join('')}" fill="none" stroke="${c}" stroke-width="${n1(widthOf(cls) + w)}" stroke-linecap="round" stroke-linejoin="round"/>`); }
  for (const cls of clsList) out.push(`<path d="${byCls.get(cls).join('')}" fill="none" stroke="${FILL[cls] || COLORS.street}" stroke-width="${n1(widthOf(cls))}" stroke-linecap="round" stroke-linejoin="round"/>`);
  for (const b of city.bridges) {
    const tr = `translate(${n1(b.x)} ${n1(b.y)}) rotate(${n1(b.angle)})`;
    if (b.inhabited) {
      // Pont habité : deux rangées de petites maisons de part et d'autre du passage
      out.push(`<rect x="${n1(-b.length / 2)}" y="-11" width="${n1(b.length)}" height="22" fill="${COLORS.street}" stroke="${COLORS.buildingLine}" stroke-width="1.5" transform="${tr}"/>`);
      const hs = [];
      for (let x = -b.length / 2 + 1; x < b.length / 2 - 3; x += 5) for (const y of [-10.5, 4.5]) hs.push(`M${n1(x)} ${y}h4.4v6h-4.4Z`);
      out.push(`<path d="${hs.join('')}" fill="${COLORS.tile}" stroke="${COLORS.buildingLine}" stroke-width="0.5" transform="${tr}"/>`);
    } else {
      out.push(`<rect x="${n1(-b.length / 2)}" y="-6" width="${n1(b.length)}" height="12" fill="${COLORS.street}" stroke="${COLORS.buildingLine}" stroke-width="1.5" transform="${tr}"/>`);
    }
  }
  // Moulins sur les biefs : le bâtiment à cheval sur l'eau et sa roue
  for (const m of city.mills || []) {
    const ang = (Math.atan2(m.axis[1], m.axis[0]) * 180) / Math.PI;
    out.push(`<g transform="translate(${n1(m.at[0])} ${n1(m.at[1])}) rotate(${n1(ang)})"><rect x="-5" y="-6" width="10" height="12" fill="${COLORS.building}" stroke="${COLORS.buildingLine}" stroke-width="1"/><path d="M-7 -4V4M7 -4V4" stroke="${COLORS.buildingLine}" stroke-width="1.6"/></g>`);
  }
  // Hors les murs
  for (const o of city.outskirts || []) {
    const ang = (Math.atan2(o.axis[1], o.axis[0]) * 180) / Math.PI, tr = `translate(${n1(o.at[0])} ${n1(o.at[1])}) rotate(${n1(ang)})`;
    if (o.kind === 'church') {
      fill([o.poly], 'garden', ` stroke="${COLORS.fence}" stroke-width="0.8"`);
      out.push(`<g transform="${tr}"><rect x="-9" y="-3.5" width="16" height="7" fill="${COLORS.church}" stroke="${COLORS.buildingLine}" stroke-width="1"/><circle cx="7" cy="0" r="3.5" fill="${COLORS.church}" stroke="${COLORS.buildingLine}" stroke-width="1"/><rect x="-13" y="-2.5" width="5" height="5" fill="${COLORS.church}" stroke="${COLORS.buildingLine}" stroke-width="1"/></g>`);
    } else if (o.kind === 'leper') {
      fill([o.poly], 'garden', ` stroke="${COLORS.fence}" stroke-width="1"`);
      out.push(`<g transform="${tr}"><rect x="-18" y="-12" width="22" height="7" fill="${COLORS.thatch}" stroke="${COLORS.buildingLine}" stroke-width="0.8"/><rect x="-18" y="4" width="22" height="7" fill="${COLORS.thatch}" stroke="${COLORS.buildingLine}" stroke-width="0.8"/><rect x="8" y="-4" width="10" height="7" fill="${COLORS.church}" stroke="${COLORS.buildingLine}" stroke-width="0.8"/></g>`);
    } else if (o.kind === 'gallows') {
      out.push(`<g transform="${tr}" stroke="${COLORS.ink}" stroke-width="1.6"><path d="M-4 -2V2M4 -2V2M-4 0H4"/></g>`);
    } else if (o.kind === 'tannery') {
      fill([o.poly], 'quay');
      out.push(`<g transform="${tr}"><rect x="-18" y="-6" width="11" height="9" fill="${COLORS.tile}" stroke="${COLORS.buildingLine}" stroke-width="0.8"/><rect x="-4" y="-6" width="11" height="9" fill="${COLORS.tile}" stroke="${COLORS.buildingLine}" stroke-width="0.8"/><path d="M10 -6V5M13 -6V5M16 -6V5M10 -6H16" stroke="${COLORS.buildingLine}" stroke-width="0.6"/></g>`);
    } else if (o.kind === 'watermill') {
      out.push(`<g transform="${tr}"><rect x="-5" y="-4" width="10" height="8" fill="${COLORS.building}" stroke="${COLORS.buildingLine}" stroke-width="1"/><path d="M-3 -6.5H3" stroke="${COLORS.buildingLine}" stroke-width="2"/></g>`);
    }
  }

  // Limites de parcelles, murs de jardin, dépendances, arbres
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
  // Bastide : couverts (arcades) le long de la place et halle au centre
  if (city.arcades.length) out.push(`<path d="${pathD(city.arcades)}" fill="none" stroke="${COLORS.buildingLine}" stroke-width="1" stroke-dasharray="1.5 2.5"/>`);
  fill(city.halls, 'hall', ` stroke="${COLORS.buildingLine}" stroke-width="1.2"`);
  if (city.halls.length) out.push(`<path d="${city.halls.map(h => lineD([[(h[0][0] + h[3][0]) / 2, (h[0][1] + h[3][1]) / 2], [(h[1][0] + h[2][0]) / 2, (h[1][1] + h[2][1]) / 2]])).join('')}" stroke="${COLORS.buildingLine}" stroke-width="0.7"/>`);
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

  // Ruines dans les terrains vagues : des murs à moitié tombés, sans toit
  if ((city.ruins || []).length) out.push(`<path d="${pathD(city.ruins)}" fill="none" stroke="#8a7d68" stroke-width="1.1" stroke-dasharray="4 2.5"/>`);

  // Esplanade du maire : une dalle sur la terrasse, la tribune au bord de la falaise, face à la place
  if (city.esplanade) {
    const e = city.esplanade;
    fill([e.poly], 'plaza', ` stroke="${COLORS.buildingLine}" stroke-width="1.4"`);
    const ang = (Math.atan2(e.front[1], e.front[0]) * 180) / Math.PI, d = e.r - 6;
    out.push(`<g transform="translate(${n1(e.c[0] + e.front[0] * d)} ${n1(e.c[1] + e.front[1] * d)}) rotate(${n1(ang)})"><rect x="-4" y="-9" width="8" height="18" fill="${COLORS.hall || '#d8c7a3'}" stroke="${COLORS.buildingLine}" stroke-width="1.2"/><circle cx="1" cy="0" r="2" fill="${COLORS.buildingLine}"/></g>`);
    // Une rangée d'arbres au fond de l'esplanade
    for (let k = -3; k <= 3; k++) {
      const a = Math.atan2(-e.front[1], -e.front[0]) + k * 0.28, q = [e.c[0] + Math.cos(a) * (e.r - 7), e.c[1] + Math.sin(a) * (e.r - 7)];
      out.push(`<circle cx="${n1(q[0])}" cy="${n1(q[1])}" r="3.6" fill="${COLORS.tree}" stroke="${COLORS.treeLine}" stroke-width="0.8"/>`);
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
  drawCliffs(out, city);
  // Ombrage du relief par-dessus la ville (versants à l'ombre plus sombres) : on voit les collines d'un coup d'œil
  const shade = city.terrain && !city.terrain.flat ? terrainImage(city.terrain, 'shade') : null;
  if (shade) out.push(`<image x="${n1(-E)}" y="${n1(-E)}" width="${n1(2 * E)}" height="${n1(2 * E)}" preserveAspectRatio="none" opacity=".55" style="mix-blend-mode:multiply" href="${shade}"/>`);

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
  // Murs intérieurs entre factions, avec leurs tours et leurs portes
  if ((city.innerWalls || []).length) {
    out.push(`<path d="${city.innerWalls.map(lineD).join('')}" fill="none" stroke="${COLORS.wall}" stroke-width="4.5" stroke-linecap="round"/>`);
    const placed = [];
    for (const [a] of city.innerWalls) {
      if (placed.some(t => Math.hypot(a[0] - t[0], a[1] - t[1]) < 32)) continue;
      out.push(`<circle cx="${n1(a[0])}" cy="${n1(a[1])}" r="4.5" fill="${COLORS.wall}"/>`);
      placed.push(a);
    }
    gateMarks(city.innerGates || [], 8, COLORS.wall);
  }

  // Citadelle
  if (city.citadel) {
    out.push(`<path d="${city.citadel.edges.map(lineD).join('')}" fill="none" stroke="${COLORS.wall}" stroke-width="${city.twin ? 7 : 5.5}" stroke-linecap="round"/>`);
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
        // Mur extérieur des lices : tours plus petites, décalées
        if (city.moat && city.moat.lices && k % 2 === 0) {
          const off = 3.5 + city.moat.lices + 1.25;
          out.push(`<circle cx="${n1(p[0] + nx * (off + 2))}" cy="${n1(p[1] + ny * (off + 2))}" r="4" fill="${COLORS.wall}"/>`);
        }
      }
    }
    // Barbacanes : un ouvrage avancé en demi-cercle devant chaque porte, sur le mur extérieur
    if (city.moat && city.moat.lices) for (const g of city.gates) {
      let ox = g.at[0] - wc[0], oy = g.at[1] - wc[1];
      const L = Math.hypot(ox, oy) || 1; ox /= L; oy /= L;
      const off = 3.5 + city.moat.lices + 2.5, r = 9;
      const cx = g.at[0] + ox * (off + 3), cy = g.at[1] + oy * (off + 3);
      const a0 = Math.atan2(oy, ox);
      const arc = [];
      for (let t = -Math.PI / 2; t <= Math.PI / 2 + 1e-6; t += Math.PI / 8) arc.push([cx + Math.cos(a0 + t) * r, cy + Math.sin(a0 + t) * r]);
      out.push(`<path d="${lineD(arc)}" fill="none" stroke="${COLORS.wall}" stroke-width="4" stroke-linecap="round"/>`);
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
  // Câbles entre les tours : lignes officielles (traits doubles) vers l'esplanade, lignes secrètes (tirets)
  const ck = Math.max(1, E / 800);   // épaisseur des câbles : lisibles même sur une mégapole
  for (const k of city.cables || []) {
    const A = k.from.at, B = k.to.at, d = lineD([A, ...k.pylons, B]);
    if (k.secret) out.push(`<path d="${d}" fill="none" stroke="#7a2a2a" stroke-width="${n1(1.5 * ck)}" stroke-dasharray="${n1(6 * ck)} ${n1(4 * ck)}" stroke-opacity=".9"/>`);
    else {
      out.push(`<path d="${d}" fill="none" stroke="#fffaf0" stroke-width="${n1(4.5 * ck)}" stroke-opacity=".85"/>`);
      out.push(`<path d="${d}" fill="none" stroke="#2f2820" stroke-width="${n1(1.5 * ck)}"/>`);
      const L = Math.hypot(B[0] - A[0], B[1] - A[1]) || 1, u = [(B[0] - A[0]) / L, (B[1] - A[1]) / L];
      const m = [A[0] + u[0] * L * 0.38, A[1] + u[1] * L * 0.38];
      out.push(`<rect x="${n1(-3.5 * ck)}" y="${n1(-2.5 * ck)}" width="${n1(7 * ck)}" height="${n1(5 * ck)}" fill="#c29a2e" stroke="#2f2820" stroke-width="${n1(0.8 * ck)}" transform="translate(${n1(m[0])} ${n1(m[1])}) rotate(${n1(Math.atan2(u[1], u[0]) * 180 / Math.PI)})"/>`);
    }
    for (const p of k.pylons) out.push(`<rect x="${n1(p[0] - 2.5 * ck)}" y="${n1(p[1] - 2.5 * ck)}" width="${n1(5 * ck)}" height="${n1(5 * ck)}" fill="#2f2820"/>`);
  }
  // Stations : une tour ronde (les secrètes, plus petites et cerclées de rouge)
  const drawn = [];
  for (const k of city.cables || []) for (const st of [k.from, k.to]) {
    if (drawn.some(q => Math.hypot(q[0] - st.at[0], q[1] - st.at[1]) < 2)) continue;
    drawn.push(st.at);
    out.push(`<circle cx="${n1(st.at[0])}" cy="${n1(st.at[1])}" r="${n1((k.secret ? 3.5 : 6) * ck)}" fill="${k.secret ? '#fffaf0' : '#5b4f3d'}" stroke="${k.secret ? '#7a2a2a' : '#fffaf0'}" stroke-width="${n1(1.6 * ck)}"/>`);
  }
  // Territoires des factions : une teinte légère par faction, et leur nom en grand
  for (const f of city.factions || []) {
    out.push(`<path d="${pathD(f.polys)}" fill="${f.color}" fill-opacity=".16" stroke="none" style="mix-blend-mode:multiply"/>`);
    out.push(`<path d="${(f.outline || []).map(lineD).join('')}" fill="none" stroke="${f.color}" stroke-opacity=".75" stroke-width="3" stroke-dasharray="10 6" stroke-linecap="round"/>`);
  }
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
  for (const f of city.factions || []) {
    const p = place(f.at[0], f.at[1], f.name, fs * 1.7, true);
    out.push(`<text class="fac" x="${n1(p[0])}" y="${n1(p[1])}" fill="${f.color}">${esc(f.name)}</text>`);
  }
  if (city.esplanade) textAt('lbl', fs, { at: [city.esplanade.c[0], city.esplanade.c[1]], text: city.esplanade.name }, true);
  for (const k of city.cables || []) {
    const A = k.from.at, B = k.to.at;
    textAt('inn', fs * 0.62, { at: [A[0] + (B[0] - A[0]) * 0.6, A[1] + (B[1] - A[1]) * 0.6 - fs * 0.6], text: k.name }, false);
  }
  for (const l of city.labels) textAt(l.italic ? 'qtr' : l.small ? 'small' : 'lbl', l.italic ? fs * 1.15 : l.small ? fs * 0.68 : fs, l, !l.small);
  // Avec des factions, les quartiers passent après leurs noms : ils s'effacent plutôt que de les recouvrir
  for (const d of city.districts) textAt('qtr', fs * 1.15, { at: d.at, text: d.name }, !(city.factions || []).length);
  for (const g of city.gateNames) textAt('gate', fs * 0.8, g, true);
  for (const sq of city.squares) textAt('small', fs * 0.68, { at: [sq.at[0], sq.at[1] + fs * 0.9], text: sq.name }, false);
  for (const ch of city.churches) textAt('small', fs * 0.68, { at: ch.at, text: ch.name }, false);
  for (const inn of city.inns) textAt('inn', fs * 0.62, { at: [inn.at[0], inn.at[1] - fs * 0.9], text: inn.name }, false);
  for (const o of city.outskirts || []) textAt('small', fs * 0.62, { at: [o.at[0], o.at[1] + fs * 1.1], text: o.label }, false);
  for (const isl of city.islands || []) textAt('small', fs * 0.62, { at: isl.at, text: isl.name }, false);
  for (const m of city.mills || []) textAt('small', fs * 0.55, { at: [m.at[0], m.at[1] - fs * 0.9], text: m.name }, false);

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
  ['tile', 'slate', 'thatch', 'inn'].map((k, i) => [k, textFor(city.lang).render.roofs[i]]).forEach(([k, t], i) => {
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
