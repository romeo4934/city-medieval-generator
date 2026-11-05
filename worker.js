'use strict';
/* Calcul de la ville en arrière-plan : la page reste fluide pendant la génération. */
const v = self.location.search;   // même version que la page, pour ne jamais mélanger d'anciens et de nouveaux fichiers
importScripts(...['geo.js', 'catalog.js', 'land.js', 'water.js', 'outskirts.js', 'monuments.js', 'names.js', 'generator.js'].map(f => f + v));
self.onmessage = e => {
  const { id, opts } = e.data;
  try { self.postMessage({ id, city: generateCity(opts) }); }
  catch (err) { self.postMessage({ id, error: String(err && err.stack || err) }); }
};
