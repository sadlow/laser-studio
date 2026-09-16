// Der Vertrag der Engine fuer das Produkt "Schichtkarte".
//
// Aufbau von oben nach unten:
//   Herz    rotes Spiegelacryl, aufgeklebt am Ort
//   Weiss   Rahmen + Strassennetz + Textflaeche mit ausgeschnittenen Woertern
//   Schwarz durchgehend, Wasser ausgeschnitten, feine Wege graviert (hell)
//   Blau    Spiegelacryl, scheint durch das Wasser
//
// Alles, was das Produkt beschreibt, steht hier. Die UI ist ein Formular auf
// diese Typen, die Produktion ruft dieselbe Funktion auf. Kein React, kein Next.

export type FormatKey = "a5" | "a4" | "a3" | "quadrat30" | "frei";

/** Wohin eine Strassenklasse gehoert. */
export type StrassenZiel = "netz" | "gravur" | "aus";

/**
 * Eine Zeile der Strassentabelle. `klassen` fasst die Mapbox-Klassen zusammen,
 * die gleich behandelt werden (primary + primary_link).
 */
export interface StrassenGruppe {
  id: string;
  titel: string;
  klassen: string[];
  ziel: StrassenZiel;
  /**
   * Breite bei A4 in mm. Waechst mit dem Format (A3 = 1,44-fach, A5 = 0,68-fach),
   * damit jedes Format dasselbe Bild zeigt. Im Netz = Acrylstreifen, in der
   * Gravur = Strich.
   */
  breiteMm: number;
}

/** Kartenbreite von A4 mit 7 mm Rahmen – der Bezug aller Strassenbreiten. */
export const REFERENZ_KARTENBREITE_MM = 196;

export type LetzteZeile = "koordinaten" | "wunschtext";

/** Kundeneingaben – dieselben Felder wie Family Motiv 8 "Zuhause Map". */
export interface Kundeneingabe {
  adresse: string;
  titel: string;
  namen: string;
  letzteZeile: LetzteZeile;
  /** Ort vor den Koordinaten ("BERLIN"). */
  ortText: string;
  wunschtext: string;
}

/**
 * poster:      Karte oben, Textfeld darunter – wie das Amazon-Poster "Zuhause".
 * eingebettet: Karte ueber die ganze Platte, die Texte liegen in der Karte auf
 *              einer weissen Schutzkontur, die ins Netz und den Rahmen uebergeht.
 *              Entworfen fuer das Quadrat (Marcel 16.09.2026).
 */
export type LayoutArt = "poster" | "eingebettet";

export type Anker = "oben-mitte" | "oben-links" | "oben-rechts" | "unten-mitte" | "unten-links" | "unten-rechts";

export interface EingebettetesLayout {
  titelAnker: Anker;
  zeile1Anker: Anker;
  zeile2Anker: Anker;
  /** Breite der weissen Schutzkontur um jeden Text. */
  schutzMm: number;
  /** Unterer Rand, breiter als die anderen – dort sitzen die Ecktexte. */
  rahmenUntenMm: number;
}

export interface TextStil {
  /** Dateiname in ~/Library/Fonts oder /Library/Fonts. */
  schrift: string;
  /** Versalhoehe als Anteil der Plattenhoehe – skaliert mit dem Format. */
  hoeheAnteil: number;
  /** Sperrung in em (0 = Schrift wie gesetzt). */
  sperrung: number;
  versalien: boolean;
}

export interface Schichtkarte {
  kunde: Kundeneingabe;

  /** Mittelpunkt des Ausschnitts und Position des Herzens. */
  lon: number;
  lat: number;
  /**
   * Breite des Kartenfensters in km Wirklichkeit – bei jedem Format gleich.
   * Ersetzt den Zoom: A3 zeigt denselben Kiez wie A5, nur groesser, so wie
   * das Poster, dessen Kartenbild einfach auf das Format skaliert wird.
   */
  ausschnittKm: number;

  format: FormatKey;
  breiteMm?: number;
  hoeheMm?: number;

  /** Weisser Rahmen rundum, soll im Falz des Bilderrahmens verschwinden. */
  rahmenMm: number;

  layoutArt: LayoutArt;
  eingebettet: EingebettetesLayout;

  // --- nur layoutArt "poster" ---
  /** Unterkante des Kartenfensters als Anteil der Plattenhoehe. */
  kartenEndeAnteil: number;
  /** Mittellinien der drei Textzeilen als Anteil der Plattenhoehe. */
  titelMitteAnteil: number;
  zeile1MitteAnteil: number;
  zeile2MitteAnteil: number;

  titelStil: TextStil;
  zeilenStil: TextStil;

  strassen: StrassenGruppe[];
  /** Schmaler wird kein Netzstreifen, auch wenn das Format ihn schrumpfen liesse. */
  netzMinBreiteMm: number;
  /**
   * Bloecke zwischen Netzstrassen, die kleiner sind, bleiben weiss. Ein Stueck
   * von 2 x 2 mm loest sich beim Schneiden nicht sauber heraus.
   */
  netzMinLochMm2: number;

  /** Wasserflaechen aus Schwarz schneiden. */
  wasser: boolean;
  /** Fluesse/Kanaele, die nur als Linie vorliegen, als Streifen mitschneiden. */
  wasserlaeufe: boolean;
  wasserlaufBreiteMm: number;
  /** Kleinere Wasserflaechen werden nicht geschnitten – nicht montierbar. */
  wasserMinFlaecheMm2: number;

  /**
   * Hoechstbreite der Stencil-Stege. Tatsaechlich nie breiter als der halbe
   * Schriftstrich an der Stelle und nie unter 0,3 mm.
   */
  stegMm: number;
  /**
   * Schmalere Innenflaechen bekommen keine Stege, sondern werden zugefuellt –
   * neben einem senkrechten Steg bliebe nichts stehen. Gemessen in Avant Garde
   * Demi bei A4: Gradzeichen 0,97 mm, obere 8 1,07, A 1,16; Bacalisties-
   * Schleifen 2,66-8,78 mm.
   */
  stencilMinInselBreiteMm: number;

  /** Breite des Herzens bei A4, waechst mit dem Format wie die Strassen. */
  herzBreiteMm: number;

  /** Lose Teile der weissen Lage in der Vorschau markieren. */
  loseTeileMarkieren: boolean;
}

export * from "./typen-ergebnis";
