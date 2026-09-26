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
  /**
   * Mit dem Format wachsen die Breiten hoechstens um diesen Faktor (Standard 1,46 = 30 x 30, dichte.ts). Das 60 x 60
   * bekommt so die Breiten des 30 x 30 – wie Symbol und Schrift.
   */
  formatBis?: number;
  /**
   * Ab diesem Massstab (Meter je mm im Verhaeltnis zu A4 bei 3,5 km) graviert jede Stufe eine Netzklasse mehr
   * (Standard 1,5: 60 x 60 ab 15 km, A4 ab 5,3 km). Weiter draussen liegen die Wohnstrassen einer Stadt so dicht, dass
   * fast jeder Block zugefuellt wird und der Ort ein schwarzer Fleck ist (Lanzarote 20 km: 626 Bloecke, 26.09.2026).
   */
  mehrGravurAb?: number;
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
  /** Deckung, auf die die Netzbreiten skaliert werden (ausgewogen: Berlin-Tiergarten 3,5 km = 0,29). */
  zielDeckung: number;
  /** So viel darf die feinste Netzklasse aufgedickt werden, bevor sie graviert wird. */
  maxAufdickung: number;
  nachruecken: Nachruecken;
  /**
   * So viele der feinsten Netzklassen graviert die Stufe immer, auch wo sie schneidbar waeren. Fehlt
   * der Wert (aeltere Vorlage, offenes Browserfenster), gilt der Standard der Stufe (dichte.ts).
   */
  feinsteGraviert?: number;
  /**
   * Laenger darf ein geschnittener Strang nicht frei laufen, sonst holt die Stufe einzelne Wege als Querverbindung ins
   * Netz (querverbindung.ts; mm auf der Platte, Sackgassen zaehlen doppelt, 0 = aus). Ohne Wert: viel 30, ausgewogen 80.
   */
  stuetzMm?: number;
}
