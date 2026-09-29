// Der ESM-Build von opentype.js hat keinen Default-Export – im Next-Bundler
// kaeme ein `import opentype from` als undefined an. In Node allein faellt das
// nicht auf, weil dort der CommonJS-Build geladen wird.
import * as opentypeModul from "./opentype";

// Unter Node (Worker, tsx) kommt opentype.js als CommonJS-Modul, dann steht alles unter `default`;
// im Bundler als ES-Modul mit benannten Exporten. So gilt beides.
const opentype = ((opentypeModul as unknown as { parse?: unknown }).parse
  ? opentypeModul
  : Reflect.get(opentypeModul, "default")) as typeof opentypeModul;

// Customizer (docs/plan-laserkarte.md): Schriften kommen nicht aus den Ordnern eines Rechners
// (~/Library/Fonts), sondern werden vor dem Rechnen eingetragen – aus vendor/fonts und der
// Schriftbibliothek (services/laserkarte/schriften.server.ts). Der Name bleibt der Dateiname,
// den Vorlagen und Laser-Studio fuehren ("DIN Alternate Bold.ttf", "Datei.ttc#Schnitt").

// Am globalen Objekt, damit der Entwicklungsserver nach Codeaenderungen nicht jede Schrift erneut im Speicher haelt.
const global = globalThis as typeof globalThis & {
  __laserSchriften?: Map<string, opentypeModul.Font>;
  __laserSchriftDateien?: Map<string, Uint8Array>;
};
const cache = (global.__laserSchriften ??= new Map<string, opentypeModul.Font>());
let quelle: ((name: string) => Uint8Array | undefined) | undefined;
export function setzeSchriftQuelle(lader: (name: string) => Uint8Array | undefined): void { quelle = lader; cache.clear(); }

const dateien = (global.__laserSchriftDateien ??= new Map<string, Uint8Array>());

/** Traegt eine Schriftdatei unter ihrem Dateinamen ein. Andere Bytes unter demselben Namen ersetzen die alten. */
export function trageSchriftEin(name: string, bytes: Uint8Array): void {
  const alt = dateien.get(name);
  if (alt && alt.byteLength === bytes.byteLength && alt.every((b, i) => b === bytes[i])) return;
  dateien.set(name, bytes);
  for (const schluessel of [...cache.keys()]) if (schluessel.split("#")[0] === name) cache.delete(schluessel);
}

/**
 * Laedt eine eingetragene Schrift. `Datei.ttc#Schnitt` waehlt aus einer Sammeldatei den Schnitt, dessen
 * voller Name auf "Schnitt" endet – macOS liefert Avenir Next Condensed und Helvetica Neue nur so, und
 * opentype.js liest keine Sammeldateien.
 */
export function ladeSchrift(datei: string): opentypeModul.Font {
  const vorhanden = cache.get(datei);
  if (vorhanden) return vorhanden;
  const [name, schnitt] = datei.split("#");
  const bytes = dateien.get(name) ?? quelle?.(name);
  if (!bytes) throw new Error(`Schrift "${name}" ist nicht hinterlegt (vendor/fonts oder Schriftbibliothek).`);
  const buf = Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const font = schnitt ? ausSammlung(buf, schnitt, datei) : lies(buf);
  cache.set(datei, font);
  return font;
}

/** Welche der gewuenschten Schriften sind eingetragen? */
export function verfuegbareSchriften(kandidaten: string[]): string[] {
  return kandidaten.filter((datei) => (dateien.has(datei.split("#")[0]) || !!quelle?.(datei.split("#")[0])));
}

function lies(buf: Buffer): opentypeModul.Font {
  return opentype.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
}

function ausSammlung(buf: Buffer, schnitt: string, datei: string): opentypeModul.Font {
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
