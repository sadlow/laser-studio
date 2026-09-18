// Pruefblatt nach der Gravurprobe (Marcel 17.09.2026): die Liniengravur mit durchgehenden Wegen bei Defocus 6
// und 4, dazu die kleinste Kundenschrift (A5) mit Mindeststrich 0,5 / 0,6 / 0,7 mm und Stegen von 0,5 mm.
// Aufruf: npx tsx scripts/testblatt-schrift-linien.ts   -> export/<zeit>_testblatt-schrift-linien/
import fs from "node:fs";
import path from "node:path";
import type { Flaeche } from "../src/engine/geometrie";
import { gravurFuerExport } from "../src/engine/gravur-export";
import { ebene, linie, linienStil, pfad } from "../src/engine/produktion";
import { zeilenAusEingabe } from "../src/engine/zeilen";
import { exportOrdner, kopie, schnitte, schnittText, svgDatei, testkarte } from "./testblatt-teile";

const B = 115;
const FELD = { b: 40, h: 30 };
// Angenommene Linienbreite bei Defocus 6 – Stichenden halten um die Haelfte vor der Kreuzung an (wege.ts).
const LINIE_MM = 0.5;
const STRICHE = [0.5, 0.6, 0.7];
const STEG_MM = 0.5;
// Beschriftung selbst sicher schneidbar: Demi, mindestens 0,7 mm Strich.
const beschriftung = (text: string, mitteX: number, mitteY: number) =>
  schnittText({ text, schrift: "AvantGardeCE-Demi.otf", versalMm: 4.2, sperrung: 0.04, mitteX, mitteY, minStrichMm: 0.7, stegMm: STEG_MM });

async function main() {
  const { k, grund } = await testkarte();
  // Derselbe Ausschnitt wie die Gravurprobe vom 17.09. – dort brannte die Kreuzung oben rechts fast durch.
  const ausschnitt = { x: 83, y: 31 };
  const ausschnitte: Flaeche[] = [];
  const ebenen: string[] = [];

  // Linien: zwei Kopien nebeneinander, jede mit eigener Ebene fuer ihren Defokus.
  [{ text: "Defocus 6", farbe: "#000000" }, { text: "Defocus 4", farbe: "#FF8000" }].forEach((v, i) => {
    const ox = B / 2 - FELD.b - 5 + i * (FELD.b + 10);
    ausschnitte.push(beschriftung(v.text, ox + FELD.b / 2, 7));
    const wege = gravurFuerExport(kopie(grund, ausschnitt, ox, 11, FELD.b, FELD.h), { art: "mittellinie", strahlMm: LINIE_MM }).pfade;
    ebenen.push(ebene(`Gravur_${i + 1}`, `1 Gravur ${v.text}`, linienStil(v.farbe), wege.map((p) => linie(p.punkte, p.geschlossen))));
  });

  // Schrift: die A5-Zeilen des Produkts, je Variante verstaerkt bis zum Mindeststrich.
  const texte = zeilenAusEingabe(k);
  const zeile = { schrift: k.zeilenStil.schrift, versalMm: 210 * k.zeilenStil.hoeheAnteil, sperrung: k.zeilenStil.sperrung, mitteX: B / 2, stegMm: STEG_MM };
  STRICHE.forEach((strich, i) => {
    const y0 = 46 + i * 21;
    const name = String(strich).replace(".", ",");
    ausschnitte.push(
      beschriftung(`Strich ${name}`, B / 2, y0 + 2),
      schnittText({ ...zeile, text: texte.zeile1, mitteY: y0 + 8.5, minStrichMm: strich }),
      schnittText({ ...zeile, text: texte.zeile2, mitteY: y0 + 15, minStrichMm: strich }),
    );
  });
  // Titel in Schreibschrift, A5-Groesse, mit dem kleinsten Mindeststrich – seine Schleifen haengen an Stegen.
  ausschnitte.push(
    beschriftung("Titel 0,5", B / 2, 112),
    schnittText({ text: texte.titel, schrift: k.titelStil.schrift, versalMm: 210 * k.titelStil.hoeheAnteil, sperrung: 0, mitteX: B / 2, mitteY: 124.5, minStrichMm: 0.5, stegMm: STEG_MM, schreib: true }),
  );

  const H = 152;
  const { innen, aussen } = schnitte(B, H, ausschnitte);
  const { ordner, datum } = exportOrdner("testblatt-schrift-linien");
  fs.writeFileSync(
    path.join(ordner, "testblatt-schrift-linien.svg"),
    svgDatei(B, H, "Testblatt Schrift und Linien", `Acrylglas weiss 2 mm; Platte ${B} x ${H} mm; erstellt ${datum}`,
      ebenen.join("") +
        ebene("Schnitt_innen", "3 Schnitt innen", `fill="none" stroke="#FF0000" stroke-width="0.1"`, innen.map((r) => pfad([r], false))) +
        ebene("Schnitt_aussen", "4 Schnitt aussen", `fill="none" stroke="#0000FF" stroke-width="0.1"`, [pfad([aussen], false)])),
  );
  fs.writeFileSync(
    path.join(ordner, "uebersicht.txt"),
    [
      `Testblatt Schrift und Linien – erstellt ${datum}`,
      ``,
      `Platte ${B} x ${H} mm, Acrylglas weiss 2 mm. Beschriftung ausgeschnitten (Demi, Strich ab 0,7 mm, Stege 0,5 mm).`,
      ``,
      `Oben: Liniengravur wie jetzt exportiert – durchgehende Wege, keine doppelten Stuecke, Wege, die an einer Kreuzung`,
      `enden, halten ${String(LINIE_MM / 2).replace(".", ",")} mm davor an. Derselbe Ausschnitt wie die Gravurprobe (Kreuzung oben rechts).`,
      `  Defocus 6   #000000   Linie, Defokus 6 mm`,
      `  Defocus 4   #FF8000   Linie, Defokus 4 mm`,
      `  Pruefen: an Kreuzungen keine tieferen Punkte mehr? Linienbreite unter der Lupe: ___ mm (Defocus 6)`,
      ``,
      `Mitte: die kleinste Kundenschrift (A5, Versalhoehe ${zeile.versalMm.toFixed(2).replace(".", ",")} mm, Avant Garde Book), Stege 0,5 mm.`,
      `Book hat hier nur 0,37-0,42 mm Strich; die Zeilen werden gleichmaessig verstaerkt, bis der duennste Strich reicht:`,
      ...STRICHE.map((s) => `  Strich ${String(s).replace(".", ",")}   Mindeststrich ${String(s).replace(".", ",")} mm`),
      `Unten: der Titel in A5-Groesse (Bacalisties) mit Mindeststrich 0,5 mm.`,
      `  Pruefen: loesen sich alle Buchstaben aus der Platte? halten alle Stege? sieht die Schrift noch fein aus?`,
      ``,
      `Ergebnis: Linien ok bei Defocus ___; Schrift loest sich ab Strich ___ mm; Stege 0,5 mm halten: ja / nein`,
      ``,
    ].join("\n"),
  );
  console.log(`${ordner}: ${B} x ${H} mm, ${innen.length} Innenschnitte, Ausschnitt bei ${ausschnitt.x}/${ausschnitt.y}`);
}

main();
