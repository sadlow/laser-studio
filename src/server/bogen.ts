import fs from "node:fs";
import path from "node:path";
import { rendereSchichtkarte } from "@/engine";
import { bogenSvg, f, gravurBeschreibung } from "@/engine/produktion";
import { standardSchichtkarte } from "@/engine/standard";
import type { GeoPunkt, Kundeneingabe, Schichtkarte } from "@/engine/typen";
import { EXPORT_ORDNER } from "./export";
import { slug, type Vorlage } from "./vorlagen";

/**
 * Prototyp-Platten: mehrere Testexemplare auf einer Rohplatte, je Material
 * eine Laserdatei.
 *
 * Zwei echte A5 passen nicht sauber auf A4 – 2 x 148 mm brauchen 296 von
 * 297 mm, und die 210 mm Hoehe laegen exakt auf der Plattenkante, wo der Laser
 * halb in der Luft schneidet. Mit 2,5 mm Rand und 2 mm Abstand werden es
 * 145 x 205 mm: das A-Seitenverhaeltnis bei 98 % von A5.
 */
export const PLATTEN = {
  "a4-zwei": { titel: "A4 → 2 Prototypen 145 × 205", platte: { breiteMm: 297, hoeheMm: 210 }, stueck: { breiteMm: 145, hoeheMm: 205 }, orte: [{ dx: 2.5, dy: 2.5 }, { dx: 149.5, dy: 2.5 }] },
  "quadrat-eins": { titel: "30 × 30 → 1 Prototyp 296 × 296", platte: { breiteMm: 300, hoeheMm: 300 }, stueck: { breiteMm: 296, hoeheMm: 296 }, orte: [{ dx: 2, dy: 2 }] },
} as const;

export type PlattenKey = keyof typeof PLATTEN;
export type Variation = "keine" | "ausschnittKm" | "stegMm";

export interface BogenAuftrag {
  platte: PlattenKey;
  vorlage: Vorlage;
  variation: Variation;
  /** Ein Wert je Platz auf der Platte. */
  werte: number[];
  kunde: Kundeneingabe;
  lon: number;
  lat: number;
  kartenMitte?: GeoPunkt;
}

export async function erzeugeBogen(a: BogenAuftrag, token: string) {
  const p = PLATTEN[a.platte];
  const jetzt = new Date();
  const datum = jetzt.toISOString().slice(0, 16).replace("T", " ");
  const stempel = jetzt.toISOString().slice(0, 16).replace(/[-:]/g, "").replace("T", "-");
  const ordner = path.join(EXPORT_ORDNER, `${stempel}_prototyp_${a.vorlage.id}`);
  fs.mkdirSync(ordner, { recursive: true });

  // Jeder Platz: dieselbe Vorlage, auf das Prototypmass gebracht, ein Parameter variiert.
  const plaetze: {
    r: Awaited<ReturnType<typeof rendereSchichtkarte>>;
    kennung: string;
    ort: { dx: number; dy: number };
  }[] = [];
  for (let i = 0; i < p.orte.length; i++) {
    const karte: Schichtkarte = {
      ...a.vorlage.karte,
      format: "frei",
      breiteMm: p.stueck.breiteMm,
      hoeheMm: p.stueck.hoeheMm,
      kunde: a.kunde,
      lon: a.lon,
      lat: a.lat,
      kartenMitte: a.kartenMitte,
    };
    const wert = a.werte[i];
    if (a.variation === "ausschnittKm" && wert > 0) karte.ausschnittKm = wert;
    if (a.variation === "stegMm" && wert > 0) karte.stegMm = wert;
    const r = await rendereSchichtkarte(karte, token);
    const kennung = a.variation === "keine" ? `platz ${i + 1}` : `${a.variation === "ausschnittKm" ? "Ausschnitt" : "Steg"} ${wert}`;
    fs.writeFileSync(path.join(ordner, `vorschau-platz-${i + 1}.svg`), r.vorschauSvg);
    fs.writeFileSync(path.join(ordner, `parameter-platz-${i + 1}.json`), JSON.stringify(karte, null, 2) + "\n");
    plaetze.push({ r, kennung, ort: p.orte[i] });
  }

  // Je Lage eine Datei; die Stuecke aller Plaetze liegen nebeneinander darauf.
  const dateien: { datei: string; material: string; lage: string }[] = [];
  // Aeltere Entwuerfe ("aktuell" aus dem Browser) kennen die Einstellung noch nicht.
  const gravurExport = a.vorlage.karte.gravurExport ?? standardSchichtkarte().gravurExport;
  plaetze[0].r.lagen.forEach((lage, index) => {
    const datei = `${String(index + 1).padStart(2, "0")}-${slug(lage.titel)}.svg`;
    const stuecke = plaetze.map((pl) => ({ lage: pl.r.lagen[index], dx: pl.ort.dx, dy: pl.ort.dy }));
    fs.writeFileSync(
      path.join(ordner, datei),
      bogenSvg(p.platte, stuecke, {
        titel: `Prototyp ${a.vorlage.name} – ${lage.titel}`,
        beschreibung: `Rohplatte ${lage.material} ${f(p.platte.breiteMm)} x ${f(p.platte.hoeheMm)} mm; ` +
          `Plaetze: ${plaetze.map((pl) => pl.kennung).join(", ")}; erstellt ${datum}`,
      }, gravurExport),
    );
    dateien.push({ datei, material: lage.material, lage: lage.titel });
  });

  const uebersicht = [
    `Prototyp-Platten – ${a.vorlage.name}`,
    `erstellt ${datum}`,
    ``,
    `Rohplatte: ${p.titel}`,
    `Plaetze (von links): ${plaetze.map((pl) => pl.kennung).join(" | ")}`,
    ``,
    `Dateien, eine Rohplatte je Datei:`,
    ...dateien.map((d) => `  ${d.datei.padEnd(26)} ${d.material}`),
    ``,
    `Jede Datei: Ebene "1 Gravur" (${gravurBeschreibung(gravurExport)}), "2 Schnitt innen" (rot), "3 Schnitt aussen" (blau).`,
    ...plaetze.flatMap((pl, i) => (pl.r.warnungen.length ? [``, `Hinweise Platz ${i + 1}:`, ...pl.r.warnungen.map((w) => `  - ${w}`)] : [])),
  ];
  fs.writeFileSync(path.join(ordner, "uebersicht.txt"), uebersicht.join("\n") + "\n");

  return { ordner, dateien, plaetze: plaetze.map((pl) => ({ kennung: pl.kennung, warnungen: pl.r.warnungen })) };
}
