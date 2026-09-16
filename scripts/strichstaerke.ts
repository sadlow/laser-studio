// Misst je Schnitt die Strichbreite (= Breite des ausgeschnittenen Lochs) bei
// gegebener Versalhoehe und prueft, ob die noetigen Zeichen vorhanden sind.
import * as opentype from "opentype.js";
import fs from "node:fs";
import os from "node:os";

const VERSAL_MM = 297 * 0.017; // A4-Zeilen
const schnitte = ["AvantGarde-ExtraLight.otf", "AvantGarde-Book.otf", "AvantGardeCE-Demi.otf", "ITC Avant Garde Gothic LT Bold.ttf"];

for (const datei of schnitte) { try {
  const buf = fs.readFileSync(`${os.homedir()}/Library/Fonts/${datei}`);
  const f = opentype.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
  const cap = f.tables.os2?.sCapHeight || f.unitsPerEm * 0.7;
  const groesse = (VERSAL_MM * f.unitsPerEm) / cap;
  const bbox = (s: string) => f.getPath(s, 0, 0, groesse).getBoundingBox();
  const senkrecht = bbox("I").x2 - bbox("I").x1;           // Stamm des I
  const waagrecht = bbox("-").y2 - bbox("-").y1;           // Bindestrich
  const fehlend = [..."°ÄÖÜß'\""].filter((z) => f.charToGlyph(z).index === 0);
  console.log(
    datei.padEnd(38),
    `senkrecht ${senkrecht.toFixed(2)} mm`,
    `| waagrecht ${waagrecht.toFixed(2)} mm`,
    `| fehlt: ${fehlend.length ? fehlend.join(" ") : "nichts"}`,
  );
} catch (e) { console.log(datei.padEnd(38), "NICHT LESBAR:", (e as Error).message); } }

// Titel: wie gross muss Bacalisties sein, damit "Zuhause" so breit steht wie auf dem Poster?
const t = fs.readFileSync(`${os.homedir()}/Library/Fonts/Bacalisties.ttf`);
const tf = opentype.parse(t.buffer.slice(t.byteOffset, t.byteOffset + t.byteLength));
const tcap = tf.tables.os2?.sCapHeight || tf.unitsPerEm * 0.7;
for (const anteil of [0.06, 0.08, 0.1, 0.12]) {
  const g = ((297 * anteil) * tf.unitsPerEm) / tcap;
  const b = tf.getPath("Zuhause", 0, 0, g, { kerning: true }).getBoundingBox();
  console.log(`Bacalisties ${(anteil * 100).toFixed(0)} %: Breite ${(b.x2 - b.x1).toFixed(0)} mm = ${((b.x2 - b.x1) / 210 * 100).toFixed(0)} % der A4-Breite, Hoehe gesamt ${(b.y2 - b.y1).toFixed(0)} mm, capHeight-Tabelle ${tf.tables.os2?.sCapHeight ?? "fehlt"}`);
}
