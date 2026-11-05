'use strict';
/* Names and crossings / noms et croisements : main streets, roads, quarter streets, squares, bridges, stairs,
   old gates, breaches, inns, water gates. Texts come from i18n.js (X = texts of the chosen language). */

function nameCity(K) {
  const { X, nInns, rng, opts, city, streets, bastide, twin, wanted, churchSpots, districts, zoneOf, cellAt, altitude, baseAlt, reliefHeight, rivers, riverDist, cellR, squares, cliffSegs, oldWalls, verts, domainAt, mainHouses, plaza, gates, edgeCells, cells, wall, wallEdges, ek, dist } = K;
    const rNm = rng('noms-rues|' + opts.size);
    const usedNames = new Set();
    const pickFrom = list => {
      const free = list.filter(x => !usedNames.has(x));
      if (!free.length) return null;
      const v = free[Math.floor(rNm() * free.length)];
      usedNames.add(v);
      return v;
    };
    const claim = v => (usedNames.has(v) ? null : (usedNames.add(v), v));
    const namer = makeNamer(rng('noms-sans-fin|' + opts.size), X, usedNames);   // quand les listes sont épuisées
    const gateText = gi => (city.gateNames[gi] ? city.gateNames[gi].text : X.gate(X.compass[0]));
    const label = (name, pts, cls) => city.streetLabels.push({ name, points: pts, cls });

    // Grandes rues
    if (bastide) {
      const axisNames = X.streets.axes;
      const byAxis = new Map();
      streets.filter(st => st.axis).forEach(st => { if (!byAxis.has(st.axis) || polyLen(st.points) > polyLen(byAxis.get(st.axis).points)) byAxis.set(st.axis, st); });
      for (const [ax, st] of byAxis) {
        const name = axisNames[ax];
        usedNames.add(name);
        city.streets.push({ name, kind: 'grande rue', length: Math.round(polyLen(st.points)), detail: X.streets.details.axis });
        label(name, st.points, 'main');
      }
    }
    const innerRoads = streets.filter(st => st.kind === 'inner');
    const longest = innerRoads.reduce((b, st) => (!b || polyLen(st.points) > polyLen(b.points) ? st : b), null);
    for (const st of bastide ? [] : innerRoads) {
      const name = st === longest ? X.streets.high : X.streets.gateStreet(gateText(st.gate));
      usedNames.add(name);
      city.streets.push({ name, kind: 'grande rue', length: Math.round(polyLen(st.points)), detail: X.streets.details.fromMarket(gateText(st.gate)) });
      label(name, st.points, 'main');
    }
    for (const st of streets) {
      if (st.kind === 'citadel') {
        const name = twin ? X.streets.hillTwin : wanted.includes('chateau') ? X.streets.hillCastle : X.streets.hillCitadel;
        city.streets.push({ name, kind: 'montée', length: Math.round(polyLen(st.points)), detail: X.streets.details.toCitadel });
        label(name, st.points, 'main');
      } else if (st.kind === 'outer') {
        const town = townName(rng('voisin|' + st.gate), X);
        const name = X.streets.roadTo(town);
        city.neighbours.push({ name: town, gate: gateText(st.gate) });
        city.streets.push({ name, kind: 'route', length: Math.round(polyLen(st.points)), detail: X.streets.details.leaves(gateText(st.gate)) });
        label(name, st.points.slice(Math.floor(st.points.length / 2)), 'road');
      } else if (st.kind === 'boulevard') {
        const name = X.streets.boulevards.map(claim).find(Boolean);
        if (name) { city.streets.push({ name, kind: 'boulevard', length: Math.round(polyLen(st.points)), detail: X.streets.details.oldWall }); label(name, st.points, 'boulevard'); }
      } else if (st.kind === 'quai') {
        const name = pickFrom(X.streets.quays) || X.streets.quayFallback;
        city.streets.push({ name, kind: 'quai', length: Math.round(polyLen(st.points)), detail: X.streets.details.river });
        label(name, st.points, 'rue');
      } else if (st.kind === 'growth' || (st.kind === 'grid' && !st.axis)) {
        const c = st.coarse || cellAt(st.points[Math.floor(st.points.length / 2)]), d = districts[c.district], zone = zoneOf(c);
        const L = polyLen(st.points);
        let name = null;
        if (st.deadEnd) name = pickFrom(X.streets.deadEnds) || namer.street('impasse') || X.streets.deadEndFallback(city.streets.length + 1);
        else if (st.cls === 'ruelle') name = pickFrom(X.streets.alleys) || namer.street('ruelle') || X.streets.alleyFallback(city.streets.length + 1);
        else {
          const trade = d && X.tradeStreet(d.name);
          const church = churchSpots.find(ch => ch.district === c.district);
          const options = [];
          if (trade) options.push(trade);
          if (church) options.push(X.streets.church(church.name));
          if (zone === 'neuf') options.push(X.streets.newStreet);
          if (altitude(...st.points[0]) - baseAlt > reliefHeight * 0.35) options.push(X.streets.upper);
          if (rivers.length && riverDist(st.points[0]) < cellR) options.push(X.streets.lower);
          for (const o of options) if (rNm() < 0.6 && (name = claim(o))) break;
          if (!name) name = pickFrom(X.streets.names) || namer.street('rue') || X.streets.fallback(city.streets.length + 1);
        }
        city.streets.push({ name, kind: st.deadEnd ? 'impasse' : st.cls, length: Math.round(L), detail: d ? d.name : '' });
        if (L > (st.cls === 'rue' ? 45 : 32)) label(name, st.points, st.cls);
      }
    }

    // Placettes
    for (const sq of squares) {
      const c = sq.cell;
      const church = churchSpots.find(ch => ch.district === c.district && dist(Geo.centroid(ch.poly), sq.at) < cellR * 2);
      const o2 = [];
      if (church) o2.push(X.squares.church(church.name));
      if (rivers.length && riverDist(sq.at) < cellR) o2.push(X.squares.fish, X.squares.quay);
      if (zoneOf(c) === 'vieille') o2.push(X.squares.pillory, X.squares.cross);
      let name = null;
      for (const o of o2) if ((name = claim(o))) break;
      if (!name) name = pickFrom(X.squares.names) || namer.square() || X.squares.fallback;
      city.squares.push({ name, at: sq.at, district: c.district });
    }

    // Croisements des rues avec l'eau (ponts), les ressauts (escaliers) et les vieux murs (portes, brèches)
    const standingOld = oldWalls.filter(w => w.standing).map(w => [verts[w.a], verts[w.b]]);
    const riverSegs = city.rivers.flatMap(rv => rv.points.slice(1).map((p, i) => [rv.points[i], p, rv.w]));
    for (const st of streets) {
      const P = st.points;
      for (let i = 0; i + 1 < P.length; i++) {
        const a = P[i], b = P[i + 1], ang = (Math.atan2(b[1] - a[1], b[0] - a[0]) * 180) / Math.PI;
        for (const [c, d, w] of riverSegs) {
          const h = segHit(a, b, c, d);
          if (h && !city.bridges.some(br => dist([br.x, br.y], h.at) < 12)) {
            // Pont habité : en ville, sur une grande rue, les maisons se serrent sur le pont (comme le pont au Change)
            const inhabited = domainAt(h.at) === 'town' && st.cls === 'main' && city.bridges.filter(b2 => b2.inhabited).length < 2 && rNm() < 0.6;
            city.bridges.push({ x: h.at[0], y: h.at[1], angle: ang, length: w + 12, inhabited });
          }
        }
        for (const [c, d] of cliffSegs) {
          const h = segHit(a, b, c, d);
          if (h && !city.stairs.some(s2 => dist(s2.at, h.at) < 15)) city.stairs.push({ at: h.at, angle: ang, name: pickFrom(X.stairs) || X.stairFallback });
        }
        if (st.cls === 'main' || st.cls === 'road') for (const [c, d] of standingOld) {
          const h = segHit(a, b, c, d);
          if (h && !city.oldGates.some(g => dist(g.at, h.at) < 12)) city.oldGates.push({ at: h.at, prev: c, next: d });
        }
      }
    }
    // Vieux murs : un tronçon traversé par une rue (hors porte) a une brèche
    city.oldWalls = oldWalls.map(w => {
      const a = verts[w.a], b = verts[w.b];
      const crossed = w.standing && streets.some(st => st.cls !== 'main' && st.points.some((p, i) => i + 1 < st.points.length && segHit(p, st.points[i + 1], a, b)));
      return { a, b, standing: w.standing, breachA: crossed, breachB: false };
    });

    // Auberges : sur les grandes rues, près de chaque porte et près du marché
    const targets = [plaza.site, ...gates.map(g => verts[g])];
    const innNames = X.inns.slice();
    const taken = new Set();
    // Autant d'auberges que demandé : d'abord près des portes et du marché, puis le long des grandes rues
    const nWanted = nInns !== null && nInns !== undefined ? nInns : Math.min(6, targets.length);
    while (targets.length < nWanted && mainHouses.length) targets.push(mainHouses[Math.floor(targets.length * 7919 % mainHouses.length)].at);
    for (const T of targets.slice(0, nWanted)) {
      let best = null, bd = Infinity;
      mainHouses.forEach((h, i) => { if (!taken.has(i) && dist(h.at, T) < bd) { bd = dist(h.at, T); best = i; } });
      if (best === null || bd > cellR * 3) continue;
      taken.add(best);
      const name = innNames.splice(Math.floor(rNm() * innNames.length), 1)[0];
      city.inns.push({ name, district: mainHouses[best].district, poly: mainHouses[best].poly, at: mainHouses[best].at, near: T === plaza.site ? X.innNear.market : X.innNear.gate(gateText(gates.findIndex(g => verts[g] === T))) });
    }

    // Portes d'eau : là où la rivière entre dans la ville en passant sous le rempart
    const insideEdge = key => (edgeCells.get(key) || []).every(ci => cells[ci].inner);
    const outsideEdge = key => (edgeCells.get(key) || []).every(ci => !cells[ci].inner);
    for (const rv of rivers) {
      for (let j = 1; j + 1 < rv.path.length; j++) {
        const v = rv.path[j];
        if (!wall.includes(v)) continue;
        const e1 = ek(rv.path[j - 1], v), e2 = ek(v, rv.path[j + 1]);
        const entersTown = (insideEdge(e1) || insideEdge(e2)) && (outsideEdge(e1) || outsideEdge(e2) || wallEdges.has(e1) || wallEdges.has(e2));
        if (!entersTown) continue;
        const a = verts[rv.path[j - 1]], b = verts[rv.path[j + 1]], L = dist(a, b) || 1;
        city.waterGates.push({ at: verts[v], dir: [(b[0] - a[0]) / L, (b[1] - a[1]) / L], w: rv.w });
      }
    }
}
