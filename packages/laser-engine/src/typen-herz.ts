// Herzkarte aus Holz: die Tiefenwerk-Lasermap „MD2 We said yes“ (Marcel 15.11.2026).
// Getrennt vom Produktvertrag in typen.ts, der von dort re-exportiert wird.

/** Eine gravierte Zeile unter dem Herz. Lage und Groesse als Anteile der Plattenhoehe. */
export interface HerzZeile {
  /** Dateiname der Schrift (wie TextStil.schrift). */
  schrift: string;
  /** Versalhoehe als Anteil der Plattenhoehe. Beim Titel: Hoehe des grossen W in „We said yes“. */
  versalAnteil: number;
  /** Mitte der Versalhoehe als Anteil der Plattenhoehe. */
  mitteAnteil: number;
  /** Sperrung in em. */
  sperrung: number;
  versalien: boolean;
}

/**
 * Lage des Herzfensters und der Texte, vermessen an den Illustrator-Vorlagen A5/A4/A3 (herz-form.ts). Das Herz hat
 * in jedem Format dieselbe Form; seine Hoehe folgt aus der Breite.
 */
export interface HerzLayout {
  /** Linke und obere Kante der Herzbox und ihre Breite, als Anteile von Plattenbreite bzw. -hoehe. */
  linksAnteil: number;
  obenAnteil: number;
  breiteAnteil: number;
  titel: HerzZeile;
  /** Zwei verschlungene Ringe zwischen Titel und Namen (graviert); null = ohne. */
  ringe: { mitteAnteil: number; breiteAnteil: number; strichAnteil: number } | null;
  /** Namen, Ort & Datum, Koordinaten bzw. Wunschtext. */
  zeile1: HerzZeile;
  zeile2: HerzZeile;
  zeile3: HerzZeile;
  /** Hoechstens so breit (Anteil der Plattenbreite), sonst wird die Zeile verkleinert. */
  maxBreiteAnteil: number;
}

export interface HolzPlatte {
  material: string;
  staerkeMm: number;
}

/**
 * Die drei Lagen der Holzkarte (Marcel 15.11.2026): oben furniertes HDF Birne 3 mm (Rahmen, Herzloch, Strassennetz,
 * Gravur), Mitte Edelsperrholz Nussbaum 5 mm (Land, Wasser ausgeschnitten), unten Acrylglas hellblau Frost 3 mm.
 */
export interface HolzAufbau {
  netz: HolzPlatte;
  grund: HolzPlatte;
  blau: HolzPlatte;
}
