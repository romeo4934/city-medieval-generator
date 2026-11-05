'use strict';
/*
 * City sheet in English: a text to write from, read off the map (relief, walls, quarters, places, streets).
 * Nothing is invented out of thin air: every sentence rests on something visible on the plan.
 * The French version is in lore.js.
 */

const RIVER_NAMES_EN = ['the Mere', 'the Wend', 'the Blackwater', 'the Alder', 'the Swale', 'the Lisk', 'the Deadwater', 'the Orme',
  'the Sallow', 'the Sleeper', 'the Silverbrook', 'the Grey'];

const DISTRICT_FLAVOUR_EN = [
  [/Old Town/, 'the ancient heart: narrow winding streets, tall stone houses packed tight, where most of the old families still live'],
  [/Tanners/, 'downstream, where the stink of the vats bothers nobody important: workshops over the water, hides drying, brown water'],
  [/Millers/, 'upstream, where the water is still clear: mills, granaries, the smell of flour'],
  [/Quays/, 'along the water: warehouses, moored barges, porters and passing merchants'],
  [/Merchants|Halls|Market|Goldsmiths|Hall Quarter/, 'the rich trading quarter: shops on the ground floor, counting houses, fine street fronts'],
  [/Smiths|Carpenters|Ropemakers|Potters|Glassmakers|Saddlers|Craftsmen|Weavers/, 'a craftsmen\'s quarter: workshops noisy from dawn, apprentices, cluttered yards'],
  [/Butchers/, 'stalls and slaughterhouses, a gutter running red on market days'],
  [/Schools/, 'students, copyists and masters, taverns loud at night'],
  [/Castle|Below the Hill/, 'at the foot of the fortified height: men-at-arms, suppliers of the castle, sloping lanes'],
  [/Newtown|New Borough/, 'a recent quarter, more open: gardens, orchards, wide plots, newcomers'],
  [/Gate/, 'around one of the town gates: inns, stables, merchants waiting for the gates to open'],
  [/Cathedral/, 'in the shadow of the cathedral: canons, pilgrims, sellers of holy trinkets'],
];

const ZONE_TEXT_EN = { vieille: 'inside the first wall', bourg: 'inside the middle wall', neuf: 'inside the last, most recent wall', citadelle: 'in the citadel' };

