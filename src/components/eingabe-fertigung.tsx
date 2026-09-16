"use client";

import type { Schichtkarte, StrassenGruppe, StrassenZiel } from "@/engine/typen";
import { Block, Haken, Zahl } from "./felder";

interface Props {
  karte: Schichtkarte;
  aendern: (teil: Partial<Schichtkarte>) => void;
}

const ZIELE: { wert: StrassenZiel; titel: string }[] = [
  { wert: "netz", titel: "Weiss (Netz)" },
  { wert: "gravur", titel: "Gravur" },
  { wert: "aus", titel: "aus" },
];

export function EingabeStrassen({ karte, aendern }: Props) {
  const setze = (id: string, teil: Partial<StrassenGruppe>) =>
    aendern({ strassen: karte.strassen.map((g) => (g.id === id ? { ...g, ...teil } : g)) });

  return (
    <Block
      titel="Strassen"
      hinweis="Breiten gelten fuer A4 und wachsen mit dem Format. Weiss = Acrylstreifen in der obersten Lage. Gravur = heller Strich auf Schwarz. Tunnel werden nie gezeichnet, Bruecken immer."
    >
      <div className="mb-3 grid grid-cols-2 gap-3">
        <Zahl
          titel="Netz mindestens"
          einheit="mm"
          schritt={0.05}
          min={0.3}
          wert={karte.netzMinBreiteMm}
          aendern={(v) => aendern({ netzMinBreiteMm: v })}
        />
        <Zahl
          titel="Kleine Bloecke weiss unter"
          einheit="mm²"
          schritt={0.5}
          min={0}
          wert={karte.netzMinLochMm2}
          aendern={(v) => aendern({ netzMinLochMm2: v })}
        />
      </div>
      <div className="space-y-1.5">
        {karte.strassen.map((g) => (
          <div key={g.id} className="grid grid-cols-[1fr_112px_76px] items-center gap-2">
            <span className="truncate text-sm" title={g.klassen.join(", ")}>
              {g.titel}
            </span>
            <select className="feld" value={g.ziel} onChange={(e) => setze(g.id, { ziel: e.target.value as StrassenZiel })}>
              {ZIELE.map((z) => (
                <option key={z.wert} value={z.wert}>
                  {z.titel}
                </option>
              ))}
            </select>
            <label className="flex items-center gap-1 text-xs" style={{ color: "var(--gedaempft)" }}>
              <input
                type="number"
                className="feld"
                step={0.05}
                min={0.1}
                disabled={g.ziel === "aus"}
                value={g.breiteMm}
                onChange={(e) => setze(g.id, { breiteMm: Number(e.target.value) })}
              />
              mm
            </label>
          </div>
        ))}
      </div>
    </Block>
  );
}

export function EingabeFertigung({ karte, aendern }: Props) {
  return (
    <Block
      titel="Fertigung"
      hinweis="Kleine Innenflaechen wuerde ein Steg ganz ueberdecken. Sie werden zugefuellt: aus dem ° wird ein Punkt. Bezug ist die Schriftgroesse der Zeile – Gradzeichen 1,3 %, obere 8 2,9 %, A 4,3 %."
    >
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Zahl titel="Stencil-Steg" einheit="mm" schritt={0.1} min={0} wert={karte.stegMm} aendern={(v) => aendern({ stegMm: v })} />
          <Zahl
            titel="Zufuellen unter"
            einheit="%"
            schritt={0.1}
            min={0}
            wert={Math.round(karte.stencilMinInselAnteil * 1000) / 10}
            aendern={(v) => aendern({ stencilMinInselAnteil: v / 100 })}
          />
        </div>
        <Haken titel="Wasserflaechen aus Schwarz schneiden" wert={karte.wasser} aendern={(v) => aendern({ wasser: v })} />
        {karte.wasser && (
          <div className="grid grid-cols-2 gap-3 pl-6">
            <Zahl
              titel="Wasser min."
              einheit="mm²"
              schritt={1}
              min={0}
              wert={karte.wasserMinFlaecheMm2}
              aendern={(v) => aendern({ wasserMinFlaecheMm2: v })}
            />
            <div className="self-end">
              <Haken titel="Fluesse als Linie" wert={karte.wasserlaeufe} aendern={(v) => aendern({ wasserlaeufe: v })} />
            </div>
          </div>
        )}
        <Haken
          titel="Lose Teile orange markieren"
          wert={karte.loseTeileMarkieren}
          aendern={(v) => aendern({ loseTeileMarkieren: v })}
        />
      </div>
    </Block>
  );
}
