# Entscheidungen – Schichtkarte

Was man nicht am Code sieht, mit dem Messwert, der es begruendet. Neueste oben
je Abschnitt. Pruefskripte liegen unter `scripts/`.

## Aufbau und Lagen

- **Drei Aufbauten, eine Struktur** (`stapel.ts`). Netz-Lage (Rahmen + Strassen als Material, die Bloecke
  fallen heraus) ueber Hintergrund-Lage (Wasser geschnitten, feine Wege graviert) ueber Blau. Zwei
  dreilagige mit Text im Netz: `netz-weiss` (weiss-schwarz-blau) und `netz-schwarz-dreilagig`
  (schwarz-weiss-blau, Marcel 16.09.2026). Eine vierlagige: `netz-schwarz` (weiss-schwarz-weiss-blau),
  Positiv-Look des Posters mit weisser Deckschicht fuer Rahmen und Text. Die Bausteine (`lagen.ts`) sind fuer alle identisch.
- **Das Standort-Symbol wird auf den Hintergrund geklebt** (die Lage auf dem
  Wasser) und steht 1 mm ueber das Netz hinaus – schoener als vertieft auf Blau,
  wie zuerst geplant (Marcel 16.09.2026). Klebeflaeche: die Symbolform 0,3 mm nach innen als
  Flaeche graviert, angeraut fuer den Kleber (17.09.), Pin-Loch ausgespart. Unter dem Symbol kein
  Wasserschnitt (Test: Herz zu 70 % ueber der Spree, Klebeflaeche voll). Netz und
  Deckschicht haben exakt die Aussenkontur als Ausschnitt (Pin ohne sein Loch).
- **Staerken nach Lage:** glaenzendes Acryl 2 mm (weisse Lagen und ein schwarzes Netz), der schwarze Grund 3 mm Frost
  (matt), Spiegelacryl 3 mm. Schwarz war bis 18.09.2026 glaenzendes XT in 2 mm – die Gravur darauf wurde glasig-grau
  statt weiss. Gegossenes GS graviert frostig weiss, schwarz gibt es das aber erst ab 3 mm; Marcel nimmt schwarzes
  Frost-Acryl (nur 3 mm), das heller graviert. Folge: das Wasser liegt 3 mm tief (kleine Wasserflaechen wirken dunkler,
  hellerer Spiegel wird gesucht). Ist Schwarz das Netz, wird darauf nicht graviert – es bleibt glaenzend 2 mm, und das
  Symbol steht weiter 1 mm vor (Marcel 19.09.2026). Die 3D-Ansicht zeigt Frost matt, die gelaserte Kante glaenzend.
- **Holzrahmen optional: Holz schwarz, weiss, dunkelbraun, Eiche** (Marcel 16.09.2026), ein Profil:
  14 mm breit, 28 mm tief, Bild 6 mm eingelassen, 4 mm Ueberstand; Wahl in `kunde`, Profil
  in der Vorlage. Bei 7 mm Rand bleiben 3 mm sichtbar (Kennzahl). Warnung, wenn Karte,
  Symbol oder Text unter den Rahmen reichen oder der Stapel nicht in den Falz passt.
- **Unter Texten kein Wasser, keine Gravur**, im schwarzen Netz volles Material –
  sonst helle Striche in den Buchstaben und keine Klebeflaeche.
- **Gravur nie unter dem Netz, nie ueber Wasser** (unter dem Netz unsichtbar: A4 Berlin 15,0 m auf 10,4 m Gravurweg, 160 ms).
- **Gehwege, Ueberwege, Einfahrten, Parkplatzgassen werden nicht gezeichnet**
  (`WEGETYPEN_OHNE`): Gehwege 32,5 % aller Nebenwege in drei Stadtkacheln, als
  Doppellinie neben jeder Hauptstrasse; Einfahrten 6,7, Ueberwege 2,3, Gassen 1,7.
- **Tunnel nie, Bruecken immer** (Berlin-Tiergarten: 21 Tunnelstuecke). Unter Bruecken kein Wasserschnitt, der Hintergrund haelt
  ueber sie zusammen. **Eine Bruecke zeigt sich in der Lage ihres Wegs** (`bruecken.ts`, Marcel 17.09.2026): gravierte Strassen und
  Gleise behalten sie als Streifen Hintergrund, die Gravur laeuft darueber (Koeln „wenig“: Hohenzollernbruecke). Nicht fuer Fuss- und
  Radwege (Stege, Anleger: Hamburg), nur Ufer zu Ufer, keine, die Wasser unter 6 mm² abtrennt; Gleise auf Strassenbruecken gehoeren dazu.
