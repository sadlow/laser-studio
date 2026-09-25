import { flaecheMm2, schneide, type Flaeche } from "./geometrie";
import type { SchnittRegeln } from "./schnitt-text";
import type { Schichtkarte, TextStil } from "./typen";
import { letzteZeileText } from "./zeichen";

export interface GesetzteZeile {
  name: string;
  /** Die Schrift, verstaerkt, ohne Stege – daran wird Beruehrung geprueft und die Schutzkontur gelegt. */
  flaeche: Flaeche;
  /** Was ausgeschnitten wird: Punzen an Stegen (schnitt-text.ts). */
  schnitt: Flaeche;
  versalhoeheMm: number;
  /** Um so viel wurde der Strich verstaerkt, damit er schneidbar ist. */
  zugabeMm: number;
  stege: number;
  zugefuellt: number;
  /** Punzen, fuer die kein Steg gefunden wurde – sie fielen heraus. */
  ohneSteg: number;
}

export interface Textblock {
  zeilen: GesetzteZeile[];
  texte: { titel: string; zeile1: string; zeile2: string };
  /** Weisse Schutzkontur um die Texte (nur eingebettet, sonst leer). */
  schutz: Flaeche;
  /** Wo Text steht – lose Teile darin zaehlen als Text, nicht als Netz. */
  textBereich: Flaeche;
  /** Hier laufen keine Strassen: der Graben um einen Titel, der als Material in der Karte steht (Layout "kante"). */
  freiraum?: Flaeche;
  /** Schwarze Umrandung unter einem Titel der Deckschicht – gehoert zum Netz, die Strassen laufen hinein. */
  traeger?: Flaeche;
  warnungen: string[];
}

/** Die drei Zeilen so, wie sie auf dem Poster stehen. */
export function zeilenAusEingabe(k: Schichtkarte) {
  return {
    titel: stil(k.kunde.titel.trim(), k.titelStil),
    zeile1: stil(k.kunde.namen.trim(), k.zeilenStil),
    zeile2: stil(letzteZeileText(k), k.zeilenStil),
  };
}

/**
 * Schnittregeln einer Zeile aus den Fertigungswerten: Stege nie schmaler als das Mindestmaterial, das auch
 * zwischen Buchstaben stehen bleibt.
 */
export function schnittRegeln(k: Schichtkarte, s: TextStil): SchnittRegeln {
  return {
    minStrichMm: s.minStrichMm,
    stegMm: Math.max(k.stegMm, k.stegMinMm),
    materialMm: k.stegMinMm,
    offenUnterMm: k.stencilMinInselBreiteMm,
  };
}

function stil(text: string, s: TextStil) {
  return s.versalien ? text.toLocaleUpperCase("de-DE") : text;
}

/**
 * Beruehren sich zwei Zeilen, verschmelzen ihre Ausschnitte zu einem Loch.
 * Ob das passiert, haengt am Kundentext: der Schwung eines Z reicht weiter als
 * der eines H, ein langer Name weiter in die Mitte als ein kurzer.
 */
export function pruefeBeruehrungen(zeilen: GesetzteZeile[], warnungen: string[]) {
  for (let i = 0; i < zeilen.length; i++) {
    for (let j = i + 1; j < zeilen.length; j++) {
      const beruehrung = flaecheMm2(schneide(zeilen[i].flaeche, zeilen[j].flaeche));
      if (beruehrung > 0.01) {
        warnungen.push(
          `${zeilen[i].name} und ${zeilen[j].name} beruehren sich (${beruehrung.toFixed(1)} mm²) – ` +
            "die Ausschnitte verschmelzen. Zeilen auseinanderschieben oder verkleinern.",
        );
      }
    }
  }
}
