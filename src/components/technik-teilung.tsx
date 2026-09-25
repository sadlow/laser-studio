"use client";

import type { Naht, Schichtkarte, SchichtkartenErgebnis } from "@/engine/typen";
import { Block } from "./felder";
import type { Aenderung } from "./aenderung";

const RICHTUNG = { "oben-unten": "oben/unten", "links-rechts": "links/rechts" } as const;

function Zahlen({ n }: { n: Naht }) {
  return (
    <span style={{ color: "var(--gedaempft)" }}>
      {n.uebergaenge} Uebergaenge · {n.kritisch} kritisch · {n.einzelteile} Einzelteil{n.einzelteile === 1 ? "" : "e"}
      {n.kleine ? ` (${n.kleine} klein)` : ""}
    </span>
  );
}

/**
 * Geteilte Karte (60 x 60, Marcel 25.09.2026): je Lage die Naht, die die Engine gewaehlt hat, mit ihren Zahlen, und
 * die naechstbesten zum Umwaehlen. Punkte = Uebergaenge + kritische + 4 je Einzelteil (kleine doppelt) – kleiner ist
 * sauberer. Die Wahl gehoert zur Bestellung und geht in den Export und den Montageplan.
 */
export function TechnikTeilung({ ergebnis, karte, aendern }: { ergebnis: SchichtkartenErgebnis | null; karte: Schichtkarte; aendern: (teil: Aenderung) => void }) {
  const t = ergebnis?.teilung;
  if (!t) return null;
  const waehle = (key: string, n: Naht | null) => {
    const wahl = { ...karte.teilungWahl };
    if (n) wahl[key as keyof typeof wahl] = { richtung: n.richtung, posMm: n.posMm };
    else delete wahl[key as keyof typeof wahl];
    aendern({ teilungWahl: Object.keys(wahl).length ? wahl : undefined });
  };

  return (
    <Block
      titel="Teilung"
      zu={false}
      hinweis={`Rohplatte ${t.rohplatte.breiteMm} × ${t.rohplatte.hoeheMm} mm, Naht zwischen ${t.bandMm[0]} und ${t.bandMm[1]} mm. ` +
        "Die Front wird immer oben/unten geteilt. Blau kommt ungeteilt im Rohformat" +
        (t.gehrung?.length ? ", die weisse Deckschicht als vier Leisten mit Gehrung auf einem Bogen" : "") +
        ". Der Export legt je Lage zwei Dateien und einen Montageplan (PDF) ab."}
    >
      <div className="space-y-4 text-xs">
        {t.lagen.map((l) => (
          <div key={l.key} data-teilung={l.key} className="space-y-1.5">
            <div className="flex items-baseline justify-between gap-2">
              <span className="font-medium">{l.titel}{l.front ? " (Front)" : ""}</span>
              {l.gewaehlt.manuell && (
                <button type="button" className="underline" style={{ color: "var(--akzent)" }} onClick={() => waehle(l.key, null)}>
                  automatisch
                </button>
              )}
            </div>
            <div className="rounded-md p-2" style={{ background: "var(--grund)" }}>
              <div className="font-medium">
                {RICHTUNG[l.gewaehlt.richtung]} bei {l.gewaehlt.posMm} mm · {l.gewaehlt.punkte} Punkte
                {l.gewaehlt.manuell ? " · von Hand" : " · beste"}
              </div>
              <Zahlen n={l.gewaehlt} />
            </div>
            {l.alternativen.length > 0 && (
              <div className="space-y-1">
                {l.alternativen.map((n) => (
                  <button
                    key={`${n.richtung}-${n.posMm}`}
                    type="button"
                    onClick={() => waehle(l.key, n)}
                    className="block w-full rounded-md border px-2 py-1 text-left"
                    style={{ borderColor: "var(--linie)", background: "var(--karte)" }}
                  >
                    <span className="font-medium">{RICHTUNG[n.richtung]} bei {n.posMm} mm · {n.punkte} Punkte</span>
                    <br />
                    <Zahlen n={n} />
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </Block>
  );
}
