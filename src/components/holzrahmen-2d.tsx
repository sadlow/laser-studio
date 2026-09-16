"use client";

import type { CSSProperties } from "react";
import type { SchichtkartenErgebnis } from "@/engine/typen";
import type { SvgLage } from "./svg-lage";

const FARBEN = { schwarz: "#1d1c1a", weiss: "#f4f2ed", eiche: "#9c7147" };

/** Was der Holzrahmen ueber die Platte hinausragt, in mm je Seite. */
const zugabeMm = (e: SchichtkartenErgebnis) => (e.rahmen ? e.rahmen.breiteMm - e.rahmen.ueberstandMm : 0);

/** Platz fuer den Rahmen: die Vorschau-SVG wird um das kleiner, was er nach aussen braucht. */
export function rahmenPlatz(e: SchichtkartenErgebnis): CSSProperties {
  const { breiteMm: b, hoeheMm: h } = e.layout.platte;
  const z = zugabeMm(e);
  return {
    "--vorschau-max-h": `calc((100vh - 9rem) * ${h / (h + 2 * z)})`,
    "--vorschau-max-w": `${(100 * b) / (b + 2 * z)}%`,
  } as CSSProperties;
}

/**
 * Der Holzrahmen ueber der Vorschau (Marcel 16.09.2026): man sieht vom Motiv
 * genau so viel wie im echten Rahmen. Innen steht er ueber den Rand der Platte;
 * der Schatten an der Innenkante zeigt, dass das Bild tiefer liegt.
 */
export function RahmenUmriss({ ergebnis, lage }: { ergebnis: SchichtkartenErgebnis; lage: SvgLage }) {
  const r = ergebnis.rahmen;
  if (!r) return null;
  const { breiteMm: b, hoeheMm: h } = ergebnis.layout.platte;
  const s = lage.pxProMm;
  const z = zugabeMm(ergebnis);
  return (
    <div
      className="pointer-events-none absolute"
      data-holzrahmen={r.farbe}
      style={{
        left: lage.links - z * s,
        top: lage.oben - z * s,
        width: (b + 2 * z) * s,
        height: (h + 2 * z) * s,
        border: `${r.breiteMm * s}px solid ${FARBEN[r.farbe]}`,
        boxShadow: `inset ${0.8 * s}px ${1.5 * s}px ${3 * s}px rgba(0,0,0,0.35), 0 1px 5px rgba(0,0,0,0.25)`,
      }}
    />
  );
}
