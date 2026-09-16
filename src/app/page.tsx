"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { EingabeFertigung, EingabeStrassen } from "@/components/eingabe-fertigung";
import { EingabeKunde } from "@/components/eingabe-kunde";
import { EingabeLayout, EingabePlatte } from "@/components/eingabe-produkt";
import { PrototypPlatten } from "@/components/prototyp-platten";
import { VorlagenExport } from "@/components/vorlagen-export";
import { Vorschau } from "@/components/vorschau";
import { standardSchichtkarte } from "@/engine/standard";
import type { Schichtkarte, SchichtkartenErgebnis } from "@/engine/typen";

export default function Seite() {
  const [karte, setKarte] = useState<Schichtkarte>(standardSchichtkarte);
  const [ergebnis, setErgebnis] = useState<SchichtkartenErgebnis | null>(null);
  const [fehler, setFehler] = useState<string | null>(null);
  const [laedt, setLaedt] = useState(false);
  const laufNr = useRef(0);

  const rendern = useCallback(async (k: Schichtkarte) => {
    const nr = ++laufNr.current;
    setLaedt(true);
    try {
      const res = await fetch("/api/vorschau", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(k),
      });
      const daten = await res.json();
      // Eine ueberholte Antwort darf die aktuelle nicht ueberschreiben.
      if (nr !== laufNr.current) return;
      if (!res.ok) setFehler(daten.fehler ?? "Unbekannter Fehler");
      else {
        setErgebnis(daten as SchichtkartenErgebnis);
        setFehler(null);
      }
    } catch (err) {
      if (nr === laufNr.current) setFehler(err instanceof Error ? err.message : String(err));
    } finally {
      if (nr === laufNr.current) setLaedt(false);
    }
  }, []);

  // Sammelt schnelle Aenderungen (Regler, Tippen) zu einem Lauf.
  useEffect(() => {
    const t = setTimeout(() => void rendern(karte), 450);
    return () => clearTimeout(t);
  }, [karte, rendern]);

  const aendern = (teil: Partial<Schichtkarte>) => setKarte((alt) => ({ ...alt, ...teil }));

  return (
    <main className="mx-auto max-w-[1500px] p-6">
      <header className="mb-6 flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold">Laser Studio · Schichtkarte</h1>
          <p className="text-sm" style={{ color: "var(--gedaempft)" }}>
            Weiss mit Strassennetz und Stencil-Text · Schwarz mit Gravur · Wasser in blauem Spiegel · Herz in rotem Spiegel
          </p>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[420px_1fr]">
        <div className="space-y-4">
          <VorlagenExport karte={karte} aendern={aendern} />
          <PrototypPlatten karte={karte} />
          <EingabeKunde karte={karte} aendern={aendern} />
          <EingabePlatte karte={karte} aendern={aendern} />
          <EingabeLayout karte={karte} aendern={aendern} />
          <EingabeStrassen karte={karte} aendern={aendern} />
          <EingabeFertigung karte={karte} aendern={aendern} />
        </div>
        <div className="lg:sticky lg:top-6 lg:self-start">
          <Vorschau ergebnis={ergebnis} fehler={fehler} laedt={laedt} />
        </div>
      </div>
    </main>
  );
}
