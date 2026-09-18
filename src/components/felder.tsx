"use client";

import type { ReactNode } from "react";

/**
 * Abschnitt mit Titel. Mit `zu` aufklappbar (Technik-Seite): offen oder
 * geschlossen startend, per Klick auf den Titel umschaltbar.
 */
export function Block({ titel, children, hinweis, zu }: { titel: string; children: ReactNode; hinweis?: string; zu?: boolean }) {
  const kopf = (
    <h2 className="text-xs font-semibold tracking-wider uppercase" style={{ color: "var(--akzent)" }}>
      {titel}
    </h2>
  );
  const inhalt = (
    <>
      {children}
      {hinweis && (
        <p className="mt-3 text-xs leading-relaxed" style={{ color: "var(--gedaempft)" }}>
          {hinweis}
        </p>
      )}
    </>
  );
  if (zu === undefined) {
    return (
      <section className="karte p-4">
        <div className="mb-3">{kopf}</div>
        {inhalt}
      </section>
    );
  }
  return (
    <details className="karte group p-4" open={!zu}>
      <summary className="flex cursor-pointer list-none items-center justify-between group-open:mb-3">
        {kopf}
        <span className="text-xs transition-transform group-open:rotate-90" style={{ color: "var(--gedaempft)" }}>›</span>
      </summary>
      {inhalt}
    </details>
  );
}

/** Umschalter aus wenigen Knoepfen – fuer Kundenwahl ohne Aufklappliste. */
export function Wahl<T extends string>(props: { wert: T; optionen: { wert: T; titel: ReactNode }[]; aendern: (v: T) => void; spalten?: number }) {
  return (
    <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${props.spalten ?? props.optionen.length}, minmax(0, 1fr))` }}>
      {props.optionen.map((o) => (
        <button
          key={o.wert}
          type="button"
          onClick={() => props.aendern(o.wert)}
          className="rounded-md border px-2 py-1.5 text-xs leading-tight"
          style={props.wert === o.wert ? { background: "var(--akzent)", borderColor: "var(--akzent)", color: "#fff" } : { borderColor: "var(--linie)", background: "var(--karte)" }}
        >
          {o.titel}
        </button>
      ))}
    </div>
  );
}

export function Zahl(props: {
  titel: string;
  wert: number;
  aendern: (v: number) => void;
  schritt?: number;
  min?: number;
  einheit?: string;
}) {
  return (
    <label className="block">
      <span className="beschriftung">
        {props.titel}
        {props.einheit ? ` (${props.einheit})` : ""}
      </span>
      <input
        type="number"
        className="feld"
        step={props.schritt ?? 1}
        min={props.min}
        value={Number.isFinite(props.wert) ? props.wert : ""}
        onChange={(e) => props.aendern(Number(e.target.value))}
      />
    </label>
  );
}

export function Text(props: {
  titel: string;
  wert: string;
  aendern: (v: string) => void;
  platzhalter?: string;
  /** Laengste Eingabe im Feld. */
  maxLaenge?: number;
  /** Zeichen der Zeile auf dem Poster, rechts neben der Beschriftung. */
  zaehler?: { zeichen: number; max: number };
}) {
  const zuLang = props.zaehler && props.zaehler.zeichen > props.zaehler.max;
  return (
    <label className="block">
      {/* Flex als Inline-Style: .beschriftung ist ungeschichtetes CSS und schlaegt Tailwind-Klassen */}
      <span className="beschriftung" style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
        <span>{props.titel}</span>
        {props.zaehler && (
          <span style={zuLang ? { color: "#8a4b0a" } : undefined}>
            {props.zaehler.zeichen}/{props.zaehler.max}
          </span>
        )}
      </span>
      <input
        className="feld"
        value={props.wert}
        placeholder={props.platzhalter}
        maxLength={props.maxLaenge}
        onChange={(e) => props.aendern(e.target.value)}
      />
    </label>
  );
}

export function Auswahl<T extends string>(props: {
  titel: string;
  wert: T;
  optionen: { wert: T; titel: string }[];
  aendern: (v: T) => void;
}) {
  return (
    <label className="block">
      <span className="beschriftung">{props.titel}</span>
      <select className="feld" value={props.wert} onChange={(e) => props.aendern(e.target.value as T)}>
        {props.optionen.map((o) => (
          <option key={o.wert} value={o.wert}>
            {o.titel}
          </option>
        ))}
      </select>
    </label>
  );
}

/** Regler fuer einen Anteil der Plattenhoehe, angezeigt in Prozent. */
export function Anteil(props: { titel: string; wert: number; aendern: (v: number) => void; min: number; max: number }) {
  return (
    <label className="block">
      <span className="beschriftung">
        {props.titel}: {(props.wert * 100).toFixed(1)} %
      </span>
      <input
        type="range"
        className="w-full"
        min={props.min}
        max={props.max}
        step={0.001}
        value={props.wert}
        onChange={(e) => props.aendern(Number(e.target.value))}
      />
    </label>
  );
}

/** Aktionsknopf der Technik-Seite; `voll` nimmt die ganze Breite. */
export function Knopf(props: { onClick: () => void; aus?: boolean; voll?: boolean; children: ReactNode }) {
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

export function Haken(props: { titel: string; wert: boolean; aendern: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <input type="checkbox" checked={props.wert} onChange={(e) => props.aendern(e.target.checked)} />
      {props.titel}
    </label>
  );
}
