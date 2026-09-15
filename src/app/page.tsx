"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Steuerung } from "@/components/steuerung";
import { Vorschau } from "@/components/vorschau";
import { standardEntwurf } from "@/engine/standard";
import type { Entwurfsergebnis, KartenEntwurf } from "@/engine/typen";

export default function Seite() {
  const [entwurf, setEntwurf] = useState<KartenEntwurf>(standardEntwurf);
  const [ergebnis, setErgebnis] = useState<Entwurfsergebnis | null>(null);
  const [fehler, setFehler] = useState<string | null>(null);
  const [laedt, setLaedt] = useState(false);
  const laufNr = useRef(0);

  const rendern = useCallback(async (e: KartenEntwurf) => {
    const nr = ++laufNr.current;
    setLaedt(true);
    try {
      const res = await fetch("/api/vorschau", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(e),
      });
      const daten = await res.json();
      // Eine ueberholte Antwort darf die aktuelle nicht ueberschreiben.
      if (nr !== laufNr.current) return;
      if (!res.ok) {
        setFehler(daten.fehler ?? "Unbekannter Fehler");
      } else {
        setErgebnis(daten as Entwurfsergebnis);
        setFehler(null);
      }
    } catch (err) {
      if (nr !== laufNr.current) return;
      setFehler(err instanceof Error ? err.message : String(err));
    } finally {
      if (nr === laufNr.current) setLaedt(false);
    }
  }, []);

  // Sammelt schnelle Aenderungen (Schieberegler) zu einem Lauf.
  useEffect(() => {
    const t = setTimeout(() => void rendern(entwurf), 350);
    return () => clearTimeout(t);
  }, [entwurf, rendern]);

  const aendern = (teil: Partial<KartenEntwurf>) => setEntwurf((alt) => ({ ...alt, ...teil }));

  return (
    <main className="mx-auto max-w-[1400px] p-6">
      <header className="mb-6">
        <h1 className="text-xl font-semibold">Laser Studio</h1>
        <p className="text-sm" style={{ color: "var(--gedaempft)" }}>
          Kartenprodukte entwerfen – Layout als Zahlen, Ausgabe als SVG mit getrennten Ebenen für Schnitt und Gravur.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[400px_1fr]">
        <Steuerung entwurf={entwurf} aendern={aendern} />
        <Vorschau ergebnis={ergebnis} fehler={fehler} laedt={laedt} />
      </div>
    </main>
  );
}
