import type { Schichtkarte, StrassenGruppe } from "./typen";

/**
 * Welche Strassen ins weisse Netz gehen und welche graviert werden.
 * Vorgabe Marcel 16.09.2026: primaer, sekundaer, tertiaer, Bahn – und eine
 * Klasse mehr, die Wohnstrassen ("aktuell ist viel graviert und wenig
 * geschnitten"). Feinere Wege bleiben Gravur auf Schwarz.
 *
 * Breiten in mm bei A4, sie wachsen mit dem Format. Kein Map-Style-Pixelmass:
 * ein Acrylstreifen muss schneidbar sein.
 */
export const STRASSEN_STANDARD: StrassenGruppe[] = [
  { id: "fern", titel: "Autobahn / Schnellstrasse", klassen: ["motorway", "motorway_link", "trunk", "trunk_link"], ziel: "netz", breiteMm: 2.6 },
  { id: "primaer", titel: "Primaer", klassen: ["primary", "primary_link"], ziel: "netz", breiteMm: 2.2 },
  { id: "sekundaer", titel: "Sekundaer", klassen: ["secondary", "secondary_link"], ziel: "netz", breiteMm: 1.8 },
  { id: "tertiaer", titel: "Tertiaer", klassen: ["tertiary", "tertiary_link"], ziel: "netz", breiteMm: 1.4 },
  { id: "bahn", titel: "Bahn", klassen: ["major_rail"], ziel: "netz", breiteMm: 1.2 },
  { id: "wohn", titel: "Wohnstrassen", klassen: ["street", "street_limited"], ziel: "netz", breiteMm: 1.0 },
  { id: "service", titel: "Zufahrten", klassen: ["service"], ziel: "gravur", breiteMm: 0.3, nachruecken: true },
  // Eigene Zeilen, weil sie verschieden nachruecken: Venedigs Gassen sind
  // "pedestrian" (185 km im 3,5-km-Ausschnitt), die Wege im Allgaeu "track".
  { id: "fussgaenger", titel: "Fussgaengerzonen", klassen: ["pedestrian"], ziel: "gravur", breiteMm: 0.25, nachruecken: true },
  { id: "feldwege", titel: "Feldwege", klassen: ["track"], ziel: "gravur", breiteMm: 0.25, nachruecken: true },
  { id: "fuss", titel: "Fuss- und Radwege", klassen: ["path"], ziel: "gravur", breiteMm: 0.25 },
  { id: "nebenbahn", titel: "Nebengleise", klassen: ["minor_rail", "service_rail"], ziel: "gravur", breiteMm: 0.25 },
];

/**
 * Startwerte: das Amazon-Poster "Zuhause" (Family Motiv 8) als Laserprodukt.
 *
 * Richtwert ist A4 (Marcel 16.09.2026). Groessen und Lagen am A4-Muster des
 * Posters vermessen (Musterdaten, 300 und 600 dpi, auf 0,05 mm gleich;
 * `scripts/poster-abgleich.ts`): Karte endet bei 202,0 mm, Titel 21,97 mm
 * Versalhoehe mit Mitte bei 224,7 mm, beide Zeilen 5,42 mm Versalhoehe mit
 * Mitte bei 264,6 und 274,3 mm.
 *
 * Zeilen in ITC Avant Garde Gothic wie das Poster, aber Book statt ExtraLight.
 * Strich bei 5 mm Versalhoehe: ExtraLight 0,20 mm (kaum breiter als die
 * Schnittfuge – die beiden Kanten eines Strichs fielen zusammen), Book 0,50,
 * Demi 0,93, Bold 1,36. Demi war zuerst gewaehlt, wirkte aber nicht edel;
 * die Deckschicht ist nur 2 mm stark, dort loest sich ein 0,5-mm-Schlitz sauber
 * (Marcel 16.09.2026).
 *
 * Die Sperrung 0,14 ist eine Zugabe, das Poster hat keine: ExtraLight ohne
 * Sperrung trifft die Namenbreite dort auf 0,01 mm. Luftig wirkt es durch den
 * duennen Strich. Book ist kraeftiger und bekommt die Luft ueber die Sperrung
 * ("ein bisschen Spacing tut der Schrift gut", Marcel 16.09.2026).
 */
