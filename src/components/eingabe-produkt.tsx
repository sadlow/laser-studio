"use client";

import { FORMATE } from "@/engine/formate";
import { standardLayoutFuer, TITELSCHRIFTEN, ZEILENSCHRIFTEN } from "@/engine/standard";
import type { Anker, Aufbau, EingebettetesLayout, FormatKey, LayoutArt, Schichtkarte, TextForm, TextStil } from "@/engine/typen";
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

const FORM_OPTIONEN: { wert: TextForm; titel: string }[] = [
  { wert: "rechteck", titel: "Abgerundetes Rechteck" },
  { wert: "kontur", titel: "Kontur um die Buchstaben" },
];

const AUFBAU_OPTIONEN: { wert: Aufbau; titel: string }[] = [
  { wert: "netz-weiss", titel: "Weiss–Schwarz–Blau: weisses Netz, Gravur hell" },
  { wert: "netz-schwarz-dreilagig", titel: "Schwarz–Weiss–Blau: schwarzes Netz, Text im Schwarz" },
  { wert: "netz-schwarz", titel: "Weiss–Schwarz–Weiss–Blau: schwarzes Netz, weisse Deckschicht" },
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
          <Auswahl titel="Aufbau" wert={karte.aufbau} optionen={AUFBAU_OPTIONEN} aendern={(v) => aendern({ aufbau: v })} />
        </div>
        <div className="col-span-2">
          {/* Das Format bringt sein Layout mit (Quadrat: eingebettet) – unten im
              Block "Layout" sichtbar und jederzeit umstellbar. */}
          <Auswahl
            titel="Format"
            wert={karte.format}
            optionen={FORMAT_OPTIONEN}
            aendern={(v) => aendern({ format: v, layoutArt: standardLayoutFuer(v) })}
          />
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

const LAYOUT_OPTIONEN: { wert: LayoutArt; titel: string }[] = [
  { wert: "poster", titel: "Poster – Karte oben, Text darunter" },
  { wert: "eingebettet", titel: "Eingebettet – Texte in der Karte" },
];

const ANKER_OPTIONEN: { wert: Anker; titel: string }[] = [
  { wert: "oben-mitte", titel: "oben mittig" },
  { wert: "oben-links", titel: "oben links" },
  { wert: "oben-rechts", titel: "oben rechts" },
  { wert: "unten-mitte", titel: "unten mittig" },
  { wert: "unten-links", titel: "unten links" },
  { wert: "unten-rechts", titel: "unten rechts" },
];

export function EingabeLayout({ karte, aendern }: Props) {
  const stil = (key: "titelStil" | "zeilenStil", teil: Partial<TextStil>) =>
    aendern({ [key]: { ...karte[key], ...teil } } as Partial<Schichtkarte>);
  const ein = (teil: Partial<EingebettetesLayout>) => aendern({ eingebettet: { ...karte.eingebettet, ...teil } });
  const e = karte.eingebettet;

  return (
    <Block
      titel="Layout"
      hinweis={
        karte.layoutArt === "poster"
          ? "Positionen und Groessen als Anteil der Plattenhoehe, vermessen am Poster 'Zuhause'. Ein Satz Zahlen traegt alle A-Formate."
          : "Jeder Text steht an seinem Rand in einer weissen Schutzkontur, die in Rahmen und Strassennetz uebergeht. Darunter wird weder Wasser geschnitten noch graviert."
      }
    >
      <div className="space-y-3">
        <Auswahl titel="Layout-Art" wert={karte.layoutArt} optionen={LAYOUT_OPTIONEN} aendern={(v) => aendern({ layoutArt: v })} />

        {karte.layoutArt === "poster" ? (
          <>
            <Anteil titel="Karte endet bei" wert={karte.kartenEndeAnteil} min={0.4} max={0.9} aendern={(v) => aendern({ kartenEndeAnteil: v })} />
            <Anteil titel="Titel Mitte" wert={karte.titelMitteAnteil} min={0.5} max={0.97} aendern={(v) => aendern({ titelMitteAnteil: v })} />
            <Anteil titel="Namen Mitte" wert={karte.zeile1MitteAnteil} min={0.5} max={0.98} aendern={(v) => aendern({ zeile1MitteAnteil: v })} />
            <Anteil titel="Letzte Zeile Mitte" wert={karte.zeile2MitteAnteil} min={0.5} max={0.98} aendern={(v) => aendern({ zeile2MitteAnteil: v })} />
          </>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <Auswahl titel="Titel" wert={e.titelAnker} optionen={ANKER_OPTIONEN} aendern={(v) => ein({ titelAnker: v })} />
            <Auswahl titel="Namen" wert={e.zeile1Anker} optionen={ANKER_OPTIONEN} aendern={(v) => ein({ zeile1Anker: v })} />
            <Auswahl titel="Letzte Zeile" wert={e.zeile2Anker} optionen={ANKER_OPTIONEN} aendern={(v) => ein({ zeile2Anker: v })} />
            <Auswahl titel="Form um den Text" wert={e.form} optionen={FORM_OPTIONEN} aendern={(v) => ein({ form: v })} />
            <Zahl titel="Weiss um den Text" einheit="mm" schritt={0.5} min={0} wert={e.schutzMm} aendern={(v) => ein({ schutzMm: v })} />
            {e.form === "rechteck" && (
              <Zahl titel="Eckenradius" einheit="mm" schritt={0.5} min={0} wert={e.eckenRadiusMm} aendern={(v) => ein({ eckenRadiusMm: v })} />
            )}
            <Zahl titel="Rahmen unten" einheit="mm" schritt={0.5} min={0} wert={e.rahmenUntenMm} aendern={(v) => ein({ rahmenUntenMm: v })} />
          </div>
        )}

        <div className="grid grid-cols-[1fr_88px] gap-2 border-t pt-3" style={{ borderColor: "var(--linie)" }}>
          <Auswahl titel="Titelschrift" wert={karte.titelStil.schrift} optionen={schriftOptionen(TITELSCHRIFTEN)} aendern={(v) => stil("titelStil", { schrift: v })} />
          <Zahl titel="Hoehe" einheit="%" schritt={0.1} wert={round(karte.titelStil.hoeheAnteil * 100)} aendern={(v) => stil("titelStil", { hoeheAnteil: v / 100 })} />
          <Auswahl titel="Zeilenschrift" wert={karte.zeilenStil.schrift} optionen={schriftOptionen(ZEILENSCHRIFTEN)} aendern={(v) => stil("zeilenStil", { schrift: v })} />
          <Zahl titel="Hoehe" einheit="%" schritt={0.01} wert={round(karte.zeilenStil.hoeheAnteil * 100)} aendern={(v) => stil("zeilenStil", { hoeheAnteil: v / 100 })} />
        </div>
        <Zahl titel="Sperrung der Zeilen" einheit="em" schritt={0.01} wert={karte.zeilenStil.sperrung} aendern={(v) => stil("zeilenStil", { sperrung: v })} />
      </div>
    </Block>
  );
}

const round = (n: number) => Math.round(n * 1000) / 1000;
