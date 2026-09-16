"use client";

import { useState } from "react";
import type { Kennzahlen, LagenKey, Schichtkarte, SchichtkartenErgebnis } from "@/engine/typen";
import { ZiehVorschau } from "./zieh-vorschau";

interface Props {
  ergebnis: SchichtkartenErgebnis | null;
  fehler: string | null;
  laedt: boolean;
  karte: Schichtkarte;
  aendern: (teil: Partial<Schichtkarte>) => void;
}

type Ansicht = "gesamt" | LagenKey;

function Kennzahl({ titel, wert }: { titel: string; wert: string }) {
  return (
    <div>
      <div style={{ color: "var(--gedaempft)" }}>{titel}</div>
      <div className="font-medium">{wert}</div>
    </div>
  );
}

export function Vorschau({ ergebnis, fehler, laedt, karte, aendern }: Props) {
  const [ansicht, setAnsicht] = useState<Ansicht>("gesamt");

  // Der Aufbau bestimmt, welche Lagen es gibt – die Reiter kommen aus dem Ergebnis.
  const lage = ergebnis?.lagen.find((l) => l.key === ansicht);
  const aktiv: Ansicht = ansicht !== "gesamt" && ergebnis && !lage ? "gesamt" : ansicht;
  const svg = aktiv === "gesamt" ? ergebnis?.vorschauSvg : lage?.laserSvg;
  const reiter: { key: Ansicht; titel: string }[] = [
    { key: "gesamt", titel: "Zusammengesetzt" },
    ...(ergebnis?.lagen ?? []).map((l) => ({ key: l.key as Ansicht, titel: l.titel })),
  ];

  const speichern = (inhalt: string, name: string) => {
    const url = URL.createObjectURL(new Blob([inhalt], { type: "image/svg+xml" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1">
        {reiter.map((r) => (
          <button
            key={r.key}
            onClick={() => setAnsicht(r.key)}
            className="rounded-md px-3 py-1.5 text-sm"
            style={
              aktiv === r.key
                ? { background: "var(--text)", color: "var(--grund)" }
                : { background: "var(--karte)", border: "1px solid var(--linie)" }
            }
          >
            {r.titel}
          </button>
        ))}
        {laedt && (
          <span className="ml-auto self-center text-xs" style={{ color: "var(--gedaempft)" }}>
            rechnet…
          </span>
        )}
      </div>

      <div className={`karte flex items-center justify-center p-6 ${aktiv === "gesamt" ? "" : "laser"}`}>
        {fehler ? (
          <p className="max-w-md text-sm text-red-700">{fehler}</p>
        ) : svg && ergebnis && aktiv === "gesamt" ? (
          <ZiehVorschau svg={svg} ergebnis={ergebnis} karte={karte} aendern={aendern} />
        ) : svg ? (
          <div
            className="w-full [&>svg]:mx-auto [&>svg]:h-auto [&>svg]:max-h-[78vh] [&>svg]:w-auto [&>svg]:max-w-full"
            // Die SVG kommt aus der eigenen Engine, nicht aus einer Fremdquelle.
            dangerouslySetInnerHTML={{ __html: svg }}
          />
        ) : (
          <p className="py-40 text-sm" style={{ color: "var(--gedaempft)" }}>
            rechnet die erste Karte…
          </p>
        )}
      </div>

      {ergebnis && (
        <div className="karte space-y-3 p-4 text-sm">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs" style={{ color: "var(--gedaempft)" }}>
            <span className="font-medium" style={{ color: "var(--text)" }}>
              Herzspitze {karte.lat.toFixed(5)}, {karte.lon.toFixed(5)}
            </span>
            {karte.kartenMitte && (
              <button type="button" className="underline" onClick={() => aendern({ kartenMitte: undefined })}>
                Karte wieder um das Herz zentrieren
              </button>
            )}
            <span>Karte ziehen verschiebt den Ausschnitt · Herz ziehen versetzt den Ort · Mausrad zoomt</span>
          </div>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <span style={{ color: "var(--gedaempft)" }}>
              Kartenfenster {ergebnis.layout.kartenfenster.breiteMm.toFixed(0)} ×{" "}
              {ergebnis.layout.kartenfenster.hoeheMm.toFixed(0)} mm · Ausschnitt{" "}
              {(ergebnis.ausschnittMeter.breite / 1000).toFixed(2)} × {(ergebnis.ausschnittMeter.hoehe / 1000).toFixed(2)} km ·{" "}
              {ergebnis.kennzahlen.rechenzeitMs} ms
            </span>
            {lage && (
              <button
                onClick={() => speichern(lage.laserSvg, `schichtkarte-${lage.key}.svg`)}
                className="rounded-md px-3 py-1.5 text-sm font-medium text-white"
                style={{ background: "var(--akzent)" }}
              >
                {lage.titel} als SVG speichern
              </button>
            )}
          </div>

          <table className="w-full text-xs">
            <thead style={{ color: "var(--gedaempft)" }}>
              <tr className="text-left">
                <th className="py-1 font-medium">Lage</th>
                <th className="py-1 font-medium">Material</th>
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
                  <td className="py-1 text-right">{l.teile.length}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <KennzahlenRaster kz={ergebnis.kennzahlen} />

          {ergebnis.warnungen.length > 0 && (
            <ul className="space-y-1 text-xs" style={{ color: "#9a5b12" }}>
              {ergebnis.warnungen.map((w, i) => (
                <li key={i}>· {w}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function KennzahlenRaster({ kz }: { kz: Kennzahlen }) {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs sm:grid-cols-4">
      <Kennzahl titel="Netz im Fenster" wert={`${Math.round(kz.netzAnteilFenster * 100)} %`} />
      <Kennzahl titel="Deckung vor Ort" wert={`${Math.round(kz.deckungVorOrt * 100)} %`} />
      <Kennzahl titel="Breitenfaktor" wert={`× ${(kz.formatfaktor * kz.dichtefaktor).toFixed(2)}`} />
      <Kennzahl titel="entspricht Zoom" wert={kz.zoomEntsprechung.toFixed(1)} />
      <Kennzahl titel="Bloecke zugefuellt" wert={String(kz.netzLoecherZugefuellt)} />
      <Kennzahl titel="lose → Gravur" wert={String(kz.loseZurGravur)} />
      <Kennzahl titel="Stencil-Stege" wert={String(kz.stencilStege)} />
      <Kennzahl titel="Innenflaechen zu" wert={String(kz.inselnZugefuellt)} />
      <Kennzahl titel="Wasserflaechen" wert={String(kz.wasserFlaechenGeschnitten)} />
      <Kennzahl titel="Inseln zu Wasser" wert={String(kz.wasserInselnGeflutet)} />
    </div>
  );
}
