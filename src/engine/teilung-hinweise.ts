import { berechneTeilung } from "./teilung";
import type { Schichtkarte, SchichtkartenErgebnis, Zone } from "./typen";
import type { TeilungsErgebnis } from "./typen-teilung";
import { vervollstaendige } from "./vervollstaendige";

/**
 * Die Nahtsuche fuer ein fertiges Ergebnis nachholen – die Live-Vorschau rechnet ohne sie. Dieselben Lagen, dieselbe
 * Rechnung wie im Export; nur die Karte wird nicht noch einmal gebaut.
 */
export function teilungFuer(r: SchichtkartenErgebnis, eingabe: Schichtkarte): { teilung: TeilungsErgebnis | null; warnungen: string[] } {
  const k = vervollstaendige(eingabe);
  const teilung = berechneTeilung(r.layout.platte, r.lagen, k.teilung, k.teilungWahl);
  return { teilung, warnungen: teilung ? teilungsWarnungen(teilung, k, r.textZonen) : [] };
}

/** Geteilte Karten nur mit Holzrahmen – unabhaengig davon, ob die Naehte schon gerechnet sind. */
export function rahmenPflicht(k: Schichtkarte): string[] {
  return (k.kunde.holzrahmen ?? "ohne") === "ohne"
    ? ["Diese Groesse gibt es nur mit Holzrahmen: er haelt die Haelften zusammen und deckt die Plattenkanten (Marcel 25.09.2026)."]
    : [];
}

/** Hinweise zu den gewaehlten Naehten fuer die Warnliste. */
export function teilungsWarnungen(t: TeilungsErgebnis, k: Schichtkarte, textZonen: { name: string; zone: Zone }[]): string[] {
  const raus: string[] = [];
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
