'use strict';
/* Calcul de la ville en arrière-plan : la page reste fluide pendant la génération. */
importScripts('geo.js', 'catalog.js', 'land.js', 'water.js', 'outskirts.js', 'monuments.js', 'names.js', 'generator.js');
self.onmessage = e => {
  const { id, opts } = e.data;
  try { self.postMessage({ id, city: generateCity(opts) }); }
  catch (err) { self.postMessage({ id, error: String(err && err.stack || err) }); }
};
