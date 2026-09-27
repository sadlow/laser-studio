import { REFERENZ_KARTENBREITE_MM, type Schichtkarte, type Zone } from "./typen";

/**
 * Breiten wachsen mit dem Format hoechstens so weit wie beim 30 x 30 (Marcel 26.09.2026). Das 60 x 60 zeigt seit dem
 * gleichen Start-Massstab viermal so viel Land wie das A4, nicht dasselbe Bild vergroessert: mit Formatfaktor 2,9 wurde
 * an lichten Orten eine Primaerstrasse 8,9 mm breit (Lanzarote, Bali: Kurven verschwanden, Orte liefen zu).
 */
export const FORMAT_BIS = 1.46;
/** Standard fuer `mehrGravurAb` (typen-strassen.ts). */
export const MEHR_GRAVUR_AB = 1.5;
// Meter je mm Karte beim Start-Massstab: A4 bei 3,5 km.
const START_M_JE_MM = 3500 / REFERENZ_KARTENBREITE_MM;

/** Wie gross das Format ist und wie weit der Ausschnitt ueber den Start-Massstab hinausgeht. */
export interface Breitenbezug {
  /** Kartenbreite / A4-Kartenbreite. */
  formatfaktor: number;
  /** Meter je mm im Verhaeltnis zu A4 bei 3,5 km (60 x 60 bei 20 km: 2). */
  massstab: number;
}

export function breitenbezug(k: Schichtkarte, f: Zone): Breitenbezug {
  return { formatfaktor: f.breiteMm / REFERENZ_KARTENBREITE_MM, massstab: (k.ausschnittKm * 1000) / f.breiteMm / START_M_JE_MM };
}
