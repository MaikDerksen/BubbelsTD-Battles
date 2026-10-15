'use strict';
// ============================================================
//  BLASEN (≈ Bloons)
// ============================================================
SC.BLOONS = {
  red: { name: 'Rot', speed: 1.0, hp: 1, children: [], color: '#e8352b', r: 11 },
  blue: { name: 'Blau', speed: 1.4, hp: 1, children: ['red'], color: '#2f8fe8', r: 11.5 },
  green: { name: 'Grün', speed: 1.8, hp: 1, children: ['blue'], color: '#56c22f', r: 12 },
  yellow: { name: 'Gelb', speed: 3.2, hp: 1, children: ['green'], color: '#f7d31e', r: 12.5 },
  pink: { name: 'Pink', speed: 3.5, hp: 1, children: ['yellow'], color: '#ff72b6', r: 12.5 },
  ink: { name: 'Tinte', speed: 1.8, hp: 1, children: ['pink', 'pink'], color: '#1e1b29', r: 10, immune: ['blast'] },
  ice: { name: 'Eis', speed: 2.0, hp: 1, children: ['pink', 'pink'], color: '#eef6fb', r: 10, immune: ['cold'] },
  armor: { name: 'Panzer', speed: 1.0, hp: 1, children: ['ink', 'ink'], color: '#8c939c', r: 12.5, immune: ['sharp', 'sonic'] },
  stripe: { name: 'Gestreift', speed: 1.8, hp: 1, children: ['ink', 'ice'], color: '#ffffff', r: 12.5, immune: ['blast', 'cold'] },
  rainbow: { name: 'Regenbogen', speed: 2.2, hp: 1, children: ['stripe', 'stripe'], color: '#ff5f5f', r: 13.5 },
  coral: { name: 'Koralle', speed: 2.5, hp: 10, children: ['rainbow', 'rainbow'], color: '#ff8a5c', r: 14.5 },
  puffer: { name: 'Kugelfisch', speed: 1.0, hp: 200, children: ['coral', 'coral', 'coral', 'coral'], color: '#e9c46a', r: 30, moab: true },
  whale: { name: 'Blauwal', speed: 0.35, hp: 700, children: ['puffer', 'puffer', 'puffer', 'puffer'], color: '#3b6fb6', r: 44, moab: true },
  kraken: { name: 'Krakenkönig', speed: 0.25, hp: 4000, children: ['whale', 'whale', 'whale', 'whale'], color: '#b0306a', r: 54, moab: true },
};
SC.BLOON_ORDER = ['red', 'blue', 'green', 'yellow', 'pink', 'ink', 'ice', 'armor', 'stripe', 'rainbow', 'coral', 'puffer', 'whale', 'kraken'];
// Regrow-Kette (nur einfache Blasen)
SC.REGROW_UP = { red: 'blue', blue: 'green', green: 'yellow', yellow: 'pink' };

(function computeRBE() {
  const memo = {};
  const rbe = (t) => {
    if (memo[t]) return memo[t];
    const d = SC.BLOONS[t];
    let v = d.hp;
    for (const c of d.children) v += rbe(c);
    return (memo[t] = v);
  };
  for (const k in SC.BLOONS) {
    SC.BLOONS[k].rbe = rbe(k);
    SC.BLOONS[k].id = k;
    SC.BLOONS[k].idx = SC.BLOON_ORDER.indexOf(k);
  }
})();

