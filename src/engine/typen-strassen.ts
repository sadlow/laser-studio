// Strassen: was geschnitten, was graviert wird und wie breit.
// Getrennt vom Produktvertrag in typen.ts, der von dort re-exportiert wird.

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
  /**
   * Gravurklasse, die in lichten Gegenden ins Netz nachruecken darf – in der
   * Reihenfolge der Tabelle (Allgaeu: Feldwege, Venedig: Gassen).
   */
  nachruecken?: boolean;
}

/** Kartenbreite von A4 mit 7 mm Rahmen – der Bezug aller Strassenbreiten. */
export const REFERENZ_KARTENBREITE_MM = 196;

/**
 * Netzbreiten folgen der Dichte vor Ort: Tokio soll nicht zulaufen, das Allgaeu
 * nicht leer bleiben, und das Netz bleibt trotzdem schneidbar (Marcel
 * 16.09.2026: "Unsere Strasseneinstellungen und Grenzwerte muessen auf der
 * ganzen Welt funktionieren").
 *
 * Deckung = Summe (Strassenlaenge x Breite) / Landflaeche im Fenster. Alle
 * Netzbreiten werden gemeinsam so skaliert, dass die Deckung das Ziel trifft,
 * nach oben gedeckelt. Die fruehere Regel "Breite ~ 1 / Ausschnitt" steckt
 * darin: doppelter Ausschnitt, doppelte Strassenlaenge auf der Platte. Faellt
 * die feinste Netzklasse unter die Mindestbreite und reicht maxAufdickung
 * nicht, wird sie graviert statt geschnitten und neu gerechnet (dichte.ts).
 */
export interface Generalisierung {
  aktiv: boolean;
  /** So viel breiter als entworfen darf eine Strasse in lichten Gegenden werden. */
  maxFaktor: number;
  /** Was die Stufen bedeuten, die der Kunde waehlt. */
  stufen: Record<StrassenStufe, StufenWerte>;
}

/**
 * Kundenwahl, nicht stufenlos (Marcel 16.09.2026): viele Strassen geschnitten,
 * ausgewogen, oder wenige geschnitten und viel Gravur – je nach Ausschnitt.
 */
export type StrassenStufe = "viel" | "ausgewogen" | "wenig";

/**
 * nie:   keine Gravurklasse rueckt ins Netz.
 * licht: nur, wenn der Ort unter der halben Zieldeckung bleibt (Allgaeu).
 * immer: ueberall, solange dafuer keine geschnittene Klasse graviert werden muss.
 */
export type Nachruecken = "nie" | "licht" | "immer";

export interface StufenWerte {
  /** Deckung, auf die die Netzbreiten skaliert werden (ausgewogen: Berlin-Tiergarten 3,5 km = 0,33). */
  zielDeckung: number;
  /** So viel darf die feinste Netzklasse aufgedickt werden, bevor sie graviert wird. */
  maxAufdickung: number;
  nachruecken: Nachruecken;
}
