'use strict';
// Prüft, dass die Client-Simulation (Modus 'server') exakt so rechnet wie die
// Server-Simulation (Modus 'sim'), wenn sie dieselben Befehle zum selben Tick bekommt.
// Start: node server/test/determinism.js
const assert = require('node:assert');
const { loadSim } = require('../lib/sim');

const SC = loadSim();
const lo0 = { towers: ['dice', 'molt', 'tide', 'post'], powers: ['spikes', 'bomb', 'boost'] };
const lo1 = { towers: ['knall', 'kokos', 'farm', 'yeti'], powers: ['cash', 'freeze', 'fog'] };
const seed = 4242;

const sim = new SC.Game({ mode: 'sim', map: 'bucht', seed, loadouts: [lo0, lo1], names: ['A', 'B'] });
const fakeNet = { seq: 0, cmd() { this.seq++; }, send() {}, close() {} };
const cli = new SC.Game({ mode: 'server', map: 'bucht', seed, side: 0, loadout: lo0, net: fakeNet });

// Angriffe des Servers an Spieler 0 auch dem Client zustellen (wie per WebSocket)
sim.onAttack = (to, atk, at) => {
  if (to === sim.fields[0]) {
    cli.incoming(JSON.parse(JSON.stringify(atk)), at);
    if (cli2) cli2.incoming(JSON.parse(JSON.stringify(atk)), at);
  }
};

// Drehbuch: [Tick, Spieler, Befehl]
const P = SC.buildPath(sim.map);
const near = (d, off) => {
  const p = P.pos(d, { x: 0, y: 0, a: 0 });
  return { x: p.x + Math.cos(p.a + Math.PI / 2) * off, y: p.y + Math.sin(p.a + Math.PI / 2) * off };
};
const script = [];
const add = (k, who, c) => script.push({ k, who, c });
let pos = near(300, 48);
add(30, 0, { c: 'place', k: 'dice', x: pos.x, y: pos.y });
pos = near(520, -50);
add(200, 0, { c: 'place', k: 'molt', x: pos.x, y: pos.y });
pos = near(700, 52);
add(900, 0, { c: 'place', k: 'tide', x: pos.x, y: pos.y });
pos = near(950, -55);
add(1500, 0, { c: 'place', k: 'post', x: pos.x, y: pos.y });
add(1600, 0, { c: 'up', id: 1, p: 0 });
add(1700, 0, { c: 'up', id: 1, p: 0 });
add(2000, 0, { c: 'up', id: 2, p: 0 });
add(2400, 0, { c: 'up', id: 4, p: 1 });
add(2500, 0, { c: 'send', s: 's2' });
add(2600, 0, { c: 'pow', i: 0, x: near(400, 0).x, y: near(400, 0).y });
add(3200, 0, { c: 'up', id: 3, p: 0 });
add(3300, 0, { c: 'tgt', id: 1, m: 'strong' });
add(4000, 0, { c: 'pow', i: 1, x: near(600, 0).x, y: near(600, 0).y });
pos = near(260, -50);
add(100, 1, { c: 'place', k: 'knall', x: pos.x, y: pos.y });
for (let k = 600; k < 9000; k += 420) add(k, 1, { c: 'send', s: k > 3000 ? 's4' : 's1' });
add(3000, 1, { c: 'place', k: 'farm', x: 80, y: 560 });
add(5000, 1, { c: 'pow', i: 2 });
script.sort((a, b) => a.k - b.k);

let si = 0, checks = 0;
const ids = [1, 1];
let cli2 = null; // wird mitten im Spiel per Resync erzeugt
for (let tick = 0; tick < 60 * 160; tick++) {
  while (si < script.length && script[si].k === tick) {
    const { who, c } = script[si++];
    const cc = Object.assign({}, c);
    if (cc.c === 'place') cc.id = ids[who]++;
    const okS = sim.exec(sim.fields[who], JSON.parse(JSON.stringify(cc)));
    if (who === 0) {
      if (cli2) cli2.exec(cli2.me, JSON.parse(JSON.stringify(cc)));
      const okC = cli.exec(cli.me, JSON.parse(JSON.stringify(cc)));
      assert.strictEqual(okC, okS, 'Befehl ' + JSON.stringify(cc) + ' ok-Ergebnis weicht ab bei Tick ' + tick);
    }
  }
  if (tick === 4000) {
    cli2 = new SC.Game({ mode: 'server', map: 'bucht', seed, side: 0, loadout: lo0, net: fakeNet });
    cli2.applyResync(JSON.parse(JSON.stringify(sim.resyncFor(0))));
  }
  sim.update(SC.STEP);
  cli.update(SC.STEP);
  if (cli2) cli2.update(SC.STEP);
  if (sim.over) break;
  if (tick % 30 === 0) {
    checks++;
    const a = sim.fields[0], b = cli.me;
    const msg = 'Abweichung bei Tick ' + tick;
    assert.strictEqual(b.money, a.money, msg + ' (Geld)');
    assert.strictEqual(b.lives, a.lives, msg + ' (Leben)');
    assert.strictEqual(b.eco, a.eco, msg + ' (Eco)');
    assert.strictEqual(b.bloonSum(), a.bloonSum(), msg + ' (Blasen)');
    assert.strictEqual(b.rng.a, a.rng.a, msg + ' (Zufall)');
  }
}
const f0 = sim.fields[0], f1 = sim.fields[1];
console.log('OK – ' + checks + ' Prüfungen identisch. Runde ' + sim.round + ', Tick ' + sim.tick);
console.log('  Spieler A: Leben ' + f0.lives + ', Geld ' + Math.floor(f0.money) + ', Türme ' + f0.towers.map((t) => t.kind + t.tiers.join('')).join(' ') + ', Pops ' + f0.stats.pops);
console.log('  Spieler B: Leben ' + f1.lives + ', Geld ' + Math.floor(f1.money) + ', Türme ' + f1.towers.map((t) => t.kind + t.tiers.join('')).join(' '));

// Resync-Client (ab Tick 4000 aus serialisiertem Zustand) muss ebenfalls identisch sein
const a = sim.fields[0], b = cli2.me;
assert.strictEqual(b.money, a.money, 'Resync: Geld');
assert.strictEqual(b.lives, a.lives, 'Resync: Leben');
assert.strictEqual(b.bloonSum(), a.bloonSum(), 'Resync: Blasen');
console.log('OK – Resync aus serialisiertem Zustand rechnet identisch weiter.');
