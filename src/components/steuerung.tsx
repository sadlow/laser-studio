"use client";

import { FORMATE } from "@/engine/formate";
import {
  EBENEN_TITEL,
  IST_LINIEN_EBENE,
  type EbenenEinstellung,
  type KartenEntwurf,
  type Rolle,
  type TextZone,
} from "@/engine/typen";

interface Props {
  entwurf: KartenEntwurf;
  aendern: (teil: Partial<KartenEntwurf>) => void;
}

const ROLLEN: { wert: Rolle; titel: string }[] = [
  { wert: "gravur", titel: "Gravur" },
  { wert: "schnitt", titel: "Schnitt" },
  { wert: "aus", titel: "aus" },
];

export function Steuerung({ entwurf, aendern }: Props) {
  const setzeEbene = (key: string, teil: Partial<EbenenEinstellung>) =>
    aendern({ ebenen: entwurf.ebenen.map((e) => (e.key === key ? { ...e, ...teil } : e)) });

  const setzeText = (i: number, teil: Partial<TextZone>) =>
    aendern({ texte: entwurf.texte.map((t, idx) => (idx === i ? { ...t, ...teil } : t)) });

  return (
    <div className="space-y-5">
      <Block titel="Platte">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="beschriftung">Format</label>
            <select
              className="feld"
              value={entwurf.format}
              onChange={(e) => aendern({ format: e.target.value as KartenEntwurf["format"] })}
            >
              {Object.entries(FORMATE).map(([key, f]) => (
                <option key={key} value={key}>
                  {f.titel} · {f.breiteMm}×{f.hoeheMm}
                </option>
              ))}
              <option value="frei">frei</option>
            </select>
          </div>
          <Zahl
            titel="Rahmen (mm)"
            wert={entwurf.rahmenMm}
            schritt={1}
            aendern={(v) => aendern({ rahmenMm: v })}
          />
          {entwurf.format === "frei" && (
            <>
              <Zahl titel="Breite (mm)" wert={entwurf.breiteMm ?? 200} aendern={(v) => aendern({ breiteMm: v })} />
              <Zahl titel="Hoehe (mm)" wert={entwurf.hoeheMm ?? 200} aendern={(v) => aendern({ hoeheMm: v })} />
            </>
          )}
        </div>
        <label className="mt-3 flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={entwurf.plattenschnitt}
            onChange={(e) => aendern({ plattenschnitt: e.target.checked })}
          />
          Plattenumriss mitschneiden
        </label>
      </Block>

      <Block titel="Ausschnitt">
        <div className="grid grid-cols-2 gap-3">
          <Zahl titel="Laengengrad" wert={entwurf.lon} schritt={0.0001} aendern={(v) => aendern({ lon: v })} />
          <Zahl titel="Breitengrad" wert={entwurf.lat} schritt={0.0001} aendern={(v) => aendern({ lat: v })} />
        </div>
        <div className="mt-3">
          <label className="beschriftung">Zoom: {entwurf.zoom.toFixed(1)}</label>
          <input
            type="range"
            className="w-full"
            min={10}
            max={17}
            step={0.1}
            value={entwurf.zoom}
            onChange={(e) => aendern({ zoom: Number(e.target.value) })}
          />
        </div>
      </Block>

      <Block titel="Ebenen">
        <div className="space-y-2">
          {entwurf.ebenen.map((e) => (
            <div key={e.key} className="grid grid-cols-[1fr_92px_112px] items-center gap-2">
              <span className="text-sm">{EBENEN_TITEL[e.key]}</span>
              <select
                className="feld"
                value={e.rolle}
                onChange={(ev) => setzeEbene(e.key, { rolle: ev.target.value as Rolle })}
              >
                {ROLLEN.map((r) => (
                  <option key={r.wert} value={r.wert}>
                    {r.titel}
                  </option>
                ))}
              </select>
              {e.rolle === "aus" ? (
                <span />
              ) : IST_LINIEN_EBENE[e.key] ? (
                <label className="flex items-center gap-1 text-xs" style={{ color: "var(--gedaempft)" }}>
                  <input
                    type="number"
                    className="feld w-16"
                    step={0.1}
                    min={0.1}
                    value={e.strichMm ?? 0.4}
                    onChange={(ev) => setzeEbene(e.key, { strichMm: Number(ev.target.value) })}
                  />
                  mm
                </label>
              ) : e.rolle === "gravur" ? (
                <label className="flex items-center gap-1 text-xs" style={{ color: "var(--gedaempft)" }}>
                  <input
                    type="range"
                    className="w-16"
                    min={0.05}
                    max={1}
                    step={0.05}
                    value={e.dichte ?? 1}
                    onChange={(ev) => setzeEbene(e.key, { dichte: Number(ev.target.value) })}
                    title="Gravurdichte = Laserleistung"
                  />
                  {Math.round((e.dichte ?? 1) * 100)}%
                </label>
              ) : (
                <span />
              )}
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs" style={{ color: "var(--gedaempft)" }}>
          Prozent = Gravurdichte, die der Laser als Leistung liest. 100 % brennt die Flaeche voll durch.
        </p>
      </Block>

      <Block titel="Beschriftung">
        <div className="grid grid-cols-2 gap-3">
          <Zahl titel="Textfeld (mm)" wert={entwurf.textfeldMm} aendern={(v) => aendern({ textfeldMm: v })} />
          <Zahl titel="Abstand (mm)" wert={entwurf.textabstandMm} aendern={(v) => aendern({ textabstandMm: v })} />
        </div>
        <div className="mt-3 space-y-3">
          {entwurf.texte.map((t, i) => (
            <div key={t.id} className="grid grid-cols-[1fr_64px_88px] items-center gap-2">
              <input
                className="feld"
                value={t.text}
                onChange={(e) => setzeText(i, { text: e.target.value })}
                placeholder="Text"
              />
              <input
                type="number"
                className="feld"
                step={0.5}
                value={t.groesseMm}
                onChange={(e) => setzeText(i, { groesseMm: Number(e.target.value) })}
                title="Schriftgroesse in mm"
              />
              <select
                className="feld"
                value={t.ausrichtung}
                onChange={(e) => setzeText(i, { ausrichtung: e.target.value as TextZone["ausrichtung"] })}
              >
                <option value="links">links</option>
                <option value="mitte">mitte</option>
                <option value="rechts">rechts</option>
              </select>
            </div>
          ))}
        </div>
      </Block>
    </div>
  );
}

function Block({ titel, children }: { titel: string; children: React.ReactNode }) {
  return (
    <section className="karte p-4">
      <h2 className="mb-3 text-sm font-semibold tracking-wide uppercase" style={{ color: "var(--akzent)" }}>
        {titel}
      </h2>
      {children}
    </section>
  );
}

function Zahl({
  titel,
  wert,
  schritt = 1,
  aendern,
}: {
  titel: string;
  wert: number;
  schritt?: number;
  aendern: (v: number) => void;
}) {
  return (
    <div>
      <label className="beschriftung">{titel}</label>
      <input
        type="number"
        className="feld"
        step={schritt}
        value={wert}
        onChange={(e) => aendern(Number(e.target.value))}
      />
    </div>
  );
}
