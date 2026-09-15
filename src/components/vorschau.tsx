"use client";

import type { Entwurfsergebnis } from "@/engine/typen";

interface Props {
  ergebnis: Entwurfsergebnis | null;
  fehler: string | null;
  laedt: boolean;
}

export function Vorschau({ ergebnis, fehler, laedt }: Props) {
  const herunterladen = () => {
    if (!ergebnis) return;
    const blob = new Blob([ergebnis.svg], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "laserkarte.svg";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="karte relative flex min-h-[420px] items-center justify-center p-6">
        {laedt && (
          <div className="absolute right-4 top-4 text-xs" style={{ color: "var(--gedaempft)" }}>
            laedt Kacheln…
          </div>
        )}
        {fehler ? (
          <p className="max-w-md text-sm text-red-700">{fehler}</p>
        ) : ergebnis ? (
          <div
            className="max-h-[70vh] w-full [&>svg]:mx-auto [&>svg]:h-auto [&>svg]:max-h-[70vh] [&>svg]:w-auto [&>svg]:max-w-full"
            // Die SVG kommt aus der eigenen Engine, nicht aus einer Fremdquelle.
            dangerouslySetInnerHTML={{ __html: ergebnis.svg }}
          />
        ) : (
          <p className="text-sm" style={{ color: "var(--gedaempft)" }}>
            noch nichts gerendert
          </p>
        )}
      </div>

      {ergebnis && (
        <div className="karte p-4 text-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div style={{ color: "var(--gedaempft)" }}>
              Kartenfeld {ergebnis.layout.kartenfeld.breiteMm.toFixed(0)} ×{" "}
              {ergebnis.layout.kartenfeld.hoeheMm.toFixed(0)} mm · Ausschnitt{" "}
              {(ergebnis.ausschnittMeter.breite / 1000).toFixed(2)} ×{" "}
              {(ergebnis.ausschnittMeter.hoehe / 1000).toFixed(2)} km
            </div>
            <button
              onClick={herunterladen}
              className="rounded-md px-3 py-1.5 text-sm font-medium text-white"
              style={{ background: "var(--akzent)" }}
            >
              SVG speichern
            </button>
          </div>

          <table className="mt-3 w-full text-xs">
            <tbody>
              {ergebnis.statistik.map((s) => (
                <tr key={s.ebene} className="border-t" style={{ borderColor: "var(--linie)" }}>
                  <td className="py-1">{s.ebene}</td>
                  <td className="py-1" style={{ color: "var(--gedaempft)" }}>
                    {s.rolle}
                  </td>
                  <td className="py-1 text-right">{s.pfade} Pfade</td>
                </tr>
              ))}
            </tbody>
          </table>

          {ergebnis.warnungen.length > 0 && (
            <ul className="mt-3 space-y-1 text-xs" style={{ color: "#8a5a2b" }}>
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
