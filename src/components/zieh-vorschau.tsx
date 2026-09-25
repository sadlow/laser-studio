"use client";

import { useEffect, useRef, useState } from "react";
import { mmZuOrt } from "@/engine/geo";
import { symbolPfad } from "@/engine/symbole";
import { FARBE_SCHWARZ, FARBE_WEISS } from "@/engine/svg";
import type { Schichtkarte, SchichtkartenErgebnis } from "@/engine/typen";
import { RahmenUmriss, rahmenPlatz } from "./holzrahmen-2d";
import { KartenKopie } from "./karten-kopie";
import { NahtUeberlagerung } from "./naht-ueberlagerung";
import { StandortZentrieren } from "./standort-zentrieren";
import { useSvgLage } from "./svg-lage";
import { ZOOM_STUFEN_KM, ZoomKnoepfe } from "./zoom-knoepfe";
import type { Aenderung } from "./aenderung";

interface Props {
  svg: string;
  ergebnis: SchichtkartenErgebnis;
  karte: Schichtkarte;
  aendern: (teil: Aenderung) => void;
}

interface Zug {
  art: "karte" | "symbol";
  startX: number;
  startY: number;
  dx: number;
  dy: number;
}

/**
 * Vorschau zum Anfassen (Marcel 16.09.2026): Karte ziehen verschiebt den
 * Ausschnitt, Symbol ziehen versetzt den Ort – die Koordinaten zeigen immer den
 * Symbol-Anker (Spitze bei Herz und Pin) –, Plus und Minus zoomen in festen Stufen. Beim Ziehen und Zoomen
 * wird die letzte Vorschau verschoben bzw. skaliert gezeigt, bis die neue da ist.
 */
