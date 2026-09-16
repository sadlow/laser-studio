// Dieselbe A4-Platte mit verschiedenen Ausschnitten: wie dicht wird das Netz?
// Aufruf: npx tsx scripts/ausschnittvergleich.ts [zielordner] [km,km,...]
import fs from "node:fs";
import path from "node:path";
import { rendereSchichtkarte, standardSchichtkarte } from "../src/engine";

async function main() {
  const ziel = process.argv[2] ?? "export/ausschnittvergleich";
  const kms = (process.argv[3] ?? "2,3.5,6").split(",").map(Number);
  fs.mkdirSync(ziel, { recursive: true });
  const token = fs.readFileSync(".env.local", "utf8").match(/MAPBOX_ACCESS_TOKEN=(.*)/)?.[1]?.trim() ?? "";
  for (const km of kms) {
    const r = await rendereSchichtkarte({ ...standardSchichtkarte(), ausschnittKm: km }, token);
    fs.writeFileSync(path.join(ziel, `a4-${km}km.svg`), r.vorschauSvg);
    const k = r.kennzahlen;
    console.log(
      `${km} km`.padEnd(8),
      `Zoom ${k.zoomEntsprechung.toFixed(1)} | Netz ${Math.round(k.netzAnteilFenster * 100)}%`,
      `| Breite x${k.ausschnittfaktor.toFixed(2)} | graviert statt geschnitten: ${k.herabgestuft.join(", ") || "-"}`,
      `| Bloecke zu ${k.netzLoecherZugefuellt} | lose Netzstuecke ${k.loseNetzstuecke} | Hintergrund ${k.hintergrundTeile}T`,
    );
  }
}
void main();