// ============================================================
//  TÜRME (Krebse)
//  Jedes Upgrade verändert die Stats "s" des Turms.
// ============================================================
SC.TOWERS = {
  knall: {
    name: 'Knallkrebs',
    cost: 220,
    desc: 'Schnappt seine Knallschere zu und schießt Kavitationsblasen ab. Schall kann keine Panzer knacken.',
    base: { range: 125, rate: 0.85, dmg: 1, pierce: 3, type: 'sonic', speed: 520, pr: 7, proj: 'bubble' },
    paths: [
      [
        { name: 'Doppelschere', cost: 180, desc: 'Schnappt 50 % schneller.', apply: (s) => (s.rate *= 0.66) },
        { name: 'Schallkanone', cost: 650, desc: 'Feuert breite Schockwellen-Kegel mit 12 Pierce ab.', apply: (s) => { s.proj = 'wave'; s.pierce += 9; s.range += 35; s.pr = 16; } },
        { name: 'Überschallknall', cost: 3200, desc: 'Jeder 3. Knall ist ein Riesenring, der alles in der Nähe trifft und betäubt.', apply: (s) => { s.boom = true; s.dmg += 1; } },
      ],
      [
        { name: 'Heiße Blase', cost: 300, desc: 'Die Blasen werden heiß: +1 Schaden, knackt Panzer und Eis.', apply: (s) => { s.type = 'heat'; s.dmg += 1; } },
        { name: 'Kavitationsfunke', cost: 900, desc: 'Blasen explodieren beim Treffer in einem Hitzeblitz.', apply: (s) => { s.explode = { r: 42, pierce: 10 }; } },
        { name: 'Sonnenknall 4700°C', cost: 4500, desc: 'Plasmakugeln mit riesigem Schaden, ×3 gegen Riesenblasen.', apply: (s) => { s.proj = 'plasma'; s.dmg += 4; s.moabMul = 3; s.explode = { r: 62, pierce: 25 }; s.rate *= 0.8; s.pr = 12; } },
      ],
    ],
  },
  fang: {
    name: 'Fangschreckenkrebs',
    cost: 350,
    desc: 'Die schnellste Faust der Tierwelt. Kurze Reichweite, harter Schlag (stumpf, knackt Panzer).',
    base: { range: 78, rate: 0.55, dmg: 2, pierce: 1, type: 'punch', targets: 1 },
    paths: [
      [
        { name: 'Titanfaust', cost: 250, desc: '+2 Schaden pro Schlag.', apply: (s) => (s.dmg += 2) },
        { name: 'Doppelschlag', cost: 700, desc: 'Trifft 2 Ziele gleichzeitig und schlägt schneller.', apply: (s) => { s.targets = 2; s.rate *= 0.75; } },
        { name: 'Kavitationshieb', cost: 3800, desc: 'Jeder Schlag erzeugt eine Schockwelle. ×3 Schaden gegen Riesenblasen.', apply: (s) => { s.shock = { r: 55, dmg: 3, pierce: 15 }; s.dmg += 3; s.moabMul = 3; } },
      ],
      [
        { name: 'Speerspitze', cost: 300, desc: 'Wird zum Speerer: wirft scharfe Speere auf große Distanz.', apply: (s) => { s.ranged = true; s.range = 175; s.type = 'sharp'; s.pierce = 3; } },
        { name: '16-Farben-Augen', cost: 450, desc: 'Sieht Glas-Blasen und teilt die Sicht mit allen Türmen in Reichweite.', apply: (s) => { s.camo = true; s.auraCamo = true; } },
        { name: 'Polarisationsblick', cost: 2600, desc: 'Treffer entfernen Glas und Nachwachs. Türme in Reichweite: +1 Pierce.', apply: (s) => { s.strip = true; s.auraPierce = 1; s.dmg += 2; s.rate *= 0.7; } },
      ],
    ],
  },
  einsiedler: {
    name: 'Einsiedlerkrebs',
    cost: 300,
    desc: 'Wirft sein Schneckenhaus wie einen Bumerang. Es fliegt raus und kommt zurück.',
    base: { range: 140, rate: 1.25, dmg: 1, pierce: 6, type: 'sharp', speed: 330, count: 1, shell: 'snail' },
    paths: [
      [
        { name: 'Bumerang-Profi', cost: 200, desc: '+4 Pierce, wirft schneller.', apply: (s) => { s.pierce += 4; s.rate *= 0.8; } },
        { name: 'Doppelwurf', cost: 550, desc: 'Wirft zwei Häuser in entgegengesetzten Bögen.', apply: (s) => (s.count = 2) },
        { name: 'Schalensturm', cost: 3000, desc: '4 Schalen kreisen dauerhaft um den Krebs.', apply: (s) => { s.orbit = 4; s.dmg += 1; } },
      ],
      [
        { name: 'Dosen-Heim', cost: 280, desc: 'Zieht in eine Blechdose: Würfe werden stumpf (knackt Panzer).', apply: (s) => { s.type = 'punch'; s.shell = 'can'; } },
        { name: 'Glasflaschen-Heim', cost: 750, desc: 'Flasche zersplittert beim ersten Treffer in 8 Scherben. +3 Pierce.', apply: (s) => { s.shatter = true; s.pierce += 3; s.shell = 'bottle'; } },
        { name: 'Wrack-Heim', cost: 3500, desc: 'Lebt im Schiffswrack: +1 Schaden und Kanonenkugeln (×3 gegen Riesen).', apply: (s) => { s.cannon = { rate: 1.1, r: 60, dmg: 4, pierce: 25 }; s.dmg += 1; s.shell = 'wreck'; } },
      ],
    ],
  },
  kokos: {
    name: 'Kokoskrabbe',
    cost: 500,
    desc: 'Knackt Kokosnüsse und wirft sie im Bogen. Explosion trifft viele, aber keine Tinte.',
    base: { range: 165, rate: 1.5, dmg: 1, pierce: 14, type: 'blast', aoe: 45, count: 1 },
    paths: [
      [
        { name: 'Größere Nüsse', cost: 300, desc: 'Größere Explosion, mehr Pierce.', apply: (s) => { s.aoe = 60; s.pierce = 22; } },
        { name: 'Kokos-Splitter', cost: 650, desc: 'Nüsse zerplatzen in 6 scharfe Splitter.', apply: (s) => (s.frags = 6) },
        { name: 'Palmen-Bombardement', cost: 3600, desc: 'Unendliche Reichweite, 3 Nüsse pro Wurf.', apply: (s) => { s.global = true; s.count = 3; s.rate *= 0.7; s.dmg += 1; } },
      ],
      [
        { name: 'Hartschale', cost: 400, desc: 'Steinharte Nüsse: stumpfer Aufprall trifft auch Tinte, +1 Schaden, doppelt gegen Korallen und Riesen.', apply: (s) => { s.type = 'punch'; s.dmg += 1; s.moabMul = 2; s.coralMul = 2; } },
        { name: 'Klebrige Kokosmilch', cost: 800, desc: 'Getroffene Blasen werden 2,5 s um 40 % langsamer.', apply: (s) => (s.slow = { f: 0.6, t: 2.5 }) },
        { name: 'Riesenkokos', cost: 4200, desc: '×6 Schaden gegen Riesenblasen und Rückstoß.', apply: (s) => { s.dmg += 3; s.moabMul = 6; s.aoe = Math.max(s.aoe, 70); s.knock = 35; } },
      ],
    ],
  },
  pocke: {
    name: 'Seepocken-Kolonie',
    cost: 400,
    desc: 'Festgewachsene Krebse! Siedelt Stachel-Pocken direkt auf der Strömung an.',
    base: { range: 110, rate: 2.0, dmg: 1, pierce: 6, type: 'sharp', life: 30 },
    paths: [
      [
        { name: 'Schnelle Brut', cost: 300, desc: 'Siedelt 50 % schneller an.', apply: (s) => (s.rate *= 0.65) },
        { name: 'Stahlpocken', cost: 800, desc: '12 Pierce, stumpf (knackt Panzer).', apply: (s) => { s.pierce = 12; s.type = 'punch'; } },
        { name: 'Riff-Teppich', cost: 3000, desc: 'Riesige Riffe mit 40 Pierce und 2 Schaden.', apply: (s) => { s.pierce = 40; s.dmg = 2; s.rate *= 0.7; s.big = true; } },
      ],
      [
        { name: 'Lange Haltbarkeit', cost: 200, desc: 'Pocken halten 60 s statt 30 s.', apply: (s) => (s.life = 60) },
        { name: 'Rankenfuß-Fänger', cost: 700, desc: 'Die Rankenfüße halten getroffene Blasen kurz fest.', apply: (s) => (s.hold = 0.6) },
        { name: 'Pocken-Minen', cost: 2800, desc: 'Jede 3. Pocke ist eine Mine (Explosion, ×3 gegen Riesen).', apply: (s) => (s.mine = { r: 70, dmg: 8, pierce: 30 }) },
      ],
    ],
  },
  winker: {
    name: 'Winkerkrabbe',
    cost: 600,
    desc: 'Support: winkt mit der Riesenschere den Takt. Türme in Reichweite feuern 10 % schneller.',
    base: { range: 130, buffSpeed: 0.1, support: true },
    paths: [
      [
        { name: 'Trommelschere', cost: 400, desc: 'Takt-Bonus auf +20 %.', apply: (s) => (s.buffSpeed = 0.2) },
        { name: 'Wink-Signal', cost: 1200, desc: 'Türme in Reichweite: +12 % Reichweite, +1 Pierce.', apply: (s) => { s.buffRange = 0.12; s.buffPierce = 1; } },
        { name: 'Balztanz', cost: 4000, desc: 'Alle 25 s ein Tanz: Türme in Reichweite 8 s doppelt so schnell.', apply: (s) => (s.dance = true) },
      ],
      [
        { name: 'Scharfer Blick', cost: 400, desc: 'Türme in Reichweite sehen Glas-Blasen.', apply: (s) => (s.auraCamo = true) },
        { name: 'Panzerbrecher', cost: 800, desc: 'Türme in Reichweite knacken Panzer mit allem.', apply: (s) => (s.auraArmor = true) },
        { name: 'Revierkönig', cost: 3500, desc: 'Blasen im Revier: 25 % langsamer, +1 Schaden pro Treffer.', apply: (s) => (s.zone = true) },
      ],
    ],
  },
  yeti: {
    name: 'Yeti-Krabbe',
    cost: 400,
    desc: 'Haariger Tiefseekrebs. Sendet Kältepulse, die Blasen einfrieren.',
    base: { range: 80, rate: 2.4, dmg: 0, freeze: 1.1, type: 'cold' },
    paths: [
      [
        { name: 'Dichtes Fell', cost: 250, desc: 'Größerer Kälteradius.', apply: (s) => (s.range += 22) },
        { name: 'Tiefseekälte', cost: 600, desc: 'Pulse machen 1 Schaden und frieren länger ein.', apply: (s) => { s.dmg = 1; s.freeze = 1.8; } },
        { name: 'Hydrothermal-Schock', cost: 3500, desc: 'Abwechselnd Eis- und Hitzepuls (4 Schaden, trifft Riesen).', apply: (s) => { s.thermal = true; s.rate *= 0.7; } },
      ],
      [
        { name: 'Bakterienzucht', cost: 300, desc: 'Riesenblasen in Reichweite 30 % langsamer.', apply: (s) => (s.moabSlow = 0.7) },
        { name: 'Klebrige Haare', cost: 500, desc: 'Nach dem Auftauen bleiben Blasen 2 s lang halb so schnell.', apply: (s) => (s.sticky = true) },
        { name: 'Eiszeit', cost: 2800, desc: 'Großer Radius, alle Blasen darin dauerhaft 40 % langsamer.', apply: (s) => { s.range += 40; s.permaSlow = 0.6; s.rate *= 0.8; } },
      ],
    ],
  },
  spinne: {
    name: 'Riesenspinnenkrabbe',
    cost: 450,
    desc: 'Drei Meter Beinspannweite! Stampft im Kreis und trifft bis zu 8 Blasen.',
    base: { range: 95, rate: 1.1, dmg: 1, hits: 8, type: 'sharp' },
    paths: [
      [
        { name: 'Längere Beine', cost: 200, desc: '+25 Reichweite.', apply: (s) => (s.range += 25) },
        { name: 'Schnelltrippler', cost: 600, desc: 'Stampft 65 % schneller.', apply: (s) => (s.rate *= 0.6) },
        { name: 'Stelzensturm', cost: 3000, desc: 'Ununterbrochenes Stampfen: 16 Treffer, +1 Schaden.', apply: (s) => { s.rate *= 0.4; s.hits = 16; s.dmg += 1; } },
      ],
      [
        { name: 'Panzerbeine', cost: 350, desc: 'Stumpfe Beine knacken Panzer.', apply: (s) => (s.type = 'punch') },
        { name: 'Deko-Algen', cost: 500, desc: 'Tarnt sich mit Algen: sieht Glas, Nachbarn +10 % Reichweite und Tarnsicht.', apply: (s) => { s.camo = true; s.auraCamo = true; s.auraRange = 0.1; } },
        { name: 'Titanenstampfer', cost: 3800, desc: 'Jeder 4. Stampfer: Schockwelle (6 Schaden), betäubt alles.', apply: (s) => (s.titan = { r: 135, dmg: 6, pierce: 60 }) },
      ],
    ],
  },
  krill: {
    name: 'Krillschwarm',
    cost: 700,
    desc: 'Ein Schwarm Krill-Drohnen jagt Blasen auf der ganzen Karte.',
    base: { count: 3, dmg: 1, rate: 0.45, speed: 240, type: 'sharp', range: 60, global: true },
    paths: [
      [
        { name: 'Größerer Schwarm', cost: 500, desc: '5 Krill statt 3.', apply: (s) => (s.count = 5) },
        { name: 'Leuchtkrill', cost: 900, desc: 'Biolumineszenz: sieht Glas und blendet (verlangsamt).', apply: (s) => { s.camo = true; s.slow = { f: 0.75, t: 1 }; } },
        { name: 'Superschwarm', cost: 4500, desc: '12 Krill, je 2 Schaden.', apply: (s) => { s.count = 12; s.dmg = 2; } },
      ],
      [
        { name: 'Schnellschwimmer', cost: 400, desc: 'Schneller schwimmen und zuschnappen.', apply: (s) => { s.speed = 380; s.rate *= 0.7; } },
        { name: 'Fressrausch', cost: 1200, desc: '×4 Schaden gegen Riesenblasen.', apply: (s) => (s.moabMul = 4) },
        { name: 'Bartenwal-Köder', cost: 5000, desc: 'Alle 20 s frisst ein Wal einen Streckenabschnitt leer.', apply: (s) => (s.whale = true) },
      ],
    ],
  },
  farm: {
    name: 'Garnelenfarm',
    cost: 1000,
    desc: 'Züchtet Garnelen. Bei jedem Eco-Tick springen Kisten mit Muscheln heraus.',
    base: { income: 60, farm: true, range: 0 },
    paths: [
      [
        { name: 'Größere Becken', cost: 500, desc: '+30 pro Tick.', apply: (s) => (s.income += 30) },
        { name: 'Aquakultur', cost: 1500, desc: '+80 pro Tick.', apply: (s) => (s.income += 80) },
        { name: 'Garnelen-Imperium', cost: 5000, desc: '+300 pro Tick.', apply: (s) => (s.income += 300) },
      ],
      [
        { name: 'Perlenzucht', cost: 600, desc: 'Alle 30 s eine Perle im Wert von 150.', apply: (s) => (s.pearl = 150) },
        { name: 'Fischmarkt', cost: 1200, desc: 'Kisten sind 25 % mehr wert.', apply: (s) => (s.market = 1.25) },
        { name: 'Muschel-Börse', cost: 4500, desc: 'Alle 30 s 10 % Zinsen auf dein Guthaben (max. 800).', apply: (s) => (s.bank = true) },
      ],
    ],
  },
};
// ============================================================
//  NEUE TÜRME – Mechaniken, die es in Bloons nicht gibt
// ============================================================
Object.assign(SC.TOWERS, {
  post: {
    name: 'Flaschenpost-Krabbe',
    cost: 550,
    desc: 'Fängt Blasen mit dem Netz und schickt sie per Flaschenpost aufs Feld des Gegners. Im Klassik-Modus gibt es Muscheln dafür.',
    base: { range: 100, rate: 1.6, catchN: 1, catchMax: 4, cap: 12 },
    paths: [
      [
        { name: 'Großes Netz', cost: 250, desc: 'Fängt 35 % schneller.', apply: (s) => (s.rate *= 0.65) },
        { name: 'Schleppnetz', cost: 700, desc: 'Fängt 2 Blasen auf einmal, auch Tinte, Eis und Panzer.', apply: (s) => { s.catchN = 2; s.catchMax = 7; } },
        { name: 'Tiefsee-Reuse', cost: 2600, desc: '3 Blasen pro Fang bis Regenbogen, sieht Glas, größere Flaschen.', apply: (s) => { s.catchN = 3; s.catchMax = 9; s.camo = true; s.cap = 16; s.range += 20; } },
      ],
      [
        { name: 'Eilpost', cost: 300, desc: 'Kleinere Flaschen: verschickt schon nach 8 Blasen.', apply: (s) => (s.cap = Math.min(s.cap, 8)) },
        { name: 'Nachwachs-Tinte', cost: 800, desc: 'Verschickte Blasen kommen beim Gegner als Nachwachs an.', apply: (s) => (s.sendRegrow = true) },
        { name: 'Glasflaschen', cost: 2200, desc: 'Verschickte Blasen kommen als Glas (Tarnung) an.', apply: (s) => (s.sendCamo = true) },
      ],
    ],
  },
  tide: {
    name: 'Gezeiten-Hummer',
    cost: 650,
    desc: 'Bläst ins Muschelhorn und schiebt Blasen mit einer Gegenströmung zurück. Jede Blase lässt sich nur ein paar Mal zurückschieben.',
    base: { range: 110, rate: 3.0, push: 42, moabPush: 0, maxPush: 3, dmg: 0, rotFree: true },
    paths: [
      [
        { name: 'Springflut', cost: 300, desc: 'Schiebt 70 statt 42 Pixel zurück.', apply: (s) => (s.push = 70) },
        { name: 'Strudel', cost: 900, desc: 'Die Welle macht 1 Schaden (stumpf) und schiebt auch Riesenblasen.', apply: (s) => { s.dmg = 1; s.moabPush = 22; } },
        { name: 'Mahlstrom', cost: 3200, desc: 'Viel häufiger, 2 Schaden, jede Blase bis zu 5-mal zurück.', apply: (s) => { s.rate *= 0.55; s.dmg = 2; s.maxPush = 5; s.moabPush = 40; } },
      ],
      [
        { name: 'Ebbe', cost: 250, desc: 'Blasen in Reichweite sind 20 % langsamer.', apply: (s) => (s.ebb = 0.8) },
        { name: 'Gegenströmung', cost: 650, desc: '+30 Reichweite, erfasst auch Glas-Blasen.', apply: (s) => { s.range += 30; s.camo = true; } },
        { name: 'Salzwasser', cost: 2500, desc: 'Zurückgeschobene Blasen nehmen 4 s lang +1 Schaden von allem.', apply: (s) => (s.soak = 4) },
      ],
    ],
  },
  molt: {
    name: 'Häutungs-Hummer',
    cost: 480,
    desc: 'Sammelt Erfahrung mit jedem Treffer und häutet sich bis Level 10: jedes Level macht ihn schneller, stärker und größer. Ab Level 5 sieht er Glas.',
    base: { range: 72, rate: 0.9, dmg: 1, pierce: 3, type: 'punch', xpMul: 1 },
    paths: [
      [
        { name: 'Proteinkost', cost: 250, desc: '+50 % Erfahrung.', apply: (s) => (s.xpMul = 1.5) },
        { name: 'Schnelle Häutung', cost: 700, desc: '+150 % Erfahrung und 15 % schneller.', apply: (s) => { s.xpMul = 2.5; s.rate *= 0.85; } },
        { name: 'Riesenhummer', cost: 2800, desc: '+2 Schaden, +15 Reichweite, ×2 gegen Riesenblasen.', apply: (s) => { s.dmg += 2; s.range += 15; s.moabMul = 2; } },
      ],
      [
        { name: 'Harte Schale', cost: 300, desc: '+3 Pierce pro Schlag.', apply: (s) => (s.pierce += 3) },
        { name: 'Alte Schalen', cost: 650, desc: 'Lässt alle 15 s und bei jeder Häutung seine alte Schale als Falle auf der Strecke liegen.', apply: (s) => (s.shells = true) },
        { name: 'Lehrmeister', cost: 2400, desc: 'Türme in Reichweite feuern pro Level 2 % schneller (max. 20 %).', apply: (s) => { s.teach = true; s.range += 10; } },
      ],
    ],
  },
  dice: {
    name: 'Würfelkrabbe',
    cost: 380,
    desc: 'Wirft Würfel: eine 1 ist eine Niete, eine 6 ist ein kritischer Treffer mit vierfachem Schaden. Stumpf, knackt Panzer.',
    base: { range: 135, rate: 0.75, dmg: 1, pierce: 2, type: 'punch', speed: 470, count: 1, critMul: 4 },
    paths: [
      [
        { name: 'Gezinkte Würfel', cost: 220, desc: 'Würfelt zweimal und nimmt den besseren Wurf.', apply: (s) => (s.adv = true) },
        { name: 'Doppelwurf', cost: 600, desc: 'Wirft 2 Würfel auf einmal.', apply: (s) => (s.count = 2) },
        { name: 'Glückssträhne', cost: 2400, desc: 'Jede 6 explodiert und wirft sofort einen Bonuswürfel.', apply: (s) => { s.chain = true; s.critBoom = { r: 50, pierce: 14 }; s.dmg += 1; } },
      ],
      [
        { name: 'Spielbank', cost: 300, desc: 'Jede gewürfelte 6 bringt 6 Muscheln.', apply: (s) => (s.chips = 6) },
        { name: 'Würfelbecher', cost: 700, desc: 'Keine Nieten mehr (eine 1 wird neu gewürfelt) und sieht Glas.', apply: (s) => { s.noOne = true; s.camo = true; } },
        { name: 'Jackpot', cost: 2600, desc: 'Jeder 40. Wurf ist ein Jackpot: +150 Muscheln und ein Riesenwürfel.', apply: (s) => { s.jackpot = 40; s.pierce += 2; } },
      ],
    ],
  },
});

