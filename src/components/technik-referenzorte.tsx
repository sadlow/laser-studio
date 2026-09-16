"use client";

import type { Schichtkarte } from "@/engine/typen";
import { REFERENZORTE } from "@/referenzorte";
import { Block } from "./felder";
import type { Aenderung } from "./aenderung";

interface Props {
  karte: Schichtkarte;
  aendern: (teil: Aenderung) => void;
}

/** Orte, an denen Grenzwerte brechen koennen – ein Klick setzt Ort und Ortsnamen. */
export function TechnikReferenzorte({ karte, aendern }: Props) {
  return (
    <Block titel="Referenzorte" zu={true} hinweis="Grenzwerte muessen weltweit tragen: dicht, licht, viel Wasser, keine Strassen.">
      <div className="flex flex-wrap gap-1.5">
        {REFERENZORTE.map((ort) => {
          const aktiv = Math.abs(karte.lon - ort.lon) < 1e-6 && Math.abs(karte.lat - ort.lat) < 1e-6;
          return (
            <button
              key={ort.id}
              type="button"
              title={ort.pruefung}
              onClick={() => aendern({ lon: ort.lon, lat: ort.lat, kartenMitte: undefined, kunde: { adresse: ort.name, ortText: ort.ortText } })}
              className="rounded-full border px-2.5 py-0.5 text-xs"
              style={aktiv ? { background: "var(--akzent)", borderColor: "var(--akzent)", color: "#fff" } : { borderColor: "var(--linie)" }}
            >
              {ort.name}
            </button>
          );
        })}
      </div>
    </Block>
  );
}
