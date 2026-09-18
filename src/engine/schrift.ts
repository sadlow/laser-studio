import type * as opentype from "opentype.js";
import type { Punkt } from "./clip";
import { ladeSchrift } from "./schrift-datei";

export { verfuegbareSchriften } from "./schrift-datei";

/** Masse einer Schrift in Font-Einheiten – fuer Textfelder anderer Systeme (Amazon Custom). */
export function schriftMasse(datei: string) {
  const font = ladeSchrift(datei);
  return {
    unitsPerEm: font.unitsPerEm,
    versalhoehe: font.tables.os2?.sCapHeight || font.unitsPerEm * 0.7,
    oberlaenge: font.ascender,
    unterlaenge: -font.descender,
  };
}

export interface GesetzterText {
  ringe: Punkt[][];
  breiteMm: number;
  /** Faktor < 1, wenn der Text auf die verfuegbare Breite verkleinert wurde. */
  faktor: number;
}

/**
 * Setzt eine Zeile als Konturen in mm.
 *
 * Positioniert wird ueber die Versalhoehe: ihre Mitte liegt auf `mitteY`. Bei
 * Schreibschriften ragt der Schwung weit darueber hinaus – das ist gewollt,
 * die Zeile soll typografisch sitzen, nicht nach ihrer Bounding Box.
 *
 * Grenze: opentype.js wendet Kerning an, aber keine kontextuellen Alternativen.
 * Schreibschriften, die ihre Anschluesse ueber `calt` bilden, sehen hier anders
 * aus als in InDesign. Fuer die Produktion gehoert das ueber HarfBuzz (wie der
 * Direktsatz), fuer den Entwurf reicht es.
 */
export function setzeZeile(opts: ZeilenSatz): GesetzterText {
  const g = setzeGlyphen(opts);
  return { ringe: g.glyphen.flatMap((x) => x.ringe), breiteMm: g.breiteMm, faktor: g.faktor };
}

export interface ZeilenSatz {
  text: string;
  schrift: string;
  versalhoeheMm: number;
  sperrungEm: number;
  mitteX: number;
  mitteY: number;
  maxBreiteMm: number;
}

/** Eine Glyphe der Zeile: Unicode des Zeichens (0, wenn unbekannt) und ihre Konturen in mm. */
export interface GesetzteGlyphe {
  zeichen: number;
  ringe: Punkt[][];
}

/**
 * Wie setzeZeile, aber Glyphe fuer Glyphe – fuer den Schnitt, der jede Glyphe fuer sich aufbereitet (schnitt-text.ts).
 */
export function setzeGlyphen(opts: ZeilenSatz): { glyphen: GesetzteGlyphe[]; breiteMm: number; faktor: number } {
  const font = ladeSchrift(opts.schrift);
  const capHeight = font.tables.os2?.sCapHeight || font.unitsPerEm * 0.7;
  let groesse = (opts.versalhoeheMm * font.unitsPerEm) / capHeight;
  const optionen = { kerning: true, letterSpacing: opts.sperrungEm };
  const messen = (g: number) => font.getPath(opts.text, 0, 0, g, optionen).getBoundingBox();

  let box = messen(groesse);
  let faktor = 1;
  const breite = box.x2 - box.x1;
  if (breite > opts.maxBreiteMm && breite > 0) {
    faktor = opts.maxBreiteMm / breite;
    groesse *= faktor;
    box = messen(groesse);
  }

  const versal = (capHeight / font.unitsPerEm) * groesse;
  const x = opts.mitteX - (box.x1 + box.x2) / 2;
  const grundlinie = opts.mitteY + versal / 2;
  const pfade = font.getPaths(opts.text, x, grundlinie, groesse, optionen);
  const zeichen = font.stringToGlyphs(opts.text).map((g: opentype.Glyph) => g.unicode ?? 0);
  return {
    glyphen: pfade.map((p, i) => ({ zeichen: zeichen[i] ?? 0, ringe: kurvenZuRingen(p.commands) })),
    breiteMm: box.x2 - box.x1,
    faktor,
  };
}

/** Bezier-Kurven in Geradenstuecke. Feinheit ~0.08 mm – unter der Schnittfuge. */
function kurvenZuRingen(befehle: opentype.PathCommand[]): Punkt[][] {
  const ringe: Punkt[][] = [];
  let ring: Punkt[] = [];
  let letzter: Punkt = { x: 0, y: 0 };

  const schritte = (a: Punkt, b: Punkt) =>
    Math.min(24, Math.max(3, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 0.08)));

  for (const c of befehle) {
    if (c.type === "M") {
      if (ring.length >= 3) ringe.push(ring);
      ring = [{ x: c.x, y: c.y }];
      letzter = { x: c.x, y: c.y };
    } else if (c.type === "L") {
      ring.push({ x: c.x, y: c.y });
      letzter = { x: c.x, y: c.y };
    } else if (c.type === "Q") {
      const n = schritte(letzter, { x: c.x, y: c.y });
      for (let i = 1; i <= n; i++) {
        const t = i / n;
        const u = 1 - t;
        ring.push({
          x: u * u * letzter.x + 2 * u * t * c.x1 + t * t * c.x,
          y: u * u * letzter.y + 2 * u * t * c.y1 + t * t * c.y,
        });
      }
      letzter = { x: c.x, y: c.y };
    } else if (c.type === "C") {
      const n = schritte(letzter, { x: c.x, y: c.y });
      for (let i = 1; i <= n; i++) {
        const t = i / n;
        const u = 1 - t;
        ring.push({
          x: u * u * u * letzter.x + 3 * u * u * t * c.x1 + 3 * u * t * t * c.x2 + t * t * t * c.x,
          y: u * u * u * letzter.y + 3 * u * u * t * c.y1 + 3 * u * t * t * c.y2 + t * t * t * c.y,
        });
      }
      letzter = { x: c.x, y: c.y };
    } else if (c.type === "Z") {
      if (ring.length >= 3) ringe.push(ring);
      ring = [];
    }
  }
  if (ring.length >= 3) ringe.push(ring);
  return ringe;
}
