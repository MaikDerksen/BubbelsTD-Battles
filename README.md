# 🦀 Scherenschlacht – Krusten-Battles

Ein 1-gegen-1-Tower-Defense im Look von *Bloons TD Battles*, in dem Krebse gegen Blasen kämpfen.
Das komplette Design steht in [MASTER_PROMPT.md](MASTER_PROMPT.md).

**Spielen:** https://maikderksen.github.io/BubbelsTD-Battles/

- **14 Krebs-Türme** mit je 2 Upgrade-Pfaden à 4 Stufen (wie BTD Battles: ein Pfad bis 4, der andere bis 2): Knallkrebs, Fangschreckenkrebs, Einsiedlerkrebs, Riesenspinnenkrabbe, Kokoskrabbe, Yeti-Krabbe, Seepocken-Kolonie, Krillschwarm, Winkerkrabbe (Support), Garnelenfarm (Wirtschaft) – und **4 neue Türme mit Mechaniken, die es in Bloons nicht gibt**:
  - **Flaschenpost-Krabbe** fängt Blasen mit dem Netz und schickt sie per Flaschenpost aufs Feld des Gegners (Stufe 4: Kraken-Käfig fängt sogar Riesenblasen).
  - **Gezeiten-Hummer** schiebt Blasen mit einer Gegenströmung zurück (jede Blase nur ein paar Mal), Stufe 4: Sturmflut.
  - **Häutungs-Hummer** sammelt Erfahrung und häutet sich bis Level 10 – er wird im Laufe der Partie immer stärker und größer.
  - **Würfelkrabbe** wirft Würfel: 1 = Niete, 6 = kritischer Treffer; Upgrades zinken die Würfel, Jackpot bringt Muscheln.
- **Ausrüstung wie in BTD Battles:** Vor jeder Partie wählst du **3 Türme**, der **4. kommt vom Würfel** (2x neu würfeln). Dazu **3 Kräfte** aus 10 (Seeigel-Teppich, Tiefseebombe, Kältewelle, Krebs-Wut, Muschelschild, Leuchtqualle, Korallen-Heilung, Muschelregen und die Angriffs-Kräfte Blasen-Schub und Tintennebel). In der **Vorrunde** kannst du alles noch ändern.
- **Sende-Röhren:** Zwischen den Feldern siehst du, welche Blasen du geschickt hast und welche zu dir kommen, wie voll die Röhre ist (max. 6) und wie weit der aktuelle Send schon ausgeströmt ist.
- **24 Spezialfähigkeiten** (Stufe 4), **14 Blasentypen** inkl. Glas (Camo) und Nachwachs (Regrow).
- **Modi:** Duell gegen KI (3 Stufen), **Online über den eigenen Server** (Konten, Schnelles Spiel, private Räume, Rangliste), **Direkt-Duell per Code** (Peer-to-Peer, ganz ohne eigenen Server) und Klassik-Wellen.
- **Look:** Ziegelrahmen, Splitscreen mit dem Gegnerfeld, VS-Intro. Alle Grafiken und Sounds werden im Code erzeugt.

## Musik & Sound

Die Musik ist eine eigene Komposition und wird live per WebAudio erzeugt (`js/audio.js`). Es gibt keine Audiodateien und keine fremden Songs:
- **Krabben-Rave** (126 BPM, Titelbild): Tropical-House/EDM mit Sidechain-Pumpen, Supersaw-Akkorden und Pluck-Lead. Die Krebse tanzen im Takt.
- **Strandpatrouille** (104 BPM, im Spiel): entspannter Loop mit Marimba, Steeldrums und Shaker.
- Musik und Effekte lassen sich auf dem Titelbild und im Pausenmenü getrennt schalten.

## Promo-Video (TikTok/Reels)

Fertiges Video: `promo/scherenschlacht_tiktok.mp4` (1080×1920, ca. 42 s, H.264 + AAC).
Neu aufnehmen:
1. Sprecher erzeugen (Windows-Stimme „Stefan“, Texte in `tools/promo/vo-script.json`):
   `powershell -ExecutionPolicy Bypass -File tools\promo\make-voice.ps1`
2. `python tools/devserver.py` starten und http://localhost:8765/tools/promo/promo.html öffnen.
3. „Aufnehmen (MP4)“ klicken. Am Ende erscheint ein Download-Link.

