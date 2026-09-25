"use client";

import { FORMATE } from "@/engine/formate";
import { standardLayoutWerte, zeilenGroesse } from "@/engine/poster-masse";
import { SYMBOL_TITEL, symbolPfad, type SymbolArt, type SymbolGroesse } from "@/engine/symbole";
import type { Aufbau, FormatKey, Holzrahmen, Kundeneingabe, Schichtkarte } from "@/engine/typen";
import { Block, Wahl } from "./felder";
import { STUFEN } from "./stufen-tabelle";
import type { Aenderung } from "./aenderung";

interface Props {
  karte: Schichtkarte;
  aendern: (teil: Aenderung) => void;
}

export const FORMAT_KURZ: Partial<Record<FormatKey, string>> = { a5: "A5", a4: "A4", a3: "A3", quadrat30: "30 × 30", quadrat60: "60 × 60" };

/** Groesser als das Laserfeld: aus zwei Rohplatten je Lage, darum nur mit Holzrahmen (Marcel 25.09.2026). */
export const NUR_MIT_RAHMEN: FormatKey[] = ["quadrat60"];

export const DESIGNS: { wert: Aufbau; titel: string; netz: string; grund: string; rahmen: string }[] = [
  { wert: "netz-weiss", titel: "Weiss auf Schwarz", netz: "#f6f5f1", grund: "#151515", rahmen: "#f6f5f1" },
  { wert: "netz-schwarz-dreilagig", titel: "Schwarz auf Weiss", netz: "#151515", grund: "#f6f5f1", rahmen: "#151515" },
  { wert: "netz-schwarz", titel: "Schwarz, weisser Rahmen", netz: "#151515", grund: "#f6f5f1", rahmen: "#f6f5f1" },
];

/** Kleines Abbild eines Aufbaus: Rahmen, Strassen, Fluss, Titelzeile. */
function DesignBild({ netz, grund, rahmen }: { netz: string; grund: string; rahmen: string }) {
  const text = rahmen === "#151515" ? "#f6f5f1" : "#151515";
  return (
    <svg viewBox="0 0 42 60" className="mx-auto h-16 w-auto rounded-sm shadow">
      <rect width="42" height="60" fill={rahmen} />
      <rect x="3" y="3" width="36" height="37" fill={grund} />
      <path d="M3 30 C 14 22, 22 36, 39 26" stroke="#5d97cf" strokeWidth="2" fill="none" />
      <path d="M3 12 H39 M3 24 H39 M13 3 V40 M28 3 V40 M3 38 L39 6" stroke={netz} strokeWidth="1.6" fill="none" />
      <path d="M12 47 c 4 -3, 8 3, 12 0 s 5 -2, 6 0" stroke={text} strokeWidth="0.9" fill="none" />
      <rect x="13" y="52" width="16" height="0.9" fill={text} />
      <rect x="10" y="55" width="22" height="0.9" fill={text} />
    </svg>
  );
}

const RAHMEN: { wert: Holzrahmen; titel: string; farbe?: string }[] = [
  { wert: "ohne", titel: "ohne" },
  { wert: "schwarz", titel: "schwarz", farbe: "#1d1c1a" },
  { wert: "weiss", titel: "weiss", farbe: "#f4f2ed" },
  { wert: "eiche", titel: "Eiche", farbe: "#b88e6f" },
  { wert: "dunkelbraun", titel: "dunkelbraun", farbe: "#4a3223" },
];

function SymbolBild({ art }: { art: SymbolArt }) {
  const p = symbolPfad(art);
  return (
    <svg viewBox={`-0.1 -0.1 1.2 ${p.hoehe + 0.2}`} className="mx-auto h-5 w-auto">
      <path d={p.d} fill="currentColor" fillRule="evenodd" />
    </svg>
  );
}

/**
 * Was der Kunde spaeter selbst waehlt (Marcel 16.09.2026): Design mit
 * Vorschaubild, Format, wie viele Strassen geschnitten werden, Standort-Symbol
 * und dessen Groesse. Technische Stellschrauben liegen rechts.
 */
