'use strict';
// Passwörter (scrypt mit Salz), Sitzungs-Token und Cookies
const crypto = require('node:crypto');
const { promisify } = require('node:util');

const scrypt = promisify(crypto.scrypt);
const N = 16384, R = 8, P = 1, KEYLEN = 64;

async function hashPassword(pw) {
  const salt = crypto.randomBytes(16);
  const key = await scrypt(pw.normalize('NFKC'), salt, KEYLEN, { N, r: R, p: P });
  return ['scrypt', N, R, P, salt.toString('base64'), key.toString('base64')].join('$');
}

async function verifyPassword(pw, stored) {
  const parts = String(stored || '').split('$');
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false;
  const [, n, r, p, salt, hash] = parts;
  const expected = Buffer.from(hash, 'base64');
  const key = await scrypt(pw.normalize('NFKC'), Buffer.from(salt, 'base64'), expected.length, { N: +n, r: +r, p: +p });
  return key.length === expected.length && crypto.timingSafeEqual(key, expected);
}

// Für unbekannte Namen trotzdem rechnen, damit die Antwortzeit nichts verrät
let dummyHash = null;
async function burnTime(pw) {
  if (!dummyHash) dummyHash = await hashPassword('dummy-password-for-timing');
  await verifyPassword(pw, dummyHash);
}

const newToken = () => crypto.randomBytes(32).toString('base64url');
const hashToken = (t) => crypto.createHash('sha256').update(String(t)).digest('hex');

function parseCookies(header) {
  const out = {};
  if (!header) return out;
  for (const part of String(header).split(';')) {
    const i = part.indexOf('=');
    if (i < 0) continue;
    const k = part.slice(0, i).trim();
    const v = part.slice(i + 1).trim();
    if (k && !(k in out)) {
      try {
        out[k] = decodeURIComponent(v);
      } catch (e) {}
    }
  }
  return out;
}

const COOKIE = 'sc_sid';
function sessionCookie(token, days, secure) {
  return COOKIE + '=' + token + '; Path=/; HttpOnly; SameSite=Strict; Max-Age=' + days * 86400 + (secure ? '; Secure' : '');
}
function clearCookie(secure) {
  return COOKIE + '=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0' + (secure ? '; Secure' : '');
}

// Namen: 3–16 Zeichen, Buchstaben (auch Umlaute), Ziffern, _ und -
const NAME_RE = /^[A-Za-z0-9ÄÖÜäöüß_-]{3,16}$/;
const validName = (n) => typeof n === 'string' && NAME_RE.test(n) && !/^gast/i.test(n);
const validPassword = (p) => typeof p === 'string' && p.length >= 8 && p.length <= 128;

module.exports = { hashPassword, verifyPassword, burnTime, newToken, hashToken, parseCookies, sessionCookie, clearCookie, COOKIE, validName, validPassword, NAME_RE };
