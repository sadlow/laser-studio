import fs from "node:fs";
import os from "node:os";
import path from "node:path";
// Der ESM-Build von opentype.js hat keinen Default-Export – im Next-Bundler
// kaeme ein `import opentype from` als undefined an. In Node allein faellt das
// nicht auf, weil dort der CommonJS-Build geladen wird.
import * as opentype from "opentype.js";

// Dieselben Suchorte wie FONT_SEARCH_FOLDERS im Bulk-Script, dazu `schriften/` im Projekt: Schriften, die zum
// Produkt gehoeren, liegen beim Code statt nur auf Marcels Rechner.
const SUCHORTE = [
  path.join(process.cwd(), "schriften"),
  path.join(os.homedir(), "Library/Fonts"),
  "/Library/Fonts",
  "/System/Library/Fonts/Supplemental",
  "/System/Library/Fonts",
];

const cache = new Map<string, opentype.Font>();

/**
 * Laedt eine Schrift aus den Suchorten. `Datei.ttc#Schnitt` waehlt aus einer Sammeldatei den Schnitt, dessen
 * voller Name auf "Schnitt" endet – macOS liefert Avenir Next Condensed und Helvetica Neue nur so, und
 * opentype.js liest keine Sammeldateien.
 */
export function ladeSchrift(datei: string): opentype.Font {
  const vorhanden = cache.get(datei);
  if (vorhanden) return vorhanden;
  const [name, schnitt] = datei.split("#");
  const voll = fundort(name);
  if (!voll) throw new Error(`Schrift "${name}" nicht gefunden (gesucht in schriften/, ~/Library/Fonts und /Library/Fonts).`);
  const buf = fs.readFileSync(voll);
  const font = schnitt ? ausSammlung(buf, schnitt, datei) : lies(buf);
  cache.set(datei, font);
  return font;
}

/** Welche der gewuenschten Schriften liegen auf diesem Rechner? */
export function verfuegbareSchriften(kandidaten: string[]): string[] {
  return kandidaten.filter((datei) => fundort(datei.split("#")[0]));
}

function fundort(name: string): string | undefined {
  return SUCHORTE.map((ort) => path.join(ort, name)).find((voll) => fs.existsSync(voll));
}

function lies(buf: Buffer): opentype.Font {
  return opentype.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
}

function ausSammlung(buf: Buffer, schnitt: string, datei: string): opentype.Font {
  if (buf.toString("latin1", 0, 4) !== "ttcf") throw new Error(`"${datei}": keine Sammeldatei (.ttc)`);
  const anzahl = buf.readUInt32BE(8);
  for (let i = 0; i < anzahl; i++) {
    const font = lies(einzelSchnitt(buf, buf.readUInt32BE(12 + 4 * i)));
    const n = font.names as unknown as Record<string, { fullName?: Record<string, string> } | undefined>;
    const voll = n.windows?.fullName?.en ?? n.macintosh?.fullName?.en ?? "";
    if (voll === schnitt || voll.endsWith(` ${schnitt}`)) return font;
  }
  throw new Error(`"${datei}": Schnitt "${schnitt}" nicht in der Sammeldatei`);
}

/** Ein Schnitt der Sammeldatei als eigene Schriftdatei: Tabellenverzeichnis mit neuen Offsets, Tabellen dahinter. */
function einzelSchnitt(buf: Buffer, start: number): Buffer {
  const tabellen = buf.readUInt16BE(start + 4);
  const kopf = 12 + 16 * tabellen;
  const eintraege = Array.from({ length: tabellen }, (_, i) => ({
    eintrag: start + 12 + 16 * i,
    offset: buf.readUInt32BE(start + 12 + 16 * i + 8),
    laenge: buf.readUInt32BE(start + 12 + 16 * i + 12),
  }));
  const out = Buffer.alloc(kopf + eintraege.reduce((s, t) => s + ((t.laenge + 3) & ~3), 0));
  buf.copy(out, 0, start, start + 12);
  let pos = kopf;
  eintraege.forEach((t, i) => {
    buf.copy(out, 12 + 16 * i, t.eintrag, t.eintrag + 8);
    out.writeUInt32BE(pos, 12 + 16 * i + 8);
    out.writeUInt32BE(t.laenge, 12 + 16 * i + 12);
    buf.copy(out, pos, t.offset, t.offset + t.laenge);
    pos += (t.laenge + 3) & ~3;
  });
  return out;
}
