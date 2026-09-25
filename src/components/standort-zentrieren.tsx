"use client";

import type { CSSProperties } from "react";
import type { Anzeige, Schichtkarte } from "@/engine/typen";
import type { Aenderung } from "./aenderung";
import type { SvgLage } from "./svg-lage";

interface Props {
  karte: Schichtkarte;
  ergebnis: Anzeige;
  lage: SvgLage;
  aendern: (teil: Aenderung) => void;
  /** Zeigt die alte Vorschau verschoben, bis die neue gerechnet ist – wie nach dem Ziehen. */
  vorschieben: (dxPx: number, dyPx: number) => void;
  style: CSSProperties;
}

/**
 * "Standort zentrieren" (Marcel 16.09.2026): holt den Symbol-Anker – die
 * Herzspitze, also den Koordinatenpunkt – zurueck in die Mitte des
 * Kartenfensters. Nach dem Ziehen von Karte oder Herz liegt er sonst irgendwo.
 * Ist die Karte schon zentriert, bleibt der Knopf sichtbar, aber gesperrt.
 */
export function StandortZentrieren({ karte, ergebnis, lage, aendern, vorschieben, style }: Props) {
  const m = karte.kartenMitte;
  const zentriert = !m || (Math.abs(m.lon - karte.lon) < 1e-7 && Math.abs(m.lat - karte.lat) < 1e-7);
  const zentrieren = () => {
    const { kartenfenster: f } = ergebnis.layout;
    const h = ergebnis.symbol;
    if (h) vorschieben((f.xMm + f.breiteMm / 2 - h.ankerXMm) * lage.pxProMm, (f.yMm + f.hoeheMm / 2 - h.ankerYMm) * lage.pxProMm);
    aendern({ kartenMitte: undefined });
  };
  return (
    <button
      type="button"
      className="absolute flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs whitespace-nowrap shadow-md outline-none hover:bg-black/5 focus-visible:bg-black/10 disabled:opacity-60"
      style={{ ...style, background: "var(--karte)", border: "1px solid var(--linie)", cursor: zentriert ? "default" : "pointer" }}
      disabled={zentriert}
      title={zentriert ? "Die Karte ist schon um den Standort zentriert" : "Herzspitze (Koordinatenpunkt) in die Mitte der Karte holen"}
      // Sonst beginnt auf dem Knopf ein Kartenzug, und der Klick kommt nie an.
      onPointerDown={(e) => e.stopPropagation()}
      onClick={zentrieren}
    >
      <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
        <circle cx="8" cy="8" r="4.5" />
        <circle cx="8" cy="8" r="1.2" fill="currentColor" stroke="none" />
        <path d="M8 1v2.5M8 12.5V15M1 8h2.5M12.5 8H15" />
      </svg>
      Standort zentrieren
    </button>
  );
}
