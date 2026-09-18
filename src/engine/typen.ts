// Der Vertrag der Engine fuer das Produkt "Schichtkarte".
//
// Aufbau von oben nach unten:
//   Symbol  rotes Spiegelacryl, aufgeklebt am Ort (Herz, Haus, Pin, X)
//   Weiss   Rahmen + Strassennetz + Textflaeche mit ausgeschnittenen Woertern
//   Schwarz durchgehend, Wasser ausgeschnitten, feine Wege graviert (hell)
//   Blau    Spiegelacryl, scheint durch das Wasser
//
// Alles, was das Produkt beschreibt, steht hier. Die UI ist ein Formular auf
// diese Typen, die Produktion ruft dieselbe Funktion auf. Kein React, kein Next.

import type { SymbolArt, SymbolGroesse } from "./symbole";
import type { GravurExport } from "./typen-fertigung";
import type { Generalisierung, StrassenGruppe, StrassenStufe } from "./typen-strassen";

export type FormatKey = "a5" | "a4" | "a3" | "quadrat30" | "frei";

export interface GeoPunkt {
  lon: number;
  lat: number;
}

export type LetzteZeile = "koordinaten" | "wunschtext";

/** Kundeneingaben – dieselben Felder wie Family Motiv 8 "Zuhause Map". */
export interface Kundeneingabe {
  adresse: string;
  titel: string;
  namen: string;
  letzteZeile: LetzteZeile;
  /** Ort vor den Koordinaten ("BERLIN"). */
  ortText: string;
  wunschtext: string;
  /** Wie viel vom Strassennetz geschnitten wird – die Bedeutung legt die Vorlage fest. */
  strassenStufe: StrassenStufe;
  /** Standort-Symbol und seine Groesse – die Masse legt die Vorlage fest. */
  symbol: SymbolArt;
  symbolGroesse: SymbolGroesse;
  /** Optionaler Holzrahmen – das Profil legt die Vorlage fest. */
  holzrahmen: Holzrahmen;
}

export type Holzrahmen = "ohne" | "schwarz" | "weiss" | "eiche" | "dunkelbraun";

/**
 * Profil der Holzrahmen, bei jeder Groesse gleich (Marcel 16.09.2026): von vorn
 * 14 mm breit, 28 mm tief, die Bildoberflaeche liegt 6 mm hinter der Front, und
 * innen steht der Rahmen 4 mm ueber das Motiv.
 */
export interface HolzrahmenProfil {
  breiteMm: number;
  tiefeMm: number;
  einlassMm: number;
  ueberstandMm: number;
}

/**
 * poster:      Karte oben, Textfeld darunter – wie das Amazon-Poster "Zuhause".
 * eingebettet: Karte ueber die ganze Platte, die Texte liegen in der Karte auf
 *              einer weissen Schutzkontur, die ins Netz und den Rahmen uebergeht.
 *              Entworfen fuer das Quadrat (Marcel 16.09.2026).
 */
export type LayoutArt = "poster" | "eingebettet";

export type Anker = "oben-mitte" | "oben-links" | "oben-rechts" | "unten-mitte" | "unten-links" | "unten-rechts";

/**
 * rechteck: abgerundetes Rechteck, das wie ein Reiter am Rand haengt – ruhig.
 * kontur:   folgt den Buchstaben. Bei Schreibschrift unruhig (Marcel 16.09.2026).
 */
export type TextForm = "rechteck" | "kontur";

export interface EingebettetesLayout {
  /** Zeilen mit demselben Anker bilden einen Block und stehen uebereinander. */
  titelAnker: Anker;
  zeile1Anker: Anker;
  zeile2Anker: Anker;
  form: TextForm;
  /** Weiss um den Text: Innenabstand des Rechtecks bzw. Breite der Kontur. */
  schutzMm: number;
  eckenRadiusMm: number;
  /** Unterer Rand, breiter als die anderen. */
  rahmenUntenMm: number;
}

/**
 * Welche Farbe das Strassennetz hat. Alle Aufbauten sind gleich gebaut: eine
 * Netz-Lage (Rahmen + Strassen als Material, die Bloecke fallen heraus) ueber
 * einer Hintergrund-Lage (Wasser geschnitten, feine Wege graviert) ueber Blau.
 *
 * netz-weiss:             weiss-schwarz-blau. Die Texte sitzen im Netz.
 * netz-schwarz-dreilagig: schwarz-weiss-blau – dasselbe mit getauschten Farben,
 *                         die Texte im schwarzen Netz (Marcel 16.09.2026).
 * netz-schwarz:           weiss-schwarz-weiss-blau – Positiv-Look des Posters,
 *                         darueber eine weisse Deckschicht nur mit Rahmen und
 *                         Text (Marcel 16.09.2026). Gravur auf Weiss sieht man kaum.
 */
export type Aufbau = "netz-weiss" | "netz-schwarz-dreilagig" | "netz-schwarz";

