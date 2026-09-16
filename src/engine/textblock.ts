import { gms } from "./geo";
import { flaecheMm2, schneide, vereinige, zuFlaeche, type Flaeche } from "./geometrie";
import { setzeZeile } from "./schrift";
import type { Layout, Schichtkarte, TextStil } from "./typen";

export interface Textblock {
  /** Je Zeile getrennt – die Stencil-Grenze haengt an der Schriftgroesse der Zeile. */
  zeilen: { name: string; flaeche: Flaeche; versalhoeheMm: number }[];
  texte: { titel: string; zeile1: string; zeile2: string };
  warnungen: string[];
}

/** Die drei Zeilen so, wie sie auf dem Poster stehen. */
export function zeilenAusEingabe(k: Schichtkarte) {
  const zeile2 =
    k.kunde.letzteZeile === "koordinaten"
      ? [k.kunde.ortText.trim(), gms(k.lat, "breite"), gms(k.lon, "laenge")].filter(Boolean).join(" ")
      : k.kunde.wunschtext.trim();
  return {
    titel: stil(k.kunde.titel.trim(), k.titelStil),
    zeile1: stil(k.kunde.namen.trim(), k.zeilenStil),
    zeile2: stil(zeile2, k.zeilenStil),
  };
}

function stil(text: string, s: TextStil) {
  return s.versalien ? text.toLocaleUpperCase("de-DE") : text;
}

/**
 * Setzt Titel und beide Zeilen als eine Flaeche – das, was aus der weissen
 * Lage ausgeschnitten wird. Die Stencil-Stege kommen spaeter dazu.
 */
export function setzeTextblock(k: Schichtkarte, layout: Layout): Textblock {
  const { platte, kartenfenster } = layout;
  const warnungen: string[] = [];
  const texte = zeilenAusEingabe(k);

  // Innenabstand zur Rahmenkante, damit Buchstaben nicht in den Falz laufen.
  const maxBreite = platte.breiteMm - 2 * k.rahmenMm - 2 * Math.max(4, platte.breiteMm * 0.05);
  const mitteX = platte.breiteMm / 2;
  const kartenUnterkante = kartenfenster.yMm + kartenfenster.hoeheMm;

  const gesetzt: Textblock["zeilen"] = [];
  const zeilen: [string, string, TextStil, number][] = [
    ["Titel", texte.titel, k.titelStil, k.titelMitteAnteil],
    ["Namen", texte.zeile1, k.zeilenStil, k.zeile1MitteAnteil],
    ["Letzte Zeile", texte.zeile2, k.zeilenStil, k.zeile2MitteAnteil],
  ];

  for (const [name, text, s, mitteAnteil] of zeilen) {
    if (!text) continue;
    try {
      const versalhoeheMm = platte.hoeheMm * s.hoeheAnteil;
      const zeile = setzeZeile({
        text,
        schrift: s.schrift,
        versalhoeheMm,
        sperrungEm: s.sperrung,
        mitteX,
        mitteY: platte.hoeheMm * mitteAnteil,
        maxBreiteMm: maxBreite,
      });
      if (zeile.faktor < 0.999) {
        warnungen.push(`${name} war zu breit und wurde auf ${Math.round(zeile.faktor * 100)} % verkleinert.`);
      }
      const oberkante = Math.min(...zeile.ringe.flat().map((p) => p.y));
      if (oberkante < kartenUnterkante) {
        warnungen.push(
          `${name} ragt ${(kartenUnterkante - oberkante).toFixed(1)} mm in das Kartenfenster – dort ist kein Weiss zum Ausschneiden.`,
        );
      }
      gesetzt.push({ name, flaeche: vereinige(zuFlaeche(zeile.ringe)), versalhoeheMm: versalhoeheMm * zeile.faktor });
    } catch (e) {
      warnungen.push(`${name}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  // Beruehren sich zwei Zeilen, verschmelzen ihre Ausschnitte zu einem Loch.
  // Ob das passiert, haengt am Kundentext: der Schwung eines Z reicht weiter
  // hinunter als der eines H. Darum pruefen statt nur gut positionieren.
  for (let i = 0; i < gesetzt.length; i++) {
    for (let j = i + 1; j < gesetzt.length; j++) {
      const beruehrung = flaecheMm2(schneide(gesetzt[i].flaeche, gesetzt[j].flaeche));
      if (beruehrung > 0.01) {
        warnungen.push(
          `${gesetzt[i].name} und ${gesetzt[j].name} beruehren sich (${beruehrung.toFixed(1)} mm²) – ` +
            "die Ausschnitte verschmelzen. Zeilen auseinanderschieben.",
        );
      }
    }
  }

  return { zeilen: gesetzt, texte, warnungen };
}
