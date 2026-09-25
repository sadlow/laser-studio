import type { Schichtkarte, Zone } from "./typen";
import type { TeilungsErgebnis } from "./typen-teilung";

/** Hinweise zur geteilten Karte fuer die Warnliste. */
export function teilungsWarnungen(t: TeilungsErgebnis, k: Schichtkarte, textZonen: { name: string; zone: Zone }[]): string[] {
  const raus: string[] = [];
  if ((k.kunde.holzrahmen ?? "ohne") === "ohne") {
    raus.push(
      "Diese Groesse gibt es nur mit Holzrahmen: er haelt die Haelften zusammen und deckt die Plattenkanten (Marcel 25.09.2026).",
    );
  }
  for (const l of t.lagen) {
    const n = l.gewaehlt;
    if (l.front) {
      for (const { name, zone } of textZonen) {
        const [von, bis] = n.richtung === "oben-unten" ? [zone.yMm, zone.yMm + zone.hoeheMm] : [zone.xMm, zone.xMm + zone.breiteMm];
        if (n.posMm > von && n.posMm < bis) raus.push(`Die Naht der Front laeuft durch "${name}".`);
      }
    }
    if (n.einzelteile > 0) {
      raus.push(
        `${l.titel}: die Naht (${n.richtung} bei ${n.posMm} mm) trennt ${n.einzelteile} Einzelteil${n.einzelteile === 1 ? "" : "e"} ab` +
          `${n.kleine ? `, ${n.kleine} davon unter ${Math.round(k.teilung.kleinMm2 / 100)} cm²` : ""} – im Montageplan markiert.`,
      );
    }
  }
  return raus;
}