- **Wasser schmaler als 1 mm wird nicht geschnitten** (`wasser.ts`, Oeffnen vor
  dem Beschnitt). Venedig: Hintergrund 107 -> 5 Teile, die Grachten Amsterdams
  (1,4-1,7 mm) bleiben.
- **Inseln unter 15 mm2 werden Wasser.** Berlin-Tiergarten: 18 Splitter, meist unter 3 mm2, jetzt 1 Hintergrundteil.

## Exportdateien (`produktion.ts`)

- **Vier benannte Ebenen in Bearbeitungsreihenfolge:** 1 Gravur (schwarz), 2 Klebeflaeche (gruen, immer Flaeche),
  3 Schnitt innen (rot), 4 Schnitt aussen (blau, zuletzt – sonst verschiebt sich die Platte vor den Innenschnitten).
  Namen als id, data-name (Illustrator) und inkscape:label; Farben nach LightBurn-Palette.
- **Gravur waehlbar** (`gravurExport`, Marcel 16.09.2026: Liniengravur spart Laserzeit): Flaeche (gepuffert,
  wird gerastert), Mittellinie (einmal abfahren, Breite ueber Defokus) oder Kontur (Ringe im Strahlabstand bis
  zur Sollbreite). Berlin A4: 10,4 m Mittellinie, 18,3 m Kontur, 27 cm² Flaeche. Jeder Schnittring ein Pfad.
  Linien stehen als Haarlinie (0,1 mm) in der Datei, jeder Pfad traegt seinen Stil selbst (17.09.: mit der Sollbreite als
  Strich sah die Gravurprobe wie eine Flaechengravur aus; wer Gruppenstile nicht erbt, fuellt offene Linien).
- **Liniengravur mit Defocus 6 mm, Standard im Export** (Gravurprobe 17.09., Marcel: 4 mm filigraner, 6 mm deutlicher;
  18.09.: der erste Export kam als Flaeche, "meine normale Mittellinien-Defokus-Gravur"). Linienbreite 0,5 mm angenommen,
  noch nicht gemessen. **Durchgehende Wege**
  (`wege.ts`): jeder Start und Stopp brennt tiefer ein – an einer Kreuzung endeten 14 Linien, im Weiss fast ein Loch.
  Doppelte Kanten raus, an Knoten die geradesten Fortsetzungen (bis 45°) verbinden, Stichenden an Kreuzungen um die halbe
  Linienbreite kuerzen. Probe-Ausschnitt: 211 -> 140 Wege, meiste Enden an einer Stelle 14 -> 3; ganze Karte 20 -> 5.
- **Ein Exportknopf fuer die Eingabe links** (17.09.: die Auswahl von Testexemplaren ergab keinen Sinn); Parameter liegen bei.
  Ueber dem Knopf steht, was exportiert wird; Vorlagen haben einen eigenen Block – daneben sah „Vorlage waehlen, Laden"
  wie ein Pflichtschritt vor dem Export aus (Marcel 17.09.2026).

## Vorlagen (`src/server/vorlagen.ts`, `vorlagen/*.json`)

- **Vorlage = Produkt, Kundeneingabe = Bestellung.** Eine Vorlage enthaelt alles
  ausser `kunde`, `lon`, `lat`, `kartenMitte`. JSON im Repo: versioniert, lesbar;
  beim Laden mit Standardwerten aufgefuellt (neue Parameter).

## Massstab und Formate

- **Ausschnitt in km statt Zoom.** A3 zeigt denselben Kiez wie A5, nur groesser. Strassenbreiten und Herz
  gelten fuer A4 und wachsen mit (`REFERENZ_KARTENBREITE_MM`). Fest bleiben Rand und Stege. Ergebnis:
  22-24 % Netz im Fenster auf allen Formaten.
