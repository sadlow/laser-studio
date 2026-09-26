// Gravurprobe Abstand (Marcel 26.09.2026): ab welchem Abstand bleiben zwei parallele Gravurlinien zwei Linien, statt
// als eine tiefere Rille zu brennen? Zwei gleiche Bloecke fuer Defocus 4 und 6, je auf eigener Ebene: Linienpaare
// 0,2-1,5 mm, ein Keil mit Marken, Kreuzungen, T-Einmuendung, Stern, und dreimal die dichteste Stelle Berlin 60 x 60 bei
// 20,3 km – alle Linien, Mindestabstand 0,5 und 1,0 (gravur-duenn.ts). Material egal: dieselbe Datei auf Weiss 2 mm
// und Schwarz Frost 3 mm. Aufruf: npx tsx scripts/gravurprobe-abstand.ts   -> export/<zeit>_gravurprobe-abstand/
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { rendereSchichtkarte, standardSchichtkarte, type Lage, type Schichtkarte } from "../src/engine";
import type { Punkt } from "../src/engine/clip";
import type { Flaeche } from "../src/engine/geometrie";
import { duenneAus } from "../src/engine/gravur-duenn";
import { gravurFuerExport } from "../src/engine/gravur-export";
import { ebene, linie, linienStil, pfad } from "../src/engine/produktion";
import { mitKartenQuelle } from "../src/server/karten-quelle";
import { ladeVorlage } from "../src/server/vorlagen";
import { exportOrdner, kopie, schnitte, schnittText, svgDatei } from "./testblatt-teile";

const ABSTAENDE = [0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 1, 1.2, 1.5];
const KARTE = [{ text: "alle", abstand: 0 }, { text: "0,5", abstand: 0.5 }, { text: "1,0", abstand: 1 }];
const BLOCK = { b: 125, h: 112 };
const RAND = 5;
const FELD = { b: 36, h: 30 };
// LightBurn-Palette 00 und 05 – nicht die Schnittfarben blau und rot.
const BLOECKE = [{ text: "Defocus 4", farbe: "#000000" }, { text: "Defocus 6", farbe: "#FF8000" }];
const STRAHL = 0.5;
const SCHRIFT = { schrift: "AvantGardeCE-Demi.otf", sperrung: 0.04, minStrichMm: 0.7, stegMm: 0.5 };

const laenge = (l: Punkt[]) => l.reduce((s, p, i) => (i ? s + Math.hypot(p.x - l[i - 1].x, p.y - l[i - 1].y) : s), 0);
const strahl = (x: number, y: number, winkelGrad: number, r: number): Punkt => ({ x: x + r * Math.cos((winkelGrad * Math.PI) / 180), y: y - r * Math.sin((winkelGrad * Math.PI) / 180) });

/** Muster eines Blocks ab (ox, oy): Paare, Keil, Kreuzungen. Die Kartenstuecke kommen extra. */
function muster(ox: number, oy: number): Punkt[][] {
  const l: Punkt[][] = [];
  ABSTAENDE.forEach((s, i) => {
    const cx = ox + 8 + i * 12;
    for (const d of [-s / 2, s / 2]) l.push([{ x: cx + d, y: oy + 14 }, { x: cx + d, y: oy + 34 }]);
  });
  // Keil 4 Grad: Abstand = Entfernung x sin 4°. Marken darunter bei 0,5 / 1 / 1,5 / 2 mm (lang bei ganzen mm).
  const [kx, ky, keil] = [ox + 5, oy + 52, 4];
  l.push([{ x: kx, y: ky }, { x: kx + 40, y: ky }], [{ x: kx, y: ky }, strahl(kx, ky, keil, 40 / Math.cos((keil * Math.PI) / 180))]);
  for (const s of [0.5, 1, 1.5, 2]) {
    const x = kx + s / Math.sin((keil * Math.PI) / 180);
    l.push([{ x, y: ky + 3 }, { x, y: ky + (Number.isInteger(s) ? 6 : 4.5) }]);
  }
  // Kreuzungen 90 und 30 Grad, Arme 6 mm.
  for (const [cx, w] of [[ox + 60, 90], [ox + 78, 30]] as const) {
    l.push([strahl(cx, ky, 0, -6), strahl(cx, ky, 0, 6)], [strahl(cx, ky, w, -6), strahl(cx, ky, w, 6)]);
  }
  // T-Einmuendung: der Stich endet um den halben Strahl vor der Querlinie (wie wege.ts), daneben einer, der anstoesst.
  const tx = ox + 94;
  l.push([{ x: tx - 5, y: ky - 3 }, { x: tx + 11, y: ky - 3 }]);
  l.push([{ x: tx, y: ky - 3 + STRAHL / 2 }, { x: tx, y: ky + 6 }], [{ x: tx + 6, y: ky - 3 }, { x: tx + 6, y: ky + 6 }]);
  // Stern: acht Wege in einem Knoten.
  for (let w = 0; w < 360; w += 45) l.push([{ x: ox + 116, y: ky }, strahl(ox + 116, ky, w, 5)]);
  return l;
}

