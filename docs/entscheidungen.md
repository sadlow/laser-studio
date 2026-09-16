# Entscheidungen – Schichtkarte

Was man nicht am Code sieht, mit dem Messwert, der es begruendet. Neueste oben
je Abschnitt. Pruefskripte liegen unter `scripts/`.

## Aufbau und Lagen

- **Zwei Aufbauten, eine Struktur** (`stapel.ts`). Netz-Lage (Rahmen + Strassen
  als Material, die Bloecke fallen heraus) ueber Hintergrund-Lage (Wasser
  geschnitten, feine Wege graviert) ueber Blau. `netz-weiss`: Netz weiss,
  Hintergrund schwarz, Texte im Netz. `netz-schwarz`: Netz schwarz, Hintergrund
  weiss (Positiv-Look des Posters), darueber weisse Deckschicht mit Rahmen und
  Text. Die Bausteine (`lagen.ts`) sind fuer beide identisch.
- **Unter Bruecken wird der Hintergrund nicht geschnitten.** Er haelt dann ueber
  die Bruecke zusammen, statt am Fluss zu zerfallen.
- **Unter Texten kein Wasser, keine Gravur**, im schwarzen Netz volles Material –
  sonst helle Striche in den Buchstaben und keine Klebeflaeche.
- **Gravur nie unter dem Netz, nie ueber Wasser.** Unter dem Netz unsichtbar:
  A4 Berlin 15,0 m auf 10,4 m Gravurweg, 160 ms.
- **Gehwege, Ueberwege, Einfahrten, Parkplatzgassen werden nicht gezeichnet**
  (`WEGETYPEN_OHNE`, `kacheln.ts`). Anteil an allen Nebenwegen in drei
  Stadtkacheln: Gehwege 32,5 %, Einfahrten 6,7 %, Ueberwege 2,3 %, Gassen 1,7 %.
  Gehwege lagen als dicke Doppellinie neben jeder Hauptstrasse.
- **Tunnel nie, Bruecken immer.** Berlin-Tiergarten: 21 Tunnelstuecke.

## Exportdateien (`produktion.ts`)

- **Drei benannte Ebenen in Bearbeitungsreihenfolge:** 1 Gravur (Flaeche,
  schwarz), 2 Schnitt innen (rot), 3 Schnitt aussen (blau, zuletzt – sonst
  verschiebt sich die Platte vor den Innenschnitten). Namen als id, data-name
  (Illustrator) und inkscape:label; Farben nach LightBurn-Palette.
- **Gravur als gepufferte Flaeche, nicht als Strich.** Die SVG-Strichbreite
  uebernimmt Lasersoftware nicht zuverlaessig. Kostet 1,6 s je Lage, darum nur
  im Export; die Live-Vorschau zeichnet dieselben Linien als Strich.
- **Jeder Schnittring ein eigener Pfad** – keine zusammengesetzten Pfade mit
  Fuellregel in Schnittebenen.
- **Parameter liegen jedem Export bei** (`parameter.json`), damit ein Prototyp
  exakt nachbaubar bleibt, auch wenn die Vorlage weiterentwickelt wurde.

## Vorlagen (`src/server/vorlagen.ts`, `vorlagen/*.json`)

- **Vorlage = Produkt, Kundeneingabe = Bestellung.** Eine Vorlage enthaelt alles
  ausser `kunde`, `lon`, `lat`. Dieselbe Trennung braucht spaeter der Shop.
- JSON im Repo statt Datenbank: versioniert, von anderen Systemen lesbar.

## Massstab und Formate

- **Ausschnitt in km statt Zoom.** A3 zeigt denselben Kiez wie A5, nur groesser.
  Strassenbreiten und Herz gelten fuer A4 und wachsen mit
  (`REFERENZ_KARTENBREITE_MM`). Fest bleiben Rahmen (Falz) und Stege. Ergebnis:
  22-24 % Netz im Fenster auf allen Formaten.
- **Ausschnitt entscheidet die Dichte.** A4: 2 km 13 %, 3,5 km 22 %, 6 km 37 %
  mit 5 losen Netzstuecken (`ausschnittvergleich.ts`).
- **Mindestbreite im Netz 0,8 mm**, **kleine Bloecke (< 4 mm²) bleiben Material.**

## Layout

- **Poster (A-Formate), Richtwert A4:** Anteile der Plattenhoehe, vermessen am
  A4-Muster des Posters (`Familienposter/8 Zuhause Map/Musterdaten/A4`, 300 und
  600 dpi auf 0,05 mm gleich, `poster-abgleich.ts`). Karte endet 68,0 %, Titel
  Bacalisties 7,40 % Versalhoehe mit Mitte 75,64 %, Zeilen 1,825 % (5,42 mm)
  mit Mitte 89,09 % und 92,36 %. Titel aus Hoehe und Breite der Tintenbox
  unabhaengig bestimmt: 21,97 und 21,98 mm. Die Schaetzung am schraegen
  Listing-Foto lag 5-7 % zu klein und 3,5 mm zu hoch.
- **Koordinaten mit ‘ und “** wie auf dem Poster: InDesign macht aus ' und "
  typografische Zeichen. Nur damit trifft die zweite Zeile die Posterbreite.
