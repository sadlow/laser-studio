// Gravurprobe auf Weiss: dasselbe kleine Strassennetz viermal, jede Kopie auf einer eigenen Ebene. Drei als
// Liniengravur – jede bekommt einen anderen Defokus und zeigt, wie breit die Strasse damit wird –, eine als
// Flaechengravur zum Vergleich (Marcel 17.09.2026; Ergebnis: Defocus 6 mm, 4 mm filigraner).
// Aufruf: npx tsx scripts/gravurprobe-weiss.ts   -> export/<zeit>_gravurprobe-weiss/
import fs from "node:fs";
import path from "node:path";
import type { Flaeche } from "../src/engine/geometrie";
import { gravurFuerExport } from "../src/engine/gravur-export";
import { ebene, linie, linienStil, pfad } from "../src/engine/produktion";
import { dichtesterAusschnitt, exportOrdner, kopie, schnitte, schnittText, svgDatei, testkarte } from "./testblatt-teile";

const FELD = { b: 40, h: 30 };
const ABSTAND = 5;
const TEXT = 6;
// LightBurn-Palette 00, 05, 06, 07 – nicht die Schnittfarben 01 blau und 02 rot.
const VARIANTEN = [
  { text: "Defocus 1", farbe: "#000000", art: "mittellinie", hinweis: "Liniengravur, Defokus 1 mm" },
  { text: "Defocus 2", farbe: "#FF8000", art: "mittellinie", hinweis: "Liniengravur, Defokus 2 mm" },
  { text: "Defocus 3", farbe: "#00E0E0", art: "mittellinie", hinweis: "Liniengravur, Defokus 3 mm" },
  { text: "Flächengravur", farbe: "#FF00FF", art: "flaeche", hinweis: "Flaechengravur (gerastert) zum Vergleich" },
] as const;

async function main() {
  const { grund, fenster } = await testkarte();
  const ausschnitt = dichtesterAusschnitt(grund, fenster, FELD.b, FELD.h);
  const platte = { b: 2 * FELD.b + 3 * ABSTAND, h: 2 * (FELD.h + TEXT) + 3 * ABSTAND };
  const ebenen: string[] = [];
  const beschriftung: Flaeche[] = [];
  let flaecheMm2 = 0;
  let wegMm = 0;
  VARIANTEN.forEach((v, i) => {
    const ox = ABSTAND + (i % 2) * (FELD.b + ABSTAND);
    const oy = ABSTAND + TEXT + Math.floor(i / 2) * (FELD.h + TEXT + ABSTAND);
    const gravur = gravurFuerExport(kopie(grund, ausschnitt, ox, oy, FELD.b, FELD.h), { art: v.art, strahlMm: 0.5 });
    const name = `1 Gravur ${i + 1} ${v.text}`;
    if (v.art === "flaeche") {
      flaecheMm2 += gravur.flaechen.reduce((s, t) => s + t.flaecheMm2, 0);
      ebenen.push(ebene(`Gravur_${i + 1}`, name, `fill="${v.farbe}" stroke="none"`, gravur.flaechen.map((t) => pfad([t.aussen, ...t.loecher], true))));
    } else {
      wegMm = gravur.pfade.reduce((s, p) => s + p.punkte.reduce((a, q, j) => (j ? a + Math.hypot(q.x - p.punkte[j - 1].x, q.y - p.punkte[j - 1].y) : a), 0), 0);
      ebenen.push(ebene(`Gravur_${i + 1}`, name, linienStil(v.farbe), gravur.pfade.map((p) => linie(p.punkte, p.geschlossen))));
    }
    // Beschriftung geschnitten statt graviert – Gravur auf Weiss ist kaum zu lesen.
    beschriftung.push(schnittText({ text: v.text, schrift: "AvantGardeCE-Demi.otf", versalMm: 4.2, sperrung: 0.04, mitteX: ox + FELD.b / 2, mitteY: oy - TEXT / 2, minStrichMm: 0.7, stegMm: 0.5 }));
  });

  const { innen, aussen } = schnitte(platte.b, platte.h, beschriftung);
  const { ordner, datum } = exportOrdner("gravurprobe-weiss");
  fs.writeFileSync(
    path.join(ordner, "gravurprobe-weiss.svg"),
    svgDatei(platte.b, platte.h, "Gravurprobe auf Weiss", `Acrylglas weiss 2 mm; Platte ${platte.b} x ${platte.h} mm; je Kopie eine Gravurebene; erstellt ${datum}`,
      ebenen.join("") +
        ebene("Schnitt_innen", "3 Schnitt innen", `fill="none" stroke="#FF0000" stroke-width="0.1"`, innen.map((r) => pfad([r], false))) +
        ebene("Schnitt_aussen", "4 Schnitt aussen", `fill="none" stroke="#0000FF" stroke-width="0.1"`, [pfad([aussen], false)])),
  );
  const komma = (n: number, stellen = 2) => n.toFixed(stellen).replace(".", ",");
  fs.writeFileSync(
    path.join(ordner, "uebersicht.txt"),
    [
      `Gravurprobe auf Weiss – erstellt ${datum}`,
      ``,
      `Platte ${platte.b} x ${platte.h} mm, Acrylglas weiss 2 mm. Viermal dasselbe Netz, ${FELD.b} x ${FELD.h} mm aus der Karte`,
      `Goerzallee, A5, 3 km, "Schwarz auf Weiss", Stufe "wenig" – der Ausschnitt mit dem meisten Gravurweg.`,
      ``,
      `Jede Kopie hat eine eigene Ebene und Farbe; die Beschriftung darueber ist ausgeschnitten:`,
      ...VARIANTEN.map((v) => `  ${v.text.padEnd(14)} ${v.farbe}  ${v.hinweis}`),
      `Liniengravur: durchgehende Haarlinien, der Laser faehrt jeden Weg einmal ab – ${komma(wegMm / 1000)} m je Kopie.`,
      `Flaechengravur: ${komma(flaecheMm2 / 100, 1)} cm² werden zeilenweise gerastert.`,
      `Reihenfolge: die vier Gravuren, dann die Beschriftung (3 Schnitt innen), zuletzt die Platte (4 Schnitt aussen).`,
      ``,
      `Ergebnis: gut sichtbar ab Defocus ___, Linienbreite etwa ___ mm; im Vergleich zur Flaechengravur: ___`,
      ``,
    ].join("\n"),
  );
  console.log(`${ordner}: ${platte.b} x ${platte.h} mm, Linie ${komma(wegMm / 1000)} m je Kopie`);
}

main();