/** Dichteste Stelle FELD.b x FELD.h: Gravurweg in 4-mm-Zellen, dann das Fenster mit der groessten Summe. */
function dichteste(grund: Lage, f: { xMm: number; yMm: number; breiteMm: number; hoeheMm: number }) {
  const z = 4;
  const [nx, ny] = [Math.floor(f.breiteMm / z), Math.floor(f.hoeheMm / z)];
  const zellen = new Float64Array(nx * ny);
  for (const g of grund.gravur) for (const l of g.linien) for (let i = 1; i < l.length; i++) {
    const gx = Math.floor(((l[i].x + l[i - 1].x) / 2 - f.xMm) / z);
    const gy = Math.floor(((l[i].y + l[i - 1].y) / 2 - f.yMm) / z);
    if (gx >= 0 && gy >= 0 && gx < nx && gy < ny) zellen[gy * nx + gx] += Math.hypot(l[i].x - l[i - 1].x, l[i].y - l[i - 1].y);
  }
  const [bx, by] = [Math.round(FELD.b / z), Math.round(FELD.h / z)];
  let bester = { x: f.xMm, y: f.yMm, weg: -1 };
  for (let gy = 0; gy + by <= ny; gy++) for (let gx = 0; gx + bx <= nx; gx++) {
    let s = 0;
    for (let y = gy; y < gy + by; y++) for (let x = gx; x < gx + bx; x++) s += zellen[y * nx + x];
    if (s > bester.weg) bester = { x: f.xMm + gx * z, y: f.yMm + gy * z, weg: s };
  }
  return bester;
}

async function karte() {
  for (const zl of fs.readFileSync(".env.local", "utf8").split("\n")) { const m = zl.match(/^([A-Z_]+)=(.*)$/); if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim(); }
  const v = ladeVorlage("quadrat-60-titel-kante")!;
  const b = standardSchichtkarte();
  const k = { ...v.karte, ausschnittKm: 20.3, lon: 13.3375, lat: 52.5164, kunde: { ...b.kunde, holzrahmen: "schwarz" } } as Schichtkarte;
  k.gravurExport = { ...(k.gravurExport ?? b.gravurExport), minAbstandMm: 0 };
  const { wert: r } = await mitKartenQuelle("archiv", (q) => rendereSchichtkarte(k, q, undefined, { teilung: false }), k.ausschnittKm);
  return { grund: r.lagen.find((l) => l.key === "hintergrund")!, fenster: r.layout.kartenfenster };
}

