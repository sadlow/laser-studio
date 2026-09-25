"use client";

import { useState } from "react";
import type { Anzeige } from "@/engine/typen";
import type { SvgLage } from "./svg-lage";

// Je Lage eine Farbe: die Front rot wie im Montageplan, die Lagen darunter blau.
const FARBEN = ["#d81f26", "#1f6fd8", "#7a3fc4"];

/**
 * Die Naehte einer geteilten Karte ueber der Vorschau (60 x 60): je Lage eine Linie, dazu die Einzelteile orange und
 * die kritischen Uebergaenge als Ring – dieselben Stellen wie im Montageplan. Abschaltbar, damit das Motiv frei bleibt.
 */
export function NahtUeberlagerung({ ergebnis, lage }: { ergebnis: Anzeige; lage: SvgLage }) {
  const [an, setAn] = useState(true);
  const t = ergebnis.teilung;
  if (!t) return null;
  const { breiteMm: B, hoeheMm: H } = ergebnis.layout.platte;
  const s = lage.pxProMm;
  const r = Math.max(2.5, 6 / s);

  return (
    <>
      {an && (
        <svg
          className="pointer-events-none absolute"
          data-naehte
          viewBox={`0 0 ${B} ${H}`}
          style={{ left: lage.links, top: lage.oben, width: B * s, height: H * s }}
        >
          {t.lagen.map((l, i) => {
            const n = l.gewaehlt;
            const farbe = FARBEN[i % FARBEN.length];
            const [x1, y1, x2, y2] = n.richtung === "oben-unten" ? [0, n.posMm, B, n.posMm] : [n.posMm, 0, n.posMm, H];
            return (
              <g key={l.key} data-naht={l.key}>
                <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={farbe} strokeWidth={Math.max(0.8, 1.6 / s)} strokeDasharray={i ? "6 3" : undefined} opacity={0.85} />
                {l.stellen.einzelteile.map((e, j) => (
                  <path key={j} d={`M${e.umriss.map((p) => `${p.x},${p.y}`).join("L")}Z`} fill="#fa8c0d" stroke="#8a4b0a" strokeWidth={0.4} />
                ))}
                {l.stellen.uebergaenge.filter((u) => u.kritisch).map((u, j) => (
                  <circle key={j} cx={u.xMm} cy={u.yMm} r={r} fill="none" stroke={farbe} strokeWidth={Math.max(0.6, 1.2 / s)} />
                ))}
              </g>
            );
          })}
        </svg>
      )}
      <button
        type="button"
        onClick={() => setAn(!an)}
        // Sonst faengt die Vorschau den Druck als Ziehen der Karte ab.
        onPointerDown={(e) => e.stopPropagation()}
        className="absolute rounded-md border px-2 py-1 text-[11px] shadow-sm"
        style={{ left: lage.links + 8, top: lage.oben + 8, background: "var(--karte)", borderColor: "var(--linie)" }}
        title="Naehte, Einzelteile (orange) und kritische Uebergaenge (Ring) ein- oder ausblenden"
      >
        {an ? "Naehte ausblenden" : "Naehte zeigen"}
      </button>
    </>
  );
}
