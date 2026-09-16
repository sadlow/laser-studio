import type { HolzrahmenProfil } from "./typen";

/**
 * Amazon Custom (Marcel 16.09.2026): Vorschau und Textfelder in einem quadratischen
 * Container von 400 x 400 px. Das Vorschaubild zeigt die Platte gerade von vorn
 * (3D-Motiv "layout") mit Platz fuer den Holzrahmen – auch ohne Rahmen, damit die
 * Platte bei jeder Rahmenwahl an derselben Stelle steht und die Textfelder passen.
 */
export const CONTAINER_PX = 400;

/** Luft um Platte und Rahmen, als Faktor auf die Kantenlaenge. */
export const LAYOUT_RAND = 1.06;

/** Kantenlaenge des quadratischen Vorschaubilds in mm, Mitte = Plattenmitte. */
export function layoutFeldMm(breiteMm: number, hoeheMm: number, profil: HolzrahmenProfil): number {
  return (Math.max(breiteMm, hoeheMm) + 2 * (profil.breiteMm - profil.ueberstandMm)) * LAYOUT_RAND;
}

/** Punkt auf der Platte (mm, Ursprung oben links) in Container-Pixel. */
export function inContainer(xMm: number, yMm: number, breiteMm: number, hoeheMm: number, feldMm: number, px = CONTAINER_PX) {
  const s = px / feldMm;
  return { x: px / 2 + (xMm - breiteMm / 2) * s, y: px / 2 + (yMm - hoeheMm / 2) * s };
}
