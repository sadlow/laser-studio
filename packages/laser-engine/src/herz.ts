import type { Punkt } from "./clip";

/**
 * Das Herz ist ein Form-Asset, keine Formel: ein einmal gezeichneter Pfad, der
 * in Groesse und Lage eingepasst wird (symbole.ts, zusammen mit Haus, Pin, X).
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

/** Hoehe zu Breite des Assets – etwas hoeher als breit. */
export const HERZ_HOEHE_ANTEIL = 0.95;

/** Umriss in Breiten-Einheiten: x 0..1, y 0..0,95, Spitze bei (0,5 | 0,95). */
export function herzEinheitRing(): Punkt[] {
  const punkte: Punkt[] = [];
  for (const [a, b, c, d] of HERZ_KUBISCH) {
    for (let i = 0; i < 24; i++) {
      const t = i / 24;
      const u = 1 - t;
      const x = u * u * u * a.x + 3 * u * u * t * b.x + 3 * u * t * t * c.x + t * t * t * d.x;
      const y = u * u * u * a.y + 3 * u * u * t * b.y + 3 * u * t * t * c.y + t * t * t * d.y;
      punkte.push({ x, y: y * HERZ_HOEHE_ANTEIL });
    }
  }
  return punkte;
}
