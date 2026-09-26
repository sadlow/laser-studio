"use client";

import type { Generalisierung, Schichtkarte, StrassenGruppe, StrassenZiel } from "@/engine/typen";
import { FORMAT_BIS, MEHR_GRAVUR_AB } from "@/engine/dichte";
import { Block, Haken, Zahl } from "./felder";
import { GravurWahl } from "./gravur-wahl";
import { StufenTabelle, StuetzWerte } from "./stufen-tabelle";
import type { Aenderung } from "./aenderung";

interface Props {
  karte: Schichtkarte;
  aendern: (teil: Aenderung) => void;
}

const ZIELE: { wert: StrassenZiel; titel: string }[] = [
  { wert: "netz", titel: "Netz" },
  { wert: "gravur", titel: "Gravur" },
  { wert: "aus", titel: "aus" },
];

export function EingabeStrassen({ karte, aendern }: Props) {
  const setze = (id: string, teil: Partial<StrassenGruppe>) =>
    aendern({ strassen: karte.strassen.map((g) => (g.id === id ? { ...g, ...teil } : g)) });
  const gen = karte.generalisierung;
  const setzeGen = (teil: Partial<Generalisierung>) => aendern({ generalisierung: { ...gen, ...teil } });

  return (
    <Block
      titel="Strassen"
      zu={true}
      hinweis={`Breiten gelten fuer A4 und wachsen mit dem Format, hoechstens bis zum eingestellten Faktor. Netz = Strassen als ${
        karte.aufbau === "netz-weiss" ? "weisses" : "schwarzes"
      } Acryl, die Bloecke fallen heraus. Gravur = Linie auf dem ${
        karte.aufbau === "netz-weiss" ? "schwarzen" : "weissen"
      } Hintergrund. Tunnel werden nie gezeichnet, Bruecken immer.`}
    >
      <div className="mb-3 grid grid-cols-3 gap-3">
        <Zahl
          titel="Netz mindestens"
          einheit="mm"
          schritt={0.05}
          min={0.3}
          wert={karte.netzMinBreiteMm}
          aendern={(v) => aendern({ netzMinBreiteMm: v })}
        />
        <Zahl
          titel="Bloecke zu unter"
          einheit="mm²"
          schritt={0.5}
          min={0}
          wert={karte.netzMinLochMm2}
          aendern={(v) => aendern({ netzMinLochMm2: v })}
        />
        <Zahl
          titel="Spalt mindestens"
          einheit="mm"
          schritt={0.05}
          min={0}
          wert={karte.netzMinSpaltMm}
          aendern={(v) => aendern({ netzMinSpaltMm: v })}
        />
      </div>
      <div className="mb-3 space-y-2 rounded-md p-3" style={{ background: "var(--grund)" }}>
        <Zahl titel="Mit dem Format hoechstens breiter" einheit="x" schritt={0.05} min={0.5} wert={gen.formatBis ?? FORMAT_BIS}
          aendern={(v) => setzeGen({ formatBis: v })} />
        <p className="text-xs" style={{ color: "var(--gedaempft)" }}>
          1,46 = 30 x 30: das 60 x 60 bekommt dieselben Breiten wie das 30 x 30, so wie Symbol und Schrift.
        </p>
        <Haken titel="Breite folgt der Dichte vor Ort" wert={gen.aktiv} aendern={(v) => setzeGen({ aktiv: v })} />
        {gen.aktiv && (
          <>
            <StufenTabelle gen={gen} setzeGen={setzeGen} />
            <StuetzWerte gen={gen} setzeGen={setzeGen} />
            <div className="grid grid-cols-2 gap-3">
              <Zahl titel="Hoechstens breiter als entworfen" einheit="x" schritt={0.05} min={1} wert={gen.maxFaktor}
                aendern={(v) => setzeGen({ maxFaktor: v })} />
              <Zahl titel="Eine Klasse mehr graviert ab" einheit="x Massstab" schritt={0.1} min={1} wert={gen.mehrGravurAb ?? MEHR_GRAVUR_AB}
                aendern={(v) => setzeGen({ mehrGravurAb: v })} />
            </div>
            <p className="text-xs" style={{ color: "var(--gedaempft)" }}>
              Deckung = Strassenlaenge × Breite / Land im Fenster. Die Netzbreiten werden auf das Ziel der gewaehlten Stufe
              skaliert (Berlin-Tiergarten 3,5 km = 29 %). Muesste die feinste Netzklasse mehr als aufgedickt werden, wird
              sie graviert. Nachruecken: markierte Gravurklassen (Haken rechts) – „licht" nur in lichten Gegenden,
              „immer" solange keine geschnittene Klasse dafuer weichen muss. Graviert: so viele der feinsten Netzklassen
              graviert die Stufe immer – bei „wenig" die Wohnstrassen, sonst saehe es an lichten Orten aus wie „ausgewogen".
              Massstab = Meter je mm im Verhaeltnis zu A4 bei 3,5 km (60 x 60 bei 20 km: 2). Weiter draussen als der
              Start-Massstab wird keine Strasse in Metern breiter, Nachruecken gibt es nur bis 1,25; ab dem eingestellten
              Massstab graviert jede Stufe eine Klasse mehr (60 x 60 ab 15 km: die Wohnstrassen).
            </p>
          </>
        )}
      </div>
      <div className="space-y-1.5">
        {karte.strassen.map((g) => (
          <div key={g.id} className="grid grid-cols-[1fr_112px_76px_20px] items-center gap-2">
            <span className="truncate text-sm" title={g.klassen.join(", ")}>
              {g.titel}
            </span>
            <select className="feld" value={g.ziel} onChange={(e) => setze(g.id, { ziel: e.target.value as StrassenZiel })}>
              {ZIELE.map((z) => (
                <option key={z.wert} value={z.wert}>
                  {z.titel}
                </option>
              ))}
            </select>
            <label className="flex items-center gap-1 text-xs" style={{ color: "var(--gedaempft)" }}>
              <input
                type="number"
                className="feld"
                step={0.05}
                min={0.1}
                disabled={g.ziel === "aus"}
                value={g.breiteMm}
                onChange={(e) => setze(g.id, { breiteMm: Number(e.target.value) })}
              />
              mm
            </label>
            <input
              type="checkbox"
              title="Darf ins Netz nachruecken (Stufen mit nachruecken licht oder immer)"
              disabled={g.ziel !== "gravur"}
              checked={!!g.nachruecken}
              onChange={(e) => setze(g.id, { nachruecken: e.target.checked })}
            />
          </div>
        ))}
      </div>
    </Block>
  );
}

