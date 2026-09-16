# Laser Studio

Design- und Prototyp-Werkzeug fuer Lasercut-Kartenprodukte, lokal im Browser,
ohne Illustrator. **Kein Produktivsystem:** Prototypen werden hier entworfen und
mit Marcel abgestimmt; produktfaehig gemacht wird erst danach, aus diesen
Quelldaten, im Shop-Konfigurator.

Erstes Produkt: **Schichtkarte** – das Amazon-Poster "Zuhause" (Family Motiv 8)
als Acrylaufbau aus mehreren Lagen.

## Grundsatz: Engine und UI getrennt

`src/engine/` kennt kein React/Next. Einstieg:
`rendereSchichtkarte(karte, token) => SchichtkartenErgebnis`, Vertrag in
`typen.ts`. Wandert das Produkt in den baseline-customizer, wird die Engine
**importiert**, nicht nachgebaut – sonst driften Vorschau und Produktion
unbemerkt auseinander.

**Vorlage = Produkt, Kundeneingabe = Bestellung.** `vorlagen/*.json` enthaelt
alle Parameter ausser `kunde`, `lon`, `lat`.

## Aufbau der Engine

| Datei | Aufgabe |
|---|---|
| `kacheln.ts` | Mapbox-Vector-Tiles -> Linien/Flaechen in mm, Tunnel und Gehwege raus |
| `layout.ts`, `textblock.ts`, `ecken.ts` | Zonen; Texte im Poster bzw. in Reitern |
| `poster-masse.ts`, `symbole.ts` | Gemessene Poster-Masse je Format; Standort-Symbole mit Anker |
| `stencil.ts` | Stege fuer Innenflaechen im ausgeschnittenen Text |
| `dichte.ts`, `netz.ts` | Netzklassen und Breiten nach Dichte vor Ort; lose Stuecke -> Gravur |
| `wasser.ts` | Wasser im Fenster, schmale Kanaele und kleine Inseln raus |
| `lagen.ts` | Bausteine: Netz, Wasser, Textausschnitt, Gravur, Herz |
| `stapel.ts` | Lagen je Aufbau (weisses oder schwarzes Netz) + Vorschau |
| `produktion.ts` | Exportdatei: Ebenen 1 Gravur / 2 Schnitt innen / 3 Schnitt aussen |
| `geometrie.ts` | Clipper-Wrapper in mm |

Server (`src/server/`): `vorlagen.ts` (JSON lesen/schreiben), `export.ts`
(Testexemplare nach `export/<zeit>_<ort>/<vorlage>/`), `bogen.ts` (Prototyp-Platten: mehrere
Exemplare je Rohplatte, ein Parameter variiert).

## Entscheidungen

Alle mit Messwert in **`docs/entscheidungen.md`** – vor Aenderungen an Breiten,
Stegen, Filtern oder Exportformat dort lesen. Die wichtigsten:
- Ausschnitt in km, Strassen wachsen mit dem Format; Mindestbreite Netz 0,8 mm
- Stege am Scheitel, hoechstens 0,5 mm und halber Strich; Inseln < 0,8 mm zu
- Gravur als Flaeche nur im Export; nie unter Netz, Text oder Wasser
- Strassenbreite folgt der Dichte vor Ort; Kunde waehlt Stufe viel/ausgewogen/wenig (Ziel 42/33/26 %)
- Lose Netzstuecke graviert; Wasser < 1 mm und Inseln < 15 mm2 nicht geschnitten
- Symbol auf Blau geklebt, Ausschnitt in allen Lagen darueber; Acryl 2 mm, Spiegel 3 mm
- Tunnel, Gehwege, Ueberwege, Einfahrten, Parkplatzgassen werden nicht gezeichnet
- Zeilenschrift Avant Garde Book, Sperrung 0,14 (Deckschicht 2 mm; ExtraLight 0,20 mm zu duenn)
- opentype.js gepatcht (`patches/`) wegen AvantGardeCE-Demi.otf

## Herkunft

Geo-Mathematik, Strassenklassen, Clipping: `extendscript-bulk-processing/tools/
fetch-vector-tiles.js`. GMS-Format: `decimalToDMS()` im Bulk-Script. Felder:
`ETSY_FIELD_SPECS` Motiv 8/9. Stegregel: Direktsatz (`STEG_ANTEIL_STRICH`).

## Start und Pruefung

```bash
cp .env.example .env.local   # MAPBOX_ACCESS_TOKEN wie in shared/config-local.jsx
npm install && npm run dev   # http://localhost:3010
```

`npx tsc --noEmit` · `npx tsx scripts/referenzorte.ts` (8 Orte weltweit) · `formatvergleich.ts` · `quadrat-varianten.ts` ·
`ausschnittvergleich.ts` · `schriftvergleich.ts` · `strichstaerke.ts` · `inseln-titel.ts` · `titel-lage.ts`

## Offen

- Rechenzeit bei grossem Ausschnitt (8,6 km: 5,3 s) – fuer den Shop Datenzoom/Vereinfachung pruefen
- Exportdateien noch nicht in xTool Studio geoeffnet
- Textsatz ueber opentype.js ohne `calt` – fuer Produktion HarfBuzz wie Direktsatz
- Standort-Bestaetigung: "Luebeck" fand Luebecker Strasse in Koeln
- Symbol-Auflage: liegt teils auf dem Netz, teils eine Lage tiefer; Anker = Ort, ziehbar in der Vorschau
- Megastaedte wirken lichter als Berlin (Tokio 15 % Netz): Deckung zaehlt Hochstrassen doppelt
- Nicht am Werkstueck bestaetigt: Stegbreite, Mindestbreiten, Gravurbreiten

## Umfeld

| Projekt | Rolle |
|---|---|
| `extendscript-bulk-processing` | heutige Produktion; Grundsatz `docs/laser-online-grundsatz.md` |
| `baseline-customizer` | Personalisierungs-Backend; dorthin wandert die Engine |
| `print-pipeline` | zieht Orders, kennt den Lasercut-Kanon – **nicht** hier nachbauen |

Code-Kommentare deutsch · Commits englisch · Dateien < 200 Zeilen · diese Datei < 100 Zeilen.
