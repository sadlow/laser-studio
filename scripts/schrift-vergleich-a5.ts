// Zeilenschrift fuer A5 waehlen (Marcel 18.09.2026: nach dem Durchrechnen sah keine Schrift sauber aus). Jede
// Kandidatin ist von sich aus kraeftig genug, dass kaum verstaerkt werden muss, und so gross, wie die laengste
// Zeile (29 Zeichen) auf A5 passt. Gerechnet wird das Textfeld wie im Produkt (setzePosterText), geschrieben:
//   vergleich.svg / .png      die Textfelder 1:1 nebeneinander – in 100 % drucken zum Ansehen
//   testblatt-schrift-a5.svg  je Schrift beide Zeilen als Laserdatei, dazu einmal der Titel
//   uebersicht.txt            Messwerte je Schrift
// Aufruf: npx tsx scripts/schrift-vergleich-a5.ts
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { ringeInMm, type Flaeche } from "../src/engine/geometrie";
import { berechneLayout } from "../src/engine/layout";
import { standardLayoutWerte } from "../src/engine/poster-masse";
import { ebene, pfad } from "../src/engine/produktion";
import { setzeGlyphen } from "../src/engine/schrift";
import { standardSchichtkarte } from "../src/engine/standard";
import { setzePosterText } from "../src/engine/textblock";
import type { Schichtkarte } from "../src/engine/typen";
import { exportOrdner, schnitte, schnittText, svgDatei } from "./testblatt-teile";

// DIN Condensed Bold (6,4 mm) fiel raus: Punzen der Ziffern nur 0,9 mm breit, die 6 und 9 brauchen Seitenstege.
const KANDIDATEN = [
  { name: "Avenir Next Condensed Demi Bold", schrift: "Avenir Next Condensed.ttc#Demi Bold", versal: 5.4 },
  { name: "Avant Garde Demi", schrift: "AvantGardeCE-Demi.otf", versal: 4.7 },
  { name: "DIN Alternate Bold", schrift: "DIN Alternate Bold.ttf", versal: 4.8 },
];
const SPERRUNG = 0.05;
const STRICH = 0.8;
const LANG = "FAMILIE WOHLGEMUTH-MAYERHOFER";
const komma = (n: number, s = 2) => n.toFixed(s).replace(".", ",");

function karte(schrift: string, versal: number): Schichtkarte {
  const basis = standardSchichtkarte();
  const w = standardLayoutWerte("a5");
  return {
    ...basis, ...w, format: "a5", lon: 13.28022, lat: 52.4154,
    titelStil: { ...w.titelStil, minStrichMm: STRICH },
    zeilenStil: { ...w.zeilenStil, schrift, hoeheAnteil: versal / 210, sperrung: SPERRUNG, minStrichMm: STRICH },
  };
}

const ring = (dx: number, dy: number) => (r: { x: number; y: number }[]) => `M${r.map((p) => `${(p.x + dx).toFixed(3)},${(p.y + dy).toFixed(3)}`).join("L")}Z`;
const zeige = (fl: Flaeche, dx: number, dy: number) => `<path d="${ringeInMm(fl).map(ring(dx, dy)).join("")}" fill="#1c1c1c"/>`;

