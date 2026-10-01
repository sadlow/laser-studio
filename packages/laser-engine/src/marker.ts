import { ortZuMm } from "./geo";
import type { Punkt } from "./clip";
import { SYMBOL_TITEL, symbolBreiteMm, symbolEinpassen } from "./symbole";
import type { GeoPunkt, LagenKey, Marker, MarkerFarbe, Schichtkarte, SymbolLage, Zone } from "./typen";

/**
 * Marker der Karte (Marcel 01.10.2026): Der Kunde setzt keinen, einen oder mehrere, jeden mit eigener
 * Form, Groesse und Stelle. Ohne Liste (`kunde.marker` fehlt) bleibt es beim einen Standort-Symbol auf
 * dem Ort, wie jede Karte vor der Liste – ihre Ergebnisse aendern sich dadurch nicht.
 */
export function markerDerKarte(k: Schichtkarte): Marker[] {
  if (k.kunde.marker) return k.kunde.marker;
  return [{ art: k.kunde.symbol ?? "herz", groesse: k.kunde.symbolGroesse, lon: k.lon, lat: k.lat }];
}

/** Hat der Kunde ausdruecklich eine Liste geschickt? Nur dann darf es auch keinen Marker geben. */
export const markerAlsListe = (k: Schichtkarte) => !!k.kunde.marker;

export interface PlatzierterMarker {
  /** Stelle in `markerDerKarte` – daran erkennt die Oberflaeche, welchen sie zieht. */
  index: number;
  marker: Marker;
  ringe: Punkt[][];
  lage: SymbolLage;
}

/** Jeder Marker an seiner Stelle; was ausserhalb des Kartenfensters liegt, faellt weg (wie bisher das Symbol). */
export function platziereMarker(k: Schichtkarte, kartenMitte: GeoPunkt, f: Zone, faktor: number) {
  const liste = markerDerKarte(k);
  const platziert: PlatzierterMarker[] = [];
  liste.forEach((marker, index) => {
    const anker = ortZuMm({ lon: marker.lon, lat: marker.lat }, kartenMitte, k.ausschnittKm * 1000, f);
    const imFenster = anker.x >= f.xMm && anker.x <= f.xMm + f.breiteMm && anker.y >= f.yMm && anker.y <= f.yMm + f.hoeheMm;
    if (!imFenster) return;
    const eingepasst = symbolEinpassen(marker.art, anker.x, anker.y, symbolBreiteMm(k.symbolStufenMm, marker.groesse, faktor));
    platziert.push({ index, marker, ringe: eingepasst.ringe, lage: { index, ankerXMm: anker.x, ankerYMm: anker.y, ...eingepasst.box } });
  });
  return { platziert, ausserhalb: liste.length - platziert.length, anzahl: liste.length };
}

export const MARKER_FARBEN: MarkerFarbe[] = ["rot", "gold", "silber"];

/** Je Farbe eine Lage aus eigenem Spiegelacryl; Rot behaelt den bisherigen Schluessel. */
export const MARKER_LAGE: Record<MarkerFarbe, { key: LagenKey; material: string; fuellung: string }> = {
  rot: { key: "symbol", material: "Spiegelacryl rot", fuellung: "url(#rot)" },
  gold: { key: "symbol-gold", material: "Spiegelacryl gold", fuellung: "url(#gold)" },
  silber: { key: "symbol-silber", material: "Spiegelacryl silber", fuellung: "url(#silber)" },
};

/** Liegt die Lage als Marker obenauf (aufgeklebt, nicht gestapelt, nie geteilt)? */
export const istSymbolLage = (key: string) => key === "symbol" || key === "symbol-gold" || key === "symbol-silber";

export const markerFarbe = (m: Marker): MarkerFarbe => m.farbe ?? "rot";

/** Name einer Symbol-Lage: die Form, wenn alle Marker dieser Farbe dieselbe haben, sonst „Symbole“. */
export function symbolTitel(k: Schichtkarte, farbe: MarkerFarbe = "rot"): string {
  const arten = [...new Set(markerDerKarte(k).filter((m) => markerFarbe(m) === farbe).map((m) => m.art))];
  const name = arten.length === 1 ? (SYMBOL_TITEL[arten[0]] ?? "Symbol") : "Symbole";
  return farbe === "rot" ? name : `${name} ${farbe}`;
}
