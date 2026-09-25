import { enthaelt, schwerpunkt, teile, vereinige, ziehAb } from "./geometrie";
import { sichtbareGravur } from "./gravur-export";
import type { Bausteine } from "./lagen";
import { SYMBOL_TITEL } from "./symbole";
import { SPLITTER_MM2 } from "./wasser";
import { FARBE_LOSE, FARBE_SCHWARZ, FARBE_WEISS, laserSvg, vorschauSvg, type Gravur, type Malschritt } from "./svg";
import type { LagenKey, Lage, Layout, Schichtkarte, Teil } from "./typen";

export interface Stapel {
  lagen: Lage[];
  vorschauSvg: string;
  loseNetzstuecke: number;
  loseTextteile: number;
  hintergrundTeile: number;
}

// Nach den ersten A5-Karten (19.09.2026), gegen die Flaeche daneben gemessen: auf Weiss eine graue Rille, gut
// lesbar. Schwarzes Frost-Acryl ist Anthrazit, nicht Tiefschwarz; seine Gravur ist eine Rille mit dunklem Grund und
// heller Kante – von weitem ein feiner, nur wenig hellerer Strich (vorher hellgrau, viel zu kraeftig).
export const GRAVUR_AUF_SCHWARZ = "#565654";
export const GRAVUR_AUF_WEISS = "#bcbcb9";
export const FARBE_FROST = "#2a2a2a";

/**
 * Setzt aus den Bausteinen die Lagen des gewaehlten Aufbaus zusammen. Alle
 * Aufbauten sind gleich gebaut – Netz-Lage ueber Hintergrund-Lage ueber Blau –,
 * nur die Farben von Netz und Hintergrund tauschen. Beim vierlagigen kommt eine
 * weisse Deckschicht mit Rahmen und Text dazu.
 *
 * Das Symbol wird auf den Hintergrund geklebt, auf eine gravierte Klebeflaeche; die Lagen
 * darueber haben an seiner Stelle einen Ausschnitt in Symbolform, und es steht
 * ueber das Netz hinaus (Marcel 16.09.2026, zuerst auf Blau geplant).
 */
