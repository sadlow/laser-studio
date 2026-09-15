# Laser Studio

Entwurfswerkzeug fuer Lasercut-Kartenprodukte. Laeuft lokal im Browser, ohne
Illustrator. Zweck: ein neues Kartenprodukt im Dialog entwerfen und dabei
pruefen, wie weit ein rein numerisches Layout traegt.

**Kein Produktivsystem.** Die Bestellstrecke liegt woanders (siehe „Umfeld").

## Der eine Grundsatz: Engine und UI sind getrennt

`src/engine/` kennt weder React noch Next noch ein Dateisystem. Ein Aufruf,
ein Ergebnis:

```ts
rendereEntwurf(entwurf: KartenEntwurf, token: string) => Entwurfsergebnis
```

Alles, was ein Kartenprodukt beschreibt, steht in `src/engine/typen.ts` — und
nur dort. Die UI ist ein Formular auf diese Typen und darf weggeworfen werden.

Der Grund ist nicht Ordnungsliebe: sobald dieselbe Geometrie ein zweites Mal
implementiert wird (einmal fuer die Kundenvorschau, einmal fuer die
Produktion), driften die beiden auseinander, und zwar unbemerkt. Wandert das
Werkzeug spaeter in den baseline-customizer, wird die Engine **importiert**,
nicht nachgebaut.

## Layout ist Parameter, Form ist Asset

- **Layout = Zahlen.** Format, Rahmen, Kartenfeld, Textzonen (`layout.ts`).
  Dasselbe Layout traegt A5 bis A3, ohne zweite Vorlagendatei. Im Illustrator
  ist das heute je Format ein eigenes .ai-Template.
- **Form = Asset.** Ein Herz ist keine Formel. Formen kommen als SVG-Pfad
  dazu und werden in den parametrischen Rahmen eingepasst. (Noch nicht gebaut —
  der erste Entwurf ist rechteckig.)

## Die Rolle steht in der Datei

Schnitt und Gravur sind getrennte SVG-Gruppen mit fester Farbe (rot schneidet,
schwarz graviert). Die **Gravurdichte** ist ein Grauwert und kein
Anzeige-Trick: Lasersoftware liest ihn als Leistung. 100 % brennt eine
Waldflaeche voll durch und deckt die halbe Karte zu — darum stehen die
Standardwerte bei 25 % (gruen) und 55 % (Wasser).

Zum Vergleich der Bestand: `md2_applyLasercutStyle()` im Bulk-Script reduziert
alles auf Haarlinie und transportiert die Funktion ueber die Strichfarbe — die
Zuordnung passiert dann von Hand im xTool Studio.

## Herkunft der Kartendaten

Geo-Mathematik, Layer-Filter und Clipping sind aus
`extendscript-bulk-processing/tools/fetch-vector-tiles.js` uebernommen, nicht
neu hergeleitet: die Werte sind dort an echten Drucken kalibriert.

Der Unterschied: das alte Werkzeug rechnet in Tile-Pixeln und macht per viewBox
wieder ein Mass daraus. Hier ist **Millimeter auf der Platte** das Ergebnis,
und das Layout gibt es vor.

Datendetail bleibt fest bei Tile-Zoom 14 (dichteste Stufe von
mapbox-streets-v8). Der eingestellte Zoom steuert nur den Ausschnitt.

## Tech-Stack

Next.js 15 (App Router) · TypeScript · Tailwind 4 · Mapbox Vector Tiles.
Kein Datenbank, kein Deployment. Port 3010.

```bash
cp .env.example .env.local   # MAPBOX_ACCESS_TOKEN eintragen
npm install && npm run dev
```

Der Token ist derselbe wie in
`extendscript-bulk-processing/shared/config-local.jsx`.

## Stand

Fertig: Formate (A5/A4/A3/30x30/frei), Rahmen, Kartenfeld, Textfeld, fuenf
Kartenebenen mit Rolle und Dichte, Live-Vorschau, SVG-Export in mm.

Offen:
- **Texte sind noch keine Pfade.** Sie stehen als `<text>` in der Datei, das
  Ergebnis haengt also an der Schrift, die die Lasersoftware findet. Fuer den
  Layout-Entwurf reicht es, fuer den Schnitt nicht.
- Formen (Herz, Kreis, Ellipse) als Clip-Asset.
- Hillshade. Wird es Flaechengravur, genuegt das Graustufen-PNG eingebettet —
  kein Image Trace noetig.
- Adresssuche (heute nur Lon/Lat).

## Umfeld

| Projekt | Rolle |
|---|---|
| `extendscript-bulk-processing` | heutige Produktion (Illustrator/InDesign), Quelle fuer Konturmatrix, Layer-Filter, Geo-Mathematik |
| `baseline-customizer` | Personalisierungs-Backend, rendert Schriftzuege bereits per Direktsatz; dorthin wandert die Engine, wenn das Konzept traegt |
| `print-pipeline` | zieht Orders, kennt den Lasercut-Kanon, dispatcht — **nicht** hier nachbauen |

Planungsgrundsatz:
`extendscript-bulk-processing/docs/laser-online-grundsatz.md`

## Konventionen

Code-Kommentare deutsch · Commits englisch (Conventional Commits) · Dateien
unter 200 Zeilen · diese Datei unter 100 Zeilen.
