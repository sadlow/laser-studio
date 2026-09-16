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

/** deck nur beim schwarzen Netz: weisse Oberseite mit Rahmen und Text. */
export type LagenKey = "symbol" | "deck" | "netz" | "hintergrund" | "blau";

export interface Lage {
  key: LagenKey;
  titel: string;
  material: string;
  teile: Teil[];
  /** Nur Hintergrund: feine Wege als Linien (mm) mit Strichbreite. */
  gravur: { linien: Punkt[][]; breiteMm: number }[];
  /** SVG fuer den Laser: Schnitt rot, Gravur schwarz, Einheit mm. */
  laserSvg: string;
}

export interface Kennzahlen {
  /** Wieviel vom Kartenfenster ist Strassennetz – das Mass fuer "zu dicht". */
  netzAnteilFenster: number;
  netzLoecherZugefuellt: number;
  /** Strassengruppen, deren Breite durch das Format unter die Mindestbreite fiele. */
  netzAnMindestbreite: string[];
  formatfaktor: number;
  /** Anteil der Breite, der aus der Dichte vor Ort kommt (1 ohne Generalisierung). */
  dichtefaktor: number;
  /** Strassenlaenge x Vorlagenbreite / Land – so dicht waere das Netz ohne Anpassung. */
  deckungVorOrt: number;
  /** Netzklassen, die hier zu dicht fuer schneidbare Breiten waeren und graviert werden. */
  herabgestuft: string[];
  /** Gravurklassen, die mitgeschnitten werden, weil der Ort licht ist. */
  nachgerueckt: string[];
  /** Waeren nachgerueckt, zerfielen aber in lose Stuecke und bleiben Gravur. */
  nachrueckenVerworfen: string[];
  zoomEntsprechung: number;
  /** Strassenstuecke, die nicht am Netz haengen und lose herausfallen. */
  loseNetzstuecke: number;
  /** Lose Stuecke, die deshalb graviert statt geschnitten werden. */
  loseZurGravur: number;
  /** Innenflaechen im Text, die trotz Stegen lose sind. */
  loseTextteile: number;
  /** Teile der Hintergrund-Lage – mehr als eins, wenn Wasser sie teilt. */
  hintergrundTeile: number;
  stencilStege: number;
  punzenOhneSteg: number;
  inselnZugefuellt: number;
  wasserFlaechenGeschnitten: number;
  /** Kleine Inseln, die Wasser wurden statt Einzelteil. */
  wasserInselnGeflutet: number;
  rechenzeitMs: number;
}

export interface SchichtkartenErgebnis {
  vorschauSvg: string;
  /** Wirksame Kartenmitte – die Vorschau rechnet damit Ziehen in Koordinaten um. */
  kartenMitte: { lon: number; lat: number };
  /** Standort-Symbol in mm: Anker auf dem Ort und Umriss-Box; null ausserhalb des Ausschnitts. */
  symbol: { ankerXMm: number; ankerYMm: number; xMm: number; yMm: number; breiteMm: number; hoeheMm: number } | null;
  lagen: Lage[];
  layout: Layout;
  texte: { titel: string; zeile1: string; zeile2: string };
  ausschnittMeter: { breite: number; hoehe: number };
  kennzahlen: Kennzahlen;
  warnungen: string[];
}
