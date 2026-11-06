'use strict';
/*
 * Ready-made cities (presets): a geography and a set of places imposed on the generator, which builds the rest.
 * Positions are in fractions of the city's radius R (x towards the east, y towards the south), so a preset
 * works at any size. Names come in both languages.
 *
 * Kades: a wide valley, a river in the middle flowing east, two hills facing each other, the Mask Island
 * between them, the Theatre Island downstream.
 * Right bank = south (on the right going downstream), left bank = north.
 */

const PRESETS = {
  kades: {
    size: 'grande',
    seed: 'kades',
    // The valley: the river runs through the middle, the ground rises on both sides
    valley: { depth: 24, width: 1.0 },
    rivers: [[[-2, 0.08], [-0.8, 0.05], [-0.3, -0.02], [0, 0], [0.4, 0.06], [0.85, 0.1], [2, 0.04]]],
    // hills[0] carries the citadel (the Loyalists' fort); the others their own landmark
    hills: [
      { key: 'swords', at: [0.58, -0.5], height: 38, type: 'table', r0: 0.14, band: 0.24 },
      { key: 'wheat', at: [-0.58, 0.52], height: 48, type: 'butte', r0: 0.11, band: 0.26, landmark: 'purificateur' },
    ],
    islands: [
      { key: 'mask', at: [0, 0], len: 0.42, wid: 0.24, kind: 'esplanade', bridges: ['left', 'right', 'market'] },
      { key: 'theatres', at: [0.85, 0.1], len: 0.32, wid: 0.15, kind: 'theatres', bridges: ['right'] },
    ],
    market: [0.22, -0.14],
    school: [0.42, -0.3],
    villas: { at: [-0.36, 0.3], count: 6 },
    // Two gates only: the Guild's (everything that enters pays there) and the fort's road down to the plain
    gates: [{ key: 'guildGate', at: [1.05, -0.12] }, { key: 'fortGate', at: [0.8, -0.95] }],
    factions: [
      { key: 'loyalists', at: [0.58, -0.52], color: '#5f6470' },
      { key: 'purifier', at: [-0.58, 0.52], color: '#c29a2e' },
      { key: 'guild', at: [0.34, -0.2], color: '#3f6e9e' },
      { key: 'merchants', at: [-0.3, 0.26], color: '#8a4f9e' },
      { key: 'jensen', at: [-0.62, -0.38], color: '#b5523b' },
      { key: 'other', at: [-0.12, -0.6], color: '#5b8a3c' },
      { key: 'lowbridge', at: [0.5, 0.52], color: '#9e6a3f' },
    ],
    // The abandoned zone: between the two quarters that fought too much
    abandoned: ['jensen', 'other'],
    names: {
      fr: {
        city: 'Kades',
        swords: 'Colline des Épées', wheat: 'Colline du Blé',
        purificateur: 'Le Purificateur', fort: 'Fort des Loyalistes',
        mask: "L'Île du Masque", theatres: 'Île des Théâtres',
        esplanade: "L'Esplanade", tower: 'Tour des Harangues', maskHouse: 'Maison du Masque',
        market: 'Le Marché', school: 'École de la Guilde',
        villas: ['Villa des Tilleuls', 'Villa Brune', 'Villa du Gué', 'Villa des Saules', 'Villa Haute', 'Villa des Roses', 'Villa du Pressoir'],
        guildGate: 'Porte de la Guilde', fortGate: 'Porte du Fort',
        loyalists: 'Les Loyalistes', purifier: 'La Congrégation du Purificateur', guild: 'La Guilde', merchants: 'Les Marchands',
        jensen: 'Quartier de Jensen', other: "Quartier de l'Autre", lowbridge: 'Quartier du Bas-Pont', theatresFaction: 'Le Quartier des Théâtres',
        abandoned: 'La Zone',
      },
      en: {
        city: 'Kades',
        swords: 'Hill of Swords', wheat: 'Hill of Wheat',
        purificateur: 'The Purifier', fort: "The Loyalists' Fort",
        mask: 'Mask Island', theatres: 'Theatre Island',
        esplanade: 'The Esplanade', tower: 'Speaking Tower', maskHouse: 'House of the Mask',
        market: 'The Market', school: 'Guild School',
        villas: ['Lime Villa', 'Brown Villa', 'Ford Villa', 'Willow Villa', 'High Villa', 'Rose Villa', 'Press Villa'],
        guildGate: "Guild Gate", fortGate: 'Fort Gate',
        loyalists: 'The Loyalists', purifier: "The Purifier's Congregation", guild: 'The Guild', merchants: 'The Merchants',
        jensen: "Jensen's Quarter", other: 'The Other Quarter', lowbridge: 'Lowbridge Quarter', theatresFaction: 'The Theatre Quarter',
        abandoned: 'The Zone',
      },
    },
  },
};
