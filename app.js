'use strict';
/* Interface: settings ↔ page address, generation, zoom, save, export. English by default, French on request. */

const $ = id => document.getElementById(id);
let current = null;   // ville générée
let opts = null;      // réglages qui l'ont produite
let view = null;      // zone visible { x, y, w } (carré, en mètres)
let mapView = new URLSearchParams(location.hash.slice(1)).get('vue') || 'plan';   // plan, relief ou pentes

function randomSeed() {
  return Math.random().toString(36).slice(2, 8);
}

// ---------- language / langue ----------
// The page is written in English; each translatable element carries its French text in data-fr
const savedLang = (() => { try { return localStorage.getItem('lang'); } catch (e) { return null; } })();
let lang = new URLSearchParams(location.hash.slice(1)).get('lang') || savedLang || 'en';
const UI = {
  en: { population: 'Population', people: 'people', houses: 'Houses', stone: 'stone', timber: 'timber', thatch: 'thatch', diameter: 'Diameter', gates: 'Gates',
    rivers: 'Rivers', none: 'none', relief: 'Terrain', plan: 'Layout', walls: 'Walls', notPlaced: 'Not placed', noRoom: 'Not enough room', oldWalls: ' (the old ones are partly pulled down)',
    reliefs: c => ({ plaine: 'plain', colline: 'one hill' + (c.citadel ? ', citadel on top' : ''), collines: 'several hills' + (c.citadel ? ', acropolis on the highest' : ''), vallee: 'valley' }),
    plans: c => (c.plan === 'bastide' ? 'bastide (grid)' : 'organic') + (c.twin ? ', upper + lower town' : ''), badFile: 'This file is not a city saved by this generator.', locale: 'en-GB' },
  fr: { population: 'Population', people: 'habitants', houses: 'Maisons', stone: 'pierre', timber: 'colombages', thatch: 'chaume', diameter: 'Diamètre', gates: 'Portes',
    rivers: 'Rivières', none: 'aucune', relief: 'Relief', plan: 'Plan', walls: 'Enceintes', notPlaced: 'Non placé', noRoom: 'Pas assez de place', oldWalls: ' (les anciennes sont en partie démolies)',
    reliefs: c => ({ plaine: 'plaine', colline: 'colline' + (c.citadel ? ', citadelle au sommet' : ''), collines: 'plusieurs collines' + (c.citadel ? ', acropole sur la plus haute' : ''), vallee: 'vallée' }),
    plans: c => (c.plan === 'bastide' ? 'bastide (damier)' : 'organique') + (c.twin ? ', ville haute + ville basse' : ''), badFile: "Ce fichier n'est pas une ville enregistrée par ce générateur.", locale: 'fr-FR' },
};
const ui = () => UI[lang === 'fr' ? 'fr' : 'en'];

function applyLang() {
  document.documentElement.lang = lang;
  document.title = lang === 'fr' ? 'Générateur de villes médiévales' : 'Medieval City Generator';
  document.querySelectorAll('[data-fr]').forEach(el => {
    if (el.dataset.en === undefined) el.dataset.en = el.textContent;
    el.textContent = lang === 'fr' ? el.dataset.fr : el.dataset.en;
  });
  document.querySelectorAll('[data-fr-title]').forEach(el => {
    if (el.dataset.enTitle === undefined) el.dataset.enTitle = el.title;
    el.title = lang === 'fr' ? el.dataset.frTitle : el.dataset.enTitle;
  });
  $('lang').textContent = lang === 'fr' ? 'EN' : 'FR';
  // Landmark check boxes, from the catalogue, keeping what is ticked
  const ticked = new Set([...document.querySelectorAll('#buildings input:checked')].map(i => i.value));
  $('buildings').innerHTML = BUILDINGS.map(b =>
    `<label class="check"><input type="checkbox" value="${b.id}"${ticked.has(b.id) ? ' checked' : ''}> ${textFor(lang).buildings[b.id] || b.label}</label>`).join('');
}
applyLang();
$('lang').onclick = () => {
  lang = lang === 'fr' ? 'en' : 'fr';
  try { localStorage.setItem('lang', lang); } catch (e) { /* private mode */ }
  applyLang();
  build({ ...opts });
};

// ---------- réglages ----------

// Quantités : [option, paramètre d'adresse, min, max] ; vide = au hasard
const COUNTS = [['nHills', 'n_collines', 0, 10], ['nRivers', 'n_rivieres', 0, 3], ['nGates', 'n_portes', 2, 8], ['nRings', 'n_enceintes', 1, 3], ['nDistricts', 'n_quartiers', 2, 12], ['nLedges', 'n_ressauts', 0, 3], ['nSquares', 'n_placettes', 0, 8], ['nChurches', 'n_eglises', 0, 12], ['nInns', 'n_auberges', 0, 10], ['nIslands', 'n_iles', 0, 3], ['nCanals', 'n_biefs', 0, 3], ['forest', 'foret', 0, 100]];
const toCount = (v, lo, hi) => (v === null || v === undefined || v === '' || isNaN(+v) ? null : Math.max(lo, Math.min(hi, Math.round(+v))));

