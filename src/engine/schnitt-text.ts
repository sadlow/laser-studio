import { ringeInMm, vereinige, verschiebe, ziehAb, zuFlaeche, type Flaeche } from "./geometrie";
import { ohneSplitter } from "./punzen";
import { setzeGlyphen, type ZeilenSatz } from "./schrift";
import { abstaendeSichern, GRAD, gradRing, spreize } from "./sonderzeichen";
import { stegeDruckschrift, type StegRegeln } from "./stencil";
import { stegeSchreibschrift } from "./stencil-schreib";
import { duennsterStrich, mitMindeststrich, versatzEckig } from "./strich";

// Reste unter dieser Flaeche loesen sich nicht sauber aus der Platte.
const SPLITTER_MM2 = 0.05;

export interface SchnittRegeln extends StegRegeln {
  /** So breit muss jeder Strich sein, sonst schweisst die Fuge wieder zu (Testblatt 17.09.2026). */
  minStrichMm: number;
  /** So viel Material bleibt mindestens stehen: zwischen Buchstaben, zwischen den Strichen des “. */
  materialMm: number;
}

export interface SchnittText {
  /** Die Schrift, verstaerkt, ohne Stege – fuer Beruehrungspruefung und Schutzkontur. */
  flaeche: Flaeche;
  /** Was der Laser ausschneidet: verstaerkte Schrift, Punzen an Stegen. */
  schnitt: Flaeche;
  zugabeMm: number;
  stege: number;
  zugefuellt: number;
  ohneSteg: number;
  breiteMm: number;
  /** Kleiner als 1, wenn die Zeile auf die verfuegbare Breite verkleinert wurde. */
  faktor: number;
}

/**
 * Setzt eine Zeile so, wie der Laser sie ausschneidet.
 *
 * Druckschrift Glyphe fuer Glyphe: Strich an Buchstaben und Ziffern gemessen und eckig verstaerkt (runde Ecken
 * blaehten Book an jeder Kreuzung auf), Gradzeichen als Ring, Striche der Anfuehrungszeichen auseinander,
 * Buchstaben mit Material dazwischen, dann Stege nach Regel (stencil.ts).
 * Schreibschrift als Ganzes: die Buchstaben haengen zusammen. Nur aussen verstaerkt, damit die Schleifen offen
 * bleiben (Marcel 17.09.2026), Stege durch die duennste Wand (stencil-schreib.ts).
 *
 * Das Ergebnis haengt nur von Text, Schrift und Regeln ab, nicht von der Lage – gemerkt wird es fuer die Mitte 0,
 * verschoben wird danach. Kartenaenderungen rechnen die Schrift nicht neu.
 */
export function setzeSchnittText(satz: ZeilenSatz, art: "druck" | "schreib", R: SchnittRegeln): SchnittText {
  const schluessel = JSON.stringify([satz.text, satz.schrift, satz.versalhoeheMm, satz.sperrungEm, satz.maxBreiteMm, art, R]);
  let t = GEMERKT.get(schluessel);
  if (!t) {
    t = art === "schreib" ? schreibschrift({ ...satz, mitteX: 0, mitteY: 0 }, R) : druckschrift({ ...satz, mitteX: 0, mitteY: 0 }, R);
    if (GEMERKT.size > 100) GEMERKT.clear();
    GEMERKT.set(schluessel, t);
  }
  return { ...t, flaeche: verschiebe(t.flaeche, satz.mitteX, satz.mitteY), schnitt: verschiebe(t.schnitt, satz.mitteX, satz.mitteY) };
}

const GEMERKT = new Map<string, SchnittText>();

function druckschrift(satz: ZeilenSatz, R: SchnittRegeln): SchnittText {
  const g = setzeGlyphen(satz);
  const glyphen = g.glyphen.map((x) => ({ zeichen: x.zeichen, ink: vereinige(zuFlaeche(x.ringe)) }));
  const buchstaben = vereinige(...glyphen.filter((x) => /[\p{L}\p{N}]/u.test(String.fromCodePoint(x.zeichen))).map((x) => x.ink));
  const zugabeMm = buchstaben.length ? Math.max(0, R.minStrichMm - duennsterStrich(buchstaben)) : 0;
  for (const x of glyphen) {
    if (zugabeMm > 0) x.ink = versatzEckig(x.ink, zugabeMm / 2);
    x.ink = x.zeichen === GRAD ? gradRing(x.ink, R.minStrichMm, R.offenUnterMm + 0.1) : spreize(x.ink, R.materialMm);
  }
  abstaendeSichern(glyphen, R.materialMm);

  let [stege, zugefuellt, ohneSteg] = [0, 0, 0];
  const schnitte: Flaeche[] = [];
  for (const x of glyphen) {
    if (!x.ink.length) continue;
    // Das Gradzeichen nur mit einem Steg unten: mit zweien las es sich als kleine Null.
    const s = stegeDruckschrift(x.ink, R, x.zeichen === GRAD);
    stege += s.anzahl;
    zugefuellt += s.zugefuelltAnzahl;
    ohneSteg += s.ohneSteg;
    schnitte.push(ohneSplitter(ziehAb(vereinige(x.ink, s.zugefuellt), s.stege), SPLITTER_MM2));
  }
  // Wieder mittig: verstaerkt und auseinandergerueckt ist die Zeile breiter geworden.
  const flaeche = vereinige(...glyphen.map((x) => x.ink));
  const xs = ringeInMm(flaeche).flat().map((p) => p.x);
  const dx = xs.length ? satz.mitteX - (Math.min(...xs) + Math.max(...xs)) / 2 : 0;
  return {
    flaeche: verschiebe(flaeche, dx, 0),
    schnitt: verschiebe(vereinige(...schnitte), dx, 0),
    zugabeMm,
    stege,
    zugefuellt,
    ohneSteg,
    breiteMm: xs.length ? Math.max(...xs) - Math.min(...xs) : 0,
    faktor: g.faktor,
  };
}

function schreibschrift(satz: ZeilenSatz, R: SchnittRegeln): SchnittText {
  const g = setzeGlyphen(satz);
  const roh = vereinige(zuFlaeche(g.glyphen.flatMap((x) => x.ringe)));
  const { flaeche, zugabeMm } = mitMindeststrich(roh, R.minStrichMm, true);
  const s = stegeSchreibschrift(flaeche, R);
  return {
    flaeche,
    schnitt: ohneSplitter(ziehAb(vereinige(flaeche, s.zugefuellt), s.stege), SPLITTER_MM2),
    zugabeMm,
    stege: s.anzahl,
    zugefuellt: s.zugefuelltAnzahl,
    ohneSteg: s.ohneSteg,
    breiteMm: g.breiteMm,
    faktor: g.faktor,
  };
}