// ============================================================
//  STUFE 4: Meister-Upgrades mit aktivierbarer Spezialfähigkeit
//  Regel (wie BTD Battles): ein Pfad bis 4, der andere bis 2.
// ============================================================
SC.TIER4 = {
  knall: [
    { name: 'Schallmauer', cost: 9500, desc: 'Passiv: +2 Schaden, schneller. FÄHIGKEIT: Ein Knall über die ganze Karte – 15 Schaden an allen Blasen, betäubt sie.', apply: (s) => { s.dmg += 2; s.rate *= 0.7; }, ability: { id: 'screenDmg', name: 'Schallmauer', cd: 40, dmg: 15, stun: 1.5, moabStun: 0.5, col: '#9fe8ff' } },
    { name: 'Supernova', cost: 14000, desc: 'Passiv: +6 Schaden, riesige Plasma-Explosionen. FÄHIGKEIT: 8 s lang vierfache Feuerrate.', apply: (s) => { s.dmg += 6; s.explode = { r: 80, pierce: 40 }; }, ability: { id: 'selfBoost', name: 'Supernova', cd: 45, mul: 4, dur: 8 } },
  ],
  fang: [
    { name: 'Faust der Tiefe', cost: 11000, desc: 'Passiv: +6 Schaden, 3 Ziele. FÄHIGKEIT: Ein Schlag mit 3000 Schaden gegen die stärkste Blase der Karte.', apply: (s) => { s.dmg += 6; s.targets = 3; }, ability: { id: 'smite', name: 'Faust der Tiefe', cd: 30, dmg: 3000 } },
    { name: 'Regenbogen-Prophet', cost: 9000, desc: 'Passiv: Türme in Reichweite +1 Schaden. FÄHIGKEIT: Alle Blasen verlieren Glas & Nachwachs und nehmen 10 s lang +2 Schaden.', apply: (s) => { s.auraDmg = 1; s.dmg += 3; }, ability: { id: 'mark', name: 'Regenbogenblick', cd: 45, dur: 10 } },
  ],
  einsiedler: [
    { name: 'Schalen-Tornado', cost: 10000, desc: 'Passiv: 8 kreisende Schalen, +2 Schaden. FÄHIGKEIT: 6 s Tornado – 16 Schalen wirbeln in großem Radius.', apply: (s) => { s.orbit = 8; s.dmg += 2; }, ability: { id: 'tornado', name: 'Schalen-Tornado', cd: 40, dur: 6 } },
    { name: 'Geisterschiff', cost: 13000, desc: 'Passiv: Kanonen feuern doppelt so schnell. FÄHIGKEIT: Breitseite – 30 Kanonenkugeln in 3 s.', apply: (s) => { if (s.cannon) s.cannon.rate *= 0.5; s.dmg += 1; }, ability: { id: 'salvo', name: 'Breitseite', cd: 45, n: 30, dur: 3 } },
  ],
  kokos: [
    { name: 'Kokos-Meteor', cost: 12000, desc: 'Passiv: 5 Nüsse pro Wurf. FÄHIGKEIT: Ein Riesen-Meteor schlägt bei der stärksten Blase ein.', apply: (s) => { s.count = 5; s.dmg += 1; }, ability: { id: 'meteor', name: 'Kokos-Meteor', cd: 35, r: 160, dmg: 40, moabMul: 4 } },
    { name: 'Tropensturm', cost: 13000, desc: 'Passiv: +3 Schaden. FÄHIGKEIT: 40 brennende Kokosnüsse regnen 4 s lang auf die Strecke.', apply: (s) => { s.dmg += 3; }, ability: { id: 'storm', name: 'Tropensturm', cd: 45, n: 40, dur: 4 } },
  ],
  pocke: [
    { name: 'Großes Barriereriff', cost: 9000, desc: 'Passiv: 80 Pierce pro Riff. FÄHIGKEIT: Sofort 16 Riesen-Riffe auf der ganzen Strecke in Reichweite.', apply: (s) => { s.pierce = 80; }, ability: { id: 'reef', name: 'Barriereriff', cd: 40, n: 16 } },
    { name: 'Pocken-Plage', cost: 10000, desc: 'Passiv: jede 2. Pocke ist eine Mine. FÄHIGKEIT: Alle Blasen werden befallen – 2 Schaden alle 0,5 s für 6 s.', apply: (s) => { s.mineEvery = 2; }, ability: { id: 'plague', name: 'Pocken-Plage', cd: 45, dur: 6 } },
  ],
  winker: [
    { name: 'Großer Balztanz', cost: 12000, desc: 'Passiv: +30 % Takt. FÄHIGKEIT: ALLE Türme auf der Karte 10 s lang doppelt so schnell.', apply: (s) => (s.buffSpeed = 0.3), ability: { id: 'globalBoost', name: 'Großer Balztanz', cd: 60, dur: 10 } },
    { name: 'Krabbenkaiser', cost: 11000, desc: 'Passiv: größeres Revier. FÄHIGKEIT: Alle Blasen der Karte 6 s lang stark verlangsamt.', apply: (s) => (s.range += 40), ability: { id: 'slowAll', name: 'Kaiserlicher Befehl', cd: 50, dur: 6, f: 0.3 } },
  ],
  yeti: [
    { name: 'Schwarzer Raucher', cost: 12000, desc: 'Passiv: Hitzepulse 6 Schaden. FÄHIGKEIT: 6 s Eruption – Pulse im Viertelsekundentakt.', apply: (s) => { s.heatDmg = 6; s.range += 15; }, ability: { id: 'erupt', name: 'Eruption', cd: 45, dur: 6 } },
    { name: 'Absoluter Nullpunkt', cost: 10000, desc: 'Passiv: Eiszeit-Radius größer. FÄHIGKEIT: Friert alle Blasen der Karte 4 s ein.', apply: (s) => { s.range += 25; }, ability: { id: 'freezeAll', name: 'Absoluter Nullpunkt', cd: 50, dur: 4 } },
  ],
  spinne: [
    { name: 'Beinwirbel', cost: 10000, desc: 'Passiv: 24 Treffer, +1 Schaden. FÄHIGKEIT: 8 s lang vierfaches Tempo.', apply: (s) => { s.hits = 24; s.dmg += 1; }, ability: { id: 'selfBoost', name: 'Beinwirbel', cd: 40, mul: 4, dur: 8 } },
    { name: 'Erdbeben', cost: 13000, desc: 'Passiv: stärkere Schockwellen. FÄHIGKEIT: Erdbeben – 25 Schaden an allen Blasen, alles wird betäubt.', apply: (s) => { if (s.titan) s.titan.dmg = 12; }, ability: { id: 'screenDmg', name: 'Erdbeben', cd: 50, dmg: 25, stun: 1.5, moabStun: 1, col: '#ffd59a' } },
  ],
  krill: [
    { name: 'Krill-Galaxie', cost: 12000, desc: 'Passiv: 16 Krill. FÄHIGKEIT: 30 zusätzliche Krill für 10 s.', apply: (s) => { s.count = 16; }, ability: { id: 'swarm', name: 'Krill-Galaxie', cd: 50, n: 30, dur: 10 } },
    { name: 'Walgesang', cost: 15000, desc: 'Passiv: Wal kommt alle 12 s. FÄHIGKEIT: Ein Riesenwal frisst die volle Strecke leer.', apply: (s) => { s.whaleCd = 12; }, ability: { id: 'whale', name: 'Walgesang', cd: 35, len: 520 } },
  ],
  farm: [
    { name: 'Garnelen-Konzern', cost: 10000, desc: 'Passiv: +500 pro Tick. FÄHIGKEIT: Großernte – sofort 2000.', apply: (s) => (s.income += 500), ability: { id: 'cash', name: 'Großernte', cd: 60, amount: 2000 } },
    { name: 'Perlen-Zentralbank', cost: 9000, desc: 'Passiv: Zins-Obergrenze 2000. FÄHIGKEIT: Auszahlung von 25 % deines Guthabens (max. 4000).', apply: (s) => (s.bankCap = 2000), ability: { id: 'bank', name: 'Auszahlung', cd: 60, pct: 0.25, max: 4000 } },
  ],
  post: [
    { name: 'Kraken-Käfig', cost: 11000, desc: 'Passiv: fängt auch Korallen, 4 auf einmal. FÄHIGKEIT: Fängt die stärkste Riesenblase (bis Blauwal) auf deinem Feld und schickt sie dem Gegner.', apply: (s) => { s.catchMax = 10; s.catchN = 4; s.rate *= 0.8; }, ability: { id: 'cage', name: 'Kraken-Käfig', cd: 55 } },
    { name: 'Postkönig', cost: 9500, desc: 'Passiv: verschickt schon nach 6 Blasen. FÄHIGKEIT: Paketbombe – schickt dem Gegner gratis einen Kugelfisch.', apply: (s) => { s.cap = 6; s.rate *= 0.85; }, ability: { id: 'mail', name: 'Paketbombe', cd: 45 } },
  ],
  tide: [
    { name: 'Sturmflut', cost: 12000, desc: 'Passiv: schiebt 100 Pixel. FÄHIGKEIT: Eine Sturmflut schiebt alle Blasen der Karte weit zurück und betäubt sie.', apply: (s) => { s.push = 100; s.moabPush = 60; }, ability: { id: 'surge', name: 'Sturmflut', cd: 50, push: 260, moabPush: 120 } },
    { name: 'Mondgezeiten', cost: 10000, desc: 'Passiv: Ebbe 35 %. FÄHIGKEIT: Springflut – alle Blasen 5 s lang im Strudel gefangen (stark verlangsamt, 2 Schaden alle 0,5 s).', apply: (s) => { s.ebb = 0.65; s.range += 20; }, ability: { id: 'moon', name: 'Springflut', cd: 50, dur: 5 } },
  ],
  molt: [
    { name: 'Uralter Hummer', cost: 11000, desc: 'Passiv: mindestens Level 6, +3 Schaden. FÄHIGKEIT: Panzerschlag – 60 Schaden an allem im großen Umkreis (×3 gegen Riesen).', apply: (s) => { s.dmg += 3; s.minLvl = 6; }, ability: { id: 'ancient', name: 'Panzerschlag', cd: 35, r: 190, dmg: 60 } },
    { name: 'Ewiger Hummer', cost: 9000, desc: 'Passiv: Lehrmeister-Bonus doppelt. FÄHIGKEIT: Große Häutung – sofort +2 Level und 8 s dreifaches Tempo.', apply: (s) => { s.teach2 = true; s.dmg += 1; }, ability: { id: 'bigmolt', name: 'Große Häutung', cd: 60, mul: 3, dur: 8 } },
  ],
  dice: [
    { name: 'Sechser-Pasch', cost: 10500, desc: 'Passiv: kritische Treffer ×6. FÄHIGKEIT: 8 s lang ist jeder Wurf eine 6 – und doppelt so schnell.', apply: (s) => { s.critMul = 6; s.dmg += 1; }, ability: { id: 'lucky', name: 'Sechser-Pasch', cd: 40, dur: 8 } },
    { name: 'Glücksgott', cost: 9500, desc: 'Passiv: schon eine 5 ist kritisch. FÄHIGKEIT: Großer Jackpot – drei Würfel: Augensumme ×50 Muscheln und ×2 Schaden an allen Blasen.', apply: (s) => { s.crit5 = true; }, ability: { id: 'jackpot', name: 'Großer Jackpot', cd: 60 } },
  ],
};
for (const k in SC.TIER4) SC.TOWERS[k].paths.forEach((p, i) => p.push(SC.TIER4[k][i]));
SC.MAX_TIER = 4;

