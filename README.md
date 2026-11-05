# Générateur de villes médiévales

Génère des plans de villes médiévales propres, lisibles et **cohérents**, pour écrire de la fantasy. Chaque élément de la carte a une raison d'être où il est.

**En ligne : https://romeo4934.github.io/city-medieval-generator/**

**Aucune installation.** Ouvre `index.html` dans un navigateur : pas de dépendance, pas de compilation. Ou utilise directement la version en ligne ci-dessus.

## Le modèle

**Le terrain est mesuré.** L'altitude est en mètres et la pente en pourcentage, vérifiée pour chaque parcelle : on bâtit normalement jusqu'à 15 %, en terrasses et clairsemé jusqu'à 25 %, jamais au-delà. Une colline peut monter par **esplanades** : des paliers plats séparés par des ressauts de 10 à 25 m (falaise ou mur de soutènement), qu'aucune maison ne chevauche, franchis par des **escaliers** nommés. En pente, les rues suivent les courbes de niveau.

**Trois vues**, avec les boutons en haut de la carte :
- **Plan** : la carte de la ville, avec l'ombrage du relief, les courbes de niveau tous les 10 m et les ressauts ;
- **Relief** : les couleurs d'altitude, l'ombrage, les courbes tous les 5 m cotées en mètres et les sommets cotés, avec la ville en surimpression ;
- **Pentes** : la carte des pentes par classe (facile, constructible, terrasses, trop raide, rocher), avec les maisons en noir pour vérifier où l'on a bâti.

**Le relief décide de tout.** Une carte d'altitude (plaine, colline, plusieurs collines comme Athènes ou Rome, ou vallée) détermine :
- où coulent les **rivières**, qui suivent les creux et ne remontent jamais une colline ;
- la **forme de la colline**, tirée de sites réels : butte isolée (Vézelay), crête allongée (Nuremberg, Édimbourg), éperon avancé d'un plateau (Provins, Laon), table aux flancs abrupts (Orvieto), colline dissymétrique (douce d'un côté, falaise de l'autre) ; chaque colline a sa hauteur (25 à 120 m), son orientation, son allongement et un contour irrégulier ;
- où l'on **ne construit pas** : les pentes raides deviennent des vignes ou des jardins en terrasses ;
- où se dresse la **citadelle** : sur le plateau du sommet, avec sa propre enceinte et une route qui y monte ;
- avec plusieurs collines, la plus haute porte l'acropole ; les autres, plus basses, gardent leurs pentes en vignes et portent un petit sanctuaire avec leur nom (Mont des Corbeaux, Butte aux Moulins…), et la ville se glisse dans les vallons ;
- par où passent les **routes**, qui contournent les pentes ;
- la **forme de la vallée** : large, gorge étroite (la ville ne s'étend qu'en longueur), confluence de deux rivières, ou méandre où la rivière fait presque le tour de la ville, comme le Doubs à Besançon.

**La ville a une histoire.** Elle naît autour du marché, sur un terrain plat, près d'un gué s'il y a une rivière, puis s'étend en évitant pentes et cours d'eau. L'**âge de la ville** (1, 2 ou 3 enceintes) décide de combien de fois elle a débordé de ses murs. Chaque enceinte suit le tracé le plus court à défendre (elle englobe pentes et collines au lieu de les contourner). Les anciennes enceintes restent à l'intérieur en anneaux, debout ou démolies par longs tronçons ; les parties tombées sont devenues des boulevards, et les rues ont percé des brèches dans le reste. Là où la rivière entre dans la ville, une porte d'eau avec sa herse. Comme à Nuremberg ou à Bruges, un **fossé** (en eau en plaine, à sec sur les hauteurs) fait le tour du rempart, franchi par un pont devant chaque porte, et des **tours en saillie** se succèdent tous les 38 m environ, comme à Carcassonne.

**Trois formes de ville tirées de cas réels**, au choix dans le panneau :
- **Bastide** (plan en damier), comme la ville basse de Carcassonne : îlots rectangulaires égaux, rues au cordeau, place centrale bordée de couverts (arcades) avec sa halle, Grand-Rue sur l'axe. Une bastide est fondée d'un coup : une seule enceinte.
- **Double enceinte**, comme la Cité de Carcassonne : un mur extérieur plus bas précède le rempart, les lices s'étendent entre les deux, et une barbacane protège chaque porte.
- **Ville haute et ville basse**, comme Provins : la ville haute, ancienne et dense, occupe le plateau dans sa propre enceinte avec le château et une collégiale ; la ville basse marchande s'étend au pied de la colline, dans la sienne ; une montée relie les deux.

**Les rues d'abord, comme dans une vraie ville.** Les chemins existaient avant les maisons :
1. **Les grandes rues** sont les chemins les moins pénibles sur le terrain, des portes au marché et vers les villes voisines. Elles contournent les pentes, montent en lacets, se rejoignent en Y et ne franchissent l'eau que par des ponts.
2. **Les rues secondaires poussent** depuis les grandes rues, à peu près perpendiculaires et en suivant les courbes de niveau dans les pentes. Elles s'arrêtent sur une autre rue, un mur, l'eau, une falaise ou une pente trop forte, ce qui donne naturellement des impasses. Les vieux murs démolis deviennent des boulevards et une partie des berges des quais. Dans une bastide, ce sont les lignes du damier.
3. **Les parcelles sont découpées le long des rues** : façade étroite, maison devant, cour ou jardin jusqu'au milieu de l'îlot, parfois un arrière-corps ou une dépendance. Les îlots sont simplement ce qui reste entre les rues : ils ont donc des formes variées. Dehors, les champs sont en lanières (openfield).

**L'eau est aménagée.** Un bief dérivé de la rivière fait tourner des moulins, une île s'élargit au milieu du courant avec ses maisons, et certains ponts de la ville sont habités, comme le pont au Change. Le fossé n'est en eau que sur les tronçons bas du rempart, à sec sur les hauteurs.

**La campagne vit.** Les champs sont des quartiers de lanières qui partent des routes (openfield), les pentes proches de la ville sont plantées de vigne en terrasses le long des courbes de niveau, et les forêts occupent ce qui reste loin des routes. Hors les murs, on trouve une église de faubourg, une maladrerie à l'écart, des tanneries en aval au bord de l'eau, des moulins sur la rivière et le gibet sur une hauteur.

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
| `generator.js` | le modèle : relief, rivières, croissance, enceintes, réseau de rues (A* sur le terrain puis croissance), parcelles (données pures) |
| `land.js` | la campagne : champs en lanières le long des routes, forêts |
| `water.js` | l'eau aménagée : biefs et moulins, îles |
| `outskirts.js` | hors les murs : église de faubourg, maladrerie, tanneries, moulins, gibet |
| `monuments.js` | le dessin des bâtiments importants dans leur enclos |
| `names.js` | les noms et les croisements : rues, routes, ponts, escaliers, portes, auberges |
| `worker.js` | le calcul en arrière-plan (la page reste fluide pendant la génération) |
| `lore.js` | la fiche de ville |
| `render.js` | le dessin en SVG, placement des étiquettes |
| `app.js` | l'interface : réglages, zoom, enregistrement, export |
| `test.js` | les tests, en parallèle sur tous les cœurs : `node test.js` (ou `node test.js 200`) |

## Mise en ligne (GitHub Pages)

Settings → Pages → *Deploy from a branch* → `main` / `(root)`.
