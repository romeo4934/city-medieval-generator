'use strict';
/*
 * Ready-made cities (presets): a geography and a set of places imposed on the generator, which builds the rest.
 * Positions are in fractions of the city's radius R (x towards the east, y towards the south), so a preset
 * works at any size. Names and notes come in both languages.
 *
 * Kades: a valley running north–south, a river flowing from south to north through the middle of the town,
 * two hills joined by the Great Cable (the Purifier's to the north, the Market's to the south-east),
 * the Centre Island in the river.
 */

const PRESETS = {
  kades: {
    size: 'grande',
    seed: 'kades',
    valley: { depth: 24, width: 1.0 },
    // The river comes in from the south and leaves to the north (points listed downstream)
    rivers: [[[0.05, 2], [0.06, 0.8], [-0.02, 0.3], [0, 0], [0.03, -0.4], [-0.04, -0.85], [0, -2]]],
    // hills[0] carries the citadel: the congregation's closed quarter, the Purifier at the top
    hills: [
      { key: 'purifierHill', at: [0.36, -0.58], height: 46, type: 'butte', r0: 0.13, band: 0.25, landmark: 'purificateur' },
      { key: 'marketHill', at: [0.46, 0.5], height: 26, type: 'table', r0: 0.13, band: 0.2 },
    ],
    islands: [
      { key: 'centre', at: [0, 0], len: 0.42, wid: 0.22, kind: 'esplanade', bridges: ['left', 'right', { toward: [0.4, 0.3] }] },
    ],
    market: [0.46, 0.5],
    fort: [-0.45, -0.45],
    barracks: [-0.6, -0.3],
    villas: { at: [0.38, -0.1], count: 6 },
    gates: [{ key: 'southGate', at: [0.35, 1.05] }, { key: 'northWestGate', at: [-0.8, -0.8] }],
    factions: [
      { key: 'congregation', at: [0.36, -0.58], color: '#c29a2e', closed: true },
      { key: 'guild', at: [0.5, 0.58], color: '#3f6e9e' },
      { key: 'merchants', at: [0.44, -0.12], color: '#8a4f9e' },
      { key: 'loyalists', at: [-0.45, -0.45], color: '#5f6470', closed: true },
      { key: 'theatres', at: [-0.35, 0.12], color: '#2f8c86', open: true },
      { key: 'zone', at: [-0.3, 0.68], color: '#8a7d68', open: true, waste: true },
    ],
    // The Great Cable: the grain goes up, the white wheat comes down; small paid cables of the Guild between roofs
    cables: { grand: ['guild', 'congregation'], small: true },
    names: {
      fr: {
        city: 'Kades',
        purifierHill: 'Colline du Purificateur', marketHill: 'Colline du Marché',
        purificateur: 'Le Purificateur', fort: 'Fort des Loyalistes', barracks: 'Casernes',
        centre: "L'Île du Centre", esplanade: "L'Esplanade", tower: 'La Tour', maskHouse: 'La Mairie',
        market: 'Le Marché', villas: ['Maison Jensen', 'Maison des Tilleuls', 'Maison Brune', 'Maison du Gué', 'Maison des Saules', 'Maison Haute', 'Maison des Roses'],
        southGate: 'Porte Sud', northWestGate: 'Porte Nord-Ouest',
        congregation: 'La Congrégation', guild: 'Le Marché (la Guilde)', merchants: 'Les Marchands (quartier de Jensen)',
        loyalists: 'Les Loyalistes', theatres: 'Les Théâtres', zone: 'La Zone',
        grandCable: 'Le Grand Câble',
        notes: {
          congregation: "Quartier fermé, gardé jour et nuit. Le Purificateur au sommet, le plus grand bâtiment de la ville ; une seule rue étroite y monte.",
          guild: 'Halles, entrepôts, gare du Grand Câble. Le territoire de la guilde, ouvert à tous, à côté de la porte Sud.',
          merchants: 'De belles maisons au bord de la rivière, entre les deux collines. Le Grand Câble passe au-dessus de leurs toits.',
          loyalists: "Un fort et ses casernes, entourés de murs. L'autre quartier fermé, gardé en permanence.",
          theatres: "Le peuple, les scènes, le bal. Ruelles serrées, aucune barrière. Face à l'île.",
          zone: "Des maisons vides, sans loi, entre les théâtres et le mur d'enceinte.",
          centre: "L'esplanade, la tour d'où l'on parle, la mairie. À tout le monde, à personne. Trois ponts la relient aux deux rives.",
          barriers: 'Des barrières entre les quartiers, ouvertes le jour et fermées la nuit ; la Congrégation et les Loyalistes gardent les leurs en permanence ; les Théâtres n\'en ont pas.',
          grandCable: 'De la colline du Marché à celle du Purificateur : le grain monte, le blé blanc redescend.',
          smallCables: 'Des petits câbles entre les toits des quartiers, tenus par la guilde, payants.',
        },
      },
      en: {
        city: 'Kades',
        purifierHill: "Purifier's Hill", marketHill: 'Market Hill',
        purificateur: 'The Purifier', fort: "The Loyalists' Fort", barracks: 'Barracks',
        centre: 'Centre Island', esplanade: 'The Esplanade', tower: 'The Tower', maskHouse: 'Town Hall',
        market: 'The Market', villas: ['Jensen House', 'Lime House', 'Brown House', 'Ford House', 'Willow House', 'High House', 'Rose House'],
        southGate: 'South Gate', northWestGate: 'North-West Gate',
        congregation: 'The Congregation', guild: 'The Market (the Guild)', merchants: "The Merchants (Jensen's quarter)",
        loyalists: 'The Loyalists', theatres: 'The Theatres', zone: 'The Zone',
        grandCable: 'The Great Cable',
        notes: {
          congregation: 'A closed quarter, guarded day and night. The Purifier at the top, the largest building in town; a single narrow street climbs to it.',
          guild: "Halls, warehouses, the Great Cable's station. The Guild's territory, open to all, next to the South Gate.",
          merchants: 'Fine houses by the river, between the two hills. The Great Cable passes above their roofs.',
          loyalists: 'A fort and its barracks, surrounded by walls. The other closed quarter, guarded at all times.',
          theatres: 'The people, the stages, the ball. Tight alleys, no barrier at all. Facing the island.',
          zone: 'Empty houses, no law, between the theatres and the town wall.',
          centre: 'The esplanade, the tower one speaks from, the town hall. Everyone\'s and no one\'s. Three bridges join it to both banks.',
          barriers: 'Barriers between the quarters, open by day and closed at night; the Congregation and the Loyalists guard theirs at all times; the Theatres have none.',
          grandCable: "From Market Hill to the Purifier's: the grain goes up, the white wheat comes down.",
          smallCables: 'Small cables between the rooftops of the quarters, run by the Guild, for a fee.',
        },
      },
    },
  },
};
