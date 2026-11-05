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
      hospice: 'Hospice', bains: 'Public Baths', arene: 'Arena', cimetiere: 'Cemetery', port: 'Port', monastere: 'Monastery', moulin: 'Mill', esplanade: "Mayor's Esplanade" },
    // Endless names (for big cities): a word and a kind of street / square, never twice the same
    words: ['Well', 'Moon', 'Pelican', 'Bear', 'Swan', 'Mint', 'Harp', 'Helm', 'Key', 'Dolphin', 'Herb', 'Apple', 'Pear', 'Cherry', 'Plum', 'Bell', 'Crown', 'Mitre',
      'Anchor', 'Lamb', 'Ram', 'Goat', 'Hart', 'Hind', 'Fox', 'Hare', 'Wren', 'Lark', 'Rook', 'Crow', 'Owl', 'Heron', 'Cock', 'Hen', 'Pig', 'Ox', 'Horse', 'Saddle',
      'Bridle', 'Spur', 'Lance', 'Shield', 'Sword', 'Arrow', 'Bow', 'Candle', 'Lantern', 'Oven', 'Bread', 'Flour', 'Salt', 'Wool', 'Linen', 'Silk', 'Cloth', 'Leather',
      'Tallow', 'Copper', 'Tin', 'Iron', 'Lead', 'Silver', 'Gold', 'Glass', 'Clay', 'Brick', 'Stone', 'Timber', 'Rope', 'Barrel', 'Cart', 'Wheel', 'Fish', 'Eel',
      'Oyster', 'Herring', 'Cheese', 'Butter', 'Honey', 'Wax', 'Ink', 'Quill', 'Book', 'Chain', 'Needle', 'Thimble', 'Comb', 'Hat', 'Glove', 'Shoe', 'Boot', 'Cloak',
      'Mask', 'Drum', 'Fiddle', 'Lute', 'Dice', 'Thorn', 'Rose', 'Lily', 'Vine', 'Oak', 'Ash', 'Elm', 'Willow', 'Hazel', 'Raven', 'Wolf', 'Boar', 'Stag', 'Unicorn'],
    streetKinds: { rue: ['Street', 'Lane', 'Row', 'Walk'], ruelle: ['Alley', 'Passage', 'Wynd', 'Ginnel'], impasse: ['Close', 'Yard', 'Court'] },
    streetMods: ['', '', 'Little ', 'Upper ', 'Lower ', 'Old ', 'New ', 'Back '],
    squareKinds: ['Square', 'Market', 'Cross', 'Green', 'Yard'],
    nameOf: (mod, word, kind) => `${mod}${word} ${kind}`,
    pair: (a, b) => `${a} and ${b}`,
    enclosures: {
      convents: ['Greyfriars', 'Blackfriars', 'Whitefriars', 'Austin Friars', 'Poor Clares', 'Crutched Friars', 'The Charterhouse', 'The Minoresses', 'Penitent Sisters',
        'Friars of the Sack', 'Pied Friars', "Templars' House", "Hospitallers' House", 'Beguine Court', "St Anthony's Priory", 'Holy Trinity Priory', 'Bonhommes', 'Cistercian Grange'],
      mansions: ['Ashby', 'Beaumont', 'Clare', 'Despenser', 'Fitzwalter', 'Grey', 'Hastings', 'Lacy', 'Mortimer', 'Neville', 'Percy', 'Scrope', 'Talbot', 'Vere', 'Warenne',
        'Mowbray', 'Stafford', 'Courtenay', 'Montagu', 'Bohun', 'Arundel', 'Clifford'],
      mansion: f => `${f} House`, college: s => `${s} College`, conventFallback: k => `Convent no. ${k}`,
      kinds: { couvent: 'convent', hotel: 'mansion', college: 'college' },
    },
    openLand: { orchard: 'orchard', garden: 'market garden', meadow: 'meadow', vines: 'vineyard' },
    factions: {
      names: ['The Loyalists', "The Assassins' Guild", 'The Theatre Folk', 'The Merchant Houses', "The Purifier's Flock", 'The Grey Hoods', 'The Iron Brotherhood',
        'The House of the Raven', 'The Salt Guild', 'The Black Lanterns', 'The Bell Ringers', 'The Old Families'],
      fallback: k => `Faction ${k}`, centre: "The Mayor's Quarter", esplanade: "The Mayor's Esplanade", esplanadeStairs: 'Esplanade Steps', crowdSquare: "Speakers' Square",
    },
    cables: {
      official: ['The Gull Line', 'The Bell Line', 'The Crown Line', 'The Lantern Line', 'The Heron Line', 'The Kite Line', 'The Swallow Line', 'The Harbour Line', 'The Chain Line'],
      secret: ['The Black Thread', 'The Whisper Wire', 'The Rat Line', 'The Moth Line', 'The Silent Cable', 'The Night Rope', 'The Spider Line', 'The Smugglers\' Wire'],
      lineOf: (w, secret) => (secret ? `The ${w} Wire` : `The ${w} Line`), secretFallback: 'A nameless wire',
    },
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
      hospice: 'Hospice', bains: 'Bains publics', arene: 'Arène', cimetiere: 'Cimetière', port: 'Port', monastere: 'Monastère', moulin: 'Moulin', esplanade: 'Esplanade du Maire' },
    words: ['du Puits', 'de la Lune', 'du Pélican', "de l'Ours", 'du Cygne', 'de la Monnaie', 'de la Harpe', 'du Heaume', 'de la Clef', 'du Dauphin', 'des Herbes',
      'des Pommes', 'des Poires', 'des Cerises', 'des Prunes', 'de la Cloche', 'de la Couronne', 'de la Mitre', "de l'Ancre", "de l'Agneau", 'du Bélier', 'de la Chèvre',
      'du Cerf', 'de la Biche', 'du Renard', 'du Lièvre', "de l'Alouette", 'des Corbeaux', 'de la Chouette', 'du Héron', 'du Coq', 'des Poules', 'du Porc', 'du Bœuf',
      'du Cheval', 'de la Selle', 'des Éperons', 'de la Lance', "de l'Écu", "de l'Épée", 'de la Flèche', "de l'Arc", 'de la Chandelle', 'de la Lanterne', 'du Four',
      'du Pain', 'de la Farine', 'du Sel', 'de la Laine', 'du Lin', 'de la Soie', 'du Drap', 'du Cuir', 'du Suif', 'du Cuivre', "de l'Étain", 'du Fer', 'du Plomb',
      "de l'Argent", "de l'Or", 'du Verre', "de l'Argile", 'de la Brique', 'de la Pierre', 'des Poutres', 'de la Corde', 'du Tonneau', 'de la Charrette', 'de la Roue',
      'du Poisson', 'des Anguilles', 'des Huîtres', 'du Hareng', 'du Fromage', 'du Beurre', 'du Miel', 'de la Cire', "de l'Encre", 'de la Plume', 'du Livre',
      'de la Chaîne', "de l'Aiguille", 'du Dé', 'du Peigne', 'du Chapeau', 'du Gant', 'du Soulier', 'de la Botte', 'du Manteau', 'du Masque', 'du Tambour', 'de la Vielle',
      'du Luth', 'des Dés', "de l'Épine", 'de la Rose', 'du Lys', 'de la Vigne', 'du Chêne', 'du Frêne', "de l'Orme", 'du Saule', 'du Noisetier', 'du Loup', 'du Sanglier', 'de la Licorne'],
    streetKinds: { rue: ['Rue', 'Petite rue', 'Rue Neuve', 'Rue Haute', 'Rue Basse', 'Vieille rue'], ruelle: ['Ruelle', 'Passage', 'Venelle', 'Traverse', 'Petite ruelle', 'Vieille ruelle'], impasse: ['Impasse', 'Cour', 'Cul-de-sac', 'Petite impasse', 'Vieille cour'] },
    streetMods: [''],
    squareKinds: ['Place', 'Carrefour', 'Marché', 'Placette'],
    nameOf: (mod, word, kind) => `${kind} ${word}`,
    pair: (a, b) => `${a} et ${b.replace(/^d(u|e la|e l'|es) /, m => m)}`,
    enclosures: {
      convents: ['Couvent des Cordeliers', 'Couvent des Jacobins', 'Couvent des Carmes', 'Couvent des Augustins', 'Couvent des Clarisses', 'Couvent des Célestins',
        'Couvent des Mathurins', 'Couvent des Blancs-Manteaux', 'Chartreuse', 'Couvent des Minimes', 'Les Filles-Dieu', 'Béguinage', 'Commanderie du Temple',
        'Prieuré Saint-Martin', 'Abbaye Saint-Victor', 'Couvent des Pénitentes', 'Couvent des Billettes', 'Grange des Cisterciens'],
      mansions: ['Sens', 'Cluny', 'Bourbon', 'Nesle', 'Flandre', 'Artois', 'Navarre', 'Clisson', 'Rohan', 'Soubise', 'Bourgogne', 'Anjou', 'Berry', 'Alençon', 'Beauvais',
        'Laval', 'Coucy', 'Montmorency', 'Craon', 'Harcourt', 'Tancarville', 'Melun'],
      mansion: f => `Hôtel de ${f}`.replace('de A', "d'A").replace('de É', "d'É"), college: s => `Collège ${s}`, conventFallback: k => `Couvent n° ${k}`,
      kinds: { couvent: 'couvent', hotel: 'hôtel', college: 'collège' },
    },
    openLand: { orchard: 'verger', garden: 'jardin maraîcher', meadow: 'pré', vines: 'vigne' },
    factions: {
      names: ['Les Loyalistes', 'La Guilde des Assassins', 'Les Gens du Théâtre', 'Les Maisons Marchandes', 'Le Troupeau du Purificateur', 'Les Capuches Grises',
        'La Confrérie de Fer', 'La Maison du Corbeau', 'La Guilde du Sel', 'Les Lanternes Noires', 'Les Sonneurs', 'Les Vieilles Familles'],
      fallback: k => `Faction ${k}`, centre: 'Le Quartier du Maire', esplanade: "L'Esplanade du Maire", esplanadeStairs: "Degrés de l'Esplanade", crowdSquare: 'Place des Harangues',
    },
    cables: {
      official: ['La Ligne des Mouettes', 'La Ligne de la Cloche', 'La Ligne de la Couronne', 'La Ligne des Lanternes', 'La Ligne du Héron', 'La Ligne du Cerf-Volant',
        'La Ligne des Hirondelles', 'La Ligne du Port', 'La Ligne de la Chaîne'],
      secret: ['Le Fil Noir', 'Le Câble Murmurant', 'La Ligne des Rats', 'La Ligne des Phalènes', 'Le Câble Muet', 'La Corde de Nuit', "Le Fil de l'Araignée", 'Le Câble des Contrebandiers'],
      lineOf: (w, secret) => (secret ? `Le Fil ${w}` : `La Ligne ${w}`), secretFallback: 'Un câble sans nom',
    },
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

// Endless names for streets and squares: a word and a kind, never twice the same (for big cities)
function makeNamer(rand, T, used) {
  const pick = l => l[Math.floor(rand() * l.length)];
  const tryName = make => { for (let k = 0; k < 60; k++) { const v = make(); if (!used.has(v)) { used.add(v); return v; } } return null; };
  return {
    street: kind => tryName(() => T.nameOf(pick(T.streetMods), pick(T.words), pick(T.streetKinds[kind] || T.streetKinds.rue)))
      // Very big cities: two signs on the same street ("Bell and Crown Alley")
      || tryName(() => T.nameOf('', T.pair(pick(T.words), pick(T.words)), pick(T.streetKinds[kind] || T.streetKinds.rue))),
    square: () => tryName(() => T.nameOf('', pick(T.words), pick(T.squareKinds))),
  };
}

// A town name from two syllables / un nom de ville en deux syllabes
function townName(rand, T) {
  for (;;) {
    const a = T.name.start[Math.floor(rand() * T.name.start.length)];
    const b = T.name.end[Math.floor(rand() * T.name.end.length)];
    if (a.toLowerCase() !== b) return a + b;
  }
}
