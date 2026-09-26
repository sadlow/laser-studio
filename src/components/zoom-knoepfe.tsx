"use client";

import type { CSSProperties } from "react";

/**
 * Ausschnittbreiten fuer Plus und Minus – feste Stufen statt freier Werte
 * (Marcel 16.09.2026: "mit Plus und Minus, das waere intuitiver"). Rund
 * 1,25-fach je Schritt; 3,5 km, fuer die die Strassenbreiten entworfen sind,
 * liegt auf einer Stufe.
 */
export const ZOOM_STUFEN_KM = [0.8, 1, 1.25, 1.5, 2, 2.5, 3, 3.5, 4.5, 5.5, 7, 9, 12];

/**
 * Weiter als das nicht (Marcel 26.09.2026): 60 x 60 bis 30 km. Erst die Breitenregeln (dichte.ts: weiter draussen nicht
 * breiter in Metern, ab 1,5-fachem Massstab eine Klasse mehr graviert) machen das sauber – vorher liefen ab 20 km die
 * Orte zu. Liegt die naechste Stufe darueber, ist die Grenze selbst die letzte Stufe (60 x 60: 26,1 -> 30 km).
 */
export const ZOOM_MAX_KM = 30;

/**
 * Die Stufen fuer ein Format (Marcel 25.09.2026): die A4-Reihe mal Kartenbreite / A4-Kartenbreite – jedes Format
 * zoomt im selben Massstab wie A4 und rastet beim Standardausschnitt ein. 60 x 60: 2,3 bis 30 km statt 0,8 bis 12.
 */
export function zoomStufenKm(faktor: number): number[] {
  const alle = ZOOM_STUFEN_KM.map((s) => Math.round(s * faktor * 10) / 10);
  const stufen = alle.filter((s) => s <= ZOOM_MAX_KM);
  if (alle.some((s) => s > ZOOM_MAX_KM) && stufen[stufen.length - 1] < ZOOM_MAX_KM) stufen.push(ZOOM_MAX_KM);
  return stufen.filter((s, i) => stufen.indexOf(s) === i);
}

/** Naechste Stufe ab einem beliebigen Wert – auch ab einem, den der Regler gesetzt hat. */
export function naechsteStufe(km: number, richtung: "rein" | "raus", faktor = 1): number | null {
  const stufen = zoomStufenKm(faktor);
  const stufe =
    richtung === "rein"
      ? [...stufen].reverse().find((s) => s < km - 1e-6)
      : stufen.find((s) => s > km + 1e-6);
  return stufe ?? null;
}

const kmText = (km: number) => km.toLocaleString("de-DE", { maximumFractionDigits: 2 });

export function ZoomKnoepfe({ km, setzeKm, style, faktor = 1 }: { km: number; setzeKm: (km: number) => void; style: CSSProperties; faktor?: number }) {
  const rein = naechsteStufe(km, "rein", faktor);
  const raus = naechsteStufe(km, "raus", faktor);
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
