import type { Punkt } from "./clip";
import { herzEinheitRing } from "./herz";

/**
 * Standort-Symbole als Form-Assets (Marcel 16.09.2026: Herz, Haus, Standort-
 * Pin, X – wie beim Poster HERZ/KREUZ/PFEIL). Jedes in Breiten-Einheiten
 * gezeichnet (x 0..1, y nach unten), mit dem Punkt, der auf dem Ort sitzt:
 * Spitze bei Herz und Pin, Fussmitte beim Haus, Mitte beim X.
 */
export type SymbolArt = "herz" | "haus" | "pin" | "kreuz";
export type SymbolGroesse = "klein" | "mittel" | "gross";

export const SYMBOL_TITEL: Record<SymbolArt, string> = {
  herz: "Herz",
  haus: "Haus",
  pin: "Standort-Pin",
  kreuz: "Kreuz",
};

interface Form {
  /** Aussenring zuerst, dann Loecher – Umlaufrichtung wird beim Einpassen geordnet. */
  ringe: Punkt[][];
  hoehe: number;
  anker: Punkt;
}

function kreis(mx: number, my: number, r: number, von: number, bis: number, n: number): Punkt[] {
  return Array.from({ length: n + 1 }, (_, i) => {
    const a = ((von + ((bis - von) * i) / n) * Math.PI) / 180;
    return { x: mx + r * Math.cos(a), y: my + r * Math.sin(a) };
  });
}

function form(art: SymbolArt): Form {
  switch (art) {
    case "herz":
      return { ringe: [herzEinheitRing()], hoehe: 0.95, anker: { x: 0.5, y: 0.95 } };
    case "pin": {
      // Kreis mit Tangenten zur Spitze; das Loch macht ihn als Pin lesbar.
      const spitzeY = 1.4;
      const winkel = (Math.acos(0.5 / (spitzeY - 0.5)) * 180) / Math.PI;
      const bogen = kreis(0.5, 0.5, 0.5, 90 - winkel, 90 + winkel - 360, 48);
      return { ringe: [[...bogen, { x: 0.5, y: spitzeY }], kreis(0.5, 0.5, 0.2, 0, 360, 32).slice(0, -1)], hoehe: spitzeY, anker: { x: 0.5, y: spitzeY } };
    }
    case "haus":
      return {
        ringe: [[
          { x: 0.5, y: 0 }, { x: 1, y: 0.46 }, { x: 0.85, y: 0.46 }, { x: 0.85, y: 1 }, { x: 0.6, y: 1 }, { x: 0.6, y: 0.72 },
          { x: 0.4, y: 0.72 }, { x: 0.4, y: 1 }, { x: 0.15, y: 1 }, { x: 0.15, y: 0.46 }, { x: 0, y: 0.46 },
        ]],
        hoehe: 1,
        anker: { x: 0.5, y: 1 },
      };
    case "kreuz": {
      const a = 0.24 / Math.SQRT2;
      return {
        ringe: [[
          { x: a, y: 0 }, { x: 0.5, y: 0.5 - a }, { x: 1 - a, y: 0 }, { x: 1, y: a }, { x: 0.5 + a, y: 0.5 }, { x: 1, y: 1 - a },
          { x: 1 - a, y: 1 }, { x: 0.5, y: 0.5 + a }, { x: a, y: 1 }, { x: 0, y: 1 - a }, { x: 0.5 - a, y: 0.5 }, { x: 0, y: a },
        ]],
        hoehe: 1,
        anker: { x: 0.5, y: 0.5 },
      };
    }
  }
}

/**
 * Symbolgroessen als eine Reihe fuer alle Formate (Marcel 17.09.2026): mit Groessen, die mit dem Format
 * mitwachsen, waeren es allein fuer A5, A4 und A3 neun Groessen je Symbol zum Herstellen und Vorhalten.
 * A4 nimmt die Stufen 2 bis 4 (klein, mittel, gross), A3 eine Stufe hoeher, A5 eine tiefer: das mittlere
 * bei A4 ist das kleine bei A3 und das grosse bei A5. Eine Formatstufe ist Faktor Wurzel 2 in der
 * Kartenbreite – so ordnen sich auch Quadrat und freie Formate ein. Fuer A5 bis A3 reichen 5 Groessen.
 * Groesser als A3 waechst das Symbol nicht mehr (Marcel 25.09.2026): 60 x 60 zeigt mehr Karte, es ist kein
 * vergroessertes 30 x 30 – das Herz bleibt so gross wie bei A3 und 30 x 30.
 */
export function symbolBreiteMm(stufenMm: number[], groesse: SymbolGroesse, formatfaktor: number): number {
  const verschiebung = Math.min(1, Math.round(2 * Math.log2(Math.max(0.05, formatfaktor))));
  const i = 1 + ["klein", "mittel", "gross"].indexOf(groesse) + verschiebung;
  return stufenMm[Math.min(stufenMm.length - 1, Math.max(0, i))] ?? 11;
}

const flaeche = (r: Punkt[]) => r.reduce((s, p, i) => s + p.x * r[(i + 1) % r.length].y - r[(i + 1) % r.length].x * p.y, 0) / 2;

/** Symbol mit dem Ankerpunkt auf (x, y), Breite in mm. Loecher laufen gegen den Aussenring. */
export function symbolEinpassen(art: SymbolArt, ankerX: number, ankerY: number, breiteMm: number) {
  const f = form(art);
  const ringe = f.ringe.map((ring, i) => {
    const r = ring.map((p) => ({ x: ankerX + (p.x - f.anker.x) * breiteMm, y: ankerY + (p.y - f.anker.y) * breiteMm }));
    const soll = i === 0 ? 1 : -1;
    return Math.sign(flaeche(r)) === soll ? r : r.reverse();
  });
  const box = { xMm: ankerX - f.anker.x * breiteMm, yMm: ankerY - f.anker.y * breiteMm, breiteMm, hoeheMm: f.hoehe * breiteMm };
  return { ringe, box };
}

/** Umriss in Breiten-Einheiten als SVG-Pfad – fuer Knoepfe und das gezogene Symbol. */
export function symbolPfad(art: SymbolArt): { d: string; hoehe: number; ankerX: number; ankerY: number } {
  const f = form(art);
  const d = f.ringe.map((r) => "M" + r.map((p) => `${p.x.toFixed(4)},${p.y.toFixed(4)}`).join("L") + "Z").join("");
  return { d, hoehe: f.hoehe, ankerX: f.anker.x, ankerY: f.anker.y };
}
