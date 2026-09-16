import fs from "node:fs";
import os from "node:os";
import path from "node:path";
// Der ESM-Build von opentype.js hat keinen Default-Export – im Next-Bundler
// kaeme ein `import opentype from` als undefined an. In Node allein faellt das
// nicht auf, weil dort der CommonJS-Build geladen wird.
import * as opentype from "opentype.js";
import type { Punkt } from "./clip";

// Dieselben Suchorte wie FONT_SEARCH_FOLDERS im Bulk-Script.
const SUCHORTE = [
  path.join(os.homedir(), "Library/Fonts"),
  "/Library/Fonts",
  "/System/Library/Fonts/Supplemental",
  "/System/Library/Fonts",
];

const cache = new Map<string, opentype.Font>();

function ladeSchrift(datei: string): opentype.Font {
  const vorhanden = cache.get(datei);
  if (vorhanden) return vorhanden;
  for (const ort of SUCHORTE) {
    const voll = path.join(ort, datei);
    if (fs.existsSync(voll)) {
      const buf = fs.readFileSync(voll);
      const font = opentype.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
      cache.set(datei, font);
      return font;
    }
  }
  throw new Error(`Schrift "${datei}" nicht gefunden (gesucht in ~/Library/Fonts und /Library/Fonts).`);
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
export function setzeZeile(opts: {
  text: string;
  schrift: string;
  versalhoeheMm: number;
  sperrungEm: number;
  mitteX: number;
  mitteY: number;
  maxBreiteMm: number;
}): GesetzterText {
  const font = ladeSchrift(opts.schrift);
  const capHeight = font.tables.os2?.sCapHeight || font.unitsPerEm * 0.7;
  let groesse = (opts.versalhoeheMm * font.unitsPerEm) / capHeight;

  const messen = (g: number) =>
    font.getPath(opts.text, 0, 0, g, { kerning: true, letterSpacing: opts.sperrungEm }).getBoundingBox();

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

  const pfad = font.getPath(opts.text, x, grundlinie, groesse, {
    kerning: true,
    letterSpacing: opts.sperrungEm,
  });

  return { ringe: kurvenZuRingen(pfad.commands), breiteMm: box.x2 - box.x1, faktor };
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

/** Welche der gewuenschten Schriften liegen auf diesem Rechner? */
export function verfuegbareSchriften(kandidaten: string[]): string[] {
  return kandidaten.filter((datei) => SUCHORTE.some((ort) => fs.existsSync(path.join(ort, datei))));
}
