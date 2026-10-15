'use strict';
// ============================================================
//  Online-Lobby für den eigenen Spiel-Server:
//  Konto (Anmelden/Registrieren/Gast), Schnelles Spiel, private Räume,
//  Rangliste und Verlauf. Die Partie selbst läuft in ui.js (Modus 'server').
// ============================================================
SC.Online = {
  info: null,
  user: null,
  name: null,
  net: null,
  state: 'idle',

  init() {
    const $ = SC.$;
    $('#btn-quick').addEventListener('click', () => this.quick());
    $('#btn-room').addEventListener('click', () => this.createRoom());
    $('#btn-room-join').addEventListener('click', () => this.joinRoom());
    $('#btn-lb').addEventListener('click', () => this.leaderboard());
    $('#btn-hist').addEventListener('click', () => this.history());
    $('#acct').addEventListener('click', (e) => {
      const b = e.target.closest('[data-acct]');
      if (!b) return;
      SC.audio.click();
      const a = b.dataset.acct;
      if (a === 'login') this.login(false);
      else if (a === 'register') this.login(true);
      else if (a === 'logout') this.logout();
    });
    $('#acct').addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && e.target.id === 'acct-pw') this.login(false);
    });
    $('#srv-status').addEventListener('click', (e) => {
      if (e.target.closest('[data-reload]')) location.reload();
    });
    this.probing = this.probe();
  },
  async probe() {
    this.info = await SC.ServerNet.probe();
    if (this.info) {
      try {
        const r = await SC.ServerNet.api('GET', 'me');
        this.setUser(r.user);
      } catch (e) {}
    }
    this.render();
    return this.info;
  },
  setUser(u) {
    this.user = u || null;
    this.name = u ? u.name : SC.store.get('guestName', '') || null;
    // gespeicherte Ausrüstung vom Konto übernehmen
    if (u && u.loadout) {
      const lo = SC.checkLoadout(u.loadout);
      if (lo) {
        SC.Menu.loadout = lo;
        SC.store.set('loadout', lo);
      }
    }
  },
  async open() {
    await this.probing;
    this.render();
  },
  status(html) {
    SC.$('#srv-status').innerHTML = html;
  },

  render() {
    const $ = SC.$;
    const on = !!this.info;
    $('#srv-off').classList.toggle('hidden', on);
    $('#srv-on').classList.toggle('hidden', !on);
    if (!on) {
      $('#srv-off').innerHTML = 'Kein Spiel-Server erreichbar (z. B. GitHub-Pages-Version). Nutze das <b>Direkt-Duell</b> rechts – oder starte den Server aus dem Ordner <code>server/</code>.';
      $('#srv-badge').classList.add('hidden');
      return;
    }
    const badge = $('#srv-badge');
    badge.classList.remove('hidden');
    badge.innerHTML = SC.esc(this.info.name) + ' · ' + (this.info.online | 0) + ' online · ' + (this.info.matches | 0) + ' Partien';
    const acct = $('#acct');
    if (this.user) {
      const u = this.user;
      acct.innerHTML = '<div class="who">' + SC.ICON.user() + '<div><b>' + SC.esc(u.name) + '</b><small>Wertung ' + u.rating + ' · ' + u.wins + ' S / ' + u.losses + ' N</small></div></div><button class="btn grey small" data-acct="logout">Abmelden</button>';
    } else {
      acct.innerHTML =
        '<div class="login">' +
        '<input id="acct-name" maxlength="16" placeholder="Name" autocomplete="username" spellcheck="false" value="' + SC.esc(SC.store.get('lastName', '')) + '">' +
        '<input id="acct-pw" type="password" maxlength="128" placeholder="Passwort" autocomplete="current-password">' +
        '<button class="btn green small" data-acct="login">Anmelden</button>' +
        (this.info.registration ? '<button class="btn blue small" data-acct="register">Registrieren</button>' : '') +
        '</div><p class="hint">Ohne Konto spielst du als Gast (ohne Wertung). Mit Konto gibt es Rangliste &amp; Verlauf.</p>';
    }
    $('#btn-hist').classList.toggle('hidden', !this.user);
    this.renderState();
  },
  renderState() {
    const qb = SC.$('#btn-quick');
    qb.lastChild.textContent = this.state === 'queue' ? 'Suche abbrechen' : 'Schnelles Spiel';
    qb.classList.toggle('red', this.state === 'queue');
    qb.classList.toggle('green', this.state !== 'queue');
    const rb = SC.$('#btn-room');
    rb.textContent = this.state === 'room' ? 'Raum schließen' : 'Raum erstellen';
  },

  async login(register) {
    const name = SC.$('#acct-name').value.trim();
    const password = SC.$('#acct-pw').value;
    if (!name || !password) return this.status('Bitte Name und Passwort eingeben.');
    this.status(register ? 'Registriere …' : 'Melde an …');
    try {
      const r = await SC.ServerNet.api('POST', register ? 'register' : 'login', { name, password });
      SC.store.set('lastName', name);
      this.setUser(r.user);
      if (register) this.saveLoadout(SC.Menu.loadout);
      this.closeNet(); // neu verbinden, damit der Server das Konto kennt
      this.status(register ? 'Konto angelegt – viel Spaß!' : 'Angemeldet.');
      this.render();
    } catch (e) {
      this.status('<span class="warn">' + SC.esc(e.message) + '</span>');
    }
  },
  async logout() {
    try {
      await SC.ServerNet.api('POST', 'logout', {});
    } catch (e) {}
    this.setUser(null);
    this.closeNet();
    this.status('Abgemeldet.');
    this.render();
  },
  saveLoadout(lo) {
    if (!this.user || !this.info) return;
    SC.ServerNet.api('PUT', 'loadout', lo).catch(() => {});
  },

  // ---------------- Verbindung für die Lobby ----------------
  async ensureNet() {
    if (this.net && this.net.open) return this.net;
    this.closeNet();
    const net = new SC.ServerNet();
    this.status('Verbinde mit dem Server …');
    await net.connect();
    this.net = net;
    const welcome = new Promise((res, rej) => {
      net.on('welcome', (m) => res(m));
      net.on('err', (m) => rej(new Error(m.msg)));
      setTimeout(() => rej(new Error('Server antwortet nicht')), 6000);
    });
    net.send({ t: 'hello', ver: SC.VERSION, name: this.user ? undefined : SC.store.get('guestName', undefined) });
    const w = await welcome;
    if (!this.user) this.name = w.name;
    this.bindLobby(net);
    return net;
  },
  bindLobby(net) {
    net.on('welcome', () => {});
    net.on('queued', (m) => {
      this.state = 'queue';
      this.renderState();
      this.status('Suche Gegner … <small>(' + (m.n | 0) + ' in der Warteschlange)</small>');
    });
    net.on('unqueued', () => {
      this.state = 'idle';
      this.renderState();
      this.status('');
    });
    net.on('room', (m) => {
      this.state = 'room';
      this.renderState();
      this.status('Raumcode: <span class="code">' + SC.esc(m.code) + '</span><br>Gib den Code deinem Gegner. Warte …');
    });
    net.on('pre', (m) => this.onPre(m));
    net.on('start', (m) => this.onStart(m));
    net.on('abort', () => this.backToLobby('Die Partie wurde abgebrochen.'));
    net.on('err', (m) => {
      if (m.code === 'version') return this.status('<span class="warn">' + SC.esc(m.msg) + '</span> <button class="btn small blue" data-reload="1">Neu laden</button>');
      if (SC.Menu.pre && SC.Menu.pre.mode === 'server') return this.backToLobby(m.msg);
      this.state = 'idle';
      this.renderState();
      this.status('<span class="warn">' + SC.esc(m.msg) + '</span>');
    });
    net.on('close', () => {
      if (this.net !== net) return;
      this.net = null;
      this.state = 'idle';
      if (SC.Menu.pre && SC.Menu.pre.mode === 'server') this.backToLobby('Verbindung zum Server getrennt.');
      else {
        this.renderState();
        this.status('Verbindung getrennt.');
      }
    });
  },
  closeNet() {
    if (this.net) this.net.close();
    this.net = null;
    this.state = 'idle';
  },
  leaveLobby() {
    if (this.state !== 'idle' && this.net) this.closeNet();
  },
  backToLobby(msg) {
    clearInterval(SC.Menu.preT);
    SC.Menu.pre = null;
    this.state = 'idle';
    SC.Menu.go('online');
    this.status(msg ? '<span class="warn">' + SC.esc(msg) + '</span>' : '');
  },

  // ---------------- Aktionen ----------------
  async quick() {
    SC.audio.init();
    try {
      if (this.state === 'queue') {
        this.net.send({ t: 'unqueue' });
        return;
      }
      const net = await this.ensureNet();
      net.send({ t: 'queue', loadout: SC.Menu.loadout, map: 'any' });
    } catch (e) {
      this.status('<span class="warn">' + SC.esc(e.message) + '</span>');
    }
  },
  async createRoom() {
    SC.audio.init();
    try {
      if (this.state === 'room') {
        this.net.send({ t: 'room.leave' });
        this.state = 'idle';
        this.renderState();
        this.status('');
        return;
      }
      const net = await this.ensureNet();
      net.send({ t: 'room.create', loadout: SC.Menu.loadout, map: SC.Menu.onlineMap });
    } catch (e) {
      this.status('<span class="warn">' + SC.esc(e.message) + '</span>');
    }
  },
  async joinRoom() {
    SC.audio.init();
    const code = SC.$('#room-code').value.trim().toUpperCase();
    if (!/^[A-Z0-9]{5}$/.test(code)) return this.status('Bitte den 5-stelligen Raumcode eingeben.');
    try {
      const net = await this.ensureNet();
      net.send({ t: 'room.join', code, loadout: SC.Menu.loadout });
      this.status('Betrete Raum …');
    } catch (e) {
      this.status('<span class="warn">' + SC.esc(e.message) + '</span>');
    }
  },

  // ---------------- Vorrunde & Start (Server entscheidet) ----------------
  onPre(m) {
    const net = this.net;
    if (!SC.Menu.pre || SC.Menu.pre.mode !== 'server') {
      this.state = 'pre';
      SC.Menu.openPre({
        mode: 'server', net, map: m.map, opp: m.opp,
        onStart: () => {},
        onBack: () => {
          net.send({ t: 'quit' });
          this.backToLobby('');
        },
      });
      SC.$('#pre-status').textContent = m.ranked ? 'Gewertete Partie' : 'Ungewertete Partie';
    }
    SC.Menu.preUpdate(m);
  },
  onStart(m) {
    const net = this.net;
    clearInterval(SC.Menu.preT);
    SC.Menu.pre = null;
    SC.Menu.stopBg();
    this.net = null; // gehört jetzt der Partie
    this.state = 'idle';
    net.startAt = m.startAt;
    if (!net.samples.length) net.offset = m.now - Date.now();
    SC.UI.start({ mode: 'server', map: m.map, seed: m.seed, side: m.side, loadout: m.loadout, net, name: this.name || 'Du', oppName: m.oppName, token: m.token });
  },

  // ---------------- Rangliste & Verlauf ----------------
  async leaderboard() {
    try {
      const r = await SC.ServerNet.api('GET', 'leaderboard');
      const rows = r.list.map((u, i) => '<tr><td>' + (i + 1) + '</td><td>' + SC.esc(u.name) + '</td><td>' + u.rating + '</td><td>' + u.wins + ' / ' + u.losses + '</td></tr>').join('');
      SC.modal('<h2>Rangliste</h2><div class="tbl"><table><tr><th>#</th><th>Name</th><th>Wertung</th><th>S / N</th></tr>' + (rows || '<tr><td colspan="4">Noch keine gewerteten Partien.</td></tr>') + '</table></div><div class="btns"><button class="btn blue" data-act="ok">OK</button></div>', {});
    } catch (e) {
      this.status('<span class="warn">' + SC.esc(e.message) + '</span>');
    }
  },
  async history() {
    try {
      const r = await SC.ServerNet.api('GET', 'history');
      const R = { lives: 'Leben', surrender: 'Aufgabe', disconnect: 'Abbruch', timeout: 'Zeit' };
      const rows = r.list.map((m) => '<tr class="' + (m.draw ? '' : m.win ? 'w' : 'l') + '"><td>' + new Date(m.created).toLocaleDateString('de-DE') + '</td><td>' + SC.esc(m.opp) + '</td><td>' + (m.draw ? 'Remis' : m.win ? 'Sieg' : 'Niederlage') + '</td><td>' + (R[m.reason] || '') + '</td><td>R' + m.rounds + '</td><td>' + (m.ranked ? (m.delta > 0 ? '+' : '') + m.delta : '–') + '</td></tr>').join('');
      SC.modal('<h2>Verlauf</h2><div class="tbl"><table>' + (rows || '<tr><td>Noch keine Partien.</td></tr>') + '</table></div><div class="btns"><button class="btn blue" data-act="ok">OK</button></div>', {});
    } catch (e) {
      this.status('<span class="warn">' + SC.esc(e.message) + '</span>');
    }
  },
};
