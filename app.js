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
const COUNTS = [['nHills', 'n_collines', 0, 10], ['nRivers', 'n_rivieres', 0, 3], ['nGates', 'n_portes', 2, 8], ['nRings', 'n_enceintes', 1, 3], ['nDistricts', 'n_quartiers', 2, 12], ['nLedges', 'n_ressauts', 0, 3], ['nSquares', 'n_placettes', 0, 8], ['nChurches', 'n_eglises', 0, 12], ['nInns', 'n_auberges', 0, 10], ['nIslands', 'n_iles', 0, 3], ['nCanals', 'n_biefs', 0, 3], ['forest', 'foret', 0, 100], ['nFactions', 'n_factions', 0, 8]];
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
    citadel: ['oui', 'non', 'auto'].includes(o.citadel) ? o.citadel : 'oui',
    ledges: ['auto', 'oui', 'non'].includes(o.ledges) ? o.ledges : 'auto',
    ...Object.fromEntries(COUNTS.map(([k, , lo, hi]) => [k, toCount(o[k], lo, hi)])),
    hillType: ['auto', 'butte', 'crete', 'eperon', 'table', 'dissymetrique'].includes(o.hillType) ? o.hillType : 'auto',
    valleyType: ['auto', 'large', 'gorge', 'confluence', 'meandre'].includes(o.valleyType) ? o.valleyType : 'auto',
    buildings: Array.isArray(o.buildings) ? o.buildings.filter(id => BUILDINGS.some(b => b.id === id)) : DEFAULT_BUILDINGS.slice(),
    names: Array.isArray(o.names) ? o.names.map(n => String(n || '')) : [],
    factionNames: Array.isArray(o.factionNames) ? o.factionNames.map(n => String(n || '')) : [],
    cityName: String(o.cityName || ''),
    // Retouches du terrain faites dans l'éditeur, et rivières dessinées (null = rivières du générateur)
    terrainEdits: Array.isArray(o.terrainEdits) ? o.terrainEdits.filter(e => e && 'rls'.includes(e.t) && [e.x, e.y, e.r, e.a].every(Number.isFinite)).map(e => ({ t: e.t, x: +e.x, y: +e.y, r: +e.r, a: +e.a, g: +e.g || 0 })) : [],
    userRivers: Array.isArray(o.userRivers) ? o.userRivers.filter(r => Array.isArray(r) && r.length >= 2).map(r => r.map(p => [+p[0], +p[1]])) : null,
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
    citadel: p.get('citadelle'),
    ledges: p.get('ressauts'),
    ...Object.fromEntries(COUNTS.map(([k, h]) => [k, p.get(h)])),
    hillType: p.get('forme'),
    valleyType: p.get('vallee'),
    buildings: p.has('bat') ? p.get('bat').split(',').filter(Boolean) : undefined,
    names: p.has('noms') ? p.get('noms').split('|') : [],
    factionNames: p.has('factions') ? p.get('factions').split('|') : [],
    cityName: p.get('nom'),
    terrainEdits: p.has('terre') ? editsFromText(p.get('terre')) : [],
    userRivers: p.has('eaux') ? (p.get('eaux') === 'none' ? [] : riversFromText(p.get('eaux'))) : null,
  });
}

