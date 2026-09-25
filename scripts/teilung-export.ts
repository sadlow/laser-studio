// Exportiert die 60x60-Vorlage an einem Referenzort wie der Exportknopf: Haelften, Montageplan, Uebersicht.
// Aufruf: npx tsx scripts/teilung-export.ts [ort] [vorlage] [aufbau]
import fs from "node:fs";
import { standardSchichtkarte } from "../src/engine";
import { REFERENZORTE } from "../src/referenzorte";
import { exportiere } from "../src/server/export";
import { ladeVorlage } from "../src/server/vorlagen";

async function main() {
  const ort = REFERENZORTE.find((o) => o.id === (process.argv[2] ?? "berlin"))!;
  const v = ladeVorlage(process.argv[3] ?? "quadrat-60-weisses-netz")!;
  // Wie der Studio-Server: Kartenquelle und Token aus .env.local (karten-quelle.ts liest process.env).
  for (const zeile of fs.readFileSync(".env.local", "utf8").split("\n")) {
    const m = zeile.match(/^([A-Z_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
  }
  const basis = standardSchichtkarte();
  const e = await exportiere({
    varianten: [{ id: v.id, name: v.name, karte: { ...v.karte, aufbau: (process.argv[4] as typeof v.karte.aufbau) ?? v.karte.aufbau } }],
    kunde: { ...basis.kunde, adresse: ort.name, ortText: ort.ortText, holzrahmen: "schwarz" },
    lon: ort.lon,
    lat: ort.lat,
  });
  console.log(e.ordner);
  for (const x of e.varianten) console.log(x.dateien.join("\n"));
}
void main();
