'use strict';
// ============================================================
//  Scherenschlacht-Server
//  - liefert das Spiel aus (statische Dateien mit Sicherheits-Headern)
//  - Konten (scrypt), Sitzungen (HttpOnly-Cookie), Rangliste, Verlauf (SQLite)
//  - WebSocket: Schnellsuche, private Räume, verbindliche Partien
//  Start:  cd server && npm install && npm start
//  Hinter einem HTTPS-Reverse-Proxy betreiben (siehe README / deploy/).
// ============================================================
const http = require('node:http');
const { WebSocketServer } = require('ws');
const config = require('./lib/config');
const { loadSim } = require('./lib/sim');
const { DB } = require('./lib/db');
const auth = require('./lib/auth');
const { RateLimiter } = require('./lib/ratelimit');
const { securityHeaders, sendJson, readJson, serveStatic } = require('./lib/http');
const { makeValidators } = require('./lib/validate');
const { Hub } = require('./lib/hub');

const SC = loadSim();
const db = new DB(config.dbPath);
const v = makeValidators(SC);
const hub = new Hub(SC, config, db, v);

const authLimit = new RateLimiter(0.2, 6); // Login/Registrierung: 6 Versuche, dann 1 alle 5 s
const apiLimit = new RateLimiter(10, 40);
const connPerIp = new Map();

// ---------------- Hilfen ----------------
function clientIp(req) {
  if (config.trustProxy) {
    const xf = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
    if (xf) return xf.slice(0, 64);
  }
  return String(req.socket.remoteAddress || '?');
}
function isHttps(req) {
  if (config.trustProxy) return String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim() === 'https';
  return !!req.socket.encrypted;
}
// Erlaubte Herkunft: konfigurierte Adressen oder dieselbe wie der Host
function originOk(req) {
  const origin = req.headers.origin;
  if (!origin) return false;
  const o = String(origin).replace(/\/+$/, '');
  if (config.origins.length) return config.origins.includes(o);
  try {
    return new URL(o).host === req.headers.host;
  } catch (e) {
    return false;
  }
}
function sessionUser(req) {
  const tok = auth.parseCookies(req.headers.cookie)[auth.COOKIE];
  if (!tok || tok.length > 100) return null;
  return db.sessionUser(auth.hashToken(tok));
}
const publicUser = (u) => (u ? { name: u.name, rating: u.rating, wins: u.wins, losses: u.losses, loadout: safeLoadout(u.loadout) } : null);
function safeLoadout(s) {
  try {
    return SC.checkLoadout(JSON.parse(s));
  } catch (e) {
    return null;
  }
}
async function startSession(req, res, user) {
  const token = auth.newToken();
  db.createSession(auth.hashToken(token), user.id, config.sessionDays);
  db.touchUser(user.id);
  res.setHeader('Set-Cookie', auth.sessionCookie(token, config.sessionDays, isHttps(req)));
}

// ---------------- API ----------------
async function api(req, res, pathname) {
  const ip = clientIp(req);
  if (!apiLimit.take(ip)) return sendJson(res, 429, { error: 'Zu viele Anfragen' });
  const write = req.method !== 'GET' && req.method !== 'HEAD';
  // Schutz vor CSRF: schreibende Anfragen nur von der eigenen Seite (zusätzlich zu SameSite=Strict)
  if (write && !originOk(req)) return sendJson(res, 403, { error: 'Herkunft nicht erlaubt' });
  const route = req.method + ' ' + pathname;
  switch (route) {
    case 'GET /api/health':
      return sendJson(res, 200, Object.assign({ game: 'scherenschlacht', version: SC.VERSION, name: config.serverName, registration: config.allowRegistration }, hub.stats()));
    case 'GET /api/me':
      return sendJson(res, 200, { user: publicUser(sessionUser(req)) });
    case 'POST /api/register': {
      if (!config.allowRegistration) return sendJson(res, 403, { error: 'Registrierung ist deaktiviert' });
      if (!authLimit.take(ip)) return sendJson(res, 429, { error: 'Zu viele Versuche – bitte kurz warten' });
      const b = await readJson(req);
      if (!auth.validName(b.name)) return sendJson(res, 400, { error: 'Name: 3–16 Zeichen (Buchstaben, Ziffern, _ und -)' });
      if (!auth.validPassword(b.password)) return sendJson(res, 400, { error: 'Passwort: mindestens 8 Zeichen' });
      if (db.userByName(b.name)) return sendJson(res, 409, { error: 'Name ist schon vergeben' });
      let user;
      try {
        user = db.createUser(b.name, await auth.hashPassword(b.password));
      } catch (e) {
        return sendJson(res, 409, { error: 'Name ist schon vergeben' });
      }
      await startSession(req, res, user);
      hub.log('Neues Konto: ' + user.name);
      return sendJson(res, 200, { user: publicUser(user) });
    }
    case 'POST /api/login': {
      if (!authLimit.take(ip)) return sendJson(res, 429, { error: 'Zu viele Versuche – bitte kurz warten' });
      const b = await readJson(req);
      const name = typeof b.name === 'string' ? b.name.slice(0, 32) : '';
      const pw = typeof b.password === 'string' ? b.password.slice(0, 200) : '';
      const user = name ? db.userByName(name) : null;
      if (!user) {
        await auth.burnTime(pw);
        return sendJson(res, 401, { error: 'Name oder Passwort falsch' });
      }
      if (!(await auth.verifyPassword(pw, user.pass))) return sendJson(res, 401, { error: 'Name oder Passwort falsch' });
      await startSession(req, res, user);
      return sendJson(res, 200, { user: publicUser(user) });
    }
    case 'POST /api/logout': {
      const tok = auth.parseCookies(req.headers.cookie)[auth.COOKIE];
      if (tok) db.deleteSession(auth.hashToken(tok));
      res.setHeader('Set-Cookie', auth.clearCookie(isHttps(req)));
      return sendJson(res, 200, { ok: true });
    }
    case 'PUT /api/loadout': {
      const user = sessionUser(req);
      if (!user) return sendJson(res, 401, { error: 'Nicht angemeldet' });
      const lo = SC.checkLoadout(await readJson(req));
      if (!lo) return sendJson(res, 400, { error: 'Ungültige Ausrüstung' });
      db.saveLoadout(user.id, lo);
      return sendJson(res, 200, { ok: true });
    }
    case 'GET /api/leaderboard':
      return sendJson(res, 200, { list: db.leaderboard(50) });
    case 'GET /api/history': {
      const user = sessionUser(req);
      if (!user) return sendJson(res, 401, { error: 'Nicht angemeldet' });
      const list = db.history(user.id, 25).map((m) => {
        const side = m.p1 === user.id ? 0 : 1;
        return { opp: side === 0 ? m.n2 : m.n1, win: m.winner === side, draw: m.winner === -1, reason: m.reason, map: m.map, rounds: m.rounds, duration: m.duration, ranked: !!m.ranked, delta: side === 0 ? m.d1 : m.d2, created: m.created };
      });
      return sendJson(res, 200, { list });
    }
  }
  return sendJson(res, 404, { error: 'Unbekannt' });
}

