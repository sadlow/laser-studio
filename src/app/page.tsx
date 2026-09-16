"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { mischen, type Aenderung } from "@/components/aenderung";
import { EingabeFertigung, EingabeStrassen } from "@/components/eingabe-fertigung";
import { EingabeLayout, EingabePlatte } from "@/components/eingabe-produkt";
import { Komposer } from "@/components/komposer";
import { KundeGestaltung } from "@/components/kunde-gestaltung";
import { KundeStandort } from "@/components/kunde-standort";
import { KundeTexte } from "@/components/kunde-texte";
import { PrototypPlatten } from "@/components/prototyp-platten";
import { TechnikPruefung } from "@/components/technik-pruefung";
import { TechnikReferenzorte } from "@/components/technik-referenzorte";
import { VorlagenExport } from "@/components/vorlagen-export";
import { standardSchichtkarte } from "@/engine/standard";
import type { Schichtkarte, SchichtkartenErgebnis } from "@/engine/typen";

/**
 * Vollbild in drei Spalten (Marcel 16.09.2026): links, was der Kunde spaeter
 * selbst einstellt; in der Mitte das grosse Arbeitsfeld; rechts die Technik
 * fuer den Prototypenbau.
 */
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

  const aendern = (teil: Aenderung) => setKarte((alt) => mischen(alt, teil));

  return (
    <main className="grid h-screen grid-cols-[330px_minmax(0,1fr)_380px] overflow-hidden">
      <aside className="space-y-3 overflow-y-auto border-r p-3" style={{ borderColor: "var(--linie)" }}>
        <header className="px-1 pt-1 pb-2">
          <h1 className="text-base font-semibold">Laser Studio · Schichtkarte</h1>
          <p className="text-xs" style={{ color: "var(--gedaempft)" }}>
            Was der Kunde spaeter selbst einstellt
          </p>
        </header>
        <KundeStandort karte={karte} aendern={aendern} />
        <KundeTexte karte={karte} aendern={aendern} />
        <KundeGestaltung karte={karte} aendern={aendern} />
      </aside>

      <section className="min-h-0 p-3">
        <Komposer ergebnis={ergebnis} fehler={fehler} laedt={laedt} karte={karte} aendern={aendern} />
      </section>

      <aside className="space-y-3 overflow-y-auto border-l p-3" style={{ borderColor: "var(--linie)" }}>
        <p className="px-1 pt-1 text-xs font-medium" style={{ color: "var(--gedaempft)" }}>
          Technik und Prototypenbau
        </p>
        <TechnikPruefung ergebnis={ergebnis} />
        <VorlagenExport karte={karte} aendern={aendern} />
        <PrototypPlatten karte={karte} />
        <TechnikReferenzorte karte={karte} aendern={aendern} />
        <EingabePlatte karte={karte} aendern={aendern} />
        <EingabeLayout karte={karte} aendern={aendern} />
        <EingabeStrassen karte={karte} aendern={aendern} />
        <EingabeFertigung karte={karte} aendern={aendern} />
      </aside>
    </main>
  );
}
