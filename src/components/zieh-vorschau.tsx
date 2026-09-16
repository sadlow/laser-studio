"use client";

import { useEffect, useRef, useState } from "react";
import { mmZuOrt } from "@/engine/geo";
import { herzPfadEinheit } from "@/engine/herz";
import type { Schichtkarte, SchichtkartenErgebnis } from "@/engine/typen";

interface Props {
  svg: string;
  ergebnis: SchichtkartenErgebnis;
  karte: Schichtkarte;
  aendern: (teil: Partial<Schichtkarte>) => void;
}

interface Zug {
  art: "karte" | "herz";
  startX: number;
  startY: number;
  dx: number;
  dy: number;
  /** Lage der Vorschau-SVG relativ zur Box, in px, und px je mm. */
  links: number;
  oben: number;
  pxProMm: number;
}

const HERZ_PFAD = herzPfadEinheit();
const KM_MIN = 0.8;
const KM_MAX = 12;

/**
 * Vorschau zum Anfassen (Marcel 16.09.2026): Karte ziehen verschiebt den
 * Ausschnitt, Herz ziehen versetzt den Ort – die Koordinaten zeigen immer die
 * Herzspitze –, Mausrad zoomt. Beim Ziehen wird die letzte Vorschau verschoben
 * gezeigt; gerechnet wird beim Loslassen, so bleibt es fluessig. Die verschobene
 * Ansicht bleibt stehen, bis die neue Vorschau da ist.
 */
