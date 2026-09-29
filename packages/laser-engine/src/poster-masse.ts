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

/**
 * Zeilenschriften, die sich schneiden lassen, mit der Groesse, die sie dafuer brauchen: Faktor auf die am Poster
 * gemessene Zeilenhoehe (A5 4,19 mm) und Sperrung. Die kraeftigen Schnitte stehen so gross, dass die laengste
 * Zeile (29 Zeichen) auf A5 gerade passt – dann ist ihr Strich von sich aus fast 0,8 mm und muss kaum verstaerkt
 * werden (scripts/schrift-vergleich-a5.ts, 18.09.2026). Book auf 0,8 mm verstaerkt sah verquollen aus.
 */
export const ZEILENSCHRIFT_MASSE: Record<string, { groesse: number; sperrung: number }> = {
  // A5 4,8 mm, Strich 0,65, engste Punze 1,18 mm; 6 und 9 bekommen Seitenstege (enge Punze unter der Diagonale).
  // Marcel 18.09.2026: „gewinnt eindeutig".
  "DIN Alternate Bold.ttf": { groesse: 1.15, sperrung: 0.05 },
  // A5 5,4 mm, Strich 0,71, engste Punze 1,06 mm – die groessten Buchstaben.
  "Avenir Next Condensed.ttc#Demi Bold": { groesse: 1.29, sperrung: 0.05 },
  // A5 4,7 mm, Strich 0,71, engste Punze 0,9 mm (8, B) – die Familie des Posters.
  "AvantGardeCE-Demi.otf": { groesse: 1.12, sperrung: 0.05 },
  "ITC Avant Garde Gothic LT Bold.ttf": { groesse: 0.97, sperrung: 0.05 },
  // Wie auf dem Poster – zum Vergleich; im Schnitt fast doppelt so dick gerechnet.
  "AvantGarde-Book.otf": { groesse: 1, sperrung: 0.14 },
  "JosefinSans-SemiBold.ttf": { groesse: 1, sperrung: 0.14 },
};
export const ZEILENSCHRIFT_STANDARD = "DIN Alternate Bold.ttf";

/** Versalhoehe und Sperrung einer Zeilenschrift in einem Format. */
export function zeilenGroesse(format: FormatKey, schrift: string): { hoeheAnteil: number; sperrung: number } {
  const m = format === "a5" || format === "a3" ? POSTER_MASSE[format] : POSTER_MASSE.a4;
  const z = ZEILENSCHRIFT_MASSE[schrift] ?? { groesse: 1, sperrung: 0.05 };
  return { hoeheAnteil: Math.round(m.zeilenHoehe * z.groesse * 100000) / 100000, sperrung: z.sperrung };
}

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
 * Zeilenschrift und -groesse kommen aus ZEILENSCHRIFT_MASSE: geschnitten braucht die Zeile einen kraeftigen
 * Schnitt, das Poster hat ExtraLight.
 */
export function standardLayoutWerte(format: FormatKey): LayoutWerte {
  const m = format === "a5" || format === "a3" ? POSTER_MASSE[format] : POSTER_MASSE.a4;
  return {
    // 60 x 60: Titel auf der Kante (Marcel 25.09.2026: "gefaellt mir am besten"); das Reiter-Layout bleibt waehlbar.
    layoutArt: format === "quadrat60" ? "kante" : format === "quadrat30" ? "eingebettet" : "poster",
    kartenEndeAnteil: m.kartenEnde,
    titelMitteAnteil: m.titelMitte,
    zeile1MitteAnteil: m.zeile1Mitte,
    zeile2MitteAnteil: m.zeile2Mitte,
    // Mindeststrich nach dem Schrift-Testblatt 17.09.2026: Zeilen 0,5 und 0,6 verschmolzen, 0,7 nur mit der Pinzette
    // – darum 0,8. Titel 0,5 grenzwertig.
    titelStil: { schrift: "Bacalisties.ttf", hoeheAnteil: m.titelHoehe, sperrung: 0, versalien: false, minStrichMm: 0.8 },
    zeilenStil: { schrift: ZEILENSCHRIFT_STANDARD, ...zeilenGroesse(format, ZEILENSCHRIFT_STANDARD), versalien: true, minStrichMm: 0.8 },
    eingebettet: { ...EINGEBETTET_STANDARD },
  };
}
