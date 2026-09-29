import { masseAusFormat } from "./formate";
import { REFERENZ_KARTENBREITE_MM, type Layout, type Schichtkarte } from "./typen";

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
  const rahmen = randMm(k);

  // Eingebettet und Kante: die Karte fuellt alles innerhalb des Rahmens, unten breiter.
  if (k.layoutArt === "eingebettet" || k.layoutArt === "kante") {
    const unten = Math.max(rahmen, k.layoutArt === "kante" ? k.kante.rahmenUntenMm : k.eingebettet.rahmenUntenMm);
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

/** Rand rundum: beim Titel auf der Kante bringt das Layout seinen eigenen, breiteren mit. */
export function randMm(k: Schichtkarte): number {
  return Math.max(0, k.layoutArt === "kante" ? k.kante.rahmenMm : k.rahmenMm);
}

/**
 * Standardmassstab (Marcel 25.09.2026): A4 mit 3,5 km Ausschnitt. Jedes Format startet so, dass die Karte gleich
 * skaliert ist – ein groesseres Format zeigt mehr Umgebung statt dasselbe groesser. 30 x 30 rund 5,1 km, 60 x 60
 * rund 10 km. Der Kunde zoomt davon aus weiter.
 */
export const STANDARD_AUSSCHNITT_KM = 3.5;

export function massstabsgleicherAusschnittKm(k: Schichtkarte): number {
  const km = (STANDARD_AUSSCHNITT_KM * berechneLayout(k).kartenfenster.breiteMm) / REFERENZ_KARTENBREITE_MM;
  return Math.round(km * 10) / 10;
}