## Lokal spielen (ohne Server)

```bash
python tools/devserver.py
```

Danach http://localhost:8765 öffnen. KI-Duell, Klassik und das **Direkt-Duell per Code** (PeerJS) funktionieren so – auch auf GitHub Pages.

## 🌐 Eigener Online-Server

Der Server (`server/`, Node.js ≥ 22.13) liefert das Spiel aus und betreibt Konten, Matchmaking, Räume und die Partien. Alle Spieler öffnen einfach deine Adresse im Browser.

### Schnellstart lokal

```bash
cd server
npm install
npm start
```

→ http://localhost:8080 (Online-Duell → „Spiel-Server“).

### Auf deinem Server veröffentlichen (Docker + automatisches HTTPS)

```bash
cd deploy
cp .env.example .env      # DOMAIN=spiel.deinedomain.de eintragen
docker compose up -d --build
```

Caddy holt das Let's-Encrypt-Zertifikat selbst. Die Datenbank liegt im Volume `game-data`. Ohne Docker: `deploy/scherenschlacht.service` (systemd) plus `deploy/nginx.conf` oder Caddy; alle Einstellungen stehen in `server/.env.example`.

### Wie Online-Partien laufen (Anti-Cheat)

- Server und Browser nutzen **denselben Simulations-Code** (`js/field.js`, `js/game.js` …). Der Server rechnet **beide Felder verbindlich** mit festen 60-Hz-Schritten und deterministischem Zufall.
- Clients schicken nur **Befehle** (bauen, upgraden, senden, Kraft …) mit Tick-Nummer. Der Server prüft jeden Befehl (Ausrüstung, Geld, Platz, Runde) und führt ihn zum selben Tick aus.
- Geld, Leben, Türme und das Ergebnis kommen **vom Server**: Weicht ein Client ab (manipuliert, Tab im Hintergrund, Wackel-Internet), wird er korrigiert oder komplett neu synchronisiert. Verbindungsabbruch → 30 s Zeit zum Wiederverbinden.
- Den Würfel-Turm würfelt der Server (kryptografischer Zufall).

### Sicherheit

- Passwörter mit **scrypt** + Salz, Sitzungen als **HttpOnly-/SameSite=Strict-Cookie** (Token nur gehasht in der DB), Schutz gegen Zeitangriffe beim Login.
- **CSRF-Schutz** (Origin-Prüfung) für API und WebSocket, **Rate-Limits** für Login/Registrierung, API, Raumcodes und WebSocket-Nachrichten, Verbindungslimit pro IP, Größenlimits für alle Nachrichten.
- Strenge Prüfung jeder Client-Nachricht (nur bekannte Felder, Wertebereiche), Namen werden im Client immer HTML-escaped.
- Sicherheits-Header (CSP, nosniff, frame-ancestors none, HSTS hinter HTTPS), es werden **nur** die Spiel-Dateien ausgeliefert.
- SQLite über vorbereitete Statements; Docker-Container läuft als Nicht-root, nur-lesend, ohne Zusatzrechte.

### Tests

```bash
cd server
npm test
```

`test/determinism.js` prüft, dass Client- und Server-Simulation Tick für Tick identisch rechnen (inkl. Resync). `test/e2e.js` startet den Server und spielt mit zwei Bots: Konten, CSRF, Pfad-Tricks, Matchmaking, Würfel, Befehle, Cheat-Versuche, Wertung, Flut-Schutz.

## 📲 Aufs iPhone – ohne Mac (empfohlen: PWA)

1. Erstelle auf GitHub ein neues **öffentliches** Repo, z. B. `scherenschlacht`.
2. Lade den Ordnerinhalt hoch:
   ```bash
   git init
   git add .
   git commit -m "Scherenschlacht"
   git branch -M main
   git remote add origin https://github.com/<DEIN-NAME>/scherenschlacht.git
   git push -u origin main
   ```
3. Im Repo: **Settings → Pages → Source: „Deploy from a branch“, Branch `main` / `root`** → Save.
4. Nach etwa einer Minute ist das Spiel unter `https://<DEIN-NAME>.github.io/scherenschlacht/` erreichbar.
5. Öffne die Seite auf dem iPhone **in Safari** und tippe auf **Teilen → „Zum Home-Bildschirm“**.
6. Jetzt startet es wie eine App: im Vollbild, mit Icon und auch offline (außer im Online-Duell).

