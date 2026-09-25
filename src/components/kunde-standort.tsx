"use client";

import { useEffect, useRef, useState } from "react";
import { leseOrt, type Ortsvorschlag } from "@/engine/orte";
import type { Schichtkarte } from "@/engine/typen";
import { Block } from "./felder";
import type { Aenderung } from "./aenderung";

interface Props {
  karte: Schichtkarte;
  aendern: (teil: Aenderung) => void;
}

/**
 * Wo die Karte hinzeigt – wie im Baseline Customizer (Marcel 25.09.2026): ein Feld fuer Adresse oder Koordinaten,
 * Vorschlaege beim Tippen aus Photon (OpenStreetMap), Treffer fett, Rest grau. Dezimalgrad, Grad/Minuten/Sekunden und
 * kopierte Google-Maps-Adressen liest das Feld selbst (engine/orte.ts). Antwortet Photon nicht, sucht die alte
 * Mapbox-Suche (`/api/ort`). Jede Wahl setzt den Ort (Symbol-Anker), zentriert die Karte und traegt den Ortsnamen
 * vor den Koordinaten ein.
 */
export function KundeStandort({ karte, aendern }: Props) {
  const k = karte.kunde;
  const [vorschlaege, setVorschlaege] = useState<Ortsvorschlag[]>([]);
  const [offen, setOffen] = useState(false);
  const [meldung, setMeldung] = useState<{ text: string; fehler?: boolean } | null>(null);
  const [photonWeg, setPhotonWeg] = useState(false);
  const lauf = useRef<AbortController | null>(null);

  // Vorschlaege 350 ms nach dem letzten Tastendruck, wie im Customizer.
  useEffect(() => {
    const q = k.adresse.trim();
    if (!offen || q.length < 3 || leseOrt(q)) return setVorschlaege([]);
    const uhr = window.setTimeout(async () => {
      lauf.current?.abort();
      const abbruch = new AbortController();
      lauf.current = abbruch;
      try {
        const res = await fetch(`/api/orte?q=${encodeURIComponent(q)}&lang=de`, { signal: abbruch.signal });
        const d = await res.json();
        // Eine aeltere Suche, die spaeter ankommt, darf die Liste der aktuellen Eingabe nicht ueberschreiben.
        if (abbruch.signal.aborted || lauf.current !== abbruch) return;
        if (!res.ok) throw new Error(d.fehler);
        setVorschlaege(d.vorschlaege ?? []);
        setPhotonWeg(false);
        setMeldung(null);
      } catch {
        if (!abbruch.signal.aborted) setPhotonWeg(true);
      }
    }, 350);
    return () => window.clearTimeout(uhr);
  }, [k.adresse, offen]);

  const setze = (lon: number, lat: number, adresse: string, stadt: string) => {
    aendern({ lon, lat, kartenMitte: undefined, kunde: { adresse, ...(stadt ? { ortText: stadt } : {}) } });
    setOffen(false);
    setVorschlaege([]);
  };
  const waehle = (v: Ortsvorschlag) => {
    setze(v.lon, v.lat, [v.name, v.zusatz].filter(Boolean).join(", "), v.stadt);
    setMeldung(null);
  };

  const absenden = async () => {
    const text = k.adresse.trim();
    const ort = leseOrt(text);
    if (ort) {
      // Koordinaten: der Ort bleibt genau dort, nur der Name fuer die letzte Zeile wird gesucht.
      const stadt = await fetch(`/api/orte?lon=${ort.lon}&lat=${ort.lat}`)
        .then((r) => r.json())
        .then((d) => (d.ort as Ortsvorschlag | null)?.stadt ?? "")
        .catch(() => "");
      setze(ort.lon, ort.lat, text, stadt);
      return setMeldung({ text: stadt ? `Koordinaten gesetzt, in ${stadt}` : "Koordinaten gesetzt" });
    }
    if (vorschlaege[0]) return waehle(vorschlaege[0]);
    if (text.length < 3) return setMeldung({ text: "Bitte mindestens drei Zeichen.", fehler: true });
    // Rueckfall: die bisherige Mapbox-Suche, ein Treffer.
    const res = await fetch(`/api/ort?q=${encodeURIComponent(text)}`);
    const d = await res.json();
    if (!res.ok) return setMeldung({ text: d.fehler ?? "Kein Ort gefunden.", fehler: true });
    setze(d.lon, d.lat, d.adresse || text, d.stadt);
    setMeldung({ text: `${d.adresse} (Mapbox, Photon nicht erreichbar)` });
  };

  return (
    <Block titel="Standort">
      <div className="space-y-2">
        {/* Formular: Enter nimmt Koordinaten oder den ersten Vorschlag. */}
        <form onSubmit={(e) => { e.preventDefault(); void absenden(); }}>
          <input
            className="feld"
            value={k.adresse}
            placeholder="Strasse, Ort oder Koordinaten"
            aria-label="Ort"
            autoComplete="off"
            onChange={(e) => { aendern({ kunde: { adresse: e.target.value } }); setOffen(true); }}
            onFocus={() => setOffen(true)}
          />
        </form>
        {offen && vorschlaege.length > 0 && (
          <ul className="overflow-hidden rounded-md border text-xs" style={{ borderColor: "var(--linie)", background: "var(--karte)" }} role="listbox">
            {vorschlaege.map((v, i) => (
              <li key={`${v.lat},${v.lon},${i}`} className="border-t first:border-t-0" style={{ borderColor: "var(--linie)" }}>
                <button type="button" className="block w-full px-3 py-2 text-left hover:bg-black/5" onClick={() => waehle(v)}>
                  <strong className="block text-sm font-medium">{v.name}</strong>
                  {v.zusatz && <span style={{ color: "var(--gedaempft)" }}>{v.zusatz}</span>}
                </button>
              </li>
            ))}
          </ul>
        )}
        <p className="text-xs" style={{ color: meldung?.fehler ? "#b3261e" : "var(--gedaempft)" }}>
          {photonWeg ? "Photon nicht erreichbar – Enter sucht ueber Mapbox · " : ""}
          {meldung ? `${meldung.text} · ` : ""}
          {karte.lat.toFixed(5)}, {karte.lon.toFixed(5)}
        </p>
      </div>
    </Block>
  );
}