- **Mindestbreite im Netz 0,8 mm**, **kleine Bloecke (< 4 mm²) bleiben Material**, **schmaler als 0,5 mm bleibt
  Material** (`netzMinSpaltMm`, 19.09.2026: Bloecke um den halben Spalt geoeffnet; was dabei wegfaellt – Keile am Rahmen,
  Spalte zwischen eng laufenden Strassen, Spitzen spitzer Bloecke – geht ins Netz; die Blockecken runden sich dabei um
  0,25 mm). **Netzstrassen enden nicht knapp vor dem Rahmen** (`randanschluss.ts`): Sackgassen oder Strassen, die als
  Fussweg, Zufahrt oder im Tunnel weiterlaufen, hingen mit einer Kuppe 0,2-4 mm vor dem Rahmen und waren durch einen
  schmalen Schnitt von ihm getrennt (Marcel 19.09.). Zeigt das Ende auf den Rand (bis 60°), laeuft die Strasse bis in den
  Rahmen; bleibt weniger als 1 mm Luft, fuehrt ein kurzes Stueck senkrecht hin. Tiergarten A5: 4 Anschluesse, ein loses
  Netzstueck weniger; Rechenzeit +0,2-0,6 s. Vorher: A5 „viel", Goerzallee 3 km: 39 Bloecke zugefuellt, 64 von 256 geschnittenen ueberall schmaler
  als 0,5 mm; Zufahrten ruecken mit 0,8 mm nach und laufen zusammen. **Grenzwert-Testblatt** (`testblatt.ts`, 17.09.):
  Spalt 0,3-1,5, Strasse 0,4-1, Keil 5°/10°, Bloecke 1-6 mm² in 2-mm-Acryl. **Ergebnis in Weiss** (Foto 17.09.):
  Spalt offen ab 0,5 (0,4 und 0,3 nicht durchgehend offen, Rand verschmolzen); Strasse gerade ab 0,5 (0,4 verzieht sich
  stark); Keile offen bis zur Spitze – das Stueck faellt am breiten Ende heraus; Bloecke fallen ab 1 mm² heraus.
  Gravur auf Weiss kaum lesbar -> `gravurprobe-weiss.ts`: Liniengravur mit Defocus 1/2/3, Flaechengravur zum Vergleich,
  Beschriftung geschnitten. Grenzen im Code noch nicht uebernommen.

## Oberflaeche (Marcel 16.09.2026)

- **Rechnet die Vorschau, wird sie unscharf** und zeigt ein Ladezeichen mit „Abbrechen" (19.09.2026). Abbrechen laesst
  den letzten Stand stehen, „Neu berechnen" holt die Rechnung nach. Eine neuere Eingabe bricht die laufende ab. Die
  Engine hoert am naechsten Haltepunkt auf (`abbruch.ts`, zwischen Kacheln, Wasser, Netz und Lagen): bei 6 km etwa
  0,5 s nach dem Abbruch statt nach dem ganzen Lauf.
- **Kachel- und Schriftspeicher am globalen Objekt:** der Entwicklungsserver laedt Module bei jeder Codeaenderung neu
  und behielt jede alte Kopie – nach drei Tagen 6 GB, er antwortete nicht mehr (19.09.2026).
- **Drei Spalten:** links, was der Kunde einstellt (Standort bis Symbolgroesse), Mitte der Komposer, rechts Technik, aufklappbar.
- **Standort als Adresse oder Dezimal-Koordinaten** (Google-Format, auch mit Komma), Ortsname per Rueckwaertssuche.
- **3D-Reiter** (`ansicht-3d.tsx`, `buehne-3d.ts`, `szene-3d.ts`): Lagen mit Staerke extrudiert, Holzrahmen mit Gehrung, drehbar,
  gezeichnet nur bei Aenderung. Acryl hochglaenzend, das Blau spiegelt echt und dunkel (`Reflector`, Softboxen nur im Spiegelbild).
  Lichtstimmungen (`licht-3d.ts`): Studio, Sonne durch Blaetter, Sonne durchs Fenster (SpotLight mit Maske, neutral statt gelb);
  Licht und Raum drehen mit der Kamera, Ziehen wirkt wie das Produkt wenden (`?drehen=`).
