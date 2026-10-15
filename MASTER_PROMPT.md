# MASTER PROMPT – „SCHERENSCHLACHT: Krusten-Battles“

> Dieses Dokument ist der Design- und Bau-Auftrag für das Spiel. Es ist so geschrieben,
> dass ein Entwickler (oder eine KI) das komplette Spiel allein daraus bauen kann.

---

## 1. Rolle & Ziel

Du bist ein Game-Designer und Web-Game-Entwickler. Baue ein **1-gegen-1 Tower-Defense-Spiel**
im Geist von *Bloons TD Battles* – aber mit **Krebstieren als Türmen** und **Blasen als Gegnern**.
Das Spiel muss auf einem **iPhone im Querformat** per Touch spielbar sein und als
**PWA (Web-App)** auf den Home-Bildschirm installiert werden können – ohne Mac, ohne App Store.

Leitsatz: *„Vertraut wie Bloons, aber kein Klon.“* Mechanik-Gefühl übernehmen (Pierce, Layer,
Eco, Senden), Türme und Upgrades aber **neu erfinden** – inspiriert von der echten Biologie der Tiere.

---

## 2. Stil & Präsentation

- **Look:** wie *Bloons TD Battles* (1): BTD5-Vektorstil mit weichen Verläufen, Outlines im dunklen
  Farbton, großen Comic-Augen und kräftigen Schlagschatten. Oberfläche: Sandstein-Ziegelrahmen,
  Splitscreen (eigenes Feld + Gegnerfeld), grüne Lebensbalken oben, blaue Kuppeln für Runde bzw.
  Geld/Eco/Uhr, Turm-Karten (rot, wenn zu teuer), blaue Send-Karten mit goldenen Schlössern,
  VS-Intro mit Helden in blauem/rotem Helm. Keine Emojis – nur eigene SVG-Icons.
- **Alles prozedural gezeichnet** (Canvas 2D-Pfade). Keine Bilddateien nötig.
- **Setting:** Meeresboden in einer Bucht. Sandboden mit Seegras, Steinen, Muscheln und
  Seesternen. Die Strecke ist ein **Strömungskanal** (türkisblaues Wasser mit Schaumkante),
  auf dem die Blasen treiben.
- **Feedback:** Popp-Sternchen beim Platzen, kleine Zahlen bei Geld-Ticks, Rückstoß-Animationen
  bei Türmen, synthetische Retro-Sounds (WebAudio, kein Asset).
- **Sprache:** Deutsch, verspielte Wortspiele.
- **Schrift:** fette, runde Cartoon-Schrift mit schwarzer Kontur.

---

## 3. Gegner: Die Blasen (≈ Bloons)

Jede Blase hat Schichten. Wird eine Schicht zerstört, entsteht die nächstschwächere Blase.
Lebensverlust beim Durchbruch = **RBE** (Summe aller enthaltenen Schichten).

| Blase | Tempo | enthält | Besonderheit |
|---|---|---|---|
| Rot | 1.0 | – | – |
| Blau | 1.4 | Rot | – |
| Grün | 1.8 | Blau | – |
| Gelb | 3.2 | Grün | sehr schnell |
| Pink | 3.5 | Gelb | am schnellsten |
| **Tinte** (schwarz) | 1.8 | 2× Pink | immun gegen **Explosion** |
| **Eis** (weiß) | 2.0 | 2× Pink | immun gegen **Kälte** |
| **Panzer** (Muschelschale) | 1.0 | 2× Tinte | immun gegen **Spitzes & Schall** |
| **Gestreift** | 1.8 | Tinte + Eis | beide Immunitäten der Kinder |
| **Regenbogen** | 2.2 | 2× Gestreift | – |
| **Koralle** | 2.5 | 2× Regenbogen | 10 Trefferpunkte |
| **Kugelfisch** (MOAB-Klasse) | 1.0 | 4× Koralle | 200 TP, nicht einfrierbar |
| **Blauwal** (BFB-Klasse) | 0.35 | 4× Kugelfisch | 700 TP |
| **Krakenkönig** (ZOMG-Klasse) | 0.25 | 4× Blauwal | 4000 TP |

**Modifikatoren:**
- **Glas** (= Camo): nur Türme mit Tarnsicht können zielen.
- **Nachwachs** (= Regrow): wächst alle 2 s eine Schicht nach (bis zum Ursprung).

---

## 4. Türme: Die Krebse

