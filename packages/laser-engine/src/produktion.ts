import type { Punkt } from "./clip";
import { gravurFuerExport } from "./gravur-export";
import type { GravurExport, Lage, Layout } from "./typen";

/**
 * Laserdatei fuer die Fertigung – eine Rohplatte je Datei, darauf ein oder
 * mehrere Stuecke derselben Lage.
 *
 * Vier benannte Ebenen in Bearbeitungsreihenfolge:
 *   1 Gravur         schwarz: gefuellte Flaechen oder Linien (gravurExport)
 *   2 Klebeflaeche   gruen, immer als Flaeche: unter dem Symbol, angeraut fuer den Kleber
 *                    (Marcel 17.09.2026) – eigene Ebene, damit sie eigene Werte bekommt
 *   3 Schnitt innen  rot, alle Loecher und Teile innerhalb eines Stuecks
 *   4 Schnitt aussen blau, nur die Umrisse der Stuecke – zuletzt, sonst
 *                    verschiebt sich ein Stueck, bevor die Innenschnitte fertig sind
 *
 * Namen stehen als id, data-name (Illustrator) und inkscape:label (Inkscape);
 * die Farben entsprechen der LightBurn-Palette (00 schwarz, 01 blau, 02 rot, 03 gruen),
 * damit Programme, die nach Farbe sortieren, dieselben Gaenge sehen.
 *
 * Als Flaeche ist die Gravur gepuffert, keine Linie mit Strichbreite: die Breite
 * einer SVG-Linie uebernimmt Lasersoftware nicht zuverlaessig, sie faehrt nur die
 * Mittellinie in Strahlbreite ab. Genau das ist bei "mittellinie" gewollt – die
 * Breite kommt dann vom Strahl. Darum stehen Linien als Haarlinie in der Datei: mit
 * der Sollbreite als Strich sah die Gravurprobe aus wie eine Flaechengravur (Marcel
 * 17.09.2026). Jeder Pfad traegt Farbe und Strich selbst – wer Gruppenstile nicht
 * erbt, fuellt offene Linien sonst schwarz. In der Live-Vorschau bleibt es beim Strich.
 */
const HAARLINIE_MM = 0.1;
export interface Stueck {
  lage: Lage;
  /** Versatz des Stuecks auf der Rohplatte in mm. */
  dx: number;
  dy: number;
}

export interface Rohplatte {
  breiteMm: number;
  hoeheMm: number;
}

export interface Dateiinfo {
  titel: string;
  beschreibung: string;
}

/**
 * kantenOffen: die Plattenkanten sind die Kanten des Stuecks (geteilte 60 x 60 auf 60 x 30,5) – dort wird nicht
 * geschnitten, direkt an der Kante schnitte der Laser halb in der Luft. Die Umrisse werden zu offenen Linien.
 */
export function bogenSvg(platte: Rohplatte, stuecke: Stueck[], info: Dateiinfo, gravurExport: GravurExport, kantenOffen = false): string {
  const flaechen: Punkt[][][] = [];
  const klebeflaechen: Punkt[][][] = [];
  const linien: string[] = [];
  const innen: string[] = [];
  const aussen: string[] = [];
  const umriss = (r: Punkt[]) => (kantenOffen ? ohnePlattenkante(r, platte).map((l) => linie(l, false)) : [pfad([r], false)]);

  for (const { lage, dx, dy } of stuecke) {
    const schiebe = (r: Punkt[]) => r.map((p) => ({ x: p.x + dx, y: p.y + dy }));
    const gravur = gravurFuerExport(lage, gravurExport);
    for (const t of gravur.flaechen) flaechen.push([t.aussen, ...t.loecher].map(schiebe));
    for (const p of gravur.pfade) linien.push(linie(schiebe(p.punkte), p.geschlossen));
    for (const t of lage.klebeflaeche) klebeflaechen.push([t.aussen, ...t.loecher].map(schiebe));
    // Umriss des groessten Teils zuletzt; alles andere liegt innerhalb.
    const [haupt, ...rest] = lage.teile;
    if (haupt) {
      aussen.push(...umriss(schiebe(haupt.aussen)));
      innen.push(...haupt.loecher.map((r) => pfad([schiebe(r)], false)));
    }
    for (const t of rest) innen.push(...umriss(schiebe(t.aussen)), ...t.loecher.map((r) => pfad([schiebe(r)], false)));
  }

  const { breiteMm: b, hoeheMm: h } = platte;
  const gravurEbene =
    gravurExport.art === "flaeche"
      ? ebene("Gravur", "1 Gravur", `fill="#000000" stroke="none"`, flaechen.map((ringe) => pfad(ringe, true)))
      : ebene("Gravur", "1 Gravur", linienStil("#000000"), linien);
  return (
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<svg xmlns="http://www.w3.org/2000/svg" xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape" ` +
    `version="1.1" width="${f(b)}mm" height="${f(h)}mm" viewBox="0 0 ${f(b)} ${f(h)}">\n` +
    `<title>${esc(info.titel)}</title>\n<desc>${esc(`${info.beschreibung}; Gravur: ${gravurBeschreibung(gravurExport)}`)}</desc>\n` +
    gravurEbene +
    ebene("Klebeflaeche", "2 Klebeflaeche", `fill="#00E000" stroke="none"`, klebeflaechen.map((ringe) => pfad(ringe, true))) +
    ebene("Schnitt_innen", "3 Schnitt innen", `fill="none" stroke="#FF0000" stroke-width="${HAARLINIE_MM}"`, innen) +
    ebene("Schnitt_aussen", "4 Schnitt aussen", `fill="none" stroke="#0000FF" stroke-width="${HAARLINIE_MM}"`, aussen) +
    `</svg>\n`
  );
}

