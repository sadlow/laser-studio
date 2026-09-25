/**
 * Woher die Karte kommt. Die Engine liest Vector-Tiles und denkt in den Strassenklassen von
 * mapbox-streets-v8 (typen-strassen.ts, standard.ts, jede Vorlage). Eine Quelle liefert die
 * Kachelbytes und ordnet jedes Feature in dieses Vokabular ein – so bleiben Vorlagen, Breiten
 * und Dichteziele gueltig, egal ob die Daten von Mapbox oder aus dem eigenen Archiv kommen.
 *
 * Im Laser-Studio war das fest verdrahtet (Mapbox, Zoom 14). Der Customizer liest das eigene
 * Archiv (Protomaps, Zoom 15); die Mapbox-Quelle bleibt fuer den Abgleich.
 */
export type Merkmal =
  | { art: "strasse"; /** Klasse wie in mapbox-streets-v8, z.B. "primary", "street", "major_rail". */ klasse: string; bruecke: boolean }
  | { art: "wasserflaeche" }
  | { art: "wasserlauf" };

export interface KachelQuelle {
  /** Name fuer Protokolle und Kennzahlen ("mapbox-streets-v8", "protomaps-4"). */
  name: string;
  /** Zoomstufe, auf der die Kacheln gelesen werden. */
  zoom: number;
  /** Diese Ebenen werden gelesen, in dieser Reihenfolge – sie bestimmt die Reihenfolge der Linien. */
  ebenen: string[];
  /** Rohe, entpackte Kachelbytes; null oder leer, wo es nichts gibt (offenes Meer). */
  hole(z: number, x: number, y: number, signal?: AbortSignal): Promise<Uint8Array | ArrayBuffer | null>;
  /** Ordnet ein Feature ein; null heisst: gehoert nicht in die Karte. `typ`: 1 Punkt, 2 Linie, 3 Flaeche. */
  ordne(ebene: string, merkmale: Record<string, unknown>, typ: number): Merkmal | null;
}
