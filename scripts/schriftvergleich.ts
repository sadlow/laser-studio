// Rendert dieselbe Karte mit verschiedenen Zeilenschnitten und Sperrungen und
// meldet, was die Stencil-Regeln daraus machen.
// Aufruf: npx tsx scripts/schriftvergleich.ts [zielordner]
import fs from "node:fs";
import path from "node:path";
import { rendereSchichtkarte, standardSchichtkarte, type Schichtkarte } from "../src/engine";

async function main() {
  const ziel = process.argv[2] ?? "export/schriftvergleich";
  fs.mkdirSync(ziel, { recursive: true });
  const token = fs.readFileSync(".env.local", "utf8").match(/MAPBOX_ACCESS_TOKEN=(.*)/)?.[1]?.trim() ?? "";
  const basis: Schichtkarte = { ...standardSchichtkarte(), aufbau: "netz-schwarz" };
  const varianten: [string, string, number][] = [
    ["demi", "AvantGardeCE-Demi.otf", 0.06],
    ["book", "AvantGarde-Book.otf", 0.06],
    ["book-weit", "AvantGarde-Book.otf", 0.14],
    ["extralight-weit", "AvantGarde-ExtraLight.otf", 0.14],
  ];
  for (const [name, schrift, sperrung] of varianten) {
    const karte = { ...basis, zeilenStil: { ...basis.zeilenStil, schrift, sperrung } };
    const r = await rendereSchichtkarte(karte, token);
    fs.writeFileSync(path.join(ziel, `${name}.svg`), r.vorschauSvg);
    const k = r.kennzahlen;
    console.log(name.padEnd(16), `Stege ${k.stencilStege} | zugefuellt ${k.inselnZugefuellt} | ohne Steg ${k.punzenOhneSteg} | lose Textteile ${k.loseTextteile}`);
    for (const w of r.warnungen.filter((w) => !w.includes("zerfaellt"))) console.log("                 -", w);
  }
}
void main();
