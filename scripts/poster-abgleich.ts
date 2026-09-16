// Leitet Schriftgroessen, Sperrung und Lage aus dem vermessenen A4-Poster ab.
// Messwerte: "Familienposter/8 Zuhause Map/Musterdaten/A4/a4_zuhause-map_01.jpg"
// (300 dpi) und "a4_zuhause-map.jpg" (600 dpi, 3 mm Anschnitt), beide auf
// 0,05 mm gleich. Kanten bei halber Deckung, Koordinaten ab Beschnitt oben links.
// Aufruf: npx tsx scripts/poster-abgleich.ts
import type { Punkt } from "../src/engine/clip";
import { setzeZeile } from "../src/engine/schrift";

const SEITE_H = 297;

const POSTER = {
  kartenEnde: 202.02,
  titel: { text: "Zuhause", x0: 47.9, x1: 162.5, y0: 213.37, y1: 255.15 },
  namen: { text: "FAMILIE HOFFMANN", breite: 65.96, oben: 261.88, grundlinie: 267.3 },
  // ‘ und “: InDesign setzt typografische Zeichen, mit geraden stimmt die Breite nicht.
  ort: { text: "BERLIN 52°30‘59“N 13°20‘15“O", breite: 100.45, oben: 271.59, grundlinie: 277.01 },
};

function box(ringe: Punkt[][]) {
  const p = ringe.flat();
  const xs = p.map((q) => q.x);
  const ys = p.map((q) => q.y);
  return { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) };
}

const setze = (text: string, schrift: string, versal: number, sperrung: number) =>
  box(setzeZeile({ text, schrift, versalhoeheMm: versal, sperrungEm: sperrung, mitteX: 0, mitteY: 0, maxBreiteMm: 1e6 }).ringe);

// Stimmt die Versalhoehe aus OS/2 mit der gezeichneten Hoehe eines H ueberein?
for (const schrift of ["AvantGarde-ExtraLight.otf", "AvantGarde-Book.otf"]) {
  const h = setze("H", schrift, 10, 0);
  console.log(`${schrift}: H bei 10 mm Versalhoehe ist ${(h.y1 - h.y0).toFixed(3)} mm hoch`);
}

// Zeilen: Versalhoehe direkt gemessen, Sperrung ueber die Breite von "FAMILIE HOFFMANN".
const versal = POSTER.namen.grundlinie - POSTER.namen.oben;
const breiteBei = (schrift: string, text: string, s: number) => {
  const b = setze(text, schrift, versal, s);
  return b.x1 - b.x0;
};
for (const schrift of ["AvantGarde-ExtraLight.otf", "AvantGarde-Book.otf"]) {
  let lo = -0.1;
  let hi = 0.6;
  for (let i = 0; i < 40; i++) {
    const mitte = (lo + hi) / 2;
    if (breiteBei(schrift, POSTER.namen.text, mitte) < POSTER.namen.breite) lo = mitte;
    else hi = mitte;
  }
  const s = (lo + hi) / 2;
  console.log(
    `${schrift}: Sperrung fuer ${POSTER.namen.breite} mm Namenbreite = ${s.toFixed(4)} em; ` +
      `Ortszeile damit ${breiteBei(schrift, POSTER.ort.text, s).toFixed(2)} mm (Poster ${POSTER.ort.breite}); ` +
      `bei 0,14 em: Namen ${breiteBei(schrift, POSTER.namen.text, 0.14).toFixed(2)}, Ort ${breiteBei(schrift, POSTER.ort.text, 0.14).toFixed(2)} mm`,
  );
}
console.log(
  `Zeilen: Versalhoehe ${versal.toFixed(2)} mm = ${((versal / SEITE_H) * 100).toFixed(3)} %, ` +
    `Mitte Namen ${(((POSTER.namen.oben + POSTER.namen.grundlinie) / 2 / SEITE_H) * 100).toFixed(3)} %, ` +
    `Mitte Ort ${(((POSTER.ort.oben + POSTER.ort.grundlinie) / 2 / SEITE_H) * 100).toFixed(3)} %`,
);

// Titel: Schreibschrift, also ueber die Tintenbox. Bei Versalhoehe v und Mitte 0
// liegt die Box linear in v – eine Probe reicht fuer Groesse und Lage.
const probe = 20;
const t = setze(POSTER.titel.text, "Bacalisties.ttf", probe, 0);
const ausHoehe = (probe * (POSTER.titel.y1 - POSTER.titel.y0)) / (t.y1 - t.y0);
const ausBreite = (probe * (POSTER.titel.x1 - POSTER.titel.x0)) / (t.x1 - t.x0);
const mitteTitel = POSTER.titel.y0 - (t.y0 * ausHoehe) / probe;
console.log(
  `Titel: Versalhoehe aus Hoehe ${ausHoehe.toFixed(2)} mm (${((ausHoehe / SEITE_H) * 100).toFixed(3)} %), ` +
    `aus Breite ${ausBreite.toFixed(2)} mm (${((ausBreite / SEITE_H) * 100).toFixed(3)} %); ` +
    `Versalmitte ${mitteTitel.toFixed(2)} mm (${((mitteTitel / SEITE_H) * 100).toFixed(3)} %)`,
);
console.log(`Kartenende ${((POSTER.kartenEnde / SEITE_H) * 100).toFixed(3)} %`);
