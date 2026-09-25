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
| `layout.ts`, `textblock.ts`, `ecken.ts`, `kante.ts` | Zonen; Texte im Poster, in Reitern oder Titel als Material auf der unteren Kante |
| `poster-masse.ts`, `symbole.ts` | Gemessene Poster-Masse je Format; Standort-Symbole mit Anker |
| `schnitt-text.ts`, `stencil.ts`, `stencil-schreib.ts`, `sonderzeichen.ts`, `strich.ts` | Schrift, wie sie geschnitten wird: Druckschrift Glyphe fuer Glyphe eckig verstaerkt, Stege wie gezeichnete Stencil-Schriften, Gradring, Abstaende; Titel nur aussen verstaerkt, Stege durch die duennste Wand |
| `dichte.ts`, `netz.ts`, `randanschluss.ts`, `bruecken.ts` | Netzklassen und Breiten nach Dichte vor Ort; Enden am Rahmen angeschlossen, Spalte < 0,5 mm zu; lose Stuecke -> Gravur; Bruecken gravierter Strassen |
| `wasser.ts` | Wasser im Fenster, schmale Kanaele und kleine Inseln raus |
| `lagen.ts` | Bausteine: Netz, Wasser, Textausschnitt, Gravur, Herz |
| `stapel.ts` | Lagen je Aufbau (weisses oder schwarzes Netz) + Vorschau |
| `produktion.ts`, `gravur-export.ts`, `wege.ts` | Exportdatei: Ebenen 1 Gravur / 2 Klebeflaeche / 3 Schnitt innen / 4 Schnitt aussen; Gravur als Flaeche, Mittellinie (durchgehende Wege) oder Kontur |
| `teilung.ts`, `teilung-export.ts`, `montageplan.ts`, `pdf.ts` | 60 x 60 auf Rohplatten 60 x 30,5: sauberste Naht je Lage (Front oben-unten, 297-303 mm, Uebergaenge + 4 je Einzelteil), Blau ungeteilt, nur mit Holzrahmen; Haelften A/B, Montageplan-PDF |
| `testblatt.ts` | Grenzwert-Testblatt Netz: Spalt, Strassenbreite, Keile, kleine Bloecke |
| `zeichen.ts` | Hoechstlaengen der Kundentexte (Titel 20, Zeilen 30), ohne Kartenabhaengigkeit |
| `geometrie.ts` | Clipper-Wrapper in mm |

Server (`src/server/`): `vorlagen.ts` (JSON lesen/schreiben), `export.ts`
(Exportknopf: Produktionsdaten der Eingabe nach `export/<zeit>_<ort>/`), `bogen.ts` (Prototyp-Platten: mehrere
Exemplare je Rohplatte, ein Parameter variiert).

## Entscheidungen

