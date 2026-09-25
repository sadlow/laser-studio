import { standardLayoutWerte, ZEILENSCHRIFT_MASSE } from "./poster-masse";
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
      symbol: "herz",
      symbolGroesse: "mittel",
      holzrahmen: "ohne",
    },
    lon: 13.3375,
    lat: 52.5164,
    ausschnittKm: 3.5,
    format: "a4",
    rahmenMm: 7,
    aufbau: "netz-weiss",
    // Lage und Groesse der Texte wie auf dem A4-Poster (poster-masse.ts).
    ...standardLayoutWerte("a4"),
    strassen: STRASSEN_STANDARD.map((g) => ({ ...g, klassen: [...g.klassen] })),
    netzMinBreiteMm: 0.8,
    // Hoechstens 1,4-fach breiter als entworfen, sonst klobig.
    // ausgewogen – Ziel 29 %: Berlin-Tiergarten bei 3,5 km, fuer das die Breiten
    // entworfen sind, bleibt unveraendert (bis 17.09. 42/33/26 % – die Kachelraender
    // zaehlten Strassen doppelt, Tiergarten 33,1 statt 29,4 %; alle Ziele x 0,89). Aufdicken bis 1,4: Hamburg, Bogota und
    // Paris behalten ihre Wohnstrassen, die breiten Hauptstrassen geben nach. Bei
    // 1,25 verloren Koeln und New York bei 6 km zusaetzlich die Bahn.
    // wenig – die feinste Klasse (Wohnstrassen) wird immer graviert (17.09.: an lichten Orten
    // landeten ausgewogen und wenig sonst beim selben Hoechstfaktor und sahen gleich aus).
    // viel – dichte Wohnstrassen bleiben, Zufahrten und Fussgaengerzonen ruecken nach.
    generalisierung: {
      aktiv: true,
      maxFaktor: 1.4,
      stufen: {
        viel: { zielDeckung: 0.37, maxAufdickung: 2, nachruecken: "immer", feinsteGraviert: 0 },
        ausgewogen: { zielDeckung: 0.29, maxAufdickung: 1.4, nachruecken: "licht", feinsteGraviert: 0 },
        wenig: { zielDeckung: 0.23, maxAufdickung: 1, nachruecken: "nie", feinsteGraviert: 1 },
      },
    },
    netzMinLochMm2: 4,
    // Testblatt 17.09.2026 in 2 mm Weiss: ein Spalt loest sich ab 0,5 mm.
    netzMinSpaltMm: 0.5,
    wasser: true,
    wasserlaeufe: false,
    wasserlaufBreiteMm: 1.2,
    wasserMinFlaecheMm2: 6,
    wasserMinBreiteMm: 1,
    wasserInselMinMm2: 15,
    // Stege 0,7 mm (wie die Spardosen-Stege): 0,5 mm brachen in 2 mm Acryl beim Herausdruecken der Buchstaben
    // (Marcel 17.09.2026). So viel Material bleibt auch zwischen den Buchstaben stehen.
    stegMm: 0.7,
    stegMinMm: 0.7,
    // Schmaler bekommt eine Innenflaeche nur einen Steg (offene Schleife); frueher wurde zugefuellt und aus dem
    // Gradzeichen wurde ein Punkt (Marcel 16.09.2026).
    stencilMinInselBreiteMm: 0.8,
    // A4 wie bisher 8 / 11 / 15 mm, je Formatstufe etwa Faktor 1,4 (A5 bisher 5,5-10,2, A3 11,5-21,7 mm).
    symbolStufenMm: [6, 8, 11, 15, 21, 29],
    // Acryl 2 mm glaenzend, Spiegelacryl 3 mm (Marcel 16.09.2026). Der schwarze Hintergrund 3 mm Frost (18.09.):
    // glaenzendes XT gravierte nicht weiss, das matte Frost-Acryl heller – das gibt es nur in 3 mm, das Wasser liegt
    // dadurch 3 mm tief. Ein schwarzes Netz bleibt glaenzend 2 mm (19.09.).
    staerkenMm: { acryl: 2, grundSchwarz: 3, spiegel: 3 },
    grundSchwarzFrost: true,
    // Marcel 16.09.2026, gleiches Profil fuer alle Groessen. Bei 7 mm Rand und
    // 4 mm Ueberstand bleiben im Rahmen 3 mm Rand sichtbar.
    holzrahmenProfil: { breiteMm: 14, tiefeMm: 28, einlassMm: 6, ueberstandMm: 4 },
    loseTeileMarkieren: true,
    // Mittellinie mit Defocus 6 mm ist Marcels normale Gravur (Gravurprobe 17.09., Marcel 18.09.2026). 0,5 mm Linienbreite
    // ist angenommen, noch nicht unter der Lupe gemessen – sie kuerzt nur die Stichenden vor Kreuzungen (wege.ts).
    gravurExport: { art: "mittellinie", strahlMm: 0.5 },
    // Laser 60 x 30,5 cm, Rohplatte genauso gross (Marcel 25.09.2026). Naht 2 mm von der Plattenkante: 297-303 mm.
    teilung: { rohplatte: { breiteMm: 600, hoeheMm: 305 }, randMm: 2, gewichtEinzelteil: 4, kleinMm2: 400, schrittMm: 1 },
  };
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

/** Die Zeilenschriften mit bekannter Schnittgroesse (poster-masse.ts). ExtraLight (0,2 mm Strich) ist raus. */
export const ZEILENSCHRIFTEN = Object.keys(ZEILENSCHRIFT_MASSE);

/**
 * Plattenstaerken auch aus aelteren Eingaben: bis 17.09.2026 eine Staerke "acryl" fuer Weiss und Schwarz, am 18.09.
 * "weiss" und "schwarz" (Schwarz war dabei immer der Hintergrund).
 */
export function staerkenAus(alt: Partial<Record<"acryl" | "weiss" | "schwarz" | "grundSchwarz" | "spiegel", number>> | undefined): Schichtkarte["staerkenMm"] {
  const basis = { acryl: 2, grundSchwarz: 3, spiegel: 3 };
  return {
    acryl: alt?.acryl ?? alt?.weiss ?? basis.acryl,
    grundSchwarz: alt?.grundSchwarz ?? alt?.schwarz ?? basis.grundSchwarz,
    spiegel: alt?.spiegel ?? basis.spiegel,
  };
}
