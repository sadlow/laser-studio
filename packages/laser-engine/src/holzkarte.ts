import { STRASSEN_STANDARD, standardSchichtkarte } from "./standard";
import { HOLZ_STANDARD } from "./stapel-holz";
import type { FormatKey, HerzLayout, Schichtkarte } from "./typen";

/**
 * Werkswerte der Holzkarte „MD2 We said yes“ (Tiefenwerk, bisher Bulk-Script md2.jsx + Illustrator).
 *
 * Lagen und Texte vermessen an den Vorlagen a5/a4/a3_md2-herz-map.ai (Marcel 15.11.2026): Herz in jedem Format
 * dieselbe Form (herz-form.ts), 86,4 % der Plattenbreite, oben 7,2 % der Hoehe. Titel adelia, Namen und Koordinaten
 * Avenir Next UltraLight, Ort & Datum Avenir Next Medium, alle drei Zeilen in Versalien gesperrt. A5 setzt die
 * Zeilen relativ groesser als A4/A3 (wie die Vorlage).
 */
const HERZ_A4: HerzLayout = {
  linksAnteil: 0.06724,
  obenAnteil: 0.07227,
  breiteAnteil: 0.86433,
  // Groesse und Lage so, dass „We said yes“ die Vorlage trifft (115,4 mm breit, Tinte oben bei 216,8 mm).
  titel: { schrift: "adelia.ttf", versalAnteil: 0.06995, mitteAnteil: 0.76415, sperrung: 0, versalien: false },
  ringe: { mitteAnteil: 0.84855, breiteAnteil: 0.0529, strichAnteil: 0.0012 },
  // Versalhoehe am ersten Buchstaben gemessen, Sperrung so, dass die Zeilen der Vorlage ihre Breite treffen.
  zeile1: { schrift: "AvenirNext-UltraLight.ttf", versalAnteil: 0.01269, mitteAnteil: 0.88934, sperrung: 0.13, versalien: true },
  zeile2: { schrift: "AvenirNext-Medium.ttf", versalAnteil: 0.01292, mitteAnteil: 0.91874, sperrung: 0.13, versalien: true },
  zeile3: { schrift: "AvenirNext-UltraLight.ttf", versalAnteil: 0.01292, mitteAnteil: 0.94818, sperrung: 0.115, versalien: true },
  maxBreiteAnteil: 0.8,
};

/** Abweichungen von A4, gemessen wie dort. */
const HERZ_JE_FORMAT: Partial<Record<FormatKey, Partial<HerzLayout>>> = {
  a5: {
    zeile1: { ...HERZ_A4.zeile1, versalAnteil: 0.01512, mitteAnteil: 0.88655 },
    zeile2: { ...HERZ_A4.zeile2, versalAnteil: 0.01543, mitteAnteil: 0.91577 },
    zeile3: { ...HERZ_A4.zeile3, versalAnteil: 0.01512, mitteAnteil: 0.94547 },
    ringe: { mitteAnteil: 0.84079, breiteAnteil: 0.0525, strichAnteil: 0.0014 },
  },
  a3: {
    zeile1: { ...HERZ_A4.zeile1, versalAnteil: 0.01291, mitteAnteil: 0.88958 },
    zeile2: { ...HERZ_A4.zeile2, versalAnteil: 0.01291, mitteAnteil: 0.91894 },
    zeile3: { ...HERZ_A4.zeile3, versalAnteil: 0.01307, mitteAnteil: 0.94871 },
  },
};

export function herzLayout(format: FormatKey): HerzLayout {
  return { ...HERZ_A4, ...(HERZ_JE_FORMAT[format] ?? {}) };
}

/**
 * Massstab der bisherigen Karten: 1:12 092 in jedem Format (md2.jsx, Zoom 14,12). Der Kunde zoomt davon aus weiter;
 * die Stege bleiben dabei nie unter dem Holz-Mindestmass (dichte.ts).
 */
export const HOLZ_MASSSTAB = 12092;

/**
 * Strassen in Holz (Marcel 15.11.2026: Holz braucht breitere Stege als Acryl). Gemessen an sieben produzierten
 * MD2-Dateien: Nebenstrassen 0,8-1,2 mm (Median 0,9), Hauptstrassen 1,6-2 mm – das lief gut. Darum etwas ueber dem
 * Acryl-Satz und Mindeststeg 1,0 mm statt 0,7. Breiten bei A4-Bezug (196 mm Kartenbreite), sie wachsen mit dem Format.
 */
export const STRASSEN_HOLZ = STRASSEN_STANDARD.map((g) => {
  const holz: Record<string, number> = { fern: 2.6, primaer: 2.2, sekundaer: 2.0, tertiaer: 1.7, bahn: 1.4, wohn: 1.3 };
  // Fuss- und Parkwege schnitt die alte Holzkarte mit (Mapbox-Style "cut-roads"): sie duerfen nachruecken.
  return { ...g, klassen: [...g.klassen], breiteMm: holz[g.id] ?? g.breiteMm, nachruecken: g.id === "fuss" ? true : g.nachruecken };
});

/** Die vollstaendige Eingabe einer Holzkarte im Format, mit Beispieltext der Vorlage. */
export function standardHolzkarte(format: FormatKey = "a4"): Schichtkarte {
  const basis = standardSchichtkarte();
  const herz = herzLayout(format);
  const breite = { a5: 148.5, a4: 210, a3: 297 }[format as "a5" | "a4" | "a3"] ?? 210;
  return {
    ...basis,
    kunde: {
      ...basis.kunde,
      adresse: "Potsdam",
      titel: "We said yes",
      namen: "Tracy & Huy",
      ortDatum: "Potsdam, 2. August 2025",
      letzteZeile: "koordinaten",
      ortText: "",
      symbol: "herz",
      symbolGroesse: "klein",
      // Wie die bisherige Holzkarte: auch Park- und Fusswege geschnitten (Potsdam deckungsgleich mit dem Produktfoto).
      strassenStufe: "viel",
    },
    lon: 13.0485,
    lat: 52.4425,
    format,
    ausschnittKm: Math.round(((breite * herz.breiteAnteil * HOLZ_MASSSTAB) / 1e6) * 100) / 100,
    rahmenMm: 7,
    aufbau: "holz",
    layoutArt: "herz",
    herz,
    holz: HOLZ_STANDARD,
    strassen: STRASSEN_HOLZ,
    netzMinBreiteMm: 1.0,
    // Holz wird nicht aufgedickt: die Tabelle ist schon breit, sonst laufen Hauptstrassen auf 3 mm (Potsdam 1,3-fach).
    generalisierung: { ...basis.generalisierung, maxFaktor: 1 },
    stabilitaet: { rasterMm: 1.0, rasterSpanneMm: 20, langMm: 1.3 },
    // Holz: kleinere Bloecke und schmalere Spalte loesen sich nicht sauber, kleine Inseln brechen aus 5 mm Nuss.
    netzMinLochMm2: 6,
    netzMinSpaltMm: 0.8,
    wasserMinFlaecheMm2: 10,
    wasserMinBreiteMm: 1.5,
    wasserInselMinMm2: 25,
  };
}
