"use client";

import { MOTIV_TITEL, type Motiv } from "./motive-3d";

/** Seitenverhaeltnisse, die der Leonardo-Skill erzeugen kann – 16:9 und 9:16 fuer Videos. */
export const SEITEN = ["4:3", "3:4", "1:1", "16:9", "9:16"] as const;
export type Seiten = (typeof SEITEN)[number];

export const seitenZahl = (s: Seiten) => {
  const [breit, hoch] = s.split(":").map(Number);
  return breit / hoch;
};

const an = { background: "var(--akzent)", borderColor: "var(--akzent)", color: "#fff" };
const aus = { background: "var(--karte)", borderColor: "var(--linie)" };

interface Props {
  auseinander: boolean;
  umschalten: () => void;
  motiv: Motiv;
  motive: Motiv[];
  setzeMotiv: (m: Motiv) => void;
  seiten: Seiten;
  setzeSeiten: (s: Seiten) => void;
  speichern: () => void;
  zuruecksetzen: () => void;
}

/** Knoepfe oben rechts in der 3D-Ansicht. Seitenverhaeltnis und Speichern nur bei Fotomotiven. */
export function Leiste3D(p: Props) {
  const knopf = "rounded-md border px-2.5 py-1 shadow-sm";
  return (
    <div className="absolute top-3 right-3 flex flex-wrap justify-end gap-1.5 text-xs">
      <button type="button" onClick={p.umschalten} className={knopf} style={p.auseinander ? an : aus}>
        Lagen auseinander
      </button>
      <select value={p.motiv} onChange={(e) => p.setzeMotiv(e.target.value as Motiv)} className={knopf} style={p.motiv === "frei" ? aus : an} aria-label="Motiv">
        {p.motive.map((m) => (
          <option key={m} value={m} style={{ color: "#000", background: "#fff" }}>
            {MOTIV_TITEL[m]}
          </option>
        ))}
      </select>
      {p.motiv !== "frei" && (
        <>
          <select value={p.seiten} onChange={(e) => p.setzeSeiten(e.target.value as Seiten)} className={knopf} style={aus} aria-label="Seitenverhaeltnis">
            {SEITEN.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <button type="button" className={knopf} style={aus} onClick={p.speichern}>
            Referenzbild speichern
          </button>
        </>
      )}
      <button type="button" onClick={p.zuruecksetzen} className={knopf} style={aus}>
        Ansicht zuruecksetzen
      </button>
    </div>
  );
}
