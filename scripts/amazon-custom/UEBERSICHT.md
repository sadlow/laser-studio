# Schichtkarte – Amazon Custom

Alle Bilder zeigen dasselbe Beispiel: Köln Altstadt am Rhein, gerade von vorn aus dem 3D-Modell.
Grundeinstellung: Weiß auf Schwarz, ohne Rahmen, Maßstab 3,5 km, Straßennetz ausgewogen.

Die Kartenbilder haben keinen Text und kein Symbol: Titel und Zeilen setzt der Amazon Customizer
aus den Kundeneingaben, Rahmen und Standort-Symbol legen sich als transparente Masken darüber.
Alle Bilder eines Formats sind deckungsgleich, eine Maske passt also auf jedes Kartenbild desselben
Formats. Das Symbol sitzt immer mittig: der Ort des Kunden liegt in der Mitte der Karte.

Jedes Format füllt seine Kachel. Zwischen A5, A4 und A3 ändern sich darum nur Layout und Details:
die Rahmenleiste ist bei allen Formaten gleich breit (14 mm) und wirkt auf A5 kräftiger als auf
A3, und auf kleinen Formaten werden mehr Straßen graviert statt geschnitten.

## 0 Hauptbild

Amazon-Hauptbild, 2048 x 2048 px auf reinweißem Grund: Köln, Weiß auf Schwarz, Holzrahmen schwarz, großes Herz.
Nur 15 Grad aus der Frontalen gedreht, damit die geschnittene Schrift lesbar bleibt und die Lagen trotzdem Tiefe
zeigen. Im Rhein liegt die Spiegelung einer Softbox, das Schwarz glänzt wie echtes Acryl, der Rahmen zeigt Maserung.
Die Alternative daneben spiegelt kräftiger (Herz und Rhein), wirkt aber etwas mehr nach Rendering.
Dieselbe Aufnahme gibt es in A3 (bei 3,5 km werden dort auch die Wohnstraßen geschnitten, das Netz ist feiner)
und in A4 mit „viele Straßen geschnitten“.
Leonardo legt das Produkt auf Hellgrau, sobald Softboxen im Prompt stehen; `weissgrund.py` hebt den Grund auf
genau 255 und lässt Produkt und Kontaktschatten unberührt.

## 1 Vorschau ohne Text

Grundbild für die Live-Vorschau je Format und Design, ohne Text, Rahmen und Symbol.
2000 x 2000 px, im Unterordner 400 x 400 px.

## 2 Optionen

Je Option ein Beispielbild, 1000 x 1000 px, ebenfalls ohne Text und Symbol:
- Design: Weiß auf Schwarz, Schwarz auf Weiß, Schwarz mit weißem Rand (DIN A4)
- Format: DIN A5, A4, A3, jedes so groß wie möglich
- Rahmen: je Format ohne, Holz schwarz, Holz weiß, Eiche, Holz dunkelbraun
- Maßstab: je Format 1,5 / 2,5 / 3,5 / 5,5 / 9 km
- Straßennetz: viele Straßen geschnitten, ausgewogen, wenig geschnitten mit viel Gravur (DIN A4)
- Standort-Symbol: Herz, Haus, Standort-Pin, Kreuz als schräge Nahaufnahme, mit Leonardo als
  echtes Foto gerechnet (als kleine Auswahlbilder gedacht)
- Symbolgröße: klein, mittel, groß (Ausschnitt 7 x 7 cm um den Ort, mit Symbol)

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

Brücken über Wasser bleiben sichtbar: wird eine Straße oder ein Gleis graviert, läuft die Gravur
auf einem schmalen Streifen der Hintergrundlage über das Wasser.

## 3 Masken transparent

PNG mit transparentem Grund, je Format 2000 x 2000 px und 400 x 400 px, deckungsgleich mit den
Kartenbildern:
- Rahmen: Holz schwarz, Holz weiß, Eiche, Holz dunkelbraun, mit transparenter Mitte und dem
  Schatten der Rahmenlippe auf dem Bild
- Standort-Symbol: Herz, Haus, Standort-Pin und Kreuz in klein, mittel und groß, mit Schatten.
  Beim Pin sieht man durch das Loch den Hintergrund – darum zwei Fassungen: schwarzes Loch für
  Weiß auf Schwarz, weißes Loch für Schwarz auf Weiß und Schwarz mit weißem Rand

