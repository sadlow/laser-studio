"use client";

import type { SchichtkartenErgebnis } from "@/engine/typen";
import { ABSTAND_MAX_MM } from "./explosion-3d";
import { HINTERGRUND_TITEL, type Hintergrund } from "./hintergrund-3d";
import { STIMMUNG_TITEL, type Stimmung } from "./licht-3d";
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
  abstand: number;
  setzeAbstand: (mm: number) => void;
  hintergrund: Hintergrund;
  setzeHintergrund: (h: Hintergrund) => void;
  beschriftung: boolean;
  setzeBeschriftung: (an: boolean) => void;
  motiv: Motiv;
  motive: Motiv[];
  setzeMotiv: (m: Motiv) => void;
  stimmung: Stimmung;
  setzeStimmung: (s: Stimmung) => void;
  seiten: Seiten;
  setzeSeiten: (s: Seiten) => void;
  speichern: () => void;
  zuruecksetzen: () => void;
}

/** Knoepfe oben rechts in der 3D-Ansicht. Seitenverhaeltnis und Speichern nur bei Fotomotiven. */
export function Leiste3D(p: Props) {
  const knopf = "rounded-md border px-2.5 py-1 shadow-sm";
  return (
    <div className="absolute top-3 right-3 left-3 flex flex-wrap justify-end gap-1.5 text-xs">
      <label className={`${knopf} flex items-center gap-2`} style={p.abstand > 0 ? an : aus}>
        Lagen auseinander
        <input type="range" min={0} max={ABSTAND_MAX_MM} step={1} value={p.abstand} className="w-28" style={{ accentColor: p.abstand > 0 ? "#fff" : undefined }}
          onChange={(e) => p.setzeAbstand(Number(e.target.value))} aria-label="Abstand der Lagen" />
        <span className="w-12 text-right tabular-nums">{p.abstand} mm</span>
      </label>
      <select value={p.motiv} onChange={(e) => p.setzeMotiv(e.target.value as Motiv)} className={knopf} style={p.motiv === "frei" ? aus : an} aria-label="Motiv">
        {p.motive.map((m) => (
          <option key={m} value={m} style={{ color: "#000", background: "#fff" }}>
            {MOTIV_TITEL[m]}
          </option>
        ))}
      </select>
      <select value={p.stimmung} onChange={(e) => p.setzeStimmung(e.target.value as Stimmung)} className={knopf} style={p.stimmung === "studio" ? aus : an} aria-label="Licht">
        {(Object.keys(STIMMUNG_TITEL) as Stimmung[]).map((st) => (
          <option key={st} value={st} style={{ color: "#000", background: "#fff" }}>
            {STIMMUNG_TITEL[st]}
          </option>
        ))}
      </select>
      <select value={p.hintergrund} onChange={(e) => p.setzeHintergrund(e.target.value as Hintergrund)} className={knopf} style={p.hintergrund === "hell" ? aus : an} aria-label="Hintergrund">
        {(Object.keys(HINTERGRUND_TITEL) as Hintergrund[]).map((h) => (
          <option key={h} value={h} style={{ color: "#000", background: "#fff" }}>
            {HINTERGRUND_TITEL[h]}
          </option>
        ))}
      </select>
      <button type="button" onClick={() => p.setzeBeschriftung(!p.beschriftung)} className={knopf} style={p.beschriftung ? an : aus}>
        Beschriftung
      </button>
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

/** Bedienung und Aufbau unten links in der freien Ansicht. */
export function Hinweis3D({ ergebnis }: { ergebnis: SchichtkartenErgebnis }) {
  const r = ergebnis.rahmen;
  return (
    <p className="pointer-events-none absolute bottom-3 left-3 text-xs" style={{ color: "var(--gedaempft)" }}>
      Ziehen dreht · Rad zoomt · rechte Maustaste verschiebt · {ergebnis.lagen.map((l) => `${l.titel} ${l.staerkeMm} mm`).join(" · ")}
      {" "}· Symbol auf dem Hintergrund, {ergebnis.kennzahlen.symbolUeberNetzMm.toFixed(1)} mm ueber dem Netz
      {r && ` · Holzrahmen ${r.farbe}, ${r.breiteMm} × ${r.tiefeMm} mm, Bild ${r.einlassMm} mm tief`}
    </p>
  );
}
