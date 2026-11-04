'use strict';
/* Interface : réglages ↔ adresse de la page, génération, zoom, enregistrement, export. */

const $ = id => document.getElementById(id);
let current = null;   // ville générée
let opts = null;      // réglages qui l'ont produite
let view = null;      // zone visible { x, y, w } (carré, en mètres)

function randomSeed() {
  return Math.random().toString(36).slice(2, 8);
}

// Cases à cocher des bâtiments, construites depuis le catalogue
$('buildings').innerHTML = BUILDINGS.map(b =>
  `<label class="check"><input type="checkbox" value="${b.id}"> ${b.label}</label>`).join('');

// ---------- réglages ----------

function normalize(o) {
  return {
    seed: String(o.seed || randomSeed()),
    size: SIZES[o.size] ? o.size : 'moyenne',
    river: ['auto', 'non', 'oui', 'deux'].includes(o.river) ? o.river : 'auto',
    hill: ['auto', 'oui', 'non'].includes(o.hill) ? o.hill : 'auto',
    inner: ['aucun', 'un', 'plusieurs'].includes(o.inner) ? o.inner : 'aucun',
    buildings: Array.isArray(o.buildings) ? o.buildings.filter(id => BUILDINGS.some(b => b.id === id)) : DEFAULT_BUILDINGS.slice(),
    names: Array.isArray(o.names) ? o.names.map(n => String(n || '')) : [],
    cityName: String(o.cityName || ''),
  };
}

function readHash() {
  const p = new URLSearchParams(location.hash.slice(1));
  return normalize({
    seed: p.get('graine'),
    size: p.get('taille'),
    river: p.get('riviere'),
    hill: p.get('colline'),
    inner: p.get('murs'),
    buildings: p.has('bat') ? p.get('bat').split(',').filter(Boolean) : undefined,
    names: p.has('noms') ? p.get('noms').split('|') : [],
    cityName: p.get('nom'),
  });
}

function writeHash(o) {
  const p = new URLSearchParams({
    graine: o.seed, taille: o.size, riviere: o.river, colline: o.hill, murs: o.inner, bat: o.buildings.join(','),
  });
  if (o.cityName) p.set('nom', o.cityName);
  if (o.names.some(Boolean)) p.set('noms', o.names.join('|'));
  history.replaceState(null, '', '#' + p);
}

function fromControls() {
  return {
    ...opts,
    seed: $('seed').value.trim() || randomSeed(),
    size: $('size').value,
    river: $('river').value,
    hill: $('hill').value,
    inner: $('inner').value,
    buildings: [...document.querySelectorAll('#buildings input:checked')].map(i => i.value),
  };
}

// ---------- génération ----------

function build(o) {
  const previousE = current && current.E;
  opts = normalize(o);
  $('seed').value = opts.seed;
  $('size').value = opts.size;
  $('river').value = opts.river;
  $('hill').value = opts.hill;
  $('inner').value = opts.inner;
  document.querySelectorAll('#buildings input').forEach(i => { i.checked = opts.buildings.includes(i.value); });
  writeHash(opts);

  current = generateCity(opts);
  $('cityName').value = opts.cityName;
  $('cityName').placeholder = current.autoName;
  $('map').innerHTML = renderSVG(current);
  if (!view || previousE !== current.E) resetView();
  applyView();

  const s = current.stats;
  $('info').innerHTML = `
    <h2>${escAttr(current.name)}</h2>
    <dl>
      <dt>Population</dt><dd>≈ ${s.population.toLocaleString('fr-FR')} habitants</dd>
      <dt>Bâtiments</dt><dd>${s.buildings.toLocaleString('fr-FR')}</dd>
      <dt>Diamètre</dt><dd>≈ ${s.diameter} m</dd>
      <dt>Portes</dt><dd>${current.gateNames.map(g => g.text).join(', ')}</dd>
      <dt>Rivières</dt><dd>${s.rivers || 'aucune'}</dd>
      <dt>Colline</dt><dd>${s.hill ? 'oui' : 'non'}</dd>
    </dl>
    ${s.missing.length ? `<p class="warn">Non placé : ${s.missing.join(', ')}</p>` : ''}`;

  $('districts').innerHTML = current.districts.map((d, k) => `
    <label class="district">
      <input type="text" data-k="${k}" value="${escAttr(opts.names[k] || '')}" placeholder="${escAttr(d.auto)}">
      ${d.fortified ? '<span title="Quartier fortifié">🛡</span>' : ''}
    </label>`).join('');
}