const felder: string[] = [];
const tabelle: string[] = [];
const ausschnitte: Flaeche[] = [];
const B = 130;
let y = 5;
KANDIDATEN.forEach((kd, i) => {
  const k = karte(kd.schrift, kd.versal);
  const layout = berechneLayout(k);
  const tb = setzePosterText(k, layout);
  const oben = layout.kartenfenster.yMm + layout.kartenfenster.hoeheMm;
  const [ox, oy] = [5 + (i % 2) * 158, 12 + Math.floor(i / 2) * 86];
  felder.push(
    `<text x="${ox}" y="${oy - 2}" font-family="Helvetica" font-size="4" fill="#555">${kd.name} · Versalhöhe ${komma(kd.versal, 1)} mm</text>`,
    `<rect x="${ox}" y="${oy}" width="148" height="${210 - oben + 4}" fill="#f4f2ed" stroke="#ccc" stroke-width="0.2"/>`,
    `<rect x="${ox + k.rahmenMm}" y="${oy}" width="${148 - 2 * k.rahmenMm}" height="4" fill="#1c1c1c"/>`,
    ...tb.zeilen.map((z) => zeige(z.schnitt, ox, oy - oben + 4)),
  );
  const lang = setzeGlyphen({ text: LANG, schrift: kd.schrift, versalhoeheMm: kd.versal, sperrungEm: SPERRUNG, mitteX: 0, mitteY: 0, maxBreiteMm: 1e6 });
  const platz = 148 - 2 * k.rahmenMm - 2 * Math.max(4, 148 * 0.05);
  const [, z1, z2] = tb.zeilen;
  tabelle.push(
    `${kd.name.padEnd(32)} Versal ${komma(kd.versal, 1)} mm | verstaerkt um ${komma(Math.max(z1.zugabeMm, z2.zugabeMm))} mm | Stege ${z1.stege + z2.stege}` +
      `, ohne Steg ${z1.ohneSteg + z2.ohneSteg}, zugefuellt ${z1.zugefuellt + z2.zugefuellt} | 29 Zeichen ${komma(lang.breiteMm, 0)} von ${komma(platz, 0)} mm` +
      (lang.breiteMm > platz ? ` (auf ${Math.round((platz / lang.breiteMm) * 100)} % verkleinert)` : "") +
      (tb.warnungen.length ? ` | ${tb.warnungen.join(" ")}` : ""),
  );
  // Laserdatei: Beschriftung und beide Zeilen je Schrift.
  ausschnitte.push(schnittText({ text: kd.name, schrift: "AvantGardeCE-Demi.otf", versalMm: 4.2, sperrung: 0.04, mitteX: B / 2, mitteY: y + 2.1, minStrichMm: STRICH, stegMm: k.stegMm }));
  const zeile = { schrift: kd.schrift, versalMm: kd.versal, sperrung: SPERRUNG, mitteX: B / 2, minStrichMm: STRICH, stegMm: k.stegMm };
  ausschnitte.push(schnittText({ ...zeile, text: "FAMILIE HOFFMANN", mitteY: y + 6.5 + kd.versal / 2 }));
  ausschnitte.push(schnittText({ ...zeile, text: "BERLIN 52°24‘55“N 13°16‘49“O", mitteY: y + 9 + 1.5 * kd.versal }));
  y += 12.5 + 2 * kd.versal;
});
// Titel einmal: Bacalisties A5, nur aussen verstaerkt, Stege durch die duennste Wand.
const titelVersal = 210 * standardLayoutWerte("a5").titelStil.hoeheAnteil;
ausschnitte.push(schnittText({ text: "Titel Strich 0,8 Steg 0,7", schrift: "AvantGardeCE-Demi.otf", versalMm: 4.2, sperrung: 0.04, mitteX: B / 2, mitteY: y + 2.1, minStrichMm: STRICH, stegMm: 0.7 }));
ausschnitte.push(schnittText({ text: "Zuhause", schrift: "Bacalisties.ttf", versalMm: titelVersal, sperrung: 0, mitteX: B / 2, mitteY: y + 7 + 8.3, minStrichMm: STRICH, stegMm: 0.7, schreib: true }));
y += 7 + 30.6 + 3;

const { ordner, datum } = exportOrdner("schrift-vergleich-a5");
const H = 12 + Math.ceil(KANDIDATEN.length / 2) * 86;
const HT = Math.ceil(y + 2);
const vergleich = path.join(ordner, "vergleich.svg");
fs.writeFileSync(vergleich, `<svg xmlns="http://www.w3.org/2000/svg" width="316mm" height="${H}mm" viewBox="0 0 316 ${H}"><rect width="316" height="${H}" fill="#ffffff"/>\n${felder.join("\n")}\n</svg>\n`);
// Vorschau der Laserdatei gefuellt: ImageMagick zeichnet die Haarlinien der Laserdatei nicht.
const vorschau = path.join(ordner, "vorschau-laserdatei.svg");
fs.writeFileSync(vorschau, `<svg xmlns="http://www.w3.org/2000/svg" width="${B}mm" height="${HT}mm" viewBox="0 0 ${B} ${HT}"><rect width="${B}" height="${HT}" fill="#f4f2ed"/>${ausschnitte.map((a) => zeige(a, 0, 0)).join("")}</svg>\n`);
for (const datei of [vergleich, vorschau]) {
  try {
    execFileSync("magick", ["-density", "300", datei, datei.replace(/\.svg$/, ".png")]);
  } catch {
    console.log(`Kein ImageMagick – ${path.basename(datei, ".svg")}.png fehlt, das SVG ist da.`);
  }
}
const { innen, aussen } = schnitte(B, HT, ausschnitte);
fs.writeFileSync(
  path.join(ordner, "testblatt-schrift-a5.svg"),
  svgDatei(B, HT, "Testblatt Zeilenschrift A5", `Acrylglas 2 mm; Platte ${B} x ${HT} mm; Strich ${komma(STRICH, 1)}, Stege 0,7; erstellt ${datum}`,
    ebene("Schnitt_innen", "3 Schnitt innen", `fill="none" stroke="#FF0000" stroke-width="0.1"`, innen.map((r) => pfad([r], false))) +
      ebene("Schnitt_aussen", "4 Schnitt aussen", `fill="none" stroke="#0000FF" stroke-width="0.1"`, [pfad([aussen], false)])),
);
fs.writeFileSync(
  path.join(ordner, "uebersicht.txt"),
  [
    `Zeilenschrift fuer A5 – erstellt ${datum}`,
    ``,
    `Alle mit Mindeststrich ${komma(STRICH, 1)} mm, Stegen 0,7 mm und 0,7 mm Material zwischen den Buchstaben, wie der Export.`,
    `Jede Schrift so gross, wie die laengste Zeile (29 Zeichen) auf A5 passt, Sperrung ${komma(SPERRUNG)} em.`,
    ``,
    ...tabelle,
    ``,
    `vergleich.png/svg: Textfelder 1:1 (in 100 % drucken). testblatt-schrift-a5.svg: Laserdatei ${B} x ${HT} mm.`,
    ``,
  ].join("\n"),
);
console.log(tabelle.join("\n"));
console.log(`${ordner}: Laserdatei ${B} x ${HT} mm, ${innen.length} Innenschnitte`);
