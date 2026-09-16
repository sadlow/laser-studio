"use client";

import { useEffect, useState, type RefObject } from "react";

export interface SvgLage {
  /** Linke obere Ecke der Vorschau-SVG in der Box, in px. */
  links: number;
  oben: number;
  pxProMm: number;
}

/**
 * Wo die Vorschau-SVG in ihrer Box liegt – fuer Knoepfe und Ansichten, die
 * ueber dem Kartenfenster sitzen. Gemessen wird die erste SVG der Box, also
 * die gerenderte Vorschau, nicht die Kopien darueber.
 */
export function useSvgLage(box: RefObject<HTMLDivElement | null>, svg: string, plattenBreiteMm: number): SvgLage | null {
  const [lage, setLage] = useState<SvgLage | null>(null);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const messen = () => {
      const s = el.querySelector("svg")?.getBoundingClientRect();
      const b = el.getBoundingClientRect();
      if (!s || !s.width) return setLage(null);
      const neu = { links: s.left - b.left, oben: s.top - b.top, pxProMm: s.width / plattenBreiteMm };
      setLage((alt) =>
        alt && Math.abs(alt.links - neu.links) < 0.5 && Math.abs(alt.oben - neu.oben) < 0.5 && Math.abs(alt.pxProMm - neu.pxProMm) < 0.001
          ? alt
          : neu,
      );
    };
    messen();
    const beobachter = new ResizeObserver(messen);
    beobachter.observe(el);
    return () => beobachter.disconnect();
  }, [box, svg, plattenBreiteMm]);
  return lage;
}