function escAttr(s) {
  return String(s).replace(/[&"<>]/g, c => ({ '&': '&amp;', '"': '&quot;', '<': '&lt;', '>': '&gt;' }[c]));
}

// ---------- renommer ----------

$('districts').addEventListener('change', e => {
  const k = +e.target.dataset.k;
  const names = opts.names.slice();
  while (names.length < current.districts.length) names.push('');
  names[k] = e.target.value.replace(/\|/g, '/').trim();
  build({ ...opts, names });
});
$('districts').addEventListener('keydown', e => { if (e.key === 'Enter') e.target.blur(); });
$('cityName').onchange = () => build({ ...opts, cityName: $('cityName').value.trim() });
$('cityName').onkeydown = e => { if (e.key === 'Enter') e.target.blur(); };

// ---------- zoom et déplacement ----------

function resetView() {
  view = { x: -current.E, y: -current.E, w: 2 * current.E };
}

function applyView() {
  const svg = $('map').querySelector('svg');
  if (!svg) return;
  svg.setAttribute('viewBox', `${view.x} ${view.y} ${view.w} ${view.w}`);
  // Étiquettes : grossissent un peu en zoomant, mais beaucoup moins que la carte
  svg.style.setProperty('--z', Math.pow(view.w / (2 * current.E), 0.7).toFixed(3));
}

// Zoom d'un facteur k autour d'un point de la carte (en mètres)
function zoomAt(k, cx, cy) {
  const full = 2 * current.E;
  const w = Math.min(full, Math.max(full / 16, view.w / k));
  const f = w / view.w;
  view = { x: cx - (cx - view.x) * f, y: cy - (cy - view.y) * f, w };
  clampView();
  applyView();
}

function clampView() {
  const E = current.E;
  view.x = Math.min(E - view.w, Math.max(-E, view.x));
  view.y = Math.min(E - view.w, Math.max(-E, view.y));
}

function toMap(evt) {
  const svg = $('map').querySelector('svg');
  const pt = svg.createSVGPoint();
  pt.x = evt.clientX; pt.y = evt.clientY;
  return pt.matrixTransform(svg.getScreenCTM().inverse());
}

const center = () => [view.x + view.w / 2, view.y + view.w / 2];
$('zoomIn').onclick = () => zoomAt(1.5, ...center());
$('zoomOut').onclick = () => zoomAt(1 / 1.5, ...center());
$('zoomReset').onclick = () => { resetView(); applyView(); };

$('map').addEventListener('wheel', e => {
  if (!current) return;
  e.preventDefault();
  const p = toMap(e);
  zoomAt(Math.exp(-e.deltaY * 0.002), p.x, p.y);
}, { passive: false });

$('map').addEventListener('dblclick', e => {
  const p = toMap(e);
  zoomAt(e.shiftKey ? 1 / 2 : 2, p.x, p.y);
});

let drag = null;
$('map').addEventListener('pointerdown', e => {
  const svg = $('map').querySelector('svg');
  if (!svg || e.button !== 0) return;
  drag = { startScreen: [e.clientX, e.clientY], view: { ...view } };
  svg.setPointerCapture(e.pointerId);
  svg.classList.add('dragging');
});
$('map').addEventListener('pointermove', e => {
  if (!drag) return;
  const svg = $('map').querySelector('svg');
  const rect = svg.getBoundingClientRect();
  const scale = drag.view.w / Math.min(rect.width, rect.height);
  const s = drag.startScreen;
  view.x = drag.view.x - (e.clientX - s[0]) * scale;
  view.y = drag.view.y - (e.clientY - s[1]) * scale;
  clampView();
  applyView();
});
const endDrag = () => {
  drag = null;
  const svg = $('map').querySelector('svg');
  if (svg) svg.classList.remove('dragging');
};
$('map').addEventListener('pointerup', endDrag);
$('map').addEventListener('pointercancel', endDrag);

// ---------- enregistrer / charger ----------

function download(blob, filename) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
const fileBase = () => `${current.name}-${current.seed}`.replace(/[\\/:*?"<>|]/g, '_');

$('save').onclick = () => {
  const data = { format: 'city-medieval-generator', version: 1, ville: current.name, options: opts };
  download(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }), fileBase() + '.json');
};

$('load').onclick = () => $('file').click();
$('file').onchange = async () => {
  const f = $('file').files[0];
  $('file').value = '';
  if (!f) return;
  try {
    const data = JSON.parse(await f.text());
    if (data.format !== 'city-medieval-generator' || !data.options) throw new Error('format');
    view = null;
    build(data.options);
  } catch {
    alert("Ce fichier n'est pas une ville enregistrée par ce générateur.");
  }
};

// ---------- export image (toujours la carte entière) ----------

$('svg').onclick = () => download(new Blob([renderSVG(current)], { type: 'image/svg+xml' }), fileBase() + '.svg');

$('png').onclick = () => {
  const img = new Image();
  const url = URL.createObjectURL(new Blob([renderSVG(current)], { type: 'image/svg+xml' }));
  img.onload = () => {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 3000;
    canvas.getContext('2d').drawImage(img, 0, 0, 3000, 3000);
    URL.revokeObjectURL(url);
    canvas.toBlob(b => download(b, fileBase() + '.png'), 'image/png');
  };
  img.src = url;
};

// ---------- boutons ----------

// Changer de ville ou de taille remet les noms à zéro (ils ne correspondent plus)
$('random').onclick = () => { view = null; build({ ...fromControls(), seed: randomSeed(), names: [], cityName: '' }); };
$('apply').onclick = () => build(fromControls());
$('seed').onkeydown = e => { if (e.key === 'Enter') { view = null; build({ ...fromControls(), names: [], cityName: '' }); } };
$('size').onchange = () => build({ ...fromControls(), names: [] });
$('river').onchange = $('hill').onchange = $('inner').onchange = () => build(fromControls());
$('buildings').addEventListener('change', () => build(fromControls()));

window.addEventListener('hashchange', () => build(readHash()));

build(readHash());
