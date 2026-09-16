// Dieselbe Platte mit verschiedenen Ausschnitten: wie dicht wird das Netz?
// Mit mehreren Formaten zeigt es, was derselbe Massstab je Format aendert: der Ausschnitt
// bleibt gleich (km = Kartenbreite), nur welche Strassen noch schneidbar sind, nicht.
// Aufruf: npx tsx scripts/ausschnittvergleich.ts [zielordner] [km,km,...] [format,format,...]
import fs from "node:fs";
import path from "node:path";
import { rendereSchichtkarte, standardLayoutWerte, standardSchichtkarte, type FormatKey } from "../src/engine";

async function main() {
  const ziel = process.argv[2] ?? "export/ausschnittvergleich";
  const kms = (process.argv[3] ?? "2,3.5,6").split(",").map(Number);
  const formate = (process.argv[4] ?? "a4").split(",") as FormatKey[];
  fs.mkdirSync(ziel, { recursive: true });
  const token = fs.readFileSync(".env.local", "utf8").match(/MAPBOX_ACCESS_TOKEN=(.*)/)?.[1]?.trim() ?? "";
  for (const km of kms) {
    for (const format of formate) {
      const r = await rendereSchichtkarte({ ...standardSchichtkarte(), format, ...standardLayoutWerte(format), ausschnittKm: km }, token);
      fs.writeFileSync(path.join(ziel, `${format}-${km}km.svg`), r.vorschauSvg);
      const k = r.kennzahlen;
      const m = r.ausschnittMeter;
      console.log(
        `${km} km`.padEnd(8),
        formate.length > 1 ? `${format.padEnd(4)} ${(m.breite / 1000).toFixed(2)} x ${(m.hoehe / 1000).toFixed(2)} km |` : "",
        `Zoom ${k.zoomEntsprechung.toFixed(1)} | Netz ${Math.round(k.netzAnteilFenster * 100)}%`,
        `| Breite x${k.dichtefaktor.toFixed(2)} (Deckung vor Ort ${Math.round(k.deckungVorOrt * 100)} %)`,
        `| graviert statt geschnitten: ${k.herabgestuft.join(", ") || "-"} | nachgerueckt: ${k.nachgerueckt.join(", ") || "-"}`,
        `| Bloecke zu ${k.netzLoecherZugefuellt} | lose Netzstuecke ${k.loseNetzstuecke} | Hintergrund ${k.hintergrundTeile}T`,
      );
    }
  }
}
void main();