function normalize(o) {
  return {
    seed: String(o.seed || randomSeed()),
    size: SIZES[o.size] ? o.size : 'moyenne',
    river: ['auto', 'non', 'oui', 'deux'].includes(o.river) ? o.river : 'auto',
    relief: ['auto', 'plaine', 'colline', 'collines', 'vallee'].includes(o.relief) ? o.relief : 'auto',
    age: ['auto', 'jeune', 'ancienne', 'tresancienne'].includes(o.age) ? o.age : 'auto',
    plan: ['organique', 'bastide', 'auto'].includes(o.plan) ? o.plan : 'organique',
    walls: ['simple', 'double', 'auto'].includes(o.walls) ? o.walls : 'simple',
    twin: ['non', 'oui', 'auto'].includes(o.twin) ? o.twin : 'non',
    ledges: ['auto', 'oui', 'non'].includes(o.ledges) ? o.ledges : 'auto',
    ...Object.fromEntries(COUNTS.map(([k, , lo, hi]) => [k, toCount(o[k], lo, hi)])),
    hillType: ['auto', 'butte', 'crete', 'eperon', 'table', 'dissymetrique'].includes(o.hillType) ? o.hillType : 'auto',
    valleyType: ['auto', 'large', 'gorge', 'confluence', 'meandre'].includes(o.valleyType) ? o.valleyType : 'auto',
    buildings: Array.isArray(o.buildings) ? o.buildings.filter(id => BUILDINGS.some(b => b.id === id)) : DEFAULT_BUILDINGS.slice(),
    names: Array.isArray(o.names) ? o.names.map(n => String(n || '')) : [],
    cityName: String(o.cityName || ''),
    lang: lang === 'fr' ? 'fr' : 'en',
  };
}

function readHash() {
  const p = new URLSearchParams(location.hash.slice(1));
  // Anciennes adresses : rivières, âge et ressauts étaient des sélecteurs
  if (!p.has('n_rivieres') && ({ non: 1, oui: 1, deux: 1 })[p.get('riviere')]) p.set('n_rivieres', { non: 0, oui: 1, deux: 2 }[p.get('riviere')]);
  if (!p.has('n_enceintes') && ({ jeune: 1, ancienne: 1, tresancienne: 1 })[p.get('age')]) p.set('n_enceintes', { jeune: 1, ancienne: 2, tresancienne: 3 }[p.get('age')]);
  if (!p.has('n_ressauts') && p.get('ressauts') === 'non') p.set('n_ressauts', 0);
  return normalize({
    seed: p.get('graine'),
    size: p.get('taille'),
    river: p.get('riviere'),
    relief: p.get('relief'),
    age: p.get('age'),
    plan: p.get('plan'),
    walls: p.get('enceinte'),
    twin: p.get('haute'),
    ledges: p.get('ressauts'),
    ...Object.fromEntries(COUNTS.map(([k, h]) => [k, p.get(h)])),
    hillType: p.get('forme'),
    valleyType: p.get('vallee'),
    buildings: p.has('bat') ? p.get('bat').split(',').filter(Boolean) : undefined,
    names: p.has('noms') ? p.get('noms').split('|') : [],
    cityName: p.get('nom'),
  });
}

function writeHash(o) {
  const p = new URLSearchParams({
    graine: o.seed, taille: o.size, relief: o.relief, plan: o.plan, enceinte: o.walls, haute: o.twin, forme: o.hillType, vallee: o.valleyType, bat: o.buildings.join(','),
  });
  if (o.cityName) p.set('nom', o.cityName);
  for (const [k, h] of COUNTS) if (o[k] !== null && o[k] !== undefined) p.set(h, o[k]);
  if (mapView !== 'plan') p.set('vue', mapView);
  p.set('lang', lang);
  if (o.names.some(Boolean)) p.set('noms', o.names.join('|'));
  history.replaceState(null, '', '#' + p);
}

function fromControls() {
  return {
    ...opts,
    seed: $('seed').value.trim() || randomSeed(),
    size: $('size').value,
    relief: $('relief').value,
    plan: $('plan').value,
    walls: $('walls').value,
    twin: $('twin').value,
    ...Object.fromEntries(COUNTS.map(([k]) => [k, $(k).value === '' ? null : $(k).value])),
    river: 'auto', age: 'auto', ledges: 'auto',   // remplacés par les quantités
    hillType: $('hillType').value,
    valleyType: $('valleyType').value,
    buildings: [...document.querySelectorAll('#buildings input:checked')].map(i => i.value),
  };
}

// ---------- génération ----------

// Calcul en arrière-plan (Web Worker) ; si le navigateur le refuse (fichier ouvert depuis le disque), calcul direct
let worker = null, jobId = 0;
try { worker = new Worker('worker.js' + (document.currentScript ? new URL(document.currentScript.src).search : '')); worker.onerror = () => { worker = null; }; } catch (e) { worker = null; }
const compute = o => new Promise((resolve, reject) => {
  if (!worker) { try { resolve(generateCity(o)); } catch (e) { reject(e); } return; }
  const id = ++jobId;
  const onMsg = e => {
    if (e.data.id !== id) return;
    worker.removeEventListener('message', onMsg);
    if (e.data.error) reject(new Error(e.data.error)); else resolve(e.data.city);
  };
  worker.addEventListener('message', onMsg);
  worker.postMessage({ id, opts: o });
});
let latest = 0;

