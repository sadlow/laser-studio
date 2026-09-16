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

import type { Punkt } from "./clip";

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

  /** Breite der Stencil-Stege, die freiliegende Innenflaechen im Text halten. */
  stegMm: number;
  /**
   * Innenflaechen unter diesem Anteil bekommen keine Stege, sondern werden
   * zugefuellt. Bezug: Quadrat mit der Versalhoehe der Zeile als Kante – so
   * gilt die Grenze bei jedem Format gleich. Gemessen in Josefin Sans:
   * Gradzeichen 1,3 %, obere 8 2,9 %, A 4,3 %.
   */
  stencilMinInselAnteil: number;

  /** Breite des Herzens bei A4, waechst mit dem Format wie die Strassen. */
  herzBreiteMm: number;

  /** Lose Teile der weissen Lage in der Vorschau markieren. */
  loseTeileMarkieren: boolean;
}

export interface Zone {
  xMm: number;
  yMm: number;
  breiteMm: number;
  hoeheMm: number;
}

export interface Layout {
  platte: Zone;
  kartenfenster: Zone;
}

/** Ein physisches Teil: Aussenkontur mit Loechern, alles in mm. */
export interface Teil {
  aussen: Punkt[];
  loecher: Punkt[][];
  flaecheMm2: number;
}

export type LagenKey = "herz" | "weiss" | "schwarz" | "blau";

export interface Lage {
  key: LagenKey;
  titel: string;
  material: string;
  teile: Teil[];
  /** Nur Schwarz: feine Wege als Linien (mm) mit Strichbreite. */
  gravur: { linien: Punkt[][]; breiteMm: number }[];
  /** SVG fuer den Laser: Schnitt rot, Gravur schwarz, Einheit mm. */
  laserSvg: string;
}

export interface Kennzahlen {
  /** Wieviel vom Kartenfenster ist weisses Netz – das Mass fuer "zu dicht". */
  weissAnteilFenster: number;
  netzLoecherZugefuellt: number;
  /** Strassengruppen, deren Breite durch das Format unter die Mindestbreite fiele. */
  netzAnMindestbreite: string[];
  formatfaktor: number;
  zoomEntsprechung: number;
  weissTeile: number;
  weissLoseImNetz: number;
  weissLoseImText: number;
  schwarzTeile: number;
  stencilStege: number;
  punzenOhneSteg: number;
  inselnZugefuellt: number;
  wasserFlaechenGeschnitten: number;
  rechenzeitMs: number;
}

export interface SchichtkartenErgebnis {
  vorschauSvg: string;
  lagen: Lage[];
  layout: Layout;
  texte: { titel: string; zeile1: string; zeile2: string };
  ausschnittMeter: { breite: number; hoehe: number };
  kennzahlen: Kennzahlen;
  warnungen: string[];
}
