import { flaecheMm2, schneide, type Flaeche } from "./geometrie";
import type { Schichtkarte, TextStil } from "./typen";
import { letzteZeileText } from "./zeichen";

export interface GesetzteZeile {
  name: string;
  flaeche: Flaeche;
  versalhoeheMm: number;
}

export interface Textblock {
  zeilen: GesetzteZeile[];
  texte: { titel: string; zeile1: string; zeile2: string };
  /** Weisse Schutzkontur um die Texte (nur eingebettet, sonst leer). */
  schutz: Flaeche;
  /** Wo Text steht – lose Teile darin zaehlen als Text, nicht als Netz. */
  textBereich: Flaeche;
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
