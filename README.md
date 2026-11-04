# Générateur de villes médiévales

Génère des plans de villes médiévales propres, lisibles et **cohérents**, pour écrire de la fantasy. Chaque élément de la carte a une raison d'être où il est.

**Aucune installation.** Ouvre `index.html` dans un navigateur : pas de dépendance, pas de compilation.

## Le modèle

**Le relief décide de tout.** Une carte d'altitude (plaine, colline, plusieurs collines comme Athènes ou Rome, ou vallée) détermine :
- où coulent les **rivières**, qui suivent les creux et ne remontent jamais une colline ;
- où l'on **ne construit pas** : les pentes raides deviennent des vignes ou des jardins en terrasses ;
- où se dresse la **citadelle** : sur le plateau du sommet, avec sa propre enceinte et une route qui y monte ;
- avec plusieurs collines, la plus haute porte l'acropole ; les autres, plus basses, gardent leurs pentes en vignes et portent un petit sanctuaire avec leur nom (Mont des Corbeaux, Butte aux Moulins…), et la ville se glisse dans les vallons ;
- par où passent les **routes**, qui contournent les pentes.

**La ville a une histoire.** Elle naît autour du marché, sur un terrain plat, près d'un gué s'il y a une rivière, puis s'étend en évitant pentes et cours d'eau. L'**âge de la ville** (1, 2 ou 3 enceintes) décide de combien de fois elle a débordé de ses murs. Les anciennes enceintes restent à l'intérieur, en partie démolies, avec leurs vieilles portes.

**Le parcellaire est organique.** Chaque quartier est redécoupé en petites cellules. Les îlots sont des assemblages irréguliers de ces cellules, séparés par les grandes routes, puis par des rues secondaires, des ruelles et des impasses tracées en travers des îlots trop grands. Les maisons ne bordent que les rues : les remparts, les berges et les cœurs d'îlots reçoivent des cours, des jardins, des arbres et des clôtures. Dehors, les champs sont en lanières (openfield).

**Les maisons dépendent du quartier.**
- **Parcelles en lanières** : façade étroite sur rue, maison devant, cour ou jardin derrière, parfois une dépendance au fond.
- **Vieille ville** : parcelles serrées et profondes, beaucoup de pierre.
- **Bourg-Neuf** : parcelles plus larges, colombages, jardins.
- **Faubourgs** : maisons seulement le long des routes, en chaume.
- **Grandes rues** : les façades y sont plus riches.
- **Toits** : leur couleur indique le matériau (légende sur la carte), et un trait marque le faîtage, sur pignon quand la façade est étroite.

**Chaque bâtiment important a une raison d'être où il est.**
- La cathédrale est dans la vieille ville, orientée vers l'est.
- Le château est au sommet, ou sur les remparts près de l'eau.
- La caserne est près d'une porte.
- Le port est sur la rive en aval, le moulin sur la rivière (à vent sinon).
- Le cimetière et le monastère sont hors les murs.
- S'il n'y a pas de place logique, le bâtiment n'est pas placé et l'outil dit pourquoi.

**Les quartiers sont nommés selon ce qu'ils sont.** Vieille Ville, Quartier des Tanneurs (en aval, à cause de l'odeur), Meuniers, Les Quais, Sous-le-Château, Bourg-Neuf, Quartier de la Porte du Nord… Tu peux les renommer.

## Utilisation

- **Graine** : même graine + mêmes réglages = même ville. Ajouter une rivière ou un bâtiment ne déplace pas le reste.
- **Zoom** : molette, double-clic (Maj + double-clic pour dézoomer), boutons + / − / ⤢, glisser pour se déplacer.
- **Enregistrer / Charger** : un petit fichier `.json` avec tous les réglages et les noms.
- **Exporter** : SVG (vectoriel, pour l'impression) ou PNG 3000 × 3000.
- L'adresse de la page contient tous les réglages : on peut la mettre en favori.

Échelle : 1 unité = 1 mètre.

## Fichiers

| Fichier | Rôle |
|---|---|
| `index.html` | la page |
| `style.css` | la mise en page |
| `generator.js` | le modèle : relief, rivières, croissance, enceintes, routes, bâtiments, parcelles (données pures) |
| `render.js` | le dessin en SVG |
| `app.js` | l'interface : réglages, zoom, enregistrement, export |

## Mise en ligne (GitHub Pages)

Settings → Pages → *Deploy from a branch* → `main` / `(root)`.