export function ZiehVorschau({ svg, ergebnis, karte, aendern }: Props) {
  const box = useRef<HTMLDivElement>(null);
  const [zug, setZug] = useState<Zug | null>(null);
  const [gezogen, setGezogen] = useState(false);
  const [haltenFuer, setHaltenFuer] = useState<SchichtkartenErgebnis | null>(null);
  const [zeiger, setZeiger] = useState<"karte" | "herz" | null>(null);
  const aktuell = useRef({ karte, ergebnis, aendern });
  aktuell.current = { karte, ergebnis, aendern };

  const { platte, kartenfenster: f } = ergebnis.layout;

  // Neue Vorschau da: verschobene Ansicht aufloesen.
  useEffect(() => {
    if (haltenFuer && ergebnis !== haltenFuer) {
      setHaltenFuer(null);
      setZug(null);
    }
  }, [ergebnis, haltenFuer]);

  const inMm = (clientX: number, clientY: number) => {
    const r = box.current?.querySelector("svg")?.getBoundingClientRect();
    if (!r) return null;
    return { x: ((clientX - r.left) / r.width) * platte.breiteMm, y: ((clientY - r.top) / r.height) * platte.hoeheMm, r };
  };

  const trifft = (p: { x: number; y: number }): "karte" | "herz" | null => {
    const h = ergebnis.herz;
    if (h && Math.abs(p.x - h.spitzeXMm) <= h.breiteMm / 2 && p.y <= h.spitzeYMm && p.y >= h.spitzeYMm - h.hoeheMm) return "herz";
    if (p.x >= f.xMm && p.x <= f.xMm + f.breiteMm && p.y >= f.yMm && p.y <= f.yMm + f.hoeheMm) return "karte";
    return null;
  };

  // Mausrad zoomt – als nativer Listener, weil React Wheel-Events passiv anmeldet.
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const rad = (e: WheelEvent) => {
      const { karte: k, aendern: setze } = aktuell.current;
      const p = inMm(e.clientX, e.clientY);
      if (!p || !trifft(p)) return;
      e.preventDefault();
      const km = Math.min(KM_MAX, Math.max(KM_MIN, k.ausschnittKm * Math.exp(e.deltaY * 0.0015)));
      setze({ ausschnittKm: Math.round(km * 100) / 100 });
    };
    el.addEventListener("wheel", rad, { passive: false });
    return () => el.removeEventListener("wheel", rad);
  });

  const runter = (e: React.PointerEvent<HTMLDivElement>) => {
    const p = inMm(e.clientX, e.clientY);
    const art = p && trifft(p);
    if (!p || !art || !box.current) return;
    const b = box.current.getBoundingClientRect();
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Ohne Capture geht das Ziehen trotzdem, solange der Zeiger in der Box bleibt.
    }
    e.preventDefault();
    setHaltenFuer(null);
    setGezogen(false);
    setZug({ art, startX: e.clientX, startY: e.clientY, dx: 0, dy: 0, links: p.r.left - b.left, oben: p.r.top - b.top, pxProMm: p.r.width / platte.breiteMm });
  };

  const bewegen = (e: React.PointerEvent<HTMLDivElement>) => {
    if (zug && !haltenFuer) {
      const dx = e.clientX - zug.startX;
      const dy = e.clientY - zug.startY;
      if (Math.abs(dx) + Math.abs(dy) > 3) setGezogen(true);
      setZug({ ...zug, dx, dy });
      return;
    }
    const p = inMm(e.clientX, e.clientY);
    setZeiger(p ? trifft(p) : null);
  };

  const hoch = () => {
    if (!zug || haltenFuer) return;
    if (!gezogen) return setZug(null);
    const mitte = ergebnis.kartenMitte;
    const breiteM = ergebnis.ausschnittMeter.breite;
    const dxMm = zug.dx / zug.pxProMm;
    const dyMm = zug.dy / zug.pxProMm;
    if (zug.art === "karte") {
      const neu = mmZuOrt({ x: f.xMm + f.breiteMm / 2 - dxMm, y: f.yMm + f.hoeheMm / 2 - dyMm }, mitte, breiteM, f);
      aendern({ kartenMitte: neu });
    } else if (ergebnis.herz) {
      const x = Math.min(f.xMm + f.breiteMm, Math.max(f.xMm, ergebnis.herz.spitzeXMm + dxMm));
      const y = Math.min(f.yMm + f.hoeheMm, Math.max(f.yMm, ergebnis.herz.spitzeYMm + dyMm));
      const ort = mmZuOrt({ x, y }, mitte, breiteM, f);
      // Die Karte bleibt, wo sie ist – nur der Ort wandert.
      aendern({ lon: ort.lon, lat: ort.lat, kartenMitte: mitte });
    }
    setHaltenFuer(ergebnis);
  };

  const s = zug?.pxProMm ?? 1;
  const cursor = zug && gezogen ? "grabbing" : zeiger === "herz" ? "move" : zeiger === "karte" ? "grab" : "default";

  return (
    <div
      ref={box}
      className="relative w-full touch-none select-none"
      style={{ cursor }}
      data-zieht={zug && gezogen ? zug.art : undefined}
      onPointerDown={runter}
      onPointerMove={bewegen}
      onPointerUp={hoch}
      onPointerLeave={() => setZeiger(null)}
    >
      <div
        className="w-full [&>svg]:mx-auto [&>svg]:h-auto [&>svg]:max-h-[78vh] [&>svg]:w-auto [&>svg]:max-w-full"
        // Die SVG kommt aus der eigenen Engine, nicht aus einer Fremdquelle.
        dangerouslySetInnerHTML={{ __html: svg }}
      />
      {zug && gezogen && zug.art === "karte" && (
        <div
          className="pointer-events-none absolute overflow-hidden"
          style={{ left: zug.links + f.xMm * s, top: zug.oben + f.yMm * s, width: f.breiteMm * s, height: f.hoeheMm * s, background: "var(--grund)" }}
        >
          <div
            className="absolute [&>svg]:h-full [&>svg]:w-full"
            style={{ left: -f.xMm * s + zug.dx, top: -f.yMm * s + zug.dy, width: platte.breiteMm * s, height: platte.hoeheMm * s }}
            dangerouslySetInnerHTML={{ __html: svg }}
          />
        </div>
      )}
      {zug && gezogen && zug.art === "herz" && ergebnis.herz && (
        <svg
          className="pointer-events-none absolute"
          viewBox="0 0 1 1"
          preserveAspectRatio="none"
          style={{
            left: zug.links + (ergebnis.herz.spitzeXMm - ergebnis.herz.breiteMm / 2) * s + zug.dx,
            top: zug.oben + (ergebnis.herz.spitzeYMm - ergebnis.herz.hoeheMm) * s + zug.dy,
            width: ergebnis.herz.breiteMm * s,
            height: ergebnis.herz.hoeheMm * s,
          }}
        >
          <path d={HERZ_PFAD} fill="#d23a45" stroke="#fff" strokeWidth={0.03} />
        </svg>
      )}
    </div>
  );
}
