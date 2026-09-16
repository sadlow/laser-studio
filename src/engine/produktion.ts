import type { Punkt } from "./clip";
import { ausTeilen, puffereLinien, schneide, teile, vereinige } from "./geometrie";
import type { Lage, Layout, Teil } from "./typen";

/**
 * Laserdatei fuer die Fertigung – eine Rohplatte je Datei, darauf ein oder
 * mehrere Stuecke derselben Lage.
 *
 * Drei benannte Ebenen in Bearbeitungsreihenfolge:
 *   1 Gravur         Flaechen, schwarz gefuellt
 *   2 Schnitt innen  rot, alle Loecher und Teile innerhalb eines Stuecks
 *   3 Schnitt aussen blau, nur die Umrisse der Stuecke – zuletzt, sonst
 *                    verschiebt sich ein Stueck, bevor die Innenschnitte fertig sind
 *
 * Namen stehen als id, data-name (Illustrator) und inkscape:label (Inkscape);
 * die Farben entsprechen der LightBurn-Palette (00 schwarz, 01 blau, 02 rot),
 * damit Programme, die nach Farbe sortieren, dieselben drei Gaenge sehen.
 *
 * Gravur ist hier eine gepufferte Flaeche, keine Linie mit Strichbreite: die
 * Breite einer SVG-Linie uebernimmt Lasersoftware nicht zuverlaessig, sie
 * faehrt sonst nur die Mittellinie in Strahlbreite ab. In der Live-Vorschau
 * bleibt es beim Strich – dieselben Linien, nur 1,6 s schneller.
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

export function bogenSvg(platte: Rohplatte, stuecke: Stueck[], info: Dateiinfo): string {
  const gravur: Punkt[][][] = [];
  const innen: Punkt[][] = [];
  const aussen: Punkt[][] = [];

  for (const { lage, dx, dy } of stuecke) {
    const schiebe = (r: Punkt[]) => r.map((p) => ({ x: p.x + dx, y: p.y + dy }));
    for (const t of gravurFlaeche(lage)) gravur.push([t.aussen, ...t.loecher].map(schiebe));
    // Umriss des groessten Teils zuletzt; alles andere liegt innerhalb.
    const [haupt, ...rest] = lage.teile;
    if (haupt) {
      aussen.push(schiebe(haupt.aussen));
      innen.push(...haupt.loecher.map(schiebe));
    }
    for (const t of rest) innen.push(schiebe(t.aussen), ...t.loecher.map(schiebe));
  }

  const { breiteMm: b, hoeheMm: h } = platte;
  return (
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<svg xmlns="http://www.w3.org/2000/svg" xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape" ` +
    `version="1.1" width="${f(b)}mm" height="${f(h)}mm" viewBox="0 0 ${f(b)} ${f(h)}">\n` +
    `<title>${esc(info.titel)}</title>\n<desc>${esc(info.beschreibung)}</desc>\n` +
    ebene("Gravur", "1 Gravur", `fill="#000000" stroke="none"`, gravur.map((ringe) => pfad(ringe, true))) +
    ebene("Schnitt_innen", "2 Schnitt innen", `fill="none" stroke="#FF0000" stroke-width="0.1"`, innen.map((r) => pfad([r], false))) +
    ebene("Schnitt_aussen", "3 Schnitt aussen", `fill="none" stroke="#0000FF" stroke-width="0.1"`, aussen.map((r) => pfad([r], false))) +
    `</svg>\n`
  );
}

/** Eine Lage als eigene Platte – die Rohplatte ist das Produkt selbst. */
export function produktionsSvg(layout: Layout, lage: Lage, meta: { vorlage: string; datum: string; nummer: number }): string {
  const { breiteMm, hoeheMm } = layout.platte;
  return bogenSvg({ breiteMm, hoeheMm }, [{ lage, dx: 0, dy: 0 }], {
    titel: `Schichtkarte – Lage ${meta.nummer} ${lage.titel}`,
    beschreibung:
      `Vorlage: ${meta.vorlage}; Material: ${lage.material}; Platte ${f(breiteMm)} x ${f(hoeheMm)} mm; ` +
      `Reihenfolge: Gravur, Schnitt innen, Schnitt aussen; erstellt ${meta.datum}`,
  });
}

/** Gravurlinien als Flaechen ihrer Breite, beschnitten auf das Material der Lage. */
function gravurFlaeche(lage: Lage): Teil[] {
  if (!lage.gravur.length) return [];
  const gepuffert = vereinige(...lage.gravur.map((g) => puffereLinien(g.linien, g.breiteMm)));
  return teile(schneide(gepuffert, ausTeilen(lage.teile)), 0.01);
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

export function f(n: number): string {
  return (Math.round(n * 1000) / 1000).toString();
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
