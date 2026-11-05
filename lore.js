'use strict';
/*
 * Fiche de ville : un texte pour écrire, déduit du plan (relief, enceintes, quartiers, lieux, rues).
 * Rien n'est inventé au hasard sans lien avec la carte : chaque phrase s'appuie sur un élément visible.
 */

const RIVER_NAMES = ['la Brume', "l'Ombrette", 'la Sèvre-Noire', "l'Aulne", 'la Vire', 'la Lisse', 'la Morte-Eau', "l'Orgon",
  'la Saulaie', 'la Dormante', "l'Argentine", 'la Grise'];

// Ce que chaque type de quartier évoque, pour donner de la matière à l'écriture
const DISTRICT_FLAVOUR = [
  [/Vieille Ville/, 'le cœur ancien : rues étroites et tortueuses, maisons de pierre hautes et serrées, la plupart des familles anciennes y vivent encore'],
  [/Tanneurs/, "en aval de la rivière, là où l'odeur des cuves ne gêne personne d'important : ateliers sur l'eau, peaux qui sèchent, eau brunâtre"],
  [/Meuniers/, "en amont, là où l'eau est encore claire : moulins, greniers, odeur de farine"],
  [/Quais|Bateliers|Berges/, 'le long de l’eau : entrepôts, gabares amarrées, portefaix et marchands de passage'],
  [/Teinturiers|Lavandières/, "au bord de l'eau : cuves de couleur, linge étendu, rivière teintée selon les jours"],
  [/Marchands|Halle|Marché|Orfèvres|Changeurs/, 'quartier riche du commerce : échoppes au rez-de-chaussée, comptoirs, belles façades sur rue'],
  [/Forgerons|Charpentiers|Cordiers|Potiers|Verriers|Selliers|Artisans|Tisserands/, "quartier d'artisans : bruit des ateliers dès l'aube, apprentis, cours encombrées"],
  [/Bouchers/, 'étals et abattoirs, ruisseau de sang les jours de marché'],
  [/Écoles/, "étudiants, copistes et maîtres, tavernes bruyantes la nuit"],
  [/Château|Pied-du-Mont|Sous-le/, 'au pied de la hauteur fortifiée : gens d’armes, fournisseurs du château, ruelles en pente'],
  [/Bourg-Neuf|Ville-Neuve|Neuve/, 'quartier récent, plus aéré : jardins, vergers, parcelles larges, nouveaux venus'],
  [/Porte/, 'autour d’une porte de la ville : auberges, écuries, marchands qui attendent l’ouverture'],
  [/Cathédrale/, 'à l’ombre de la cathédrale : chanoines, pèlerins, marchands d’objets pieux'],
];

// Article devant un nom de bâtiment ("la Cathédrale" → "la cathédrale")
const ARTICLES = { 'Cathédrale': 'la cathédrale', 'Château': 'le château', 'Palais': 'le palais', 'Halle des guildes': 'la halle des guildes',
  'Université': "l'université", 'Caserne': 'la caserne', 'Prison': 'la prison', 'Hospice': "l'hospice", 'Bains publics': 'les bains publics',
  'Arène': "l'arène", 'Cimetière': 'le cimetière', 'Port': 'le port', 'Monastère': 'le monastère', 'Moulin': 'le moulin' };
const withArticle = label => ARTICLES[label]
  || (/^(Couvent|Prieuré|Béguinage|Collège)/.test(label) ? 'le ' + label : /^(Chartreuse|Commanderie|Abbaye|Grange)/.test(label) ? 'la ' + label
    : /^Hôtel/.test(label) ? "l'" + label : /^(Les|La|Le) /.test(label) ? label : 'le sanctuaire du ' + label);

const ZONE_TEXT = {
  vieille: 'dans la première enceinte',
  bourg: 'dans l’enceinte intermédiaire',
  neuf: 'dans la dernière enceinte, la plus récente',
  citadelle: 'dans la citadelle',
};

