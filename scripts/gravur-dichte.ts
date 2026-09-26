// Wie dicht liegen die Gravurlinien? Je Punkt entlang der Wege der Abstand zur naechsten fremden, annaehernd PARALLELEN
// Linie (bis 35 Grad; nicht die eigene, nicht Kreuzungen). Zeigt, wie viel Gravurweg so nah an einem anderen liegt, dass der Strahl beide
// zusammen brennt (Marcel 26.09.2026). Aufruf: npx tsx scripts/gravur-dichte.ts [vorlage] [ort] [km,...]
import fs from "node:fs";
import { rendereSchichtkarte, standardSchichtkarte, type Schichtkarte } from "../src/engine";
import { gravurFuerExport } from "../src/engine/gravur-export";
import { ausTeilen, ziehLinienAb } from "../src/engine/geometrie";
import { REFERENZORTE } from "../src/referenzorte";
import { mitKartenQuelle } from "../src/server/karten-quelle";
import { ladeVorlage } from "../src/server/vorlagen";

const GRENZEN = [0.25, 0.5, 1, 1.5];
const SCHRITT = 0.5;
const ZELLE = 1.5;
const EIGEN_MM = 4;

interface Seg { pfad: number; a0: number; x0: number; y0: number; x1: number; y1: number }

function messe(pfade: { x: number; y: number }[][], gruppe: number[] = []) {
  const gitter = new Map<string, Seg[]>();
  const segs: Seg[] = [];
  let gesamt = 0;
  pfade.forEach((p, id) => {
    let a = 0;
    for (let i = 1; i < p.length; i++) {
      const d = Math.hypot(p[i].x - p[i - 1].x, p[i].y - p[i - 1].y);
      const s = { pfad: id, a0: a, x0: p[i - 1].x, y0: p[i - 1].y, x1: p[i].x, y1: p[i].y };
      segs.push(s);
      const [gx0, gx1] = [Math.floor(Math.min(s.x0, s.x1) / ZELLE), Math.floor(Math.max(s.x0, s.x1) / ZELLE)];
      const [gy0, gy1] = [Math.floor(Math.min(s.y0, s.y1) / ZELLE), Math.floor(Math.max(s.y0, s.y1) / ZELLE)];
      for (let gx = gx0; gx <= gx1; gx++) for (let gy = gy0; gy <= gy1; gy++) {
        const k = `${gx},${gy}`;
        (gitter.get(k) ?? gitter.set(k, []).get(k)!).push(s);
      }
      a += d;
    }
    gesamt += a;
  });
  const zaehler = GRENZEN.map(() => 0);
  let proben = 0;
  const jeGruppe = new Map<number, { proben: number; nah: number; nahFremd: number }>();
  for (const s of segs) {
    const len = Math.hypot(s.x1 - s.x0, s.y1 - s.y0);
    const n = Math.max(1, Math.round(len / SCHRITT));
    for (let i = 0; i < n; i++) {
      const t = (i + 0.5) / n;
      const px = s.x0 + (s.x1 - s.x0) * t, py = s.y0 + (s.y1 - s.y0) * t, arc = s.a0 + len * t;
      let best = Infinity, bestFremd = Infinity;
      const gx = Math.floor(px / ZELLE), gy = Math.floor(py / ZELLE);
      for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) {
        for (const o of gitter.get(`${gx + dx},${gy + dy}`) ?? []) {
          if (o.pfad === s.pfad && Math.abs(o.a0 - arc) < EIGEN_MM + Math.hypot(o.x1 - o.x0, o.y1 - o.y0)) continue;
          const vx = o.x1 - o.x0, vy = o.y1 - o.y0, l2 = vx * vx + vy * vy || 1;
          // Nur annaehernd parallele Nachbarn (bis 35 Grad): quer laufende Linien kreuzen, sie liegen nicht doppelt.
          const lo = Math.sqrt(l2), ls = Math.hypot(s.x1 - s.x0, s.y1 - s.y0) || 1;
          if (Math.abs(((s.x1 - s.x0) * vy - (s.y1 - s.y0) * vx) / (ls * lo)) > 0.574) continue;
          const u = Math.max(0, Math.min(1, ((px - o.x0) * vx + (py - o.y0) * vy) / l2));
          const dd = Math.hypot(px - (o.x0 + u * vx), py - (o.y0 + u * vy));
          best = Math.min(best, dd);
          if (gruppe[o.pfad] !== gruppe[s.pfad]) bestFremd = Math.min(bestFremd, dd);
        }
      }
      proben++;
      const gs = jeGruppe.get(gruppe[s.pfad]) ?? jeGruppe.set(gruppe[s.pfad], { proben: 0, nah: 0, nahFremd: 0 }).get(gruppe[s.pfad])!;
      gs.proben++;
      if (best < 0.5) gs.nah++;
      if (bestFremd < 0.5) gs.nahFremd++;
      GRENZEN.forEach((g, j) => { if (best < g) zaehler[j]++; });
    }
  }
  return { gesamtM: gesamt / 1000, anteil: zaehler.map((z) => (100 * z) / Math.max(1, proben)), pfade: pfade.length, jeGruppe };
}

