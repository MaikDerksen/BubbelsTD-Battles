'use strict';
// Lädt die Spiel-Simulation aus ../js (dieselben Dateien wie im Browser)
// in einen eigenen VM-Kontext. So rechnen Server und Client mit identischem Code.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.resolve(__dirname, '..', '..');
const FILES = ['js/util.js', 'js/data.js', 'js/path.js', 'js/field.js', 'js/ghost.js', 'js/game.js'];

function loadSim() {
  const sandbox = { console, Math, Date };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  const ctx = vm.createContext(sandbox, { name: 'scherenschlacht-sim', codeGeneration: { strings: false, wasm: false } });
  for (const f of FILES) {
    const code = fs.readFileSync(path.join(ROOT, f), 'utf8');
    vm.runInContext(code, ctx, { filename: f });
  }
  const SC = sandbox.SC;
  // Ohne Browser: kein Ton, keine Speicherung
  SC.audio = new Proxy({}, { get: () => () => {} });
  SC.store = { get: (k, d) => d, set() {} };
  return SC;
}

module.exports = { loadSim, ROOT };
