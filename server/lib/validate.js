'use strict';
// Strenge Prüfung aller Nachrichten der Clients. Alles Unbekannte wird verworfen,
// es werden nur bekannte Felder in neue Objekte kopiert.
const own = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
const isInt = (v, a, b) => Number.isInteger(v) && v >= a && v <= b;
const isNum = (v, a, b) => typeof v === 'number' && Number.isFinite(v) && v >= a && v <= b;

function makeValidators(SC) {
  const SEND_IDS = new Set(SC.SENDS.map((s) => s.id));
  const TARGETS = new Set(SC.TARGETS);

  function cmd(c) {
    if (!c || typeof c !== 'object' || typeof c.c !== 'string') return null;
    switch (c.c) {
      case 'place':
        if (typeof c.k !== 'string' || !own(SC.TOWERS, c.k) || !isNum(c.x, 0, SC.W) || !isNum(c.y, 0, SC.H) || !isInt(c.id, 1, 100000)) return null;
        return { c: 'place', k: c.k, x: c.x, y: c.y, id: c.id };
      case 'up':
        if (!isInt(c.id, 1, 100000) || !isInt(c.p, 0, 1)) return null;
        return { c: 'up', id: c.id, p: c.p };
      case 'sell':
      case 'ab':
        if (!isInt(c.id, 1, 100000)) return null;
        return { c: c.c, id: c.id };
      case 'tgt':
        if (!isInt(c.id, 1, 100000) || typeof c.m !== 'string' || !TARGETS.has(c.m)) return null;
        return { c: 'tgt', id: c.id, m: c.m };
      case 'crate':
        if (!isInt(c.id, 1, 10000000)) return null;
        return { c: 'crate', id: c.id };
      case 'send':
        if (typeof c.s !== 'string' || !SEND_IDS.has(c.s)) return null;
        return { c: 'send', s: c.s, camo: c.camo === true, regrow: c.regrow === true };
      case 'pow': {
        if (!isInt(c.i, 0, SC.LOADOUT.powers - 1)) return null;
        const o = { c: 'pow', i: c.i };
        if (c.x !== undefined || c.y !== undefined) {
          if (!isNum(c.x, 0, SC.W) || !isNum(c.y, 0, SC.H)) return null;
          o.x = c.x;
          o.y = c.y;
        }
        return o;
      }
    }
    return null;
  }

  function loadout(l) {
    return SC.checkLoadout(l);
  }

  return { cmd, loadout, isInt, isNum };
}

module.exports = { makeValidators, isInt, isNum, own };
