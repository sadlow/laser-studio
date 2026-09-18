"use client";

import { feinsteGraviert } from "@/engine/dichte";
import type { Generalisierung, Nachruecken, StrassenStufe, StufenWerte } from "@/engine/typen";

export const STUFEN: { wert: StrassenStufe; titel: string }[] = [
  { wert: "viel", titel: "Viele Strassen geschnitten" },
  { wert: "ausgewogen", titel: "Ausgewogen" },
  { wert: "wenig", titel: "Wenig geschnitten, viel Gravur" },
];

const NACHRUECKEN: Nachruecken[] = ["nie", "licht", "immer"];

/** Was jede Kundenstufe bedeutet – Teil der Vorlage, nicht der Bestellung. */
export function StufenTabelle({ gen, setzeGen }: { gen: Generalisierung; setzeGen: (teil: Partial<Generalisierung>) => void }) {
  const setze = (stufe: StrassenStufe, teil: Partial<StufenWerte>) =>
    setzeGen({ stufen: { ...gen.stufen, [stufe]: { ...gen.stufen[stufe], ...teil } } });
  return (
    // Feste Spalten: mit fuenf Spalten drueckte die Stufenbezeichnung das Zielfeld auf 18 px zusammen.
    <table className="w-full table-fixed text-xs">
      <colgroup>
        <col />
        <col className="w-12" />
        <col className="w-12" />
        <col className="w-[70px]" />
        <col className="w-10" />
      </colgroup>
      <thead style={{ color: "var(--gedaempft)" }}>
        <tr className="text-left align-bottom">
          <th className="py-1 font-medium">Stufe</th>
          <th className="py-1 font-medium">Ziel %</th>
          <th className="py-1 font-medium">Auf&shy;dicken x</th>
          <th className="py-1 font-medium">Nach&shy;ruecken</th>
          <th className="py-1 font-medium" title="So viele der feinsten Netzklassen graviert die Stufe immer">Gra&shy;viert</th>
        </tr>
      </thead>
      <tbody>
        {STUFEN.map(({ wert, titel }) => (
          <tr key={wert}>
            <td className="truncate py-0.5 pr-2" title={titel}>{wert}</td>
            <td className="py-0.5 pr-1">
              <input type="number" className="feld" step={1} min={5} value={Math.round(gen.stufen[wert].zielDeckung * 100)}
                onChange={(e) => setze(wert, { zielDeckung: Number(e.target.value) / 100 })} />
            </td>
            <td className="py-0.5 pr-1">
              <input type="number" className="feld" step={0.05} min={1} value={gen.stufen[wert].maxAufdickung}
                onChange={(e) => setze(wert, { maxAufdickung: Number(e.target.value) })} />
            </td>
            <td className="py-0.5 pr-1">
              <select className="feld" value={gen.stufen[wert].nachruecken}
                onChange={(e) => setze(wert, { nachruecken: e.target.value as Nachruecken })}>
                {NACHRUECKEN.map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </td>
            <td className="py-0.5">
              <input type="number" className="feld" step={1} min={0} max={3} value={feinsteGraviert(gen, wert)}
                onChange={(e) => setze(wert, { feinsteGraviert: Math.max(0, Math.round(Number(e.target.value))) })} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