/** Eine Lage als eigene Platte – die Rohplatte ist das Produkt selbst. */
export function produktionsSvg(layout: Layout, lage: Lage, meta: { vorlage: string; datum: string; nummer: number; gravurExport: GravurExport }): string {
  const { breiteMm, hoeheMm } = layout.platte;
  return bogenSvg({ breiteMm, hoeheMm }, [{ lage, dx: 0, dy: 0 }], {
    titel: `Schichtkarte – Lage ${meta.nummer} ${lage.titel}`,
    beschreibung:
      `Vorlage: ${meta.vorlage}; Material: ${lage.material}; Platte ${f(breiteMm)} x ${f(hoeheMm)} mm; ` +
      `Reihenfolge: Gravur, Klebeflaeche, Schnitt innen, Schnitt aussen; erstellt ${meta.datum}`,
  }, meta.gravurExport);
}

/** Ein Ring ohne die Strecken, die auf der Plattenkante liegen – als offene Linien. */
function ohnePlattenkante(r: Punkt[], p: Rohplatte): Punkt[][] {
  const e = 0.01;
  const kante = (a: Punkt, b: Punkt) =>
    (Math.abs(a.x) < e && Math.abs(b.x) < e) || (Math.abs(a.y) < e && Math.abs(b.y) < e) ||
    (Math.abs(a.x - p.breiteMm) < e && Math.abs(b.x - p.breiteMm) < e) || (Math.abs(a.y - p.hoeheMm) < e && Math.abs(b.y - p.hoeheMm) < e);
  const n = r.length;
  const start = r.findIndex((q, i) => kante(q, r[(i + 1) % n]));
  if (start < 0) return [r.concat([r[0]])];
  // Ab dem Ende einer Kantenstrecke einmal herum sammeln; jede Kantenstrecke beendet eine Linie.
  const linien: Punkt[][] = [];
  let lauf: Punkt[] = [];
  for (let j = 1; j <= n; j++) {
    const a = r[(start + j) % n];
    const b = r[(start + j + 1) % n];
    if (kante(a, b)) {
      if (lauf.length) linien.push([...lauf, a]);
      lauf = [];
    } else {
      if (!lauf.length) lauf.push(a);
      lauf.push(b);
    }
  }
  if (lauf.length) linien.push(lauf);
  return linien.filter((l) => l.length >= 2);
}

export function gravurBeschreibung(e: GravurExport): string {
  if (e.art === "flaeche") return "Flaeche, gefuellt";
  if (e.art === "mittellinie") return "Mittellinie, Breite ueber Fokus/Defokus";
  return `Kontur, eng anliegende Linien, Strahl ${f(e.strahlMm)} mm`;
}

/** Stil einer Linien-Ebene: Haarlinie in der Ebenenfarbe, nie gefuellt. */
export function linienStil(farbe: string): string {
  return `fill="none" stroke="${farbe}" stroke-width="${HAARLINIE_MM}" stroke-linecap="round" stroke-linejoin="round"`;
}

/** Benannte Ebene; der Stil steht an der Gruppe und an jedem Pfad. */
export function ebene(id: string, name: string, stil: string, pfade: string[]): string {
  if (!pfade.length) return "";
  const mitStil = pfade.map((p) => p.replace("<path ", `<path ${stil} `));
  return `<g id="${id}" data-name="${name}" inkscape:groupmode="layer" inkscape:label="${name}" ${stil}>\n${mitStil.join("\n")}\n</g>\n`;
}

/** Jeder Schnittring ein eigener geschlossener Pfad – das nehmen alle Programme ohne Rueckfrage. */
export function pfad(ringe: Punkt[][], evenodd: boolean): string {
  const d = ringe
    .filter((r) => r.length >= 3)
    .map((r) => `M${r.map((p) => `${f(p.x)},${f(p.y)}`).join("L")}Z`)
    .join("");
  return `<path d="${d}"${evenodd ? ` fill-rule="evenodd"` : ""}/>`;
}

/** Gravur als Linie: offen fuer Wege, geschlossen fuer Umrisse. Die Breite kommt vom Strahl, nicht aus der Datei. */
export function linie(punkte: Punkt[], geschlossen: boolean): string {
  return `<path d="M${punkte.map((p) => `${f(p.x)},${f(p.y)}`).join("L")}${geschlossen ? "Z" : ""}"/>`;
}

export function f(n: number): string {
  return (Math.round(n * 1000) / 1000).toString();
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