export interface TextStil {
  /** Dateiname in ~/Library/Fonts oder /Library/Fonts. */
  schrift: string;
  /** Versalhoehe als Anteil der Plattenhoehe – skaliert mit dem Format. */
  hoeheAnteil: number;
  /** Sperrung in em (0 = Schrift wie gesetzt). */
  sperrung: number;
  versalien: boolean;
  /**
   * Ausgeschnitten wird die Schrift verstaerkt, bis ihr duennster Strich so breit ist (schnitt-text.ts): die
   * Druckschrift rundum mit spitzen Ecken, die Schreibschrift des Titels nur aussen, damit die Schleifen offen bleiben.
   */
  minStrichMm: number;
}

export interface Schichtkarte {
  kunde: Kundeneingabe;

  /** Der Ort: Spitze des Symbols, steht in den Koordinaten (Marcel 16.09.2026). */
  lon: number;
  lat: number;
  /** Mitte des Kartenausschnitts, wenn die Karte verschoben wurde – sonst der Ort. */
  kartenMitte?: GeoPunkt;
  /**
   * Breite des Kartenfensters in km Wirklichkeit – bei jedem Format gleich.
   * Ersetzt den Zoom: A3 zeigt denselben Kiez wie A5, nur groesser, so wie
   * das Poster, dessen Kartenbild einfach auf das Format skaliert wird.
   */
  ausschnittKm: number;

  format: FormatKey;
  breiteMm?: number;
  hoeheMm?: number;

  /** Rand rundum ums Kartenfenster. Im Holzrahmen liegt davon der Ueberstand unter dem Rahmen. */
  rahmenMm: number;

  aufbau: Aufbau;
  layoutArt: LayoutArt;
  eingebettet: EingebettetesLayout;

  // --- nur layoutArt "poster" ---
  /** Unterkante des Kartenfensters als Anteil der Plattenhoehe. */
  kartenEndeAnteil: number;
  /** Mittellinien der drei Textzeilen als Anteil der Plattenhoehe. */
  titelMitteAnteil: number;
  zeile1MitteAnteil: number;
  zeile2MitteAnteil: number;

  titelStil: TextStil;
  zeilenStil: TextStil;

  strassen: StrassenGruppe[];
  /** Schmaler wird kein Netzstreifen, auch wenn Format oder Ausschnitt ihn schrumpfen liessen. */
  netzMinBreiteMm: number;
  generalisierung: Generalisierung;
  /** Kleinere Bloecke zwischen Netzstrassen bleiben Material – 2 x 2 mm loesen sich nicht sauber. */
  netzMinLochMm2: number;

  /** Wasserflaechen aus Schwarz schneiden. */
  wasser: boolean;
  /** Fluesse/Kanaele, die nur als Linie vorliegen, als Streifen mitschneiden. */
  wasserlaeufe: boolean;
  wasserlaufBreiteMm: number;
  /** Kleinere Wasserflaechen werden nicht geschnitten – nicht montierbar. */
  wasserMinFlaecheMm2: number;
  /** Schmaleres Wasser wird nicht geschnitten – Venedig zerfiel sonst in 107 einzeln zu klebende Inseln. */
  wasserMinBreiteMm: number;
  /** Kleinere Inseln, die nirgends anhaengen, werden Wasser statt Einzelteil. */
  wasserInselMinMm2: number;

  /** Breite der Stencil-Stege in der Schrift – jeder Steg ein gerades Rechteck (stencil.ts), nie schmaler als stegMinMm. */
  stegMm: number;
  /**
   * Innenflaechen, die schmaler sind, bekommen nur einen Steg und werden zur offenen Schleife (das & bei A5) –
   * zugefuellt waeren sie ein Klecks. Unter 0,35 mm wird zugefuellt.
   */
  stencilMinInselBreiteMm: number;
  /**
   * So viel Material bleibt mindestens stehen: Stege, zwischen den Buchstaben, zwischen den Strichen des “ (Schrift-
   * Testblatt 17.09.2026: Stege von 0,5 mm brachen beim Herausdruecken).
   */
  stegMinMm: number;

  /** Breiten des Standort-Symbols als Reihe fuer alle Formate: A4 nimmt Stufe 2-4, A3 eine hoeher, A5 eine tiefer (symbole.ts). */
  symbolStufenMm: number[];
  /**
   * Plattenstaerke nach Material (Marcel 16.09.2026): weisses und schwarzes
   * Acrylglas immer gleich, Spiegelacryl (Blau und Symbol) immer gleich. Das
   * Symbol wird auf den Hintergrund geklebt und steht ueber das Netz hinaus.
   */
  staerkenMm: { acryl: number; spiegel: number };
  holzrahmenProfil: HolzrahmenProfil;

  /** Lose Teile der weissen Lage in der Vorschau markieren. */
  loseTeileMarkieren: boolean;
  /** Gravur in der Laserdatei als Flaeche, Mittellinie oder Kontur (typen-fertigung.ts). */
  gravurExport: GravurExport;
}

export * from "./typen-ergebnis";
export * from "./typen-fertigung";
export * from "./typen-strassen";