// ---------------- HTTP-Server ----------------
const server = http.createServer(async (req, res) => {
  securityHeaders(res, isHttps(req));
  let pathname;
  try {
    pathname = new URL(req.url, 'http://x').pathname;
  } catch (e) {
    res.writeHead(400);
    return res.end();
  }
  if (pathname.startsWith('/api/')) {
    try {
      await api(req, res, pathname);
    } catch (e) {
      if (!res.headersSent) sendJson(res, e.status || 500, { error: e.status ? e.message : 'Serverfehler' });
      if (!e.status) hub.log('API-Fehler: ' + (e && e.stack));
    }
    return;
  }
  if (!config.serveStatic) {
    res.writeHead(404);
    return res.end();
  }
  serveStatic(req, res);
});
server.headersTimeout = 15000;
server.requestTimeout = 30000;
server.keepAliveTimeout = 10000;

// ---------------- WebSocket ----------------
const wss = new WebSocketServer({ noServer: true, maxPayload: 8 * 1024, perMessageDeflate: false });
server.on('upgrade', (req, socket, head) => {
  const reject = (code, msg) => {
    socket.write('HTTP/1.1 ' + code + ' ' + msg + '\r\nConnection: close\r\n\r\n');
    socket.destroy();
  };
  let pathname;
  try {
    pathname = new URL(req.url, 'http://x').pathname;
  } catch (e) {
    return reject(400, 'Bad Request');
  }
  if (pathname !== '/ws') return reject(404, 'Not Found');
  if (!originOk(req)) return reject(403, 'Forbidden');
  const ip = clientIp(req);
  const n = connPerIp.get(ip) || 0;
  if (n >= config.maxConnPerIp || hub.clients.size >= config.maxClients) return reject(429, 'Too Many Requests');
  const user = sessionUser(req);
  wss.handleUpgrade(req, socket, head, (ws) => {
    connPerIp.set(ip, n + 1);
    ws.on('close', () => {
      const k = (connPerIp.get(ip) || 1) - 1;
      if (k <= 0) connPerIp.delete(ip);
      else connPerIp.set(ip, k);
    });
    hub.connect(ws, ip, user);
  });
});
const hbT = setInterval(() => hub.heartbeat(), 20000);
const pruneT = setInterval(() => db.pruneSessions(), 3600000);

server.listen(config.port, config.host, () => {
  hub.log('Scherenschlacht-Server ' + SC.VERSION + ' läuft auf http://' + (config.host === '0.0.0.0' ? 'localhost' : config.host) + ':' + config.port + ' (Datenbank: ' + config.dbPath + ')');
  if (!config.origins.length) hub.log('Hinweis: PUBLIC_ORIGIN ist nicht gesetzt – erlaubt ist nur dieselbe Adresse wie der Host-Header.');
});

function shutdown() {
  hub.log('Server wird beendet …');
  clearInterval(hbT);
  clearInterval(pruneT);
  hub.shutdown();
  wss.close();
  server.close(() => {
    db.close();
    process.exit(0);
  });
  setTimeout(() => process.exit(0), 3000).unref();
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

module.exports = { server, hub };
