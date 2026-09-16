import type { EingebettetesLayout, FormatKey, LayoutArt, TextStil } from "./typen";

/**
 * Lage und Groesse der Texte, vermessen an den Poster-Mustern "Zuhause"
 * (`Familienposter/8 Zuhause Map/Musterdaten/<Format>`, Kanten bei halber
 * Deckung, `scripts/poster-abgleich.ts`). Die InDesign-Vorlagen sind nicht
 * einfach skaliert – A5 hat die Karte 2 % hoeher enden und groessere Schrift.
 * Alle Werte als Anteil der Plattenhoehe; Titel als Versalhoehe von Bacalisties,
 * bestimmt aus Hoehe und Breite der Tintenbox (bei A4 21,97 / 21,98 mm).
 */
export interface PosterMasse {
  kartenEnde: number;
  titelHoehe: number;
  titelMitte: number;
  zeilenHoehe: number;
  zeile1Mitte: number;
  zeile2Mitte: number;
}

export const POSTER_MASSE: Record<"a5" | "a4" | "a3", PosterMasse> = {
  // 600 dpi: Karte 138,26 mm, Titel 30,56 x 83,82 mm ab 144,70, Zeilen 4,19 mm.
  a5: { kartenEnde: 0.6585, titelHoehe: 0.0765, titelMitte: 0.7284, zeilenHoehe: 0.01995, zeile1Mitte: 0.8797, zeile2Mitte: 0.9186 },
  // 300 und 600 dpi auf 0,05 mm gleich: Karte 202,02, Titel 21,97 mm mit Mitte 224,66, Zeilen 5,42 mm.
  a4: { kartenEnde: 0.68, titelHoehe: 0.074, titelMitte: 0.7564, zeilenHoehe: 0.01825, zeile1Mitte: 0.8909, zeile2Mitte: 0.9236 },
  // 300 dpi: Karte 284,36 mm, Titel 58,25 x 159,85 mm ab 299,26, Zeilen 7,54 mm.
  a3: { kartenEnde: 0.677, titelHoehe: 0.073, titelMitte: 0.75, zeilenHoehe: 0.01795, zeile1Mitte: 0.8873, zeile2Mitte: 0.9196 },
};

// Quadrat-Entwurf Marcel 16.09.2026, zweite Runde: Die Kontur um die Buchstaben
// und die Texte in drei Ecken wirkten unruhig. Jetzt wie die DIN-Version
// uebereinander – Titel oben in einem abgerundeten Rechteck, Namen und
// Koordinaten mittig darunter unten in einem zweiten.
export const EINGEBETTET_STANDARD: EingebettetesLayout = {
  titelAnker: "oben-mitte",
  zeile1Anker: "unten-mitte",
  zeile2Anker: "unten-mitte",
  form: "rechteck",
  schutzMm: 5,
  eckenRadiusMm: 6,
  rahmenUntenMm: 14,
};

export interface LayoutWerte {
  layoutArt: LayoutArt;
  kartenEndeAnteil: number;
  titelMitteAnteil: number;
  zeile1MitteAnteil: number;
  zeile2MitteAnteil: number;
  titelStil: TextStil;
  zeilenStil: TextStil;
  eingebettet: EingebettetesLayout;
}

/**
 * Die gemessenen Werte fuer ein Format – Start beim Formatwechsel und Ziel von
 * "Auf Standard zuruecksetzen". Quadrat und freie Formate haben kein Poster:
 * sie nehmen A4. Das Quadrat bekommt das eingebettete Layout: mit den
 * Poster-Anteilen laege sein Kartenfenster quer und der Textbereich wuerde gross.
 *
 * Die Sperrung 0,14 der Zeilen ist eine Zugabe, das Poster hat keine (dort
 * ExtraLight, luftig durch den duennen Strich; Marcel mag die Luft bei Book).
 */
export function standardLayoutWerte(format: FormatKey): LayoutWerte {
  const m = format === "a5" || format === "a3" ? POSTER_MASSE[format] : POSTER_MASSE.a4;
  return {
    layoutArt: format === "quadrat30" ? "eingebettet" : "poster",
    kartenEndeAnteil: m.kartenEnde,
    titelMitteAnteil: m.titelMitte,
    zeile1MitteAnteil: m.zeile1Mitte,
    zeile2MitteAnteil: m.zeile2Mitte,
    titelStil: { schrift: "Bacalisties.ttf", hoeheAnteil: m.titelHoehe, sperrung: 0, versalien: false },
    zeilenStil: { schrift: "AvantGarde-Book.otf", hoeheAnteil: m.zeilenHoehe, sperrung: 0.14, versalien: true },
    eingebettet: { ...EINGEBETTET_STANDARD },
  };
}