function writeHash(o) {
  const p = new URLSearchParams({
    graine: o.seed, taille: o.size, relief: o.relief, plan: o.plan, enceinte: o.walls, haute: o.twin, citadelle: o.citadel, forme: o.hillType, vallee: o.valleyType, bat: o.buildings.join(','),
  });
  if (o.cityName) p.set('nom', o.cityName);
  for (const [k, h] of COUNTS) if (o[k] !== null && o[k] !== undefined) p.set(h, o[k]);
  if (mapView !== 'plan') p.set('vue', mapView);
  p.set('lang', lang);
  if (o.names.some(Boolean)) p.set('noms', o.names.join('|'));
  if (o.factionNames.some(Boolean)) p.set('factions', o.factionNames.join('|'));
  if (o.terrainEdits.length) p.set('terre', editsToText(o.terrainEdits));
  if (o.userRivers) p.set('eaux', o.userRivers.length ? riversToText(o.userRivers) : 'none');
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
    citadel: $('citadel').value,
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
  $('citadel').value = opts.citadel;
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
  // Factions (puis le quartier du maire, au centre) : chacune se renomme comme un quartier
  const facs = current.factions || [];
  $('factionNames').innerHTML = facs.map(f => `
    <label class="district faction"><span class="swatch" style="background:${f.color}"></span>
      <input type="text" data-f="${f.index}" value="${escAttr(opts.factionNames[f.index] || '')}" placeholder="${escAttr(f.auto)}">
    </label>`).join('');
  $('districts').innerHTML = current.districts.map((d, k) => `
    <label class="district">
      <input type="text" data-k="${k}" value="${escAttr(opts.names[k] || '')}" placeholder="${escAttr(d.auto)}">
    </label>`).join('');
}

// ---------- Noms : on peut masquer les noms des rues, quartiers et lieux ----------
let showNames = (() => { try { return localStorage.getItem('names-layer') !== 'off'; } catch (e) { return true; } })();
$('namesToggle').onclick = () => {
  showNames = !showNames;
  try { localStorage.setItem('names-layer', showNames ? 'on' : 'off'); } catch (e) { /* mode privé */ }
  drawMap();
};

// ---------- Calque des factions : on peut le masquer pour mieux voir la ville ----------
let showFactions = (() => { try { return localStorage.getItem('factions-layer') !== 'off'; } catch (e) { return true; } })();
$('facToggle').onclick = () => {
  showFactions = !showFactions;
  try { localStorage.setItem('factions-layer', showFactions ? 'on' : 'off'); } catch (e) { /* mode privé */ }
  drawMap();
};

