'use strict';
/*
 * Texts in two languages / textes en deux langues : English (default) and French.
 * Everything the generator names (towns, quarters, streets, gates, inns…) and every interface label lives here.
 */

const TEXT = {
  en: {
    name: {
      start: ['Ash', 'Black', 'Bram', 'Elm', 'Fair', 'Grey', 'Hart', 'Kings', 'Mar', 'Oak', 'Red', 'Stan', 'Thorn', 'Wick', 'Wolf', 'Wyn', 'Rook', 'Wind', 'Raven', 'Hollow', 'Mist', 'Cold'],
      end: ['ford', 'bury', 'ham', 'wick', 'by', 'stead', 'bridge', 'field', 'mouth', 'gate', 'well', 'holm', 'ley', 'ton', 'worth', 'mere', 'hold', 'moor', 'vale'],
    },
    compass: ['East', 'South-East', 'South', 'South-West', 'West', 'North-West', 'North', 'North-East'],
    gate: dir => `${dir} Gate`,
    gateExtra: ["Ravens' Gate", "King's Gate", 'Wolf Gate', 'Vineyard Gate', "Queen's Gate", "Pilgrims' Gate", "Dead Men's Gate"],
    gateQuarter: dir => `${dir} Gate Quarter`,
    districts: {
      oldTown: 'Old Town', cathedral: 'Cathedral Close', oldCore: ['Market Quarter', 'Old Borough', 'Hall Quarter'], quays: 'The Quays',
      tanners: "Tanners' Quarter", millers: "Millers' Quarter", schools: 'Schools Quarter', belowCastle: ['Castle Foot', 'Below the Hill'],
      newTown: ['Newtown', 'New Borough'],
      trades: ["Merchants' Quarter", "Craftsmen's Quarter", "Smiths' Quarter", "Weavers' Quarter", "Goldsmiths' Quarter", 'The Halls', "Potters' Quarter",
        "Butchers' Quarter", "Ropemakers' Quarter", "Carpenters' Quarter", "Glassmakers' Quarter", "Saddlers' Quarter", 'The Lanes'],
      fallback: k => `Quarter ${k}`,
    },
    tradeStreet: d => { const m = /^(.+?)' Quarter$/.exec(d); return m && !/Gate|Market|Hall|Castle|Cathedral|Craftsmen/.test(m[1]) ? `${m[1]}' Street` : null; },
    saints: ['St Aubin', 'St Odile', 'St Clare', 'St Giles', 'St Brice', 'St Faith', 'St Lo', 'St Firmin', 'St Medard', 'St Aura', 'St Aldric', 'St Vaast', 'St Gemma', 'St Orens', 'St Evroult'],
    defaultSaint: 'St Peter',
    collegiate: s => `Collegiate Church of ${s}`,
    withoutWalls: s => `${s}-without-the-Walls`,
    streets: {
      high: 'High Street', gateStreet: g => `${g} Street`,
      axes: { v0: 'High Street', v1: 'Arcade Street', u0: 'Church Street', u1: 'Bakehouse Street' },
      hillTwin: 'Upper Town Hill', hillCastle: 'Castle Hill', hillCitadel: 'Citadel Hill', roadTo: t => `Road to ${t}`,
      boulevards: ['Ditch Street', 'Old Walls Road', 'Wall Street'],
      quays: ['Tanners Quay', 'Flower Quay', 'Rosary Quay', "Boatmen's Quay", 'Wine Quay', 'Salt Quay', 'Austin Friars Quay', 'Mint Quay'], quayFallback: 'New Quay',
      deadEnds: ['Oven Close', 'Cats Close', 'Nameless Close', 'Old Well Close', 'Coopers Yard', 'Horn Close', 'Scald Close', 'Great Hart Yard'],
      alleys: ['Black Cat Alley', 'Lost Steps Alley', 'Narrow Lane', 'Rat Alley', "Rogue's Alley", 'Lantern Alley', 'Cutthroat Lane', 'Sighs Alley', 'Candle Alley', "World's End Alley"],
      names: ['Well Street', 'Three Kings Street', 'Moon Street', 'Pelican Street', 'Scriveners Row', 'Bear Street', 'Swan Street', 'Mint Street', 'Changers Row',
        'White Horse Street', 'Smiths Row', 'Apple Street', 'Salt House Lane', 'Five Diamonds Street', 'Harp Street', 'Helm Street', 'Coppersmiths Row', 'Key Street',
        'Three Maidens Street', 'Dolphin Street', 'Herb Street', 'Mercers Row'],
      church: s => `${s} Street`, newStreet: 'New Street', upper: 'Upper Street', lower: 'Lower Street',
      fallback: n => `Street no. ${n}`, alleyFallback: n => `Alley no. ${n}`, deadEndFallback: n => `Close no. ${n}`,
      kinds: { 'grande rue': 'main street', montée: 'hill road', route: 'road', boulevard: 'boulevard', quai: 'quay', rue: 'street', ruelle: 'alley', impasse: 'dead end' },
      details: { axis: 'axis of the grid, through the square', fromMarket: g => `from the Market to ${g}`, toCitadel: 'from the Market to the citadel', leaves: g => `leaves by ${g}`, oldWall: 'on the line of the old wall', river: 'along the river' },
    },
    squares: { names: ['Herb Market', 'Well Square', 'Corn Market', 'Egg Market', 'Wood Market', 'Cattle Market', 'Exchange Square', 'Cloth Square', 'Fountain Square', 'Three Elms Square'],
      church: s => `${s} Square`, fish: 'Fish Market', quay: 'Quay Square', pillory: 'Pillory Square', cross: 'Market Cross', fallback: 'Little Square' },
    stairs: ["Penitents' Steps", 'Hundred Steps', 'Watch Stairs', "St John's Steps", 'Goat Steps', "Washerwomen's Stair", "Devil's Stair", "Canons' Steps", 'Black Stair', 'Pillory Steps'],
    stairFallback: 'Steps',
    inns: ['The White Hart', 'The Cracked Cauldron', 'The Spinning Sow', 'The Golden Lion', 'The Silver Shield', 'The Pewter Pot', 'The Grey Unicorn', 'The Bold Cockerel',
      'The Pine Cone', 'The Red Boar', 'The Hooded Lantern', 'The Crowned Ox', 'The Three Ravens', 'The Drunken Siren', 'The Jolly Hanged Man', 'The Green Dragon'],
    innNear: { market: 'the market', gate: g => g },
    hills: ['Ravens Hill', "St Clare's Mount", 'Gallows Hill', 'Vine Hill', 'Burnt Hill', 'Mill Mount', 'Muses Hill', 'Watch Hill', 'Holy Mount', "Washerwomen's Hill", 'Oracle Hill'],
    mills: ["King's Mill", "Canons' Mill", 'New Mill', 'Plank Mill', 'Manor Mill', 'Fulling Mill'],
    islands: ['Monks Isle', "St Clare's Isle", 'Tanners Isle', 'Meadow Isle', 'Judges Isle', 'City Isle'],
    outskirts: { leper: 'Leper House', gallows: 'Gallows', tannery: 'Tannery', watermill: 'Mill' },
    labels: { market: 'Market', citadel: 'Citadel', upperTown: 'Upper Town', hill: 'Hill' },
    buildings: { temple: 'Cathedral', chateau: 'Castle', palais: 'Palace', guildes: 'Guildhall', universite: 'University', caserne: 'Barracks', prison: 'Prison',
      hospice: 'Hospice', bains: 'Public Baths', arene: 'Arena', cimetiere: 'Cemetery', port: 'Port', monastere: 'Monastery', moulin: 'Mill' },
    why: { oldTown: 'no room in the old town', wall: 'no room on the walls', room: 'no room', gate: 'no room near the gates', bank: 'no room on the riverbank',
      noRiver: 'no river', outside: 'no room outside the walls', freeBank: 'no free riverbank' },
    shortfall: { hills: 'hills', rivers: 'rivers', gates: 'gates', rings: 'walls', districts: 'quarters', squares: 'squares', churches: 'churches', inns: 'inns', islands: 'islands', canals: 'mill races',
      format: (label, got, want) => `${label}: ${got} of ${want} requested` },
    render: {
      roofs: ['Tile (timber-framed)', 'Slate (stone)', 'Thatch', 'Inn'], relief: 'relief', slopes: 'slopes',
      altitude: 'Elevation', contours5: ' — contours every 5 m', plain: ' (plain)', slopeTitle: 'Slope (houses in black)',
      slopeRows: e => ['under 8 %: easy', `8–${e.easy} %: buildable`, `${e.easy}–${e.max} %: terraces, few houses`, `${e.max}–45 %: too steep, vines`, 'over 45 %: rock'],
    },
  },

  fr: {
    name: {
      start: ['Val', 'Mont', 'Roc', 'Bel', 'Aube', 'Cor', 'Lis', 'Fer', 'Mar', 'Ys', 'Gal', 'Bran', 'Ost', 'Vire', 'Haute', 'Clar', 'Dun', 'Sain', 'Pierre', 'Grand', 'Noir', 'Or'],
      end: ['beau', 'fort', 'mère', 'lune', 'bourg', 'morte', 'ange', 'gard', 'mont', 'vin', 'brume', 'ombre', 'val', 'roche', 'castel', 'fleur', 'lac', 'sel', 'vent'],
    },
    compass: ['Est', 'Sud-Est', 'Sud', 'Sud-Ouest', 'Ouest', 'Nord-Ouest', 'Nord', 'Nord-Est'],
    gate: dir => 'Porte ' + (dir === 'Est' || dir === 'Ouest' ? "de l'" : 'du ') + dir,
    gateExtra: ['Porte des Corbeaux', 'Porte du Roi', 'Porte aux Loups', 'Porte des Vignes', 'Porte de la Reine', 'Porte du Pèlerin', 'Porte des Morts'],
    gateQuarter: dir => 'Quartier de la Porte ' + (dir === 'Est' || dir === 'Ouest' ? "de l'" : 'du ') + dir,
    districts: {
      oldTown: 'Vieille Ville', cathedral: 'Quartier de la Cathédrale', oldCore: ['Quartier du Marché', 'Le Vieux Bourg', 'Quartier de la Halle'], quays: 'Les Quais',
      tanners: 'Quartier des Tanneurs', millers: 'Quartier des Meuniers', schools: 'Quartier des Écoles', belowCastle: ['Sous-le-Château', 'Le Pied-du-Mont'],
      newTown: ['Bourg-Neuf', 'La Ville-Neuve'],
      trades: ['Quartier des Marchands', 'Quartier des Artisans', 'Quartier des Forgerons', 'Quartier des Tisserands', 'Quartier des Orfèvres', 'Les Halles', 'Quartier des Potiers',
        'Quartier des Bouchers', 'Quartier des Cordiers', 'Quartier des Charpentiers', 'Quartier des Verriers', 'Quartier des Selliers', 'Les Ruelles'],
      fallback: k => `Quartier ${k}`,
    },
    tradeStreet: d => { const m = /^Quartier (des|du|de la) (.+)$/.exec(d); return m && !/Porte|Marché|Halle|Château|Cathédrale/.test(m[2]) ? `Rue ${m[1]} ${m[2]}` : null; },
    saints: ['Saint-Aubin', 'Sainte-Odile', 'Saint-Clair', 'Saint-Gilles', 'Saint-Brice', 'Sainte-Foy', 'Saint-Lô', 'Saint-Firmin', 'Saint-Médard', 'Sainte-Aure', 'Saint-Aldric', 'Saint-Waast', 'Sainte-Gemme', 'Saint-Orens', 'Saint-Évroult'],
    defaultSaint: 'Saint-Pierre',
    collegiate: s => `Collégiale ${s}`,
    withoutWalls: s => `${s}-hors-les-Murs`,
    streets: {
      high: 'Grand-Rue', gateStreet: g => 'Rue de la ' + g,
      axes: { v0: 'Grand-Rue', v1: 'Rue des Couverts', u0: "Rue de l'Église", u1: 'Rue du Four-Banal' },
      hillTwin: 'Montée de la Ville-Haute', hillCastle: 'Montée du Château', hillCitadel: 'Montée de la Citadelle', roadTo: t => `Route de ${t}`,
      boulevards: ['Rue des Fossés', 'Rue des Anciens-Remparts', 'Rue du Vieux-Mur'],
      quays: ['Quai des Tanneurs', 'Quai aux Fleurs', 'Quai du Rosaire', 'Quai des Bateliers', 'Quai aux Vins', 'Quai du Sel', 'Quai des Augustins', 'Quai de la Monnaie'], quayFallback: 'Quai Neuf',
      deadEnds: ['Impasse du Four', 'Impasse des Chats', 'Impasse Sans-Nom', 'Impasse du Vieux-Puits', 'Impasse des Tonneliers', 'Impasse de la Corne', "Impasse de l'Échaudé", 'Impasse du Grand-Cerf'],
      alleys: ['Ruelle du Chat-Noir', 'Ruelle des Pas-Perdus', 'Ruelle Étroite', 'Ruelle aux Rats', 'Ruelle du Mauvais-Garçon', 'Ruelle de la Lanterne', 'Ruelle du Coupe-Gorge', 'Ruelle des Soupirs', 'Ruelle de la Chandelle', 'Ruelle du Bout-du-Monde'],
      names: ['Rue du Puits', 'Rue des Trois-Rois', 'Rue de la Lune', 'Rue du Pélican', 'Rue des Écrivains', "Rue de l'Ours", 'Rue du Cygne', 'Rue de la Monnaie', 'Rue des Changeurs',
        'Rue du Cheval-Blanc', 'Rue aux Fèvres', 'Rue de la Pomme', 'Rue du Grenier-à-Sel', 'Rue des Cinq-Diamants', 'Rue de la Harpe', 'Rue du Heaume', 'Rue des Chaudronniers', 'Rue de la Clef',
        'Rue des Trois-Pucelles', 'Rue du Dauphin', 'Rue aux Herbes', 'Rue des Merciers'],
      church: s => `Rue ${s}`, newStreet: 'Rue Neuve', upper: 'Rue Haute', lower: 'Rue Basse',
      fallback: n => `Rue n° ${n}`, alleyFallback: n => `Ruelle n° ${n}`, deadEndFallback: n => `Impasse n° ${n}`,
      kinds: { 'grande rue': 'grande rue', montée: 'montée', route: 'route', boulevard: 'boulevard', quai: 'quai', rue: 'rue', ruelle: 'ruelle', impasse: 'impasse' },
      details: { axis: 'axe du damier, passe par la place', fromMarket: g => `du Marché à la ${g}`, toCitadel: 'du Marché à la citadelle', leaves: g => `sort par la ${g}`, oldWall: 'sur le tracé de la vieille enceinte', river: 'le long de la rivière' },
    },
    squares: { names: ['Place aux Herbes', 'Place du Puits', 'Marché au Blé', 'Place aux Œufs', 'Place aux Bois', 'Marché aux Vaches', 'Place du Change', 'Place aux Draps', 'Place de la Fontaine', 'Place des Trois-Ormes'],
      church: s => `Place ${s}`, fish: 'Marché au Poisson', quay: 'Place du Quai', pillory: 'Place du Pilori', cross: 'Place de la Croix', fallback: 'Placette' },
    stairs: ['Escalier des Pénitents', 'Montée des Cent-Marches', 'Escalier du Guet', 'Degrés Saint-Jean', 'Escalier de la Chèvre', 'Montée des Lavandières', 'Escalier du Diable', 'Degrés des Chanoines', 'Escalier Noir', 'Montée du Pilori'],
    stairFallback: 'Escalier',
    inns: ['Au Cerf Blanc', 'Le Chaudron Fêlé', 'La Truie qui File', "Le Lion d'Or", "L'Écu d'Argent", "Le Pot d'Étain", 'La Licorne Grise', 'Le Coq Hardi',
      'La Pomme de Pin', 'Le Sanglier Rouge', 'La Lanterne Sourde', 'Le Bœuf Couronné', 'Les Trois Corbeaux', 'La Sirène Ivre', 'Le Pendu Joyeux', 'Le Dragon Vert'],
    innNear: { market: 'du marché', gate: g => 'de la ' + g },
    hills: ['Mont des Corbeaux', 'Butte Saint-Clair', 'Mont aux Pendus', 'Colline des Vignes', 'Mont Brûlé', 'Butte aux Moulins', 'Mont des Muses', 'Colline du Guet', 'Mont Sacré', 'Butte des Lavandières', 'Mont des Oracles'],
    mills: ['Moulin du Roi', 'Moulin des Chanoines', 'Moulin Neuf', 'Moulin de la Planche', 'Moulin Bannier', 'Moulin aux Draps'],
    islands: ['Île aux Moines', 'Île Saint-Clair', 'Île des Tanneurs', 'Île du Pré', 'Île aux Juges', 'Île de la Cité'],
    outskirts: { leper: 'Maladrerie', gallows: 'Gibet', tannery: 'Tanneries', watermill: 'Moulin' },
    labels: { market: 'Marché', citadel: 'Citadelle', upperTown: 'Ville Haute', hill: 'Colline' },
    buildings: { temple: 'Cathédrale', chateau: 'Château', palais: 'Palais', guildes: 'Halle des guildes', universite: 'Université', caserne: 'Caserne', prison: 'Prison',
      hospice: 'Hospice', bains: 'Bains publics', arene: 'Arène', cimetiere: 'Cimetière', port: 'Port', monastere: 'Monastère', moulin: 'Moulin' },
    why: { oldTown: 'pas de place dans la vieille ville', wall: 'pas de place sur les remparts', room: 'pas de place', gate: 'pas de place près des portes', bank: "pas de place au bord de l'eau",
      noRiver: 'pas de rivière', outside: 'pas de place hors les murs', freeBank: 'pas de rive libre' },
    shortfall: { hills: 'collines', rivers: 'rivières', gates: 'portes', rings: 'enceintes', districts: 'quartiers', squares: 'placettes', churches: 'églises', inns: 'auberges', islands: 'îles', canals: 'biefs',
      format: (label, got, want) => `${label} : ${got} sur ${want} demandé${want > 1 ? 's' : ''}` },
    render: {
      roofs: ['Tuile (colombages)', 'Ardoise (pierre)', 'Chaume', 'Auberge'], relief: 'relief', slopes: 'pentes',
      altitude: 'Altitude', contours5: ' — courbes tous les 5 m', plain: ' (plaine)', slopeTitle: 'Pente (maisons en noir)',
      slopeRows: e => ['moins de 8 % : facile', `8–${e.easy} % : on bâtit`, `${e.easy}–${e.max} % : terrasses, peu de maisons`, `${e.max}–45 % : trop raide, vignes`, 'plus de 45 % : rocher'],
    },
  },
};

const textFor = lang => TEXT[lang === 'fr' ? 'fr' : 'en'];

// A town name from two syllables / un nom de ville en deux syllabes
function townName(rand, T) {
  for (;;) {
    const a = T.name.start[Math.floor(rand() * T.name.start.length)];
    const b = T.name.end[Math.floor(rand() * T.name.end.length)];
    if (a.toLowerCase() !== b) return a + b;
  }
}
