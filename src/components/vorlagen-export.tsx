"use client";

import { useEffect, useState } from "react";
import type { Schichtkarte } from "@/engine/typen";
import type { ExportErgebnis } from "@/server/export";
import type { Vorlage } from "@/server/vorlagen";
import { Block } from "./felder";

interface Props {
  karte: Schichtkarte;
  aendern: (teil: Partial<Schichtkarte>) => void;
}

/**
 * Vorlagen laden und speichern, Testexemplare exportieren. Eine Vorlage ist das
 * Produkt ohne Kundeneingabe – beim Laden bleiben Adresse, Texte und Ort stehen.
 */
export function VorlagenExport({ karte, aendern }: Props) {
  const [vorlagen, setVorlagen] = useState<Vorlage[]>([]);
  const [gewaehlt, setGewaehlt] = useState("");
  const [name, setName] = useState("");
  const [markiert, setMarkiert] = useState<Set<string>>(new Set());
  const [aktuellMit, setAktuellMit] = useState(false);
  const [laeuft, setLaeuft] = useState(false);
  const [meldung, setMeldung] = useState<string | null>(null);
  const [ergebnis, setErgebnis] = useState<ExportErgebnis | null>(null);

  useEffect(() => {
    fetch("/api/vorlagen")
      .then((r) => r.json())
      .then((d) => setVorlagen(d.vorlagen ?? []));
  }, []);

  const laden = () => {
    const v = vorlagen.find((x) => x.id === gewaehlt);
    if (!v) return;
    aendern({ ...v.karte });
    setName(v.name);
    setMeldung(`"${v.name}" geladen – Adresse und Texte bleiben.`);
  };

  const speichern = async () => {
    const res = await fetch("/api/vorlagen", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, karte }),
    });
    const d = await res.json();
    if (!res.ok) return setMeldung(d.fehler);
    setVorlagen(d.vorlagen);
    setGewaehlt(d.vorlage.id);
    setMeldung(`Gespeichert als vorlagen/${d.vorlage.id}.json`);
  };

  const exportieren = async () => {
    setLaeuft(true);
    setErgebnis(null);
    setMeldung(null);
    try {
      const res = await fetch("/api/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vorlagenIds: [...markiert],
          aktuell: aktuellMit ? karte : undefined,
          kunde: karte.kunde,
          lon: karte.lon,
          lat: karte.lat,
        }),
      });
      const d = await res.json();
      if (!res.ok) setMeldung(d.fehler);
      else setErgebnis(d as ExportErgebnis);
    } finally {
      setLaeuft(false);
    }
  };

  const umschalten = (id: string) =>
    setMarkiert((alt) => {
      const neu = new Set(alt);
      if (neu.has(id)) neu.delete(id);
      else neu.add(id);
      return neu;
    });

  const anzahl = markiert.size + (aktuellMit ? 1 : 0);

  return (
    <Block
      titel="Vorlagen und Export"
      hinweis="Export je Variante: eine Laserdatei pro Lage mit den Ebenen 1 Gravur, 2 Schnitt innen, 3 Schnitt aussen – dazu Vorschau, Parameter und Uebersicht. Es gilt die Kundeneingabe oben."
    >
      <div className="space-y-3">
        <div className="flex gap-2">
          <select className="feld" value={gewaehlt} onChange={(e) => setGewaehlt(e.target.value)}>
            <option value="">Vorlage waehlen…</option>
            {vorlagen.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </select>
          <Knopf onClick={laden} aus={!gewaehlt}>
            Laden
          </Knopf>
        </div>
        <div className="flex gap-2">
          <input className="feld" value={name} placeholder="Name fuer diesen Entwurf" onChange={(e) => setName(e.target.value)} />
          <Knopf onClick={() => void speichern()} aus={!name.trim()}>
            Speichern
          </Knopf>
        </div>

        <div className="space-y-1 border-t pt-3" style={{ borderColor: "var(--linie)" }}>
          <span className="beschriftung">Testexemplare exportieren</span>
          {vorlagen.map((v) => (
            <label key={v.id} className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={markiert.has(v.id)} onChange={() => umschalten(v.id)} />
              {v.name}
            </label>
          ))}
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={aktuellMit} onChange={(e) => setAktuellMit(e.target.checked)} />
            Aktueller Entwurf (auch ungespeichert)
          </label>
        </div>
        <Knopf onClick={() => void exportieren()} aus={laeuft || anzahl === 0} voll>
          {laeuft ? "exportiert…" : `${anzahl} Variante${anzahl === 1 ? "" : "n"} exportieren`}
        </Knopf>

        {meldung && <p className="text-xs" style={{ color: "var(--gedaempft)" }}>{meldung}</p>}
        {ergebnis && <ExportBericht ergebnis={ergebnis} />}
      </div>
    </Block>
  );
}

function ExportBericht({ ergebnis }: { ergebnis: ExportErgebnis }) {
  const oeffnen = () =>
    fetch("/api/export/oeffnen", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ordner: ergebnis.ordner }),
    });
  return (
    <div className="space-y-2 rounded-md p-3 text-xs" style={{ background: "var(--grund)" }}>
      <div className="break-all font-medium">{ergebnis.ordner}</div>
      <Knopf onClick={() => void oeffnen()}>Ordner oeffnen</Knopf>
      {ergebnis.varianten.map((v) => (
        <div key={v.id}>
          <div className="font-medium">{v.name}</div>
          <div style={{ color: "var(--gedaempft)" }}>
            {v.lagen.map((l) => `${l.titel} (${l.teile})`).join(" · ")}
          </div>
        </div>
      ))}
    </div>
  );
}

function Knopf(props: { onClick: () => void; aus?: boolean; voll?: boolean; children: React.ReactNode }) {
  return (
    <button
      onClick={props.onClick}
      disabled={props.aus}
      className={`shrink-0 rounded-md px-3 py-1.5 text-sm text-white disabled:opacity-40 ${props.voll ? "w-full" : ""}`}
      style={{ background: "var(--akzent)" }}
    >
      {props.children}
    </button>
  );
}
