// Stabilitaets-Testbogen Netz (Marcel 26.09.2026): wie schmal darf eine Strasse im Raster sein, und ab welcher freien
// Laenge braucht ein Streifen mehr Breite? Geschnitten, Beschriftung graviert (schwaecht die Platte nicht).
// A Spannweite: Streifen zwischen zwei Rahmenstegen, Breite x freie Laenge. B Sackgasse: nur an einem Ende gehalten.
// C Serpentine: gewunden wie die Strassen auf Bali. D Raster: Gitter in feinen Breiten, zwei Maschenweiten.
// Dieselbe Datei in 2 mm (A4-Netz) und 3 mm (60 x 60). Aufruf: npx tsx scripts/testblatt-stabilitaet.ts
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import type { Punkt } from "../src/engine/clip";
import { puffereLinien, rechteck, ringeInMm, teile, vereinige, ziehAb, type Flaeche } from "../src/engine/geometrie";
import { ebene, pfad } from "../src/engine/produktion";
import { setzeSchnittText } from "../src/engine/schnitt-text";
import { exportOrdner, svgDatei } from "./testblatt-teile";

const BREITEN = [0.8, 1, 1.2, 1.5, 2];
const SPANNEN = [20, 40, 60, 80, 100];
const KRAGARME = [10, 20, 30, 40];
const SERPENTINE = { breiten: [0.8, 1, 1.2, 1.5], laenge: 100, amplitude: 3.5, periode: 12 };
const RASTER = { breiten: [0.5, 0.6, 0.7, 0.8], teilungen: [3, 5], feld: 34 };
const H = 8;
const LUECKE = 5;
// Passt auf eine A3-Platte (420 x 297, Marcel 26.09.2026): B unter A statt daneben.
const PLATTE = { b: 355, h: 286 };

const fenster: Flaeche[] = [];
const streifen: Punkt[][][] = [];
const breiteVon: number[] = [];
const texte: Flaeche[] = [];
const zahl = (n: number) => String(n).replace(".", ",");
const text = (t: string, x: number, y: number, versal = 3) =>
  texte.push(setzeSchnittText({ text: t.toLocaleUpperCase("de-DE"), schrift: "AvantGardeCE-Demi.otf", versalhoeheMm: versal, sperrungEm: 0.04, mitteX: x, mitteY: y, maxBreiteMm: 500 }, "druck", { minStrichMm: 0.4, stegMm: 0.5, materialMm: 0.5, offenUnterMm: 0.8 }).flaeche);
const streifenRein = (l: Punkt[], w: number) => { streifen.push([l]); breiteVon.push(w); };

// A Spannweite, darunter B Sackgasse, Zeilen = Breiten.
const ay = 20;
text("A  Spannweite (freie Laenge mm)", 5 + 14 + 150, ay - 8, 3.5);
BREITEN.forEach((w, i) => {
  const y0 = ay + i * (H + LUECKE);
  text(zahl(w), 11, y0 + H / 2);
  let x0 = 5 + 14;
  SPANNEN.forEach((L) => {
    if (i === 0) text(String(L), x0 + L / 2, ay - 3);
    fenster.push(rechteck(x0, y0, L, H));
    streifenRein([{ x: x0 - 1, y: y0 + H / 2 }, { x: x0 + L + 1, y: y0 + H / 2 }], w);
    x0 += L + 6;
  });
});
const by = ay + BREITEN.length * (H + LUECKE) + 14;
text("B  Sackgasse (mm)", 5 + 14 + 70, by - 8, 3.5);
BREITEN.forEach((w, i) => {
  const y0 = by + i * (H + LUECKE);
  text(zahl(w), 11, y0 + H / 2);
  let x0 = 5 + 14;
  KRAGARME.forEach((L) => {
    if (i === 0) text(String(L), x0 + (L + 4) / 2, by - 3);
    fenster.push(rechteck(x0, y0, L + 4, H));
    streifenRein([{ x: x0 - 1, y: y0 + H / 2 }, { x: x0 + L, y: y0 + H / 2 }], w);
    x0 += L + 4 + 6;
  });
});

// C Serpentine.
const cy = by + BREITEN.length * (H + LUECKE) + 14;
text("C  Serpentine 100 mm", 5 + 14 + 50, cy - 8, 3.5);
SERPENTINE.breiten.forEach((w, i) => {
  const [x0, y0, hoehe] = [5 + 14, cy + i * (14 + LUECKE), 14];
  text(zahl(w), 11, y0 + hoehe / 2);
  fenster.push(rechteck(x0, y0, SERPENTINE.laenge, hoehe));
  const l: Punkt[] = [{ x: x0 - 1, y: y0 + hoehe / 2 }];
  for (let x = 0; x <= SERPENTINE.laenge; x += 0.25) l.push({ x: x0 + x, y: y0 + hoehe / 2 + SERPENTINE.amplitude * Math.sin((2 * Math.PI * x) / SERPENTINE.periode) });
  l.push({ x: x0 + SERPENTINE.laenge + 1, y: l[l.length - 1].y });
  streifenRein(l, w);
});

