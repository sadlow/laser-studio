// Prueft die Beschleunigung von clipper-lib (clipper-schnell.ts): gleiche Laserdateien mit und ohne, und die Zeit.
// Aufruf: npx tsx scripts/clipper-vergleich.ts   und   CLIPPER_LANGSAM=1 npx tsx scripts/clipper-vergleich.ts
import crypto from "node:crypto";
import fs from "node:fs";
import { rendereSchichtkarte, standardSchichtkarte, type Schichtkarte } from "../src/engine";
import { REFERENZORTE } from "../src/referenzorte";
import { ladeVorlage } from "../src/server/vorlagen";

const FAELLE: [string, string, number][] = [
  ["a4-poster-weisses-netz", "berlin", 3.5],
  ["quadrat-30-weisses-netz", "venedig", 3.5],
  ["quadrat-60-titel-kante", "amsterdam", 3.5],
  ["quadrat-60-weisses-netz", "allgaeu", 3.5],
  ["quadrat-60-titel-kante", "berlin", 9],
];

async function main() {
  const token = fs.readFileSync(".env.local", "utf8").match(/MAPBOX_ACCESS_TOKEN=(.*)/)?.[1]?.trim() ?? "";
  const basis = standardSchichtkarte();
  for (const [vorlage, ortId, km] of FAELLE) {
    const v = ladeVorlage(vorlage)!;
    const ort = REFERENZORTE.find((o) => o.id === ortId)!;
    const k: Schichtkarte = { ...v.karte, ausschnittKm: km, lon: ort.lon, lat: ort.lat, kunde: { ...basis.kunde, ortText: ort.ortText, holzrahmen: "schwarz" } };
    await rendereSchichtkarte(k, token); // Kacheln in den Cache
    const t0 = performance.now();
    const r = await rendereSchichtkarte(k, token);
    const ms = Math.round(performance.now() - t0);
    const hash = crypto.createHash("sha1").update(r.vorschauSvg + r.lagen.map((l) => l.laserSvg).join("") + JSON.stringify(r.teilung)).digest("hex").slice(0, 12);
    console.log(`${vorlage.padEnd(26)} ${ortId.padEnd(10)} ${String(km).padStart(4)} km  ${String(ms).padStart(6)} ms  ${hash}`);
  }
}
void main();
