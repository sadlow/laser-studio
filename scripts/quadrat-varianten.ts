// Quadrat 30x30 im eingebetteten Layout, zwei Lesarten des Entwurfs:
// A Titel oben am Rand, B Titel unten am Rand – Namen und Koordinaten je in den unteren Ecken.
// Aufruf: npx tsx scripts/quadrat-varianten.ts [zielordner]
import fs from "node:fs";
import path from "node:path";
import { rendereSchichtkarte, standardSchichtkarte, type Anker } from "../src/engine";

async function main() {
  const ziel = process.argv[2] ?? "export/quadrat";
  fs.mkdirSync(ziel, { recursive: true });
  const token = fs.readFileSync(".env.local", "utf8").match(/MAPBOX_ACCESS_TOKEN=(.*)/)?.[1]?.trim() ?? "";
  const varianten: [string, Anker][] = [["a-titel-oben", "oben-mitte"], ["b-titel-unten", "unten-mitte"]];
  for (const [name, titelAnker] of varianten) {
    const basis = standardSchichtkarte();
    const karte = {
      ...basis,
      format: "quadrat30" as const,
      layoutArt: "eingebettet" as const,
      eingebettet: { ...basis.eingebettet, titelAnker },
    };
    const r = await rendereSchichtkarte(karte, token);
    fs.writeFileSync(path.join(ziel, `${name}.svg`), r.vorschauSvg);
    for (const l of r.lagen) fs.writeFileSync(path.join(ziel, `${name}-${l.key}.svg`), l.laserSvg);
    const k = r.kennzahlen;
    console.log(name.padEnd(14), `Fenster ${r.layout.kartenfenster.breiteMm.toFixed(0)}x${r.layout.kartenfenster.hoeheMm.toFixed(0)}mm`,
      `| Weiss ${Math.round(k.weissAnteilFenster * 100)}% | Weiss-Teile ${k.weissTeile} (lose Netz ${k.weissLoseImNetz}, Text ${k.weissLoseImText})`,
      `| Stege ${k.stencilStege} zu ${k.inselnZugefuellt} | Schwarz ${k.schwarzTeile}T | ${k.rechenzeitMs}ms`);
    for (const w of r.warnungen) console.log("               -", w);
  }
}
void main();
