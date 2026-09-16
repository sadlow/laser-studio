import type { Punkt } from "./clip";

/**
 * Das Herz ist ein Form-Asset, keine Formel: ein einmal gezeichneter Pfad, der
 * in Groesse und Lage eingepasst wird. Genau so kommen spaeter weitere Formen
 * dazu (Kringel, Kreuz, Pfeil wie beim Poster), ohne dass die Engine sich aendert.
 *
 * Einheitsbox 0..1, y nach unten, Spitze unten.
 */
const HERZ_KUBISCH: [Punkt, Punkt, Punkt, Punkt][] = [
  [{ x: 0.5, y: 0.26 }, { x: 0.44, y: 0.06 }, { x: 0.28, y: 0.0 }, { x: 0.18, y: 0.02 }],
  [{ x: 0.18, y: 0.02 }, { x: 0.04, y: 0.05 }, { x: -0.03, y: 0.22 }, { x: 0.04, y: 0.4 }],
  [{ x: 0.04, y: 0.4 }, { x: 0.12, y: 0.6 }, { x: 0.36, y: 0.78 }, { x: 0.5, y: 1.0 }],
  [{ x: 0.5, y: 1.0 }, { x: 0.64, y: 0.78 }, { x: 0.88, y: 0.6 }, { x: 0.96, y: 0.4 }],
  [{ x: 0.96, y: 0.4 }, { x: 1.03, y: 0.22 }, { x: 0.96, y: 0.05 }, { x: 0.82, y: 0.02 }],
  [{ x: 0.82, y: 0.02 }, { x: 0.72, y: 0.0 }, { x: 0.56, y: 0.06 }, { x: 0.5, y: 0.26 }],
];

/**
 * Herz mit gegebener Breite, dessen Mitte auf dem Ort liegt. Hoehe folgt dem
 * Seitenverhaeltnis des Assets (etwas hoeher als breit).
 */
export function herzRing(mitteX: number, mitteY: number, breiteMm: number): Punkt[] {
  const hoeheMm = breiteMm * 0.95;
  const punkte: Punkt[] = [];
  for (const [a, b, c, d] of HERZ_KUBISCH) {
    for (let i = 0; i < 24; i++) {
      const t = i / 24;
      const u = 1 - t;
      const x = u * u * u * a.x + 3 * u * u * t * b.x + 3 * u * t * t * c.x + t * t * t * d.x;
      const y = u * u * u * a.y + 3 * u * u * t * b.y + 3 * u * t * t * c.y + t * t * t * d.y;
      punkte.push({ x: mitteX + (x - 0.5) * breiteMm, y: mitteY + (y - 0.5) * hoeheMm });
    }
  }
  return punkte;
}
