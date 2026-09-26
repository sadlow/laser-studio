"use client";

import type { Kennzahlen, SchichtkartenErgebnis } from "@/engine/typen";
import { Block } from "./felder";

function Kennzahl({ titel, wert }: { titel: string; wert: string }) {
  return (
    <div>
      <div style={{ color: "var(--gedaempft)" }}>{titel}</div>
      <div className="font-medium">{wert}</div>
    </div>
  );
}

function KennzahlenRaster({ kz }: { kz: Kennzahlen }) {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
      <Kennzahl titel="Netz im Fenster" wert={`${Math.round(kz.netzAnteilFenster * 100)} %`} />
      <Kennzahl titel="Deckung vor Ort" wert={`${Math.round(kz.deckungVorOrt * 100)} %`} />
      <Kennzahl titel="Breitenfaktor" wert={`× ${(kz.breitenfaktor ?? kz.formatfaktor * kz.dichtefaktor).toFixed(2)}`} />
      <Kennzahl titel="entspricht Zoom" wert={kz.zoomEntsprechung.toFixed(1)} />
      <Kennzahl titel="Bloecke zugefuellt" wert={String(kz.netzLoecherZugefuellt)} />
      <Kennzahl titel="Querverbindungen" wert={String(kz.querverbindungen ?? 0)} />
      <Kennzahl titel="lose → Gravur" wert={String(kz.loseZurGravur)} />
      <Kennzahl titel="Stencil-Stege" wert={String(kz.stencilStege)} />
      <Kennzahl titel="Innenflaechen zu" wert={String(kz.inselnZugefuellt)} />
      <Kennzahl titel="Schrift verstaerkt" wert={kz.schriftZugabeMm ? `+${kz.schriftZugabeMm.toFixed(2)} mm Strich` : "nein"} />
      <Kennzahl titel="Wasserflaechen" wert={String(kz.wasserFlaechenGeschnitten)} />
      <Kennzahl titel="Inseln zu Wasser" wert={String(kz.wasserInselnGeflutet)} />
      <Kennzahl titel="Symbol ueber Netz" wert={`${kz.symbolUeberNetzMm >= 0 ? "+" : ""}${kz.symbolUeberNetzMm.toFixed(1)} mm`} />
      <Kennzahl titel="Rand im Holzrahmen" wert={`${kz.randImRahmenMm.toFixed(1)} mm`} />
      {/* Weg = was der Laser als Mittellinie abfaehrt; Flaeche = was er als Fuellung rastert. */}
      <Kennzahl titel="Gravurweg" wert={`${(kz.gravurWegM ?? 0).toFixed(1)} m`} />
      <Kennzahl titel="Gravurflaeche" wert={`${((kz.gravurFlaecheMm2 ?? 0) / 100).toFixed(1)} cm²`} />
    </div>
  );
}

/** Was der Prototypenbau wissen muss: Lagen und Teile, Kennzahlen, Hinweise. */
export function TechnikPruefung({ ergebnis }: { ergebnis: SchichtkartenErgebnis | null }) {
  if (!ergebnis) return null;
  const f = ergebnis.layout.kartenfenster;
  return (
    <Block titel="Pruefung" zu={false}>
      <div className="space-y-3 text-sm">
        {ergebnis.warnungen.length > 0 && (
          <ul className="space-y-1 rounded-md p-2 text-xs" style={{ color: "#8a4b0a", background: "#fbf1e4" }}>
            {ergebnis.warnungen.map((w, i) => (
              <li key={i}>· {w}</li>
            ))}
          </ul>
        )}
        <p className="text-xs" style={{ color: "var(--gedaempft)" }}>
          Kartendaten: {ergebnis.kartenQuelle?.startsWith("protomaps") ? "eigenes Archiv (OpenStreetMap, Protomaps)" : "Mapbox"} ·
          Kartenfenster {f.breiteMm.toFixed(0)} × {f.hoeheMm.toFixed(0)} mm · Ausschnitt{" "}
          {(ergebnis.ausschnittMeter.breite / 1000).toFixed(2)} × {(ergebnis.ausschnittMeter.hoehe / 1000).toFixed(2)} km
        </p>
        <table className="w-full text-xs">
          <thead style={{ color: "var(--gedaempft)" }}>
            <tr className="text-left">
              <th className="py-1 font-medium">Lage</th>
              <th className="py-1 font-medium">Material</th>
              <th className="py-1 text-right font-medium">mm</th>
              <th className="py-1 text-right font-medium">Teile</th>
            </tr>
          </thead>
          <tbody>
            {ergebnis.lagen.map((l) => (
              <tr key={l.key} className="border-t" style={{ borderColor: "var(--linie)" }}>
                <td className="py-1">{l.titel}</td>
                <td className="py-1" style={{ color: "var(--gedaempft)" }}>
                  {l.material}
                </td>
                <td className="py-1 text-right">{l.staerkeMm}</td>
                <td className="py-1 text-right">{l.teile.length}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <KennzahlenRaster kz={ergebnis.kennzahlen} />
      </div>
    </Block>
  );
}
