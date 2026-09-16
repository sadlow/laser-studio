import ClipperLib from "clipper-lib";
import type { Punkt } from "./clip";
import { rechteck, vereinige, type Flaeche } from "./geometrie";

// Nie schmaler – darunter bricht der Steg schon beim Herausnehmen aus der Platte.
const STEG_MIN_MM = 0.3;
// Wie der Direktsatz im Bulk-Script (STEG_ANTEIL_STRICH): kein Steg breiter als
// der halbe Schriftstrich. Sonst ist er so breit wie der Buchstabe und wirkt
// wie eine Luecke statt wie eine Unterbrechung.
const STEG_ANTEIL_STRICH = 0.5;
// So tief greift der Steg in Insel und Umgebung. Enden beide exakt auf der
// Kante, beruehren sich die Teile nur in einer Linie und bleiben getrennt.
const EINTAUCHEN_MM = 0.25;

/**
 * Stencil-Stege fuer ausgeschnittenen Text.
 *
 * Wird ein "O" aus der weissen Lage geschnitten, faellt sein Inneres heraus.
 * Jede solche Insel bekommt zwei senkrechte Stege: einen am hoechsten, einen
 * am tiefsten Punkt (Marcel 16.09.2026). Dort laeuft der Strich meist
 * waagerecht – der Steg wird am kuerzesten und faellt am wenigsten auf. Bei
 * schraeg liegenden Schleifen der Schreibschrift sitzen die beiden deshalb an
 * verschiedenen Stellen, sie folgen der Form.
 *
 * Wie weit ein Steg reicht, wird am Strich gemessen (Strahl bis zur naechsten
 * Kante). Ein Steg ueber die ganze Zeile wuerde Nachbarbuchstaben durchtrennen.
 */
export function stencilStege(
  text: Flaeche,
  stegMaxMm: number,
  minInselBreiteMm: number,
): { stege: Flaeche; zugefuellt: Flaeche; anzahl: number; ohneSteg: number; zugefuelltAnzahl: number } {
  const leer = { stege: [], zugefuellt: [], anzahl: 0, ohneSteg: 0, zugefuelltAnzahl: 0 };
  if (!text.length) return leer;

  const S = 1000;
  const c = new ClipperLib.Clipper();
  c.AddPaths(text, ClipperLib.PolyType.ptSubject, true);
  const baum = new ClipperLib.PolyTree();
  c.Execute(ClipperLib.ClipType.ctUnion, baum, ClipperLib.PolyFillType.pftNonZero, ClipperLib.PolyFillType.pftNonZero);

  const alleRinge: Punkt[][] = [];
  const inseln: Punkt[][] = [];
  const zuklein: ClipperLib.Paths = [];
  const sammle = (knoten: ClipperLib.PolyNode) => {
    for (const kind of knoten.Childs()) {
      const kontur = kind.Contour();
      const ring = kontur.map((p) => ({ x: p.X / S, y: p.Y / S }));
      const box = umriss(ring);
      // Ein Loch im ausgeschnittenen Text ist Material, das stehen bleibt: die Insel.
      if (kind.IsHole() && box.x1 - box.x0 < minInselBreiteMm) {
        // Kaum breiter als ein Steg: daneben bliebe nichts stehen, das Zeichen
        // zerfiele. Zugefuellt wird aus dem Gradzeichen ein Punkt. Gemessen
        // wird die Breite und kein Anteil der Schriftgroesse – sonst wurden die
        // Schleifen der Schreibschrift (2,7-8,8 mm breit, 0,5-1,6 % der
        // Versalhoehe) schwarz, waehrend das Gradzeichen (3,0 %) Stege bekam.
        zuklein.push(kontur.slice().reverse());
      } else {
        alleRinge.push(ring);
        if (kind.IsHole()) inseln.push(ring);
      }
      sammle(kind);
    }
  };
  sammle(baum);
  if (stegMaxMm <= 0) return { ...leer, zugefuellt: zuklein, zugefuelltAnzahl: zuklein.length };

  const stege: Flaeche[] = [];
  let ohneSteg = 0;

  for (const insel of inseln) {
    let gesetzt = 0;
    for (const richtung of ["oben", "unten"] as const) {
      const p = scheitel(insel, richtung);
      const ys = schnitte(alleRinge, p.x);
      // Naechste Kante jenseits des Scheitels = Aussenkante des Strichs.
      const kante =
        richtung === "oben"
          ? Math.max(...ys.filter((y) => y < p.y - 0.001))
          : Math.min(...ys.filter((y) => y > p.y + 0.001));
      if (!Number.isFinite(kante)) continue;

      const strich = Math.abs(p.y - kante);
      const breite = Math.max(STEG_MIN_MM, Math.min(stegMaxMm, strich * STEG_ANTEIL_STRICH));
      const y0 = Math.min(p.y, kante) - EINTAUCHEN_MM;
      const y1 = Math.max(p.y, kante) + EINTAUCHEN_MM;
      stege.push(rechteck(p.x - breite / 2, y0, breite, y1 - y0));
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

/**
 * Hoechster bzw. tiefster Punkt einer Insel. Bei flacher Kante (waagerechter
 * Strich ueber einer Punze) die Mitte dieser Kante, bei einer Rundung ihr
 * Scheitel. Kleiner Versatz, damit der Strahl nicht exakt durch einen
 * Eckpunkt geht.
 */
function scheitel(ring: Punkt[], richtung: "oben" | "unten"): Punkt {
  const BAND = 0.1;
  const extrem = richtung === "oben" ? Math.min(...ring.map((p) => p.y)) : Math.max(...ring.map((p) => p.y));
  const imBand = ring.filter((p) => Math.abs(p.y - extrem) <= BAND);
  const mitte = (Math.min(...imBand.map((p) => p.x)) + Math.max(...imBand.map((p) => p.x))) / 2 + 0.00137;

  // Liegt die Mitte der Kante nicht an der Insel (zwei getrennte Buckel auf
  // gleicher Hoehe), zurueck auf den tatsaechlichen Extrempunkt.
  const trifft = schnitte([ring], mitte).some((y) => Math.abs(y - extrem) <= BAND + 0.05);
  if (trifft) return { x: mitte, y: extrem };
  const p = ring.find((q) => q.y === extrem) ?? ring[0];
  return { x: p.x + 0.00137, y: extrem };
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
