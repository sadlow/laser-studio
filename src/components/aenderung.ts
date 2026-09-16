import type { Kundeneingabe, Schichtkarte } from "@/engine/typen";

/**
 * Eine Aenderung am Entwurf. Die Kundeneingabe wird feldweise gemischt: zwei
 * schnelle Klicks (Symbol, dann Groesse) schickten sonst je die ganze, noch alte
 * Kundeneingabe mit, und der zweite machte den ersten rueckgaengig.
 */
export type Aenderung = Omit<Partial<Schichtkarte>, "kunde"> & { kunde?: Partial<Kundeneingabe> };

export function mischen(alt: Schichtkarte, teil: Aenderung): Schichtkarte {
  return { ...alt, ...teil, kunde: teil.kunde ? { ...alt.kunde, ...teil.kunde } : alt.kunde };
}
