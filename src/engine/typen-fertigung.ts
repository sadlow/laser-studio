// Fertigungseinstellungen, die nur die Laserdatei betreffen – nicht das Produkt.

/**
 * Wie die Gravur in die Laserdatei kommt (Marcel 16.09.2026: Liniengravur geht
 * wesentlich schneller als Flaechengravur, die Strichbreite laesst sich mit
 * leichtem Defokus vergroessern).
 *
 * flaeche:     die gepufferte Flaeche, gefuellt. Die Lasersoftware rastert sie –
 *              Breite exakt, aber jede Flaeche Zeile fuer Zeile.
 * mittellinie: jeder Weg einmal als offene Linie. Die Breite macht der Strahl.
 * kontur:      eng anliegende Ringe um jeden Weg, um den halben Strahl nach innen
 *              versetzt; bei breiten Wegen mehrere Ringe und die Mittellinie, bis die
 *              Sollbreite gedeckt ist. Wege, nicht breiter als der Strahl, bleiben Mittellinie.
 */
export type GravurArt = "flaeche" | "mittellinie" | "kontur";

export interface GravurExport {
  art: GravurArt;
  /** Breite der gelaserten Linie, mit Defokus – bestimmt den Versatz der Kontur. */
  strahlMm: number;
}

export const GRAVUR_ART_TITEL: Record<GravurArt, string> = {
  flaeche: "Flaeche (gefuellt)",
  mittellinie: "Mittellinie",
  kontur: "Kontur (eng anliegende Linien)",
};
