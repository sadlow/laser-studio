"use client";

import { berechneLayout } from "@/engine/layout";
import { standardLayoutWerte, zeilenGroesse } from "@/engine/poster-masse";
import { symbolBreiteMm } from "@/engine/symbole";
import { TITELSCHRIFTEN, ZEILENSCHRIFTEN } from "@/engine/standard";
import { REFERENZ_KARTENBREITE_MM, type Anker, type EingebettetesLayout, type LayoutArt, type Schichtkarte, type TextForm, type TextStil } from "@/engine/typen";
import { EingabeKante } from "./eingabe-kante";
import { Anteil, Auswahl, Block, Haken, Zahl } from "./felder";
import type { Aenderung } from "./aenderung";

interface Props {
  karte: Schichtkarte;
  aendern: (teil: Aenderung) => void;
}

const FORM_OPTIONEN: { wert: TextForm; titel: string }[] = [
  { wert: "rechteck", titel: "Abgerundetes Rechteck" },
  { wert: "kontur", titel: "Kontur um die Buchstaben" },
];

// "Avenir Next Condensed.ttc#Demi Bold" ist ein Schnitt aus einer Sammeldatei.
const schriftOptionen = (liste: string[]) =>
  liste.map((datei) => ({ wert: datei, titel: datei.replace(/\.ttc#/i, " ").replace(/\.(otf|ttf)$/i, "") }));

/** Masse, die der Kunde nicht sieht: freies Format, Rahmen, Symbolgroessen, Ausschnitt fein. */
export function EingabePlatte({ karte, aendern }: Props) {
  const frei = karte.format === "frei";
  const stufen = karte.symbolStufenMm;
  const faktor = berechneLayout(karte).kartenfenster.breiteMm / REFERENZ_KARTENBREITE_MM;
  const hier = (["klein", "mittel", "gross"] as const).map((g) => `${g} ${symbolBreiteMm(stufen, g, faktor)}`).join(" · ");
  const profil = karte.holzrahmenProfil;
  return (
    <Block
      titel="Platte und Ausschnitt"
      zu={true}
      hinweis="A3 zeigt denselben Ausschnitt wie A5, nur groesser – wie beim Poster. Strassenbreiten und Schrift wachsen mit, das Symbol springt je Format eine Stufe seiner Groessenreihe. Fest bleiben Rand, Stege und das Profil des Holzrahmens."
    >
      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-3">
          <Haken
            titel="Freies Format (Prototyp-Masse)"
            wert={frei}
            aendern={(v) => aendern(v ? { format: "frei", breiteMm: karte.breiteMm ?? 145, hoeheMm: karte.hoeheMm ?? 205 } : { format: "a4", ...standardLayoutWerte("a4") })}
          />
        </div>
        {frei && (
          <>
            <Zahl titel="Breite" einheit="mm" wert={karte.breiteMm ?? 200} aendern={(v) => aendern({ breiteMm: v })} />
            <Zahl titel="Hoehe" einheit="mm" wert={karte.hoeheMm ?? 200} aendern={(v) => aendern({ hoeheMm: v })} />
            <div />
          </>
        )}
        <Zahl titel="Rand" einheit="mm" schritt={0.5} wert={karte.rahmenMm} aendern={(v) => aendern({ rahmenMm: v })} />
        <div className="col-span-2" />
        <div className="col-span-3">
          <span className="beschriftung">Holzrahmen-Profil (alle Groessen)</span>
          <div className="grid grid-cols-4 gap-2">
            <Zahl titel="Breite" einheit="mm" schritt={0.5} min={1} wert={profil.breiteMm} aendern={(v) => aendern({ holzrahmenProfil: { ...profil, breiteMm: v } })} />
            <Zahl titel="Tiefe" einheit="mm" schritt={0.5} min={1} wert={profil.tiefeMm} aendern={(v) => aendern({ holzrahmenProfil: { ...profil, tiefeMm: v } })} />
            <Zahl titel="Einlass" einheit="mm" schritt={0.5} min={0} wert={profil.einlassMm} aendern={(v) => aendern({ holzrahmenProfil: { ...profil, einlassMm: v } })} />
            <Zahl titel="Ueberstand" einheit="mm" schritt={0.5} min={0} wert={profil.ueberstandMm} aendern={(v) => aendern({ holzrahmenProfil: { ...profil, ueberstandMm: v } })} />
          </div>
        </div>
        <Zahl titel="Acryl glaenzend" einheit="mm" schritt={0.5} min={0.5} wert={karte.staerkenMm.acryl}
          aendern={(v) => aendern({ staerkenMm: { ...karte.staerkenMm, acryl: v } })} />
        <Zahl titel="Schwarzer Grund" einheit="mm" schritt={0.5} min={0.5} wert={karte.staerkenMm.grundSchwarz}
          aendern={(v) => aendern({ staerkenMm: { ...karte.staerkenMm, grundSchwarz: v } })} />
        <Zahl titel="Spiegelacryl" einheit="mm" schritt={0.5} min={0.5} wert={karte.staerkenMm.spiegel}
          aendern={(v) => aendern({ staerkenMm: { ...karte.staerkenMm, spiegel: v } })} />
        <div className="col-span-3">
          <Haken titel="Schwarzer Grund mit Frost-Oberflaeche (matt)" wert={karte.grundSchwarzFrost} aendern={(v) => aendern({ grundSchwarzFrost: v })} />
          <p className="mt-1 text-xs" style={{ color: "var(--gedaempft)" }}>
            Glaenzend: weisse Lagen und ein schwarzes Netz. Der schwarze Grund traegt die Gravur und ist darum Frost-Acryl.
          </p>
        </div>
        <div className="col-span-3">
          <span className="beschriftung">Symbolgroessen – eine Reihe fuer alle Formate</span>
          <div className="grid grid-cols-3 gap-2">
            {stufen.map((mm, i) => (
              <Zahl key={i} titel={`Stufe ${i + 1}`} einheit="mm" schritt={0.5} min={1} wert={mm}
                aendern={(v) => aendern({ symbolStufenMm: stufen.map((alt, j) => (j === i ? v : alt)) })} />
            ))}
          </div>
          <p className="mt-1 text-xs" style={{ color: "var(--gedaempft)" }}>
            Dieses Format: {hier} mm. A4 nimmt Stufe 2 bis 4, A3 eine Stufe hoeher, A5 eine tiefer.
          </p>
        </div>
        <div className="col-span-3">
          <span className="beschriftung">Ausschnitt: {karte.ausschnittKm.toFixed(2)} km breit – bei jedem Format gleich</span>
          <input type="range" className="w-full" min={0.8} max={12} step={0.05} value={karte.ausschnittKm}
            onChange={(e) => aendern({ ausschnittKm: Number(e.target.value) })} />
        </div>
      </div>
    </Block>
  );
}

const LAYOUT_OPTIONEN: { wert: LayoutArt; titel: string }[] = [
  { wert: "poster", titel: "Poster – Karte oben, Text darunter" },
  { wert: "eingebettet", titel: "Eingebettet – Texte in der Karte" },
  { wert: "kante", titel: "Kante – Titel steht auf dem unteren Rand" },
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
  const posterFormat = ["a5", "a4", "a3"].includes(karte.format) ? karte.format.toUpperCase() : "A4";

  return (
    <Block
      titel="Layout"
      zu={true}
      hinweis={
        karte.layoutArt === "poster"
          ? `Positionen und Groessen als Anteil der Plattenhoehe, vermessen am Poster "Zuhause" in ${posterFormat}. Jedes Poster-Format hat eigene Werte.`
          : karte.layoutArt === "kante"
            ? "Der Titel steht in Versalien als Material auf dem unteren Rand, um ihn laufen keine Strassen. Namen und letzte Zeile stehen ausgeschnitten im Rand. Die Titelschrift unten gilt fuer die anderen Layouts."
            : "Jeder Text steht an seinem Rand in einer weissen Schutzkontur, die in Rahmen und Strassennetz uebergeht. Darunter wird weder Wasser geschnitten noch graviert."
      }
    >
      <div className="space-y-3">
        <button
          type="button"
          onClick={() => aendern(standardLayoutWerte(karte.format))}
          className="w-full rounded-md border px-3 py-1.5 text-xs"
          style={{ borderColor: "var(--linie)" }}
          title="Lage, Groessen, Schriften und Sperrung wie gemessen"
        >
          Auf Standard zuruecksetzen ({karte.format === "quadrat30" || karte.format === "quadrat60" ? "Quadrat" : `Poster ${posterFormat}`})
        </button>
        <Auswahl titel="Layout-Art" wert={karte.layoutArt} optionen={LAYOUT_OPTIONEN} aendern={(v) => aendern({ layoutArt: v })} />

        {karte.layoutArt === "poster" ? (
          <>
            <Anteil titel="Karte endet bei" wert={karte.kartenEndeAnteil} min={0.4} max={0.9} aendern={(v) => aendern({ kartenEndeAnteil: v })} />
            <Anteil titel="Titel Mitte" wert={karte.titelMitteAnteil} min={0.5} max={0.97} aendern={(v) => aendern({ titelMitteAnteil: v })} />
            <Anteil titel="Namen Mitte" wert={karte.zeile1MitteAnteil} min={0.5} max={0.98} aendern={(v) => aendern({ zeile1MitteAnteil: v })} />
            <Anteil titel="Letzte Zeile Mitte" wert={karte.zeile2MitteAnteil} min={0.5} max={0.98} aendern={(v) => aendern({ zeile2MitteAnteil: v })} />
          </>
        ) : karte.layoutArt === "kante" ? (
          <EingabeKante karte={karte} aendern={aendern} />
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

        <div className="grid grid-cols-[1fr_72px_72px] gap-2 border-t pt-3" style={{ borderColor: "var(--linie)" }}>
          <Auswahl titel="Titelschrift" wert={karte.titelStil.schrift} optionen={schriftOptionen(TITELSCHRIFTEN)} aendern={(v) => stil("titelStil", { schrift: v })} />
          <Zahl titel="Hoehe" einheit="%" schritt={0.01} wert={round(karte.titelStil.hoeheAnteil * 100)} aendern={(v) => stil("titelStil", { hoeheAnteil: v / 100 })} />
          <Zahl titel="Strich mind." einheit="mm" schritt={0.05} min={0} wert={karte.titelStil.minStrichMm} aendern={(v) => stil("titelStil", { minStrichMm: v })} />
          <Auswahl
            titel="Zeilenschrift"
            wert={karte.zeilenStil.schrift}
            optionen={schriftOptionen(ZEILENSCHRIFTEN)}
            aendern={(v) => stil("zeilenStil", { schrift: v, ...zeilenGroesse(karte.format, v) })}
          />
          <Zahl titel="Hoehe" einheit="%" schritt={0.01} wert={round(karte.zeilenStil.hoeheAnteil * 100)} aendern={(v) => stil("zeilenStil", { hoeheAnteil: v / 100 })} />
          <Zahl titel="Strich mind." einheit="mm" schritt={0.05} min={0} wert={karte.zeilenStil.minStrichMm} aendern={(v) => stil("zeilenStil", { minStrichMm: v })} />
        </div>
        <Zahl titel="Sperrung der Zeilen" einheit="em" schritt={0.01} wert={karte.zeilenStil.sperrung} aendern={(v) => stil("zeilenStil", { sperrung: v })} />
      </div>
    </Block>
  );
}

const round = (n: number) => Math.round(n * 1000) / 1000;