SC.TOWER_ORDER = ['knall', 'fang', 'einsiedler', 'spinne', 'kokos', 'yeti', 'pocke', 'krill', 'winker', 'farm', 'post', 'tide', 'molt', 'dice'];
SC.NEW_TOWERS = { post: true, tide: true, molt: true, dice: true };
SC.TOWER_SHORT = {"knall": "Knallkrebs", "fang": "Fangschrecke", "einsiedler": "Einsiedler", "kokos": "Kokoskrabbe", "pocke": "Seepocken", "winker": "Winkerkrabbe", "yeti": "Yeti-Krabbe", "spinne": "Spinnenkrabbe", "krill": "Krillschwarm", "farm": "Garnelenfarm", "post": "Flaschenpost", "tide": "Gezeiten", "molt": "Häutung", "dice": "Würfelkrabbe"};
for (const k in SC.TOWERS) {
  SC.TOWERS[k].id = k;
  SC.TOWERS[k].short = SC.TOWER_SHORT[k];
}
SC.TOWER_RADIUS = 19;
SC.TOWERS.farm.radius = 34; // Plantage braucht mehr Platz
SC.towerRadius = (kind) => SC.TOWERS[kind].radius || SC.TOWER_RADIUS;

// ============================================================
//  BLASEN SENDEN (Battle-Modus)
// ============================================================
SC.SENDS = [
  { id: 's1', type: 'red', count: 8, spacing: 0.18, cost: 25, eco: 1.0, round: 1 },
  { id: 's2', type: 'blue', count: 6, spacing: 0.2, cost: 25, eco: 1.0, round: 2 },
  { id: 's3', type: 'green', count: 5, spacing: 0.22, cost: 30, eco: 1.2, round: 4 },
  { id: 's4', type: 'yellow', count: 4, spacing: 0.25, cost: 35, eco: 1.4, round: 6 },
  { id: 's5', type: 'pink', count: 3, spacing: 0.3, cost: 40, eco: 1.5, round: 8 },
  { id: 's6', type: 'ink', count: 3, spacing: 0.35, cost: 60, eco: 2.0, round: 10 },
  { id: 's7', type: 'ice', count: 3, spacing: 0.35, cost: 60, eco: 2.0, round: 10 },
  { id: 's8', type: 'armor', count: 3, spacing: 0.45, cost: 85, eco: 2.2, round: 12 },
  { id: 's9', type: 'stripe', count: 3, spacing: 0.45, cost: 100, eco: 2.5, round: 14 },
  { id: 's10', type: 'rainbow', count: 2, spacing: 0.6, cost: 150, eco: 3.0, round: 16 },
  { id: 's11', type: 'coral', count: 2, spacing: 0.7, cost: 230, eco: 3.5, round: 18 },
  { id: 's12', type: 'puffer', count: 1, spacing: 1.5, cost: 1100, eco: 0, round: 22 },
  { id: 's13', type: 'whale', count: 1, spacing: 3, cost: 3800, eco: -10, round: 30 },
  { id: 's14', type: 'kraken', count: 1, spacing: 5, cost: 11000, eco: -40, round: 38 },
];
SC.SEND_QUEUE_MAX = 6;
SC.SEND_MOD = { camo: { mul: 1.5, round: 12, name: 'Glas' }, regrow: { mul: 1.25, round: 10, name: 'Nachwachs' } };
SC.POST_QUEUE_MAX = 10; // Flaschenpost darf die Röhre etwas überfüllen