// D Raster: Spalten = Strassenbreite, Zeilen = Teilung (Mitte zu Mitte).
const dx = 150;
text("D  Raster (Strasse mm / Teilung mm)", dx + 90, cy - 8, 3.5);
RASTER.teilungen.forEach((p, r) => {
  const y0 = cy + r * (RASTER.feld + 12);
  text(`T ${p}`, dx + 4, y0 + RASTER.feld / 2);
  RASTER.breiten.forEach((w, c) => {
    const x0 = dx + 14 + c * (RASTER.feld + 8);
    if (r === 0) text(zahl(w), x0 + RASTER.feld / 2, cy - 3);
    fenster.push(rechteck(x0, y0, RASTER.feld, RASTER.feld));
    for (let s = p / 2; s < RASTER.feld; s += p) {
      streifenRein([{ x: x0 - 1, y: y0 + s }, { x: x0 + RASTER.feld + 1, y: y0 + s }], w);
      streifenRein([{ x: x0 + s, y: y0 - 1 }, { x: x0 + s, y: y0 + RASTER.feld + 1 }], w);
    }
  });
});
text("Stabilitaet Netz – Breiten mm, Sollmasse ohne Schnittfuge", PLATTE.b / 2, PLATTE.h - 6, 3);

async function main() {
  const material = vereinige(ziehAb(rechteck(0, 0, PLATTE.b, PLATTE.h), vereinige(...fenster)), ...streifen.map((s, i) => puffereLinien(s, breiteVon[i])));
  const [haupt, ...lose] = teile(material, 0.01);
  if (lose.length) console.log(`Achtung: ${lose.length} lose Teile`);
  const innen = [...haupt.loecher, ...lose.flatMap((t) => [t.aussen, ...t.loecher])];
  const schrift = ringeInMm(vereinige(...texte));
  const { ordner, datum } = exportOrdner("testblatt-stabilitaet");
  const ebenen =
    ebene("Gravur", "1 Gravur Beschriftung", `fill="#000000" stroke="none"`, [pfad(schrift, true)]) +
    ebene("Schnitt_innen", "3 Schnitt innen", `fill="none" stroke="#FF0000" stroke-width="0.1"`, innen.map((r) => pfad([r], false))) +
    ebene("Schnitt_aussen", "4 Schnitt aussen", `fill="none" stroke="#0000FF" stroke-width="0.1"`, [pfad([haupt.aussen], false)]);
  fs.writeFileSync(path.join(ordner, "testblatt-stabilitaet.svg"), svgDatei(PLATTE.b, PLATTE.h, "Stabilitaet Netz",
    `Acrylglas 2 mm und 3 mm; Platte ${PLATTE.b} x ${PLATTE.h} mm; Sollmasse ohne Schnittfuge; erstellt ${datum}`, ebenen));
  const bild = `<svg xmlns="http://www.w3.org/2000/svg" width="${PLATTE.b * 5}" height="${PLATTE.h * 5}" viewBox="0 0 ${PLATTE.b} ${PLATTE.h}">` +
    `${pfad([haupt.aussen, ...innen], true).replace("<path ", `<path fill="#1d1d1b" `)}${pfad(schrift, true).replace("<path ", `<path fill="#9a9a96" `)}</svg>`;
  await sharp(Buffer.from(bild)).flatten({ background: "#ffffff" }).png().toFile(path.join(ordner, "vorschau.png"));
  fs.writeFileSync(path.join(ordner, "uebersicht.txt"), [
    `Stabilitaets-Testbogen Netz – erstellt ${datum}`,
    ``,
    `Platte ${PLATTE.b} x ${PLATTE.h} mm. Einmal in 2 mm (A4/A3/30 x 30), einmal in 3 mm (60 x 60, Lagen mind. 3 mm).`,
    `Reihenfolge: Beschriftung gravieren (Ebene 1, Flaeche), dann 3 Schnitt innen, zuletzt 4 Schnitt aussen.`,
    `Alle Breiten sind Sollmasse wie in der Produktion – die Schnittfuge nimmt noch etwas weg.`,
    ``,
    `A Spannweite: Streifen ${BREITEN.map(zahl).join(" / ")} mm breit, frei ueber ${SPANNEN.join(" / ")} mm.`,
    `B Sackgasse: dieselben Breiten, nur links gehalten, ${KRAGARME.join(" / ")} mm lang.`,
    `C Serpentine: ${SERPENTINE.breiten.map(zahl).join(" / ")} mm, 100 mm lang, Welle ${zahl(SERPENTINE.amplitude)} mm hoch, alle ${SERPENTINE.periode} mm.`,
    `D Raster: Strassen ${RASTER.breiten.map(zahl).join(" / ")} mm, Teilung ${RASTER.teilungen.join(" und ")} mm (Mitte zu Mitte).`,
    ``,
    `Bewertung je Streifen: 0 = beim Schneiden oder Herausdruecken gebrochen, 1 = haelt, biegt sich aber deutlich,`,
    `2 = stabil. Pruefen: Abfall herausdruecken, Platte anheben, Streifen mit dem Finger leicht antippen.`,
    ``,
    `A (Zeile Breite, Spalte Laenge)  2 mm: ______________________   3 mm: ______________________`,
    `B Sackgasse                      2 mm: ______________________   3 mm: ______________________`,
    `C Serpentine                     2 mm: ______________________   3 mm: ______________________`,
    `D Raster schmalste stabile Breite  Teilung 3: ____  Teilung 5: ____`,
    ``,
  ].join("\n"));
  console.log(`${ordner}: ${PLATTE.b} x ${PLATTE.h} mm, ${innen.length} Innenschnitte`);
}

main();