// The sheet in the city's language / la fiche dans la langue de la ville (anglais : lore-en.js)
function citySheet(city) { return city.lang === 'fr' ? citySheetFr(city) : citySheetEn(city); }

function citySheetFr(city) {
  const rand = mulberry32(seedHash(city.seed + '|fiche'));
  const pick = list => list[Math.floor(rand() * list.length)];
  const s = city.stats;
  const L = [];
  const sizeText = { petite: 'Petite ville', moyenne: 'Ville moyenne', grande: 'Grande ville', capitale: 'Capitale', metropole: 'Grande cité', mega: 'Mégapole' }[city.size] || 'Ville';
  const riverNames = city.rivers.map((_, i) => RIVER_NAMES[(seedHash(city.seed + '|riviere|' + i)) % RIVER_NAMES.length]);

  L.push(`# ${city.name}`, '');
  L.push(`*${sizeText} d'environ ${s.population.toLocaleString('fr-FR')} habitants, ${s.houses.toLocaleString('fr-FR')} maisons, ${s.diameter} m d'un rempart à l'autre.*`, '');

  // --- Site ---
  L.push('## Le site', '');
  const site = [];
  if (city.relief === 'plaine') site.push(`${city.name} s'étend sur une plaine, sans autre défense que ses murs.`);
  if (city.relief === 'vallee') site.push({
    gorge: `${city.name} se serre au fond d'une gorge étroite : les falaises qui l'enserrent la protègent mieux qu'un rempart, mais la ville n'a jamais pu s'étendre qu'en longueur, le long de l'eau.`,
    confluence: `${city.name} est née à la confluence de deux vallées : deux rivières s'y rejoignent, et la ville tient la pointe de terre entre les deux.`,
    meandre: `${city.name} est enfermée dans un méandre : la rivière en fait presque le tour, et seul un étroit cou de terre la relie au reste du pays, comme à Besançon.`,
  }[city.valleyType] || `${city.name} occupe le fond d'une vallée large ; les versants, trop raides pour bâtir, sont couverts de vignes et de bois.`);
  // Forme de la colline principale, décrite comme sur le terrain
  const dirFr = v => ['à l’est', 'au sud-est', 'au sud', 'au sud-ouest', 'à l’ouest', 'au nord-ouest', 'au nord', 'au nord-est'][((Math.round(Math.atan2(v[1], v[0]) / (Math.PI / 4)) % 8) + 8) % 8];
  const H0 = (city.hillShapes || [])[0];
  if (H0) {
    const desc = {
      butte: `une butte isolée d'environ ${H0.height} m, qui se voit de loin`,
      crete: `une longue crête d'environ ${H0.height} m, orientée ${['est-ouest', 'nord-ouest – sud-est', 'nord-sud', 'nord-est – sud-ouest'][((Math.round(Math.atan2(H0.along[1], H0.along[0]) / (Math.PI / 4)) % 4) + 4) % 4]}`,
      eperon: `un éperon d'environ ${H0.height} m qui s'avance au-dessus de la vallée, rattaché au plateau ${dirFr(H0.along)}`,
      table: `une table aux flancs abrupts, d'environ ${H0.height} m, au sommet parfaitement plat`,
      dissymetrique: `une colline d'environ ${H0.height} m, en pente douce d'un côté mais tombant en falaise ${H0.steepDir ? dirFr(H0.steepDir) : 'de l’autre'}`,
    }[H0.type];
    if (desc) site.push(`Le site est marqué par ${desc}.`);
  }
  if (city.relief === 'colline') site.push(`Une colline domine la ville${city.citadel ? ' : son plateau porte la citadelle, reliée au marché par une montée' : ''}. Ses pentes, trop raides pour bâtir, sont plantées de vignes et de jardins en terrasses.`);
  if (city.relief === 'collines') {
    site.push(`La ville s'est glissée entre plusieurs collines. La plus haute porte ${city.citadel ? 'la citadelle, véritable acropole' : 'les restes d’une ancienne place forte'}.`);
    if (city.hills.length) site.push(`Les autres hauteurs ont chacune leur sanctuaire : ${city.hills.join(', ')}.`);
  }
  if (riverNames.length === 1) site.push(`La rivière, ${riverNames[0]}, traverse la ville ; le marché s'est installé près de l'ancien gué.`);
  if (riverNames.length === 2) site.push(`${cap(riverNames[0])} traverse la ville et reçoit son affluent, ${riverNames[1]}.`);
  if (city.waterGates.length) site.push(`La rivière entre dans la ville sous ${city.waterGates.length > 1 ? city.waterGates.length + ' portes d’eau' : 'une porte d’eau'}, fermée la nuit par une herse.`);
  if (city.twin) site.push(`Comme à Provins, ce sont deux villes en une : la ville haute, ancienne et fortifiée, occupe le plateau avec son château et sa collégiale ; la ville basse, marchande, s'est étendue au pied de la pente dans sa propre enceinte. Une montée relie les deux.`);
  if (city.plan === 'bastide') site.push(`C'est une bastide, une ville neuve fondée d'un seul coup : rues tirées au cordeau, îlots rectangulaires de même taille, et au centre une place carrée bordée de couverts (arcades) avec sa halle.`);
  if (city.doubleWall) site.push(`L'enceinte est double, comme à Carcassonne : un mur extérieur plus bas précède le rempart ; entre les deux s'étendent les lices, où l'on s'exerce aux armes. Chaque porte est protégée par une barbacane.`);
  if (city.moat) site.push(city.moat.water
    ? `Un fossé en eau d'une quinzaine de mètres fait le tour du rempart ; on le franchit sur un pont devant chaque porte.`
    : `Un fossé sec, creusé au pied du rempart, fait le tour de la ville ; un pont le franchit devant chaque porte.`);
  if (city.bridges.length) site.push(`${city.bridges.length > 1 ? city.bridges.length + ' ponts franchissent' : 'Un pont franchit'} la rivière.`);
  const A = s.altitude;
  if (A) {
    if (city.relief === 'plaine') site.push(`Le marché est à ${A.plaza} m d'altitude ; le terrain ne varie que de quelques mètres.`);
    else site.push(`Le marché est à ${A.plaza} m d'altitude ; le point le plus haut atteint ${A.max} m, soit ${A.max - A.plaza} m au-dessus. Les pentes les plus fortes dépassent ${A.steepest} % : au-delà de 25 %, on ne bâtit pas, et entre 15 et 25 % les maisons s'accrochent en terrasses.`);
  }
  if (city.cliffs.some(c => !c.kind)) {
    const drops = city.cliffs.filter(c => !c.kind).map(c => c.drop);
    site.push(`La hauteur monte par esplanades : des ressauts de ${Math.min(...drops)} à ${Math.max(...drops)} m, falaises ou murs de soutènement, séparent des paliers plats où l'on a bâti.${city.stairs.length ? ' On passe de l’un à l’autre par ' + (city.stairs.length > 1 ? city.stairs.length + ' escaliers : ' + city.stairs.map(s2 => s2.name).join(', ') : 'un seul escalier, ' + city.stairs[0].name) + '.' : ''}`);
  }
  L.push(site.join(' '), '');

  // --- Histoire déduite des enceintes ---
  L.push('## Histoire (lisible dans le plan)', '');
  const old = city.oldWalls, standing = old.filter(w => w.standing).length;
  const hist = [city.plan === 'bastide'
    ? 'La ville a été fondée d’un seul tenant par un seigneur qui voulait peupler ses terres : le plan a été tracé avant la première maison, et les lots ont été vendus à égalité aux nouveaux habitants.'
    : city.twin ? 'La ville haute est la plus ancienne : un château sur le plateau, et autour, les maisons de ceux qui le servaient. La ville basse est née plus tard, autour du marché, au bord de la route.'
    : `La ville est née autour du marché, sur le terrain le plus plat et le plus central.`];
  if (city.age === 1) hist.push('Elle n’a jamais débordé de sa première enceinte : c’est une ville encore jeune, ou qui a cessé de croître.');
  if (city.age >= 2) {
    hist.push(`Elle a débordé de ses murs ${city.age === 2 ? 'une fois' : 'deux fois'} : ${city.age === 2 ? 'une nouvelle enceinte' : 'deux nouvelles enceintes'} ${city.age === 2 ? 'a été bâtie' : 'ont été bâties'} plus loin, et ${city.age === 2 ? "l'ancienne est restée" : 'les anciennes sont restées'} à l'intérieur.`);
    if (old.length) hist.push(`Aujourd'hui, environ ${Math.round((100 * standing) / old.length)} % des vieux murs sont encore debout ; le reste a été démoli et son tracé est devenu un boulevard bordé de belles maisons.`);
    const breaches = old.filter(w => w.breachA || w.breachB).length;
    if (breaches) hist.push(`Des rues ont percé les tronçons restants en ${breaches > 1 ? 'plusieurs brèches' : 'une brèche'}.`);
  }
  if (city.citadel) hist.push('La citadelle, plus ancienne que la ville basse, a gardé sa propre enceinte.');
  L.push(hist.join(' '), '');

  // --- Factions ---
  if ((city.factions || []).length) {
    L.push('## Factions', '');
    L.push("Chaque territoire est muré tout autour, avec une porte fortifiée partout où passe une grande rue ; les petites rues sont murées.", '');
    const BAR = { ridge: "son mur suit la crête d'une arête escarpée", ravine: "son mur se dresse au bord d'un ravin entre deux falaises",
      water: 'un canal coule au pied de son mur', wall: 'rien que le mur' };
    const nameOf = i => (city.factions.find(f => f.index === i) || {}).name || 'sa voisine';
    // de / à + article : « des Loyalistes », « au Quartier du Maire »
    const deFr = t => t.replace(/^Les /, 'des ').replace(/^Le /, 'du ').replace(/^La /, 'de la ').replace(/^L'/, "de l'").replace(/^(?!des |du |de )/, 'de ');
    const aFr = t => t.replace(/^Les /, 'aux ').replace(/^Le /, 'au ').replace(/^La /, 'à la ').replace(/^L'/, "à l'").replace(/^(?!aux |au |à )/, 'à ');
    for (const f of city.factions) {
      const parts = f.borders.map(b => `vers ${nameOf(b.with)}, ${BAR[b.type]}${b.waste ? ', avec des terrains vagues de part et d\'autre' : ''}, ${b.ways ? `${b.ways} passage${b.ways > 1 ? 's' : ''}` : 'et aucun passage'}`);
      const extra = [];
      if (f.highest) extra.push('elle tient le terrain le plus haut de toutes les factions');
      if (f.lowest) extra.push("elle est la plus basse, et ses rues sont surveillées d'en haut");
      if (f.citadel) extra.push('la citadelle est entre ses mains');
      if (f.river) extra.push('elle contrôle un tronçon de la rivière');
      if (f.market) extra.push('le grand marché est dans ses murs');
      const e = city.esplanade;
      const mayor = f.mayor && e ? ` C'est ici que se dresse ${e.name.charAt(0).toLowerCase() + e.name.slice(1)} : une terrasse haute de ${e.height} m au sommet d'une falaise. Le maire parle depuis la tribune, au bord ; la foule se rassemble en bas, sur la ${(e.square || 'place').replace(/^Place /, 'place ')}, pour l'écouter ; les jours de discours, les portes s'ouvrent à tous, quelles que soient leurs couleurs.` : '';
      L.push(`- **${f.name}**${f.districts.length ? ` (${listFr(f.districts)})` : ''} : ${parts.join(' ; ')}.${extra.length ? ' ' + cap(listFr(extra)) + '.' : ''}${mayor}`);
    }
    L.push('', "Depuis la rue, personne ne voit dans le quartier d'une autre faction : les murs, les crêtes et les maisons elles-mêmes cachent la vue. Seule une hauteur (une tour, une station de câble, l'esplanade) permet de regarder par-dessus les frontières (la vue Regard permet de le vérifier).", '');
    const cables = city.cables || [];
    if (cables.length) {
      L.push('## Câbles', '');
      L.push('Des câbles tendus entre des tours font passer gens, marchandises et messages par-dessus les murs, en nacelle ou au crochet.', '');
      for (const k of cables) {
        const [a, b] = k.factions.map(nameOf);
        L.push(`- **${k.name}**${k.secret ? ' (secret)' : ''} : ${k.secret ? `entre ${a.replace(/^L/, 'l')} et ${b.replace(/^L/, 'l')}, depuis deux maisons-tours discrètes de part et d'autre de la frontière ; seules ces deux factions le connaissent` : `ligne officielle ${deFr(a)} ${aFr(b)}, depuis la tour de son point le plus haut`}. ${k.length} m de long, ${k.clearance > 0 ? `au moins ${k.clearance} m au-dessus des toits` : k.pylons.length ? 'soutenue par un pylône là où elle frôlerait le sol' : 'rasant les toits'}.`);
      }
      L.push('');
    }
  }

  // --- Portes et routes ---
  L.push('## Portes et routes', '');
  city.gateNames.forEach((g, i) => {
    const n = city.neighbours.find(x => x.gate === g.text);
    L.push(`- **${g.text}**${n ? ` : route de ${n.name}` : ''}`);
  });
  L.push('');

  // --- Quartiers ---
  L.push('## Quartiers', '');
  city.districts.forEach((d, k) => {
    const flavour = (DISTRICT_FLAVOUR.find(([re]) => re.test(d.name)) || [null, d.zone === 'neuf' ? 'quartier récent aux parcelles larges et aux jardins nombreux' : 'quartier d’habitation ordinaire, boutiques et ateliers mêlés'])[1];
    const places = [
      ...city.specials.filter(x => x.district === k && x.inner !== false).map(x => withArticle(x.label)),
      ...city.churches.filter(c => c.district === k).map(c => `l'église ${c.name}`),
      ...city.inns.filter(i => i.district === k).map(i => `l'auberge « ${i.name} »`),
    ];
    const extra = [];
    if (d.nearRiver) extra.push('au bord de l’eau');
    if (d.onSlope) extra.push('adossé à une pente');
    L.push(`- **${d.name}** (${ZONE_TEXT[d.zone] || 'hors les murs'}${extra.length ? ', ' + extra.join(', ') : ''}) : ${flavour}.${places.length ? ' On y trouve ' + listFr(places) + '.' : ''}`);
  });
  L.push('');

  // --- Lieux notables ---
  L.push('## Lieux notables', '');
  for (const sp of city.specials) L.push(`- **${sp.label}**${sp.inner === false ? ' (hors les murs)' : ''}`);
  for (const c of city.churches) L.push(`- **${c.name.startsWith('Collégiale') ? c.name : 'Église ' + c.name}** (${c.district === -1 ? 'ville haute' : city.districts[c.district] ? city.districts[c.district].name : 'quartier'})`);
  for (const sq of city.squares) L.push(`- **${sq.name}**, petite place avec son puits (${city.districts[sq.district] ? city.districts[sq.district].name : 'quartier'})`);
  for (const i of city.inns) L.push(`- **Auberge « ${i.name} »**, près ${i.near}`);
  L.push('');

  // --- Eau et hors les murs ---
  const extra = [];
  if (city.canals && city.canals.length) extra.push(`- **Le bief** : un canal dérivé de la rivière fait tourner ${city.mills.map(m => m.name).join(' et ')}.`);
  for (const isl of city.islands || []) extra.push(`- **${isl.name}** : une île au milieu de la rivière, où se serrent quelques maisons.`);
  const inhab = city.bridges.filter(b => b.inhabited).length;
  if (inhab) extra.push(`- **${inhab > 1 ? inhab + ' ponts habités' : 'Un pont habité'}** : des maisons à étages bordent le passage, au-dessus de l'eau.`);
  const OUT = { church: 'église du faubourg, pour ceux qui vivent hors les murs', leper: 'à l’écart sur la route, on y tient les lépreux loin de la ville', gallows: 'fourches patibulaires sur la hauteur, bien visibles de la route : la justice du seigneur', tannery: 'en aval, au bord de l’eau, là où l’odeur ne gêne personne en ville', watermill: 'sur la rivière, en amont' };
  for (const o of city.outskirts || []) extra.push(`- **${o.label}** : ${OUT[o.kind] || ''}.`);
  if (extra.length) { L.push('## Eau et hors les murs', ''); extra.forEach(x => L.push(x)); L.push(''); }

  // --- Rues ---
  L.push('## Rues', '');
  const kinds = [['grande rue', 'Grandes rues'], ['montée', 'Montée'], ['boulevard', 'Boulevards'], ['rue', 'Rues'], ['ruelle', 'Ruelles'], ['impasse', 'Impasses'], ['route', 'Routes']];
  for (const [k, title] of kinds) {
    const list = city.streets.filter(x => x.kind === k);
    if (!list.length) continue;
    L.push(`**${title}** : ${list.map(x => x.name + (x.detail && (k === 'grande rue' || k === 'route') ? ` (${x.detail})` : '')).join(' ; ')}.`, '');
  }

  // --- Accroches ---
  L.push('## Accroches pour une scène', '');
  const hooks = [];
  const alley = city.streets.filter(x => x.kind === 'ruelle' || x.kind === 'impasse');
  if (alley.length) hooks.push(`Personne ne passe la nuit tombée dans la ${pick(alley).name} ; on dit qu'on y a retrouvé un sergent du guet, la gorge tranchée.`);
  if (city.inns.length) { const inn = pick(city.inns); hooks.push(`À l'auberge « ${inn.name} », près ${inn.near}, les marchands échangent des nouvelles avant l'ouverture des portes.`); }
  if (old.some(w => w.breachA || w.breachB)) hooks.push('Une brèche dans la vieille enceinte sert de passage discret à ceux qui veulent éviter le guet des portes.');
  if (city.waterGates.length) hooks.push('La herse de la porte d’eau est relevée chaque nuit pour une barque qui ne paie jamais l’octroi.');
  if (city.citadel) hooks.push('La montée vers la citadelle est fermée au peuple après le couvre-feu ; un passage dans les vignes permet pourtant d’y grimper.');
  if (city.hills.length) hooks.push(`Les pèlerins montent au sanctuaire du ${pick(city.hills)} à l'aube ; certains n'en redescendent pas.`);
  if (city.churches.length > 1) { const [a, b] = [city.churches[0], city.churches[1]]; hooks.push(`Les paroisses ${a.name} et ${b.name} se disputent depuis des générations les reliques d'un même saint.`); }
  hooks.forEach(h => L.push(`- ${h}`));
  L.push('');
  return L.join('\n');
}

function listFr(items) {
  if (items.length <= 1) return items.join('');
  return items.slice(0, -1).join(', ') + ' et ' + items[items.length - 1];
}
function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

// Markdown minimal → HTML (titres, listes, gras, italique, paragraphes) pour l'afficher dans le panneau
function sheetToHtml(md) {
  const esc = t => t.replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
  const inline = t => esc(t).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\*(.+?)\*/g, '<em>$1</em>');
  const out = [];
  let inList = false;
  for (const line of md.split('\n')) {
    if (line.startsWith('- ')) { if (!inList) { out.push('<ul>'); inList = true; } out.push(`<li>${inline(line.slice(2))}</li>`); continue; }
    if (inList) { out.push('</ul>'); inList = false; }
    if (line.startsWith('## ')) out.push(`<h3>${inline(line.slice(3))}</h3>`);
    else if (line.startsWith('# ')) out.push(`<h2>${inline(line.slice(2))}</h2>`);
    else if (line.trim()) out.push(`<p>${inline(line)}</p>`);
  }
  if (inList) out.push('</ul>');
  return out.join('\n');
}