// ---------- Éditeur de terrain : on peint le relief, on trace les rivières, puis on rebâtit la ville ----------
let editing = false, tool = 'r', brush = { r: 90, a: 4 };
let edBase = null;        // terrain de la ville actuelle (déjà avec les retouches précédentes)
let edNew = [];           // coups de pinceau depuis la dernière construction
let edRivers = null;      // rivières dessinées (null = celles du générateur)
let edDraft = [];         // rivière en cours de tracé
let edUndo = [];          // pile d'annulation
let edGroup = 0, edStroke = null, edCursor = null;
document.querySelectorAll('input[name=tool]').forEach(i => i.onchange = () => {
  tool = i.value;
  $('editHint').textContent = tool === 'river' ? (lang === 'fr' ? 'Clique pour poser les points de la rivière ; double-clic ou Entrée pour finir.' : 'Click to place the river\'s points; double-click or Enter to finish.')
    : tool === 'erase' ? (lang === 'fr' ? 'Clique sur une rivière pour l\'effacer.' : 'Click a river to erase it.')
    : (lang === 'fr' ? 'Glisse pour peindre (Maj + glisser : déplacer la carte).' : 'Drag to paint (Shift + drag: move the map).');
  drawMap();
});
$('brushR').oninput = () => { brush.r = +$('brushR').value; $('brushRv').textContent = brush.r + ' m'; drawMap(); };
$('brushA').oninput = () => { brush.a = +$('brushA').value; $('brushAv').textContent = brush.a + ' m'; };
const riversNow = () => (edRivers || (current.rivers || []).map(rv => rv.points.filter((p, i, a) => i % 6 === 0 || i === a.length - 1)));
function previewCity() {
  const T = edBase;
  const alt = T.alt.slice();
  const g = { E: T.E, step: T.step, n: T.G + 1, data: alt };
  for (const e of edNew) applyEdit(g, e, 1);
  let mn = Infinity, mx = -Infinity;
  for (const v of alt) { if (v < mn) mn = v; if (v > mx) mx = v; }
  const w = (current.rivers[0] || { w: 16 }).w;
  return { ...current, terrain: { ...T, alt, min: mn, maxAlt: mx, flat: false }, rivers: riversNow().map((pts, k) => ({ w: k ? w * 0.65 : w, points: pts })) };
}
function editOverlay() {
  const out = [];
  if (edDraft.length) out.push(`<path d="M${edDraft.map(p => p.join(' ')).join('L')}" fill="none" stroke="#3f6e9e" stroke-width="${current.E / 120}" stroke-dasharray="${current.E / 60} ${current.E / 90}"/>` + edDraft.map(p => `<circle cx="${p[0]}" cy="${p[1]}" r="${current.E / 110}" fill="#3f6e9e"/>`).join(''));
  if (edCursor && 'rls'.includes(tool)) out.push(`<circle cx="${edCursor[0]}" cy="${edCursor[1]}" r="${brush.r}" fill="none" stroke="#2f2820" stroke-width="${current.E / 400}" stroke-dasharray="${current.E / 120}"/>`);
  return out.join('');
}
let edRaf = 0;
const redrawSoon = () => { if (!edRaf) edRaf = requestAnimationFrame(() => { edRaf = 0; drawMap(); }); };
function stamp(p) { edNew.push({ t: tool, x: p[0], y: p[1], r: brush.r, a: brush.a, g: edGroup }); edStroke = p; }
function editDown(e) {
  const q = toMap(e), p = [q.x, q.y];
  if ('rls'.includes(tool)) {
    edGroup++;
    edUndo.push({ kind: 'brush', g: edGroup });
    stamp(p);
    $('map').querySelector('svg').setPointerCapture(e.pointerId);
    redrawSoon();
  } else if (tool === 'river') {
    edDraft.push(p);
    redrawSoon();
  } else if (tool === 'erase') {
    const rs = riversNow();
    let best = -1, bd = Math.max(30, current.E / 40);
    rs.forEach((pts, k) => { for (let i = 0; i + 1 < pts.length; i++) { const d = Geo.distToSegment(p, pts[i], pts[i + 1]); if (d < bd) { bd = d; best = k; } } });
    if (best >= 0) { edUndo.push({ kind: 'rivers', prev: edRivers }); edRivers = rs.filter((_, k) => k !== best); redrawSoon(); }
  }
}
function editMove(e) {
  const q = toMap(e), p = [q.x, q.y];
  edCursor = p;
  if (edStroke && 'rls'.includes(tool) && Math.hypot(p[0] - edStroke[0], p[1] - edStroke[1]) > brush.r / 3) stamp(p);
  redrawSoon();
}
function editUp() { edStroke = null; }
function finishRiver() {
  if (edDraft.length >= 2) { edUndo.push({ kind: 'rivers', prev: edRivers }); edRivers = [...riversNow(), edDraft]; }
  edDraft = [];
  redrawSoon();
}
window.addEventListener('keydown', e => {
  if (!editing) return;
  if (e.key === 'Enter' && tool === 'river') finishRiver();
  if (e.key === 'Escape') { edDraft = []; redrawSoon(); }
});
function setEditing(on) {
  editing = on;
  $('editBtn').classList.toggle('on', on);
  $('editInfo').hidden = !on;
  $('map').classList.toggle('editing', on);
  if (on) { edBase = current.terrain; edNew = []; edRivers = opts.userRivers ? opts.userRivers.map(r => r.slice()) : null; edDraft = []; edUndo = []; }
  drawMap();
}
$('editBtn').onclick = () => setEditing(!editing);
$('editUndo').onclick = () => {
  if (edDraft.length) { edDraft.pop(); return redrawSoon(); }
  const last = edUndo.pop();
  if (!last) return;
  if (last.kind === 'brush') edNew = edNew.filter(e => e.g !== last.g);
  else edRivers = last.prev;
  redrawSoon();
};
$('editClear').onclick = () => { setEditing(false); build({ ...opts, terrainEdits: [], userRivers: null }); };
$('editBuild').onclick = () => {
  if (edDraft.length >= 2) finishRiver();
  const terrainEdits = [...opts.terrainEdits, ...edNew.map(e => ({ ...e, x: Math.round(e.x), y: Math.round(e.y) }))];
  const userRivers = edRivers ? edRivers.map(r => r.map(p => [Math.round(p[0]), Math.round(p[1])])) : null;
  setEditing(false);
  mapView = 'plan';
  build({ ...opts, terrainEdits, userRivers });
};

