import { f } from "./produktion";
import { teileLage } from "./teilung-export";
import { rahmenbogen } from "./teilung-rahmen";
import type { LagenKey, Schichtkarte, SchichtkartenErgebnis } from "./typen";
import type { TeilungsErgebnis } from "./typen-teilung";

const ABSTAND_MM = 24;

/**
 * Laseransicht einer geteilten Karte: je Lage die Rohplatten, genau wie sie in den Export gehen – Haelfte A und B
 * gedreht auf 600 x 305, die Deckschicht als Rahmenbogen (Marcel 25.09.2026: "die Teilung wird bei den Laser-Layern
 * gar nicht angewendet"). Untereinander, jede Platte umrandet und beschriftet. Blau und Symbol bleiben, wie sie sind.
 */
export function plattenAnsichten(r: SchichtkartenErgebnis, k: Schichtkarte, t: TeilungsErgebnis): Partial<Record<LagenKey, string>> {
  const raus: Partial<Record<LagenKey, string>> = {};
  const info = (titel: string) => ({ titel, beschreibung: "Ansicht" });
  for (const lage of r.lagen) {
    const teilung = t.lagen.find((l) => l.key === lage.key);
    if (teilung) {
      const haelften = teileLage(lage, r.layout.platte, teilung.gewaehlt, t.rohplatte, k.gravurExport, info(lage.titel));
      raus[lage.key] = bogen(t.rohplatte, haelften.map((h) => ({
        titel: `Haelfte ${h.haelfte} (${h.ort}) – Naht ${teilung.gewaehlt.richtung} bei ${teilung.gewaehlt.posMm} mm`,
        svg: h.laserSvg,
      })));
    } else if (t.gehrung.includes(lage.key)) {
      const b = rahmenbogen(lage, r.layout.platte, r.layout.kartenfenster, t.rohplatte, k.gravurExport, info(lage.titel));
      raus[lage.key] = bogen(t.rohplatte, [{ titel: `Rahmenbogen – ${b.leisten.map((l) => l.name).join(", ")}${b.passt ? "" : " – passt nicht auf eine Platte"}`, svg: b.laserSvg }]);
    }
  }
  return raus;
}

function bogen(p: { breiteMm: number; hoeheMm: number }, platten: { titel: string; svg: string }[]): string {
  const schritt = p.hoeheMm + ABSTAND_MM;
  const hoehe = platten.length * schritt;
  const teile = platten.map((pl, i) => {
    const y = i * schritt + ABSTAND_MM - 6;
    const innen = pl.svg.replace(/^<\?xml[^>]*>\s*/, "").replace(/^<svg[^>]*>/, "").replace(/<\/svg>\s*$/, "");
    return (
      `<text x="0" y="${f(y - 4)}" font-family="sans-serif" font-size="9" fill="#555">${pl.titel}</text>` +
      `<rect x="0" y="${f(y)}" width="${f(p.breiteMm)}" height="${f(p.hoeheMm)}" fill="#fff" stroke="#9a968d" stroke-width="0.6"/>` +
      `<svg x="0" y="${f(y)}" width="${f(p.breiteMm)}" height="${f(p.hoeheMm)}" viewBox="0 0 ${f(p.breiteMm)} ${f(p.hoeheMm)}">${innen}</svg>`
    );
  });
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape" ` +
    `width="${f(p.breiteMm)}mm" height="${f(hoehe)}mm" viewBox="0 0 ${f(p.breiteMm)} ${f(hoehe)}">${teile.join("")}</svg>`
  );
}
