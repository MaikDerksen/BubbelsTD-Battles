# 🦀 Scherenschlacht – Krusten-Battles

Ein 1-gegen-1-Tower-Defense im Look von *Bloons TD Battles*, in dem Krebse gegen Blasen kämpfen.
Das komplette Design steht in [MASTER_PROMPT.md](MASTER_PROMPT.md).

**Spielen:** https://maikderksen.github.io/BubbelsTD-Battles/

- **10 Krebs-Türme** mit je 2 Upgrade-Pfaden à 4 Stufen (wie BTD Battles: ein Pfad bis 4, der andere bis 2): Knallkrebs, Fangschreckenkrebs, Einsiedlerkrebs, Riesenspinnenkrabbe, Kokoskrabbe, Yeti-Krabbe, Seepocken-Kolonie, Krillschwarm, Winkerkrabbe (Support) und Garnelenfarm (Wirtschaft). Jede Stufe sieht man am Krebs.
- **20 Spezialfähigkeiten:** Stufe 4 schaltet pro Pfad eine aktivierbare Fähigkeit frei (Schallmauer, Kokos-Meteor, Absoluter Nullpunkt, Walgesang …). Die Buttons erscheinen unten links auf dem Spielfeld.
- **14 Blasentypen**, von Rot bis Krakenkönig, dazu Glas (Camo) und Nachwachs (Regrow).
- **Modi:** Duell gegen KI (3 Stufen), Online-Duell per Raumcode und Klassik-Wellen (40 Runden plus Freispiel).
- **Battle-Mechanik:** Eco-Tick alle 6 s und Blasen senden (erhöht deine Eco). Die Gegner-Minikarte lässt sich antippen und vergrößern.
- **Look:** Ziegelrahmen, Splitscreen mit dem Gegnerfeld, grüne Lebensbalken, blaue Runden-Kuppel, Karten- und Send-Leisten, VS-Intro. Alle Grafiken (schattierte Sprites, SVG-Icons) und Sounds werden im Code erzeugt – keine Bilddateien, keine Engine, kein Build-Schritt.

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

## Lokal starten (Windows)

```bash
python tools/devserver.py
```

Danach http://localhost:8765 öffnen. Der Server läuft auch im WLAN, sodass du auf dem iPhone `http://<PC-IP>:8765` öffnen kannst (die IP zeigt `ipconfig`).
Für Offline-Nutzung und den Vollbild-Homescreen braucht es aber HTTPS, siehe unten.

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

Updates: Dateien ändern, pushen und in `sw.js` die Nummer bei `CACHE = 'scherenschlacht-v1'` hochzählen.

### Optional: echte .ipa-App

Das GitHub-Projekt **xtool** baut iOS-Apps unter Linux/WSL, braucht aber eine Kopie von Xcode (also doch einen Mac) und ist für Swift-Apps gedacht. Für dieses Web-Spiel gibt es einen realistischeren Weg:
**Capacitor** packt das Spiel in eine iOS-App, ein **GitHub-Actions-Runner mit macOS** baut daraus eine `.ipa`, und **Sideloadly** oder **AltStore** installieren sie von Windows aus mit einer kostenlosen Apple-ID. Die App muss dann alle 7 Tage neu signiert werden. Die PWA ist deutlich bequemer und spielt sich genauso.

## Steuerung

- **Krebs platzieren:** Turm-Karte unten links antippen, dann auf das Spielfeld tippen. Zum Feinjustieren den Finger halten und ziehen; beim Loslassen wird gebaut.
- **Upgraden/Verkaufen:** Turm antippen – unten öffnet sich das Upgrade-Panel. Regel: ein Pfad bis Stufe 4, der andere höchstens bis Stufe 2.
- **Fähigkeiten:** goldene Runde Buttons unten links auf dem Feld (gleiche Fähigkeiten sind gebündelt).
- **Senden** (nur Battle): blaue Karten unten rechts. Jeder Send erhöht deine Eco, Riesen-Sends senken sie. Glas (+50 %) und Nachwachs (+25 %) lassen sich zuschalten. Gesperrte Sends zeigen die Freischalt-Runde.
- **Gegner ansehen:** Das kleine Gegnerfeld rechts antippen, um es groß anzuzeigen.
- **Garnelenkisten:** werden automatisch eingesammelt, Antippen geht schneller.
- Desktop: `Esc` bricht ab, `Leertaste` startet im Klassik-Modus die nächste Runde.

## Projektstruktur

| Datei | Inhalt |
|---|---|
| `js/data.js` | Blasen, Türme & Upgrades, Sends, Karten, Wellen-Generator: **hier balancen** |
| `js/field.js` | Simulation eines Spielfelds (Bewegung, Schaden, Turm-Verhalten, Eco) |
| `js/draw.js` | Schattierungs-Helfer, Sprite-Cache, Blasen |
| `js/towers.js` / `js/hero.js` | Krebs-Artwork je Upgrade-Stufe, Titel-/VS-Charaktere |
| `js/maps.js` / `js/render.js` | Karten (Gras, Pflasterweg, Palmen) und Spielfeld-Rendering |
| `js/icons.js` | SVG-Icon-Set für die Oberfläche |
| `js/audio.js` | Musik-Engine (Sequencer, Synths) und Soundeffekte |
| `tools/promo/` | Promo-Video: Regie-Skript, Sprechertexte, TTS-Skript |
| `js/game.js` | Partie: Runden, Eco-Ticks, Senden, Sieg/Niederlage |
| `js/ai.js` | KI-Gegner |
| `js/net.js` | Online-Duell (PeerJS/WebRTC) |
| `js/ui.js` / `js/main.js` | Bedienung, HUD, Menüs |
| `sw.js`, `manifest.webmanifest`, `icons/` | PWA (offline & Homescreen) |
