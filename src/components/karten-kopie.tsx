"use client";

import type { Zone } from "@/engine/typen";
import type { SvgLage } from "./svg-lage";

/**
 * Die letzte Vorschau, beschnitten auf das Kartenfenster und verschoben oder
 * um die Fenstermitte skaliert – die Ansicht waehrend Ziehen und Zoomen, bis
 * die neue Vorschau gerechnet ist. Die Kartenmitte liegt immer in der
 * Fenstermitte, darum skaliert der Zoom genau um sie.
 */
export function KartenKopie(props: { svg: string; lage: SvgLage; platte: Zone; fenster: Zone; dx?: number; dy?: number; faktor?: number }) {
  const { svg, lage, platte, fenster: f, dx = 0, dy = 0, faktor = 1 } = props;
  const s = lage.pxProMm;
  return (
    <div
      className="pointer-events-none absolute overflow-hidden"
      style={{ left: lage.links + f.xMm * s, top: lage.oben + f.yMm * s, width: f.breiteMm * s, height: f.hoeheMm * s, background: "var(--grund)" }}
    >
      <div
        className="absolute [&>svg]:h-full [&>svg]:w-full"
        style={{
          left: -f.xMm * s + dx,
          top: -f.yMm * s + dy,
          width: platte.breiteMm * s,
          height: platte.hoeheMm * s,
          transform: faktor !== 1 ? `scale(${faktor})` : undefined,
          transformOrigin: `${(f.xMm + f.breiteMm / 2) * s}px ${(f.yMm + f.hoeheMm / 2) * s}px`,
        }}
        dangerouslySetInnerHTML={{ __html: svg }}
      />
    </div>
  );
}
