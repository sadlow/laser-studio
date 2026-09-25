"use client";

import { KANTEN_SCHRIFTEN } from "@/engine/standard";
import type { KantenLayout, Schichtkarte } from "@/engine/typen";
import { Auswahl, Zahl } from "./felder";
import type { Aenderung } from "./aenderung";

const schriften = KANTEN_SCHRIFTEN.map((datei) => ({ wert: datei, titel: datei.replace(/\.(otf|ttf)$/i, "") }));

/**
 * Masse des Layouts "Titel auf der Kante" (kante.ts): Rand, Titelgroesse und -breite, Graben, Zeile im Rand. Wo der
 * Titel und die Zeile stehen, waehlt der Kunde links unter Gestaltung.
 */
export function EingabeKante({ karte, aendern }: { karte: Schichtkarte; aendern: (teil: Aenderung) => void }) {
  const kt = karte.kante;
  const setze = (teil: Partial<KantenLayout>) => aendern({ kante: { ...kt, ...teil } });
  const H = karte.format === "quadrat60" ? 600 : karte.format === "quadrat30" ? 300 : null;
  const mm = (anteil: number) => (H ? ` = ${(anteil * H).toFixed(1)} mm` : "");
  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="col-span-2">
        <Auswahl titel="Titelschrift (Versalien)" wert={kt.titelSchrift} optionen={schriften} aendern={(v) => setze({ titelSchrift: v })} />
      </div>
      <Zahl titel={`Titel hoechstens${mm(kt.titelVersalAnteil)}`} einheit="% Hoehe" schritt={0.1} min={1} wert={r(kt.titelVersalAnteil * 100)} aendern={(v) => setze({ titelVersalAnteil: v / 100 })} />
      <Zahl titel={`Titel breit hoechstens${mm(kt.titelMaxBreiteAnteil)}`} einheit="% Breite" schritt={1} min={5} wert={r(kt.titelMaxBreiteAnteil * 100)} aendern={(v) => setze({ titelMaxBreiteAnteil: v / 100 })} />
      <Zahl titel="Sperrung Titel" einheit="em" schritt={0.01} wert={kt.titelSperrung} aendern={(v) => setze({ titelSperrung: v })} />
      <Zahl titel="Graben um den Titel" einheit="mm" schritt={0.5} min={0} wert={kt.grabenMm} aendern={(v) => setze({ grabenMm: v })} />
      <Zahl titel="Schwarze Umrandung (Deckschicht)" einheit="mm" schritt={0.5} min={0} wert={kt.konturMm} aendern={(v) => setze({ konturMm: v })} />
      <div />
      <Zahl titel="Rand" einheit="mm" schritt={0.5} min={0} wert={kt.rahmenMm} aendern={(v) => setze({ rahmenMm: v })} />
      <Zahl titel="Rand unten" einheit="mm" schritt={0.5} min={0} wert={kt.rahmenUntenMm} aendern={(v) => setze({ rahmenUntenMm: v })} />
      <Zahl titel="Einzug seitlich" einheit="mm" schritt={0.5} min={0} wert={kt.einzugMm} aendern={(v) => setze({ einzugMm: v })} />
      <Zahl titel="Sperrung Zeile" einheit="em" schritt={0.01} wert={kt.zeileSperrung} aendern={(v) => setze({ zeileSperrung: v })} />
    </div>
  );
}

const r = (n: number) => Math.round(n * 100) / 100;
