'use strict';
// Ende-zu-Ende-Test: Server starten, zwei Konten anlegen, Schnellsuche,
// Vorrunde mit Würfel, Befehle, Aufgabe, Wertung prüfen. Plus Sicherheits-Checks.
// Start: node server/test/e2e.js
const assert = require('node:assert');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const WebSocket = require('ws');

const PORT = 18000 + Math.floor(Math.random() * 1000);
const BASE = 'http://127.0.0.1:' + PORT;
const ORIGIN = BASE;
const dbDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sc-e2e-'));
const VERSION = require('../lib/sim').loadSim().VERSION;

const srv = spawn(process.execPath, [path.join(__dirname, '..', 'server.js')], {
  env: Object.assign({}, process.env, { PORT: String(PORT), HOST: '127.0.0.1', DB_PATH: path.join(dbDir, 't.db'), PRE_MATCH_MS: '20000' }),
  stdio: ['ignore', 'pipe', 'pipe'],
});
let log = '';
srv.stdout.on('data', (d) => (log += d));
srv.stderr.on('data', (d) => (log += d));

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function req(method, p, body, cookie, origin = ORIGIN) {
  const headers = {};
  if (body) headers['Content-Type'] = 'application/json';
  if (cookie) headers.Cookie = cookie;
  if (origin) headers.Origin = origin;
  const r = await fetch(BASE + p, { method, headers, body: body ? JSON.stringify(body) : undefined });
  const setCookie = r.headers.get('set-cookie');
  let j = null;
  try {
    j = await r.json();
  } catch (e) {}
  return { status: r.status, j, cookie: setCookie ? setCookie.split(';')[0] : null, headers: r.headers };
}
function bot(cookie) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket('ws://127.0.0.1:' + PORT + '/ws', { headers: { Origin: ORIGIN, Cookie: cookie || '' } });
    const b = { ws, msgs: [], waiters: [] };
    b.send = (o) => ws.send(JSON.stringify(o));
    b.wait = (t, ms = 8000) =>
      new Promise((res, rej) => {
        const i = b.msgs.findIndex((m) => m.t === t);
        if (i >= 0) return res(b.msgs.splice(i, 1)[0]);
        const to = setTimeout(() => rej(new Error('Timeout beim Warten auf ' + t)), ms);
        b.waiters.push({ t, res: (m) => (clearTimeout(to), res(m)) });
      });
    ws.on('message', (d) => {
      const m = JSON.parse(d.toString());
      const w = b.waiters.findIndex((x) => x.t === m.t);
      if (w >= 0) b.waiters.splice(w, 1)[0].res(m);
      else b.msgs.push(m);
    });
    ws.on('open', () => resolve(b));
    ws.on('error', reject);
  });
}

