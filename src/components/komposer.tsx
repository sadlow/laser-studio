"use client";

import { useState } from "react";
import type { LagenKey, Schichtkarte, SchichtkartenErgebnis } from "@/engine/typen";
import { ZiehVorschau } from "./zieh-vorschau";
import type { Aenderung } from "./aenderung";

interface Props {
  ergebnis: SchichtkartenErgebnis | null;
  fehler: string | null;
  laedt: boolean;
  karte: Schichtkarte;
  aendern: (teil: Aenderung) => void;
}

type Ansicht = "gesamt" | LagenKey;

/**
 * Das grosse Arbeitsfeld in der Mitte: zusammengesetzte Karte zum Anfassen,
 * daneben jede Lage als Laseransicht. Kennzahlen und Hinweise stehen rechts.
 */
export function Komposer({ ergebnis, fehler, laedt, karte, aendern }: Props) {
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
    <div className="flex h-full min-h-0 flex-col gap-3">
      <div className="flex flex-wrap items-center gap-1">
        {reiter.map((r) => (
          <button
            key={r.key}
            onClick={() => setAnsicht(r.key)}
            className="rounded-md px-3 py-1.5 text-sm"
            style={aktiv === r.key ? { background: "var(--text)", color: "var(--grund)" } : { background: "var(--karte)", border: "1px solid var(--linie)" }}
          >
            {r.titel}
          </button>
        ))}
        <span className="ml-auto text-xs" style={{ color: "var(--gedaempft)" }}>
          {laedt ? "rechnet…" : ergebnis ? `${ergebnis.kennzahlen.rechenzeitMs} ms` : ""}
        </span>
      </div>

      <div className={`karte flex min-h-0 flex-1 items-center justify-center p-4 ${aktiv === "gesamt" ? "" : "laser"}`}>
        {fehler ? (
          <p className="max-w-md text-sm text-red-700">{fehler}</p>
        ) : svg && ergebnis && aktiv === "gesamt" ? (
          <ZiehVorschau svg={svg} ergebnis={ergebnis} karte={karte} aendern={aendern} />
        ) : svg ? (
          <div
            className="w-full [&>svg]:mx-auto [&>svg]:h-auto [&>svg]:max-h-[calc(100vh-9rem)] [&>svg]:w-auto [&>svg]:max-w-full"
            // Die SVG kommt aus der eigenen Engine, nicht aus einer Fremdquelle.
            dangerouslySetInnerHTML={{ __html: svg }}
          />
        ) : (
          <p className="text-sm" style={{ color: "var(--gedaempft)" }}>
            rechnet die erste Karte…
          </p>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs" style={{ color: "var(--gedaempft)" }}>
        {aktiv === "gesamt" ? (
          <>
            <span className="font-medium" style={{ color: "var(--text)" }}>
              Symbol-Anker {karte.lat.toFixed(5)}, {karte.lon.toFixed(5)}
            </span>
            {karte.kartenMitte && (
              <button type="button" className="underline" onClick={() => aendern({ kartenMitte: undefined })}>
                Karte wieder um das Symbol zentrieren
              </button>
            )}
            <span>Karte ziehen verschiebt den Ausschnitt · Symbol ziehen versetzt den Ort · Plus/Minus zoomt</span>
          </>
        ) : (
          lage && (
            <button
              onClick={() => speichern(lage.laserSvg, `schichtkarte-${lage.key}.svg`)}
              className="rounded-md px-3 py-1.5 text-sm font-medium text-white"
              style={{ background: "var(--akzent)" }}
            >
              {lage.titel} als SVG speichern
            </button>
          )
        )}
      </div>
    </div>
  );
}
