import {
  ausTeilen,
  puffereLinien,
  schneide,
  teile,
  versatz,
  vereinige,
  ziehAb,
  zuFlaeche,
  type Flaeche,
} from "./geometrie";
import type { KartenRohdaten } from "./kacheln";
import type { Schichtkarte } from "./typen";

// Unterhalb dieser Flaeche ist es ein Rechenrest, kein Acrylteil.
export const SPLITTER_MM2 = 0.3;

export interface WasserImFenster {
  /** Alles Wasser im Fenster – fuer die Landflaeche, an der die Dichte gemessen wird. */
  gesamt: Flaeche;
  /** Was aus dem Hintergrund geschnitten wird. */
  geschnitten: Flaeche;
  anzahl: number;
}

/**
 * Wasser im Kartenfenster. Unter den Texten nicht: dort unsichtbar, und die
 * Deckflaeche braucht darunter Material zum Aufkleben. Ein Teich von 3 mm2 ist
 * ein Loch, das niemand bemerkt, aber jemand sauber machen muss.
 *
 * Schmaler als `wasserMinBreiteMm` wird nicht geschnitten (Oeffnen: schrumpfen,
 * dann wieder aufweiten – schmale Kanaele verschwinden, breites Wasser behaelt
 * seine Form). Venedig bei 3,5 km: 107 Hintergrundteile ohne diese Regel.
 * Geoeffnet wird vor dem Beschnitt, sonst schrumpfte das Wasser auch an der
 * Fensterkante.
 */
export function wasserImFenster(k: Schichtkarte, roh: KartenRohdaten, fensterFl: Flaeche, schutz: Flaeche): WasserImFenster {
  const ganz = vereinige(
    zuFlaeche(roh.wasserFlaechen),
    k.wasserlaeufe ? puffereLinien(roh.wasserlaeufe, k.wasserlaufBreiteMm) : [],
  );
  const gesamt = schneide(ganz, fensterFl);
  if (!k.wasser || !ganz.length) return { gesamt, geschnitten: [], anzahl: 0 };

  const r = k.wasserMinBreiteMm / 2;
  const offen = r > 0 ? versatz(versatz(ganz, -r), r) : ganz;
  const behalten = teile(ziehAb(schneide(offen, fensterFl), schutz), SPLITTER_MM2).filter(
    (t) => t.flaecheMm2 >= k.wasserMinFlaecheMm2,
  );
  return { gesamt, geschnitten: ausTeilen(behalten), anzahl: behalten.length };
}

/**
 * Inseln, die nirgends anhaengen, muessten einzeln aufgeklebt werden. Kleine
 * werden Wasser. Unter Bruecken wird nicht geschnitten (stapel.ts) – eine
 * Insel mit Netzbruecke haengt also am Ganzen und bleibt.
 */
export function kleineInselnFluten(k: Schichtkarte, plattenFl: Flaeche, wasser: Flaeche, netz: Flaeche) {
  if (!wasser.length || k.wasserInselMinMm2 <= 0) return { wasser, geflutet: 0 };
  const [, ...inseln] = teile(ziehAb(plattenFl, ziehAb(wasser, netz)), SPLITTER_MM2);
  const klein = inseln.filter((t) => t.flaecheMm2 < k.wasserInselMinMm2);
  return { wasser: klein.length ? vereinige(wasser, ausTeilen(klein)) : wasser, geflutet: klein.length };
}