Die Symbolgrößen folgen einer Reihe für alle Formate (6 / 8 / 11 / 15 / 21 mm): A4 klein, mittel,
groß = 8 / 11 / 15 mm, A3 eine Stufe größer, A5 eine kleiner.

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
Weiß #f6f5f1.

Zu beachten:
- Die Zeilen sind im Container knapp 9 px groß, so klein wie am Produkt. Stellt Amazon das
  unleserlich dar, im Feld eine größere Schrift eintragen; die Vorschau ist dann nicht maßstäblich.
- Lange Titel verkleinert die Produktion: 20 Zeichen Schreibschrift passen nur mit 55 bis 63 %.
  Amazon zeigt sie in voller Größe, dann laufen sie über das Feld hinaus.
- Bei „Ort + Koordinaten“ gehören die Koordinaten zur Zeile. Amazon kennt sie nicht; der Kunde
  tippt nur den Ort, dafür bleiben 8 bis 9 Zeichen.
- Bacalisties und Avant Garde Book müssen bei Amazon hinterlegt sein, sonst nimmt die Vorschau
  eine Ersatzschrift.

## 4 Explosionszeichnung

Fertige Listing-Bilder, je Design eins: die Explosionszeichnung aus dem 3D-Modell, mit Leonardo als
echte Aufnahme auf warmem, ruhigem Grund gerechnet und auf 2048 x 2048 px hochskaliert. Alle drei mit
derselben Kamera und demselben Grund, damit sie als Reihe zusammenpassen. Ohne Beschriftung und
Linien – die kommen im Listing Designer dazu.

Bei Schwarz auf Weiß sind die beiden kleinen Zeilen unter dem Titel nachträglich eingesetzt. Schräg
gesehen sind die feinen Buchstaben im schwarzen Acryl fast geschlossen, im 3D-Modell und bei Leonardo
fehlten sie darum. Am fertigen Stück stehen sie weiß auf Schwarz, lesbar sollen sie also auch im Bild
sein. Sie kommen aus der Frontansicht desselben Entwurfs und liegen perspektivisch genau auf der Platte.

## 5 Quadrat 30 x 30 (eigener Artikel)

Das Quadrat hat ein eigenes Layout (Titel und Zeilen in Reitern in der Karte) und steht darum
nicht im Konfigurator der Hochformate. Eigene Bilder: Vorschau ohne Text je Design, Design,
Rahmen, Maßstab und Masken. Die Reiter wachsen mit dem Text, feste Textfelder
gibt es nicht; `textfelder.md` nennt die Lage für den Beispieltext. Ohne Text fehlen auch die
Reiter: in der Vorschau ohne Text läge Amazons Titel direkt auf der Karte. Für eine Live-Vorschau
bräuchte das Quadrat Reiter in fester Größe.

## 6 Video

Video-Ads im Querformat, je 8 s, 1920 x 1080 px, ohne Ton:
- A4 und A3 – vom Herz zum ganzen Bild: Dollyzoom von der Nahaufnahme des Herzens am Rhein zurück bis zum
  Bild im schwarzen Rahmen auf Weiß. Start und Ende stammen aus derselben 3D-Kamera, nur verschieden gezoomt.
- Nahflug um das Herz: dicht und schräg über dem liegenden Bild, ein Bogen von 50 Grad um das Herz. Die
  erhabenen Straßen verschieben sich gegen die Lagen darunter, so sieht man die Tiefe.

Start- und Endbild kommen aus dem 3D-Modell und werden mit Leonardo fotoreal gerechnet; die Bewegung
dazwischen rechnet Veo 3.1 Fast. Erzeugt mit `laser-studio/scripts/listing-fotos/video.py`.

## Kosten

Hauptbilder: 8 Generierungen und 4 Hochskalierungen, etwa 0,51 $. Standort-Symbole: 6 Generierungen, etwa 0,23 $.
Videos: je Clip etwa 1,40 $ (Veo 1,20 $, dazu Standbilder und Hochskalierung), drei Clips zusammen etwa 4,17 $.
Explosionszeichnungen: je Design 1 Hochskalierung;
Weiß auf Schwarz im ersten Versuch, Schwarz auf Weiß im zweiten, weißer Rand im dritten. Zusammen
6 Generierungen und 3 Hochskalierungen, etwa 0,39 $ (dazu zwei frühere Fassungen mit Beschriftung,
zusammen 0,22 $).

Erzeugt mit `laser-studio/scripts/amazon-custom/` (textfelder.ts, bilder.py, masken.py, symbole.py,
erklaerbild.py, zeilen.py, ordner.py).
