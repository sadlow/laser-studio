// Halbinseln in allen Schnittschriften: Flaechen, die nur an einem schmalen Hals haengen (das & der Bacalisties,
// Musterstueck 10.10.2026), und die Stege, die sie bekommen (halbinseln.ts). Je Format eine Ansicht:
//   schwarz = Schnitt, rot = alle Stege, blau = Stege der Halbinseln
// Aufruf: npx tsx scripts/halbinseln-schrift.ts [a5 a4 a3]
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { FORMATE } from "../src/engine/formate";
import { ringeInMm, type Flaeche } from "../src/engine/geometrie";
import { stegeHalbinseln } from "../src/engine/halbinseln";
import { standardLayoutWerte, ZEILENSCHRIFT_MASSE, zeilenGroesse } from "../src/engine/poster-masse";
import { setzeSchnittText } from "../src/engine/schnitt-text";
import { standardSchichtkarte, TITELSCHRIFTEN } from "../src/engine/standard";
import { exportOrdner } from "./testblatt-teile";

const TITEL = ["Lukas & Emily", "aeo BR8Ä Hamburg"];
const ZEILEN = ["ERSTES TREFFEN & AEO BR8Ä", "HANDEWITT 54°44'3\"N 9°20'24\"O"];
const formate = (process.argv.slice(2).length ? process.argv.slice(2) : ["a5", "a4", "a3"]) as ("a5" | "a4" | "a3")[];
const k = standardSchichtkarte();
const R = { minStrichMm: 0.8, stegMm: Math.max(k.stegMm, k.stegMinMm), materialMm: k.stegMinMm, offenUnterMm: k.stencilMinInselBreiteMm };
const { ordner } = exportOrdner("halbinseln-schrift");
const pfad = (fl: Flaeche, dx: number, dy: number) =>
  ringeInMm(fl).map((r) => `M${r.map((p) => `${(p.x + dx).toFixed(3)},${(p.y + dy).toFixed(3)}`).join("L")}Z`).join("");

for (const format of formate) {
  const hoehe = FORMATE[format].hoeheMm;
  const w = standardLayoutWerte(format);
  const zeilen: { schrift: string; text: string; art: "schreib" | "druck"; versal: number; sperrung: number }[] = [
    ...TITELSCHRIFTEN.flatMap((schrift) => TITEL.map((text) => ({ schrift, text, art: "schreib" as const, versal: hoehe * w.titelStil.hoeheAnteil, sperrung: 0 }))),
    ...Object.keys(ZEILENSCHRIFT_MASSE).flatMap((schrift) => {
      const z = zeilenGroesse(format, schrift);
      return ZEILEN.map((text) => ({ schrift, text, art: "druck" as const, versal: hoehe * z.hoeheAnteil, sperrung: z.sperrung }));
    }),
  ];
  const teile: string[] = [];
  let y = 6;
  let breite = 100;
  console.log(`\n${format.toUpperCase()}`);
  for (const z of zeilen) {
    const t = setzeSchnittText({ text: z.text, schrift: z.schrift, versalhoeheMm: z.versal, sperrungEm: z.sperrung, mitteX: 0, mitteY: 0, maxBreiteMm: 1e4 }, z.art, R);
    const h = z.art === "schreib" ? stegeHalbinseln(t.flaeche, R.stegMm).stege : [];
    const p = ringeInMm(t.flaeche).flat();
    const [x0, x1, y0, y1] = [Math.min(...p.map((q) => q.x)), Math.max(...p.map((q) => q.x)), Math.min(...p.map((q) => q.y)), Math.max(...p.map((q) => q.y))];
    const [dx, dy] = [6 - x0, y + 3 - y0];
    teile.push(
      `<text x="6" y="${y}" font-family="Helvetica" font-size="2.2" fill="#555">${z.schrift} · ${z.versal.toFixed(1).replace(".", ",")} mm · Stege ${t.stege}, davon Halbinseln ${t.halbinseln}, ohne Steg ${t.ohneSteg}</text>`,
      `<path d="${pfad(t.flaeche, dx, dy)}" fill="#e33"/>`,
      `<path d="${pfad(h, dx, dy)}" fill="#2a7de1"/>`,
      `<path d="${pfad(t.schnitt, dx, dy)}" fill="#111"/>`,
    );
    breite = Math.max(breite, x1 - x0 + 12);
    y += y1 - y0 + 9;
    console.log(`  ${z.schrift.padEnd(36)} ${z.text.padEnd(30)} Stege ${String(t.stege).padStart(3)}  Halbinseln ${t.halbinseln}  ohne Steg ${t.ohneSteg}`);
  }
  const datei = path.join(ordner, `halbinseln-${format}.svg`);
  fs.writeFileSync(datei, `<svg xmlns="http://www.w3.org/2000/svg" width="${breite}mm" height="${y}mm" viewBox="0 0 ${breite} ${y}"><rect width="100%" height="100%" fill="#fff"/>${teile.join("")}</svg>`);
  try {
    execFileSync("magick", ["-density", "300", datei, datei.replace(/\.svg$/, ".png")]);
  } catch {
    // ohne ImageMagick bleibt es beim SVG
  }
}
console.log(`\n${ordner}`);
