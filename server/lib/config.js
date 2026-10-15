'use strict';
// Einstellungen über Umgebungsvariablen (siehe server/.env.example)
const path = require('node:path');

const env = process.env;
// optional: --port 8080 auf der Kommandozeile
const argPort = (() => {
  const i = process.argv.indexOf('--port');
  return i > 0 ? process.argv[i + 1] : undefined;
})();
const int = (v, d) => {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : d;
};
const bool = (v, d) => (v == null || v === '' ? d : /^(1|true|yes|on)$/i.test(v));

const config = {
  port: int(argPort || env.PORT, 8080),
  host: env.HOST || '0.0.0.0',
  dbPath: path.resolve(env.DB_PATH || path.join(__dirname, '..', 'data', 'scherenschlacht.db')),
  // Läuft der Server hinter einem Reverse-Proxy (Caddy, nginx)? Dann X-Forwarded-For/-Proto auswerten.
  trustProxy: bool(env.TRUST_PROXY, false),
  // Öffentliche Adresse(n), z. B. https://spiel.example.com – erlaubte Origins für API & WebSocket.
  // Leer = nur dieselbe Adresse wie der Host-Header.
  origins: (env.PUBLIC_ORIGIN || '').split(',').map((s) => s.trim().replace(/\/+$/, '')).filter(Boolean),
  serverName: (env.SERVER_NAME || 'Scherenschlacht-Server').slice(0, 40),
  maxMatches: int(env.MAX_MATCHES, 150),
  maxClients: int(env.MAX_CLIENTS, 2000),
  maxConnPerIp: int(env.MAX_CONN_PER_IP, 6),
  // Simulationsvorlauf: der Server rechnet so viele Ticks hinter der Echtzeit,
  // damit Befehle der Clients pünktlich ankommen (15 Ticks = 250 ms)
  delayTicks: int(env.DELAY_TICKS, 15),
  reconnectGraceMs: int(env.RECONNECT_GRACE_MS, 30000),
  preMatchMs: int(env.PRE_MATCH_MS, 30000),
  maxMatchMs: int(env.MAX_MATCH_MS, 75 * 60 * 1000),
  sessionDays: int(env.SESSION_DAYS, 30),
  allowRegistration: bool(env.ALLOW_REGISTRATION, true),
  serveStatic: bool(env.SERVE_STATIC, true),
};

module.exports = config;