export function standardSchichtkarte(): Schichtkarte {
  return {
    kunde: {
      adresse: "Tiergarten, Berlin",
      titel: "Zuhause",
      namen: "Familie Hoffmann",
      letzteZeile: "koordinaten",
      ortText: "Berlin",
      wunschtext: "",
      strassenStufe: "ausgewogen",
    },
    lon: 13.3375,
    lat: 52.5164,
    ausschnittKm: 3.5,
    format: "a4",
    rahmenMm: 7,
    aufbau: "netz-weiss",
    layoutArt: "poster",
    // Quadrat-Entwurf Marcel 16.09.2026, zweite Runde: Die Kontur um die
    // Buchstaben und die Texte in drei Ecken wirkten unruhig. Jetzt wie die
    // DIN-Version uebereinander – Titel oben in einem abgerundeten Rechteck,
    // Namen und Koordinaten mittig darunter unten in einem zweiten.
    eingebettet: {
      titelAnker: "oben-mitte",
      zeile1Anker: "unten-mitte",
      zeile2Anker: "unten-mitte",
      form: "rechteck",
      schutzMm: 5,
      eckenRadiusMm: 6,
      rahmenUntenMm: 14,
    },
    kartenEndeAnteil: 0.68,
    // Der Schwung von "Zuhause" endet auf dem Poster bei 255,2 mm, 6,7 mm ueber
    // den Namen. Bacalisties-Versalien schwingen gleichmaessig 9,7-10,1 % unter
    // die Versalhoehen-Mitte (Zuhause, Home, Unser Nest, Familie).
    titelMitteAnteil: 0.7564,
    zeile1MitteAnteil: 0.8909,
    zeile2MitteAnteil: 0.9236,
    titelStil: { schrift: "Bacalisties.ttf", hoeheAnteil: 0.074, sperrung: 0, versalien: false },
    zeilenStil: { schrift: "AvantGarde-Book.otf", hoeheAnteil: 0.01825, sperrung: 0.14, versalien: true },
    strassen: STRASSEN_STANDARD.map((g) => ({ ...g, klassen: [...g.klassen] })),
    netzMinBreiteMm: 0.8,
    // Hoechstens 1,4-fach breiter als entworfen, sonst klobig.
    // ausgewogen – Ziel 33 %: Berlin-Tiergarten bei 3,5 km, fuer das die Breiten
    // entworfen sind, bleibt unveraendert. Aufdicken bis 1,4: Hamburg, Bogota und
    // Paris behalten ihre Wohnstrassen, die breiten Hauptstrassen geben nach. Bei
    // 1,25 verloren Koeln und New York bei 6 km zusaetzlich die Bahn.
    // wenig – die feinste Klasse wird graviert, sobald sie aufgedickt werden muesste.
    // viel – dichte Wohnstrassen bleiben, Zufahrten und Fussgaengerzonen ruecken nach.
    generalisierung: {
      aktiv: true,
      maxFaktor: 1.4,
      stufen: {
        viel: { zielDeckung: 0.42, maxAufdickung: 2, nachruecken: "immer" },
        ausgewogen: { zielDeckung: 0.33, maxAufdickung: 1.4, nachruecken: "licht" },
        wenig: { zielDeckung: 0.26, maxAufdickung: 1, nachruecken: "nie" },
      },
    },
    netzMinLochMm2: 4,
    wasser: true,
    wasserlaeufe: false,
    wasserlaufBreiteMm: 1.2,
    wasserMinFlaecheMm2: 6,
    wasserMinBreiteMm: 1,
    wasserInselMinMm2: 15,
    // "Super fein": hoechstens 0,5 mm und nie breiter als der halbe Strich.
    // 0,7 mm (wie die Spardosen-Stege) wirkte bei Avant Garde Demi zu dick –
    // der Strich ist dort bei A4 selbst nur 0,93 mm.
    stegMm: 0.5,
    // Darunter bliebe neben dem Steg kaum sichtbares Material. 1,0 mm stammte aus
    // der Demi-Zeit und machte bei A5 aus dem Gradzeichen einen Punkt (Marcel
    // 16.09.2026). Innenkreis des Gradzeichens in Book: A5 0,97, Prototyp 145 x
    // 205 0,95, A4 1,38 mm – alle behalten Innenkreis und Stege.
    stencilMinInselBreiteMm: 0.8,
    herzBreiteMm: 11,
    loseTeileMarkieren: true,
  };
}

/**
 * Welches Layout ein Format mitbringt. Die Poster-Anteile sind am A-Seiten-
 * verhaeltnis vermessen – auf dem Quadrat liegt das Kartenfenster damit quer
 * und der Textbereich wird gross. Darum dort das eingebettete Layout.
 */
export function standardLayoutFuer(format: Schichtkarte["format"]): Schichtkarte["layoutArt"] {
  return format === "quadrat30" ? "eingebettet" : "poster";
}

/** Schriften zur Auswahl. */
export const TITELSCHRIFTEN = [
  "Bacalisties.ttf",
  "Amalfi Coast.ttf",
  "Autography.otf",
  "Omellia.otf",
  "Cinderella.otf",
  "Westover.ttf",
];

export const ZEILENSCHRIFTEN = [
  "AvantGarde-Book.otf",
  "AvantGardeCE-Demi.otf",
  "AvantGarde-ExtraLight.otf",
  "ITC Avant Garde Gothic LT Bold.ttf",
  "JosefinSans-SemiBold.ttf",
];
