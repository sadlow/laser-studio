// Rendert dieselbe Schichtkarte in allen Formaten und schreibt Vorschau + Kennzahlen.
// Aufruf: npx tsx scripts/formatvergleich.ts [zielordner]
import fs from "node:fs";
import path from "node:path";
import { rendereSchichtkarte, standardLayoutFuer, standardSchichtkarte, type FormatKey } from "../src/engine";

const ziel = process.argv[2] ?? "export/formatvergleich";
fs.mkdirSync(ziel, { recursive: true });
const token = fs.readFileSync(".env.local", "utf8").match(/MAPBOX_ACCESS_TOKEN=(.*)/)?.[1]?.trim() ?? "";

async function main() {
for (const format of ["a5", "a4", "a3", "quadrat30"] as FormatKey[]) {
  const karte = { ...standardSchichtkarte(), format, layoutArt: standardLayoutFuer(format) };
  const r = await rendereSchichtkarte(karte, token);
  fs.writeFileSync(path.join(ziel, `${format}.svg`), r.vorschauSvg);
  for (const l of r.lagen) fs.writeFileSync(path.join(ziel, `${format}-${l.key}.svg`), l.laserSvg);
  const k = r.kennzahlen;
  console.log(
    format.padEnd(10),
    `Fenster ${r.layout.kartenfenster.breiteMm.toFixed(0)}x${r.layout.kartenfenster.hoeheMm.toFixed(0)}mm`,
    `| x${k.formatfaktor.toFixed(2)} | Zoom ${k.zoomEntsprechung.toFixed(1)}`,
    `| Netz ${Math.round(k.netzAnteilFenster * 100)}%`,
    `| Bloecke zu ${k.netzLoecherZugefuellt} | lose ${k.loseNetzstuecke}`,
    `| Stege ${k.stencilStege} Inseln zu ${k.inselnZugefuellt}`,
    `| Hintergrund ${k.hintergrundTeile}T | ${k.rechenzeitMs}ms`,
  );
  for (const w of r.warnungen) console.log("           -", w);
}
}

void main();
