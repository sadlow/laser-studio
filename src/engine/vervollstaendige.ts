import { standardSchichtkarte, staerkenAus } from "./standard";
import type { Schichtkarte } from "./typen";

/**
 * Fuellt auf, was ein offenes Browserfenster oder eine aeltere Vorlage noch nicht kennt: die Grenzwerte vom Testblatt,
 * die Plattenstaerken in neuer Form (staerkenAus), Teilung und Kante.
 */
export function vervollstaendige(eingabe: Schichtkarte): Schichtkarte {
  const basis = standardSchichtkarte();
  return {
    ...eingabe,
    staerkenMm: staerkenAus(eingabe.staerkenMm),
    grundSchwarzFrost: eingabe.grundSchwarzFrost ?? (eingabe as { schwarzFrost?: boolean }).schwarzFrost ?? basis.grundSchwarzFrost,
    stegMinMm: eingabe.stegMinMm ?? basis.stegMinMm,
    netzMinSpaltMm: eingabe.netzMinSpaltMm ?? basis.netzMinSpaltMm,
    gravurExport: { ...basis.gravurExport, ...eingabe.gravurExport },
    teilung: { ...basis.teilung, ...eingabe.teilung },
    kante: { ...basis.kante, ...eingabe.kante },
    titelStil: { ...eingabe.titelStil, minStrichMm: eingabe.titelStil.minStrichMm ?? basis.titelStil.minStrichMm },
    zeilenStil: { ...eingabe.zeilenStil, minStrichMm: eingabe.zeilenStil.minStrichMm ?? basis.zeilenStil.minStrichMm },
  };
}
