import { bogenSvg } from "./produktion";
import { montageplanPdf } from "./montageplan";
import { teileLage } from "./teilung-export";
import { rahmenbogen } from "./teilung-rahmen";
import type { LagenKey, Schichtkarte, SchichtkartenErgebnis } from "./typen";
const slug = (s: string) => s.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/ß/g, "ss").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/**
 * Laserdateien einer geteilten Karte (60 x 60): jede geteilte Lage als Haelfte A und B, je auf ihrer Rohplatte;
 * Blau ohne Datei (Rohformat); das Symbol klein in die Ecke einer Rohplatte. Dazu der Montageplan als PDF.
 */
export function geteilteDateien(
  r: SchichtkartenErgebnis,
  karte: Schichtkarte,
  meta: { vorlage: string; datum: string; angaben: string[] },
  schreibe: (name: string, inhalt: string | Buffer) => void,
): string[] {
  const t = r.teilung;
  if (!t) throw new Error("Teilung fehlt: Produktionsausgabe braucht die vollstaendige Rechnung.");
  if (!karte.kunde.holzrahmen || karte.kunde.holzrahmen === "ohne") throw new Error("60 × 60 benötigt einen Holzrahmen.");
  for (const lage of r.lagen) {
    if (!["symbol", "blau", "deck"].includes(lage.key) && !t.lagen.some(l => l.key === lage.key))
      throw new Error(`Keine passende Rohplatten-Teilung fuer ${lage.titel}.`);
  }
  const dateien: Partial<Record<LagenKey, string[]>> = {};
  const zeilen: string[] = [];

  r.lagen.forEach((lage, i) => {
    const nr = String(i + 1).padStart(2, "0");
    const basis = `${nr}-${slug(lage.titel)}`;
    const teilung = t.lagen.find((l) => l.key === lage.key);
    const info = {
      titel: `Schichtkarte – Lage ${i + 1} ${lage.titel}`,
      beschreibung: `Vorlage: ${meta.vorlage}; Material: ${lage.material}; Rohplatte ${t.rohplatte.breiteMm} x ${t.rohplatte.hoeheMm} mm; erstellt ${meta.datum}`,
    };
    if (teilung) {
      const haelften = teileLage(lage, r.layout.platte, teilung.gewaehlt, t.rohplatte, karte.gravurExport, info);
      const namen = haelften.map((h) => `${basis}-${h.haelfte.toLowerCase()}-${h.ort}.svg`);
      haelften.forEach((h, j) => schreibe(namen[j], h.laserSvg));
      dateien[lage.key] = namen;
      zeilen.push(`  ${nr}  ${lage.titel.padEnd(16)} ${lage.material.padEnd(24)} Naht ${teilung.gewaehlt.richtung} bei ${teilung.gewaehlt.posMm} mm -> ${namen.join(", ")}`);
    } else if (t.gehrung.includes(lage.key)) {
      const bogen = rahmenbogen(lage, r.layout.platte, r.layout.kartenfenster, t.rohplatte, karte.gravurExport, info);
      if (!bogen.passt) throw new Error("Rahmenleisten passen nicht auf die Rohplatte.");
      const name = `${basis}-rahmenbogen.svg`;
      schreibe(name, bogen.laserSvg);
      dateien[lage.key] = [name];
      zeilen.push(`  ${nr}  ${lage.titel.padEnd(16)} ${lage.material.padEnd(24)} vier Leisten mit Gehrung (${bogen.leisten.map((l) => `${l.name} ${Math.round(l.hoeheMm)} mm`).join(", ")}) -> ${name}` +
        (bogen.passt ? "" : "  ACHTUNG: passt nicht auf eine Rohplatte"));
    } else if (lage.key === "blau") {
      zeilen.push(`  ${nr}  ${lage.titel.padEnd(16)} ${lage.material.padEnd(24)} ${r.layout.platte.breiteMm} x ${r.layout.platte.hoeheMm} mm im Rohformat bestellen – keine Laserdatei`);
    } else {
      // Klein genug fuer jede Platte: 5 mm von der Ecke.
      const xs = lage.teile.flatMap((s) => s.aussen);
      const dx = 5 - Math.min(...xs.map((p) => p.x));
      const dy = 5 - Math.min(...xs.map((p) => p.y));
      const name = `${basis}.svg`;
      schreibe(name, bogenSvg(t.rohplatte, [{ lage, dx, dy }], info, karte.gravurExport));
      dateien[lage.key] = [name];
      zeilen.push(`  ${nr}  ${lage.titel.padEnd(16)} ${lage.material.padEnd(24)} ${name}`);
    }
  });

  const pdf = montageplanPdf(r, { titel: meta.vorlage, datum: meta.datum, dateien, angaben: meta.angaben });
  if (pdf) schreibe("montageplan.pdf", pdf);
  return zeilen;
}
