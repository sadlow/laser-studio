import type { Punkt } from "./clip";
import { vereinige, zuFlaeche, type Flaeche } from "./geometrie";
import { stegeHalbinseln } from "./halbinseln";
import { alsFlaeche, ringeMitPunzen } from "./punzen";
import { probenAbstand, querungen } from "./querung";
import type { Stege, StegRegeln } from "./stencil";

const REST_MM = 0.35;

/**
 * Stege fuer die Schreibschrift: quer durch die duennste Wand einer Schleife, senkrecht zum Strich – wie ein
 * abgesetzter Haarstrich. Senkrechte Stege am Scheitel schnitten schraege Schleifen schief an und sahen aus wie
 * Risse; die dicken Abstriche bleiben jetzt ganz. Zwei Stege je Schleife, mindestens ein Drittel des Umfangs
 * auseinander; eine Schleife schmaler als `offenUnterMm` bekommt einen. Fast geschlossene Schleifen, die nur an
 * einem schmalen Hals haengen (das & der Bacalisties), bekommen ihre Stege wie eine Punze (halbinseln.ts).
 */
export function stegeSchreibschrift(ink: Flaeche, R: StegRegeln): Stege {
  const { ringe, punzen } = ringeMitPunzen(ink);
  const stege: Flaeche[] = [];
  const zugefuellt: Punkt[][] = [];
  let ohneSteg = 0;
  for (const nr of punzen) {
    const r = ringe[nr];
    const xs = r.map((p) => p.x);
    const ys = r.map((p) => p.y);
    const breite = Math.min(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys));
    if (breite < REST_MM) {
      zugefuellt.push(r);
      continue;
    }
    const { kandidaten, n } = querungen(r, nr, ringe, R.stegMm);
    if (!kandidaten.length) {
      ohneSteg++;
      continue;
    }
    const gewaehlt = [kandidaten[0]];
    for (const k of kandidaten) {
      if (gewaehlt.length >= (breite < R.offenUnterMm ? 1 : 2)) break;
      if (gewaehlt.every((g) => probenAbstand(g.i, k.i, n) >= n / 3)) gewaehlt.push(k);
    }
    for (const g of gewaehlt) stege.push(zuFlaeche([g.ecken]));
  }
  const h = stegeHalbinseln(ink, R.stegMm);
  return {
    stege: vereinige(...stege, h.stege),
    zugefuellt: alsFlaeche(zugefuellt),
    anzahl: stege.length + h.anzahl,
    zugefuelltAnzahl: zugefuellt.length,
    ohneSteg: ohneSteg + h.ohneSteg,
    halbinseln: h.halbinseln,
  };
}