async function main() {
  const { grund, fenster } = await karte();
  const stelle = dichteste(grund, fenster);
  const platte = { b: 2 * BLOCK.b + 3 * RAND, h: BLOCK.h + 2 * RAND };
  const ebenen: string[] = [];
  const vorschau: string[] = [];
  const beschriftung: Flaeche[] = [];
  const wege: string[] = [];
  BLOECKE.forEach((blk, bi) => {
    const [ox, oy] = [RAND + bi * (BLOCK.b + RAND), RAND];
    const linien = muster(ox, oy);
    beschriftung.push(schnittText({ ...SCHRIFT, text: blk.text, versalMm: 4.2, mitteX: ox + BLOCK.b / 2, mitteY: oy + 3 }));
    ABSTAENDE.forEach((s, i) => beschriftung.push(schnittText({ ...SCHRIFT, text: String(Math.round(s * 10)), versalMm: 3, mitteX: ox + 8 + i * 12, mitteY: oy + 10 })));
    KARTE.forEach((kv, i) => {
      const [fx, fy] = [ox + 5 + i * (FELD.b + 4), oy + 78];
      beschriftung.push(schnittText({ ...SCHRIFT, text: kv.text, versalMm: 3, mitteX: fx + FELD.b / 2, mitteY: fy - 4 }));
      const stueck = kopie(grund, stelle, fx, fy, FELD.b, FELD.h);
      const duenn = duenneAus(stueck.gravur, kv.abstand).gruppen;
      const pfade = gravurFuerExport({ ...stueck, gravur: duenn }, { art: "mittellinie", strahlMm: STRAHL }).pfade;
      linien.push(...pfade.map((p) => p.punkte));
      if (bi === 0) wege.push(`  ${kv.text.padEnd(5)} ${(pfade.reduce((a, p) => a + laenge(p.punkte), 0) / 1000).toFixed(2).replace(".", ",")} m`);
    });
    ebenen.push(ebene(`Gravur_${bi + 1}`, `1 Gravur ${bi + 1} ${blk.text}`, linienStil(blk.farbe), linien.map((l) => linie(l, false))));
    vorschau.push(...linien.map((l) => linie(l, false).replace("<path ", `<path fill="none" stroke="#222" stroke-width="${STRAHL}" stroke-linecap="round" `)));
  });

  const { innen, aussen } = schnitte(platte.b, platte.h, beschriftung);
  const { ordner, datum } = exportOrdner("gravurprobe-abstand");
  const schnittEbenen =
    ebene("Schnitt_innen", "3 Schnitt innen", `fill="none" stroke="#FF0000" stroke-width="0.1"`, innen.map((r) => pfad([r], false))) +
    ebene("Schnitt_aussen", "4 Schnitt aussen", `fill="none" stroke="#0000FF" stroke-width="0.1"`, [pfad([aussen], false)]);
  fs.writeFileSync(path.join(ordner, "gravurprobe-abstand.svg"), svgDatei(platte.b, platte.h, "Gravurprobe Abstand",
    `Weiss 2 mm oder Schwarz Frost 3 mm; Platte ${platte.b} x ${platte.h} mm; Ebene 1 Defocus 4, Ebene 2 Defocus 6; erstellt ${datum}`, ebenen.join("") + schnittEbenen));
  // Vorschau: Linien so breit wie der angenommene Strahl, damit man sieht, was zusammenlaeuft.
  const bild = `<svg xmlns="http://www.w3.org/2000/svg" width="${platte.b * 8}" height="${platte.h * 8}" viewBox="0 0 ${platte.b} ${platte.h}"><rect width="100%" height="100%" fill="#f6f5f1"/>${vorschau.join("")}${pfad([aussen, ...innen], true).replace("<path ", `<path fill="none" stroke="#c00" stroke-width="0.15" `)}</svg>`;
  await sharp(Buffer.from(bild)).png().toFile(path.join(ordner, "vorschau.png"));
  fs.writeFileSync(path.join(ordner, "uebersicht.txt"), [
    `Gravurprobe Abstand – erstellt ${datum}`,
    ``,
    `Platte ${platte.b} x ${platte.h} mm. Dieselbe Datei einmal auf Weiss 2 mm und einmal auf Schwarz Frost 3 mm.`,
    `Links Ebene 1 (schwarz) mit Defocus 4, rechts Ebene 2 (orange) mit Defocus 6 – sonst gleiche Werte wie immer.`,
    `Reihenfolge: beide Gravuren, dann die Beschriftung (3 Schnitt innen), zuletzt die Platte (4 Schnitt aussen).`,
    ``,
    `Oben: Linienpaare, Zahl = Abstand der Mittellinien in 1/10 mm (2 = 0,2 mm ... 15 = 1,5 mm).`,
    `Mitte: Keil 4 Grad – Marken darunter bei 0,5 / 1 (lang) / 1,5 / 2 mm (lang) Abstand. Dann Kreuzung 90 und 30 Grad,`,
    `T-Einmuendung (links endet der Stich 0,25 mm vor der Querlinie wie im Export, rechts stoesst er an), Stern mit 8 Wegen.`,
    `Unten: dichteste Stelle Berlin 60 x 60 bei 20,3 km, ${FELD.b} x ${FELD.h} mm, Mittellinie. Gravurweg je Stueck:`,
    ...wege,
    ``,
    `Ergebnis Defocus 4: Paare getrennt ab ___ mm, Keil getrennt ab Marke ___, Kartenstueck am besten: alle / 0,5 / 1,0`,
    `Ergebnis Defocus 6: Paare getrennt ab ___ mm, Keil getrennt ab Marke ___, Kartenstueck am besten: alle / 0,5 / 1,0`,
    `Linienbreite unter der Lupe: Defocus 4 ___ mm, Defocus 6 ___ mm. Knoten im Stern: sauber / Loch / Brandfleck`,
    ``,
  ].join("\n"));
  console.log(`${ordner}: ${platte.b} x ${platte.h} mm`);
}

main();
