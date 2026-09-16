import { masseAusFormat } from "./formate";
import type { Layout, Schichtkarte } from "./typen";

/**
 * Parameter -> Zonen.
 *
 * Die Hoehen sind Anteile der Platte, vermessen am Amazon-Poster "Zuhause"
 * (Family Motiv 8). Dadurch traegt ein Satz Zahlen jedes Format.
 *
 * Der Rahmen ist dagegen ein festes Mass: er soll im Falz des Bilderrahmens
 * verschwinden, und der Falz waechst nicht mit dem Format.
 */
export function berechneLayout(k: Schichtkarte): Layout {
  const { breiteMm, hoeheMm } = masseAusFormat(k.format, k.breiteMm, k.hoeheMm);
  const rahmen = Math.max(0, k.rahmenMm);

  // Eingebettet: die Karte fuellt alles innerhalb des Rahmens, unten breiter.
  if (k.layoutArt === "eingebettet") {
    const unten = Math.max(rahmen, k.eingebettet.rahmenUntenMm);
    return {
      platte: { xMm: 0, yMm: 0, breiteMm, hoeheMm },
      kartenfenster: {
        xMm: rahmen,
        yMm: rahmen,
        breiteMm: Math.max(1, breiteMm - 2 * rahmen),
        hoeheMm: Math.max(1, hoeheMm - rahmen - unten),
      },
    };
  }

  const kartenEnde = Math.max(rahmen + 10, Math.min(hoeheMm - rahmen, hoeheMm * k.kartenEndeAnteil));

  return {
    platte: { xMm: 0, yMm: 0, breiteMm, hoeheMm },
    kartenfenster: {
      xMm: rahmen,
      yMm: rahmen,
      breiteMm: Math.max(1, breiteMm - 2 * rahmen),
      hoeheMm: Math.max(1, kartenEnde - rahmen),
    },
  };
}
