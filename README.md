# Medieval City Generator

Generates clean, readable and **coherent** medieval city maps for writing fantasy. Every element on the map has a reason to be where it is.

**Online: https://romeo4934.github.io/city-medieval-generator/**

**Nothing to install.** Open `index.html` in a browser: no dependencies, no build step. Or just use the online version above.

The interface, every generated name and the city sheet come in **English** (default) or **French**: use the FR / EN button at the top of the panel.

## The model

**The terrain is measured.** Elevation is in metres and slope in percent, checked for every plot: people build normally up to 15 %, sparsely and on terraces up to 25 %, never beyond. A hill can rise in **terraces**: flat levels separated by 10–25 m cliffs or retaining walls, which no house straddles, crossed by named **stairs**. On slopes, streets follow the contour lines.

**Factions.** Ask for 2 to 8 rival factions, plus the Mayor's. Each holds a territory anywhere in the city (the Mayor is not necessarily in the centre), split along the geography: borders stop at the river, at the foot or top of steep slopes, at the citadel's wall and at old walls. Every territory is walled all round, with a fortified gate wherever a main street passes. Along the borders the ground helps too, in a mix of:
- a **ridge**: the wall runs along the crest of a steep hill line where nobody builds;
- a **ravine**: the wall stands on the edge of a gorge between two cliffs, crossed only by bridges;
- a **canal** at the foot of the wall, crossed only by bridges;
- or nothing but the wall.

On about half the borders, **waste ground** lines both sides of the wall: a no man's land of brush and ruined houses where nobody builds any more. The town grew before the factions walled themselves in, so territories stay of similar size. Each faction is tinted and lined with a broad ribbon of its colour along its borders, listed in a legend, and can be renamed (the names are kept in the page address). The city sheet says, for each faction, which quarters it holds, what lies along each border, how many ways through, and whether it holds the high ground, the citadel, the market or the river.

