"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { LagenKey, Schichtkarte, SchichtkartenErgebnis, TeilungsErgebnis } from "@/engine/typen";

interface Naehte {
  /** Zu welcher Vorschau die Naehte gehoeren – eine neue Vorschau macht sie ungueltig. */
  fuer: SchichtkartenErgebnis;
  teilung: TeilungsErgebnis | null;
  warnungen: string[];
  ansichten: Partial<Record<LagenKey, string>>;
}

/**
 * Naehte einer geteilten Karte auf Knopfdruck (Marcel 25.09.2026): die Vorschau rechnet nur die Karte, die Nahtsuche
 * kommt erst, wenn sie gebraucht wird. Einmal gerechnet, folgt sie jeder Umwahl einer Naht; nach einer neuen Vorschau
 * (Karte verschoben, Format, Text) muss sie neu angestossen werden.
 */
export function useNaehte(karte: Schichtkarte, ergebnis: SchichtkartenErgebnis | null) {
  const [naehte, setNaehte] = useState<Naehte | null>(null);
  const [laeuft, setLaeuft] = useState(false);
  const [fehler, setFehler] = useState<string | null>(null);
  const lauf = useRef<AbortController | null>(null);

  const rechnen = useCallback(async (k: Schichtkarte, fuer: SchichtkartenErgebnis) => {
    lauf.current?.abort();
    const abbruch = new AbortController();
    lauf.current = abbruch;
    setLaeuft(true);
    setFehler(null);
    try {
      const res = await fetch("/api/teilung", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(k), signal: abbruch.signal });
      const d = await res.json();
      if (!res.ok) setFehler(d.fehler ?? "Unbekannter Fehler");
      else setNaehte({ fuer, teilung: d.teilung, warnungen: d.warnungen, ansichten: d.ansichten ?? {} });
    } catch (e) {
      if (!abbruch.signal.aborted) setFehler(e instanceof Error ? e.message : String(e));
    } finally {
      if (lauf.current === abbruch) setLaeuft(false);
    }
  }, []);

  // Umwahl einer Naht: gerechnete Naehte sofort nachziehen – die Karte liegt auf dem Server im Speicher.
  const aktuell = naehte && naehte.fuer === ergebnis;
  const wahl = JSON.stringify(karte.teilungWahl ?? {});
  const letzteWahl = useRef(wahl);
  useEffect(() => {
    if (wahl === letzteWahl.current) return;
    letzteWahl.current = wahl;
    if (aktuell && ergebnis) void rechnen(karte, ergebnis);
  }, [wahl, aktuell, ergebnis, karte, rechnen]);

  // Gemerkt: ein neues Objekt bei jedem Rendern liesse die Vorschau ihr Ziehen loslassen und die 3D-Ansicht neu bauen.
  const anzeige = useMemo<SchichtkartenErgebnis | null>(() =>
    ergebnis && naehte && naehte.fuer === ergebnis
      ? {
          ...ergebnis,
          teilung: naehte.teilung,
          warnungen: [...ergebnis.warnungen, ...naehte.warnungen],
          // Die Laser-Reiter zeigen dann die Rohplatten, wie sie in den Export gehen.
          lagen: ergebnis.lagen.map((l) => ({ ...l, laserSvg: naehte.ansichten[l.key] ?? l.laserSvg })),
        }
      : ergebnis, [ergebnis, naehte]);

  return {
    anzeige,
    laeuft,
    fehler,
    rechnen: () => ergebnis && void rechnen(karte, ergebnis),
  };
}
