"use client";

import { useEffect, useRef, useState } from "react";
import type { Schichtkarte, Skizze } from "@/engine/typen";

/**
 * Live-Vorschau beim Justieren (Marcel 25.09.2026): nach jeder Aenderung sofort die Skizze (skizze.ts, Millisekunden),
 * die volle Produktionsrechnung laeuft danach im Hintergrund und loest sie ab. `stand` ist der Kartenstand ohne
 * Nahtwahl – eine Skizze gilt nur fuer genau ihren Stand.
 */
export function useSkizze(karte: Schichtkarte, stand: string) {
  const [skizze, setSkizze] = useState<{ stand: string; daten: Skizze } | null>(null);
  const lauf = useRef<AbortController | null>(null);
  const aktuelleKarte = useRef(karte);
  aktuelleKarte.current = karte;

  useEffect(() => {
    const t = setTimeout(async () => {
      lauf.current?.abort();
      const abbruch = new AbortController();
      lauf.current = abbruch;
      try {
        const res = await fetch("/api/skizze", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(aktuelleKarte.current), signal: abbruch.signal });
        if (res.ok) setSkizze({ stand, daten: (await res.json()) as Skizze });
      } catch {
        // Abgebrochen oder Fehler: die volle Rechnung zeigt ihn.
      }
    }, 60);
    return () => clearTimeout(t);
  }, [stand]);

  return skizze;
}
