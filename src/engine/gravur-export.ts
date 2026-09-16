import type { Punkt } from "./clip";
import { ausTeilen, puffereLinien, schneide, teile, vereinige, ziehLinienAb } from "./geometrie";
import type { GravurExport, Lage, Teil } from "./typen";

export interface GravurPfad {
  punkte: Punkt[];
  geschlossen: boolean;
  /** Sollbreite der Linie – als stroke-width fuer die Ansicht, die Lasersoftware nimmt den Strahl. */
  breiteMm: number;
}

/**
 * Gravur einer Lage fuer die Laserdatei, beschnitten auf ihr Material (typen-fertigung.ts).
 * Intern ist jede Gravur eine Mittellinie mit Breite; erst hier entscheidet sich,
 * ob daraus eine Flaeche, eine Linie oder ein Umriss wird.
 */
export function gravurFuerExport(lage: Lage, e: GravurExport): { flaechen: Teil[]; pfade: GravurPfad[] } {
  if (!lage.gravur.length) return { flaechen: [], pfade: [] };
  const material = ausTeilen(lage.teile);
  if (e.art === "flaeche") {
    const gepuffert = vereinige(...lage.gravur.map((g) => puffereLinien(g.linien, g.breiteMm)));
    return { flaechen: teile(schneide(gepuffert, material), 0.01), pfade: [] };
  }
  const pfade: GravurPfad[] = [];
  for (const g of lage.gravur) {
    // So viele Durchgaenge in Strahlbreite, dass sie die Sollbreite decken, gleichmaessig verteilt:
    // aussen je ein Ring um den Weg, bei ungerader Zahl die Mittellinie dazu. Nur zwei Ringe
    // liessen bei 0,45 mm und 0,15 mm Strahl in der Mitte eine Luecke.
    const n = e.art === "kontur" ? Math.max(1, Math.ceil(g.breiteMm / e.strahlMm - 0.05)) : 1;
    if (n % 2 === 1) {
      for (const l of ziehLinienAb(g.linien, material, true)) pfade.push({ punkte: l, geschlossen: false, breiteMm: n === 1 ? g.breiteMm : e.strahlMm });
    }
    const schritt = n > 1 ? (g.breiteMm - e.strahlMm) / (n - 1) : 0;
    for (let i = 0; i < Math.floor(n / 2); i++) {
      const abstand = (g.breiteMm - e.strahlMm) / 2 - i * schritt;
      for (const t of teile(schneide(puffereLinien(g.linien, 2 * abstand), material), 0.0001)) {
        for (const ring of [t.aussen, ...t.loecher]) pfade.push({ punkte: ring, geschlossen: true, breiteMm: e.strahlMm });
      }
    }
  }
  return { flaechen: [], pfade };
}

/** Laenge aller Gravurlinien in m und ihre Flaeche in mm² – zum Abschaetzen der Laserzeit. */
export function gravurMasse(lagen: Lage[]): { wegM: number; flaecheMm2: number } {
  let [weg, flaeche] = [0, 0];
  for (const g of lagen.flatMap((l) => l.gravur)) {
    for (const linie of g.linien) {
      let laenge = 0;
      for (let i = 1; i < linie.length; i++) laenge += Math.hypot(linie[i].x - linie[i - 1].x, linie[i].y - linie[i - 1].y);
      weg += laenge;
      flaeche += laenge * g.breiteMm;
    }
  }
  return { wegM: weg / 1000, flaecheMm2: flaeche };
}