export function EingabeFertigung({ karte, aendern }: Props) {
  return (
    <Block
      titel="Fertigung"
      zu={true}
      hinweis="Stege sind gerade Rechtecke wie in einer Stencil-Schrift: bei B, D, P, R und 4 am Stamm entlang, beim A am rechten Schenkel, bei runden Innenflaechen oben und unten, im Titel quer durch den duennsten Strich. So viel Material bleibt auch zwischen den Buchstaben stehen. Den Mindeststrich stellt das Layout ein (Testblatt 17.09.: Buchstaben erst ab 0,7 mm, Stege von 0,5 mm brachen beim Herausdruecken). Schmalere Innenflaechen als die Grenze bekommen nur einen Steg, die Schleife bleibt offen."
    >
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Zahl titel="Stegbreite" einheit="mm" schritt={0.05} min={0} wert={karte.stegMm} aendern={(v) => aendern({ stegMm: v })} />
          <Zahl titel="Material mindestens" einheit="mm" schritt={0.05} min={0} wert={karte.stegMinMm} aendern={(v) => aendern({ stegMinMm: v })} />
          <Zahl
            titel="Ein Steg unter"
            einheit="mm"
            schritt={0.05}
            min={0}
            wert={karte.stencilMinInselBreiteMm}
            aendern={(v) => aendern({ stencilMinInselBreiteMm: v })}
          />
        </div>
        <Haken titel="Wasserflaechen aus Schwarz schneiden" wert={karte.wasser} aendern={(v) => aendern({ wasser: v })} />
        {karte.wasser && (
          <div className="space-y-2 pl-6">
            <div className="grid grid-cols-3 gap-3">
              <Zahl titel="Flaeche min." einheit="mm²" schritt={1} min={0} wert={karte.wasserMinFlaecheMm2}
                aendern={(v) => aendern({ wasserMinFlaecheMm2: v })} />
              <Zahl titel="Breite min." einheit="mm" schritt={0.1} min={0} wert={karte.wasserMinBreiteMm}
                aendern={(v) => aendern({ wasserMinBreiteMm: v })} />
              <Zahl titel="Inseln weg unter" einheit="mm²" schritt={1} min={0} wert={karte.wasserInselMinMm2}
                aendern={(v) => aendern({ wasserInselMinMm2: v })} />
            </div>
            <Haken titel="Fluesse als Linie" wert={karte.wasserlaeufe} aendern={(v) => aendern({ wasserlaeufe: v })} />
          </div>
        )}
        <Haken
          titel="Lose Teile orange markieren"
          wert={karte.loseTeileMarkieren}
          aendern={(v) => aendern({ loseTeileMarkieren: v })}
        />
        <GravurWahl karte={karte} aendern={aendern} />
      </div>
    </Block>
  );
}
