import type { KartenEntwurf } from "./typen";

/**
 * Startwerte fuer einen neuen Entwurf.
 *
 * Bewusst eine eigene Datei ohne Server-Abhaengigkeiten: die UI braucht diese
 * Werte im Browser, und ueber `index.ts` kaeme der Tile-Parser mit ins Bundle.
 */
export function standardEntwurf(): KartenEntwurf {
  return {
    format: "a4",
    rahmenMm: 10,
    textfeldMm: 30,
    textabstandMm: 6,
    // Steinfurt, Papierschmiede
    lon: 7.3389,
    lat: 52.1503,
    zoom: 14,
    plattenschnitt: true,
    ebenen: [
      // Dichten bewusst unter 1: eine vollflaechig gravierte Waldflaeche legt
      // sich sonst ueber die halbe Karte und die Strassen verschwinden darin.
      { key: "green", rolle: "gravur", dichte: 0.25 },
      { key: "water", rolle: "gravur", dichte: 0.55 },
      { key: "buildings", rolle: "aus", dichte: 0.4 },
      { key: "streets", rolle: "gravur", strichMm: 0.4 },
      { key: "roads", rolle: "gravur", strichMm: 0.8 },
    ],
    texte: [
      { id: "titel", text: "STEINFURT", groesseMm: 12, ausrichtung: "mitte", rolle: "gravur" },
      { id: "zeile2", text: "52.1503, 7.3389", groesseMm: 5, ausrichtung: "mitte", rolle: "gravur" },
    ],
  };
}
