import type { FormatKey } from "./typen";

/**
 * Plattenmasse in mm, Hochformat. Die Breite folgt den gekauften Rahmen, nicht der DIN (Musterstueck 10.10.2026):
 * A5-Rahmen sind fuer 15 x 21 cm gebaut (Oeffnung 151 mm), eine Karte mit 148 mm rutschte seitlich; A4-Rahmen nehmen
 * etwa 212 mm auf. Je 1 mm Spiel fuer Fertigungsschwankungen. Hoehen und A3 noch nicht nachgemessen.
 */
export const FORMATE: Record<Exclude<FormatKey, "frei">, { breiteMm: number; hoeheMm: number; titel: string; zeilenWieHoeheMm?: number }> = {
  a5: { breiteMm: 150, hoeheMm: 210, titel: "DIN A5" },
  a4: { breiteMm: 211, hoeheMm: 297, titel: "DIN A4" },
  a3: { breiteMm: 297, hoeheMm: 420, titel: "DIN A3" },
  quadrat30: { breiteMm: 300, hoeheMm: 300, titel: "Quadrat 30 x 30" },
  // Groesser als das Laserfeld: jede Lage aus zwei Rohplatten, nur mit Holzrahmen (Marcel 25.09.2026).
  // Namen, Freitext und Koordinaten so gross wie bei 30 x 30: die groessere Karte zeigt mehr Umgebung, sie ist kein
  // hochskaliertes Bild (Marcel 25.09.2026).
  quadrat60: { breiteMm: 600, hoeheMm: 600, titel: "Quadrat 60 x 60", zeilenWieHoeheMm: 300 },
};

/** Die Plattenhoehe, auf die sich die Zeilengroesse (hoeheAnteil) bezieht – bei 60 x 60 die des 30 x 30. */
export function zeilenBezugMm(format: FormatKey, hoeheMm: number): number {
  return (format !== "frei" && FORMATE[format].zeilenWieHoeheMm) || hoeheMm;
}

/** Loest das gewaehlte Format in konkrete Masse auf. */
export function masseAusFormat(
  format: FormatKey,
  breiteMm?: number,
  hoeheMm?: number,
): { breiteMm: number; hoeheMm: number } {
  if (format === "frei") {
    return {
      breiteMm: breiteMm && breiteMm > 0 ? breiteMm : 200,
      hoeheMm: hoeheMm && hoeheMm > 0 ? hoeheMm : 200,
    };
  }
  return FORMATE[format];
}
