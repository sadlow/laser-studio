// Eigenes Kartenarchiv (Protomaps, OSM) gegen Mapbox an den Referenzorten: Netzanteil, Dichte, Teile, Zeit.
// Aufruf: npx tsx scripts/quellen-vergleich.ts [vorlage] [orte,kommagetrennt]
import fs from "node:fs";
import { rendereSchichtkarte, standardSchichtkarte, type Schichtkarte } from "../src/engine";
import { REFERENZORTE } from "../src/referenzorte";
import { mitKartenQuelle } from "../src/server/karten-quelle";
import { ladeVorlage } from "../src/server/vorlagen";

async function main() {
  for (const zeile of fs.readFileSync(".env.local", "utf8").split("\n")) {
    const m = zeile.match(/^([A-Z_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
  }
  const v = ladeVorlage(process.argv[2] ?? "a4-poster-weisses-netz")!;
  const orte = process.argv[3]?.split(",") ?? REFERENZORTE.map((o) => o.id);
  const basis = standardSchichtkarte();
  console.log(`Vorlage ${v.id}, ${v.karte.ausschnittKm} km`);
  for (const id of orte) {
    const ort = REFERENZORTE.find((o) => o.id === id)!;
    const zeilen: string[] = [];
    for (const wahl of ["mapbox", "archiv"] as const) {
      const k: Schichtkarte = { ...v.karte, kartenQuelle: wahl, lon: ort.lon, lat: ort.lat, kunde: { ...basis.kunde, ortText: ort.ortText } };
      const t0 = Date.now();
      const { wert: r, quelle, hinweis } = await mitKartenQuelle(wahl, (q) => rendereSchichtkarte(k, q, undefined, { teilung: false }));
      const kalt = Date.now() - t0;
      const t1 = Date.now();
      await mitKartenQuelle(wahl, (q) => rendereSchichtkarte(k, q, undefined, { teilung: false }));
      const kz = r.kennzahlen;
      zeilen.push(`  ${quelle.padEnd(26)} ${String(kalt).padStart(6)} ms kalt ${String(Date.now() - t1).padStart(6)} ms warm | Netz ${Math.round(kz.netzAnteilFenster * 100)} % Deckung ${Math.round(kz.deckungVorOrt * 100)} % | ` +
        `Hintergrund ${kz.hintergrundTeile} T, lose ${kz.loseZurGravur}, Gravur ${kz.gravurWegM.toFixed(1)} m | herab ${kz.herabgestuft.join(",") || "-"} nach ${kz.nachgerueckt.join(",") || "-"}${hinweis ? " | " + hinweis : ""}`);
    }
    console.log(ort.name);
    for (const z of zeilen) console.log(z);
  }
}
void main();