// ============================================================
//  KRÄFTE (wie die Battle-Powers in BTD Battles)
//  Vor jeder Partie wählst du 3 aus. Im Spiel kosten sie Muscheln
//  und haben eine Abklingzeit. target: 'map' = auf die Karte tippen,
//  'opp' = wirkt auf das Feld des Gegners.
// ============================================================
SC.POWERS = [
  { id: 'spikes', name: 'Seeigel-Teppich', desc: 'Legt einen Seeigel-Teppich auf die Strecke: 60 Treffer.', cost: 120, cd: 20, round: 1, target: 'map', col: '#7a4bd6' },
  { id: 'bomb', name: 'Tiefseebombe', desc: 'Explosion an einer Stelle: 20 Schaden, 120 Treffer, ×3 gegen Riesenblasen.', cost: 260, cd: 30, round: 3, target: 'map', col: '#3a3f4a' },
  { id: 'cash', name: 'Muschelregen', desc: 'Sofort 150 Muscheln plus 15 pro Runde.', cost: 0, cd: 80, round: 4, col: '#ffd23f' },
  { id: 'freeze', name: 'Kältewelle', desc: 'Friert alle normalen Blasen 3 s ein, Riesen werden langsamer.', cost: 300, cd: 45, round: 6, col: '#8fe3ff' },
  { id: 'rage', name: 'Krebs-Wut', desc: 'Alle deine Türme feuern 8 s lang 50 % schneller.', cost: 400, cd: 50, round: 8, col: '#ff5a36' },
  { id: 'shield', name: 'Muschelschild', desc: '8 s lang blockt ein Schild durchkommende Blasen (bis 40 Leben).', cost: 400, cd: 70, round: 8, col: '#58c4ff' },
  { id: 'radar', name: 'Leuchtqualle', desc: 'Alle Türme sehen 15 s lang Glas-Blasen.', cost: 200, cd: 40, round: 10, col: '#b6ff6a' },
  { id: 'heal', name: 'Korallen-Heilung', desc: '+20 Leben (bis zum Maximum).', cost: 600, cd: 90, round: 10, col: '#ff6fb5' },
  { id: 'boost', name: 'Blasen-Schub', desc: 'Die Blasen deines Gegners sind 6 s lang 40 % schneller.', cost: 500, cd: 45, round: 12, target: 'opp', dur: 6, col: '#ff9a2e' },
  { id: 'fog', name: 'Tintennebel', desc: 'Die Türme deines Gegners haben 6 s lang 30 % weniger Reichweite.', cost: 500, cd: 45, round: 14, target: 'opp', dur: 6, col: '#2b2440' },
];
SC.POWER_BY_ID = {};
for (const p of SC.POWERS) SC.POWER_BY_ID[p.id] = p;

