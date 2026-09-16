import { rechteck, vereinige, ziehAb, zuFlaeche } from "./geometrie";
import { setzeZeile } from "./schrift";
import type { Layout, Schichtkarte, TextStil } from "./typen";
import { pruefeBeruehrungen, zeilenAusEingabe, type Textblock } from "./zeilen";

/**
 * Poster-Layout: Titel und beide Zeilen untereinander im Textfeld unter der
 * Karte, positioniert ueber die Versalhoehen-Mitte – so bleibt die Grundlinie
 * gleich, egal welchen Text der Kunde eingibt.
 */
export function setzePosterText(k: Schichtkarte, layout: Layout): Textblock {
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

  pruefeBeruehrungen(gesetzt, warnungen);

  const f = kartenfenster;
  const textBereich = ziehAb(
    rechteck(0, 0, platte.breiteMm, platte.hoeheMm),
    rechteck(f.xMm, f.yMm, f.breiteMm, f.hoeheMm),
  );
  return { zeilen: gesetzt, texte, schutz: [], textBereich, warnungen };
}