- **Nach den ersten A5-Karten abgeglichen** (Fotos 19.09.2026, jede Farbe gegen das weisse Acryl daneben gemessen):
  Eiche heller Naturton mit dichten, geraden, unterbrochenen Porenstreifen (vorher glatt und gelblich wie Kiefer; im
  Render 0,87/0,66/0,48 von Weiss, Foto 0,85/0,66/0,50; die 2D-Vorschau hellt die unbeleuchtete Textur auf den Fototon
  auf). Gravur ist eine Rille, samt Waenden etwa 0,4-0,45 mm (dunkler Kern 0,2-0,25) – die 0,5 mm Strahl stimmen
  ungefaehr. Auf Weiss grauer Kern, obere Wand im Schatten, gut lesbar; auf schwarzem Frost dunkler Grund, nur die
  untere Wand hell – von weitem kaum heller als die Flaeche (vorher hellgrau, viel zu kraeftig). Frost ist Anthrazit,
  nicht Tiefschwarz. Als Mittellinie zeichnen 2D und 3D jede Gravurlinie so breit wie der Strahl, nicht nach
  Strassenklasse (`sichtbareGravur`). Offen: das glaenzende schwarze Netz spiegelt am Foto hellgrau, im 3D bleibt es schwarz.
- **Explosionszeichnung** (17.09., `explosion-3d.ts`): Regler 0-200 mm, Kamera und Licht folgen der Stapelmitte. Hintergrund
  warm, grau oder dunkel (auf Hell verschwanden die weissen Lagen); aufgezogen zeigt das Blau Farbe statt Spiegelflecken. Keine
  Beschriftung: Texte und Linien setzt Marcel im Listing Designer, geliefert werden fertige Bilder. Einstellungen in der URL.
- **Motive fuer KI-Produktfotos** (`motive-3d.ts`, `aufnahme-3d.ts`, `referenzbilder.sh`): `?ansicht=3d&foto=wand|flach|
  symbol|titel|wasser|kante|layout|explosion&vollbild=1&entwurf={json}`, dazu `zoom`, `versatz`, `grund`, `frontal`,
  `umgebung`, `spiegel`, `abstand`, Schatten- und Softbox-Schalter. Listing-Set `scripts/listing-fotos/` (Leonardo 1K,
  Referenz HIGH, `prompt_enhance: OFF`). Gelernt: Wandschatten wurde Standfuss, Softbox im Spiegel Glasplatte oder weisses
  Wasser (Nahaufnahmen `softboxen=0`), schraeg nebeneinander Escher-Bild (frontal auf gezeichneter Kommode), Paris 3,5 km
  zu dicht (2 km). Nahaufnahmen: wenig Staub in den Prompt, keine Fussel (wurden ein Haar), dann Ultra 2x. Stege in Szenen zeichnet
  das Bildmodell nicht (`schrift_einsetzen.py`). Kamera-near 50 mm in Motiven: bei 1 mm fehlte ab 2 m Abstand die Gravur.
- **Amazon Custom** (`scripts/amazon-custom/`, `amazon-container.ts`): Container 400 px = Platte + 10 mm Rahmenzugabe je Seite
  x 1,06, auch ohne Rahmen; Textfelder aus Layoutwerten und Schriftmassen. Karten ohne Text und Symbol, Rahmen und Symbol als
  transparente Masken (`?nur=`, Aufnahmen vor Schwarz/Weiss), Symbol mittig. Jedes Format fuellt die Kachel, Rahmen und Massstab je
  Format; Quadrat eigener Artikel. Explosion je Design, gleiche Kamera, Leonardo; Zeilen auf Schwarz aus der Frontansicht (`zeilen.py`).
- **Kundeneingaben werden feldweise gemischt** (zwei schnelle Klicks hoben sich sonst auf).

## Ort, Ausschnitt, Symbol (`geo.ts`, `symbole.ts`, `zieh-vorschau.tsx`)

- **Standort-Symbol waehlbar:** Herz, Haus, Standort-Pin, X (wie beim Poster HERZ/KREUZ/PFEIL). Groessen als eine Reihe
  6/8/11/15/21/29 mm (17.09.): A4 klein/mittel/gross = 8/11/15, A3 eine Stufe hoeher, A5 eine tiefer – 5 statt 9 Groessen
  je Symbol fuer A5 bis A3. Anker auf dem Ort: Spitze bei Herz und Pin, Fussmitte beim Haus, Mitte beim X. Die Lage
  heisst nach dem Symbol, Material rotes Spiegelacryl.
- **Die Koordinaten zeigen den Symbol-Anker** (Marcel: die Herzspitze). `lon/lat`
  ist der Ort, `kartenMitte` die Mitte eines verschobenen Ausschnitts; zurueck auf den
  Ort: neue Adresse, Referenzort oder Knopf "Standort zentrieren" im Kartenfenster.
