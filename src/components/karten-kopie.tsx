"use client";

import type { Zone } from "@/engine/typen";
import type { SvgLage } from "./svg-lage";

/**
 * Die letzte Vorschau als Platzhalter waehrend Ziehen und Zoomen, bis die neue
 * gerechnet ist: verschoben oder um die Fenstermitte skaliert (die Kartenmitte
 * liegt immer dort).
 *
 * Zugeschnitten wird zweimal. Erst die Kopie selbst auf das Kartenfenster –
 * sonst schoben sich Rahmen und Titel mit ins Bild, beim Herauszoomen stand die
 * ganze Platte verkleinert im Fenster (Marcel 16.09.2026). Dann das Ergebnis
 * auf das Fenster. Frei gewordene Raender zeigen die Hintergrundfarbe der Karte.
 */
export function KartenKopie(props: {
  svg: string;
  lage: SvgLage;
  platte: Zone;
  fenster: Zone;
  grund: string;
  dx?: number;
  dy?: number;
  faktor?: number;
}) {
  const { svg, lage, platte, fenster: f, grund, dx = 0, dy = 0, faktor = 1 } = props;
  const s = lage.pxProMm;
  const rechts = (platte.breiteMm - f.xMm - f.breiteMm) * s;
  const unten = (platte.hoeheMm - f.yMm - f.hoeheMm) * s;
  return (
    <div
      className="pointer-events-none absolute overflow-hidden"
      style={{ left: lage.links + f.xMm * s, top: lage.oben + f.yMm * s, width: f.breiteMm * s, height: f.hoeheMm * s, background: grund }}
    >
      <div
        className="absolute [&>svg]:h-full [&>svg]:w-full"
        style={{
          left: -f.xMm * s + dx,
          top: -f.yMm * s + dy,
          width: platte.breiteMm * s,
          height: platte.hoeheMm * s,
          // clip-path wirkt vor dem transform: nur die Karte wandert oder skaliert.
          clipPath: `inset(${f.yMm * s}px ${rechts}px ${unten}px ${f.xMm * s}px)`,
          transform: faktor !== 1 ? `scale(${faktor})` : undefined,
          transformOrigin: `${(f.xMm + f.breiteMm / 2) * s}px ${(f.yMm + f.hoeheMm / 2) * s}px`,
        }}
        dangerouslySetInnerHTML={{ __html: svg }}
      />
    </div>
  );
}