function build(o) {
  opts = normalize(o);
  $('seed').value = opts.seed;
  $('size').value = opts.size;
  $('relief').value = opts.relief;
  $('plan').value = opts.plan;
  $('walls').value = opts.walls;
  $('twin').value = opts.twin;
  for (const [k] of COUNTS) $(k).value = opts[k] === null ? '' : opts[k];
  $('hillType').value = opts.hillType;
  $('valleyType').value = opts.valleyType;
  document.querySelectorAll('#buildings input').forEach(i => { i.checked = opts.buildings.includes(i.value); });
  writeHash(opts);
  const ticket = ++latest;
  $('busy').hidden = false;
  compute(opts).then(city => {
    if (ticket !== latest) return;   // une demande plus récente est en cours
    $('busy').hidden = true;
    show(city);
  }).catch(err => {
    $('busy').hidden = true;
    console.error(err);
    if (worker) { worker = null; build(o); }   // repli : calcul direct
  });
}

// Affiche une ville calculée
function show(city) {
  const previousE = current && current.E;
  current = city;
  $('cityName').value = opts.cityName;
  $('cityName').placeholder = current.autoName;
  drawMap();
  if (!view || previousE !== current.E) resetView();
  applyView();

  const s = current.stats, U = ui(), sep = lang === 'fr' ? ' : ' : ': ', num = v => v.toLocaleString(U.locale);
  $('info').innerHTML = `
    <h2>${escAttr(current.name)}</h2>
    <dl>
      <dt>${U.population}</dt><dd>≈ ${num(s.population)} ${U.people}</dd>
      <dt>${U.houses}</dt><dd>${num(s.houses)} (${U.stone} ${s.stone}, ${U.timber} ${s.timber}, ${U.thatch} ${s.thatch})</dd>
      <dt>${U.diameter}</dt><dd>≈ ${s.diameter} m</dd>
      <dt>${U.gates}</dt><dd>${escAttr(current.gateNames.map(g => g.text).join(', '))}</dd>
      <dt>${U.rivers}</dt><dd>${s.rivers || U.none}</dd>
      <dt>${U.relief}</dt><dd>${U.reliefs(current)[s.relief]}</dd>
      <dt>${U.plan}</dt><dd>${U.plans(current)}</dd>
      <dt>${U.walls}</dt><dd>${s.age}${s.age > 1 ? U.oldWalls : ''}</dd>
    </dl>
    ${s.missing.length ? `<p class="warn">${U.notPlaced}${sep}${escAttr(s.missing.join(', '))}</p>` : ''}
    ${s.shortfalls && s.shortfalls.length ? `<p class="warn">${U.noRoom}${sep}${escAttr(s.shortfalls.join('; '))}</p>` : ''}`;

  $('sheet').innerHTML = sheetToHtml(citySheet(current));
  $('districts').innerHTML = current.districts.map((d, k) => `
    <label class="district">
      <input type="text" data-k="${k}" value="${escAttr(opts.names[k] || '')}" placeholder="${escAttr(d.auto)}">
    </label>`).join('');
}

// Dessine la ville dans la vue choisie, sans la régénérer
function drawMap() {
  if (!current) return;
  $('map').innerHTML = renderSVG(current, { view: mapView });
  document.querySelectorAll('.views button').forEach(b => b.classList.toggle('on', b.dataset.view === mapView));
  if (view) applyView();
}
document.querySelectorAll('.views button').forEach(b => b.onclick = () => {
  mapView = b.dataset.view;
  drawMap();
  writeHash(opts);
});

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
    alert(ui().badFile);
  }
};

// ---------- export image (toujours la carte entière) ----------

$('md').onclick = () => download(new Blob([citySheet(current)], { type: 'text/markdown' }), fileBase() + '.md');
$('svg').onclick = () => download(new Blob([renderSVG(current, { view: mapView })], { type: 'image/svg+xml' }), fileBase() + (mapView === 'plan' ? '' : '-' + mapView) + '.svg');

$('png').onclick = () => {
  const img = new Image();
  const url = URL.createObjectURL(new Blob([renderSVG(current, { view: mapView })], { type: 'image/svg+xml' }));
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
$('relief').onchange = $('plan').onchange = $('walls').onchange = $('twin').onchange = $('hillType').onchange = $('valleyType').onchange = () => build(fromControls());
for (const [k] of COUNTS) $(k).onchange = () => build(fromControls());
$('buildings').addEventListener('change', () => build(fromControls()));

window.addEventListener('hashchange', () => {
  const l = new URLSearchParams(location.hash.slice(1)).get('lang');
  if (l && l !== lang) { lang = l; applyLang(); }
  build(readHash());
});

build(readHash());
