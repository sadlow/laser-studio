import type { Pfad } from "./tiles";
import { EBENEN_TITEL, FARBE, IST_LINIEN_EBENE, type EbenenEinstellung, type KartenEntwurf, type Layout, type Rolle } from "./typen";

/**
 * Baut die SVG. Zwei Dinge sind hier Absicht:
 *
 * 1. **Einheit ist Millimeter.** width/height tragen "mm", die viewBox zaehlt
 *    dieselben Zahlen. Damit kommt die Datei in jeder Lasersoftware in der
 *    richtigen Groesse an, ohne dass jemand skaliert.
 *
 * 2. **Die Rolle steht in der Datei, nicht im Kopf des Operators.** Schnitt und
 *    Gravur sind eigene Gruppen mit fester Farbe. Heute traegt der
 *    Illustrator-Export alles als Haarlinie aus und die Zuordnung passiert von
 *    Hand im xTool Studio – genau die Handarbeit, die hier entfallen soll.
 */
export function baueSvg(opts: {
  entwurf: KartenEntwurf;
  layout: Layout;
  pfade: Record<string, Pfad[]>;
}): string {
  const { entwurf, layout, pfade } = opts;
  const { platte } = layout;

  const gruppen: Record<Exclude<Rolle, "aus">, string[]> = { schnitt: [], gravur: [] };

  // Plattenumriss zuerst – er ist der aeussere Schnitt.
  if (entwurf.plattenschnitt) {
    gruppen.schnitt.push(
      `<rect id="plattenumriss" x="0" y="0" width="${f(platte.breiteMm)}" height="${f(platte.hoeheMm)}" ` +
        `fill="none" stroke="${FARBE.schnitt}" stroke-width="0.1"/>`,
    );
  }

  // Ebenen in fester Reihenfolge: Flaechen nach hinten, Linien nach vorn.
  const reihenfolge: EbenenEinstellung[] = [...entwurf.ebenen].sort(
    (a, b) => zeichenrang(a) - zeichenrang(b),
  );

  for (const ebene of reihenfolge) {
    if (ebene.rolle === "aus") continue;
    const liste = pfade[ebene.key] ?? [];
    if (liste.length === 0) continue;

    const farbe = FARBE[ebene.rolle];
    const istLinie = IST_LINIEN_EBENE[ebene.key];
    const strich = ebene.strichMm && ebene.strichMm > 0 ? ebene.strichMm : 0.4;

    // Flaechen werden bei Gravur gefuellt (Flaechengravur), beim Schnitt nur
    // umrandet – eine gefuellte Flaeche laesst sich nicht schneiden.
    const stil = istLinie
      ? `fill="none" stroke="${farbe}" stroke-width="${f(strich)}" stroke-linecap="round" stroke-linejoin="round"`
      : ebene.rolle === "gravur"
        ? `fill="${grauwert(ebene.dichte)}" stroke="none"`
        : `fill="none" stroke="${farbe}" stroke-width="0.1"`;

    const inhalt = liste.map((p) => `<path d="${p.d}"/>`).join("");
    gruppen[ebene.rolle].push(
      `<g id="${ebene.key}" data-titel="${EBENEN_TITEL[ebene.key]}" ${stil}>${inhalt}</g>`,
    );
  }

  // Texte. Noch als echte <text>-Elemente, nicht als Pfade – fuer den Entwurf
  // des Layouts reicht das, fuer die Produktion nicht (siehe Warnung in index).
  entwurf.texte.forEach((t, i) => {
    if (t.rolle === "aus" || !t.text.trim()) return;
    const zone = layout.textzeilen[i];
    if (!zone) return;
    const x =
      t.ausrichtung === "links"
        ? zone.xMm
        : t.ausrichtung === "rechts"
          ? zone.xMm + zone.breiteMm
          : zone.xMm + zone.breiteMm / 2;
    const anchor = t.ausrichtung === "links" ? "start" : t.ausrichtung === "rechts" ? "end" : "middle";
    // Grundlinie in der Zeilenmitte, um die halbe Versalhoehe nach unten.
    const y = zone.yMm + zone.hoeheMm / 2 + t.groesseMm * 0.35;
    gruppen[t.rolle].push(
      `<text x="${f(x)}" y="${f(y)}" font-family="Helvetica, Arial, sans-serif" ` +
        `font-size="${f(t.groesseMm)}" text-anchor="${anchor}" fill="${FARBE[t.rolle]}">${escape(t.text)}</text>`,
    );
  });

  const teile: string[] = [];
  if (gruppen.gravur.length) teile.push(`<g id="gravur">${gruppen.gravur.join("")}</g>`);
  if (gruppen.schnitt.length) teile.push(`<g id="schnitt">${gruppen.schnitt.join("")}</g>`);

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" version="1.1" ` +
    `width="${f(platte.breiteMm)}mm" height="${f(platte.hoeheMm)}mm" ` +
    `viewBox="0 0 ${f(platte.breiteMm)} ${f(platte.hoeheMm)}">` +
    `<title>Lasercut-Karte ${f(platte.breiteMm)} x ${f(platte.hoeheMm)} mm</title>` +
    teile.join("") +
    `</svg>`
  );
}

/**
 * Gravurdichte -> Grauwert. 1.0 ist volle Leistung (Schwarz), 0.3 ein heller
 * Anriss. Die Lasersoftware liest den Wert als Leistung, die Vorschau zeigt
 * dadurch dasselbe, was das Holz spaeter hergibt.
 */
function grauwert(dichte: number | undefined): string {
  const d = Math.min(1, Math.max(0.05, dichte ?? 1));
  const stufe = Math.round(255 * (1 - d));
  const hex = stufe.toString(16).padStart(2, "0");
  return `#${hex}${hex}${hex}`;
}

/** Flaechen liegen hinten, Linien vorn – sonst verdeckt der Wald die Strassen. */
function zeichenrang(e: EbenenEinstellung): number {
  const rang: Record<string, number> = { green: 0, water: 1, buildings: 2, streets: 3, roads: 4 };
  return rang[e.key] ?? 9;
}

function f(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(2);
}

function escape(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