Alle mit Messwert in **`docs/entscheidungen.md`** – vor Aenderungen an Breiten,
Stegen, Filtern oder Exportformat dort lesen. Die wichtigsten:
- Ausschnitt in km, Strassen wachsen mit dem Format; Mindestbreite Netz 0,8 mm
- Testblatt 2 mm Weiss: Spalt, Strasse ab 0,5 mm. Stege 0,7 mm (0,5 brach beim Herausdruecken), Schrift mind. 0,8 mm Strich, 0,7 mm Material zwischen Buchstaben
- Gravur im Export: Mittellinie (Standard, Defocus 6 mm, durchgehende Wege), waehlbar Flaeche oder Kontur; nie unter Netz, Text oder Wasser
- Titel hoechstens 20 Zeichen, jede Zeile darunter 30 – bei Ort + Koordinaten zaehlen die Koordinaten mit
- Strassenbreite folgt der Dichte vor Ort; Kunde waehlt Stufe viel/ausgewogen/wenig (Ziel 37/29/23 %, Strassen nur aus der eigenen Kachel); wenig graviert Wohnstrassen immer
- Lose Netzstuecke graviert; Spalte < 0,5 mm bleiben Material; Netzstrassen laufen bis in den Rahmen; Wasser < 1 mm und Inseln < 15 mm2 nicht geschnitten
- Symbol auf Hintergrund geklebt (Gravurmarke), Ausschnitt im Netz, steht 1 mm vor; Acryl 2 mm glaenzend, schwarzer Grund 3 mm Frost, Spiegel 3 mm
- Holzrahmen optional (Holz schwarz/weiss/dunkelbraun, Eiche), ein Profil: 14 x 28 mm, Bild 6 mm tief, 4 mm Ueberstand
- 3D (`ansicht-3d.tsx`, `buehne-3d.ts`): Hochglanz (Schwarz Frost matt), echter Spiegel, Motive fuer KI-Produktfotos (`motive-3d.ts`), Explosionszeichnung; Eiche, Gravur als Rille und Frost an den ersten A5-Karten abgeglichen (19.09.)
- Tunnel, Gehwege, Ueberwege, Einfahrten, Parkplatzgassen werden nicht gezeichnet
- Zeilenschrift kraeftig statt verstaerkt: DIN Alternate Bold, A5 4,8 mm (Marcel 18.09.); Stege gerade wie in Stencil-Schriften, im Titel quer durch den duennsten Strich
- opentype.js gepatcht (`patches/`) wegen AvantGardeCE-Demi.otf; .ttc-Schnitte als `Datei.ttc#Schnitt` (`schrift-datei.ts`)

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
`ausschnittvergleich.ts` · `schriftvergleich.ts` · `strichstaerke.ts` · `inseln-titel.ts` · `titel-lage.ts` · `testblatt-grenzwerte.ts` · `gravurprobe-weiss.ts` · `testblatt-schrift-linien.ts` · `testblatt-schrift.ts` · `schrift-vergleich-a5.ts` · `teilung-referenzorte.ts` · `teilung-export.ts` ·
`bash scripts/referenzbilder.sh <name> "foto=symbol"` (3D-Referenzbild) · `scripts/listing-fotos/` (Listing-Set per Leonardo, Video-Ad `video.py`: 3D-Keyframes + Veo 3.1) ·
`scripts/amazon-custom/` (textfelder.ts, bilder.py, masken.py, symbole.py, erklaerbild.py, zeilen.py, ordner.py: Karten, Masken, Textfelder, Explosionszeichnungen)

## Offen

- Rechenzeit bei grossem Ausschnitt (8,6 km A4: 5,3 s; 60 x 60 Barcelona 7 km: 15 s, 12 km Minuten) – Datenzoom/Vereinfachung
- Exportdateien noch nicht in xTool Studio geoeffnet
- Textsatz ueber opentype.js ohne `calt` – fuer Produktion HarfBuzz wie Direktsatz
- Standort-Bestaetigung: "Luebeck" fand Luebecker Strasse in Koeln
- Holzrahmen: was haelt den Stapel an der Lippe? Hinter 7 mm (9 mm vierlagig) bleiben 15 (13) mm Falz frei
- Lesbarkeit der Zeilen schraeg: 0,5-mm-Schlitz in 2 mm zeigt Schwarz nur bis 14°; am Prototyp Book vs. Demi
- Megastaedte wirken lichter als Berlin (Tokio 15 % Netz): Deckung zaehlt Hochstrassen doppelt
- Nicht am Werkstueck bestaetigt: Stegbreite, Mindestbreiten, Gravurbreiten, Symbol-Passung; Gravur als Linie: am Foto 0,4-0,45 mm samt Rillenwand (Strahl 0,5 angenommen)
- A5 "viel": Strassen laufen zusammen – Spalt 0,5 gesetzt, Strasse 0,6 und Bloecke 1 mm² noch nicht
- DIN Alternate an den ersten A5-Karten geschnitten (19.09.); fuer den Shop Lizenz noetig (macOS-Systemschrift) oder freie Entsprechung (D-DIN). Listing-Fotos und Amazon-Bilder mit neuer Schrift und abgeglichenem 3D neu erzeugen – das erste Produkt ist geschnitten, Marcel gibt den Start frei. Kreuzungen der Liniengravur noch nicht bewertet

## Umfeld

| Projekt | Rolle |
|---|---|
| `extendscript-bulk-processing` | heutige Produktion; Grundsatz `docs/laser-online-grundsatz.md` |
| `baseline-customizer` | Personalisierungs-Backend; dorthin wandert die Engine |
| `print-pipeline` | zieht Orders, kennt den Lasercut-Kanon – **nicht** hier nachbauen |

Code-Kommentare deutsch · Commits englisch · Dateien < 200 Zeilen · diese Datei < 100 Zeilen.
