// Schrift-Testblatt: die A5-Kundenzeilen und der A5-Titel, ausgeschnitten wie im Produkt (schnitt-text.ts) – mit der
// eingestellten Zeilenschrift. Fuer Durchlaeufe mit anderen Laserwerten.
// Aufruf: npx tsx scripts/testblatt-schrift.ts [zeilen=0.8] [titel=0.8] [steg=0.7]   (Listen mit Komma: zeilen=0.8,0.9)
import fs from "node:fs";
import path from "node:path";
import type { Flaeche } from "../src/engine/geometrie";
import { standardLayoutWerte } from "../src/engine/poster-masse";
import { ebene, pfad } from "../src/engine/produktion";
import { standardSchichtkarte } from "../src/engine/standard";
import type { Schichtkarte } from "../src/engine/typen";
import { zeilenAusEingabe } from "../src/engine/zeilen";
import { exportOrdner, schnitte, schnittText, svgDatei } from "./testblatt-teile";

const arg = (name: string, standard: string) => (process.argv.find((a) => a.startsWith(`${name}=`))?.split("=")[1] ?? standard).split(",").filter(Boolean).map(Number);
const ZEILEN = arg("zeilen", "0.8");
const TITEL = arg("titel", "0.8");
const [STEG] = arg("steg", "0.7");
const B = 115;
const komma = (n: number) => String(n).replace(".", ",");

// Die Kundentexte der Testkarte (Goerzallee) in A5.
const basis = standardSchichtkarte();
const k: Schichtkarte = { ...basis, ...standardLayoutWerte("a5"), format: "a5", lon: 13.28022, lat: 52.4154 };
const texte = zeilenAusEingabe(k);
const zeile = { schrift: k.zeilenStil.schrift, versalMm: 210 * k.zeilenStil.hoeheAnteil, sperrung: k.zeilenStil.sperrung, mitteX: B / 2, stegMm: STEG };
const beschriftung = (text: string, mitteY: number) =>
  schnittText({ text, schrift: "AvantGardeCE-Demi.otf", versalMm: 4.2, sperrung: 0.04, mitteX: B / 2, mitteY, minStrichMm: 0.8, stegMm: STEG });

const ausschnitte: Flaeche[] = [];
let y = 5;
for (const strich of ZEILEN) {
  ausschnitte.push(beschriftung(`Strich ${komma(strich)}`, y + 2.1));
  ausschnitte.push(schnittText({ ...zeile, text: texte.zeile1, mitteY: y + 8.5, minStrichMm: strich }));
  ausschnitte.push(schnittText({ ...zeile, text: texte.zeile2, mitteY: y + 15, minStrichMm: strich }));
  y += 21;
}
for (const strich of TITEL) {
  ausschnitte.push(beschriftung(`Titel ${komma(strich)}`, y + 2.1));
  // Bacalisties in A5: Oberlaenge 8,3 mm ueber, Unterlaenge 22,3 mm unter der Versalmitte.
  ausschnitte.push(schnittText({ text: texte.titel, schrift: k.titelStil.schrift, versalMm: 210 * k.titelStil.hoeheAnteil, sperrung: 0, mitteX: B / 2, mitteY: y + 7 + 8.3, minStrichMm: strich, stegMm: STEG, schreib: true }));
  y += 7 + 30.6 + 3;
}

const H = Math.ceil(y + 2);
const { innen, aussen } = schnitte(B, H, ausschnitte);
const { ordner, datum } = exportOrdner("testblatt-schrift");
fs.writeFileSync(
  path.join(ordner, "testblatt-schrift.svg"),
  svgDatei(B, H, "Testblatt Schrift", `Acrylglas 2 mm; Platte ${B} x ${H} mm; erstellt ${datum}`,
    ebene("Schnitt_innen", "3 Schnitt innen", `fill="none" stroke="#FF0000" stroke-width="0.1"`, innen.map((r) => pfad([r], false))) +
      ebene("Schnitt_aussen", "4 Schnitt aussen", `fill="none" stroke="#0000FF" stroke-width="0.1"`, [pfad([aussen], false)])),
);
fs.writeFileSync(
  path.join(ordner, "uebersicht.txt"),
  [
    `Testblatt Schrift – erstellt ${datum}`,
    ``,
    `Platte ${B} x ${H} mm, Acrylglas 2 mm, nur Schnitte. Stege ${komma(STEG)} mm.`,
    `Zeilen: A5, ${k.zeilenStil.schrift.replace(/\.(ttf|otf)$/, "")}, Versalhoehe ${komma(Number(zeile.versalMm.toFixed(2)))} mm, Strich mind. ${ZEILEN.map(komma).join(" / ")} mm.`,
    `Titel: A5, ${k.titelStil.schrift.replace(/\.(ttf|otf)$/, "")}, nur aussen verstaerkt bis ${TITEL.map(komma).join(" / ")} mm, Stege quer durch die duennsten Striche.`,
    ``,
    `Stege gerade wie in einer Stencil-Schrift (B D P R 4 am Stamm, A am rechten Schenkel, O 0 8 oben und unten,`,
    `6 und 9 seitlich); Gradzeichen als Ring mit einem Steg; zwischen allen Buchstaben mindestens ${komma(STEG)} mm Material.`,
    ``,
    `Pruefen: fallen die Buchstaben ohne Pinzette heraus? halten die Stege? mit welcher Schnitteinstellung?`,
    `Ergebnis: Schnitteinstellung ___; Zeilen loesen sich: ja / nein; Titel loest sich: ja / nein; Stege halten: ja / nein`,
    ``,
  ].join("\n"),
);
console.log(`${ordner}: ${B} x ${H} mm, ${innen.length} Innenschnitte`);
