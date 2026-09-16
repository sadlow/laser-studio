// Quadrat 30x30 im eingebetteten Layout mit den Standardwerten.
// Aufruf: npx tsx scripts/quadrat-varianten.ts [zielordner]
import fs from "node:fs";
import path from "node:path";
import { rendereSchichtkarte, standardSchichtkarte, type Schichtkarte } from "../src/engine";

async function main() {
  const ziel = process.argv[2] ?? "export/quadrat";
  fs.mkdirSync(ziel, { recursive: true });
  const token = fs.readFileSync(".env.local", "utf8").match(/MAPBOX_ACCESS_TOKEN=(.*)/)?.[1]?.trim() ?? "";
  const basis = standardSchichtkarte();
  const quadrat: Schichtkarte = { ...basis, format: "quadrat30", layoutArt: "eingebettet" };
  const varianten: [string, Schichtkarte][] = [
    ["netz-weiss", { ...quadrat, aufbau: "netz-weiss" }],
    ["netz-schwarz", { ...quadrat, aufbau: "netz-schwarz" }],
  ];
  for (const [name, karte] of varianten) {
    const r = await rendereSchichtkarte(karte, token);
    fs.writeFileSync(path.join(ziel, `${name}.svg`), r.vorschauSvg);
    for (const l of r.lagen) fs.writeFileSync(path.join(ziel, `${name}-${l.key}.svg`), l.laserSvg);
    const k = r.kennzahlen;
    console.log(name.padEnd(10), `Fenster ${r.layout.kartenfenster.breiteMm.toFixed(0)}x${r.layout.kartenfenster.hoeheMm.toFixed(0)}mm`,
      `| Netz ${Math.round(k.netzAnteilFenster * 100)}% | Lagen ${r.lagen.map((l) => `${l.key} ${l.teile.length}T`).join(", ")}`,
      `| Stege ${k.stencilStege} zu ${k.inselnZugefuellt} | ${k.rechenzeitMs}ms`);
    for (const w of r.warnungen) console.log("           -", w);
  }
}
void main();