// ---------- Sight: what a seer sees from a point ----------
let sightCache = null, sightAt = null;
function sightOverlay() {
  if (!sightCache || sightCache.city !== current) { sightCache = { city: current, grid: sightGrid(current) }; sightAt = null; }
  const G = sightCache.grid;
  if (!sightAt) sightAt = current.esplanade ? current.esplanade.c.slice() : current.centre ? current.centre.at.slice() : [0, 0];
  const tower = $('tower').checked;
  const seen = sightFrom(G, sightAt, tower ? SIGHT_HEIGHTS.tower : SIGHT_HEIGHTS.eye);
  // Hidden ground is darkened; what can be seen stays clear
  const cv = document.createElement('canvas');
  cv.width = cv.height = G.n;
  const ctx = cv.getContext('2d'), img = ctx.createImageData(G.n, G.n);
  for (let k = 0; k < seen.length; k++) if (!seen[k]) { img.data[k * 4] = 28; img.data[k * 4 + 1] = 30; img.data[k * 4 + 2] = 48; img.data[k * 4 + 3] = 135; }
  ctx.putImageData(img, 0, 0);
  const E = current.E, [x, y] = sightAt;
  const rings = [100, 200, 400, 800].map(r => `<circle cx="${x}" cy="${y}" r="${r}" fill="none" stroke="#fffaf0" stroke-opacity=".8" stroke-width="1.5" stroke-dasharray="6 6"/><text x="${x + r * 0.71 + 4}" y="${y - r * 0.71}" font-size="${E / 60}" fill="#fffaf0" paint-order="stroke" stroke="#333" stroke-width="${E / 400}">${r} m</text>`).join('');
  const eye = `<g transform="translate(${x} ${y})"><circle r="${E / 90}" fill="#fffaf0" stroke="#7a3a26" stroke-width="${E / 300}"/><circle r="${E / 260}" fill="#7a3a26"/></g>`;
  // Which factions the seer can see, and how much of their quarter
  const list = sightSummary(G, seen);
  const fname = i => (current.factions.find(f => f.index === i) || {});
  $('sightList').innerHTML = !current.factions.length ? ''
    : (list.length ? `<p>${lang === 'fr' ? 'Visible d\'ici :' : 'Seen from here:'}</p>` + list.map(v => `<div class="row2"><span class="swatch" style="background:${fname(v.faction).color}"></span>${escAttr(fname(v.faction).name)} — ${Math.round(v.share * 100)} %</div>`).join('')
      : `<p>${lang === 'fr' ? 'Aucun quartier de faction visible d\'ici.' : 'No faction quarter can be seen from here.'}</p>`);
  return `<image x="${-E}" y="${-E}" width="${2 * E}" height="${2 * E}" preserveAspectRatio="none" style="image-rendering:pixelated" href="${cv.toDataURL()}"/>${rings}${eye}`;
}
$('tower').onchange = () => drawMap();