export function stapleLagen(k: Schichtkarte, layout: Layout, b: Bausteine): Stapel {
  const rahmen = ziehAb(b.plattenFl, b.fensterFl);
  // Unter Bruecken wird nicht geschnitten: dort liegt Netz darueber, und der
  // Hintergrund haelt ueber die Bruecke zusammen, statt am Fluss zu zerfallen.
  const hintergrund = teile(ziehAb(b.plattenFl, ziehAb(b.wasser, b.netz)), SPLITTER_MM2);
  const blau = teile(b.plattenFl);
  const symbolTitel = SYMBOL_TITEL[k.kunde.symbol] ?? "Symbol";
  const gravur = sichtbareGravur(b.gravur, k.gravurExport);

  if (k.aufbau === "netz-schwarz") {
    const deck = teile(ziehAb(vereinige(rahmen, b.schutz), vereinige(b.textAusschnitt, b.symbolLoch)), SPLITTER_MM2);
    // Unter den Texten bleibt das Schwarz voll: die Buchstaben zeigen schwarz,
    // und die Deckschicht hat dort Flaeche zum Aufkleben.
    const netz = teile(ziehAb(vereinige(rahmen, b.netz, b.schutz, b.traeger), b.symbolLoch), SPLITTER_MM2);
    const [netzHaupt, ...netzLose] = netz;

    const schritte: Malschritt[] = [
      { art: "flaeche", teile: blau, fuellung: "url(#blau)" },
      { art: "flaeche", teile: hintergrund, fuellung: FARBE_WEISS, schatten: true },
      { art: "gravur", gravur, farbe: GRAVUR_AUF_WEISS },
      { art: "flaeche", teile: b.klebeflaeche, fuellung: GRAVUR_AUF_WEISS },
      { art: "flaeche", teile: netzHaupt ? [netzHaupt] : [], fuellung: FARBE_SCHWARZ, schatten: true },
      { art: "flaeche", teile: netzLose, fuellung: k.loseTeileMarkieren ? FARBE_LOSE : FARBE_SCHWARZ },
      { art: "flaeche", teile: deck, fuellung: FARBE_WEISS, schatten: true },
      { art: "flaeche", teile: b.symbol, fuellung: "url(#rot)", schatten: true, id: "symbol" },
    ];
    return {
      lagen: [
        lage(k, layout, "symbol", symbolTitel, "Spiegelacryl rot", b.symbol),
        lage(k, layout, "deck", "Weiss oben", "Acrylglas weiss", deck),
        lage(k, layout, "netz", "Schwarz (Netz)", "Acrylglas schwarz", netz),
        lage(k, layout, "hintergrund", "Weiss unten", "Acrylglas weiss", hintergrund, b.gravur, b.klebeflaeche),
        lage(k, layout, "blau", "Blau", "Spiegelacryl blau", blau),
      ],
      vorschauSvg: vorschauSvg(layout, schritte),
      loseNetzstuecke: netzLose.length,
      loseTextteile: Math.max(0, deck.length - 1),
      hintergrundTeile: hintergrund.length,
    };
  }

  // Dreilagig: die Texte sitzen im Netz selbst. Weisses oder schwarzes Netz
  // sind dieselbe Geometrie mit getauschten Farben.
  const schwarz = k.aufbau === "netz-schwarz-dreilagig";
  const [netzFarbe, netzTitel, netzMaterial] = schwarz
    ? [FARBE_SCHWARZ, "Schwarz (Netz)", "Acrylglas schwarz"]
    : [FARBE_WEISS, "Weiss (Netz)", "Acrylglas weiss"];
  const [grundFarbe, grundTitel, grundMaterial] = schwarz
    ? [FARBE_WEISS, "Weiss", "Acrylglas weiss"]
    : [k.grundSchwarzFrost ? FARBE_FROST : FARBE_SCHWARZ, "Schwarz", "Acrylglas schwarz"];
  const netz = teile(ziehAb(vereinige(rahmen, b.netz, b.schutz), vereinige(b.textAusschnitt, b.symbolLoch)), SPLITTER_MM2);
  const [netzHaupt, ...lose] = netz;
  const loseText = lose.filter((t) => enthaelt(b.textBereich, schwerpunkt(t)));
  const loseNetz = lose.filter((t) => !loseText.includes(t));

  const schritte: Malschritt[] = [
    { art: "flaeche", teile: blau, fuellung: "url(#blau)" },
    { art: "flaeche", teile: hintergrund, fuellung: grundFarbe, schatten: true },
    { art: "gravur", gravur, farbe: schwarz ? GRAVUR_AUF_WEISS : GRAVUR_AUF_SCHWARZ },
    { art: "flaeche", teile: b.klebeflaeche, fuellung: schwarz ? GRAVUR_AUF_WEISS : GRAVUR_AUF_SCHWARZ },
    { art: "flaeche", teile: netzHaupt ? [netzHaupt, ...loseText] : [], fuellung: netzFarbe, schatten: true },
    { art: "flaeche", teile: loseNetz, fuellung: k.loseTeileMarkieren ? FARBE_LOSE : netzFarbe },
    { art: "flaeche", teile: b.symbol, fuellung: "url(#rot)", schatten: true, id: "symbol" },
  ];
  return {
    lagen: [
      lage(k, layout, "symbol", symbolTitel, "Spiegelacryl rot", b.symbol),
      lage(k, layout, "netz", netzTitel, netzMaterial, netz),
      lage(k, layout, "hintergrund", grundTitel, grundMaterial, hintergrund, b.gravur, b.klebeflaeche),
      lage(k, layout, "blau", "Blau", "Spiegelacryl blau", blau),
    ],
    vorschauSvg: vorschauSvg(layout, schritte),
    loseNetzstuecke: loseNetz.length,
    loseTextteile: loseText.length,
    hintergrundTeile: hintergrund.length,
  };
}

function lage(k: Schichtkarte, layout: Layout, key: LagenKey, titel: string, material: string, t: Teil[], gravur: Gravur = [], klebeflaeche: Teil[] = []): Lage {
  // Nur der schwarze Hintergrund wird graviert – er ist dick und matt; ein schwarzes Netz bleibt glaenzend.
  const grundSchwarz = key === "hintergrund" && material === "Acrylglas schwarz";
  const staerkeMm = material.startsWith("Spiegelacryl") ? k.staerkenMm.spiegel : grundSchwarz ? k.staerkenMm.grundSchwarz : k.staerkenMm.acryl;
  // Frost steht im Materialnamen: so erscheint es in der Pruefung, in jeder Laserdatei und in der 3D-Ansicht.
  if (grundSchwarz && k.grundSchwarzFrost) material = "Acrylglas schwarz Frost";
  const beschreibung = `Lage ${titel} – ${material}, ${staerkeMm} mm`;
  return { key, titel, material, staerkeMm, teile: t, gravur, klebeflaeche, laserSvg: laserSvg(layout, beschreibung, t, gravur, klebeflaeche) };
}