- **Gezogen wird auf der gerenderten Vorschau**, nicht in einer zweiten Mapbox-GL-Karte: man sieht, was
  geschnitten wird, und der Token bleibt auf dem Server. Beim Ziehen die letzte Vorschau verschoben, gerechnet beim Loslassen.
- **Zoom mit Plus/Minus im Kartenfenster** (Marcel 16.09.2026) in festen Stufen
  0,8-12 km, rund 1,25-fach. Bis neu gerechnet ist, zeigt die Vorschau die alte
  Karte skaliert. Das Rad zoomt nur mit Strg/Cmd oder als Trackpad-Pinch – sonst
  kaperte es das Scrollen der Seite.
- `ortZuMm`/`mmZuOrt` rechnen wie der Kachelabruf (Karte 30 mm verschoben -> Symbol
  30,000 mm). Rechenzeit Berlin 3,5 km 0,6 s, 5,5 km 1,6 s, 8,6 km 5,3 s.

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
- **Titel hoechstens 20 Zeichen, jede Zeile darunter 30** (Marcel 16.09.2026, `zeichen.ts`), gezaehlt wie
  auf dem Poster: Koordinaten zaehlen mit, dem Ort bleiben 8-9 Zeichen. Felder mit Zaehler, zu lange
  Entwuerfe nur als Warnung. 20 Zeichen Schreibschrift: 54-63 % Groesse (voll passen rund 11). Beruehren
  sich Zeilen, meldet die Engine es – das haengt am Kundentext.

## Stencil (`stencil.ts`, `stencil-schreib.ts`, `sonderzeichen.ts`)

- **Stege wie in gezeichneten Stencil-Schriften** (18.09.2026): gerade Rechtecke von 0,7 mm. B, D, P, R und 4 am
  Stamm entlang (oben und unten), das A schraeg am rechten Schenkel wie Oswald Stencil (die Spitze zu spalten liess
  Haarsplitter), runde Punzen senkrecht oben und unten, naechst der Mitte, wo der Steg nur eine Wand quert – bei 6
  und 9 nicht durch den Bogenansatz; ist die Punze dafuer zu eng (DIN), nimmt ein Seitensteg den Platz. Vorher
  sassen die Stege an den Scheiteln, und Engstellen wurden rund aufgebissen – Marcel 18.09.: „sieht am Bildschirm
  schon nicht gut aus".
