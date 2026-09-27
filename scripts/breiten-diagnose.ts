// Breiten, Klassen und Deckung je Ausschnitt (Marcel 26.09.2026, Lanzarote/Bali). ORT=lat,lon VORLAGE=… AUFBAU=… MITTE=lat,lon
// GRAVIERT=wohn,… SVG=pfad-praefix PUNKT=x,y (welche Lage dort liegt). Aufruf: npx tsx scripts/breiten-diagnose.ts 10.1,20.3
import fs from "node:fs";
import sharp from "sharp";
import { rendereSchichtkarte, standardSchichtkarte, type Schichtkarte } from "../src/engine";
import { skizziereSchichtkarte } from "../src/engine/skizze";
import { mitKartenQuelle } from "../src/server/karten-quelle";
import { ladeVorlage } from "../src/server/vorlagen";

async function main() {
  for (const z of fs.readFileSync(".env.local", "utf8").split("\n")) { const m = z.match(/^([A-Z_]+)=(.*)$/); if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim(); }
  const v = ladeVorlage(process.env.VORLAGE ?? "quadrat-60-titel-kante")!;
  const b = standardSchichtkarte();
  const [lat, lon] = (process.env.ORT ?? "29.0397,-13.6364").split(",").map(Number);
  const kms = (process.argv[2] ?? "8.7,10.1,15.9,20.3").split(",").map(Number);
  for (const km of kms) {
    const k = { ...v.karte, ausschnittKm: km, lon, lat, kunde: { ...b.kunde, holzrahmen: "schwarz" } } as Schichtkarte;
    if (process.env.GRAVIERT) k.strassen = k.strassen.map((g) => (process.env.GRAVIERT!.split(",").includes(g.id) ? { ...g, ziel: "gravur" as const } : g));
    if (process.env.SPARSAM) k.generalisierung = { ...k.generalisierung, stufen: { ...k.generalisierung.stufen, viel: { ...k.generalisierung.stufen.viel, sparsamNachrueckenMm: Number(process.env.SPARSAM) } } };
    if (process.env.WASSERMIN) k.wasserMinBreiteMm = Number(process.env.WASSERMIN);
    if (process.env.STUFE) k.kunde.strassenStufe = process.env.STUFE as Schichtkarte["kunde"]["strassenStufe"];
    if (process.env.AUFBAU) k.aufbau = process.env.AUFBAU as Schichtkarte["aufbau"];
    if (process.env.MITTE) { const [mla, mlo] = process.env.MITTE.split(",").map(Number); k.kartenMitte = { lat: mla, lon: mlo }; }
    if (process.env.SKIZZE) {
      await mitKartenQuelle("archiv", (q) => skizziereSchichtkarte(k, q), km);
      const t0 = Date.now();
      const { wert: sk } = await mitKartenQuelle("archiv", (q) => skizziereSchichtkarte(k, q), km);
      console.log(`  Skizze warm ${Date.now() - t0} ms`);
      if (process.env.SVG) await sharp(Buffer.from((sk as unknown as { svg?: string; vorschauSvg?: string }).svg ?? (sk as unknown as { vorschauSvg: string }).vorschauSvg), { density: Number(process.env.DPI ?? 60) }).png().toFile(`${process.env.SVG}-skizze-${km}.png`);
    }
    const { wert: r, quelle } = await mitKartenQuelle(process.env.QUELLE === "mapbox" ? "mapbox" : "archiv", (q) => rendereSchichtkarte(k, q, undefined, { teilung: false }), km);
    const kz = r.kennzahlen;
    console.log(`\n${km} km (${quelle}): format ${kz.formatfaktor.toFixed(2)} dichte ${kz.dichtefaktor.toFixed(2)} deckungVorOrt ${(kz.deckungVorOrt * 100).toFixed(1)} % netz ${(kz.netzAnteilFenster * 100).toFixed(1)} % zugefuellt ${kz.netzLoecherZugefuellt} quer ${kz.querverbindungen} verst ${kz.verstaerkt} angeb ${kz.angebunden} zusatz ${kz.zusatzM.toFixed(1)}m lose ${kz.loseZurGravur}/${kz.loseNetzstuecke} grund ${kz.hintergrundTeile} wasser ${kz.wasserFlaechenGeschnitten} zeit ${kz.rechenzeitMs} ms lose ${kz.loseZurGravur}`);
    console.log(`  herabgestuft ${kz.herabgestuft.join(", ") || "-"} | nachgerueckt ${kz.nachgerueckt.join(", ") || "-"} | Mindestbreite ${kz.netzAnMindestbreite.join(", ") || "-"} | Gravur ${kz.gravurWegM.toFixed(0)} m`);
    const d = (r as unknown as { diagnose?: unknown }).diagnose;
    if (d) console.log(d);
    if (process.env.PUNKT) {
      const [px, py] = process.env.PUNKT.split(",").map(Number);
      const drin = (t: { aussen: { x: number; y: number }[]; loecher: { x: number; y: number }[][] }) => {
        const im = (r: { x: number; y: number }[]) => { let c = false; for (let i = 0, j = r.length - 1; i < r.length; j = i++) if ((r[i].y > py) !== (r[j].y > py) && px < ((r[j].x - r[i].x) * (py - r[i].y)) / (r[j].y - r[i].y) + r[i].x) c = !c; return c; };
        return im(t.aussen) && !t.loecher.some(im);
      };
      for (const l of r.lagen) { const t = l.teile.filter(drin); console.log("  ", l.key, t.map((x) => x.flaecheMm2.toFixed(0) + " mm2, " + x.loecher.length + " Loecher").join(" | ")); }
    }
    if (process.env.SVG) fs.writeFileSync(`${process.env.SVG}-${km}.svg`, r.vorschauSvg);
    if (process.env.SVG) await sharp(Buffer.from(r.vorschauSvg), { density: Number(process.env.DPI ?? 60) }).png().toFile(`${process.env.SVG}-${km}.png`);
  }
}
main();