// ============================================================
//  AUSRÜSTUNG: 3 Türme frei wählbar + 1 Würfel-Turm (2x neu würfeln)
//  und 3 Kräfte. Gilt für alle Battles (KI, Server, Direkt-Duell).
// ============================================================
SC.LOADOUT = { towers: 3, powers: 3, rerolls: 2 };
SC.DEFAULT_LOADOUT = { towers: ['knall', 'fang', 'einsiedler'], powers: ['spikes', 'bomb', 'freeze'] };
// Prüft und normalisiert eine Ausrüstung (null = ungültig)
SC.checkLoadout = function (l) {
  if (!l || typeof l !== 'object' || !Array.isArray(l.towers) || !Array.isArray(l.powers)) return null;
  const towers = l.towers.filter((k) => typeof k === 'string' && Object.prototype.hasOwnProperty.call(SC.TOWERS, k));
  const powers = l.powers.filter((k) => typeof k === 'string' && Object.prototype.hasOwnProperty.call(SC.POWER_BY_ID, k));
  if (towers.length !== SC.LOADOUT.towers || new Set(towers).size !== towers.length) return null;
  if (powers.length !== SC.LOADOUT.powers || new Set(powers).size !== powers.length) return null;
  return { towers: towers.slice(), powers: powers.slice() };
};
// Würfel: zufälliger 4. Turm, der nicht schon gewählt ist
SC.dicePool = (towers) => SC.TOWER_ORDER.filter((k) => towers.indexOf(k) < 0);
SC.rollDice = function (towers, rnd, not) {
  let pool = SC.dicePool(towers);
  if (not && pool.length > 1) pool = pool.filter((k) => k !== not);
  return pool[Math.floor((rnd || Math.random)() * pool.length)];
};

