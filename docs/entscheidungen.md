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

- **Ausschnitt in km statt Zoom.** Strassenbreiten gelten fuer A4 und wachsen mit (`REFERENZ_KARTENBREITE_MM`),
  die Dichte vor Ort gleicht aus. Fest bleiben Rand und Stege.
- **Gleicher Massstab als Start** (Marcel 25.09.2026, ersetzt "A3 zeigt denselben Kiez wie A5"): jedes Format startet
  so skaliert wie A4 bei 3,5 km (`massstabsgleicherAusschnittKm`) – A5 2,4, A3 und 30 x 30 5,1, 60 x 60 10,1 km
  (Reiter 10,5). Groesser zeigt mehr Umgebung. Berlin: Netz 22/21/21 % (A4/30/60), die Dichte gleicht den
  Formatfaktor aus (60 x 60: x 2,90 x 0,33), die Strassen sind damit etwa so breit wie bei A4. Symbol und Zeilen
  bleiben ohnehin wie A3/30 x 30. 60 x 60 bei 10 km: volle Rechnung 11,5 s, die Skizze sofort.
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

- **Titel auf der Kante** (`kante.ts`, Marcel 25.09.2026, Vorbild Kettle Falls; Standard fuer 60 x 60): Titel in
  Versalien (Bebas Neue) als Material auf der Innenkante des unteren Rands, links, mittig oder rechts – der Kunde waehlt.
  Hoechstens ein Drittel der Breite (60 x 60: 20 cm) und 8 % der Hoehe, hoechstens 15 Zeichen. Die Zeile im Rand so hoch
  wie die Zeilen der anderen Layouts (60 x 60: wie 30 x 30). Graben 3 mm ohne
  Strassen, zwischen den Buchstaben keine (sonst 19 lose Stummel, jetzt 2). Namen und letzte Zeile als eine Zeile
  negativ im Rand (16 mm, unten 36 mm), links, mittig oder rechts. Keine Stege im Titel; Umlautpunkte sind lose
  Textteile zum Aufkleben. Von drei Entwuerfen (Block rechts, Schreibschrift mittig, Ortsname links) gewaehlt.
  Mit Deckschicht ("Schwarz, weisser Rahmen") sitzt der weisse Titel in der Deckschicht, darunter im schwarzen Netz
  eine 2,5 mm breite Umrandung statt des Grabens: Kontrast gegen den weissen Grund, die Strassen haengen daran.

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
- **Weit draussen schmaler, nicht klobiger** (Marcel 26.09.2026, Lanzarote und Bali auf 60 x 60: Hauptstrassen
  verschmolzen, Kurven verschwanden, Orte liefen zu). Drei Ursachen, drei Regeln (`dichte.ts`, Skript `breiten-diagnose.ts`):
  1. Das Format zaehlt fuer die Breite hoechstens wie beim 30 x 30 (`formatBis` 1,46, wie Symbol und Schrift). Mit
     Faktor 2,9 wurde eine Primaerstrasse an lichten Orten 8,9 mm breit (A4: 2,2-3,1 mm).
  2. Aufdicken gilt fuer den Start-Massstab (A4 bei 3,5 km); weiter draussen hoechstens `maxFaktor / Massstab` – eine
     Strasse wird in Metern nicht breiter. Dichte Orte tun das ueber die Deckung schon, lichte blieben beim
     Hoechstfaktor stehen. Nachruecken nur bis Massstab 1,25 (sonst 19 m Feldwege auf Mindestbreite bei 20 km).
  3. Ab Massstab 1,5 graviert jede Stufe eine Netzklasse mehr (`mehrGravurAb`; 60 x 60 ab 15 km, 30 x 30 ab 7,6,
     A4 ab 5,3): Arrecife bei 20 km hatte 626 zugefuellte Bloecke und war ein schwarzer Fleck, mit gravierten
     Wohnstrassen 17.
  Lanzarote 60 x 60, 20,3 km: Primaer 5,67 -> 2,25 mm, Netz 14,8 -> 5,5 %. Bali 13 km: Primaer 8,9 -> 3,5 mm.
  Berlin A4 3,5 km und das 30 x 30 bleiben gleich (Deckung 29,4 %, Faktor 0,99).
