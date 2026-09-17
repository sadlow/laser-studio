"use client";

import { useEffect, useState } from "react";
import type { Schichtkarte } from "@/engine/typen";
import type { ExportErgebnis } from "@/server/export";
import type { Vorlage } from "@/server/vorlagen";
import { Block } from "./felder";
import type { Aenderung } from "./aenderung";

interface Props {
  karte: Schichtkarte;
  aendern: (teil: Aenderung) => void;
}

/**
 * Produktionsdaten exportieren, Vorlagen laden und speichern. Exportiert wird genau das, was links
 * eingestellt ist (Marcel 17.09.2026: "einfach einen Exportknopf" statt einer Auswahl von
 * Testexemplaren). Eine Vorlage ist das Produkt ohne Kundeneingabe – beim Laden bleiben Adresse,
 * Texte und Ort stehen.
 */
export function VorlagenExport({ karte, aendern }: Props) {
  const [vorlagen, setVorlagen] = useState<Vorlage[]>([]);
  const [gewaehlt, setGewaehlt] = useState("");
  const [name, setName] = useState("");
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
          vorlagenIds: [],
          aktuell: karte,
          kunde: karte.kunde,
          lon: karte.lon,
          lat: karte.lat,
          kartenMitte: karte.kartenMitte,
        }),
      });
      const d = await res.json();
      if (!res.ok) setMeldung(d.fehler);
      else setErgebnis(d as ExportErgebnis);
    } finally {
      setLaeuft(false);
    }
  };

  return (
    <Block
      titel="Export und Vorlagen"
      zu={false}
      hinweis="Produktionsdaten der Eingabe links: eine Laserdatei je Lage mit den Ebenen 1 Gravur, 2 Klebeflaeche, 3 Schnitt innen, 4 Schnitt aussen – dazu Vorschau, Parameter und Uebersicht fuer die Werkstatt."
    >
      <div className="space-y-3">
        <Knopf onClick={() => void exportieren()} aus={laeuft} voll>
          {laeuft ? "exportiert…" : "Produktionsdaten exportieren"}
        </Knopf>
        {ergebnis && <ExportBericht ergebnis={ergebnis} />}

        <div className="flex gap-2 border-t pt-3" style={{ borderColor: "var(--linie)" }}>
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

        {meldung && <p className="text-xs" style={{ color: "var(--gedaempft)" }}>{meldung}</p>}
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
        <div key={v.id} style={{ color: "var(--gedaempft)" }}>
          {v.dateien.length} Dateien · {v.lagen.map((l) => `${l.titel} (${l.teile})`).join(" · ")}
          {v.warnungen.length > 0 && <div>{v.warnungen.length} Hinweis{v.warnungen.length === 1 ? "" : "e"} in uebersicht.txt</div>}
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