// Wer kann Glas sehen / Panzer knacken? [Pfad, Stufe] – Stufe 0 = von Anfang an
SC.CAPS = {
  knall: { armor: [1, 1] },
  fang: { armor: [0, 0], camo: [1, 2] },
  einsiedler: { armor: [1, 1] },
  spinne: { armor: [1, 1], camo: [1, 2] },
  kokos: { armor: [0, 0] },
  yeti: { armor: [0, 2], camo: [0, 0] },
  pocke: { armor: [0, 2], camo: [0, 0] },
  krill: { camo: [0, 2] },
  winker: { armor: [1, 2], camo: [1, 1] },
  farm: {},
  post: { armor: [0, 2], camo: [0, 3] },
  tide: { armor: [0, 2], camo: [1, 2] },
  molt: { armor: [0, 0] },
  dice: { armor: [0, 0], camo: [1, 2] },
};

// Häutungs-Hummer: benötigte Erfahrung für Level 1..10
SC.MOLT_XP = [0, 18, 50, 110, 200, 330, 500, 720, 1000, 1350];
SC.moltLevel = function (xp) {
  let l = 1;
  while (l < SC.MOLT_XP.length && xp >= SC.MOLT_XP[l]) l++;
  return l;
};

// ============================================================
//  KARTEN
// ============================================================
SC.MAPS = [
  {
    id: 'bucht',
    name: 'Gezeitenwiese',
    desc: 'Lange, gemütliche Strecke über die Strandwiese. Ideal zum Einstieg.',
    theme: 'grass',
    pools: 3,
    pts: [[-40, 95], [150, 95], [235, 120], [262, 205], [215, 290], [140, 340], [125, 430], [190, 505], [320, 512], [410, 455], [430, 340], [415, 220], [455, 125], [575, 88], [690, 115], [722, 215], [655, 300], [630, 400], [690, 492], [815, 505], [895, 430], [880, 310], [915, 200], [1040, 185]],
  },
  {
    id: 'riff',
    name: 'Muschelstrand',
    desc: 'Die Strecke windet sich spiralförmig in den Strudel in der Mitte.',
    theme: 'sand',
    pools: 4,
    pts: [[-40, 300], [110, 300], [200, 200], [330, 115], [500, 85], [680, 115], [805, 215], [850, 330], [800, 450], [665, 525], [500, 540], [335, 500], [245, 410], [265, 310], [360, 240], [500, 220], [630, 255], [680, 340], [620, 410], [510, 425], [440, 370], [460, 312], [512, 300]],
  },
  {
    id: 'wrack',
    name: 'Wrackküste',
    desc: 'Kurz und kantig, vorbei am alten Schiffswrack. Für Profis.',
    theme: 'coast',
    pools: 2,
    pts: [[100, -40], [100, 160], [130, 230], [250, 250], [380, 230], [420, 160], [420, 90], [560, 70], [640, 140], [620, 300], [520, 380], [520, 470], [640, 520], [780, 470], [820, 330], [900, 250], [1040, 250]],
  },
];

