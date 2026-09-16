"use client";

import { useState } from "react";
import { leseKoordinaten } from "@/engine/geo";
import type { Schichtkarte } from "@/engine/typen";
import { Block, Wahl } from "./felder";
import type { Aenderung } from "./aenderung";

interface Props {
  karte: Schichtkarte;
  aendern: (teil: Aenderung) => void;
}

type Modus = "adresse" | "koordinaten";

/**
 * Wo die Karte hinzeigt: Adresse suchen oder Dezimal-Koordinaten aus Google
 * Maps einfuegen (Marcel 16.09.2026). Beides setzt den Ort (Symbol-Anker),
 * zentriert die Karte neu und traegt den Ortsnamen vor den Koordinaten ein.
 */
export function KundeStandort({ karte, aendern }: Props) {
  const k = karte.kunde;
  const [modus, setModus] = useState<Modus>("adresse");
  const [koordinaten, setKoordinaten] = useState("");
  const [laeuft, setLaeuft] = useState(false);
  const [meldung, setMeldung] = useState<{ text: string; fehler?: boolean } | null>(null);

  const setzeOrt = (lon: number, lat: number, stadt: string, adresse?: string) =>
    aendern({ lon, lat, kartenMitte: undefined, kunde: { ...(stadt ? { ortText: stadt } : {}), ...(adresse ? { adresse } : {}) } });

  const abfragen = async (url: string) => {
    setLaeuft(true);
    setMeldung(null);
    try {
      const res = await fetch(url);
      const d = await res.json();
      return res.ok ? d : (setMeldung({ text: d.fehler ?? "Nicht gefunden", fehler: true }), null);
    } finally {
      setLaeuft(false);
    }
  };

  const suchen = async () => {
    const d = await abfragen(`/api/ort?q=${encodeURIComponent(k.adresse)}`);
    if (!d) return;
    setzeOrt(d.lon, d.lat, d.stadt);
    setMeldung({ text: d.adresse });
  };

  const uebernehmen = async () => {
    const p = leseKoordinaten(koordinaten);
    if (!p) return setMeldung({ text: "Zwei Zahlen erwartet, Breite zuerst – z. B. 52.51640, 13.33750", fehler: true });
    const d = await abfragen(`/api/ort?lon=${p.lon}&lat=${p.lat}`);
    setzeOrt(p.lon, p.lat, d?.stadt ?? "", d?.adresse || undefined);
    setMeldung({ text: d?.adresse ? `in der Naehe: ${d.adresse}` : "Ort gesetzt" });
  };

  return (
    <Block titel="Standort">
      <div className="space-y-2">
        <Wahl<Modus>
          wert={modus}
          optionen={[{ wert: "adresse", titel: "Adresse" }, { wert: "koordinaten", titel: "Koordinaten" }]}
          aendern={(v) => { setModus(v); setMeldung(null); }}
        />
        {/* Formular statt onKeyDown: Enter loest dann zuverlaessig die Suche aus. */}
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void (modus === "adresse" ? suchen() : uebernehmen());
          }}
        >
          {modus === "adresse" ? (
            <input className="feld" value={k.adresse} placeholder="Strasse, Ort" onChange={(e) => aendern({ kunde: { adresse: e.target.value } })} />
          ) : (
            <input className="feld" value={koordinaten} placeholder="52.51640, 13.33750" onChange={(e) => setKoordinaten(e.target.value)} />
          )}
          <button
            type="submit"
            disabled={laeuft || !(modus === "adresse" ? k.adresse : koordinaten).trim()}
            className="shrink-0 rounded-md px-3 text-sm text-white disabled:opacity-50"
            style={{ background: "var(--akzent)" }}
          >
            {laeuft ? "…" : modus === "adresse" ? "Suchen" : "Setzen"}
          </button>
        </form>
        <p className="text-xs" style={{ color: meldung?.fehler ? "#b3261e" : "var(--gedaempft)" }}>
          {meldung ? `${meldung.text} · ` : ""}
          {karte.lat.toFixed(5)}, {karte.lon.toFixed(5)}
        </p>
      </div>
    </Block>
  );
}
