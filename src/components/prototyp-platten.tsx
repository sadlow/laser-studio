"use client";

import { useEffect, useState } from "react";
import type { Schichtkarte } from "@/engine/typen";
import type { Vorlage } from "@/server/vorlagen";
import { Block } from "./felder";

interface Props {
  karte: Schichtkarte;
}

interface Platte {
  key: string;
  titel: string;
  plaetze: number;
}

interface Ergebnis {
  ordner: string;
  dateien: { datei: string; material: string; lage: string }[];
  plaetze: { kennung: string; warnungen: string[] }[];
}

const VARIATIONEN = [
  { wert: "keine", titel: "nichts – gleiche Exemplare" },
  { wert: "ausschnittKm", titel: "Ausschnitt (km)" },
  { wert: "stegMm", titel: "Stegbreite (mm)" },
] as const;

/**
 * Testreihe auf einer Rohplatte: eine Vorlage, je Platz ein anderer Wert fuer
 * genau einen Parameter. So testet eine A4-Platte zwei Zoomstufen oder zwei
 * Stegbreiten nebeneinander, mit derselben Kundeneingabe.
 */
export function PrototypPlatten({ karte }: Props) {
  const [platten, setPlatten] = useState<Platte[]>([]);
  const [vorlagen, setVorlagen] = useState<Vorlage[]>([]);
  const [platte, setPlatte] = useState("a4-zwei");
  const [vorlageId, setVorlageId] = useState("");
  const [variation, setVariation] = useState<(typeof VARIATIONEN)[number]["wert"]>("ausschnittKm");
  const [werte, setWerte] = useState<number[]>([2.5, 5]);
  const [laeuft, setLaeuft] = useState(false);
  const [fehler, setFehler] = useState<string | null>(null);
  const [ergebnis, setErgebnis] = useState<Ergebnis | null>(null);

  useEffect(() => {
    fetch("/api/bogen").then((r) => r.json()).then((d) => setPlatten(d.platten ?? []));
    fetch("/api/vorlagen").then((r) => r.json()).then((d) => setVorlagen(d.vorlagen ?? []));
  }, []);

  const plaetze = platten.find((p) => p.key === platte)?.plaetze ?? 1;

  const erzeugen = async () => {
    setLaeuft(true);
    setFehler(null);
    setErgebnis(null);
    try {
      const res = await fetch("/api/bogen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platte, vorlageId, variation, werte: werte.slice(0, plaetze), kunde: karte.kunde, lon: karte.lon, lat: karte.lat, kartenMitte: karte.kartenMitte }),
      });
      const d = await res.json();
      if (!res.ok) setFehler(d.fehler);
      else setErgebnis(d as Ergebnis);
    } finally {
      setLaeuft(false);
    }
  };

  return (
    <Block
      titel="Prototyp-Platten"
      zu={true}
      hinweis="Je Material eine Laserdatei mit allen Exemplaren nebeneinander. A4 traegt zwei Prototypen 145 × 205 mm (98 % von A5, mit Rand – zwei echte A5 laegen auf der Plattenkante)."
    >
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <select className="feld" value={platte} onChange={(e) => setPlatte(e.target.value)}>
            {platten.map((p) => <option key={p.key} value={p.key}>{p.titel}</option>)}
          </select>
          <select className="feld" value={vorlageId} onChange={(e) => setVorlageId(e.target.value)}>
            <option value="">Vorlage waehlen…</option>
            {vorlagen.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-[1fr_repeat(2,72px)] items-end gap-2">
          <label className="block">
            <span className="beschriftung">Variieren</span>
            <select className="feld" value={variation} onChange={(e) => setVariation(e.target.value as typeof variation)}>
              {VARIATIONEN.map((v) => <option key={v.wert} value={v.wert}>{v.titel}</option>)}
            </select>
          </label>
          {variation !== "keine" &&
            Array.from({ length: plaetze }, (_, i) => (
              <label key={i} className="block">
                <span className="beschriftung">Platz {i + 1}</span>
                <input type="number" step={0.05} className="feld" value={werte[i] ?? ""}
                  onChange={(e) => setWerte((alt) => Object.assign([...alt], { [i]: Number(e.target.value) }))} />
              </label>
            ))}
        </div>
        <button
          onClick={() => void erzeugen()}
          disabled={laeuft || !vorlageId}
          className="w-full rounded-md px-3 py-1.5 text-sm text-white disabled:opacity-40"
          style={{ background: "var(--akzent)" }}
        >
          {laeuft ? "erzeugt Platten…" : "Platten erzeugen"}
        </button>
        {fehler && <p className="text-xs text-red-700">{fehler}</p>}
        {ergebnis && (
          <div className="space-y-1 rounded-md p-3 text-xs" style={{ background: "var(--grund)" }}>
            <div className="break-all font-medium">{ergebnis.ordner}</div>
            {ergebnis.dateien.map((d) => <div key={d.datei}>{d.datei} – {d.material}</div>)}
            {ergebnis.plaetze.map((p, i) => (
              <div key={i} style={{ color: "var(--gedaempft)" }}>
                Platz {i + 1} ({p.kennung}): {p.warnungen.length ? p.warnungen.join(" ") : "keine Hinweise"}
              </div>
            ))}
          </div>
        )}
      </div>
    </Block>
  );
}
