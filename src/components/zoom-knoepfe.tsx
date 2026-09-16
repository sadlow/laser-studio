"use client";

import type { CSSProperties } from "react";

/**
 * Ausschnittbreiten fuer Plus und Minus – feste Stufen statt freier Werte
 * (Marcel 16.09.2026: "mit Plus und Minus, das waere intuitiver"). Rund
 * 1,25-fach je Schritt; 3,5 km, fuer die die Strassenbreiten entworfen sind,
 * liegt auf einer Stufe.
 */
export const ZOOM_STUFEN_KM = [0.8, 1, 1.25, 1.5, 2, 2.5, 3, 3.5, 4.5, 5.5, 7, 9, 12];

/** Naechste Stufe ab einem beliebigen Wert – auch ab einem, den der Regler gesetzt hat. */
export function naechsteStufe(km: number, richtung: "rein" | "raus"): number | null {
  const stufe =
    richtung === "rein"
      ? [...ZOOM_STUFEN_KM].reverse().find((s) => s < km - 1e-6)
      : ZOOM_STUFEN_KM.find((s) => s > km + 1e-6);
  return stufe ?? null;
}

const kmText = (km: number) => km.toLocaleString("de-DE", { maximumFractionDigits: 2 });

export function ZoomKnoepfe({ km, setzeKm, style }: { km: number; setzeKm: (km: number) => void; style: CSSProperties }) {
  const rein = naechsteStufe(km, "rein");
  const raus = naechsteStufe(km, "raus");
  const knopf = "h-8 w-11 text-lg leading-none outline-none disabled:opacity-30 hover:bg-black/5 focus-visible:bg-black/10";
  return (
    <div
      className="absolute flex flex-col overflow-hidden rounded-md shadow-md"
      style={{ ...style, background: "var(--karte)", border: "1px solid var(--linie)", cursor: "default" }}
      // Sonst beginnt auf dem Knopf ein Kartenzug, und der Klick kommt nie an.
      onPointerDown={(e) => e.stopPropagation()}
    >
      <button type="button" className={knopf} title="Hineinzoomen: kleinerer Ausschnitt" disabled={rein === null}
        onClick={() => rein !== null && setzeKm(rein)}>
        +
      </button>
      <div className="border-y py-0.5 text-center text-[10px] leading-tight" style={{ borderColor: "var(--linie)" }}>
        {kmText(km)} km
      </div>
      <button type="button" className={knopf} title="Herauszoomen: groesserer Ausschnitt" disabled={raus === null}
        onClick={() => raus !== null && setzeKm(raus)}>
        −
      </button>
    </div>
  );
}
