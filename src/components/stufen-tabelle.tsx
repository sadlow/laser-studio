"use client";

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
    <table className="w-full text-xs">
      <thead style={{ color: "var(--gedaempft)" }}>
        <tr className="text-left">
          <th className="py-1 font-medium">Stufe</th>
          <th className="py-1 font-medium">Ziel %</th>
          <th className="py-1 font-medium">Aufdicken x</th>
          <th className="py-1 font-medium">Nachruecken</th>
        </tr>
      </thead>
      <tbody>
        {STUFEN.map(({ wert, titel }) => (
          <tr key={wert}>
            <td className="py-0.5 pr-2">{titel}</td>
            <td className="w-16 py-0.5 pr-1">
              <input type="number" className="feld" step={1} min={5} value={Math.round(gen.stufen[wert].zielDeckung * 100)}
                onChange={(e) => setze(wert, { zielDeckung: Number(e.target.value) / 100 })} />
            </td>
            <td className="w-16 py-0.5 pr-1">
              <input type="number" className="feld" step={0.05} min={1} value={gen.stufen[wert].maxAufdickung}
                onChange={(e) => setze(wert, { maxAufdickung: Number(e.target.value) })} />
            </td>
            <td className="w-20 py-0.5">
              <select className="feld" value={gen.stufen[wert].nachruecken}
                onChange={(e) => setze(wert, { nachruecken: e.target.value as Nachruecken })}>
                {NACHRUECKEN.map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
