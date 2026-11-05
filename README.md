# Générateur de villes médiévales

Génère des plans de villes médiévales propres, lisibles et **cohérents**, pour écrire de la fantasy. Chaque élément de la carte a une raison d'être où il est.

**En ligne : https://romeo4934.github.io/city-medieval-generator/**

**Aucune installation.** Ouvre `index.html` dans un navigateur : pas de dépendance, pas de compilation. Ou utilise directement la version en ligne ci-dessus.

## Le modèle

**Le relief décide de tout.** Une carte d'altitude (plaine, colline, plusieurs collines comme Athènes ou Rome, ou vallée) détermine :
- où coulent les **rivières**, qui suivent les creux et ne remontent jamais une colline ;
- où l'on **ne construit pas** : les pentes raides deviennent des vignes ou des jardins en terrasses ;
- où se dresse la **citadelle** : sur le plateau du sommet, avec sa propre enceinte et une route qui y monte ;
- avec plusieurs collines, la plus haute porte l'acropole ; les autres, plus basses, gardent leurs pentes en vignes et portent un petit sanctuaire avec leur nom (Mont des Corbeaux, Butte aux Moulins…), et la ville se glisse dans les vallons ;
- par où passent les **routes**, qui contournent les pentes.

**La ville a une histoire.** Elle naît autour du marché, sur un terrain plat, près d'un gué s'il y a une rivière, puis s'étend en évitant pentes et cours d'eau. L'**âge de la ville** (1, 2 ou 3 enceintes) décide de combien de fois elle a débordé de ses murs. Chaque enceinte suit le tracé le plus court à défendre (elle englobe pentes et collines au lieu de les contourner). Les anciennes enceintes restent à l'intérieur en anneaux, debout ou démolies par longs tronçons ; les parties tombées sont devenues des boulevards, et les rues ont percé des brèches dans le reste. Là où la rivière entre dans la ville, une porte d'eau avec sa herse. Comme à Nuremberg ou à Bruges, un **fossé** (en eau en plaine, à sec sur les hauteurs) fait le tour du rempart, franchi par un pont devant chaque porte, et des **tours en saillie** se succèdent tous les 38 m environ, comme à Carcassonne.

**Trois formes de ville tirées de cas réels**, au choix dans le panneau :
- **Bastide** (plan en damier), comme la ville basse de Carcassonne : îlots rectangulaires égaux, rues au cordeau, place centrale bordée de couverts (arcades) avec sa halle, Grand-Rue sur l'axe. Une bastide est fondée d'un coup : une seule enceinte.
- **Double enceinte**, comme la Cité de Carcassonne : un mur extérieur plus bas précède le rempart, les lices s'étendent entre les deux, et une barbacane protège chaque porte.
- **Ville haute et ville basse**, comme Provins : la ville haute, ancienne et dense, occupe le plateau dans sa propre enceinte avec le château et une collégiale ; la ville basse marchande s'étend au pied de la colline, dans la sienne ; une montée relie les deux.

**Le parcellaire est organique.** Chaque quartier est redécoupé en petites cellules. Les îlots sont des assemblages irréguliers de ces cellules, séparés par les grandes routes, puis par des rues secondaires, des ruelles et des impasses tracées en travers des îlots trop grands. Les maisons ne bordent que les rues : les remparts, les berges et les cœurs d'îlots reçoivent des cours, des jardins, des arbres et des clôtures. Dehors, les champs sont en lanières (openfield).

**Les maisons dépendent du quartier.**
- **Parcelles en lanières** : façade étroite sur rue, maison devant, cour ou jardin derrière, parfois une dépendance au fond.
- **Vieille ville** : parcelles serrées et profondes, beaucoup de pierre, arrière-corps sur cour : c'est le quartier le plus peuplé.
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

**De petites places** s'ouvrent aux croisements (comme le Weinmarkt de Nuremberg), avec leur puits. En ville, une partie des berges est bordée de **quais** où les maisons regardent l'eau (comme le Dijver à Bruges).

**Chaque quartier a son église paroissiale** (Saint-Brice, Sainte-Foy…) dans son petit cimetière, et des **auberges** nommées attendent les voyageurs près des portes et du marché.

**Les quartiers sont nommés selon ce qu'ils sont.** Vieille Ville, Quartier des Tanneurs (en aval, à cause de l'odeur), Meuniers, Les Quais, Sous-le-Château, Bourg-Neuf, Quartier de la Porte du Nord… Tu peux les renommer.

**Les rues ont un nom, écrit le long de leur tracé** : la Grand-Rue et les rues des portes vers le marché, la Montée du Château, des rues nommées d'après leur quartier, leur église ou le relief (Rue des Tanneurs, Rue Saint-Aubin, Rue Haute, Rue du Quai…), des ruelles et des impasses. Les routes mènent aux villes voisines. Les étiquettes sont placées sans se chevaucher.

**La fiche de ville**, dans le panneau et exportable en Markdown, raconte ce que le plan montre : le site, l'histoire lisible dans les enceintes, les portes et leurs routes, chaque quartier et son atmosphère, les lieux notables, toutes les rues, et quelques accroches pour une scène.

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
| `geo.js` | outils : hasard reproductible, géométrie, Voronoi, plus courts chemins |
| `catalog.js` | tailles, bâtiments, types de maisons, listes de noms |
| `generator.js` | le modèle : relief, rivières, croissance, enceintes, routes, bâtiments, parcellaire, noms (données pures) |
| `lore.js` | la fiche de ville |
| `render.js` | le dessin en SVG, placement des étiquettes |
| `app.js` | l'interface : réglages, zoom, enregistrement, export |
| `test.js` | les tests : `node test.js` (ou `node test.js 200` pour plus de villes) |

## Mise en ligne (GitHub Pages)

Settings → Pages → *Deploy from a branch* → `main` / `(root)`.
