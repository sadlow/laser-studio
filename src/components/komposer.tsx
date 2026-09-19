"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import type { LagenKey, Schichtkarte, SchichtkartenErgebnis } from "@/engine/typen";
import { ZiehVorschau } from "./zieh-vorschau";

// three.js braucht das Fenster – nur im Browser laden, erst wenn der Reiter offen ist.
const Ansicht3D = dynamic(() => import("./ansicht-3d").then((m) => m.Ansicht3D), { ssr: false });
import type { Aenderung } from "./aenderung";

interface Props {
  ergebnis: SchichtkartenErgebnis | null;
  fehler: string | null;
  laedt: boolean;
  /** Die letzte Rechnung wurde abgebrochen – die Vorschau zeigt den Stand davor. */
  abgebrochen: boolean;
  abbrechen: () => void;
  neuRechnen: () => void;
  karte: Schichtkarte;
  aendern: (teil: Aenderung) => void;
}

type Ansicht = "gesamt" | "3d" | LagenKey;

/**
 * Das grosse Arbeitsfeld in der Mitte: zusammengesetzte Karte zum Anfassen,
 * daneben jede Lage als Laseransicht. Kennzahlen und Hinweise stehen rechts.
 */
export function Komposer({ ergebnis, fehler, laedt, abgebrochen, abbrechen, neuRechnen, karte, aendern }: Props) {
  const [ansicht, setAnsicht] = useState<Ansicht>("gesamt");
  // ?ansicht=3d oeffnet direkt die 3D-Ansicht (fuer Tests und geteilte Links).
  useEffect(() => {
    const wunsch = new URLSearchParams(window.location.search).get("ansicht");
    if (wunsch) setAnsicht(wunsch as Ansicht);
  }, []);

  // Die Wahl steht in der URL: neu laden oeffnet dieselbe Ansicht (die 3D-Ansicht schreibt ihre Einstellungen dazu).
  const waehle = (a: Ansicht) => {
    setAnsicht(a);
    const url = new URL(window.location.href);
    if (a === "gesamt") url.searchParams.delete("ansicht");
    else url.searchParams.set("ansicht", a);
    window.history.replaceState(null, "", url);
  };

  // Der Aufbau bestimmt, welche Lagen es gibt – die Reiter kommen aus dem Ergebnis.
  const lage = ergebnis?.lagen.find((l) => l.key === ansicht);
  const aktiv: Ansicht = ansicht !== "gesamt" && ansicht !== "3d" && ergebnis && !lage ? "gesamt" : ansicht;
  const svg = aktiv === "gesamt" ? ergebnis?.vorschauSvg : lage?.laserSvg;
  const reiter: { key: Ansicht; titel: string }[] = [
    { key: "gesamt", titel: "Zusammengesetzt" },
    ...(ergebnis?.lagen ?? []).map((l) => ({ key: l.key as Ansicht, titel: l.titel })),
    { key: "3d", titel: "3D" },
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
            onClick={() => waehle(r.key)}
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

      <div className={`karte relative flex min-h-0 flex-1 items-center justify-center ${aktiv === "3d" ? "p-0" : "p-4"} ${aktiv === "gesamt" || aktiv === "3d" ? "" : "laser"}`}>
        {/* Waehrend gerechnet wird, wird das Bild unscharf: man sieht sofort, dass es nicht der neue Stand ist. */}
        <div className={`flex h-full min-h-0 w-full items-center justify-center transition duration-200 ${laedt ? "opacity-60 blur-[3px]" : ""}`}>
        {fehler ? (
          <p className="max-w-md text-sm text-red-700">{fehler}</p>
        ) : ergebnis && aktiv === "3d" ? (
          <Ansicht3D ergebnis={ergebnis} />
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
            {abgebrochen ? "Berechnung abgebrochen." : "rechnet die erste Karte…"}
          </p>
        )}
        </div>
        {laedt && <Rechnet abbrechen={abbrechen} />}
        {!laedt && abgebrochen && (
          <div className="absolute inset-x-0 top-3 flex justify-center">
            <div className="flex items-center gap-3 rounded-lg px-4 py-2 text-sm shadow" style={{ background: "var(--karte)", border: "1px solid var(--linie)" }}>
              <span>Abgebrochen – die Vorschau zeigt den letzten Stand.</span>
              <button onClick={neuRechnen} className="whitespace-nowrap rounded-md px-3 py-1 font-medium text-white" style={{ background: "var(--akzent)" }}>
                Neu berechnen
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs" style={{ color: "var(--gedaempft)" }}>
        {aktiv === "gesamt" ? (
          <>
            <span className="font-medium" style={{ color: "var(--text)" }}>
              Symbol-Anker {karte.lat.toFixed(5)}, {karte.lon.toFixed(5)}
            </span>
            <span>Karte ziehen verschiebt den Ausschnitt · Symbol ziehen versetzt den Ort · Plus/Minus zoomt · „Standort zentrieren" holt das Herz in die Mitte</span>
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

/**
 * Ladezeichen ueber der unscharfen Vorschau, mit Abbrechen. Die Karte darunter bleibt bedienbar: wer weiterzieht
 * oder tippt, ueberholt die laufende Rechnung.
 */
function Rechnet({ abbrechen }: { abbrechen: () => void }) {
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
      <div className="pointer-events-auto flex items-center gap-3 rounded-lg px-4 py-3 text-sm shadow-lg" style={{ background: "var(--karte)", border: "1px solid var(--linie)" }}>
        <span className="h-5 w-5 animate-spin rounded-full border-2" style={{ borderColor: "var(--linie)", borderTopColor: "var(--akzent)" }} />
        <span className="whitespace-nowrap">Karte wird berechnet …</span>
        <button onClick={abbrechen} className="whitespace-nowrap rounded-md px-3 py-1" style={{ border: "1px solid var(--linie)" }}>
          Abbrechen
        </button>
      </div>
    </div>
  );
}
