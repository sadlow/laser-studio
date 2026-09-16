import type { Holzrahmen, Layout, Schichtkarte, SchichtkartenErgebnis, Zone } from "./typen";

export const HOLZRAHMEN_TITEL: Record<Holzrahmen, string> = { ohne: "ohne", schwarz: "Holz schwarz", weiss: "Holz weiss", eiche: "Eiche", dunkelbraun: "Holz dunkelbraun" };

/**
 * Holzrahmen (Marcel 16.09.2026): Holz schwarz, weiss, dunkelbraun oder Eiche, bei allen
 * Groessen dasselbe Profil. Die Platte liegt im Falz, innen steht der Rahmen ueber das Motiv. An
 * den Schnittdateien aendert er nichts – aber er deckt einen Streifen am Rand ab,
 * und der Stapel muss in den Falz passen.
 */
export function holzrahmenPruefen(
  k: Schichtkarte,
  layout: Layout,
  symbol: SchichtkartenErgebnis["symbol"],
  textZonen: SchichtkartenErgebnis["textZonen"],
  stapelMm: number,
): { rahmen: SchichtkartenErgebnis["rahmen"]; warnungen: string[]; randImRahmenMm: number } {
  const p = k.holzrahmenProfil;
  const randImRahmenMm = k.rahmenMm - p.ueberstandMm;
  const farbe = k.kunde.holzrahmen;
  if (!farbe || farbe === "ohne") return { rahmen: null, warnungen: [], randImRahmenMm };

  const warnungen: string[] = [];
  const u = p.ueberstandMm;
  const { platte } = layout;
  // Liegt eine Zone im Streifen, den der Rahmen innen ueberdeckt?
  const verdeckt = (z: Zone) => z.xMm < u || z.yMm < u || z.xMm + z.breiteMm > platte.breiteMm - u || z.yMm + z.hoeheMm > platte.hoeheMm - u;

  if (randImRahmenMm < 0) {
    warnungen.push(`Der Holzrahmen steht ${u} mm ueber das Motiv, der Rand ist nur ${k.rahmenMm} mm – ${(-randImRahmenMm).toFixed(1)} mm der Karte liegen unter dem Rahmen.`);
  }
  if (symbol && verdeckt(symbol)) {
    warnungen.push("Das Standort-Symbol reicht unter den Holzrahmen und stuende gegen die Rahmenkante. Symbol weiter nach innen ziehen.");
  }
  const text = textZonen.filter((t) => verdeckt(t.zone)).map((t) => t.name);
  if (text.length) warnungen.push(`${text.join(", ")} reicht unter den Holzrahmen.`);
  const falz = p.tiefeMm - p.einlassMm;
  if (stapelMm > falz) {
    warnungen.push(`Der Lagenstapel (${stapelMm} mm) ist tiefer als der Falz des Holzrahmens (${falz} mm) und steht hinten heraus.`);
  }
  return { rahmen: { farbe, ...p }, warnungen, randImRahmenMm };
}
