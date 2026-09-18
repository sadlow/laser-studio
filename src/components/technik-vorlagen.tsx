"use client";

import { useEffect, useState } from "react";
import type { Schichtkarte } from "@/engine/typen";
import type { Vorlage } from "@/server/vorlagen";
import { Block, Knopf } from "./felder";
import type { Aenderung } from "./aenderung";

interface Props {
  karte: Schichtkarte;
  aendern: (teil: Aenderung) => void;
}

/**
 * Vorlagen laden und speichern. Eine Vorlage ist das Produkt ohne Kundeneingabe – beim Laden bleiben
 * Adresse, Texte, Ort und die Kundenwahl (Strassen, Symbol, Rahmen) stehen. Vom Export getrennt
 * (Marcel 17.09.2026): neben dem Exportknopf sah "Vorlage waehlen – Laden" wie ein Pflichtschritt aus.
 */
export function TechnikVorlagen({ karte, aendern }: Props) {
  const [vorlagen, setVorlagen] = useState<Vorlage[]>([]);
  const [gewaehlt, setGewaehlt] = useState("");
  const [name, setName] = useState("");
  const [meldung, setMeldung] = useState<string | null>(null);

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
    setMeldung(`"${v.name}" geladen – Texte, Ort und Kundenwahl bleiben.`);
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

  return (
    <Block
      titel="Vorlagen"
      zu={true}
      hinweis="Eine Vorlage haelt Format, Design und alle Technik-Werte fest, ohne Texte, Ort und Kundenwahl. Laden ersetzt diese Werte. Fuer den Export ist keine Vorlage noetig."
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
        {meldung && <p className="text-xs" style={{ color: "var(--gedaempft)" }}>{meldung}</p>}
      </div>
    </Block>
  );
}
