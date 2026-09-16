"use client";

import type { Kundeneingabe, Schichtkarte } from "@/engine/typen";
import { Block, Text, Wahl } from "./felder";
import type { Aenderung } from "./aenderung";

interface Props {
  karte: Schichtkarte;
  aendern: (teil: Aenderung) => void;
}

/**
 * Die drei Zeilen – dieselben Felder wie Family Motiv 8 "Zuhause Map"
 * (ETSY_FIELD_SPECS im Bulk-Script). Wer das Produkt spaeter auf Amazon listet,
 * fragt genau das ab.
 */
export function KundeTexte({ karte, aendern }: Props) {
  const k = karte.kunde;
  const setze = (teil: Partial<Kundeneingabe>) => aendern({ kunde: teil });
  return (
    <Block titel="Texte">
      <div className="space-y-3">
        <Text titel="Titel" wert={k.titel} aendern={(v) => setze({ titel: v })} />
        <Text titel="Namen oder Freitext" wert={k.namen} aendern={(v) => setze({ namen: v })} />
        <div className="space-y-2">
          <span className="beschriftung">Letzte Zeile</span>
          <Wahl<Kundeneingabe["letzteZeile"]>
            wert={k.letzteZeile}
            optionen={[{ wert: "koordinaten", titel: "Ort + Koordinaten" }, { wert: "wunschtext", titel: "Wunschtext" }]}
            aendern={(v) => setze({ letzteZeile: v })}
          />
          {k.letzteZeile === "koordinaten" ? (
            <Text titel="Ort vor den Koordinaten" wert={k.ortText} aendern={(v) => setze({ ortText: v })} />
          ) : (
            <Text titel="Wunschtext" wert={k.wunschtext} aendern={(v) => setze({ wunschtext: v })} />
          )}
        </div>
      </div>
    </Block>
  );
}
