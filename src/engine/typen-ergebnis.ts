// Was die Engine zurueckgibt: Zonen, Teile, Lagen, Kennzahlen.
// Getrennt vom Eingabe-Vertrag in typen.ts, der von dort re-exportiert wird.

import type { Punkt } from "./clip";

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