Jeder Turm hat **2 Upgrade-Pfade mit je 4 Stufen**. Regel wie BTD Battles: ein Pfad bis Stufe 4,
der andere bis Stufe 2. **Stufe 4 schaltet eine aktivierbare Spezialfähigkeit frei** (Cooldown),
z. B. Schallmauer, Faust der Tiefe, Schalen-Tornado, Kokos-Meteor, Großes Barriereriff,
Großer Balztanz, Absoluter Nullpunkt, Erdbeben, Krill-Galaxie, Walgesang, Großernte.
Jede Stufe verändert das Aussehen des Krebses sichtbar. Verkaufen gibt 70 % zurück.
Schadenstypen: `scharf`, `schall`, `stumpf`, `explosion`, `kälte`, `hitze`.

### 4.1 Knallkrebs (Pistolenkrebs) – 220
Schließt seine Knallschere so schnell, dass eine **Kavitationsblase** entsteht. Er feuert
Schallblasen ab (Typ `schall`, Pierce 3).
- **Pfad Schall:** Doppelschere (Tempo) → Schallkanone (Schockwellen-Kegel) → **Überschallknall**
  (jeder 3. Knall ist ein riesiger Ring, der alles betäubt).
- **Pfad Plasma:** Heiße Blase (Typ `hitze`, knackt Panzer & Eis) → Kavitationsfunke (Explosion
  beim Treffer) → **Sonnenknall 4700 °C** (Plasmakugel, 3× Schaden gegen Riesen).

### 4.2 Fangschreckenkrebs – 350
Schlägt mit der schnellsten Faust der Tierwelt zu. Kurze Reichweite, hoher Einzelschaden,
`stumpf`, knackt also Panzer.
- **Pfad Schmetterer:** Titanfaust → Doppelschlag (2 Ziele) → **Kavitationshieb** (jeder Schlag
  erzeugt eine Mini-Schockwelle).
- **Pfad Speerer:** Speerspitze (Fernkampf-Speer) → **16-Farben-Augen** (Tarnsicht für sich
  **und alle Türme in Reichweite**) → **Polarisationsblick** (entfernt Glas & Nachwachs bei Treffern,
  Nachbartürme bekommen +1 Pierce).

### 4.3 Einsiedlerkrebs – 300
Wirft Schneckenhäuser als **Bumerang** (fliegt raus und zurück, Pierce 6).
- **Pfad Sammler:** Schneckenhaus-Bumerang → Doppelwurf → **Schalensturm** (Häuser kreisen
  dauerhaft um den Krebs).
- **Pfad Umzug:** Dosen-Heim (Wurfgeschoss wird `stumpf`) → Glasflaschen-Heim (zersplittert in
  6 Scherben) → **Wrack-Heim** (wohnt im Schiffswrack und feuert Kanonenkugeln).

### 4.4 Kokoskrabbe – 500
Wirft Kokosnüsse in hohem Bogen (Explosion, Flächenschaden).
- **Pfad Bombardement:** Größere Nüsse → Kokos-Splitter → **Palmen-Bombardement** (unendliche
  Reichweite, 3 Nüsse gleichzeitig).
- **Pfad Hartschale:** Hartschale (+Schaden) → Klebrige Kokosmilch (verlangsamt) → **Riesenkokos**
  (Riesenschaden gegen MOAB-Klasse, Rückstoß).

### 4.5 Seepocken-Kolonie – 400
Seepocken sind festgewachsene Krebse. Die Kolonie **siedelt Stachel-Pocken auf der Strecke an**
(Fallen, Pierce 6).
- **Pfad Brut:** Schnelle Brut → Stahlpocken (`stumpf`, mehr Pierce) → **Riff-Teppich**.
- **Pfad Fänger:** Lange Haltbarkeit → Rankenfuß-Fänger (hält Blasen kurz fest) →
  **Pocken-Minen** (Explosion gegen Riesen).

### 4.6 Winkerkrabbe – 600 (Support)
Hat eine riesige Winkschere und gibt mit **Rhythmus** Türmen in Reichweite Tempo (+10 %).
- **Pfad Rhythmus:** Trommelschere (+20 %) → Wink-Signal (+Reichweite, +Pierce) →
  **Balztanz** (alle 25 s: Türme in Reichweite 8 s lang doppelt so schnell).
- **Pfad Revier:** Scharfer Blick (Tarnsicht für Nachbarn) → Panzerbrecher (Nachbarn knacken
  Panzer) → **Revierkönig** (Blasen in Reichweite 25 % langsamer und nehmen +1 Schaden).

### 4.7 Yeti-Krabbe – 400
Ein haariger Tiefseekrebs. Sendet **Kältepulse** aus, die Blasen einfrieren.
- **Pfad Tiefsee:** Dichtes Fell (Radius) → Tiefseekälte (Schaden + länger einfrieren) →
  **Hydrothermal-Schock** (abwechselnd Eis- und Hitzepuls).
