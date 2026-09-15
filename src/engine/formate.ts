import type { FormatKey, KartenEntwurf } from "./typen";

/** Plattenmasse in mm. Hochformat; Querformat entsteht durch Tausch in der UI. */
export const FORMATE: Record<Exclude<FormatKey, "frei">, { breiteMm: number; hoeheMm: number; titel: string }> = {
  a5: { breiteMm: 148, hoeheMm: 210, titel: "DIN A5" },
  a4: { breiteMm: 210, hoeheMm: 297, titel: "DIN A4" },
  a3: { breiteMm: 297, hoeheMm: 420, titel: "DIN A3" },
  quadrat30: { breiteMm: 300, hoeheMm: 300, titel: "Quadrat 30 x 30" },
};

/** Loest das gewaehlte Format in konkrete Masse auf. */
export function masseAusEntwurf(e: KartenEntwurf): { breiteMm: number; hoeheMm: number } {
  if (e.format === "frei") {
    return {
      breiteMm: e.breiteMm && e.breiteMm > 0 ? e.breiteMm : 200,
      hoeheMm: e.hoeheMm && e.hoeheMm > 0 ? e.hoeheMm : 200,
    };
  }
  return FORMATE[e.format];
}
