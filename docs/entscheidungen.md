# Entscheidungen – Schichtkarte

Was man nicht am Code sieht, mit dem Messwert, der es begruendet. Neueste oben
je Abschnitt. Pruefskripte liegen unter `scripts/`.

## Aufbau und Lagen

- **Drei Aufbauten, eine Struktur** (`stapel.ts`). Netz-Lage (Rahmen + Strassen
  als Material, die Bloecke fallen heraus) ueber Hintergrund-Lage (Wasser
  geschnitten, feine Wege graviert) ueber Blau. Zwei dreilagige mit Text im Netz:
  `netz-weiss` (weiss-schwarz-blau) und `netz-schwarz-dreilagig`
  (schwarz-weiss-blau, Marcel 16.09.2026). Eine vierlagige: `netz-schwarz`
  (weiss-schwarz-weiss-blau), Positiv-Look des Posters mit weisser Deckschicht
  fuer Rahmen und Text. Die Bausteine (`lagen.ts`) sind fuer alle identisch.
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
- **Wasser schmaler als 1 mm wird nicht geschnitten** (`wasser.ts`, Oeffnen vor
  dem Beschnitt). Venedig: Hintergrund 107 -> 5 Teile, die Grachten Amsterdams
  (1,4-1,7 mm) bleiben.
- **Inseln unter 15 mm2 werden Wasser.** Berlin-Tiergarten: 18 Splitter, die
  meisten unter 3 mm2, jetzt 1 Hintergrundteil.

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
- **Mindestbreite im Netz 0,8 mm**, **kleine Bloecke (< 4 mm²) bleiben Material.**

## Oberflaeche (Marcel 16.09.2026)

- **Vollbild in drei Spalten:** links, was der Kunde spaeter selbst einstellt
  (Standort, Texte, Design mit Vorschaubild, Format, Strassenstufe, Symbol und
  Groesse), Mitte der Komposer, rechts Technik und Prototypenbau, aufklappbar.
- **Standort als Adresse oder Dezimal-Koordinaten** (Google-Format, auch mit
  deutschem Komma). Eingefuegte Koordinaten bleiben exakt; der Ortsname kommt
  aus der Rueckwaerts-Suche.
- **Kundeneingaben werden feldweise gemischt.** Zwei schnelle Klicks (Symbol,
  dann Groesse) schickten sonst je die ganze alte Kundeneingabe mit, und der
  zweite machte den ersten rueckgaengig.

## Ort, Ausschnitt, Symbol (`geo.ts`, `symbole.ts`, `zieh-vorschau.tsx`)

- **Standort-Symbol waehlbar:** Herz, Haus, Standort-Pin, X (wie beim Poster
  HERZ/KREUZ/PFEIL), klein/mittel/gross = 8/11/15 mm bei A4, mitwachsend. Der
  Anker sitzt auf dem Ort: Spitze bei Herz und Pin, Fussmitte beim Haus, Mitte
  beim X. Die Lage heisst nach dem Symbol, Material rotes Spiegelacryl.

- **Die Koordinaten zeigen den Symbol-Anker** (Marcel 16.09.2026: die
  Herzspitze), nicht mehr die Herzmitte. `lon/lat` ist der Ort, `kartenMitte` die Mitte des Ausschnitts,
  wenn die Karte verschoben wurde. Neue Adresse oder Referenzort setzt die Mitte
  zurueck. Liegt der Ort ausserhalb des Ausschnitts, fehlt das Herz mit Warnung.
- **Gezogen wird auf der gerenderten Vorschau**, nicht in einer zweiten
  Mapbox-GL-Karte: man sieht, was geschnitten wird, und der Token bleibt auf dem
  Server. Beim Ziehen wird die letzte Vorschau verschoben gezeigt, gerechnet wird
  beim Loslassen.
- **Zoom mit Plus/Minus im Kartenfenster** (Marcel 16.09.2026: intuitiver als
  das Mausrad) in festen Stufen 0,8-12 km, rund 1,25-fach, 3,5 km liegt darauf.
  Bis neu gerechnet ist, zeigt die Vorschau die alte Karte skaliert. Das Rad
  zoomt nur noch mit Strg/Cmd oder als Trackpad-Pinch – sonst kaperte es das
  Scrollen der Seite ueber der grossen Vorschau.
- Umrechnung mm <-> Ort (`ortZuMm`, `mmZuOrt`) ist dieselbe Abbildung wie beim
  Kachelabruf: Karte 30 mm verschoben -> Herz 30,000 mm; Herz 20 mm tiefer ->
  357 m, 12 Bogensekunden in der Koordinatenzeile.
- Rechenzeit waechst mit dem Ausschnitt: Berlin 3,5 km 0,6 s, 5,5 km 1,6 s,
  8,6 km 5,3 s.

## Layout

- **Poster-Masse je Format** (`poster-masse.ts`), vermessen an den Mustern
  `Familienposter/8 Zuhause Map/Musterdaten/<Format>` (A4 bei 300 und 600 dpi
  auf 0,05 mm gleich, `poster-abgleich.ts`). Die InDesign-Vorlagen sind nicht
  skaliert, jedes Format hat eigene Werte (Anteil der Plattenhoehe):
  A5 Karte 65,85 %, Titel 7,65 % / Mitte 72,84, Zeilen 1,995 % / 87,97 / 91,86;
  A4 68,0 %, 7,40 % / 75,64, 1,825 % / 89,09 / 92,36;
  A3 67,7 %, 7,30 % / 75,00, 1,795 % / 88,73 / 91,96.
  Titel aus Hoehe und Breite der Tintenbox unabhaengig bestimmt (A4 21,97 und
  21,98 mm). Die Schaetzung am schraegen Listing-Foto lag 5-7 % zu klein.
