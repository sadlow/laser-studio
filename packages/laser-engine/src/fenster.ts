import { rechteck, zuFlaeche, type Flaeche } from "./geometrie";
import { HERZ_FENSTER_FORM, HERZ_FENSTER_HOEHE } from "./herz-form";
import type { Layout, Schichtkarte } from "./typen";

/**
 * Die Flaeche des Kartenfensters: ein Rechteck – beim Layout "herz" das Herz der Vorlage in der Box des Fensters.
 * Alles, was an der Fensterkante endet (Netz, Wasser, Rahmen), nimmt diese Flaeche.
 */
export function fensterFlaeche(k: Schichtkarte, layout: Layout): Flaeche {
  const f = layout.kartenfenster;
  if (k.layoutArt !== "herz") return rechteck(f.xMm, f.yMm, f.breiteMm, f.hoeheMm);
  const s = f.breiteMm;
  return zuFlaeche([HERZ_FENSTER_FORM.map((p) => ({ x: f.xMm + p.x * s, y: f.yMm + p.y * s }))]);
}

/** Box des Herzfensters in mm: aus den Anteilen der Vorlage, die Hoehe folgt der Form. */
export function herzBox(k: Schichtkarte, breiteMm: number, hoeheMm: number) {
  const h = k.herz!;
  const b = breiteMm * h.breiteAnteil;
  return { xMm: breiteMm * h.linksAnteil, yMm: hoeheMm * h.obenAnteil, breiteMm: b, hoeheMm: b * HERZ_FENSTER_HOEHE };
}
