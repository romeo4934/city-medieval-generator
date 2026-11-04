# Générateur de villes médiévales

Génère des plans de villes médiévales propres et lisibles, pour écrire de la fantasy : remparts, portes nommées, rues, maisons, rivières, colline, quartiers nommés et bâtiments importants.

**Aucune installation.** Ouvre `index.html` dans un navigateur, c'est tout : pas de dépendance, pas de compilation.

## Utilisation

- **Graine** : un mot quelconque. Même graine + mêmes réglages = même ville, toujours.
- **Taille** : petite, moyenne, grande, capitale.
- **Rivières** : aucune, une, deux ou au hasard.
- **Colline** : relief ombré ; le château et le palais s'y installent de préférence, le quartier devient « Haute-Ville » ou « La Butte ».
- **Murs intérieurs** : une enceinte autour d'un quartier (celui du château en priorité) ou de plusieurs.
- **Bâtiments importants** : cathédrale, château, palais, halle des guildes, université, caserne, prison, hospice, bains, arène, cimetière, port, monastère, moulin. Coche ceux que tu veux.
- **Renommer** : le nom de la ville et chaque quartier (clique sur le nom dans la liste).
- **Zoom** : molette, double-clic (Maj + double-clic pour dézoomer), boutons + / − / ⤢, glisser pour se déplacer.
- **Enregistrer / Charger** : un petit fichier `.json` avec tous les réglages et les noms.
- **Exporter** : SVG (vectoriel, idéal pour l'impression) ou PNG 3000 × 3000.

L'adresse de la page contient aussi tous les réglages : on peut la mettre en favori ou la partager.

Ajouter une rivière, une colline ou un bâtiment ne déplace pas le reste de la ville : chaque élément a son propre tirage aléatoire.

## Fichiers

| Fichier | Rôle |
|---|---|
| `index.html` | la page |
| `style.css` | la mise en page |
| `generator.js` | la génération : Voronoi, remparts, routes, quartiers, bâtiments (données pures) |
| `render.js` | le dessin en SVG |
| `app.js` | l'interface : réglages, zoom, enregistrement, export |

## Mise en ligne (GitHub Pages)

Settings → Pages → *Deploy from a branch* → `main` / `(root)`. Le site est alors disponible sur `https://<utilisateur>.github.io/city-medieval-generator/`.

Échelle : 1 unité = 1 mètre.
