'use strict';
// SQLite-Datenbank (eingebaut in Node ≥ 22: node:sqlite) – keine nativen Pakete nötig.
// Alle Abfragen laufen über vorbereitete Statements (kein SQL-Injection-Risiko).
const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE COLLATE NOCASE,
  pass TEXT NOT NULL,
  rating INTEGER NOT NULL DEFAULT 1000,
  wins INTEGER NOT NULL DEFAULT 0,
  losses INTEGER NOT NULL DEFAULT 0,
  loadout TEXT,
  created INTEGER NOT NULL,
  last_login INTEGER
);
CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created INTEGER NOT NULL,
  expires INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS sessions_user ON sessions(user_id);
CREATE TABLE IF NOT EXISTS matches (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  p1 INTEGER REFERENCES users(id) ON DELETE SET NULL,
  p2 INTEGER REFERENCES users(id) ON DELETE SET NULL,
  n1 TEXT NOT NULL,
  n2 TEXT NOT NULL,
  winner INTEGER NOT NULL,
  reason TEXT NOT NULL,
  map TEXT NOT NULL,
  rounds INTEGER NOT NULL,
  duration INTEGER NOT NULL,
  ranked INTEGER NOT NULL,
  d1 INTEGER NOT NULL DEFAULT 0,
  d2 INTEGER NOT NULL DEFAULT 0,
  l1 TEXT,
  l2 TEXT,
  created INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS matches_p1 ON matches(p1, created);
CREATE INDEX IF NOT EXISTS matches_p2 ON matches(p2, created);
`;

class DB {
  constructor(file) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    this.db = new DatabaseSync(file);
    this.db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 3000; PRAGMA synchronous = NORMAL;');
    this.db.exec(SCHEMA);
    const q = (sql) => this.db.prepare(sql);
    this.st = {
      userByName: q('SELECT * FROM users WHERE name = ?'),
      userById: q('SELECT * FROM users WHERE id = ?'),
      insertUser: q('INSERT INTO users (name, pass, created) VALUES (?, ?, ?)'),
      touchUser: q('UPDATE users SET last_login = ? WHERE id = ?'),
      setLoadout: q('UPDATE users SET loadout = ? WHERE id = ?'),
      insertSession: q('INSERT INTO sessions (token_hash, user_id, created, expires) VALUES (?, ?, ?, ?)'),
      sessionUser: q('SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = ? AND s.expires > ?'),
      deleteSession: q('DELETE FROM sessions WHERE token_hash = ?'),
      pruneSessions: q('DELETE FROM sessions WHERE expires <= ?'),
      countSessions: q('SELECT COUNT(*) AS n FROM sessions WHERE user_id = ?'),
      oldestSessions: q('DELETE FROM sessions WHERE token_hash IN (SELECT token_hash FROM sessions WHERE user_id = ? ORDER BY created ASC LIMIT ?)'),
      insertMatch: q('INSERT INTO matches (p1, p2, n1, n2, winner, reason, map, rounds, duration, ranked, d1, d2, l1, l2, created) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'),
      addResult: q('UPDATE users SET rating = MAX(0, rating + ?), wins = wins + ?, losses = losses + ? WHERE id = ?'),
      leaderboard: q('SELECT name, rating, wins, losses FROM users WHERE wins + losses > 0 ORDER BY rating DESC, wins DESC LIMIT ?'),
      history: q('SELECT id, p1, p2, n1, n2, winner, reason, map, rounds, duration, ranked, d1, d2, created FROM matches WHERE p1 = ? OR p2 = ? ORDER BY created DESC LIMIT ?'),
      stats: q('SELECT (SELECT COUNT(*) FROM users) AS users, (SELECT COUNT(*) FROM matches) AS matches'),
    };
  }
  userByName(name) {
    return this.st.userByName.get(name) || null;
  }
  userById(id) {
    return this.st.userById.get(id) || null;
  }
  createUser(name, passHash) {
    const r = this.st.insertUser.run(name, passHash, Date.now());
    return this.userById(Number(r.lastInsertRowid));
  }
  touchUser(id) {
    this.st.touchUser.run(Date.now(), id);
  }
  saveLoadout(id, loadout) {
    this.st.setLoadout.run(JSON.stringify(loadout), id);
  }
  createSession(tokenHash, userId, days) {
    const now = Date.now();
    // höchstens 10 gleichzeitige Sitzungen pro Konto
    const n = this.st.countSessions.get(userId).n;
    if (n >= 10) this.st.oldestSessions.run(userId, n - 9);
    this.st.insertSession.run(tokenHash, userId, now, now + days * 86400000);
  }
  sessionUser(tokenHash) {
    return this.st.sessionUser.get(tokenHash, Date.now()) || null;
  }
  deleteSession(tokenHash) {
    this.st.deleteSession.run(tokenHash);
  }
  pruneSessions() {
    this.st.pruneSessions.run(Date.now());
  }
  // Ergebnis speichern; Wertung nur für gewertete Partien zweier Konten
  recordMatch(m) {
    this.db.exec('BEGIN');
    try {
      this.st.insertMatch.run(m.p1, m.p2, m.n1, m.n2, m.winner, m.reason, m.map, m.rounds, m.duration, m.ranked ? 1 : 0, m.d1, m.d2, m.l1, m.l2, Date.now());
      if (m.ranked && m.p1 && m.p2) {
        this.st.addResult.run(m.d1, m.winner === 0 ? 1 : 0, m.winner === 1 ? 1 : 0, m.p1);
        this.st.addResult.run(m.d2, m.winner === 1 ? 1 : 0, m.winner === 0 ? 1 : 0, m.p2);
      }
      this.db.exec('COMMIT');
    } catch (e) {
      this.db.exec('ROLLBACK');
      throw e;
    }
  }
  leaderboard(limit) {
    return this.st.leaderboard.all(limit);
  }
  history(userId, limit) {
    return this.st.history.all(userId, userId, limit);
  }
  stats() {
    return this.st.stats.get();
  }
  close() {
    this.db.close();
  }
}

module.exports = { DB };
