import type { Schichtkarte, SchichtkartenErgebnis } from "@/engine/typen";

// Die letzten Vorschauen, damit "Naehte berechnen" die Karte nicht noch einmal baut. Wenige Eintraege: jeder traegt die
// ganze Geometrie aller Lagen.
const MAX = 3;
// Am globalThis: Next buendelt jede Route fuer sich, ein Modul-Map gaebe es sonst je Route einmal.
const ablage = globalThis as { schichtkartenCache?: Map<string, SchichtkartenErgebnis> };
const speicher = (ablage.schichtkartenCache ??= new Map());

/** Schluessel ohne die Nahtwahl – sie aendert die Karte nicht, nur die Teilung. */
export function schluessel(k: Schichtkarte): string {
  const { teilungWahl: _wahl, ...rest } = k;
  return JSON.stringify(rest);
}

export function merke(k: Schichtkarte, r: SchichtkartenErgebnis) {
  const s = schluessel(k);
  speicher.delete(s);
  speicher.set(s, r);
  while (speicher.size > MAX) speicher.delete(speicher.keys().next().value!);
}

export function gemerkt(k: Schichtkarte): SchichtkartenErgebnis | undefined {
  return speicher.get(schluessel(k));
}