(async () => {
  for (let i = 0; i < 50; i++) {
    try {
      const r = await req('GET', '/api/health');
      if (r.status === 200) break;
    } catch (e) {}
    await sleep(100);
  }
  // --- Sicherheit: Header, statische Dateien, CSRF ---
  const h = await req('GET', '/api/health');
  assert.strictEqual(h.j.game, 'scherenschlacht');
  assert.ok(h.headers.get('content-security-policy'), 'CSP fehlt');
  assert.strictEqual(h.headers.get('x-content-type-options'), 'nosniff');
  for (const p of ['/server/server.js', '/server/data/t.db', '/.git/config', '/js/../server/lib/db.js', '/%2e%2e/server/server.js', '/README.md']) {
    const r = await fetch(BASE + p);
    assert.strictEqual(r.status, 404, p + ' darf nicht ausgeliefert werden');
  }
  assert.strictEqual((await fetch(BASE + '/')).status, 200);
  assert.strictEqual((await fetch(BASE + '/js/field.js')).status, 200);
  const csrf = await req('POST', '/api/register', { name: 'Boese', password: 'passwort123' }, null, 'https://evil.example');
  assert.strictEqual(csrf.status, 403, 'fremde Herkunft muss abgelehnt werden');
  const badName = await req('POST', '/api/register', { name: '<script>', password: 'passwort123' });
  assert.strictEqual(badName.status, 400);

  // --- Konten ---
  const a = await req('POST', '/api/register', { name: 'Krabbe_A', password: 'geheim-123' });
  assert.strictEqual(a.status, 200, JSON.stringify(a.j));
  const dup = await req('POST', '/api/register', { name: 'krabbe_a', password: 'geheim-123' });
  assert.strictEqual(dup.status, 409, 'Name doppelt (ohne Groß/Klein)');
  const b = await req('POST', '/api/register', { name: 'Hummer_B', password: 'geheim-456' });
  const wrong = await req('POST', '/api/login', { name: 'Krabbe_A', password: 'falsch!!!' });
  assert.strictEqual(wrong.status, 401);
  const login = await req('POST', '/api/login', { name: 'Krabbe_A', password: 'geheim-123' });
  assert.strictEqual(login.status, 200);
  assert.ok(/HttpOnly/i.test(login.headers.get('set-cookie')) && /SameSite=Strict/i.test(login.headers.get('set-cookie')));
  const me = await req('GET', '/api/me', null, login.cookie);
  assert.strictEqual(me.j.user.name, 'Krabbe_A');

  // WebSocket ohne passende Herkunft wird abgelehnt
  await assert.rejects(
    () =>
      new Promise((res, rej) => {
        const ws = new WebSocket('ws://127.0.0.1:' + PORT + '/ws', { headers: { Origin: 'https://evil.example' } });
        ws.on('open', res);
        ws.on('error', rej);
      })
  );

  // --- Schnellsuche & Vorrunde ---
  const A = await bot(login.cookie), B = await bot(b.cookie);
  A.send({ t: 'hello', ver: VERSION });
  B.send({ t: 'hello', ver: VERSION });
  assert.strictEqual((await A.wait('welcome')).name, 'Krabbe_A');
  await B.wait('welcome');
  const loA = { towers: ['dice', 'molt', 'tide'], powers: ['spikes', 'bomb', 'cash'] };
  const loB = { towers: ['knall', 'fang', 'farm'], powers: ['freeze', 'boost', 'fog'] };
  A.send({ t: 'queue', loadout: { towers: ['dice', 'dice', 'molt'], powers: ['spikes', 'bomb', 'cash'] } });
  assert.ok(/Ausrüstung/.test((await A.wait('err')).msg), 'doppelter Turm muss abgelehnt werden');
  A.send({ t: 'queue', loadout: loA, map: 'bucht' });
  B.send({ t: 'queue', loadout: loB });
  let preA = await A.wait('pre');
  const preB = await B.wait('pre');
  assert.strictEqual(preA.ranked, true);
  assert.strictEqual(preA.opp.name, 'Hummer_B');
  assert.ok(loA.towers.indexOf(preA.me.dice) < 0, 'Würfel darf keinen gewählten Turm geben');
  // zweimal neu würfeln, drittes Mal geht nicht
  for (let i = 0; i < 3; i++) {
    A.send({ t: 'pre.reroll' });
    preA = await A.wait('pre');
    if (i < 2) await B.wait('pre');
  }
  assert.strictEqual(preA.me.rerolls, 0);
  const dice = preA.me.dice;
  A.send({ t: 'pre.ready' });
  await A.wait('pre');
  await B.wait('pre');
  B.send({ t: 'pre.ready' });
  const stA = await A.wait('start');
  const stB = await B.wait('start');
  assert.deepStrictEqual(stA.loadout.towers, loA.towers.concat([dice]));
  assert.strictEqual(stA.side + stB.side, 1);
  assert.strictEqual(stA.seed, stB.seed);

  // --- Spiel: warten bis die Simulation läuft, Befehle schicken ---
  await sleep(Math.max(0, stA.startAt - stA.now) + 800);
  const tick = () => Math.floor((Date.now() - stA.startAt) / (1000 / 60));
  A.send({ t: 'cmd', q: 1, k: tick(), c: { c: 'place', k: 'dice', x: 300, y: 40, id: 1 } });
  A.send({ t: 'cmd', q: 2, k: tick(), c: { c: 'place', k: 'knall', x: 500, y: 40, id: 2 } }); // nicht in der Ausrüstung
  A.send({ t: 'cmd', q: 3, k: tick(), c: { c: 'place', k: 'dice', x: 1e9, y: 40, id: 3 } }); // ungültig
  A.send({ t: 'cmd', q: 4, k: tick(), c: { c: 'up', id: 1, p: 0, evil: '__proto__' } });
  B.send({ t: 'cmd', q: 1, k: tick(), c: { c: 'send', s: 's1' } });
  const rej = [await A.wait('rej'), await A.wait('rej')].map((m) => m.q).sort();
  assert.deepStrictEqual(rej, [2, 3]);
  let st;
  for (let i = 0; i < 10; i++) {
    st = await A.wait('st');
    if (st.ack >= 4) break;
  }
  assert.strictEqual(st.T.length, 1, 'genau ein Turm gebaut');
  assert.strictEqual(st.T[0][4], 1, 'Upgrade angekommen');
  assert.strictEqual(Math.round(st.m), 650 - 380 - 220, 'Geld vom Server berechnet');
  const inc = await A.wait('inc');
  assert.strictEqual(inc.atk.id, 's1');
  await B.wait('s');
  const snaps = B.msgs.filter((m) => m.t === 's');
  const snap = snaps[snaps.length - 1];
  assert.ok(Array.isArray(snap.T) && snap.T.length === 7, 'Gegner-Snapshot enthält den Turm');
  // Resync
  A.send({ t: 'resync' });
  const rs = await A.wait('rs');
  assert.ok(rs.f && rs.f.towers.length === 1);

  // --- Aufgabe & Wertung ---
  B.send({ t: 'quit' });
  const endA = await A.wait('end');
  const endB = await B.wait('end');
  assert.strictEqual(endA.win, true);
  assert.strictEqual(endB.win, false);
  assert.strictEqual(endA.reason, 'surrender');
  assert.ok(endA.delta > 0 && endB.delta < 0);
  const lb = await req('GET', '/api/leaderboard');
  assert.strictEqual(lb.j.list[0].name, 'Krabbe_A');
  const hist = await req('GET', '/api/history', null, login.cookie);
  assert.strictEqual(hist.j.list.length, 1);
  assert.strictEqual(hist.j.list[0].win, true);

  // --- Flut-Schutz: zu viele Nachrichten trennen die Verbindung ---
  const C = await bot(null);
  const closed = new Promise((r) => C.ws.on('close', (code) => r(code)));
  for (let i = 0; i < 400; i++) C.send({ t: 'ping', c: 1 });
  assert.strictEqual(await closed, 1008);

  A.ws.close();
  B.ws.close();
  console.log('OK – Ende-zu-Ende-Test bestanden (Konten, Sicherheit, Matchmaking, Würfel, Simulation, Wertung).');
})()
  .catch((e) => {
    console.error('FEHLER:', e && e.stack);
    console.error('--- Server-Log ---\n' + log);
    process.exitCode = 1;
  })
  .finally(() => {
    srv.kill();
    setTimeout(() => fs.rmSync(dbDir, { recursive: true, force: true }), 300);
  });