- **Querverbindungen statt breiter** (`querverbindung.ts`, `netz-ketten.ts`, Marcel 26.09.2026: „viel" und
  „ausgewogen" sahen bei 30 km gleich aus, lange duenne Straenge wie auf Bali sind instabil). Das geschnittene Netz
  zerfaellt in Straenge zwischen Kreuzungen; laeuft einer laenger frei als die Stufe erlaubt (`stuetzMm`: viel 30,
  ausgewogen 80, wenig aus; Sackgassen doppelt), wird von seiner Mitte der kuerzeste Weg ueber gravierte Strassen oder
  Zufahrten/Feldwege zu einem anderen Strang mitgeschnitten – hoechstens so lang wie die Grenze. „viel" setzt erst die
  Verbindungen von „ausgewogen" und stuetzt dann enger nach. Weiter draussen (Massstab ueber 1,25) wird „viel" nicht
  breiter als „ausgewogen" – das fuellte in New York Bloecke zu. Mit viel 30 mm (Marcel): Lanzarote 30 km 69 / 17
  Verbindungen, New York 30 km 79 / 0, Berlin A4 3,5 km 0. Skizze New York 30 km 0,7 s warm.
- **Brücken New York** (26.09.2026 geprueft): Manhattan–Brooklyn hat drei Bruecken (Brooklyn, Manhattan,
  Williamsburg), alle geschnitten; der Rest sind Tunnel. Bei 30 km (Kachelstufe 13) fehlt nur die kleine Pulaski Bridge.
- **Gefuellte Bloecke waren Rechenreste** (`saeubere`, geometrie.ts, 26.09.2026): das Oeffnen der Bloecke um den
  halben Spalt hinterliess tausende Ringe ohne Flaeche (Bali 13 km: 6 235 unter 0,001 mm²). Beim Vereinigen mit den
  Strassen ordnete Clipper daran einen Blockrand falsch zu – ein ganzer Block wurde Netz: der Danau Buyan schwarz statt
  blau, ein Block ums Herz auf Lanzarote. `CleanPolygons` mit 1,4 µm vor dem Vereinigen. Die Richtung ueber den
  Clipper-Baum zu reparieren half nicht: der Ring war dort keine Lochkontur.
- **Parallele Gravurlinien nur einmal** (`gravur-duenn.ts`, `minAbstandMm` 0,5, Marcel 26.09.2026): liegen zwei
  Mittellinien naeher als der Mindestabstand nebeneinander (bis 35 Grad), brennt der Strahl eine Rille. Die wichtigere
  (breitere Klasse, laengere Linie) bleibt, Kreuzungen bleiben. Berlin 60 x 60 bei 34,8 km: 230 -> 170 m, Anteil mit
  paralleler Nachbarlinie unter 0,5 mm 49,5 -> 1,5 % (`gravur-dichte.ts`). Abgeschnittene Reste unter 4 x Abstand
  fallen mit weg (sonst Schnipsel und Punkte); ganze kurze Wege bleiben. Welcher Abstand am Werkstueck getrennt bleibt,
  zeigt `gravurprobe-abstand.ts`: Paare 0,2-1,5 mm, Keil, Kreuzungen, T, Stern und Berlin 20 km mit 0 / 0,5 / 1,0,
  je fuer Defocus 4 und 6 (Kartenstueck 36 x 30 mm: 1,55 / 0,89 / 0,57 m).
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
- **Mehr Karte, nicht groesser** (Marcel 25.09.2026): Symbol wie bei A3 und 30 x 30 (11/15/21 mm), Namen, Freitext
  und Koordinaten so hoch wie beim 30 x 30 (5,9 mm, `zeilenBezugMm`). Nur Titel, Rand und Strassenbreiten wachsen.
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
- **Naehte nur auf Abruf**: die Live-Vorschau rechnet nur die Karte (`rendereSchichtkarte(…, { teilung: false })`),
  die Naehte kommen per Knopf im Block "Teilung" oder im Export. Der Server merkt sich die letzten drei Karten
  (`ergebnis-cache.ts`), Umwaehlen einer Naht baut die Karte nicht neu. Sind die Naehte gerechnet, zeigen die
  Laser-Reiter die Rohplatten wie im Export (`teilung-ansicht.ts`): Haelften A/B gedreht, Deckschicht als
  Rahmenbogen. Berlin 3,5 km: Naehte 0,8 s (tsx), 3,3 s im Dev-Server.
- Offen: eine Naht, die um kleine Einzelteile im Band herumlaeuft (Zacken statt Gerade), wuerde im Allgaeu einige
  der 8 Stuecke sparen.

## Rechenzeit (Profil 25.09.2026, `scripts/clipper-vergleich.ts`)

- Berlin 60 x 60, 9 km: Kacheln 0,6 s kalt / 0,03 s aus dem Cache, Text 0,1 s, Netz und Lagen 15 s, JSON 0,04 s
  (7,5 MB). Die Zeit steckt in der Geometrie auf dem Server, nicht im Kartenabruf und nicht im Browser; 3D rechnet
  nur, wenn der Reiter offen ist.
- clipper-lib fuegte lokale Minima und Scanlinien einzeln in sortierte Listen ein – quadratisch. `clipper-schnell.ts`
  baut dieselben Listen sortiert bzw. mit Zeiger aufs Ende: gleiche Dateien (Hash an 5 Faellen), Berlin 9 km
  23,7 -> 15,3 s mit Naehten, Amsterdam 60 x 60 8,2 -> 7,0 s. Der Rest ist echte Schnittarbeit (BuildIntersectList).
- Groebere Boegen (Toleranz 0,1 statt 0,03 mm) brachten nur 10 % – verworfen.
- **Live-Ansicht und Produktion getrennt** (Marcel 25.09.2026: "der Kunde darf in der Liveansicht nicht warten"):
  jede Aenderung zeigt sofort die Skizze (`skizze.ts`, `/api/skizze`): dieselben Kacheln, Strassenauswahl, Breiten,
  Texte und Farben, aber Strassen als Striche statt verschmolzener Flaechen, Wasser ungefiltert, ohne Stege,
  Spalte und lose Stuecke. Berlin 60 x 60 9 km: 164 ms statt 9 s (tsx), im Studio 0,4-0,5 s bis zum Bild. Die volle
  Rechnung startet 1,2 s nach der letzten Aenderung im Hintergrund, ohne Schleier, und loest die Skizze ab; Lagen,
  Pruefung, 3D und Export nehmen nur die volle Rechnung.
- **Volle Rechnung im Worker-Thread** (`rechenwerk.ts`, `voll-worker.ts`, 25.09.2026): im selben Prozess wartete die
  Skizze hinter der vollen Rechnung – Node rechnet eines zur Zeit, 60 x 60 bei 12 km 18 s am Stueck, ein Abbruch greift
  erst zwischen den Schritten. Jetzt ein Worker (tsx, CommonJS-Register), die neueste Eingabe beendet ihn hart. 60 x 60
  zoomen: Skizze nach 0,5-1,6 s statt ueber 15 s. Zwischen zwei Staenden zeigt die Vorschau die juengere Skizze, nicht
  die letzte volle Rechnung (vorher tauchte nach dem Zoom die A4-Karte auf), ohne Schleier solange eine Skizze da ist.

## Teile und Loecher (`geometrie.ts` `teile()`, 25.09.2026)

- **`teile()` bleibt ohne `StrictlySimple`** (`strikt = false`). Befund: im Entwurf "Titel auf der Kante"
  (60 x 60, Berlin 5,5 km, 3-ort-links) haengt Clipper 14 Loecher an ein Teil mit -3227 mm², das Hauptteil ist
  3227 mm² zu gross – dort geschnittene Bloecke fehlen. Messung `scripts/teile-strikt.ts`: jeder `teile()`-Aufruf
  der Engine, 6 Vorlagen x 8 Referenzorte, Summe der Teile gegen Flaeche der Eingabe, Teil mit negativer Flaeche,
  Loch ausserhalb seiner Aussenkontur.
- **Locker: 0 Fehler in 48 Faellen** (60 x 60 ab Allgaeu nur locker). Die Gesamtflaeche stimmt bis auf
  weggefilterte Splitter (Tokio 60 x 60 1,6 mm²). Einziger Treffer der Lochpruefung ein entartetes Loch von 0 mm²
  in der Nahtbewertung.
- **Strikt ist selbst falsch und viel langsamer:** New York (alle A4), Bogota und Venedig (Quadrat 30) je zwei
  Aufrufe mit falsch zugeordneten Loechern (New York A4: Netz-Lage 2960 mm² zu viel Material, 5 Loecher im
  falschen Teil), in der 60 x 60-Nahtbewertung Allgaeu ein 624-mm²-Loch an einem Teil von 0 mm². Karte gesamt:
  A4 Bogota 1,6 -> 39 s, Allgaeu 0,5 -> 21 s; Quadrat 30 Tokio 5,1 -> 387 s; 60 x 60 Berlin 2,0 -> 104 s,
  Allgaeu ueber 30 min (abgebrochen). Im Kanten-Entwurf ein Aufruf 75 ms -> 27-180 s.
- Strikt trennt, was sich in einem Punkt beruehrt: Netzloecher A4 Berlin 335 -> 695, zugefuellte Bloecke
  7 -> 8 (Bogota 91 -> 100, Tokio Q30 162 -> 171), weil Teilbloecke unter die Mindestflaeche fallen. Lose
  Netzstuecke und "lose -> Gravur" blieben in allen Faellen gleich.
- Offen: Loecher selbst zuordnen (kleinste Aussenkontur, die das Loch enthaelt; Punkt-in-Polygon mit dem
  ersten Eckpunkt nicht auf der Kante). Im Kanten-Entwurf richtig (117 668 mm², 701 Loecher), 77 ms wie locker,
  sonst gleiche Teile. Noch nicht in der Engine; `strikt = true` ist kein verlaesslicher Ersatz.

## Kartendaten (`quelle*.ts`, `src/server/karten-quelle.ts`, Marcel 25.09.2026)

- **Eigenes Archiv zuerst, Mapbox als Rueckfall.** Dieselbe Quelle wie der Baseline Customizer: der OSM-Planet als
  PMTiles-Datei (Protomaps 4, Zoom 15), gelesen ueber Byte-Bereiche; `KARTE_ARCHIV` ist die https-Adresse (lokal der
  oeffentliche Tagesbau 20260923, derselbe Stand wie `karte/basiskarte-welt-20260923.pmtiles` im Bucket). Fehlt die
  Variable oder faellt das Archiv aus, rechnet die ganze Karte mit Mapbox – nie gemischt – und die Pruefung sagt es.
  Waehlbar unter "Platte und Ausschnitt" (`kartenQuelle`), angezeigt in der Pruefung, vermerkt in `uebersicht.txt`.
- `quelle.ts`, `quelle-protomaps.ts`, `quelle-mapbox.ts` und `kacheln.ts` sind die Fassungen aus
  `baseline-customizer/app/domain/laserkarte/engine` (dort aus 4530558 portiert); die Engine denkt weiter in den
  Klassen von mapbox-streets-v8, die Protomaps-Quelle uebersetzt (Abgleich dort: 88-98 % je Klasse).
- Gemessen an den 8 Referenzorten, A4 3,5 km: Netz und Deckung gleich (Tokio 15 -> 17 %, Venedig 1 -> 2 %),
  Gravurweg bis +30 % (Berlin 9,1 -> 11,8 m, Zoom 15 fuehrt mehr Wege), lose Stuecke 0-3 statt 0-4. Rechenzeit warm
  +20-50 %, kalt 2,4-3,9 s ueber den Tagesbau (Verzeichnis + viermal so viele Kacheln). Bild Berlin 30 x 30 praktisch
  deckungsgleich. `scripts/quellen-vergleich.ts`.
- Grund ueber die Technik hinaus (Customizer 23.09.): die Mapbox-Bedingungen begrenzen Druck auf 100 Kopien je Konto
  und verbieten Zwischenspeicher; OSM verlangt nur die Nennung "© OpenStreetMap-Mitwirkende".
- **Ortssuche wie im Customizer** (Marcel 25.09.2026): ein Feld fuer Adresse oder Koordinaten, Vorschlaege beim
  Tippen aus Photon (OpenStreetMap, `/api/orte`, `src/server/orte.ts`, 350 ms nach dem letzten Tastendruck, ab drei
  Zeichen, gedrosselt und zwischengespeichert). Dezimalgrad, Grad/Minuten/Sekunden und kopierte Google-Maps-Adressen
  liest `engine/orte.ts` selbst; bei Koordinaten sucht Photon `reverse` nur den Ortsnamen fuer die letzte Zeile. Der
  Ortsname kommt ohne Postleitzahl (`stadt`, Abweichung vom Customizer). Antwortet Photon nicht, sucht Enter ueber die
  alte Mapbox-Suche (`/api/ort`). "Luebeck" ergibt jetzt Luebeck (vorher Luebecker Strasse in Koeln). Der Suchtext
  zaehlt nicht zum Kartenstand – Tippen rechnet die Karte nicht mehr neu.
- **Weit herauszoomen** (Marcel 25.09.2026): die Zoomstufen sind die A4-Reihe mal Kartenbreite/196 mm – jedes Format
  zoomt im Massstab von A4 und rastet beim Standardausschnitt ein (`zoomStufenKm`, seit 26.09. hoechstens 30 km). 60 x 60:
  10,1 / 13 / 15,9 / 20,3 / 26,1 / 30 km (davor 12 km fest, kurz bis 34,8; mit den Breitenregeln unten sauber:
  Berlin 30 km Netz 12 %, Lanzarote 3 %, keine zugelaufenen Orte). Kachelstufe nach Ausschnitt (`archivZoom`): bis 12,5 km
  Zoom 15, bis 25 km 14, darueber 13 – bei 30 km waeren es sonst 1 600 Kacheln; Kacheln je Abruf hoechstens 32
  parallel (sonst Verbindungs-Timeout). Skizze 60 x 60 bei 36 km: 1,4 s warm; volle Rechnung 20-46 s, 1,5-1,8 GB.
- **Absturz bei grossen Ausschnitten war eine Linie** (`zuLinienPfad`, geometrie.ts): eine Gravurlinie mit einem
  doppelten Punkt am Anfang (Segment der Laenge null, aus den Kacheldaten) laesst Clipper bei offenen Pfaden ohne Ende
  rechnen und Speicher fressen – ab 16 km ueber 5 GB („Heap out of memory“), bei kleinen Karten trifft man so eine
  Linie nicht. Gefunden ueber ein 50-Linien-Paket und Einzelabruf, eine Linie mit 7 Punkten genuegte, mit und ohne
  `clipper-schnell.ts`. Doppelte Punkte werden vor dem Beschnitt entfernt; Schnitt und Gravurweg an fuenf Karten
  unveraendert. Falsche Faehrten davor: die Vereinigung in `netz.ts` (37 000 Loecher), Linien in Paketen, Kachelstufe –
  alle nicht die Ursache, Aenderung an `netz.ts` zurueckgenommen.
- Offen: der Tagesbau verschwindet nach einigen Tagen – fuer Dauerbetrieb die Bucket-Datei mit S3-Zugang (wie
  `pmtiles.server.ts` im Customizer).
