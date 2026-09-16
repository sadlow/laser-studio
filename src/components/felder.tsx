"use client";

import type { ReactNode } from "react";

export function Block({ titel, children, hinweis }: { titel: string; children: ReactNode; hinweis?: string }) {
  return (
    <section className="karte p-4">
      <h2 className="mb-3 text-xs font-semibold tracking-wider uppercase" style={{ color: "var(--akzent)" }}>
        {titel}
      </h2>
      {children}
      {hinweis && (
        <p className="mt-3 text-xs leading-relaxed" style={{ color: "var(--gedaempft)" }}>
          {hinweis}
        </p>
      )}
    </section>
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

export function Text(props: { titel: string; wert: string; aendern: (v: string) => void; platzhalter?: string }) {
  return (
    <label className="block">
      <span className="beschriftung">{props.titel}</span>
      <input
        className="feld"
        value={props.wert}
        placeholder={props.platzhalter}
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

export function Haken(props: { titel: string; wert: boolean; aendern: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <input type="checkbox" checked={props.wert} onChange={(e) => props.aendern(e.target.checked)} />
      {props.titel}
    </label>
  );
}
