import { rechteck, ringeInMm, ziehAb } from "./geometrie";
import { setzeSchnittText } from "./schnitt-text";
import type { Layout, Schichtkarte, TextStil } from "./typen";
import { pruefeBeruehrungen, schnittRegeln, zeilenAusEingabe, type Textblock } from "./zeilen";

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
  // Der Titel ist Schreibschrift (TITELSCHRIFTEN), die Zeilen sind Druckschrift – danach richten sich Verstaerken
  // und Stege (schnitt-text.ts).
  const zeilen: [string, string, TextStil, number, "schreib" | "druck"][] = [
    ["Titel", texte.titel, k.titelStil, k.titelMitteAnteil, "schreib"],
    ["Namen", texte.zeile1, k.zeilenStil, k.zeile1MitteAnteil, "druck"],
    ["Letzte Zeile", texte.zeile2, k.zeilenStil, k.zeile2MitteAnteil, "druck"],
  ];

  for (const [name, text, s, mitteAnteil, art] of zeilen) {
    if (!text) continue;
    try {
      const versalhoeheMm = platte.hoeheMm * s.hoeheAnteil;
      const satz = { text, schrift: s.schrift, versalhoeheMm, sperrungEm: s.sperrung, mitteX, mitteY: platte.hoeheMm * mitteAnteil, maxBreiteMm: maxBreite };
      const zeile = setzeSchnittText(satz, art, schnittRegeln(k, s));
      if (zeile.faktor < 0.999) {
        warnungen.push(`${name} war zu breit und wurde auf ${Math.round(zeile.faktor * 100)} % verkleinert.`);
      }
      const oberkante = Math.min(...ringeInMm(zeile.flaeche).flat().map((p) => p.y));
      if (oberkante < kartenUnterkante) {
        warnungen.push(
          `${name} ragt ${(kartenUnterkante - oberkante).toFixed(1)} mm in das Kartenfenster – dort ist kein Weiss zum Ausschneiden.`,
        );
      }
      const { flaeche, schnitt, zugabeMm, stege, zugefuellt, ohneSteg } = zeile;
      gesetzt.push({ name, flaeche, schnitt, versalhoeheMm: versalhoeheMm * zeile.faktor, zugabeMm, stege, zugefuellt, ohneSteg });
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
