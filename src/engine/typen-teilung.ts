// Geteilte Karten: groesser als das Laserfeld, jede Lage aus zwei Rohplatten (Marcel 25.09.2026).

import type { Punkt } from "./clip";
import type { LagenKey } from "./typen-ergebnis";

/**
 * oben-unten: waagrechte Naht, zwei Haelften 600 x ~300.
 * links-rechts: senkrechte Naht; die Haelften liegen gedreht auf der Rohplatte.
 */
export type NahtRichtung = "oben-unten" | "links-rechts";

export interface Teilungsvorgabe {
  /** Laserfeld = Rohplatte. 60 x 30,5 cm: die Karte nutzt die volle Breite, die Plattenkanten sind die Kartenkanten. */
  rohplatte: { breiteMm: number; hoeheMm: number };
  /** So weit bleibt die Naht von der Plattenkante weg – direkt an der Kante schneidet der Laser halb in der Luft. */
  randMm: number;
  /** Ein zusaetzliches Einzelteil zaehlt wie so viele Uebergaenge (Marcel 25.09.2026: 4). */
  gewichtEinzelteil: number;
  /** Kleinere Einzelteile zaehlen doppelt – schwer zu greifen und auszurichten (4 cm²). */
  kleinMm2: number;
  /** Schrittweite, in der die Nahtlage im Band probiert wird. */
  schrittMm: number;
}

/** Eine Stossfuge: wo die Naht Material der Lage trifft und man sie sieht. */
export interface Uebergang {
  xMm: number;
  yMm: number;
  /** Laenge der Fuge entlang der Naht. */
  laengeMm: number;
  kritisch: boolean;
  grund?: string;
}

/** Ein Stueck, das erst durch die Naht entsteht und einzeln eingesetzt werden muss. */
export interface Einzelteil {
  xMm: number;
  yMm: number;
  breiteMm: number;
  hoeheMm: number;
  flaecheMm2: number;
  haelfte: "A" | "B";
  /** Umriss in Karten-mm – fuer Vorschau und Montageplan. */
  umriss: Punkt[];
}

export interface Naht {
  richtung: NahtRichtung;
  /** Lage der Naht in mm von oben bzw. links. */
  posMm: number;
  uebergaenge: number;
  kritisch: number;
  einzelteile: number;
  kleine: number;
  /** Uebergaenge + Gewicht x Einzelteile (kleine doppelt) – kleiner ist sauberer. */
  punkte: number;
}

export interface LagenTeilung {
  key: LagenKey;
  titel: string;
  /** Front: Naht nie durch die Schrift, darum immer oben-unten (Marcel 25.09.2026). */
  front: boolean;
  gewaehlt: Naht & { manuell: boolean };
  /** Die naechstbesten, je Richtung verschieden weit auseinander – zum Umwaehlen im Studio. */
  alternativen: Naht[];
  /** Nur fuer die gewaehlte Naht. */
  stellen: { uebergaenge: Uebergang[]; einzelteile: Einzelteil[] };
}

export interface TeilungsErgebnis {
  rohplatte: { breiteMm: number; hoeheMm: number };
  /** Erlaubte Nahtlage, fuer beide Richtungen gleich (quadratische Karte). */
  bandMm: [number, number];
  lagen: LagenTeilung[];
  /** Nicht geteilt: Blau kommt im Rohformat, das Symbol passt auf jede Platte. */
  ungeteilt: LagenKey[];
  /** Als vier Leisten mit Gehrung auf einem Bogen statt in Haelften: die Deckschicht aus Rahmen und Reitern. */
  gehrung: LagenKey[];
}

/** Vom Studio gewaehlte Naht je Lage – gehoert zur Bestellung, nicht zur Vorlage. */
export type TeilungsWahl = Partial<Record<LagenKey, { richtung: NahtRichtung; posMm: number }>>;