- **Pfad Bakterien:** Bakterienzucht (verlangsamt MOAB-Klasse) → Klebrige Haare (Blasen bleiben
  nach dem Auftauen langsam) → **Eiszeit** (großer Dauer-Slow).

### 4.8 Riesenspinnenkrabbe – 450
Hat 3 Meter lange Beine und **stampft im Kreis** (trifft bis zu 8 Blasen rundherum).
- **Pfad Tempo:** Längere Beine → Schnelltrippler → **Stelzensturm**.
- **Pfad Titan:** Panzerbeine (`stumpf`) → Deko-Algen (Tarnung als Dekorationskrabbe: Tarnsicht und
  Reichweitenbonus für Nachbarn) → **Titanenstampfer** (Schockwelle betäubt MOABs).

### 4.9 Krillschwarm – 700
Ein Schwarm Krill-Drohnen jagt Blasen **auf der ganzen Karte**.
- **Pfad Schwarm:** Größerer Schwarm → Leuchtkrill (Tarnsicht, Blendung) → **Superschwarm**.
- **Pfad Fresswut:** Schnellschwimmer → Fressrausch (×4 gegen MOAB-Klasse) →
  **Bartenwal-Köder** (lockt alle 20 s einen Wal an, der eine Streckenpassage leer frisst).

### 4.10 Garnelenfarm – 1000 (Wirtschaft, ≈ Bananenfarm)
Züchtet Garnelen. Bei jedem Eco-Tick springen Garnelen-Kisten heraus, die sich automatisch
einsammeln lassen oder angetippt werden.
- **Pfad Zucht:** Größere Becken → Aquakultur → **Garnelen-Imperium**.
- **Pfad Handel:** Perlenzucht (Bonusperlen) → Fischmarkt (+25 % Wert) → **Muschel-Börse**
  (Zinsen auf dein Guthaben).

---

## 5. Spielmodi

1. **Duell gegen KI** (Einzelspieler, 1v1): KI-Gegner mit 3 Schwierigkeiten. Er baut Türme, rüstet
   auf, baut Farmen und schickt Blasen.
2. **Online-Duell** (1v1): Raumcode mit 4 Zeichen, Peer-to-Peer (PeerJS/WebRTC). Jeder Client
   simuliert sein eigenes Feld. Gesendete Blasen und Snapshots gehen über den Datenkanal.
3. **Klassik-Wellen** (Einzelspieler, wie BTD5): 40 Runden überleben, Geld pro Popp, Rundenbonus,
   danach Freispiel. Mit Start-Knopf und doppeltem Tempo.

### Battle-Regeln
- 150 Leben pro Spieler. Start: 650 🐚, Eco 250.
- **Eco-Tick alle 6 s:** Du bekommst deine Eco als Geld.
- **Blasen senden** kostet Geld und erhöht deine Eco (Riesen-Sends senken sie).
  Sends werden ab bestimmten Runden freigeschaltet, max. 6 in der Warteschlange.
  Optional mit Glas (+50 %) oder Nachwachs (+25 %).
- **Natürliche Wellen** kommen synchron bei beiden Spielern. Sie sind deterministisch per Seed.
- Wer zuerst 0 Leben hat, verliert.
- Gegneransicht als Minikarte. Antippen vergrößert sie.

---

## 6. Technik

- HTML5 + Canvas 2D + Vanilla-JS, **kein Build-Schritt**, läuft direkt aus dem Ordner.
- Logische Spielfläche 1000×600, skaliert auf jedes Display (devicePixelRatio-scharf).
- Feste Simulation mit 60 Hz. Rendering per requestAnimationFrame.
- Steuerung per Pointer Events: Tippen = Turm wählen und platzieren (Geist-Vorschau mit
  Reichweite, rot wenn ungültig), Ziehen aus dem Shop direkt auf die Karte.
- **PWA:** manifest, Service Worker (offline), Apple-Touch-Icon, `viewport-fit=cover`,
  Safe-Areas, Querformat.
- Speicherstand (Einstellungen, Rekorde) in localStorage.

## 7. Abnahmekriterien

- [ ] Läuft flüssig auf dem iPhone (Safari/PWA) mit 200+ Blasen.
- [ ] Alle 10 Türme mit je 6 Upgrades funktionieren sichtbar unterschiedlich.
- [ ] Alle 14 Blasentypen inklusive Immunitäten, Glas und Nachwachs.
- [ ] KI-Duell ist gewinn- und verlierbar. Klassik bis Runde 40 spielbar.
- [ ] Online-Duell verbindet zwei Geräte per Code.
- [ ] Installierbar über „Zum Home-Bildschirm“, startet im Vollbild und offline.