// Dessine la ville dans la vue choisie, sans la régénérer
function drawMap() {
  if (!current) return;
  $('sightInfo').hidden = mapView !== 'sight';
  if (editing) {
    $('map').innerHTML = renderSVG(previewCity(), { view: 'relief', factions: false }).replace(/<\/svg>$/, editOverlay() + '</svg>');
    if (view) applyView();
    return;
  }
  if (mapView === 'sight') {
    const svg = renderSVG(current, { view: 'plan', factions: showFactions, labels: showNames });
    $('map').innerHTML = svg.slice(0, svg.lastIndexOf('</svg>')) + sightOverlay() + '</svg>';
  } else $('map').innerHTML = renderSVG(current, { view: mapView, factions: showFactions, labels: showNames });
  $('facToggle').hidden = !(current.factions || []).length;
  $('facToggle').classList.toggle('on', showFactions);
  $('namesToggle').classList.toggle('on', showNames);
  document.querySelectorAll('.views button[data-view]').forEach(b => b.classList.toggle('on', b.dataset.view === mapView));
  if (view) applyView();
}
document.querySelectorAll('.views button[data-view]').forEach(b => b.onclick = () => {
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
$('factionNames').addEventListener('change', e => {
  const k = +e.target.dataset.f;
  const names = opts.factionNames.slice();
  while (names.length <= k) names.push('');
  names[k] = e.target.value.replace(/\|/g, '/').trim();
  build({ ...opts, factionNames: names });
});
$('factionNames').addEventListener('keydown', e => { if (e.key === 'Enter') e.target.blur(); });
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
  if (editing) { if (tool === 'river') finishRiver(); return; }
  const p = toMap(e);
  zoomAt(e.shiftKey ? 1 / 2 : 2, p.x, p.y);
});

let drag = null, dragMoved = 0;
$('map').addEventListener('click', e => {
  if (mapView !== 'sight' || !current || dragMoved > 6) return;
  const p = toMap(e);
  sightAt = [p.x, p.y];
  drawMap();
});
$('map').addEventListener('pointerdown', e => {
  dragMoved = 0;
  const svg = $('map').querySelector('svg');
  if (!svg || e.button !== 0) return;
  if (editing && !e.shiftKey) { editDown(e); return; }
  drag = { startScreen: [e.clientX, e.clientY], view: { ...view } };
  svg.setPointerCapture(e.pointerId);
  svg.classList.add('dragging');
});
$('map').addEventListener('pointermove', e => {
  if (editing) editMove(e);
  if (!drag) return;
  const svg = $('map').querySelector('svg');
  const rect = svg.getBoundingClientRect();
  const scale = drag.view.w / Math.min(rect.width, rect.height);
  const s = drag.startScreen;
  dragMoved = Math.max(dragMoved, Math.hypot(e.clientX - s[0], e.clientY - s[1]));
  view.x = drag.view.x - (e.clientX - s[0]) * scale;
  view.y = drag.view.y - (e.clientY - s[1]) * scale;
  clampView();
  applyView();
});
const endDrag = () => {
  if (editing) editUp();
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
$('svg').onclick = () => download(new Blob([renderSVG(current, { view: mapView, factions: showFactions, labels: showNames })], { type: 'image/svg+xml' }), fileBase() + (mapView === 'plan' ? '' : '-' + mapView) + '.svg');

$('png').onclick = () => {
  const img = new Image();
  const url = URL.createObjectURL(new Blob([renderSVG(current, { view: mapView, factions: showFactions, labels: showNames })], { type: 'image/svg+xml' }));
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
$('relief').onchange = $('plan').onchange = $('walls').onchange = $('twin').onchange = $('citadel').onchange = $('hillType').onchange = $('valleyType').onchange = () => build(fromControls());
for (const [k] of COUNTS) $(k).onchange = () => build(fromControls());
$('buildings').addEventListener('change', () => build(fromControls()));

window.addEventListener('hashchange', () => {
  const l = new URLSearchParams(location.hash.slice(1)).get('lang');
  if (l && l !== lang) { lang = l; applyLang(); }
  build(readHash());
});

build(readHash());
