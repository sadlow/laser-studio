"use client";

import { useMemo, type CSSProperties } from "react";
import type { SchichtkartenErgebnis } from "@/engine/typen";
import { HOLZ_MM, holzBild, type Holz } from "./holz-muster";
import type { SvgLage } from "./svg-lage";

type Farbe = NonNullable<SchichtkartenErgebnis["rahmen"]>["farbe"];
const FARBEN: Record<Farbe, string> = { schwarz: "#1d1c1a", weiss: "#f4f2ed", eiche: "#9c7147", dunkelbraun: "#4a3223" };
// Holz mit Maserung statt Flaeche (Marcel 16.09.2026: "die Eiche sieht aus wie ein brauner Block").
const HOLZ: Partial<Record<Farbe, Holz>> = { eiche: "eiche", dunkelbraun: "dunkelbraun" };

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
 * der Schatten an der Innenkante zeigt, dass das Bild tiefer liegt. Vier Leisten
 * mit Gehrung, die Maserung laeuft entlang jeder Leiste – wie beim 3D-Rahmen.
 */
export function RahmenUmriss({ ergebnis, lage }: { ergebnis: SchichtkartenErgebnis; lage: SvgLage }) {
  const r = ergebnis.rahmen;
  const holz = r ? HOLZ[r.farbe] : undefined;
  const bild = useMemo(() => (holz ? holzBild(holz) : null), [holz]);
  if (!r) return null;
  const { breiteMm: b, hoeheMm: h } = ergebnis.layout.platte;
  const s = lage.pxProMm;
  const z = zugabeMm(ergebnis);
  const [w, hh, f] = [(b + 2 * z) * s, (h + 2 * z) * s, r.breiteMm * s];
  const leisten = [
    { d: `M0 0H${w}L${w - f} ${f}H${f}Z`, senkrecht: false },
    { d: `M0 ${hh}H${w}L${w - f} ${hh - f}H${f}Z`, senkrecht: false },
    { d: `M0 0L${f} ${f}V${hh - f}L0 ${hh}Z`, senkrecht: true },
    { d: `M${w} 0L${w - f} ${f}V${hh - f}L${w} ${hh}Z`, senkrecht: true },
  ];
  const [mw, mh] = [HOLZ_MM.entlang * s, HOLZ_MM.quer * s];
  const id = `holz-${r.farbe}`;
  return (
    <div
      className="pointer-events-none absolute"
      data-holzrahmen={r.farbe}
      style={{
        left: lage.links - z * s,
        top: lage.oben - z * s,
        width: w,
        height: hh,
        border: `${f}px solid transparent`,
        boxShadow: `inset ${0.8 * s}px ${1.5 * s}px ${3 * s}px rgba(0,0,0,0.35), 0 1px 5px rgba(0,0,0,0.25)`,
      }}
    >
      <svg className="absolute" style={{ left: -f, top: -f }} width={w} height={hh}>
        {bild && (
          <defs>
            {(["w", "s"] as const).map((art) => (
              <pattern key={art} id={`${id}-${art}`} patternUnits="userSpaceOnUse" width={mw} height={mh} patternTransform={art === "s" ? "rotate(90)" : undefined}>
                <image href={bild} width={mw} height={mh} preserveAspectRatio="none" />
              </pattern>
            ))}
          </defs>
        )}
        {leisten.map((l, i) => (
          <path key={i} d={l.d} fill={bild ? `url(#${id}-${l.senkrecht ? "s" : "w"})` : FARBEN[r.farbe]} stroke="rgba(0,0,0,0.18)" strokeWidth={0.6} />
        ))}
      </svg>
    </div>
  );
}
