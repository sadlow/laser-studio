# Laser Studio

Entwurfswerkzeug fuer Lasercut-Kartenprodukte, lokal im Browser, ohne
Illustrator. Erstes Produkt: **Schichtkarte**, das Amazon-Poster "Zuhause"
(Family Motiv 8) als Acrylaufbau. **Kein Produktivsystem** (siehe "Umfeld").

## Produkt Schichtkarte (von oben nach unten)

| Lage | Material | Was passiert |
|---|---|---|
| Herz | Spiegelacryl rot | am Ort aufgeklebt |
| Weiss | Acrylglas weiss | Rahmen + Strassennetz + Textflaeche, Woerter als Stencil ausgeschnitten |
| Schwarz | Acrylglas schwarz | Wasser ausgeschnitten, feine Wege graviert (hell) |
| Blau | Spiegelacryl blau | scheint durch das Wasser |

Je Lage eine Laserdatei (Schnitt rot, Gravur schwarz, mm), dazu die
zusammengesetzte Vorschau.

## Grundsatz: Engine und UI getrennt

`src/engine/` kennt kein React/Next. Einstieg:
`rendereSchichtkarte(karte, token) => SchichtkartenErgebnis`. Der ganze
Vertrag steht in `typen.ts`. Wandert das Produkt in den baseline-customizer,
wird die Engine **importiert**, nicht nachgebaut – sonst driften Vorschau und
Produktion unbemerkt auseinander.

## Entscheidungen, die man nicht am Code sieht

- **Ausschnitt in km statt Zoom.** A3 zeigt denselben Kiez wie A5, nur groesser –
  wie das Poster. Strassenbreiten und Herz gelten fuer A4 und wachsen mit
  (`REFERENZ_KARTENBREITE_MM`). Fest bleiben Rahmen (Falz) und Stege.
  Ergebnis: 22-24 % Weiss im Fenster auf allen Formaten.
- **Mindestbreite im Netz** (0,8 mm). Auf A5 greift sie bei den Wohnstrassen.
- **Ausschnitt entscheidet die Dichte.** A4 bei 2 km 13 % Weiss, 3,5 km 22 %,
  6 km 37 % mit 5 losen Netzstuecken – dort gehoeren Wohnstrassen zurueck auf
  Gravur (`scripts/ausschnittvergleich.ts`).
- **Tunnel nie, Bruecken immer.** In echten Kacheln gemessen (Berlin-Tiergarten:
  21 Tunnelstuecke). Bruecken halten das Netz ueber dem Wasser zusammen.
- **Stencil-Stege am hoechsten und tiefsten Punkt jeder Innenflaeche**, hoechstens
  0,5 mm und nie breiter als der halbe Strich (Regel aus dem Direktsatz,
  `STEG_ANTEIL_STRICH`), mindestens 0,3 mm. 0,7 mm wirkte bei Demi (Strich
  0,93 mm) wie eine Luecke. Laenge am Strich gemessen, nie ueber den Buchstaben.
- **Innenflaechen unter 1,0 mm Breite werden zugefuellt** – neben dem senkrechten
  Steg bliebe nichts stehen. Zwei Irrwege davor: eine mm²-Grenze (zerteilte auf
  A3 das Gradzeichen) und ein Anteil der Versalhoehe (machte die Schleifen der
  Schreibschrift schwarz, 2,7-8,8 mm breit, aber nur 0,5-1,6 %). A4 Demi:
  ° 0,97 mm, obere 8 1,07, A 1,16. Folge: auf A5 werden auch A und obere 8 voll,
  auf A3 bekommt das ° Stege – beides physikalisch ehrlich (`scripts/inseln-titel.ts`).
- **Kleine Bloecke im Netz bleiben weiss** (< 4 mm²) – loesen sich nicht sauber.
- **Zeilenschrift Avant Garde Demi statt ExtraLight** (Poster): Strich bei 5 mm
  Versalhoehe ExtraLight 0,20 / Book 0,50 / Demi 0,93 / Bold 1,36 mm. 0,20 ist
  kaum breiter als die Schnittfuge (`scripts/strichstaerke.ts`).
- **Titel Bacalisties bei 7 %, Mitte 74,3 %.** Die Versalien schwingen
  gleichmaessig 9,7-10,1 % unter die Mitte. Beruehren sich Zeilen, meldet die
  Engine es – das haengt am Kundentext.
- **Quadrat = eingebettetes Layout** (`ecken.ts`, `standardLayoutFuer`). Karte
  ueber die ganze Platte, Texte an Ankern (Titel oben, Namen unten links,
  Koordinaten unten rechts), je 5 mm weisse Schutzkontur, die in Rahmen und Netz
  uebergeht (1 mm Ueberlappung, geglaettet, ohne Loecher). Unten 14 mm Rand.
  Positioniert nach Umriss, nicht Grundlinie. Unter der Kontur kein Wasser, keine
  Gravur – sonst helle Striche in den Buchstaben und keine Klebeflaeche.
- **opentype.js ist gepatcht** (`patches/`, `postinstall`): CFF-Encoding mit
  Zusatzbit (Format 129) warf einen Fehler, betroffen AvantGardeCE-Demi.otf.

## Herkunft

Geo-Mathematik, Strassenklassen-Filter, Clipping: aus
`extendscript-bulk-processing/tools/fetch-vector-tiles.js`. GMS-Format:
`decimalToDMS()` im Bulk-Script. Felder: `ETSY_FIELD_SPECS` Motiv 8/9.

## Start

```bash
cp .env.example .env.local   # MAPBOX_ACCESS_TOKEN wie in shared/config-local.jsx
npm install && npm run dev   # http://localhost:3010
```

Pruefskripte: `npx tsx scripts/formatvergleich.ts`, `quadrat-varianten.ts`, `ausschnittvergleich.ts`,
`strichstaerke.ts`, `inseln-titel.ts`, `titel-lage.ts`.

## Offen

- Textsatz ueber opentype.js ohne `calt` – fuer Produktion HarfBuzz wie Direktsatz
- Quadrat: Titel oben haengt nur am Schwung des Z am Rand; Titel unten verschmilzt mit den Ecken
- Standort-Bestaetigung: "Luebeck" fand Luebecker Strasse in Koeln
- Herz-Auflage: liegt teils auf Weiss, teils eine Lage tiefer auf Schwarz
- Materialstaerken, Aufbauhoehe vs. Falztiefe des Bilderrahmens
- Nicht am Werkstueck bestaetigt: Stegbreite, Mindestbreiten, Gravurbreiten

## Umfeld

| Projekt | Rolle |
|---|---|
| `extendscript-bulk-processing` | heutige Produktion; Planungsgrundsatz `docs/laser-online-grundsatz.md` |
| `baseline-customizer` | Personalisierungs-Backend; dorthin wandert die Engine |
| `print-pipeline` | zieht Orders, kennt den Lasercut-Kanon – **nicht** hier nachbauen |

Code-Kommentare deutsch · Commits englisch · Dateien < 200 Zeilen · diese Datei < 100 Zeilen.