function citySheetEn(city) {
  const rand = mulberry32(seedHash(city.seed + '|fiche'));
  const pick = list => list[Math.floor(rand() * list.length)];
  const s = city.stats;
  const L = [];
  const n = v => v.toLocaleString('en-GB');
  const sizeText = { petite: 'Small town', moyenne: 'Market town', grande: 'Large town', capitale: 'Capital', metropole: 'Great city', mega: 'Mega city' }[city.size] || 'Town';
  const riverNames = city.rivers.map((_, i) => RIVER_NAMES_EN[(seedHash(city.seed + '|riviere|' + i)) % RIVER_NAMES_EN.length]);
  const listEn = items => (items.length <= 1 ? items.join('') : items.slice(0, -1).join(', ') + ' and ' + items[items.length - 1]);
  const name = city.name;

  L.push(`# ${name}`, '');
  L.push(`*${sizeText} of about ${n(s.population)} people, ${n(s.houses)} houses, ${s.diameter} m from wall to wall.*`, '');

  // --- Site ---
  L.push('## The site', '');
  const site = [];
  if (city.relief === 'plaine') site.push(`${name} spreads over a plain, with no defence but its walls.`);
  if (city.relief === 'vallee') site.push({
    gorge: `${name} is squeezed into the bottom of a narrow gorge: the cliffs around it protect it better than any wall, but the town could only ever grow lengthwise, along the water.`,
    confluence: `${name} was born where two valleys meet: two rivers join here, and the town holds the tongue of land between them.`,
    meandre: `${name} is locked inside a meander: the river almost circles it, and only a narrow neck of land ties it to the rest of the country, as at Besançon.`,
  }[city.valleyType] || `${name} lies on the floor of a wide valley; the slopes, too steep to build on, are covered in vines and woods.`);
  const dirEn = v => ['to the east', 'to the south-east', 'to the south', 'to the south-west', 'to the west', 'to the north-west', 'to the north', 'to the north-east'][((Math.round(Math.atan2(v[1], v[0]) / (Math.PI / 4)) % 8) + 8) % 8];
  const H0 = (city.hillShapes || [])[0];
  if (H0) {
    const desc = {
      butte: `a lone knoll about ${H0.height} m high, visible from far away`,
      crete: `a long ridge about ${H0.height} m high, running ${['east–west', 'north-west – south-east', 'north–south', 'north-east – south-west'][((Math.round(Math.atan2(H0.along[1], H0.along[0]) / (Math.PI / 4)) % 4) + 4) % 4]}`,
      eperon: `a spur about ${H0.height} m high jutting out over the valley, joined to the plateau ${dirEn(H0.along)}`,
      table: `a flat-topped mesa with sheer sides, about ${H0.height} m high`,
      dissymetrique: `a hill about ${H0.height} m high, gentle on one side but dropping in a cliff ${H0.steepDir ? dirEn(H0.steepDir) : 'on the other'}`,
    }[H0.type];
    if (desc) site.push(`The site is marked by ${desc}.`);
  }
  if (city.relief === 'colline') site.push(`A hill overlooks the town${city.citadel ? ': its top carries the citadel, linked to the market by a climbing road' : ''}. Its slopes, too steep to build on, are planted with vines and terraced gardens.`);
  if (city.relief === 'collines') {
    site.push(`The town has slipped in between several hills. The highest carries ${city.citadel ? 'the citadel, a true acropolis' : 'the remains of an old stronghold'}.`);
    if (city.hills.length) site.push(`The other heights each have their shrine: ${city.hills.join(', ')}.`);
  }
  if (riverNames.length === 1) site.push(`The river, ${riverNames[0]}, runs through the town; the market grew up by the old ford.`);
  if (riverNames.length >= 2) site.push(`${cap(riverNames[0])} runs through the town and receives its tributary, ${riverNames[1]}.`);
  if (city.waterGates.length) site.push(`The river enters the town under ${city.waterGates.length > 1 ? city.waterGates.length + ' water gates' : 'a water gate'}, closed at night by a portcullis.`);
  if (city.twin) site.push(`As at Provins, these are two towns in one: the upper town, old and fortified, holds the plateau with its castle and collegiate church; the lower town, a merchant town, spread at the foot of the slope inside its own wall. A climbing road links the two.`);
  if (city.plan === 'bastide') site.push(`It is a bastide, a new town founded in one go: streets laid out with a line, rectangular blocks of equal size, and in the middle a square market place lined with arcades around its hall.`);
  if (city.doubleWall) site.push(`The wall is double, as at Carcassonne: a lower outer wall stands in front of the main rampart; between them lie the lists, where men train at arms. Each gate is guarded by a barbican.`);
  if (city.moat) site.push(city.moat.water
    ? `A water-filled ditch some fifteen metres wide runs round the wall; a bridge crosses it in front of each gate.`
    : `A dry ditch dug at the foot of the wall runs round the town; a bridge crosses it in front of each gate.`);
  if (city.bridges.length) site.push(`${city.bridges.length > 1 ? city.bridges.length + ' bridges cross' : 'One bridge crosses'} the river.`);
  const A = s.altitude;
  if (A) {
    if (city.relief === 'plaine') site.push(`The market stands at ${A.plaza} m; the ground varies by only a few metres.`);
    else site.push(`The market stands at ${A.plaza} m; the highest point reaches ${A.max} m, ${A.max - A.plaza} m above it. The steepest slopes exceed ${A.steepest} %: above 25 % nobody builds, and between 15 and 25 % houses cling on in terraces.`);
  }
  if (city.cliffs.some(c => !c.kind)) {
    const drops = city.cliffs.filter(c => !c.kind).map(c => c.drop);
    site.push(`The height rises in terraces: ledges of ${Math.min(...drops)} to ${Math.max(...drops)} m, cliffs or retaining walls, separate flat levels that have been built on.${city.stairs.length ? ' People pass from one to the next by ' + (city.stairs.length > 1 ? city.stairs.length + ' stairs: ' + city.stairs.map(s2 => s2.name).join(', ') : 'a single stair, ' + city.stairs[0].name) + '.' : ''}`);
  }
  L.push(site.join(' '), '');

  // --- History read from the walls ---
  L.push('## History (as the plan tells it)', '');
  const old = city.oldWalls, standing = old.filter(w => w.standing).length;
  const hist = [city.plan === 'bastide'
    ? 'The town was founded all at once by a lord who wanted to people his lands: the plan was drawn before the first house, and the plots were sold on equal terms to the new settlers.'
    : city.twin ? 'The upper town is the older: a castle on the plateau, and around it the houses of those who served it. The lower town came later, around the market, by the road.'
    : 'The town was born around the market, on the flattest and most central ground.'];
  if (city.age === 1) hist.push('It never outgrew its first wall: a young town, or one that stopped growing.');
  if (city.age >= 2) {
    hist.push(`It outgrew its walls ${city.age === 2 ? 'once' : 'twice'}: ${city.age === 2 ? 'a new wall was' : 'two new walls were'} built further out, and the old ${city.age === 2 ? 'one was' : 'ones were'} left inside.`);
    if (old.length) hist.push(`Today about ${Math.round((100 * standing) / old.length)} % of the old walls still stand; the rest was pulled down and its line became a boulevard lined with fine houses.`);
    const breaches = old.filter(w => w.breachA || w.breachB).length;
    if (breaches) hist.push(`Streets have cut through the remaining stretches in ${breaches > 1 ? 'several breaches' : 'one breach'}.`);
  }
  if (city.citadel) hist.push('The citadel, older than the lower town, has kept its own wall.');
  L.push(hist.join(' '), '');

  // --- Factions ---
  if ((city.factions || []).length) {
    L.push('## Factions', '');
    L.push('Every territory is walled all round, with a fortified gate wherever a main street passes; the smaller streets are walled up.', '');
    const BAR = { ridge: 'its wall runs along the crest of a steep ridge', ravine: 'its wall stands on the edge of a ravine between two cliffs',
      water: 'a canal runs at the foot of its wall', wall: 'nothing but the wall' };
    const nameOf = i => (city.factions.find(f => f.index === i) || {}).name || 'its neighbour';
    for (const f of city.factions) {
      const parts = f.borders.map(b => `towards ${nameOf(b.with)}, ${BAR[b.type]}${b.waste ? ', with waste ground on both sides' : ''}, ${b.ways ? `${b.ways} way${b.ways > 1 ? 's' : ''} through` : 'and no way through'}`);
      const extra = [];
      if (f.highest) extra.push('it holds the highest ground of all the factions');
      if (f.lowest) extra.push('it lies lowest, and its streets are watched from above');
      if (f.citadel) extra.push('the citadel is in its hands');
      if (f.river) extra.push('it controls a stretch of the river');
      if (f.market) extra.push('the great market is inside its walls');
      const e = city.esplanade;
      const mayor = f.mayor && e ? ` ${e.name} stands here: a terrace ${e.height} m high on top of a cliff. The mayor speaks from the tribune at its edge, and the crowd gathers below in ${e.square || 'the square'} to listen; on speech days the gates open to everyone, whatever their colours.` : '';
      L.push(`- **${f.name}**${f.districts.length ? ` (${listEn(f.districts)})` : ''}: ${parts.join('; ')}.${extra.length ? ' ' + cap(listEn(extra)) + '.' : ''}${mayor}`);
    }
    L.push('', 'From the streets, nobody sees into another faction\'s quarter: walls, ridges and the houses themselves block the view. Only from a height (a tower, a cable station, the esplanade) can one look over the borders (use the Sight view to check).', '');
    const cables = city.cables || [];
    if (cables.length) {
      L.push('## Cables', '');
      L.push('Cables stretched between towers carry people, goods and messages over the walls, in cars or on hooks.', '');
      for (const k of cables) {
        const [a, b] = k.factions.map(nameOf);
        L.push(`- **${k.name}**${k.secret ? ' (secret)' : ''}: ${k.secret ? `between ${a} and ${b}, from two discreet tower-houses on either side of the border; only the two factions know it` : `official line from ${a} to ${b}, from the tower on its highest point`}. ${k.length} m long, ${k.clearance > 0 ? `at least ${k.clearance} m above the roofs` : k.pylons.length ? 'held up by a pylon where it would graze the ground' : 'skimming the roofs'}.`);
      }
      L.push('');
    }
  }

  // --- Gates and roads ---
  L.push('## Gates and roads', '');
  city.gateNames.forEach(g => {
    const nb = city.neighbours.find(x => x.gate === g.text);
    L.push(`- **${g.text}**${nb ? `: road to ${nb.name}` : ''}`);
  });
  L.push('');

  // --- Quarters ---
  L.push('## Quarters', '');
  city.districts.forEach((d, k) => {
    const flavour = (DISTRICT_FLAVOUR_EN.find(([re]) => re.test(d.name)) || [null, d.zone === 'neuf' ? 'a recent quarter with wide plots and many gardens' : 'an ordinary quarter of homes, shops and workshops mixed together'])[1];
    const places = [
      ...city.specials.filter(x => x.district === k && x.inner !== false).map(x => (/^The /.test(x.label) ? x.label : 'the ' + x.label)),
      ...city.churches.filter(c => c.district === k).map(c => `the church of ${c.name}`),
      ...city.inns.filter(i => i.district === k).map(i => `the inn “${i.name}”`),
    ];
    const extra = [];
    if (d.nearRiver) extra.push('by the water');
    if (d.onSlope) extra.push('against a slope');
    L.push(`- **${d.name}** (${ZONE_TEXT_EN[d.zone] || 'outside the walls'}${extra.length ? ', ' + extra.join(', ') : ''}): ${flavour}.${places.length ? ' Here you find ' + listEn(places) + '.' : ''}`);
  });
  L.push('');

  // --- Notable places ---
  L.push('## Notable places', '');
  for (const sp of city.specials) L.push(`- **${sp.label}**${sp.inner === false ? ' (outside the walls)' : ''}`);
  for (const c of city.churches) L.push(`- **${c.name.startsWith('Collegiate') ? c.name : 'Church of ' + c.name}** (${c.district === -1 ? 'upper town' : city.districts[c.district] ? city.districts[c.district].name : 'quarter'})`);
  for (const sq of city.squares) L.push(`- **${sq.name}**, a small square with its well (${city.districts[sq.district] ? city.districts[sq.district].name : 'quarter'})`);
  for (const i of city.inns) L.push(`- **The inn “${i.name}”**, near ${i.near}`);
  L.push('');

  // --- Water and outside the walls ---
  const extra = [];
  if (city.canals && city.canals.length) extra.push(`- **The mill race**: a channel taken off the river drives ${listEn(city.mills.map(m => m.name))}.`);
  for (const isl of city.islands || []) extra.push(`- **${isl.name}**: an island in the river, where a few houses huddle.`);
  const inhab = city.bridges.filter(b => b.inhabited).length;
  if (inhab) extra.push(`- **${inhab > 1 ? inhab + ' inhabited bridges' : 'An inhabited bridge'}**: houses several storeys high line the crossing, above the water.`);
  const OUT = { church: 'the suburb church, for those who live outside the walls', leper: 'set apart on the road, where the lepers are kept far from the town', gallows: 'gallows on the height, well seen from the road: the lord\'s justice', tannery: 'downstream by the water, where the smell bothers nobody in town', watermill: 'on the river, upstream' };
  for (const o of city.outskirts || []) extra.push(`- **${o.label}**: ${OUT[o.kind] || ''}.`);
  if (extra.length) { L.push('## Water and outside the walls', ''); extra.forEach(x => L.push(x)); L.push(''); }

  // --- Streets ---
  L.push('## Streets', '');
  const kinds = [['grande rue', 'Main streets'], ['montée', 'Hill road'], ['boulevard', 'Boulevards'], ['rue', 'Streets'], ['ruelle', 'Alleys'], ['impasse', 'Dead ends'], ['route', 'Roads']];
  for (const [k, title] of kinds) {
    const list = city.streets.filter(x => x.kind === k);
    if (!list.length) continue;
    L.push(`**${title}**: ${list.map(x => x.name + (x.detail && (k === 'grande rue' || k === 'route') ? ` (${x.detail})` : '')).join('; ')}.`, '');
  }

  // --- Story hooks ---
  L.push('## Story hooks', '');
  const hooks = [];
  const alley = city.streets.filter(x => x.kind === 'ruelle' || x.kind === 'impasse');
  if (alley.length) hooks.push(`Nobody walks ${pick(alley).name} after dark; they say a sergeant of the watch was found there with his throat cut.`);
  if (city.inns.length) { const inn = pick(city.inns); hooks.push(`At “${inn.name}”, near ${inn.near}, merchants trade news before the gates open.`); }
  if (old.some(w => w.breachA || w.breachB)) hooks.push('A breach in the old wall is a quiet way through for those who would rather avoid the watch at the gates.');
  if (city.waterGates.length) hooks.push('The portcullis of the water gate is raised every night for a boat that never pays the toll.');
  if (city.citadel) hooks.push('The road up to the citadel is closed to common folk after curfew; yet a path through the vines lets you climb up.');
  if (city.hills.length) hooks.push(`Pilgrims climb to the shrine on ${pick(city.hills)} at dawn; some never come down.`);
  if (city.churches.length > 1) { const [a, b] = [city.churches[0], city.churches[1]]; hooks.push(`The parishes of ${a.name} and ${b.name} have quarrelled for generations over the relics of the same saint.`); }
  hooks.forEach(h => L.push(`- ${h}`));
  L.push('');
  return L.join('\n');
}
