// Layout "Titel auf der Kante" (kante.ts) in seinen Kundenwahlen: Titel links/mittig/rechts, Zeile links/mitte/rechts.
// Aufruf: npx tsx scripts/layout-kante.ts [zielordner] [km] [ort-id] [aufbau]
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { rendereSchichtkarte, standardSchichtkarte, type Schichtkarte, type TitelLage, type ZeilenLage } from "../src/engine";
import { REFERENZORTE } from "../src/referenzorte";
import { ladeVorlage } from "../src/server/vorlagen";

const VARIANTEN: [TitelLage, ZeilenLage][] = [["rechts", "links"], ["links", "rechts"], ["mitte", "mitte"]];

async function main() {
  const ziel = process.argv[2] ?? "export/layout-kante";
  const km = Number(process.argv[3] ?? 9);
  const ort = REFERENZORTE.find((o) => o.id === (process.argv[4] ?? "berlin"))!;
  fs.mkdirSync(ziel, { recursive: true });
  const token = fs.readFileSync(".env.local", "utf8").match(/MAPBOX_ACCESS_TOKEN=(.*)/)?.[1]?.trim() ?? "";
  const v = ladeVorlage("quadrat-60-titel-kante")!;
  const basis = standardSchichtkarte();
  for (const [titelLage, zeilenLage] of VARIANTEN) {
    const k: Schichtkarte = {
      ...v.karte, ausschnittKm: km, lon: ort.lon, lat: ort.lat, aufbau: (process.argv[5] as Schichtkarte["aufbau"]) ?? v.karte.aufbau,
      kunde: { ...basis.kunde, ortText: ort.ortText, holzrahmen: "schwarz", titelLage, zeilenLage },
    };
    const t0 = Date.now();
    const r = await rendereSchichtkarte(k, token);
    const id = `titel-${titelLage}_zeile-${zeilenLage}`;
    console.log(id, `${Date.now() - t0} ms`, "|", r.warnungen.join(" / "));
    // Mit Holzrahmen: 10 mm ausserhalb, 4 mm ueber dem Motiv.
    const B = r.layout.platte.breiteMm;
    const rahmen = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-10 -10 ${B + 20} ${B + 20}" width="${(B + 20) * 2}" height="${(B + 20) * 2}">` +
      `<svg x="0" y="0" width="${B}" height="${B}" viewBox="0 0 ${B} ${B}">${r.vorschauSvg.replace(/^<svg[^>]*>/, "").replace(/<\/svg>\s*$/, "")}</svg>` +
      `<path d="M-10,-10H${B + 10}V${B + 10}H-10Z M4,4V${B - 4}H${B - 4}V4Z" fill="#1d1c1a" fill-rule="evenodd"/></svg>`;
    fs.writeFileSync(path.join(ziel, `${id}.svg`), r.vorschauSvg);
    await sharp(Buffer.from(rahmen), { density: 60 }).png().toFile(path.join(ziel, `${id}.png`));
  }
}
void main();
