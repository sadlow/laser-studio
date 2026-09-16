import type { Punkt } from "./clip";
import { ausTeilen, puffereLinien, schneide, teile, vereinige } from "./geometrie";
import type { Lage, Layout, Teil } from "./typen";

/**
 * Laserdatei fuer die Fertigung – eine Platte je Datei.
 *
 * Drei benannte Ebenen in Bearbeitungsreihenfolge:
 *   1 Gravur        Flaechen, schwarz gefuellt
 *   2 Schnitt innen rot, alle Loecher und Teile innerhalb der Platte
 *   3 Schnitt aussen blau, nur der Umriss – zuletzt, sonst verschiebt sich die
 *                   Platte, bevor die Innenschnitte fertig sind
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
export function produktionsSvg(layout: Layout, lage: Lage, meta: { vorlage: string; datum: string; nummer: number }): string {
  const { breiteMm: b, hoeheMm: h } = layout.platte;
  const gravur = gravurFlaeche(lage);
  const [aussenTeil, ...restliche] = lage.teile;

  // Umriss der groessten Platte zuletzt; alles andere liegt innerhalb.
  const innen: Punkt[][] = [
    ...(aussenTeil ? aussenTeil.loecher : []),
    ...restliche.flatMap((t) => [t.aussen, ...t.loecher]),
  ];
  const aussen: Punkt[][] = aussenTeil ? [aussenTeil.aussen] : [];

  const titel = `Schichtkarte – Lage ${meta.nummer} ${lage.titel}`;
  const beschreibung =
    `Vorlage: ${meta.vorlage}; Material: ${lage.material}; Platte ${f(b)} x ${f(h)} mm; ` +
    `Reihenfolge: Gravur, Schnitt innen, Schnitt aussen; erstellt ${meta.datum}`;

  return (
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<svg xmlns="http://www.w3.org/2000/svg" xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape" ` +
    `version="1.1" width="${f(b)}mm" height="${f(h)}mm" viewBox="0 0 ${f(b)} ${f(h)}">\n` +
    `<title>${esc(titel)}</title>\n<desc>${esc(beschreibung)}</desc>\n` +
    ebene("Gravur", "1 Gravur", `fill="#000000" stroke="none"`, gravur.map((t) => pfad([t.aussen, ...t.loecher], true))) +
    ebene("Schnitt_innen", "2 Schnitt innen", `fill="none" stroke="#FF0000" stroke-width="0.1"`, innen.map((r) => pfad([r], false))) +
    ebene("Schnitt_aussen", "3 Schnitt aussen", `fill="none" stroke="#0000FF" stroke-width="0.1"`, aussen.map((r) => pfad([r], false))) +
    `</svg>\n`
  );
}

/** Gravurlinien als Flaechen ihrer Breite, beschnitten auf das Material der Lage. */
function gravurFlaeche(lage: Lage): Teil[] {
  if (!lage.gravur.length) return [];
  const gepuffert = vereinige(...lage.gravur.map((g) => puffereLinien(g.linien, g.breiteMm)));
  return teile(schneide(gepuffert, ausTeilen(lage.teile)), 0.01);
}

function ebene(id: string, name: string, stil: string, pfade: string[]): string {
  if (!pfade.length) return "";
  return (
    `<g id="${id}" data-name="${name}" inkscape:groupmode="layer" inkscape:label="${name}" ${stil}>\n` +
    pfade.join("\n") +
    `\n</g>\n`
  );
}

/** Jeder Schnittring ein eigener geschlossener Pfad – das nehmen alle Programme ohne Rueckfrage. */
function pfad(ringe: Punkt[][], evenodd: boolean): string {
  const d = ringe
    .filter((r) => r.length >= 3)
    .map((r) => `M${r.map((p) => `${f(p.x)},${f(p.y)}`).join("L")}Z`)
    .join("");
  return `<path d="${d}"${evenodd ? ` fill-rule="evenodd"` : ""}/>`;
}

function f(n: number): string {
  return (Math.round(n * 1000) / 1000).toString();
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
