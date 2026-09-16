# Schichtkarte – Amazon Custom

Alle Bilder zeigen dasselbe Beispiel: Köln Altstadt am Rhein, gerade von vorn aus dem 3D-Modell.
Grundeinstellung: Weiß auf Schwarz, ohne Rahmen, Maßstab 3,5 km, Straßennetz ausgewogen, Herz
mittel. In den Optionsbildern ändert sich jeweils nur die eine Option.

Jedes Format füllt seine Kachel. Zwischen A5, A4 und A3 ändern sich darum nur Layout und Details:
die Rahmenleiste ist bei allen Formaten gleich breit (14 mm) und wirkt auf A5 kräftiger als auf
A3, die Schrift sitzt etwas anders, und auf kleinen Formaten werden mehr Straßen graviert statt
geschnitten. Rahmen- und Maßstabsbilder gibt es darum je Format.

## 1 Vorschau ohne Text

Grundbild für die Live-Vorschau, ohne Titel und Zeilen: die legt Amazon aus den Kundeneingaben
darüber. Je Format ein Ordner mit 3 Designs x 5 Rahmen, 2000 x 2000 px, im Unterordner
400 x 400 px. Platte und Rahmen stehen je Format in jedem Bild an derselben Stelle, darum passen
die Textfelder zu jeder Rahmenwahl.

## Textfelder im Container 400 x 400 px

x/y = linke obere Ecke, alle Felder mittig. Weitere Angaben in `textfelder.md` und `textfelder.json`.

| Format | Feld | x | y | Breite | Höhe | Schriftgröße |
|---|---|---|---|---|---|---|
| DIN A5 | Titel | 102,2 | 258,5 | 195,6 | 63,3 | 40,6 px |
| DIN A5 | Namen oder Freitext | 102,2 | 327,4 | 195,6 | 8,7 | 9,3 px |
| DIN A5 | Letzte Zeile | 102,2 | 340,8 | 195,6 | 8,7 | 9,3 px |
| DIN A4 | Titel | 95,8 | 270,6 | 208,3 | 62,8 | 40,3 px |
| DIN A4 | Namen oder Freitext | 95,8 | 335,0 | 208,3 | 8,1 | 8,7 px |
| DIN A4 | Letzte Zeile | 95,8 | 346,5 | 208,3 | 8,1 | 8,7 px |
| DIN A3 | Titel | 91,4 | 269,9 | 217,2 | 63,1 | 40,5 px |
| DIN A3 | Namen oder Freitext | 91,4 | 336,3 | 217,2 | 8,1 | 8,7 px |
| DIN A3 | Letzte Zeile | 91,4 | 347,9 | 217,2 | 8,1 | 8,7 px |

Titel: Bacalisties, max. 20 Zeichen. Zeilen: Avant Garde Book, Versalien, Sperrung 0,14 em,
max. 30 Zeichen. Textfarbe: Weiß auf Schwarz und Schwarz mit weißem Rand #151515, Schwarz auf
Weiß #f6f5f1. Die Kontrollbilder zeigen die Felder rot über der gerenderten Schrift.

Zu beachten:
- Die Zeilen sind im Container knapp 9 px groß, so klein wie am Produkt. Stellt Amazon das
  unleserlich dar, im Feld eine größere Schrift eintragen; die Vorschau ist dann nicht maßstäblich.
- Lange Titel verkleinert die Produktion: 20 Zeichen Schreibschrift passen nur mit 55 bis 63 %.
  Amazon zeigt sie in voller Größe, dann laufen sie über das Feld hinaus.
- Bei „Ort + Koordinaten“ gehören die Koordinaten zur Zeile. Amazon kennt sie nicht; der Kunde
  tippt nur den Ort, dafür bleiben 8 bis 9 Zeichen.
- Bacalisties und Avant Garde Book müssen bei Amazon hinterlegt sein, sonst nimmt die Vorschau
  eine Ersatzschrift.

## 2 Optionen

Je Option ein Beispielbild, 1000 x 1000 px:
- Design: Weiß auf Schwarz, Schwarz auf Weiß, Schwarz mit weißem Rand (DIN A4)
- Format: DIN A5, A4, A3, jedes so groß wie möglich
- Rahmen: je Format ohne, Holz schwarz, Holz weiß, Eiche, Holz dunkelbraun
- Maßstab: je Format 1,5 / 2,5 / 3,5 / 5,5 / 9 km
- Straßennetz: viele Straßen geschnitten, ausgewogen, wenig geschnitten mit viel Gravur (DIN A4)
- Standort-Symbol: Herz, Haus, Standort-Pin, Kreuz als schräge Nahaufnahme, mit Leonardo als
  echtes Foto gerechnet
- Symbolgröße: klein, mittel, groß (Ausschnitt 7 x 7 cm um den Ort, die Größen sind vergleichbar)

Der Maßstab ist die Breite des Kartenausschnitts in der Wirklichkeit. Dieselbe Stufe zeigt darum
auf A5, A4 und A3 dieselbe Fläche von Köln. Was sich ändert, ist das Detail: auf der kleineren
Platte wären Straßen zu fein zum Schneiden und werden graviert (bei Straßennetz ausgewogen):

| Maßstab | DIN A5 | DIN A4 | DIN A3 |
|---|---|---|---|
| 1,5 km | alles geschnitten | alles geschnitten | alles geschnitten |
| 2,5 km | Wohnstraßen graviert | alles geschnitten | alles geschnitten |
| 3,5 km | Wohnstraßen graviert | Wohnstraßen graviert | alles geschnitten |
| 5,5 km | Wohnstraßen und Bahn graviert | Wohnstraßen graviert | Wohnstraßen graviert |
| 9 km | Wohnstraßen, Bahn und Tertiärstraßen graviert | Wohnstraßen und Bahn graviert | Wohnstraßen graviert |

Brücken über Wasser bleiben immer geschnitten, auch wenn ihre Straßenklasse graviert wird.

## 3 Erklärbild

Explosionszeichnung aus dem 3D-Modell, mit Leonardo als Studioaufnahme gerechnet und auf
2048 px hochskaliert. Einmal ohne, einmal mit Beschriftung (Material und Stärke je Lage),
der Holzrahmen als Fußnote.

## 4 Quadrat 30 x 30 (eigener Artikel)

Das Quadrat hat ein eigenes Layout (Titel und Zeilen in Reitern in der Karte) und steht darum
nicht im Konfigurator der Hochformate. Eigene Bilder: Vorschau ohne Text (3 Designs x 5 Rahmen),
Design, Rahmen, Maßstab und ein Kontrollbild. Die Reiter wachsen mit dem Text, feste Textfelder
gibt es nicht; `textfelder.md` nennt die Lage für den Beispieltext.

## Kosten

Erklärbild: 2 Generierungen und 1 Hochskalierung, etwa 0,13 $. Standort-Symbole: 6 Generierungen
(4 und 2 neue Versuche für Pin und Kreuz), etwa 0,23 $.

Erzeugt mit `laser-studio/scripts/amazon-custom/` (textfelder.ts, bilder.py, symbole.py, ordner.py).
