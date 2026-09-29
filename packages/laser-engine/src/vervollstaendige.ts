import { standardSchichtkarte, staerkenAus } from "./standard";
import type { Schichtkarte } from "./typen";

/** Alte Vorlagen und Browser-Eingaben bekommen neue Parameter rekursiv aus denselben Werkswerten. */
export function ergaenzeWerte<T>(basis: T, eingabe: unknown): T {
  if (!eingabe || typeof eingabe !== "object" || Array.isArray(eingabe)) return basis;
  const aus = { ...basis } as Record<string, unknown>;
  for (const [key, value] of Object.entries(eingabe)) {
    if (value === undefined) continue;
    const alt = aus[key];
    aus[key] = alt && typeof alt === "object" && !Array.isArray(alt) && value && typeof value === "object" && !Array.isArray(value)
      ? ergaenzeWerte(alt, value) : value;
  }
  return aus as T;
}
export function vervollstaendige(eingabe: Schichtkarte): Schichtkarte {
  const basis = standardSchichtkarte();
  const k = ergaenzeWerte(basis, eingabe);
  if (!k.symbolStufenMm?.length) k.symbolStufenMm = basis.symbolStufenMm;
  k.staerkenMm = staerkenAus(eingabe.staerkenMm);
  k.grundSchwarzFrost = eingabe.grundSchwarzFrost ?? (eingabe as { schwarzFrost?: boolean }).schwarzFrost ?? basis.grundSchwarzFrost;
  if (k.format === "quadrat60") k.staerkenMm = { acryl: Math.max(3, k.staerkenMm.acryl), grundSchwarz: Math.max(3, k.staerkenMm.grundSchwarz), spiegel: Math.max(3, k.staerkenMm.spiegel) };
  return k;
}
