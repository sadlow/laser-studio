import ClipperLib from "clipper-lib";
import type { Punkt } from "./clip";
import { rechteck, vereinige, type Flaeche } from "./geometrie";

/**
 * Stencil-Stege fuer ausgeschnittenen Text.
 *
 * Wird ein "O" aus der weissen Lage geschnitten, faellt sein Inneres heraus.
 * Jede solche Insel bekommt zwei senkrechte Stege, oben und unten, die sie
 * durch den Buchstabenstrich hindurch mit dem umgebenden Weiss verbinden.
 * Vorgabe Marcel 16.09.2026: 1 mm reicht bei Acrylglas.
 *
 * Wie weit ein Steg reicht, wird am Strich gemessen (Strahl von der Insel
 * nach aussen bis zur ersten Kante). Ein Steg ueber die ganze Textbox wuerde
 * Nachbarbuchstaben und Schwuenge der Schreibschrift mit durchtrennen.
 */
export function stencilStege(
  text: Flaeche,
  stegMm: number,
  minInselMm2: number,
): { stege: Flaeche; zugefuellt: Flaeche; anzahl: number; ohneSteg: number; zugefuelltAnzahl: number } {
  const leer = { stege: [], zugefuellt: [], anzahl: 0, ohneSteg: 0, zugefuelltAnzahl: 0 };
  if (!text.length) return leer;

  const S = 1000;
  const c = new ClipperLib.Clipper();
  c.AddPaths(text, ClipperLib.PolyType.ptSubject, true);
  const baum = new ClipperLib.PolyTree();
  c.Execute(ClipperLib.ClipType.ctUnion, baum, ClipperLib.PolyFillType.pftNonZero, ClipperLib.PolyFillType.pftNonZero);

  // Alle Kanten des Textes, gegen die die Strahlen laufen.
  const alleRinge: Punkt[][] = [];
  const inseln: Punkt[][] = [];
  const zuklein: ClipperLib.Paths = [];
  const sammle = (knoten: ClipperLib.PolyNode) => {
    for (const kind of knoten.Childs()) {
      const kontur = kind.Contour();
      const ring = kontur.map((p) => ({ x: p.X / S, y: p.Y / S }));
      // Ein Loch im ausgeschnittenen Text ist Material, das stehen bleibt: die Insel.
      if (kind.IsHole() && Math.abs(ClipperLib.Clipper.Area(kontur)) / (S * S) < minInselMm2) {
        // Gradzeichen (0,34 mm2) und feine Schleifen (e in Amalfi Coast, 0,31 mm2):
        // ein 1-mm-Steg ueberdeckt sie ganz, das Zeichen zerfiele in zwei
        // Halbmonde. Zugefuellt wird aus dem Ring ein Punkt – nichts faellt
        // heraus, und das Zeichen bleibt lesbar. Ihre Kante zaehlt dann auch
        // nicht mehr fuer die Strahlen der Nachbarinseln.
        zuklein.push(kontur.slice().reverse());
      } else {
        alleRinge.push(ring);
        if (kind.IsHole()) inseln.push(ring);
      }
      sammle(kind);
    }
  };
  sammle(baum);
  if (stegMm <= 0) return { ...leer, zugefuellt: zuklein, zugefuelltAnzahl: zuklein.length };

  const stege: Flaeche[] = [];
  let ohneSteg = 0;

  for (const insel of inseln) {
    const box = umriss(insel);
    // Die Mitte der Box liegt nicht immer in der Insel (Schreibschrift-Schleifen).
    // Einige Positionen probieren, die laengste Senkrechte gewinnt.
    let beste: { x: number; oben: number; unten: number } | null = null;
    for (const anteil of [0.5, 0.4, 0.6, 0.3, 0.7]) {
      // Kleiner Versatz, damit der Strahl nicht exakt durch einen Eckpunkt geht.
      const x = box.x0 + (box.x1 - box.x0) * anteil + 0.00137;
      const innen = laengstesIntervall(schnitte([insel], x), box.y0 + (box.y1 - box.y0) / 2);
      if (innen && (!beste || innen.unten - innen.oben > beste.unten - beste.oben)) {
        beste = { x, oben: innen.oben, unten: innen.unten };
      }
    }
    if (!beste) {
      ohneSteg++;
      continue;
    }

    const ys = schnitte(alleRinge, beste.x);
    const aussenOben = Math.max(...ys.filter((y) => y < beste.oben - 0.001));
    const aussenUnten = Math.min(...ys.filter((y) => y > beste.unten + 0.001));
    const halb = stegMm / 2;
    // 0.2 mm Ueberlappung auf beiden Seiten, sonst beruehren sich die Teile nur
    // in einer Linie und bleiben getrennt.
    let gesetzt = 0;
    if (Number.isFinite(aussenOben)) {
      stege.push(rechteck(beste.x - halb, aussenOben - 0.2, stegMm, beste.oben - aussenOben + 0.4));
      gesetzt++;
    }
    if (Number.isFinite(aussenUnten)) {
      stege.push(rechteck(beste.x - halb, beste.unten - 0.2, stegMm, aussenUnten - beste.unten + 0.4));
      gesetzt++;
    }
    if (gesetzt === 0) ohneSteg++;
  }

  return {
    stege: vereinige(...stege),
    zugefuellt: zuklein,
    anzahl: stege.length,
    ohneSteg,
    zugefuelltAnzahl: zuklein.length,
  };
}

function umriss(ring: Punkt[]) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const p of ring) {
    if (p.x < x0) x0 = p.x;
    if (p.x > x1) x1 = p.x;
    if (p.y < y0) y0 = p.y;
    if (p.y > y1) y1 = p.y;
  }
  return { x0, y0, x1, y1 };
}

/** Alle y, an denen eine Senkrechte bei x die Ringe kreuzt – sortiert. */
function schnitte(ringe: Punkt[][], x: number): number[] {
  const ys: number[] = [];
  for (const ring of ringe) {
    for (let i = 0; i < ring.length; i++) {
      const a = ring[i];
      const b = ring[(i + 1) % ring.length];
      if ((a.x <= x && b.x > x) || (b.x <= x && a.x > x)) {
        ys.push(a.y + ((x - a.x) * (b.y - a.y)) / (b.x - a.x));
      }
    }
  }
  return ys.sort((p, q) => p - q);
}

/** Aus paarweisen Schnitten das Innen-Intervall, bevorzugt um die Mitte. */
function laengstesIntervall(ys: number[], mitte: number): { oben: number; unten: number } | null {
  let beste: { oben: number; unten: number } | null = null;
  for (let i = 0; i + 1 < ys.length; i += 2) {
    const kandidat = { oben: ys[i], unten: ys[i + 1] };
    const enthaeltMitte = kandidat.oben <= mitte && kandidat.unten >= mitte;
    if (enthaeltMitte) return kandidat;
    if (!beste || kandidat.unten - kandidat.oben > beste.unten - beste.oben) beste = kandidat;
  }
  return beste;
}
