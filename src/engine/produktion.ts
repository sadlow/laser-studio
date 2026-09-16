import type { Punkt } from "./clip";
import { gravurFuerExport } from "./gravur-export";
import type { GravurExport, Lage, Layout } from "./typen";

/**
 * Laserdatei fuer die Fertigung – eine Rohplatte je Datei, darauf ein oder
 * mehrere Stuecke derselben Lage.
 *
 * Drei benannte Ebenen in Bearbeitungsreihenfolge:
 *   1 Gravur         schwarz: gefuellte Flaechen oder Linien (gravurExport)
 *   2 Schnitt innen  rot, alle Loecher und Teile innerhalb eines Stuecks
 *   3 Schnitt aussen blau, nur die Umrisse der Stuecke – zuletzt, sonst
 *                    verschiebt sich ein Stueck, bevor die Innenschnitte fertig sind
 *
 * Namen stehen als id, data-name (Illustrator) und inkscape:label (Inkscape);
 * die Farben entsprechen der LightBurn-Palette (00 schwarz, 01 blau, 02 rot),
 * damit Programme, die nach Farbe sortieren, dieselben drei Gaenge sehen.
 *
 * Als Flaeche ist die Gravur gepuffert, keine Linie mit Strichbreite: die Breite
 * einer SVG-Linie uebernimmt Lasersoftware nicht zuverlaessig, sie faehrt nur die
 * Mittellinie in Strahlbreite ab. Genau das ist bei "mittellinie" gewollt – die
 * Breite kommt dann vom Strahl. In der Live-Vorschau bleibt es beim Strich.
 */
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

export function bogenSvg(platte: Rohplatte, stuecke: Stueck[], info: Dateiinfo, gravurExport: GravurExport): string {
  const flaechen: Punkt[][][] = [];
  const linien: string[] = [];
  const innen: Punkt[][] = [];
  const aussen: Punkt[][] = [];

  for (const { lage, dx, dy } of stuecke) {
    const schiebe = (r: Punkt[]) => r.map((p) => ({ x: p.x + dx, y: p.y + dy }));
    const gravur = gravurFuerExport(lage, gravurExport);
    for (const t of gravur.flaechen) flaechen.push([t.aussen, ...t.loecher].map(schiebe));
    for (const p of gravur.pfade) linien.push(linie(schiebe(p.punkte), p.geschlossen, p.breiteMm));
    // Umriss des groessten Teils zuletzt; alles andere liegt innerhalb.
    const [haupt, ...rest] = lage.teile;
    if (haupt) {
      aussen.push(schiebe(haupt.aussen));
      innen.push(...haupt.loecher.map(schiebe));
    }
    for (const t of rest) innen.push(schiebe(t.aussen), ...t.loecher.map(schiebe));
  }

  const { breiteMm: b, hoeheMm: h } = platte;
  const gravurEbene =
    gravurExport.art === "flaeche"
      ? ebene("Gravur", "1 Gravur", `fill="#000000" stroke="none"`, flaechen.map((ringe) => pfad(ringe, true)))
      : ebene("Gravur", "1 Gravur", `fill="none" stroke="#000000" stroke-linecap="round" stroke-linejoin="round"`, linien);
  return (
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<svg xmlns="http://www.w3.org/2000/svg" xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape" ` +
    `version="1.1" width="${f(b)}mm" height="${f(h)}mm" viewBox="0 0 ${f(b)} ${f(h)}">\n` +
    `<title>${esc(info.titel)}</title>\n<desc>${esc(`${info.beschreibung}; Gravur: ${gravurBeschreibung(gravurExport)}`)}</desc>\n` +
    gravurEbene +
    ebene("Schnitt_innen", "2 Schnitt innen", `fill="none" stroke="#FF0000" stroke-width="0.1"`, innen.map((r) => pfad([r], false))) +
    ebene("Schnitt_aussen", "3 Schnitt aussen", `fill="none" stroke="#0000FF" stroke-width="0.1"`, aussen.map((r) => pfad([r], false))) +
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
      `Reihenfolge: Gravur, Schnitt innen, Schnitt aussen; erstellt ${meta.datum}`,
  }, meta.gravurExport);
}

export function gravurBeschreibung(e: GravurExport): string {
  if (e.art === "flaeche") return "Flaeche, gefuellt";
  if (e.art === "mittellinie") return "Mittellinie, Breite ueber Fokus/Defokus";
  return `Kontur, eng anliegende Linien, Strahl ${f(e.strahlMm)} mm`;
}

function ebene(id: string, name: string, stil: string, pfade: string[]): string {
  if (!pfade.length) return "";
  return `<g id="${id}" data-name="${name}" inkscape:groupmode="layer" inkscape:label="${name}" ${stil}>\n${pfade.join("\n")}\n</g>\n`;
}

/** Jeder Schnittring ein eigener geschlossener Pfad – das nehmen alle Programme ohne Rueckfrage. */
function pfad(ringe: Punkt[][], evenodd: boolean): string {
  const d = ringe
    .filter((r) => r.length >= 3)
    .map((r) => `M${r.map((p) => `${f(p.x)},${f(p.y)}`).join("L")}Z`)
    .join("");
  return `<path d="${d}"${evenodd ? ` fill-rule="evenodd"` : ""}/>`;
}

/** Gravur als Linie: offen fuer Wege, geschlossen fuer Umrisse. */
function linie(punkte: Punkt[], geschlossen: boolean, breiteMm: number): string {
  return `<path d="M${punkte.map((p) => `${f(p.x)},${f(p.y)}`).join("L")}${geschlossen ? "Z" : ""}" stroke-width="${f(breiteMm)}"/>`;
}

export function f(n: number): string {
  return (Math.round(n * 1000) / 1000).toString();
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
