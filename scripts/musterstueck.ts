// Musterstueck 10.10.2026 nachgebaut: "Lukas & Emily", Erstes Treffen in Handewitt, als A5 und A4 – Laserdateien
// wie der Exportknopf, dazu die Plattenmasse aus jeder Datei nachgemessen (Breite muss zu den Rahmen passen:
// A5 150 mm, A4 211 mm).
// Aufruf: npx tsx --env-file=.env.local scripts/musterstueck.ts
import fs from "node:fs";
import path from "node:path";
import { formatStandard } from "@papierschmiede/laser-engine/formatwechsel";
import { exportiere } from "../src/server/export";

const KUNDE = {
  titel: "Lukas & Emily",
  namen: "Erstes Treffen",
  ortText: "Handewitt",
  adresse: "Handewitt",
  letzteZeile: "koordinaten" as const,
};
const ORT = { lat: 54 + 44 / 60 + 3 / 3600, lon: 9 + 20 / 60 + 24 / 3600 };

async function main() {
  for (const format of ["a5", "a4"] as const) {
    const { kunde, lon, lat, ...karte } = formatStandard(format);
    const e = await exportiere({
      varianten: [
        { id: format, name: `Musterstueck ${format.toUpperCase()}`, karte },
      ],
      kunde: { ...kunde, ...KUNDE },
      ...ORT,
    });
    // Gleicher Ort, gleiche Minute: ohne eigenen Ordner ueberschriebe A4 die A5-Dateien.
  const ordner = `${e.ordner}_${format}`;
  fs.renameSync(e.ordner, ordner);
  const v = e.varianten[0];
    console.log(`\n${format.toUpperCase()}: ${ordner}`);
    for (const datei of v.dateien.filter((d) => /^\d\d-.*\.svg$/.test(d))) {
      const svg = fs.readFileSync(path.join(ordner, datei), "utf8");
      const [w, h] = [
        svg.match(/width="([\d.]+)mm"/)?.[1],
        svg.match(/height="([\d.]+)mm"/)?.[1],
      ];
      // Aussenkontur: Ebene "4 Schnitt aussen", alle Punkte der Pfade.
      const aussen =
        svg.split(/<g id="Schnitt_aussen"/)[1]?.split("</g>")[0] ?? "";
      const zahlen = [
        ...aussen.matchAll(/[ML]\s*(-?[\d.]+)[ ,](-?[\d.]+)/g),
      ].map((m) => ({ x: Number(m[1]), y: Number(m[2]) }));
      const xs = zahlen.map((p) => p.x);
      const ys = zahlen.map((p) => p.y);
      const kontur = xs.length
        ? `${(Math.max(...xs) - Math.min(...xs)).toFixed(2)} x ${(Math.max(...ys) - Math.min(...ys)).toFixed(2)} mm`
        : "nicht gefunden";
      console.log(
        `  ${datei.padEnd(28)} Zeichenflaeche ${w} x ${h} mm, Aussenkontur ${kontur}`,
      );
    }
    if (v.warnungen.length)
      console.log(`  Hinweise: ${v.warnungen.join(" | ")}`);
  }
}
void main();
