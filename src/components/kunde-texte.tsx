"use client";

import type { Kundeneingabe, Schichtkarte } from "@/engine/typen";
import { zeichenstand } from "@/engine/zeichen";
import { Block, Text, Wahl } from "./felder";
import type { Aenderung } from "./aenderung";

interface Props {
  karte: Schichtkarte;
  aendern: (teil: Aenderung) => void;
}

/**
 * Die drei Zeilen – dieselben Felder wie Family Motiv 8 "Zuhause Map"
 * (ETSY_FIELD_SPECS im Bulk-Script). Wer das Produkt spaeter auf Amazon listet,
 * fragt genau das ab. Hoechstlaengen: engine/zeichen.ts.
 */
export function KundeTexte({ karte, aendern }: Props) {
  const k = karte.kunde;
  const z = zeichenstand(karte);
  const setze = (teil: Partial<Kundeneingabe>) => aendern({ kunde: teil });
  return (
    <Block titel="Texte">
      <div className="space-y-3">
        <Text titel="Titel" wert={k.titel} maxLaenge={z.titel.feldMax} zaehler={z.titel} aendern={(v) => setze({ titel: v })} />
        <Text
          titel="Namen oder Freitext"
          wert={k.namen}
          maxLaenge={z.zeile1.feldMax}
          zaehler={z.zeile1}
          aendern={(v) => setze({ namen: v })}
        />
        <div className="space-y-2">
          <span className="beschriftung">Letzte Zeile</span>
          <Wahl<Kundeneingabe["letzteZeile"]>
            wert={k.letzteZeile}
            optionen={[{ wert: "koordinaten", titel: "Ort + Koordinaten" }, { wert: "wunschtext", titel: "Wunschtext" }]}
            aendern={(v) => setze({ letzteZeile: v })}
          />
          {k.letzteZeile === "koordinaten" ? (
            <>
              <Text
                titel="Ort vor den Koordinaten"
                wert={k.ortText}
                maxLaenge={z.zeile2.feldMax}
                zaehler={z.zeile2}
                aendern={(v) => setze({ ortText: v })}
              />
              <p className="text-xs" style={{ color: "var(--gedaempft)" }}>
                Die Koordinaten zaehlen mit – fuer den Ort bleiben {z.zeile2.feldMax} Zeichen.
              </p>
            </>
          ) : (
            <Text
              titel="Wunschtext"
              wert={k.wunschtext}
              maxLaenge={z.zeile2.feldMax}
              zaehler={z.zeile2}
              aendern={(v) => setze({ wunschtext: v })}
            />
          )}
        </div>
      </div>
    </Block>
  );
}