// ============================================================
//  WELLEN (deterministisch, gleich für beide Spieler)
// ============================================================
SC.UNLOCK = { red: 1, blue: 2, green: 4, yellow: 7, pink: 10, ink: 12, ice: 14, armor: 17, stripe: 19, rainbow: 21, coral: 24 };

SC.genRound = function (r) {
  const hand = {
    1: [{ type: 'red', count: 18, spacing: 0.75 }],
    2: [{ type: 'red', count: 28, spacing: 0.55 }],
    3: [{ type: 'red', count: 16, spacing: 0.6 }, { type: 'blue', count: 6, spacing: 0.8 }],
    4: [{ type: 'blue', count: 14, spacing: 0.55 }, { type: 'red', count: 12, spacing: 0.4 }],
    5: [{ type: 'blue', count: 18, spacing: 0.4 }, { type: 'green', count: 4, spacing: 0.9 }],
    6: [{ type: 'green', count: 12, spacing: 0.6 }, { type: 'blue', count: 15, spacing: 0.35 }],
  };
  let groups = hand[r];
  if (!groups) {
    groups = [];
    const rnd = SC.rng(r * 7919 + 13);
    let budget = Math.round(18 + 9 * r + 1.25 * r * r);
    const avail = Object.keys(SC.UNLOCK).filter((t) => SC.UNLOCK[t] <= r);
    // Riesen-Blasen an Meilensteinen
    if (r >= 30 && r % 5 === 0) {
      const n = Math.min(6, 1 + Math.floor((r - 30) / 10));
      groups.push({ type: 'puffer', count: n, spacing: 2.2 });
      budget *= 0.5;
    }
    if (r >= 40 && r % 10 === 0) groups.push({ type: 'whale', count: 1 + Math.floor((r - 40) / 20), spacing: 5 });
    if (r >= 55 && r % 10 === 5) groups.push({ type: 'kraken', count: 1, spacing: 8 });
    const ng = 1 + Math.floor(rnd() * 2) + (r > 10 ? 1 : 0);
    for (let i = 0; i < ng; i++) {
      const top = Math.min(4, avail.length);
      const idx = avail.length - 1 - Math.floor(rnd() * rnd() * top);
      const type = avail[idx];
      const d = SC.BLOONS[type];
      const share = budget / ng;
      let count = Math.max(1, Math.round(share / d.rbe));
      count = Math.min(count, 60);
      let spacing = SC.clamp(0.85 - r * 0.012, 0.16, 0.85) * (d.rbe > 20 ? 1.5 : 1);
      const g = { type, count, spacing };
      if (r >= 12 && rnd() < 0.2) g.regrow = true;
      if (r >= 16 && rnd() < 0.18) g.camo = true;
      groups.push(g);
    }
  }
  // Zeitplan berechnen
  let t = 0;
  let end = 0;
  const spawns = [];
  for (const g of groups) {
    for (let i = 0; i < g.count; i++) spawns.push({ at: t + i * g.spacing, type: g.type, camo: !!g.camo, regrow: !!g.regrow });
    const dur = g.count * g.spacing;
    end = Math.max(end, t + dur);
    t += dur * 0.55;
  }
  spawns.sort((a, b) => a.at - b.at);
  return { r, groups, spawns, duration: end };
};

SC._roundCache = {};
SC.getRound = (r) => SC._roundCache[r] || (SC._roundCache[r] = SC.genRound(r));
