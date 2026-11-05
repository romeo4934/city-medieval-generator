'use strict';
/* Catalogue : tailles, bâtiments, zones de maisons et listes de noms (ville, quartiers, rues, saints, auberges). */

// ---------- noms ----------

const NAME_START = ['Val', 'Mont', 'Roc', 'Bel', 'Aube', 'Cor', 'Lis', 'Fer', 'Mar', 'Ys', 'Gal', 'Bran',
  'Ost', 'Vire', 'Haute', 'Clar', 'Dun', 'Sain', 'Pierre', 'Grand', 'Noir', 'Or'];
const NAME_END = ['beau', 'fort', 'mère', 'lune', 'bourg', 'morte', 'ange', 'gard', 'mont', 'vin', 'brume',
  'ombre', 'val', 'roche', 'castel', 'fleur', 'lac', 'sel', 'vent'];

function cityName(rand) {
  for (;;) {
    const a = NAME_START[Math.floor(rand() * NAME_START.length)];
    const b = NAME_END[Math.floor(rand() * NAME_END.length)];
    if (a.toLowerCase() !== b) return a + b;
  }
}

// ---------- catalogue ----------

const SIZES = {
  petite:   { cells: 12, gates: 3, districts: 3 },
  moyenne:  { cells: 25, gates: 4, districts: 5 },
  grande:   { cells: 45, gates: 5, districts: 7 },
  capitale: { cells: 70, gates: 6, districts: 9 },
  metropole: { cells: 110, gates: 7, districts: 12 },
  mega:      { cells: 330, gates: 8, districts: 16 },
};

const BUILDINGS = [
  { id: 'temple',     label: 'Cathédrale' },
  { id: 'chateau',    label: 'Château' },
  { id: 'palais',     label: 'Palais' },
  { id: 'guildes',    label: 'Halle des guildes' },
  { id: 'universite', label: 'Université' },
  { id: 'caserne',    label: 'Caserne' },
  { id: 'prison',     label: 'Prison' },
  { id: 'hospice',    label: 'Hospice' },
  { id: 'bains',      label: 'Bains publics' },
  { id: 'arene',      label: 'Arène' },
  { id: 'cimetiere',  label: 'Cimetière' },
  { id: 'port',       label: 'Port' },
  { id: 'monastere',  label: 'Monastère' },
  { id: 'moulin',     label: 'Moulin' },
  { id: 'esplanade',  label: 'Esplanade du Maire' },
];
const DEFAULT_BUILDINGS = ['temple', 'chateau'];

const DISTRICT_NAMES = ['Quartier des Marchands', 'Quartier des Artisans', 'Quartier des Forgerons',
  'Quartier des Tisserands', 'Quartier des Orfèvres', 'Les Halles', 'Quartier des Potiers',
  'Quartier des Bouchers', 'Quartier des Cordiers', 'Quartier des Charpentiers',
  'Quartier des Verriers', 'Quartier des Selliers', 'Les Ruelles'];
const SAINTS = ['Saint-Aubin', 'Sainte-Odile', 'Saint-Clair', 'Saint-Gilles', 'Saint-Brice', 'Sainte-Foy', 'Saint-Lô',
  'Saint-Firmin', 'Saint-Médard', 'Sainte-Aure', 'Saint-Aldric', 'Saint-Waast', 'Sainte-Gemme', 'Saint-Orens', 'Saint-Évroult'];
const STREET_NAMES = ['du Puits', 'des Trois-Rois', 'de la Lune', 'du Pélican', 'des Écrivains', "de l'Ours", 'du Cygne',
  'de la Monnaie', 'des Changeurs', 'du Cheval-Blanc', 'aux Fèvres', 'de la Pomme', 'du Grenier-à-Sel', 'des Cinq-Diamants',
  'de la Harpe', 'du Heaume', 'des Chaudronniers', 'de la Clef', 'des Trois-Pucelles', 'du Dauphin', 'aux Herbes', 'des Merciers'];
const ALLEY_NAMES = ['du Chat-Noir', 'des Pas-Perdus', 'Étroite', 'aux Rats', 'du Mauvais-Garçon', 'de la Lanterne',
  'du Coupe-Gorge', 'des Soupirs', 'de la Chandelle', 'du Bout-du-Monde'];
const DEADEND_NAMES = ['du Four', 'des Chats', 'Sans-Nom', 'du Vieux-Puits', 'des Tonneliers', 'de la Corne', "de l'Échaudé", 'du Grand-Cerf'];
const SQUARE_NAMES = ['Place aux Herbes', 'Place du Puits', 'Marché au Blé', 'Place aux Œufs', 'Place aux Bois',
  'Marché aux Vaches', 'Place du Change', 'Place aux Draps', 'Place de la Fontaine', 'Place des Trois-Ormes'];
const INN_NAMES = ['Au Cerf Blanc', 'Le Chaudron Fêlé', 'La Truie qui File', "Le Lion d'Or", "L'Écu d'Argent", "Le Pot d'Étain",
  'La Licorne Grise', 'Le Coq Hardi', 'La Pomme de Pin', 'Le Sanglier Rouge', 'La Lanterne Sourde', 'Le Bœuf Couronné',
  'Les Trois Corbeaux', 'La Sirène Ivre', 'Le Pendu Joyeux', 'Le Dragon Vert'];
const COMPASS = ['Est', 'Sud-Est', 'Sud', 'Sud-Ouest', 'Ouest', 'Nord-Ouest', 'Nord', 'Nord-Est'];
const GATE_EXTRA = ['des Corbeaux', 'du Roi', 'aux Loups', 'des Vignes', 'de la Reine', 'du Pèlerin', 'des Morts'];

// Maisons selon la zone : largeur de façade, profondeur, matériaux (pierre / colombage / chaume),
// dépendances dans les cours, sol des cours
const ZONES = {
  // people : habitants par maison (plusieurs étages et plusieurs ménages dans la vieille ville)
  // rear : probabilité d'un arrière-corps (logis ou atelier sur cour) derrière la maison sur rue
  vieille:  { front: [4.5, 7], depth: [12, 18], mat: [0.55, 0.45, 0],    annex: 0.5,  rear: 0.7,  court: 'court',  people: 14 },
  bourg:    { front: [5.5, 9], depth: [10, 15], mat: [0.25, 0.68, 0.07], annex: 0.4,  rear: 0.35, court: 'yard',   people: 10 },
  neuf:     { front: [7, 12], depth: [8, 12],  mat: [0.12, 0.68, 0.2],  annex: 0.2,  rear: 0.08, court: 'garden', people: 7 },
  faubourg: { front: [9, 15], depth: [7, 10],  mat: [0, 0.4, 0.6],      annex: 0.3,  rear: 0,    court: 'garden', people: 5 },
  citadelle:{ front: [10, 18], depth: [8, 12], mat: [1, 0, 0],          annex: 0.1,  rear: 0.2,  court: 'court',  people: 6 },
};