export function ZiehVorschau({ svg, ergebnis, karte, aendern }: Props) {
  const box = useRef<HTMLDivElement>(null);
  const [zug, setZug] = useState<Zug | null>(null);
  const [gezogen, setGezogen] = useState(false);
  const [haltenFuer, setHaltenFuer] = useState<SchichtkartenErgebnis | null>(null);
  const [zeiger, setZeiger] = useState<"karte" | "symbol" | null>(null);
  const aktuell = useRef({ karte, aendern });
  aktuell.current = { karte, aendern };

  const { platte, kartenfenster: f } = ergebnis.layout;
  const lage = useSvgLage(box, svg, platte.breiteMm);

  // Neue Vorschau da: verschobene Ansicht aufloesen.
  useEffect(() => {
    if (haltenFuer && ergebnis !== haltenFuer) {
      setHaltenFuer(null);
      setZug(null);
    }
  }, [ergebnis, haltenFuer]);

  const inMm = (clientX: number, clientY: number) => {
    const r = box.current?.querySelector("svg")?.getBoundingClientRect();
    if (!r || !r.width) return null;
    return { x: ((clientX - r.left) / r.width) * platte.breiteMm, y: ((clientY - r.top) / r.height) * platte.hoeheMm };
  };

  const trifft = (p: { x: number; y: number }): "karte" | "symbol" | null => {
    const h = ergebnis.symbol;
    if (h && p.x >= h.xMm && p.x <= h.xMm + h.breiteMm && p.y >= h.yMm && p.y <= h.yMm + h.hoeheMm) return "symbol";
    if (p.x >= f.xMm && p.x <= f.xMm + f.breiteMm && p.y >= f.yMm && p.y <= f.yMm + f.hoeheMm) return "karte";
    return null;
  };

  // Rad zoomt nur mit Strg/Cmd oder als Trackpad-Pinch (der setzt ctrlKey) –
  // sonst scrollt die Seite. Nativer Listener, weil React Wheel-Events passiv anmeldet.
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const rad = (e: WheelEvent) => {
      const p = inMm(e.clientX, e.clientY);
      if ((!e.ctrlKey && !e.metaKey) || !p || !trifft(p)) return;
      e.preventDefault();
      const { karte: k, aendern: setze } = aktuell.current;
      const schritt = Math.min(1.25, Math.max(0.8, Math.exp(e.deltaY * 0.01)));
      const km = Math.min(ZOOM_STUFEN_KM[ZOOM_STUFEN_KM.length - 1], Math.max(ZOOM_STUFEN_KM[0], k.ausschnittKm * schritt));
      setze({ ausschnittKm: Math.round(km * 100) / 100 });
    };
    el.addEventListener("wheel", rad, { passive: false });
    return () => el.removeEventListener("wheel", rad);
  });

  const runter = (e: React.PointerEvent<HTMLDivElement>) => {
    const p = inMm(e.clientX, e.clientY);
    const art = p && trifft(p);
    if (!art || !lage) return;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Ohne Capture geht das Ziehen trotzdem, solange der Zeiger in der Box bleibt.
    }
    e.preventDefault();
    setHaltenFuer(null);
    setGezogen(false);
    setZug({ art, startX: e.clientX, startY: e.clientY, dx: 0, dy: 0 });
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
    if (!zug || haltenFuer || !lage) return;
    if (!gezogen) return setZug(null);
    const mitte = ergebnis.kartenMitte;
    const breiteM = ergebnis.ausschnittMeter.breite;
    const dxMm = zug.dx / lage.pxProMm;
    const dyMm = zug.dy / lage.pxProMm;
    if (zug.art === "karte") {
      const neu = mmZuOrt({ x: f.xMm + f.breiteMm / 2 - dxMm, y: f.yMm + f.hoeheMm / 2 - dyMm }, mitte, breiteM, f);
      aendern({ kartenMitte: neu });
    } else if (ergebnis.symbol) {
      const x = Math.min(f.xMm + f.breiteMm, Math.max(f.xMm, ergebnis.symbol.ankerXMm + dxMm));
      const y = Math.min(f.yMm + f.hoeheMm, Math.max(f.yMm, ergebnis.symbol.ankerYMm + dyMm));
      const ort = mmZuOrt({ x, y }, mitte, breiteM, f);
      // Die Karte bleibt, wo sie ist – nur der Ort wandert.
      aendern({ lon: ort.lon, lat: ort.lat, kartenMitte: mitte });
    }
    setHaltenFuer(ergebnis);
  };

  const zieht = zug && gezogen ? zug.art : null;
  // Zoom bestellt, aber noch nicht gerechnet: die alte Vorschau skaliert zeigen.
  const zoomFaktor = ergebnis.ausschnittMeter.breite / (karte.ausschnittKm * 1000);
  const s = lage?.pxProMm ?? 1;
  // Frei gewordene Raender in der Farbe, auf der die Strassen liegen.
  const grund = karte.aufbau === "netz-weiss" ? FARBE_SCHWARZ : FARBE_WEISS;
  const h = ergebnis.symbol;
  const form = symbolPfad(karte.kunde.symbol);
  const cursor = zieht ? "grabbing" : zeiger === "symbol" ? "move" : zeiger === "karte" ? "grab" : "default";

  return (
    <div
      ref={box}
      className="relative w-full touch-none select-none"
      style={{ cursor }}
      data-zieht={zieht ?? undefined}
      onPointerDown={runter}
      onPointerMove={bewegen}
      onPointerUp={hoch}
      onPointerLeave={() => setZeiger(null)}
    >
      <div
        className="w-full [&>svg]:mx-auto [&>svg]:h-auto [&>svg]:max-h-[var(--vorschau-max-h)] [&>svg]:w-auto [&>svg]:max-w-[var(--vorschau-max-w)]"
        style={rahmenPlatz(ergebnis)}
        // Die SVG kommt aus der eigenen Engine, nicht aus einer Fremdquelle.
        dangerouslySetInnerHTML={{ __html: svg }}
      />
      {lage && zieht === "karte" && zug && (
        <KartenKopie svg={svg} lage={lage} platte={platte} fenster={f} grund={grund} dx={zug.dx} dy={zug.dy} />
      )}
      {lage && !zieht && Math.abs(zoomFaktor - 1) > 0.002 && (
        <KartenKopie svg={svg} lage={lage} platte={platte} fenster={f} grund={grund} faktor={zoomFaktor} />
      )}
      {lage && zieht === "symbol" && zug && h && (
        <svg
          className="pointer-events-none absolute"
          viewBox={`0 0 1 ${form.hoehe}`}
          style={{ left: lage.links + h.xMm * s + zug.dx, top: lage.oben + h.yMm * s + zug.dy, width: h.breiteMm * s, height: h.hoeheMm * s }}
        >
          <path d={form.d} fill="#d23a45" fillRule="evenodd" stroke="#fff" strokeWidth={0.03} />
        </svg>
      )}
      {lage && !zieht && <NahtUeberlagerung ergebnis={ergebnis} lage={lage} />}
      {lage && <RahmenUmriss ergebnis={ergebnis} lage={lage} />}
      {lage && (
        <ZoomKnoepfe
          km={karte.ausschnittKm}
          setzeKm={(km) => aendern({ ausschnittKm: km })}
          style={{ left: lage.links + (f.xMm + f.breiteMm) * s - 44 - 8, top: lage.oben + f.yMm * s + 8 }}
        />
      )}
      {lage && (
        // Unter Plus/Minus, rechtsbuendig mit ihnen.
        <StandortZentrieren karte={karte} ergebnis={ergebnis} lage={lage} aendern={aendern}
          vorschieben={(dx, dy) => (setZug({ art: "karte", startX: 0, startY: 0, dx, dy }), setGezogen(true), setHaltenFuer(ergebnis))}
          style={{ left: lage.links + (f.xMm + f.breiteMm) * s - 8, top: lage.oben + f.yMm * s + 8 + 90, transform: "translateX(-100%)" }} />
      )}
    </div>
  );
}
