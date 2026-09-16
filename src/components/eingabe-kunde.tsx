"use client";

import { useState } from "react";
import type { Kundeneingabe, Schichtkarte } from "@/engine/typen";
import { Block, Text } from "./felder";

interface Props {
  karte: Schichtkarte;
  aendern: (teil: Partial<Schichtkarte>) => void;
}

/**
 * Dieselben Felder wie Family Motiv 8 "Zuhause Map" (ETSY_FIELD_SPECS im
 * Bulk-Script). Wer das Produkt spaeter auf Amazon listet, fragt genau das ab.
 */
export function EingabeKunde({ karte, aendern }: Props) {
  const [sucht, setSucht] = useState(false);
  const [meldung, setMeldung] = useState<string | null>(null);
  const k = karte.kunde;
  const setze = (teil: Partial<Kundeneingabe>) => aendern({ kunde: { ...k, ...teil } });

  const suchen = async () => {
    setSucht(true);
    setMeldung(null);
    try {
      const res = await fetch(`/api/ort?q=${encodeURIComponent(k.adresse)}`);
      const d = await res.json();
      if (!res.ok) {
        setMeldung(d.fehler ?? "Nicht gefunden");
      } else {
        aendern({ lon: d.lon, lat: d.lat, kunde: { ...k, ortText: d.stadt || k.ortText } });
        setMeldung(d.adresse);
      }
    } finally {
      setSucht(false);
    }
  };

  return (
    <Block titel="Kundeneingabe">
      <div className="space-y-3">
        <div>
          <span className="beschriftung">Adresse</span>
          {/* Formular statt onKeyDown: Enter loest dann zuverlaessig die Suche aus. */}
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              void suchen();
            }}
          >
            <input className="feld" value={k.adresse} onChange={(e) => setze({ adresse: e.target.value })} />
            <button
              type="submit"
              disabled={sucht || !k.adresse.trim()}
              className="shrink-0 rounded-md px-3 text-sm text-white disabled:opacity-50"
              style={{ background: "var(--akzent)" }}
            >
              {sucht ? "…" : "Suchen"}
            </button>
          </form>
          {meldung && (
            <p className="mt-1 text-xs" style={{ color: "var(--gedaempft)" }}>
              {meldung} · {karte.lat.toFixed(5)}, {karte.lon.toFixed(5)}
            </p>
          )}
        </div>

        <Text titel="Titel" wert={k.titel} aendern={(v) => setze({ titel: v })} />
        <Text titel="Namen oder Freitext" wert={k.namen} aendern={(v) => setze({ namen: v })} />

        <div>
          <span className="beschriftung">Letzte Zeile</span>
          <div className="flex gap-4 text-sm">
            {(["koordinaten", "wunschtext"] as const).map((modus) => (
              <label key={modus} className="flex items-center gap-1.5">
                <input type="radio" checked={k.letzteZeile === modus} onChange={() => setze({ letzteZeile: modus })} />
                {modus === "koordinaten" ? "Ort + Koordinaten" : "Wunschtext"}
              </label>
            ))}
          </div>
        </div>

        {k.letzteZeile === "koordinaten" ? (
          <Text titel="Ort vor den Koordinaten" wert={k.ortText} aendern={(v) => setze({ ortText: v })} />
        ) : (
          <Text titel="Wunschtext" wert={k.wunschtext} aendern={(v) => setze({ wunschtext: v })} />
        )}
      </div>
    </Block>
  );
}
