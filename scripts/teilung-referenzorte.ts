// 60 x 60 an den Referenzorten: gewaehlte Naht je Lage, Einzelteile, kritische Uebergaenge, Rechenzeit.
// Aufruf: npx tsx scripts/teilung-referenzorte.ts [orte,kommagetrennt] [vorlage]
import fs from "node:fs";
import { rendereSchichtkarte, standardSchichtkarte, type Schichtkarte } from "../src/engine";
import { REFERENZORTE } from "../src/referenzorte";

async function main() {
  const orte = process.argv[2]?.split(",") ?? REFERENZORTE.map((o) => o.id);
  const vorlage = JSON.parse(fs.readFileSync(`vorlagen/${process.argv[3] ?? "quadrat-60-weisses-netz"}.json`, "utf8"));
  const token = fs.readFileSync(".env.local", "utf8").match(/MAPBOX_ACCESS_TOKEN=(.*)/)?.[1]?.trim() ?? "";
  for (const id of orte) {
    const ort = REFERENZORTE.find((o) => o.id === id);
    if (!ort) continue;
    const basis = standardSchichtkarte();
    const k: Schichtkarte = { ...basis, ...vorlage.karte, lon: ort.lon, lat: ort.lat,
      kunde: { ...basis.kunde, adresse: ort.name, ortText: ort.ortText, holzrahmen: "schwarz" } };
    const t0 = Date.now();
    const r = await rendereSchichtkarte(k, token);
    const ms = Date.now() - t0;
    console.log(`\n${ort.name}: ${ms} ms gesamt, davon Karte ${r.kennzahlen.rechenzeitMs} ms`);
    for (const l of r.teilung?.lagen ?? []) {
      const n = l.gewaehlt;
      console.log(`  ${l.titel.padEnd(16)} ${n.richtung.padEnd(12)} ${n.posMm} mm  Uebergaenge ${n.uebergaenge} (kritisch ${n.kritisch})` +
        `  Einzelteile ${n.einzelteile} (klein ${n.kleine})  Punkte ${n.punkte}` +
        `  | Alternativen ${l.alternativen.map((a) => `${a.richtung === "oben-unten" ? "OU" : "LR"} ${a.posMm}:${a.punkte}`).join(", ")}`);
    }
  }
}
void main();