export function KundeGestaltung({ karte, aendern }: Props) {
  const k = karte.kunde;
  const setze = (teil: Partial<Kundeneingabe>) => aendern({ kunde: teil });

  // Das Format bringt Lage und Groesse der Texte vom gleichnamigen Poster mit;
  // Schriften und Sperrung bleiben, wie sie eingestellt sind.
  const formatWaehlen = (format: FormatKey) => {
    const w = standardLayoutWerte(format);
    const rahmenPflicht = NUR_MIT_RAHMEN.includes(format) && (k.holzrahmen ?? "ohne") === "ohne";
    aendern({
      format,
      // Neue Plattengroesse, neue Naehte.
      teilungWahl: undefined,
      ...(rahmenPflicht ? { kunde: { holzrahmen: "schwarz" } } : {}),
      // Gross und geteilt: alle Lagen ausser dem Hintergrund auf Blau mindestens 3 mm (Marcel 25.09.2026).
      ...(NUR_MIT_RAHMEN.includes(format) ? { staerkenMm: { ...karte.staerkenMm, acryl: Math.max(3, karte.staerkenMm.acryl) } } : {}),
      layoutArt: w.layoutArt,
      kartenEndeAnteil: w.kartenEndeAnteil,
      titelMitteAnteil: w.titelMitteAnteil,
      zeile1MitteAnteil: w.zeile1MitteAnteil,
      zeile2MitteAnteil: w.zeile2MitteAnteil,
      titelStil: { ...karte.titelStil, hoeheAnteil: w.titelStil.hoeheAnteil },
      zeilenStil: { ...karte.zeilenStil, hoeheAnteil: zeilenGroesse(format, karte.zeilenStil.schrift).hoeheAnteil },
    });
  };

  return (
    <Block titel="Gestaltung">
      <div className="space-y-4">
        <div>
          <span className="beschriftung">Design</span>
          <div className="grid grid-cols-3 gap-2">
            {DESIGNS.map((d) => (
              <button
                key={d.wert}
                type="button"
                onClick={() => aendern({ aufbau: d.wert })}
                className="rounded-md border p-1.5 text-[11px] leading-tight"
                style={karte.aufbau === d.wert ? { borderColor: "var(--akzent)", boxShadow: "0 0 0 1px var(--akzent)" } : { borderColor: "var(--linie)" }}
              >
                <DesignBild {...d} />
                <span className="mt-1 block">{d.titel}</span>
              </button>
            ))}
          </div>
        </div>
        <div>
          <span className="beschriftung">Format</span>
          <Wahl<FormatKey>
            wert={karte.format}
            optionen={(Object.keys(FORMATE) as FormatKey[]).map((f) => ({ wert: f, titel: FORMAT_KURZ[f] ?? f }))}
            aendern={formatWaehlen}
          />
        </div>
        <div>
          <span className="beschriftung">Strassennetz</span>
          <Wahl wert={k.strassenStufe} spalten={1} optionen={STUFEN} aendern={(v) => setze({ strassenStufe: v })} />
        </div>
        <div>
          <span className="beschriftung">Standort-Symbol</span>
          <Wahl<SymbolArt>
            wert={k.symbol}
            optionen={(Object.keys(SYMBOL_TITEL) as SymbolArt[]).map((art) => ({ wert: art, titel: <span title={SYMBOL_TITEL[art]}><SymbolBild art={art} /></span> }))}
            aendern={(v) => setze({ symbol: v })}
          />
          <div className="mt-1">
            <Wahl<SymbolGroesse>
              wert={k.symbolGroesse}
              optionen={[{ wert: "klein", titel: "klein" }, { wert: "mittel", titel: "mittel" }, { wert: "gross", titel: "gross" }]}
              aendern={(v) => setze({ symbolGroesse: v })}
            />
          </div>
        </div>
        <div>
          <span className="beschriftung">Holzrahmen</span>
          <Wahl<Holzrahmen>
            wert={k.holzrahmen ?? "ohne"}
            optionen={RAHMEN.map((r) => ({
              wert: r.wert,
              aus: r.wert === "ohne" && NUR_MIT_RAHMEN.includes(karte.format) ? "60 × 60 gibt es nur mit Rahmen: er haelt die zwei Plattenhaelften zusammen." : undefined,
              titel: (
                <span className="inline-flex items-center gap-1.5">
                  {r.farbe && <span className="inline-block h-3 w-3 rounded-sm border" style={{ background: r.farbe, borderColor: "#8f8b83" }} />}
                  {r.titel}
                </span>
              ),
            }))}
            aendern={(v) => setze({ holzrahmen: v })}
          />
          {NUR_MIT_RAHMEN.includes(karte.format) && (
            <p className="mt-1 text-[11px]" style={{ color: "var(--gedaempft)" }}>
              60 × 60 nur mit Rahmen – jede Lage besteht aus zwei Platten.
            </p>
          )}
        </div>
      </div>
    </Block>
  );
}
