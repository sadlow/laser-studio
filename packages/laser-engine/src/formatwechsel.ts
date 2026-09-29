import { standardSchichtkarte } from "./standard";
import { standardLayoutWerte, zeilenGroesse } from "./poster-masse";
import { massstabsgleicherAusschnittKm } from "./layout";
import { vervollstaendige } from "./vervollstaendige";
import type { FormatKey, Schichtkarte } from "./typen";
export const NUR_MIT_RAHMEN: FormatKey[] = ["quadrat60"];
/** Gemeinsame Formatwahl: Massstab, Textmasse, Material und Rahmenpflicht. */
export function mitFormat(karte: Schichtkarte, format: FormatKey): Schichtkarte {
  const w = standardLayoutWerte(format);
  const k = vervollstaendige({ ...karte, ...w, format, teilungWahl: undefined,
    titelStil: { ...karte.titelStil, hoeheAnteil: w.titelStil.hoeheAnteil },
    zeilenStil: { ...karte.zeilenStil, hoeheAnteil: zeilenGroesse(format, karte.zeilenStil.schrift).hoeheAnteil },
    kunde: { ...karte.kunde, holzrahmen: NUR_MIT_RAHMEN.includes(format) && (!karte.kunde.holzrahmen || karte.kunde.holzrahmen === "ohne") ? "schwarz" : karte.kunde.holzrahmen },
  });
  k.ausschnittKm = massstabsgleicherAusschnittKm(k);
  return k;
}
export function formatStandard(format: FormatKey): Schichtkarte { return mitFormat(standardSchichtkarte(), format); }