- **Titel: Stege quer durch die duennste Wand** einer Schleife, senkrecht zum Strich, zwei je Schleife, mindestens
  ein Drittel des Umfangs auseinander. Die dicken Abstriche bleiben ganz; senkrechte Stege am Scheitel schnitten
  die schraegen Schleifen an wie Risse („Zuhmuze").
- **Schmale Innenflaechen bekommen einen Steg** statt zugefuellt zu werden (unter 0,8 mm, das & bei A5) – zugefuellt
  war es ein Klecks. Unter 0,35 mm wird zugefuellt.
- **Gradzeichen als Ring mit einem Steg unten**: Strich 0,8, Innenkreis 0,9 mm, oben buendig. Das Zeichen der Schrift
  war nach dem Verstaerken ein Punkt („52•24", Marcel 17.09.); mit zwei Stegen las es sich als kleine Null.
- **Material zwischen allem, was geschnitten wird, mindestens 0,7 mm** (`stegMinMm`): die Striche des “ und die
  Umlautpunkte ruecken auseinander, eng stehende Buchstaben schieben den Rest der Zeile nach rechts. Verstaerkt
  standen die Anfuehrungsstriche 0,3 mm auseinander und brannten zu einem Klecks zusammen.

## Schrift

- **Zeilenschrift: ein kraeftiger Schnitt statt verstaerkter Book** (18.09.2026, `schrift-vergleich-a5.ts`). Book auf
  0,7-0,9 mm verstaerkt quoll an Kreuzungen und Enden auf, Stencil-Schriften bringen nur 0,15-0,31 mm Stege mit.
  Jetzt Schnitte mit fast 0,8 mm Strich von sich aus, so gross, wie die laengste Zeile (29 Zeichen) auf A5 passt
  (`ZEILENSCHRIFT_MASSE`). **DIN Alternate Bold, A5 4,8 mm** – Marcel 18.09.2026: „gewinnt eindeutig" (engste Punze
  1,18 mm, 6 und 9 mit Seitensteg). Zur Wahl standen Avenir Next Condensed Demi Bold 5,4 und Avant Garde Demi 4,7;
  DIN Condensed 6,4 fiel vorher raus (Ziffernpunzen 0,9 mm). Sperrung 0,05 em; beim Schriftwechsel setzt das Layout
  Groesse und Sperrung mit. Der Titel mit Stegen durch die Haarstriche passt so („das Zuhause funktioniert").
- **Mindeststrich 0,8 mm, Stege 0,7 mm** nach dem Schrift-Testblatt 17.09. in 2 mm Weiss: 0,5 und 0,6 zu eng, 0,7
  „das Hoechste aller Gefuehle" (jeder Buchstabe mit der Pinzette, der Schnitt verschmolz), Stege von 0,5 brachen
  beim Herausdruecken. Druckschrift wird eckig verstaerkt (Gehrung) und nur an Buchstaben und Ziffern gemessen – die
  duennen Anfuehrungszeichen trieben sonst die ganze Zeile hoch.
- **Schnittfugenkompensation hilft nicht** (Marcel 17.09.2026): sie weitet den Schnitt auch nach innen und schweisst
  die Stege weg. Die Loesung liegt in der Schrift.
- **Der Titel waechst nur nach aussen** (`mitMindeststrich(..., nurAussen)`, Marcel 17.09.2026): die Punzen der
  Schreibschrift bleiben, wie sie sind, und haengen an Stegen. Titel ist immer Schreibschrift, Zeilen immer
  Druckschrift – danach richtet sich die Rechnung (`schnitt-text.ts`).
- **Die Sperrung 0,14 war eine Zugabe fuer Book**, das Poster (ExtraLight) hat keine. ExtraLight (0,20 mm Strich bei
  5 mm) ist zum Schneiden unbrauchbar und aus der Auswahl.
- **opentype.js ist gepatcht** (`patches/`, `postinstall`): CFF-Encoding mit
  Zusatzbit (Format 129) warf einen Fehler, betroffen AvantGardeCE-Demi.otf. Sammeldateien (.ttc) liest es gar
  nicht – `schrift-datei.ts` loest einen Schnitt heraus („Avenir Next Condensed.ttc#Demi Bold").

## Dichte vor Ort (`dichte.ts`, `netz.ts`, Referenzorte)

- **Strassen nur aus der eigenen Kachel** (`kacheln.ts`, 17.09.): der Kachelpuffer lieferte dieselbe Strasse doppelt,
  an Kachelecken vierfach. Die Deckung lag dadurch zu hoch (Tiergarten 3,5 km 33,1 statt 29,4 %), die Liniengravur fuhr
  doppelt. Alle Ziele darum x 0,89: viel/ausgewogen/wenig 37/29/23 % statt 42/33/26 %; Netz im Fenster bleibt
  Tiergarten 27/22/16 %, Goerzallee A5 3 km 19 % (ausgewogen). Die Prozentwerte unten stammen noch aus der Zeit davor.

- **Referenzorte statt nur Berlin** (`src/referenzorte.ts`, Skript `referenzorte.ts`):
  Berlin, Allgaeu, Hamburg, Amsterdam, New York, Bogota, Tokio, Venedig.
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
  30/25/18, Tokio 32/15/12, Allgaeu 11/11/4. Rechenzeit A4 hoechstens 1,2 s –
  live ohne Aktualisieren-Knopf.
- **„wenig" graviert die feinste Netzklasse immer** (`feinsteGraviert`, Marcel 17.09.2026: „kein Unterschied zu
  ausgewogen"). An lichten Orten erreicht keine Stufe ihr Ziel, beide landeten beim Hoechstfaktor 1,4: Goerzallee A5
  3 km 19/19 %, jetzt 19/7 %. Wo die Wohnstrassen ohnehin wichen (Berlin, Hamburg, Tokio, New York), bleibt es gleich;
  Allgaeu 8 -> 4 %. Die Alternative „wenig nicht aufdicken" (Faktor 1,0) liess bei A4 alle Klassen stehen, nur duenner.
- **Lose Netzstuecke werden graviert statt geschnitten** (Marcel: "meist nur
  Artefakte", 1-13 mm2, angebunden nur ueber Fussweg, Treppe oder Tunnel). Stege
  zu nahen Stuecken waeren die Alternative, bisher nicht gebaut.
- **Textreiter zaehlen zur Landflaeche** (sonst Quadrat 38 statt 33 %). Megastaedte
  wirken lichter (Tokio 15 % Netz): parallele Fahrbahnen zaehlen doppelt.

## Prototyp-Platten (`src/server/bogen.ts`)

- **Testreihe statt Einzelexport:** Vorlage oder aktueller Entwurf, je Platz ein anderer Wert fuer genau einen
  Parameter (Ausschnitt oder Stegbreite), je Material eine Datei. Verkleinert (Zeilen 3,7 statt 5,4 mm) – fuer
  Schriftfragen taugt nur Originalgroesse.
- **A4 traegt zwei Prototypen 145 x 205 mm**, nicht zwei A5 (2 x 148 mm auf 297, 210 mm
  exakt auf der Plattenkante). 2,5 mm Rand, 2 mm Abstand, 98 % von A5.
- **30 x 30 traegt einen Prototyp 296 x 296 mm** – aus demselben Grund mit Rand.
- Material je Exemplar: dreilagig 1 weiss / 1 schwarz / 1 blau, vierlagig 2 weiss. Lager 16.09.2026: je
  2 A4 weiss, schwarz, blau, je 1 x 30x30 – 4 A4-Prototypen dreilagig oder 2 vierlagig, Quadrat nur dreilagig.

## Geteilte Karte 60 x 60 (`teilung.ts`, `teilung-export.ts`, `montageplan.ts`, Marcel 25.09.2026)

- **Laser 60 x 30,5 cm, Rohplatte genauso gross.** 60 x 60 nutzt die volle Breite: Kartenkanten = Plattenkanten,
  dort wird nicht geschnitten (`bogenSvg(…, kantenOffen)`), nur Naht und Inneres. Die Naht bleibt 2 mm von der
  gegenueberliegenden Plattenkante: 297-303 mm, probiert in 1-mm-Schritten.
- **Nur mit Holzrahmen**: er haelt die Haelften zusammen und deckt die Plattenkanten; "ohne" ist im Studio gesperrt.
- **Blau ungeteilt** (Rohformat bestellen), Symbol klein auf irgendeiner Platte. Alle anderen Lagen mindestens 3 mm
  (Vorlage `quadrat-60-weisses-netz`); das Symbol (Spiegel 3 mm) steht dann nicht mehr ueber das Netz.
- **Front immer oben-unten**, sonst laeuft die Naht durch Titel und Zeilen; alle anderen Lagen beide Richtungen.
- **Bewertung je Naht**: sichtbare Uebergaenge (Material der Lage auf der Naht, nicht von Lagen darueber verdeckt)
  + kritische Uebergaenge + 4 je Einzelteil, Einzelteile unter 4 cm² doppelt (Marcel: "Gewichtung passt so").
  Kritisch: Fuge unter 1,5 mm oder Netzstrasse flacher als 35° zur Naht (spitze Enden). Gleichstand -> naeher an der Mitte.
- Messwerte 3,5 km, Front: Berlin 19 Uebergaenge / 2 Einzelteile, Amsterdam 36/1, Allgaeu 20/8 (lange Sackgassen
  ueber die Naht), Venedig 3/0; Hintergrund meist 0 Einzelteile, Venedig 5. Innerhalb der 6 mm schwankte Berlin
  zwischen 11/0 und 19/4 – eine feste Naht bei 300 mm waere deutlich schlechter.
- **Haelften nur gedreht, nie gespiegelt** (Frost und Gravur bleiben oben): oben-unten B um 180°, links-rechts
  A/B um 90°, lange Seite auf die Plattenbreite.
- **Montageplan als PDF** (A3 quer, eigene kleine PDF-Ausgabe `pdf.ts` ohne Abhaengigkeit): Ueberblick mit Dateien
  und Reihenfolge, je Lage die ganze Karte mit Einzelteilen (E, orange) und kritischen Uebergaengen (K), dann jede
  Stelle 40 x 40 mm vergroessert.
- Offen: eine Naht, die um kleine Einzelteile im Band herumlaeuft (Zacken statt Gerade), wuerde im Allgaeu einige
  der 8 Stuecke sparen.