- **Das Format bringt seine Poster-Masse mit**, Schriften und Sperrung bleiben.
  "Auf Standard zuruecksetzen" im Layout stellt alles wie gemessen wieder her
  (Marcel 16.09.2026). Quadrat und freie Formate nehmen A4.
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
- **Innenflaechen unter 0,8 mm Breite werden zugefuellt.** 1,0 mm (aus der
  Demi-Zeit, A4 Demi: ° 0,97 mm) machte bei A5 aus dem Gradzeichen einen
  ausgeschnittenen Punkt ohne Innenkreis (Marcel 16.09.2026). In Book: ° innen
  A5 0,97 mm, Prototyp 145 x 205 0,95, A4 1,38. Irrwege davor: eine mm²-Grenze
  (zerteilte auf A3 das Gradzeichen), ein Anteil der Versalhoehe (machte
  Schreibschrift-Schleifen schwarz) (`inseln-titel.ts`).

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

## Dichte vor Ort (`dichte.ts`, `netz.ts`, Referenzorte)

- **Referenzorte statt nur Berlin** (`src/referenzorte.ts`, im Studio anklickbar,
  `referenzorte.ts` rechnet alle mit Kennzahlen): Berlin, Allgaeu, Hamburg,
  Amsterdam, New York, Bogota, Tokio, Venedig. Grenzwerte muessen weltweit tragen
  (Marcel 16.09.2026).
- **Breite folgt der Dichte, nicht dem Ausschnitt.** Deckung = Strassenlaenge x
  Vorlagenbreite / Land im Fenster; alle Netzbreiten werden auf 33 % skaliert
  (Berlin-Tiergarten 3,5 km, fuer das die Breiten entworfen sind, bleibt
  unveraendert). Die alte Regel steckt darin: doppelter Ausschnitt, doppelte
  Laenge auf der Platte. Gemessen bei 3,5 km: Kreuzberg 33 %, Maxvorstadt 35,
  Prenzlauer Berg 39, Paris 45, Hamburg 49, Bogota 50, London/Koeln 60,
  Tokio 64, New York 75, Allgaeu 7, Venedig 3.
- **Erst werden die Hauptstrassen schmaler, dann die Wohnstrassen graviert.**
  Aufdicken bis 1,4: Hamburg, Bogota, Paris behalten ihre Wohnstrassen; Tokio,
  New York, Amsterdam, Koeln, London gravieren sie. Bei 1,25 verloren Koeln und
  New York bei 6 km auch die Bahn (17 Orte x 2/3,5/6 km, Simulation).
- **Lichte Orte: Gravurklassen ruecken nach** (Zufahrten, Fussgaengerzonen,
  Feldwege), erst unter der halben Zieldeckung und bis 10 % darueber. Allgaeu
  6 -> 12 % Netz. Liegt danach mehr als 10 % der Netzflaeche lose, bleibt es bei
  der Gravur: Venedigs Gassen bei 2 km (Bruecken sind Fusswege) 78 %.
- **Drei Stufen fuer den Kunden statt eines Reglers** (Marcel 16.09.2026: viel
  geschnitten / ausgewogen / wenig geschnitten, viel Gravur). Die Wahl steht in
  der Kundeneingabe, die Bedeutung in der Vorlage: viel 42 % / Aufdicken 2 /
  Nachruecken immer, ausgewogen 33 % / 1,4 / licht, wenig 26 % / 1 / nie.
  Netz im Fenster bei 3,5 km: Berlin 27/22/16 %, Hamburg 23/18/12, Bogota
  30/25/18, Tokio 32/15/12, Allgaeu 11/11/8. Rechenzeit A4 hoechstens 1,2 s –
  live ohne Aktualisieren-Knopf.
- **Lose Netzstuecke werden graviert statt geschnitten** (Marcel 16.09.2026:
  "meist nur Artefakte"). Vorher 1-13 mm2 gross, orange markiert; Ursache meist
  Anschluss nur ueber Fussweg, Treppe oder Tunnel. Stege zu nahen Stuecken
  waeren die Alternative, bisher nicht gebaut.
- **Textreiter zaehlen zur Landflaeche** – die Strassen darunter stecken in den
  Laengen. Sonst Quadrat 38 statt 33 %.
- Das Bild wird in Megastaedten lichter als in Berlin (Tokio 15, New York 13 %
  Netz): die Deckung zaehlt parallele Fahrbahnen und Hochstrassen doppelt.
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
- Materialbedarf je Exemplar: weisses Netz und schwarzes Netz dreilagig je
  1 weiss / 1 schwarz / 1 blau,
  schwarzes Netz 2 weiss / 1 schwarz / 1 blau (Stand Lager 16.09.2026: je 2 A4 in
  weiss, schwarz, blau und je 1 x 30x30 – reicht fuer 4 A4-Prototypen dreilagig
  oder 2 vierlagig, das Quadrat nur dreilagig).