async function main() {
  for (const z of fs.readFileSync(".env.local", "utf8").split("\n")) { const m = z.match(/^([A-Z_]+)=(.*)$/); if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim(); }
  const v = ladeVorlage(process.argv[2] ?? "quadrat-60-titel-kante")!;
  const ort = REFERENZORTE.find((o) => o.id === (process.argv[3] ?? "berlin"))!;
  const kms = (process.argv[4] ?? "10.1,20.3,34.8").split(",").map(Number);
  const b = standardSchichtkarte();
  console.log(`Gravurlinien ${v.id}, ${ort.name}: Anteil des Wegs, dessen naechste fremde Linie naeher ist als …`);
  console.log("km".padEnd(6), "Wege".padStart(7), "Weg m".padStart(7), ...GRENZEN.map((g) => `< ${g} mm`.padStart(9)));
  for (const km of kms) {
    const k = { ...v.karte, ausschnittKm: km, lon: ort.lon, lat: ort.lat, kunde: { ...b.kunde, ortText: ort.ortText, holzrahmen: "schwarz" } } as Schichtkarte;
    if (process.env.MIN_ABSTAND !== undefined) k.gravurExport = { ...(k.gravurExport ?? b.gravurExport), minAbstandMm: Number(process.env.MIN_ABSTAND) };
    const { wert: r } = await mitKartenQuelle("archiv", (q) => rendereSchichtkarte(k, q, undefined, { teilung: false }), km);
    const lage = r.lagen.find((l) => l.key === "hintergrund")!;
    const pfade = gravurFuerExport(lage, k.gravurExport).pfade.map((p) => p.punkte);
    const m = messe(pfade);
    console.log(String(km).padEnd(6), String(m.pfade).padStart(7), m.gesamtM.toFixed(1).padStart(7), ...m.anteil.map((a) => `${a.toFixed(1)} %`.padStart(9)));
    if (process.env.GRUPPEN) {
      // Vor dem Verbinden der Wege, je Gruppe (Reihenfolge und Breite wie in lage.gravur).
      const material = ausTeilen(lage.teile);
      const linien: { x: number; y: number }[][] = [];
      const gruppe: number[] = [];
      lage.gravur.forEach((g, gi) => ziehLinienAb(g.linien, material, true).forEach((l) => { linien.push(l); gruppe.push(gi); }));
      const mg = messe(linien, gruppe);
      lage.gravur.forEach((g, gi) => {
        const st = mg.jeGruppe.get(gi);
        if (!st) return;
        const weg = (st.proben * SCHRITT) / 1000;
        console.log(`   Gruppe ${gi} Breite ${g.breiteMm.toFixed(2)} mm: ${weg.toFixed(1)} m | naeher als 0,5 mm an irgendeiner Linie ${(100 * st.nah / st.proben).toFixed(0)} %, an einer Linie einer anderen Gruppe ${(100 * st.nahFremd / st.proben).toFixed(0)} %`);
      });
    }
  }
}
void main();