Updates: Dateien ändern, pushen und in `sw.js` die Nummer bei `CACHE = 'scherenschlacht-v…'` hochzählen.

### Optional: echte .ipa-App

Das GitHub-Projekt **xtool** baut iOS-Apps unter Linux/WSL, braucht aber eine Kopie von Xcode (also doch einen Mac) und ist für Swift-Apps gedacht. Für dieses Web-Spiel gibt es einen realistischeren Weg:
**Capacitor** packt das Spiel in eine iOS-App, ein **GitHub-Actions-Runner mit macOS** baut daraus eine `.ipa`, und **Sideloadly** oder **AltStore** installieren sie von Windows aus mit einer kostenlosen Apple-ID. Die App muss dann alle 7 Tage neu signiert werden. Die PWA ist deutlich bequemer und spielt sich genauso.

## Steuerung

- **Krebs platzieren:** Turm-Karte unten links antippen, dann auf das Spielfeld tippen. Zum Feinjustieren den Finger halten und ziehen; beim Loslassen wird gebaut.
- **Upgraden/Verkaufen:** Turm antippen – unten öffnet sich das Upgrade-Panel. Regel: ein Pfad bis Stufe 4, der andere höchstens bis Stufe 2.
- **Fähigkeiten:** goldene Runde Buttons unten links auf dem Feld (gleiche Fähigkeiten sind gebündelt).
- **Ausrüstung:** Titelbild → „Ausrüstung“ (3 Türme + 3 Kräfte). In der Vorrunde jeder Partie würfelst du den 4. Turm (2x neu würfeln) und kannst noch umbauen.
- **Kräfte:** runde Buttons unten rechts. Seeigel-Teppich und Tiefseebombe: Button antippen, dann auf die Strecke tippen. Grau = erst ab der angezeigten Runde.
- **Röhren** (zwischen den Feldern): oben deine Sends zum Gegner, unten die Blasen, die zu dir kommen – mit Füllstand x/6.
- **Senden** (nur Battle): blaue Karten unten rechts. Jeder Send erhöht deine Eco, Riesen-Sends senken sie. Glas (+50 %) und Nachwachs (+25 %) lassen sich zuschalten. Gesperrte Sends zeigen die Freischalt-Runde.
- **Gegner ansehen:** Das kleine Gegnerfeld rechts antippen, um es groß anzuzeigen.
- **Garnelenkisten:** werden automatisch eingesammelt, Antippen geht schneller.
- Desktop: `Esc` bricht ab, `Leertaste` startet im Klassik-Modus die nächste Runde.

## Projektstruktur

| Datei | Inhalt |
|---|---|
| `js/data.js` | Blasen, Türme & Upgrades, Kräfte, Ausrüstung, Sends, Karten, Wellen: **hier balancen** |
| `js/field.js` | Simulation eines Spielfelds (deterministisch, auch auf dem Server) |
| `js/game.js` | Partie & Regeln, Befehle, Angriffe, Abgleich mit dem Server |
| `js/ghost.js` | Gegner-Spiegelbild aus Snapshots |
| `js/path.js` | Strecke (Catmull-Rom) |
| `js/draw.js` | Schattierungs-Helfer, Sprite-Cache, Blasen |
| `js/towers.js` / `js/towers-new.js` / `js/hero.js` | Krebs-Artwork je Upgrade-Stufe |
| `js/maps.js` / `js/render.js` | Karten und Spielfeld-Rendering |
| `js/icons.js` | SVG-Icons (inkl. Kräfte) |
| `js/audio.js` | Musik-Engine und Soundeffekte |
| `js/ai.js` | KI-Gegner (mit eigener Ausrüstung) |
| `js/net.js` | Direkt-Duell (PeerJS) und Server-Verbindung (WebSocket) |
| `js/ui.js` / `js/main.js` / `js/menu-online.js` | Bedienung, HUD, Menüs, Vorrunde, Online-Lobby |
| `server/` | Spiel-Server: `server.js`, `lib/` (Match, Lobby, DB, Auth, Prüfung), `test/` |
| `deploy/` | Docker Compose + Caddy, nginx, systemd |
| `sw.js`, `manifest.webmanifest`, `icons/` | PWA (offline & Homescreen) |