- **Quadrat = eingebettet** (`ecken.ts`). Zeilen mit gleichem Anker stehen
  uebereinander wie auf der DIN-Version, jeder Block in einem abgerundeten
  Reiter mit ausgerundetem Uebergang zum Rand. Die Kontur um die Buchstaben
  bleibt waehlbar, wirkte aber unruhig; drei Texte in drei Ecken ebenso.
  Positioniert nach Umriss. Der Reiter waechst mit dem Text, mittige Bloecke
  bis 70 % der Kartenbreite.
- Beruehren sich Zeilen, meldet die Engine es – das haengt am Kundentext.

## Stencil (`stencil.ts`)

- **Stege am hoechsten und tiefsten Punkt jeder Innenflaeche**, hoechstens
  0,5 mm, nie breiter als der halbe Strich (Direktsatz: `STEG_ANTEIL_STRICH`),
  mindestens 0,3 mm. 0,7 mm wirkte bei Demi (Strich 0,93 mm) wie eine Luecke.
- **Innenflaechen unter 1,0 mm Breite werden zugefuellt.** Irrwege davor: eine
  mm²-Grenze (zerteilte auf A3 das Gradzeichen), ein Anteil der Versalhoehe
  (machte Schreibschrift-Schleifen schwarz). A4 Demi: ° 0,97 mm, obere 8 1,07,
  A 1,16 (`inseln-titel.ts`).

## Schrift

- **Die Sperrung 0,14 ist eine Zugabe, das Poster hat keine.** ExtraLight ohne
  Sperrung trifft die Namenbreite auf 0,01 mm; luftig wirkt es durch den duennen
  Strich. Book 0,14 laeuft bei gleicher Versalhoehe 27-32 % breiter (A4:
  Namen 84 statt 66 mm, Koordinaten 133 statt 100 mm). Marcel mag die Luft.
- **Avant Garde Book** – nicht ExtraLight (Poster), nicht Demi.
  Strich bei 5 mm Versalhoehe: ExtraLight 0,20 / Book 0,50 / Demi 0,93 / Bold
  1,36 mm (`strichstaerke.ts`). ExtraLight: die beiden Schnittkanten eines Strichs
  fielen bei 0,1-0,2 mm Schnittfuge praktisch zusammen. Demi war zuerst Standard,
  wirkte aber technisch statt edel, die Stege fielen auf. **Die Deckschicht ist
  2 mm stark** (Marcel 16.09.2026) – ein 0,5-mm-Schlitz loest sich dort sauber.
  Die Stege landen bei Book auf der Untergrenze 0,3 mm; ob sie bis zum Verkleben
  halten, zeigt der Probeschnitt (`schriftvergleich.ts`).
- **opentype.js ist gepatcht** (`patches/`, `postinstall`): CFF-Encoding mit
  Zusatzbit (Format 129) warf einen Fehler, betroffen AvantGardeCE-Demi.otf.

## Generalisierung (`lagen.ts`, `ausschnittFaktor`)

- **Strassenbreite folgt dem Ausschnitt** (Exponent 1: doppelter Ausschnitt,
  halbe Breite), hineinzoomen hoechstens 1,4-fach. Eine Netzklasse, die mehr als
  25 % aufgedickt werden muesste, um schneidbar zu sein, wird graviert statt
  geschnitten. A4 Berlin: 2 km 17 % Netz, 3,5 km 22 %, 6 km 15 % (Wohnstrassen
  graviert), 9 km 11 % (Tertiaer, Bahn, Wohnstrassen graviert) – ueberall 0 lose
  Netzstuecke. Ohne Regel: 6 km 37 % mit 5 losen Stuecken.
- Das Bild wird beim Herauszoomen lichter, nicht gleich dicht: weniger Klassen
  werden geschnitten. Gewollt – ein Netzstreifen unter der Mindestbreite ist
  nicht verhandelbar.
- **Vorlagen werden beim Laden mit den Standardwerten aufgefuellt** – neue
  Parameter fehlen in aelteren Dateien, und die Engine braeche sonst ab.

## Prototyp-Platten (`src/server/bogen.ts`)

- **Testreihe statt Einzelexport:** eine Vorlage, je Platz ein anderer Wert fuer
  genau einen Parameter (Ausschnitt oder Stegbreite), je Material eine Datei mit
  allen Exemplaren nebeneinander.
- **A4 traegt zwei Prototypen 145 x 205 mm**, nicht zwei A5: 2 x 148 mm
  brauchen 296 von 297 mm, und 210 mm Hoehe laegen exakt auf der Plattenkante.
  Mit 2,5 mm Rand und 2 mm Abstand bleibt das A-Seitenverhaeltnis (98 % von A5).
- **30 x 30 traegt einen Prototyp 296 x 296 mm** – aus demselben Grund mit Rand.
- Materialbedarf je Exemplar: weisses Netz 1 weiss / 1 schwarz / 1 blau,
  schwarzes Netz 2 weiss / 1 schwarz / 1 blau (Stand Lager 16.09.2026: je 2 A4 in
  weiss, schwarz, blau und je 1 x 30x30 – reicht fuer 4 A4-Prototypen mit weissem
  Netz oder 2 mit schwarzem, das Quadrat nur mit weissem Netz).
