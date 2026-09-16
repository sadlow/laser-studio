"use client";

import { FORMATE } from "@/engine/formate";
import { TITELSCHRIFTEN, ZEILENSCHRIFTEN } from "@/engine/standard";
import type { FormatKey, Schichtkarte, TextStil } from "@/engine/typen";
import { Anteil, Auswahl, Block, Zahl } from "./felder";

interface Props {
  karte: Schichtkarte;
  aendern: (teil: Partial<Schichtkarte>) => void;
}

const FORMAT_OPTIONEN = [
  ...Object.entries(FORMATE).map(([wert, f]) => ({
    wert: wert as FormatKey,
    titel: `${f.titel} · ${f.breiteMm}×${f.hoeheMm} mm`,
  })),
  { wert: "frei" as FormatKey, titel: "frei" },
];

const schriftOptionen = (liste: string[]) =>
  liste.map((datei) => ({ wert: datei, titel: datei.replace(/\.(otf|ttf)$/i, "") }));

export function EingabePlatte({ karte, aendern }: Props) {
  return (
    <Block
      titel="Platte und Ausschnitt"
      hinweis="A3 zeigt denselben Ausschnitt wie A5, nur groesser – wie beim Poster. Strassenbreiten und Schrift wachsen mit. Fest bleiben nur Rahmen (Falz des Bilderrahmens) und Stege."
    >
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <Auswahl titel="Format" wert={karte.format} optionen={FORMAT_OPTIONEN} aendern={(v) => aendern({ format: v })} />
        </div>
        {karte.format === "frei" && (
          <>
            <Zahl titel="Breite" einheit="mm" wert={karte.breiteMm ?? 200} aendern={(v) => aendern({ breiteMm: v })} />
            <Zahl titel="Hoehe" einheit="mm" wert={karte.hoeheMm ?? 200} aendern={(v) => aendern({ hoeheMm: v })} />
          </>
        )}
        <Zahl titel="Rahmen" einheit="mm" schritt={0.5} wert={karte.rahmenMm} aendern={(v) => aendern({ rahmenMm: v })} />
        <Zahl titel="Herz" einheit="mm" schritt={0.5} wert={karte.herzBreiteMm} aendern={(v) => aendern({ herzBreiteMm: v })} />
        <div className="col-span-2">
          <span className="beschriftung">
            Ausschnitt: {karte.ausschnittKm.toFixed(1)} km breit – bei jedem Format gleich
          </span>
          <input
            type="range"
            className="w-full"
            min={0.8}
            max={12}
            step={0.1}
            value={karte.ausschnittKm}
            onChange={(e) => aendern({ ausschnittKm: Number(e.target.value) })}
          />
        </div>
      </div>
    </Block>
  );
}

export function EingabeLayout({ karte, aendern }: Props) {
  const stil = (key: "titelStil" | "zeilenStil", teil: Partial<TextStil>) =>
    aendern({ [key]: { ...karte[key], ...teil } } as Partial<Schichtkarte>);

  return (
    <Block
      titel="Layout"
      hinweis="Positionen und Groessen als Anteil der Plattenhoehe, vermessen am Poster 'Zuhause'. Ein Satz Zahlen traegt jedes Format."
    >
      <div className="space-y-3">
        <Anteil titel="Karte endet bei" wert={karte.kartenEndeAnteil} min={0.4} max={0.9} aendern={(v) => aendern({ kartenEndeAnteil: v })} />
        <Anteil titel="Titel Mitte" wert={karte.titelMitteAnteil} min={0.5} max={0.97} aendern={(v) => aendern({ titelMitteAnteil: v })} />
        <Anteil titel="Namen Mitte" wert={karte.zeile1MitteAnteil} min={0.5} max={0.98} aendern={(v) => aendern({ zeile1MitteAnteil: v })} />
        <Anteil titel="Letzte Zeile Mitte" wert={karte.zeile2MitteAnteil} min={0.5} max={0.98} aendern={(v) => aendern({ zeile2MitteAnteil: v })} />

        <div className="grid grid-cols-[1fr_88px] gap-2 border-t pt-3" style={{ borderColor: "var(--linie)" }}>
          <Auswahl titel="Titelschrift" wert={karte.titelStil.schrift} optionen={schriftOptionen(TITELSCHRIFTEN)} aendern={(v) => stil("titelStil", { schrift: v })} />
          <Zahl titel="Hoehe" einheit="%" schritt={0.1} wert={round(karte.titelStil.hoeheAnteil * 100)} aendern={(v) => stil("titelStil", { hoeheAnteil: v / 100 })} />
          <Auswahl titel="Zeilenschrift" wert={karte.zeilenStil.schrift} optionen={schriftOptionen(ZEILENSCHRIFTEN)} aendern={(v) => stil("zeilenStil", { schrift: v })} />
          <Zahl titel="Hoehe" einheit="%" schritt={0.1} wert={round(karte.zeilenStil.hoeheAnteil * 100)} aendern={(v) => stil("zeilenStil", { hoeheAnteil: v / 100 })} />
        </div>
        <Zahl titel="Sperrung der Zeilen" einheit="em" schritt={0.01} wert={karte.zeilenStil.sperrung} aendern={(v) => stil("zeilenStil", { sperrung: v })} />
      </div>
    </Block>
  );
}

const round = (n: number) => Math.round(n * 100) / 100;