**Cables.** Cables stretched between towers carry people, goods and messages over the walls. Each faction has 1 to 3 stations on its high points (the Mayor's Esplanade is one of them), and the **official network** links them with short spans between nearby stations, with a few loops: a long journey means changing cables on the way (double lines, with a car). **Secret lines** (red dashes) cross some borders between two discreet tower-houses. The sheet gives each line its length and its height above the roofs; a pylon holds it up where it would graze a hill.

**The Mayor's Esplanade.** In the Mayor's territory, a terrace 11–17 m high on top of a cliff, with a tribune at its edge, overlooks Speakers' Square: the mayor speaks, the crowd listens from below. Two flights of steps climb from the square. It is also available without factions (Landmarks), then above the market.

**Sight.** The **Sight** view shows what a seer can see from any point: click the map to move them, tick "from a tower" to raise them 20 m. Terrain, houses (9 m), landmarks and walls block the view; hidden ground is darkened, with distance rings, and the panel lists which faction quarters can be seen, and how much of each. From the street, a seer sees a few streets; from the esplanade or a tower, they look over the borders.

**Edit the terrain.** The **✎ Terrain** button opens the editor on the relief: **Raise** and **Lower** paint hills and hollows with a brush (size and strength adjustable), **Smooth** softens a slope, **River** draws a river point by point (double-click or Enter to finish; both ends run on to the edge of the map), **Erase river** removes one. **Build the city** then rebuilds the whole city on your ground: streets, walls, quarters, factions. Edits are kept in the page address and in the saved file; **Clear all** goes back to the generated terrain.

**Three views**, with the buttons above the map:
- **Map**: the city plan, with hill shading, contours every 10 m and cliffs;
- **Relief**: elevation colours, shading, contours every 5 m labelled in metres and spot heights, with the city on top;
- **Slopes**: slope classes (easy, buildable, terraces, too steep, rock), with houses in black to check where people built;
- **Sight**: what can be seen from a point (see above).

**The ground is continuous**: a gentle general slope, rolling ground, hills that merge into each other through saddles, and rivers that dig their valleys. **The terrain decides everything.** An elevation map (plain, one hill, several hills — up to 10, like Rome or Lisbon — or a valley) determines:
- where **rivers** flow: they follow the low ground and never climb a hill;
- the **shape of the hill**, taken from real sites: lone knoll (Vézelay), long ridge (Nuremberg, Edinburgh), spur of a plateau (Provins, Laon), mesa with sheer sides (Orvieto), lopsided hill (gentle on one side, a cliff on the other); each hill has its own height (25–120 m), orientation, length and irregular outline;
- where nobody **builds**: steep slopes become vineyards or terraced gardens;
- where the **citadel** stands: on the summit, with its own wall and a road climbing to it;
- with several hills, the highest carries the acropolis; the others keep their slopes in vines and carry a small shrine with their name (Ravens Hill, Mill Mount…), and the town slips into the hollows between them;
- where **roads** go: they go round the slopes;
- the **shape of the valley**: wide, narrow gorge (the town only grows lengthwise), two rivers meeting, or a river loop almost circling the town, like the Doubs at Besançon.

**The city has a history.** It is born around the market, on flat ground, near a ford if there is a river, then spreads avoiding slopes and water. The **number of walls** (1, 2 or 3) says how many times it outgrew its walls. Each wall takes the shortest line to defend. Old walls stay inside as rings, standing or pulled down in long stretches; the fallen parts became boulevards, and streets cut breaches through the rest. Where the river enters the town, a water gate with its portcullis. As at Nuremberg or Bruges, a **ditch** (wet on the plain, dry on high ground) runs round the wall, crossed by a bridge at each gate, and **towers** project every 38 m or so, as at Carcassonne.

**Three city forms taken from real cases**, chosen in the panel:
- **Bastide** (grid plan), like the lower town of Carcassonne: equal rectangular blocks, straight streets, a central square lined with arcades around its market hall, the High Street on the axis. A bastide is founded at once: a single wall.
- **Double wall**, like the Cité of Carcassonne: a lower outer wall in front of the rampart, the lists between them, and a barbican guarding each gate.
- **Upper and lower town**, like Provins: the upper town, old and dense, holds the plateau inside its own wall with the castle and a collegiate church; the merchant lower town spreads at the foot of the hill inside another; a climbing road links the two.

**Streets first, as in a real town.** The paths existed before the houses:
1. **Main streets** are the least tiring ways across the terrain, from the gates to the market and on to neighbouring towns. They go round slopes, climb in zigzags, meet in Y-junctions and cross water only by bridges.
2. **Side streets grow** from the main streets, roughly at right angles, following contours on slopes. They stop at another street, a wall, water, a cliff or a slope that is too steep, which naturally gives dead ends. Any buildable ground left empty inside the walls gets a street of its own. Demolished old walls become boulevards, and part of the riverbanks become quays. In a bastide, these are the lines of the grid.
3. **Plots are cut along the streets**: narrow frontage, house in front, yard or garden back to the middle of the block, sometimes a back wing or an outbuilding. Blocks are simply what is left between the streets, so their shapes vary. Outside, fields are cut into long strips (open fields).

**Water is put to work.** A mill race taken off the river drives mills, an island widens in the middle of the stream with its houses, and some town bridges carry houses, like the Pont au Change.

**The countryside is alive.** Fields are strips running off the roads, slopes near the town are planted with terraced vines along the contours, and forests fill what is left far from the roads. Outside the walls: a suburb church, a leper house set apart, tanneries downstream by the water, mills on the river and the gallows on a height.

**Houses depend on the quarter.**
- **Old town**: tight deep plots, much stone, back wings on yards: the most crowded quarter.
- **Newtown**: wider plots, timber framing, gardens.
- **Suburbs**: houses only along the roads, thatched.
- **Main streets**: richer fronts.
- **Roofs**: their colour shows the material (legend on the map), and a line marks the ridge, gable-end on when the front is narrow.

**Every landmark has a reason to be where it is.** The cathedral is in the old town, facing east. The castle is on the summit, or on the walls near the water. The barracks are near a gate. The port is on the bank downstream, the mill on the river (a windmill otherwise). The cemetery and the monastery are outside the walls. If there is no logical place, the landmark is not placed and the tool says why.

**Not every block is houses.** Behind the houses on the street, block interiors are yards, courtyards and gardens. About one block in ten is a large enclosure: a convent with its church, cloister and kitchen gardens (more often near the walls), a lord's mansion with its courtyard and garden (near the centre), or a college around its quad. And the last wall still encloses open land, as in Paris inside the wall of Charles V: orchards, market gardens, meadows and vineyards that the town never filled.

**Small squares** open at crossroads (like the Weinmarkt in Nuremberg), with their well. **Every quarter has its parish church** (St Brice, St Faith…) in its little churchyard, and named **inns** wait for travellers near the gates and the market.

**Quarters are named after what they are**: Old Town, Tanners' Quarter (downstream, because of the smell), Millers' Quarter, The Quays, Castle Foot, Newtown, North Gate Quarter… You can rename them.

**Streets have names written along them**: the High Street and the gate streets leading to the market, Castle Hill, streets named after their quarter, church or the terrain (Tanners' Street, St Aubin Street, Upper Street…), alleys and dead ends. Roads lead to neighbouring towns.

**The city sheet**, in the panel and exportable as Markdown, tells what the map shows: the site, the history read in the walls, the gates and their roads, each quarter and its atmosphere, notable places, every street, and a few story hooks.

## Use

- **Size**: from small town (~2,000 people) to great city (~50,000) and mega city (~150,000–200,000, like Paris around 1300; it takes 8–20 s to generate).
- **Factions**: number of factions (empty or 0 = none); click a name to rename it, the last one being the mayor's quarter.
- **Hills**: number of hills (0–10), cliff steps per hill (0–3, the terraces), shape of the main hill and of the valley, and whether the main hill carries a **citadel** (yes, no, random).
- **How many?**: rivers (0–3), gates, walls, quarters, small squares, churches, inns, islands, mill races, and forest in %. Empty = random. If there is no room (an island on a river too short inside the town…), the tool says so.
- **Seed**: same seed + same settings = same city. Adding a river or a landmark does not move everything else.
- **Zoom**: mouse wheel, double-click (Shift + double-click to zoom out), + / − / ⤢ buttons, drag to move.
- **Save / Load**: a small `.json` file with all settings and names.
- **Export**: SVG (vector, for print) or PNG 3000 × 3000.
- The page address holds every setting: you can bookmark it.

Scale: 1 unit = 1 metre.

## Files

| File | Role |
|---|---|
| `index.html` | the page |
| `style.css` | the layout |
| `i18n.js` | every name and label, in English and French |
| `terrain.js` | the height grid, smooth noise, and the editor's brushes (shared by the generator and the page) |
| `geo.js` | tools: reproducible randomness, geometry, Voronoi, shortest paths |
| `catalog.js` | sizes, landmarks, house types |
| `generator.js` | the model: terrain, rivers, growth, walls, street network (A* on the terrain, then growth), plots (pure data) |
| `land.js` | the countryside: strip fields along the roads, forests |
| `water.js` | water works: mill races and mills, islands |
| `outskirts.js` | outside the walls: suburb church, leper house, tanneries, mills, gallows |
| `factions.js` | factions: territories, border barriers (ridges, ravines, canals, walls), the mayor's esplanade |
| `sight.js` | the Sight view: what can be seen from a point (radial line of sight over terrain and buildings) |
| `monuments.js` | drawing landmarks in their precincts |
| `names.js` | names and crossings: streets, roads, bridges, stairs, gates, inns |
| `worker.js` | background computation (the page stays responsive while generating) |
| `lore.js`, `lore-en.js` | the city sheet, in French and English |
| `render.js` | SVG drawing, label placement |
| `app.js` | the interface: settings, language, zoom, save, export |
| `test.js` | tests, in parallel on every core: `node test.js` (or `node test.js 200`) |

## Publishing (GitHub Pages)

Settings → Pages → *Deploy from a branch* → `main` / `(root)`.
