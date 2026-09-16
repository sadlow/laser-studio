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
  { id: "service", titel: "Zufahrten", klassen: ["service"], ziel: "gravur", breiteMm: 0.3 },
  { id: "fuss", titel: "Fuss- und Radwege", klassen: ["path", "pedestrian", "track"], ziel: "gravur", breiteMm: 0.25 },
  { id: "nebenbahn", titel: "Nebengleise", klassen: ["minor_rail", "service_rail"], ziel: "gravur", breiteMm: 0.25 },
];

/**
 * Startwerte: das Amazon-Poster "Zuhause" (Family Motiv 8) als Laserprodukt.
 *
 * Hoehen-Anteile am Listing-Foto vermessen: Karte endet bei 68 %, Titelmitte
 * 77,5 %, Namen 87,8 %, Ort 91 %. Der Titel steht dort ueber rund 52 % der
 * Breite – das erreicht Bacalisties bei 7 % Versalhoehe.
 *
 * Zeilen in ITC Avant Garde Gothic wie das Poster, aber Demi statt ExtraLight:
 * gemessen bei 5 mm Versalhoehe hat ExtraLight 0,20 mm Strich – kaum breiter
 * als die Schnittfuge, da loest sich nichts sauber heraus. Book 0,50 mm,
 * Demi 0,93 mm, Bold 1,36 mm.
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
    // Bacalisties-Versalien schwingen gleichmaessig 9,7-10,1 % unter die
    // Versalhoehen-Mitte (gemessen: Zuhause, Home, Unser Nest, Familie). Bei
    // 74,3 % endet der Schwung wie auf dem Poster bei 84,3 % – 2,4 % Luft zu
    // den Namen, sonst verschmelzen die Ausschnitte.
    titelMitteAnteil: 0.743,
    zeile1MitteAnteil: 0.878,
    zeile2MitteAnteil: 0.912,
    titelStil: { schrift: "Bacalisties.ttf", hoeheAnteil: 0.07, sperrung: 0, versalien: false },
    zeilenStil: { schrift: "AvantGardeCE-Demi.otf", hoeheAnteil: 0.017, sperrung: 0.06, versalien: true },
    strassen: STRASSEN_STANDARD.map((g) => ({ ...g, klassen: [...g.klassen] })),
    netzMinBreiteMm: 0.8,
    netzMinLochMm2: 4,
    wasser: true,
    wasserlaeufe: false,
    wasserlaufBreiteMm: 1.2,
    wasserMinFlaecheMm2: 6,
    // "Super fein": hoechstens 0,5 mm und nie breiter als der halbe Strich.
    // 0,7 mm (wie die Spardosen-Stege) wirkte bei Avant Garde Demi zu dick –
    // der Strich ist dort bei A4 selbst nur 0,93 mm.
    stegMm: 0.5,
    // Darunter bliebe neben dem Steg kaum sichtbares Material. Gemessen bei A4:
    // Gradzeichen 0,97 mm (wird Punkt), obere 8 1,07, A 1,16 (bekommen Stege).
    stencilMinInselBreiteMm: 1.0,
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
  "AvantGardeCE-Demi.otf",
  "AvantGarde-Book.otf",
  "AvantGarde-ExtraLight.otf",
  "ITC Avant Garde Gothic LT Bold.ttf",
  "JosefinSans-SemiBold.ttf",
];
