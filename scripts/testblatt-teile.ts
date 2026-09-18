// Bausteine fuer Probe- und Testblaetter: Kartenausschnitt mit Gravur, ausgeschnittene Schrift, Laserdatei.
import fs from "node:fs";
import path from "node:path";
import { rendereSchichtkarte, standardSchichtkarte, type Lage, type Schichtkarte } from "../src/engine";
import type { Punkt } from "../src/engine/clip";
import { rechteck, teile, vereinige, ziehAb, ziehLinienAb, zuFlaeche, type Flaeche } from "../src/engine/geometrie";
import { standardLayoutWerte } from "../src/engine/poster-masse";
import { f } from "../src/engine/produktion";
import { setzeSchnittText } from "../src/engine/schnitt-text";

const laenge = (l: Punkt[]) => l.reduce((s, p, i) => (i ? s + Math.hypot(p.x - l[i - 1].x, p.y - l[i - 1].y) : s), 0);

/** Marcels Testkarte (Goerzallee, A5, 3 km) als "Schwarz auf Weiss" mit Stufe "wenig": dort wird am meisten auf Weiss graviert. */
export async function testkarte(): Promise<{ k: Schichtkarte; grund: Lage; fenster: { xMm: number; yMm: number; breiteMm: number; hoeheMm: number } }> {
  const token = fs.readFileSync(".env.local", "utf8").match(/MAPBOX_ACCESS_TOKEN=(.*)/)?.[1]?.trim() ?? "";
  const basis = standardSchichtkarte();
  const w = standardLayoutWerte("a5");
  const k: Schichtkarte = {
    ...basis, ...w, format: "a5", ausschnittKm: 3, lon: 13.28022, lat: 52.4154, aufbau: "netz-schwarz-dreilagig",
    titelStil: { ...basis.titelStil, hoeheAnteil: w.titelStil.hoeheAnteil },
    zeilenStil: { ...basis.zeilenStil, hoeheAnteil: w.zeilenStil.hoeheAnteil },
    kunde: { ...basis.kunde, adresse: "Goerzallee 256, 14167 Berlin", strassenStufe: "wenig" },
  };
  const r = await rendereSchichtkarte(k, token);
  return { k, grund: r.lagen.find((l) => l.key === "hintergrund")!, fenster: r.layout.kartenfenster };
}

/** Der Ausschnitt b x h mit dem laengsten Gravurweg im Kartenfenster. */
export function dichtesterAusschnitt(grund: Lage, fenster: { xMm: number; yMm: number; breiteMm: number; hoeheMm: number }, b: number, h: number) {
  let bester = { x: fenster.xMm, y: fenster.yMm, weg: -1 };
  for (let x = fenster.xMm; x + b <= fenster.xMm + fenster.breiteMm; x += 4) {
    for (let y = fenster.yMm; y + h <= fenster.yMm + fenster.hoeheMm; y += 4) {
      const feld = rechteck(x, y, b, h);
      const weg = grund.gravur.reduce((s, g) => s + ziehLinienAb(g.linien, feld, true).reduce((a, l) => a + laenge(l), 0), 0);
      if (weg > bester.weg) bester = { x, y, weg };
    }
  }
  return bester;
}

/** Der Ausschnitt als eigene Lage an (ox, oy) – Material ist genau das Feld. */
export function kopie(grund: Lage, ausschnitt: { x: number; y: number }, ox: number, oy: number, b: number, h: number): Lage {
  const feld = rechteck(ausschnitt.x, ausschnitt.y, b, h);
  const schiebe = (l: Punkt[]) => l.map((p) => ({ x: p.x - ausschnitt.x + ox, y: p.y - ausschnitt.y + oy }));
  return {
    ...grund,
    teile: teile(rechteck(ox, oy, b, h)),
    gravur: grund.gravur.map((g) => ({ linien: ziehLinienAb(g.linien, feld, true).map(schiebe), breiteMm: g.breiteMm })),
    klebeflaeche: [],
  };
}

/**
 * Ausgeschnittene Schrift wie im Produkt (schnitt-text.ts): verstaerkt bis `minStrichMm`, Innenflaechen an Stegen
 * von `stegMm`, so viel Material auch zwischen den Buchstaben. `schreib` fuer die Schreibschrift des Titels.
 */
export function schnittText(o: { text: string; schrift: string; versalMm: number; sperrung: number; mitteX: number; mitteY: number; minStrichMm: number; stegMm: number; schreib?: boolean }): Flaeche {
  // Druckschrift in Versalien wie die Zeilen im Produkt – gemischt gesetzt wurden bei 3,6 mm e und o zu Klecksen.
  const satz = { text: o.schreib ? o.text : o.text.toLocaleUpperCase("de-DE"), schrift: o.schrift, versalhoeheMm: o.versalMm, sperrungEm: o.sperrung, mitteX: o.mitteX, mitteY: o.mitteY, maxBreiteMm: 500 };
  return setzeSchnittText(satz, o.schreib ? "schreib" : "druck", { minStrichMm: o.minStrichMm, stegMm: o.stegMm, materialMm: o.stegMm, offenUnterMm: 0.8 }).schnitt;
}

/** Platte minus Ausschnitte: Innenschnitte (Loecher, sonstige Teile) und der Umriss zuletzt. */
export function schnitte(breiteMm: number, hoeheMm: number, ausschnitte: Flaeche[]): { innen: Punkt[][]; aussen: Punkt[] } {
  const [haupt, ...rest] = teile(ziehAb(rechteck(0, 0, breiteMm, hoeheMm), vereinige(...ausschnitte)), 0.01);
  return { innen: [...haupt.loecher, ...rest.flatMap((t) => [t.aussen, ...t.loecher])], aussen: haupt.aussen };
}

export function svgDatei(breiteMm: number, hoeheMm: number, titel: string, beschreibung: string, ebenen: string): string {
  return (
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<svg xmlns="http://www.w3.org/2000/svg" xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape" version="1.1" ` +
    `width="${f(breiteMm)}mm" height="${f(hoeheMm)}mm" viewBox="0 0 ${f(breiteMm)} ${f(hoeheMm)}">\n` +
    `<title>${titel}</title>\n<desc>${beschreibung}</desc>\n${ebenen}</svg>\n`
  );
}

/** export/<zeit>_<name>/ in Ortszeit, dazu Datum fuer die Dateien. */
export function exportOrdner(name: string): { ordner: string; datum: string } {
  const jetzt = new Date(Date.now() - new Date().getTimezoneOffset() * 60000);
  const ordner = path.join("export", `${jetzt.toISOString().slice(0, 16).replace(/[-:]/g, "").replace("T", "-")}_${name}`);
  fs.mkdirSync(ordner, { recursive: true });
  return { ordner, datum: jetzt.toISOString().slice(0, 16).replace("T", " ") };
}
