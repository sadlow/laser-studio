"use client";

import { useState } from "react";
import type { LagenKey, SchichtkartenErgebnis } from "@/engine/typen";

interface Props {
  ergebnis: SchichtkartenErgebnis | null;
  fehler: string | null;
  laedt: boolean;
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

export function Vorschau({ ergebnis, fehler, laedt }: Props) {
  const [ansicht, setAnsicht] = useState<Ansicht>("gesamt");

  const lage = ergebnis?.lagen.find((l) => l.key === ansicht);
  const svg = ansicht === "gesamt" ? ergebnis?.vorschauSvg : lage?.laserSvg;

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
        {(["gesamt", "herz", "weiss", "schwarz", "blau"] as Ansicht[]).map((a) => (
          <button
            key={a}
            onClick={() => setAnsicht(a)}
            className="rounded-md px-3 py-1.5 text-sm"
            style={
              ansicht === a
                ? { background: "var(--text)", color: "var(--grund)" }
                : { background: "var(--karte)", border: "1px solid var(--linie)" }
            }
          >
            {a === "gesamt" ? "Zusammengesetzt" : (ergebnis?.lagen.find((l) => l.key === a)?.titel ?? a)}
          </button>
        ))}
        {laedt && (
          <span className="ml-auto self-center text-xs" style={{ color: "var(--gedaempft)" }}>
            rechnet…
          </span>
        )}
      </div>

      <div className={`karte flex items-center justify-center p-6 ${ansicht === "gesamt" ? "" : "laser"}`}>
        {fehler ? (
          <p className="max-w-md text-sm text-red-700">{fehler}</p>
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

          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs sm:grid-cols-4">
            <Kennzahl titel="Weiss im Fenster" wert={`${Math.round(ergebnis.kennzahlen.weissAnteilFenster * 100)} %`} />
            <Kennzahl titel="Formatfaktor" wert={`× ${ergebnis.kennzahlen.formatfaktor.toFixed(2)}`} />
            <Kennzahl titel="entspricht Zoom" wert={ergebnis.kennzahlen.zoomEntsprechung.toFixed(1)} />
            <Kennzahl titel="Bloecke zugefuellt" wert={String(ergebnis.kennzahlen.netzLoecherZugefuellt)} />
            <Kennzahl titel="Stencil-Stege" wert={String(ergebnis.kennzahlen.stencilStege)} />
            <Kennzahl titel="Innenflaechen zu" wert={String(ergebnis.kennzahlen.inselnZugefuellt)} />
            <Kennzahl titel="Wasserflaechen" wert={String(ergebnis.kennzahlen.wasserFlaechenGeschnitten)} />
            <Kennzahl titel="lose Netzstuecke" wert={String(ergebnis.kennzahlen.weissLoseImNetz)} />
          </div>

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
