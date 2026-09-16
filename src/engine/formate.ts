import type { FormatKey } from "./typen";

/** Plattenmasse in mm, Hochformat. */
export const FORMATE: Record<Exclude<FormatKey, "frei">, { breiteMm: number; hoeheMm: number; titel: string }> = {
  a5: { breiteMm: 148, hoeheMm: 210, titel: "DIN A5" },
  a4: { breiteMm: 210, hoeheMm: 297, titel: "DIN A4" },
  a3: { breiteMm: 297, hoeheMm: 420, titel: "DIN A3" },
  quadrat30: { breiteMm: 300, hoeheMm: 300, titel: "Quadrat 30 x 30" },
};

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
