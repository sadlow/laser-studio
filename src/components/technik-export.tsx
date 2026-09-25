"use client";

import { useState } from "react";
import { masseAusFormat } from "@/engine/formate";
import { HOLZRAHMEN_TITEL } from "@/engine/holzrahmen";
import { SYMBOL_TITEL } from "@/engine/symbole";
import type { Schichtkarte } from "@/engine/typen";
import { letzteZeileText } from "@/engine/zeichen";
import type { ExportErgebnis } from "@/server/export";
import { Block, Knopf } from "./felder";
import { DESIGNS, FORMAT_KURZ } from "./kunde-gestaltung";
import { STUFEN } from "./stufen-tabelle";

/**
 * Produktionsdaten exportieren – genau die Auswahl der Kundensimulation links (Marcel 17.09.2026:
 * "die aktuelle Auswahl soll im Export landen"). Die Zusammenfassung ueber dem Knopf zeigt, was in
 * die Dateien geht; Vorlagen liegen in einem eigenen Block und sind fuer den Export nicht noetig.
 */
export function TechnikExport({ karte }: { karte: Schichtkarte }) {
  const [laeuft, setLaeuft] = useState(false);
  const [fehler, setFehler] = useState<string | null>(null);
  const [ergebnis, setErgebnis] = useState<{ bericht: ExportErgebnis; stand: string } | null>(null);

  const exportieren = async () => {
    setLaeuft(true);
    setErgebnis(null);
    setFehler(null);
    const stand = JSON.stringify(karte);
    try {
      const res = await fetch("/api/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vorlagenIds: [], aktuell: karte, kunde: karte.kunde, lon: karte.lon, lat: karte.lat, kartenMitte: karte.kartenMitte }),
      });
      const d = await res.json();
      if (!res.ok) setFehler(d.fehler);
      else setErgebnis({ bericht: d as ExportErgebnis, stand });
    } catch (e) {
      setFehler(e instanceof Error ? e.message : String(e));
    } finally {
      setLaeuft(false);
    }
  };

  return (
    <Block
      titel="Export"
      zu={false}
      hinweis="Je Lage eine Laserdatei mit den Ebenen 1 Gravur, 2 Klebeflaeche, 3 Schnitt innen, 4 Schnitt aussen – dazu Vorschau, Parameter und Uebersicht fuer die Werkstatt. Bei 60 × 60 je Lage zwei Dateien (Haelfte A und B) und montageplan.pdf."
    >
      <div className="space-y-3">
        <Auswahl karte={karte} />
        <Knopf onClick={() => void exportieren()} aus={laeuft} voll>
          {laeuft ? "exportiert…" : "Produktionsdaten exportieren"}
        </Knopf>
        {fehler && <p className="text-xs text-red-700">{fehler}</p>}
        {ergebnis && <ExportBericht ergebnis={ergebnis.bericht} veraltet={ergebnis.stand !== JSON.stringify(karte)} />}
      </div>
    </Block>
  );
}

/** Was exportiert wird, in den Worten der Kundensimulation. */
function Auswahl({ karte }: { karte: Schichtkarte }) {
  const k = karte.kunde;
  const { breiteMm, hoeheMm } = masseAusFormat(karte.format, karte.breiteMm, karte.hoeheMm);
  const zeilen: [string, string][] = [
    ["Texte", [k.titel.trim(), k.namen.trim(), letzteZeileText(karte)].filter(Boolean).join(" · ") || "ohne"],
    ["Ort", `${karte.lat.toFixed(5)}, ${karte.lon.toFixed(5)}${karte.kartenMitte ? " (Karte verschoben)" : ""}`],
    ["Design", `${DESIGNS.find((d) => d.wert === karte.aufbau)?.titel ?? karte.aufbau} · ${FORMAT_KURZ[karte.format] ?? `${breiteMm} × ${hoeheMm} mm`}`],
    ["Strassen", STUFEN.find((s) => s.wert === k.strassenStufe)?.titel ?? k.strassenStufe],
    ["Symbol", `${SYMBOL_TITEL[k.symbol]}, ${k.symbolGroesse}`],
    ["Holzrahmen", HOLZRAHMEN_TITEL[k.holzrahmen ?? "ohne"]],
  ];
  return (
    <div className="rounded-md p-3 text-xs" style={{ background: "var(--grund)" }}>
      <p className="mb-1.5 font-medium">Exportiert wird die Auswahl links:</p>
      <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-0.5">
        {zeilen.map(([titel, wert]) => (
          <div key={titel} className="contents">
            <dt style={{ color: "var(--gedaempft)" }}>{titel}</dt>
            <dd className="break-words">{wert}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function ExportBericht({ ergebnis, veraltet }: { ergebnis: ExportErgebnis; veraltet: boolean }) {
  const oeffnen = () =>
    fetch("/api/export/oeffnen", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ordner: ergebnis.ordner }),
    });
  return (
    <div className="space-y-2 rounded-md p-3 text-xs" style={{ background: "var(--grund)" }}>
      <div className="break-all font-medium">{ergebnis.ordner}</div>
      <Knopf onClick={() => void oeffnen()}>Ordner oeffnen</Knopf>
      {ergebnis.varianten.map((v) => (
        <div key={v.id} style={{ color: "var(--gedaempft)" }}>
          {v.dateien.length} Dateien · {v.lagen.map((l) => `${l.titel} (${l.teile})`).join(" · ")}
          {v.warnungen.length > 0 && <div>{v.warnungen.length} Hinweis{v.warnungen.length === 1 ? "" : "e"} in uebersicht.txt</div>}
        </div>
      ))}
      {veraltet && <p style={{ color: "#8a4b0a" }}>Die Auswahl links hat sich seitdem geaendert – fuer den neuen Stand erneut exportieren.</p>}
    </div>
  );
}
