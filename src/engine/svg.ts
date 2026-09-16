import type { Punkt } from "./clip";
import type { Lagengeometrie } from "./lagen";
import type { Layout, Teil } from "./typen";

const f = (n: number) => (Math.round(n * 100) / 100).toString();

function ringD(ring: Punkt[]): string {
  if (ring.length < 2) return "";
  let d = `M${f(ring[0].x)},${f(ring[0].y)}`;
  for (let i = 1; i < ring.length; i++) d += `L${f(ring[i].x)},${f(ring[i].y)}`;
  return d + "Z";
}

function linieD(linie: Punkt[]): string {
  if (linie.length < 2) return "";
  let d = `M${f(linie[0].x)},${f(linie[0].y)}`;
  for (let i = 1; i < linie.length; i++) d += `L${f(linie[i].x)},${f(linie[i].y)}`;
  return d;
}

/** Ein Teil samt Loechern als ein Pfad – mit evenodd bleiben die Loecher frei. */
export function teileD(t: Teil[]): string {
  return t.map((teil) => ringD(teil.aussen) + teil.loecher.map(ringD).join("")).join("");
}

function kopf(breite: number, hoehe: number, titel: string): string {
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" version="1.1" width="${f(breite)}mm" height="${f(hoehe)}mm" ` +
    `viewBox="0 0 ${f(breite)} ${f(hoehe)}"><title>${titel}</title>`
  );
}

/**
 * So sieht die Karte zusammengesetzt aus. Von unten nach oben gemalt, jede
 * Lage mit einem leichten Schatten – sonst sieht man die Stufen nicht, und die
 * sind der Witz des Produkts.
 */
export function vorschauSvg(layout: Layout, g: Lagengeometrie, loseMarkieren: boolean): string {
  const { breiteMm: b, hoeheMm: h } = layout.platte;
  const [hauptteil, ...lose] = g.weiss;

  const gravur = g.gravur
    .map((gr) => `<path d="${gr.linien.map(linieD).join("")}" stroke-width="${f(gr.breiteMm)}"/>`)
    .join("");

  return (
    kopf(b, h, "Schichtkarte – Vorschau") +
    `<defs>` +
    `<linearGradient id="blau" x1="0" y1="0" x2="1" y2="1">` +
    `<stop offset="0" stop-color="#1b4b82"/><stop offset=".45" stop-color="#7fb4e3"/>` +
    `<stop offset=".55" stop-color="#5d97cf"/><stop offset="1" stop-color="#173f70"/></linearGradient>` +
    `<linearGradient id="rot" x1="0" y1="0" x2="1" y2="1">` +
    `<stop offset="0" stop-color="#7d0c12"/><stop offset=".45" stop-color="#f0525a"/>` +
    `<stop offset="1" stop-color="#8f1016"/></linearGradient>` +
    `<filter id="schatten" x="-5%" y="-5%" width="110%" height="110%">` +
    `<feDropShadow dx="0.25" dy="0.35" stdDeviation="0.3" flood-color="#000" flood-opacity="0.55"/></filter>` +
    `</defs>` +
    `<rect width="${f(b)}" height="${f(h)}" fill="url(#blau)"/>` +
    `<path d="${teileD(g.schwarz)}" fill="#151515" fill-rule="evenodd" filter="url(#schatten)"/>` +
    `<g fill="none" stroke="#b9b6ae" stroke-linecap="round" stroke-linejoin="round">${gravur}</g>` +
    (hauptteil
      ? `<path d="${teileD([hauptteil])}" fill="#f6f5f1" fill-rule="evenodd" filter="url(#schatten)"/>`
      : "") +
    (lose.length
      ? `<path d="${teileD(lose)}" fill="${loseMarkieren ? "#ff8a1f" : "#f6f5f1"}" fill-rule="evenodd"/>`
      : "") +
    `<path d="${teileD(g.herz)}" fill="url(#rot)" filter="url(#schatten)"/>` +
    `</svg>`
  );
}

/**
 * Datei fuer den Laser: Schnitt rot, Gravur schwarz, Einheit mm, keine Fuellung.
 * Genau eine Platte je Datei – jede Lage ist ein eigenes Material.
 */
export function laserSvg(
  layout: Layout,
  titel: string,
  schnitt: Teil[],
  gravur: { linien: Punkt[][]; breiteMm: number }[] = [],
): string {
  const { breiteMm: b, hoeheMm: h } = layout.platte;
  const gravurTeil = gravur.length
    ? `<g id="gravur" fill="none" stroke="#000000" stroke-linecap="round" stroke-linejoin="round">` +
      gravur.map((gr) => `<path d="${gr.linien.map(linieD).join("")}" stroke-width="${f(gr.breiteMm)}"/>`).join("") +
      `</g>`
    : "";
  return (
    kopf(b, h, titel) +
    gravurTeil +
    `<g id="schnitt" fill="none" stroke="#ff0000" stroke-width="0.1"><path d="${teileD(schnitt)}"/></g>` +
    `</svg>`
  );
}
