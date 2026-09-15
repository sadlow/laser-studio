// Der Vertrag der Engine. Alles, was ein Kartenprodukt beschreibt, steht hier –
// und nur hier. Die UI ist ein Formular auf diese Typen, die Produktion ruft
// dieselbe Funktion mit denselben Werten auf.
//
// Grundsatz: Layout sind Zahlen, Form ist ein Asset. Nichts in diesem Modul
// kennt React, Next oder ein Dateisystem.

/** Vordefinierte Plattenformate. `frei` traegt eigene Masse. */
export type FormatKey = "a5" | "a4" | "a3" | "quadrat30" | "frei";

/** Welche Rolle ein Layer auf dem Laser spielt. */
export type Rolle = "schnitt" | "gravur" | "aus";

/** Die Datenebenen, die Mapbox liefert. */
export type EbenenKey = "water" | "roads" | "streets" | "green" | "buildings";

export interface EbenenEinstellung {
  key: EbenenKey;
  rolle: Rolle;
  /** Strichstaerke in mm (nur fuer Linien-Ebenen: roads, streets). */
  strichMm?: number;
  /**
   * Gravurdichte 0..1 (nur fuer Flaechen-Ebenen: water, green, buildings).
   *
   * Kein Anzeige-Trick: Lasersoftware liest den Grauwert als Leistung. 1.0
   * brennt die Flaeche voll durch, und ein Wald deckt dann die halbe Karte zu.
   * Was hier eingestellt wird, ist die Tiefe im Holz.
   */
  dichte?: number;
}

/** Ausrichtung eines Textes in seiner Zone. */
export type TextAusrichtung = "links" | "mitte" | "rechts";

export interface TextZone {
  id: string;
  text: string;
  /** Schriftgroesse in mm (Versalhoehe-nah, nicht pt – das Werkstueck zaehlt). */
  groesseMm: number;
  ausrichtung: TextAusrichtung;
  rolle: Rolle;
}

export interface KartenEntwurf {
  format: FormatKey;
  /** Nur bei format === "frei". */
  breiteMm?: number;
  hoeheMm?: number;

  /** Steg rundum, in dem nichts liegt. */
  rahmenMm: number;

  /** Hoehe des Textfeldes unter der Karte. 0 = kein Textfeld. */
  textfeldMm: number;

  /** Abstand zwischen Kartenfeld und Textfeld. */
  textabstandMm: number;

  /** Mittelpunkt des Ausschnitts. */
  lon: number;
  lat: number;

  /**
   * Mapbox-Zoom fuer den AUSSCHNITT. Bestimmt, wieviel Welt auf die Platte
   * passt – nicht, wie detailliert die Daten sind (die kommen immer aus z14).
   */
  zoom: number;

  ebenen: EbenenEinstellung[];
  texte: TextZone[];

  /** Umriss der Platte selbst schneiden (sonst nur der Inhalt). */
  plattenschnitt: boolean;
}

export interface Zone {
  xMm: number;
  yMm: number;
  breiteMm: number;
  hoeheMm: number;
}

export interface Layout {
  platte: Zone;
  kartenfeld: Zone;
  textfeld: Zone | null;
  textzeilen: Zone[];
}

export interface Entwurfsergebnis {
  svg: string;
  layout: Layout;
  /** Kantenlaenge des Ausschnitts in Metern – fuer die Plausibilitaet. */
  ausschnittMeter: { breite: number; hoehe: number };
  /** Gezeichnete Pfade je Ebene, zur Kontrolle im Dialog. */
  statistik: { ebene: string; rolle: Rolle; pfade: number }[];
  warnungen: string[];
}

/** Farben nach Laser-Konvention: Rot schneidet, Schwarz graviert. */
export const FARBE: Record<Exclude<Rolle, "aus">, string> = {
  schnitt: "#ff0000",
  gravur: "#000000",
};

/** Linien-Ebenen brauchen eine Strichstaerke, Flaechen-Ebenen nicht. */
export const IST_LINIEN_EBENE: Record<EbenenKey, boolean> = {
  water: false,
  roads: true,
  streets: true,
  green: false,
  buildings: false,
};

export const EBENEN_TITEL: Record<EbenenKey, string> = {
  water: "Wasser",
  roads: "Hauptstrassen",
  streets: "Alle Strassen",
  green: "Gruenflaechen",
  buildings: "Gebaeude",
};
