import { ohneLoecher, vereinige, versatz, zuFlaeche, type Flaeche } from "./geometrie";
import { setzeZeile } from "./schrift";
import type { Anker, Layout, Schichtkarte, TextStil } from "./typen";
import { pruefeBeruehrungen, zeilenAusEingabe, type GesetzteZeile, type Textblock } from "./zeilen";

// Die Schutzkontur greift so weit in den Rahmen. Enden beide exakt aufeinander,
// beruehren sie sich nur in einer Linie und bleiben zwei Teile.
const UEBERLAPPUNG_MM = 1;
// Glaettung: Kerben zwischen Buchstaben, schmaler als das Doppelte, werden
// geschlossen. Ohne sie folgt die Kontur jedem Schwung und wirkt unruhig.
const GLAETTUNG_MM = 2.5;

/**
 * Eingebettetes Layout (Quadrat-Entwurf Marcel 16.09.2026): Die Karte fuellt
 * die Platte, die Texte stehen an Ankern am Rand. Um jeden Text liegt eine
 * weisse Schutzkontur, die nahtlos in Rahmen und Strassennetz uebergeht –
 * dasselbe Prinzip wie der Konturtraeger bei den Schriftzuegen.
 *
 * Positioniert wird hier nach dem Umriss, nicht nach der Grundlinie: jede
 * Zeile steht allein an ihrem Rand, und ihre Kontur soll den Rahmen immer
 * genau erreichen, egal wie weit der Schwung des Kundentextes reicht.
 */
export function setzeEingebettet(k: Schichtkarte, layout: Layout): Textblock {
  const { platte, kartenfenster: f } = layout;
  const e = k.eingebettet;
  const warnungen: string[] = [];
  const texte = zeilenAusEingabe(k);
  const abstand = e.schutzMm - UEBERLAPPUNG_MM;

  const zeilen: [string, string, TextStil, Anker][] = [
    ["Titel", texte.titel, k.titelStil, e.titelAnker],
    ["Namen", texte.zeile1, k.zeilenStil, e.zeile1Anker],
    ["Letzte Zeile", texte.zeile2, k.zeilenStil, e.zeile2Anker],
  ];

  const gesetzt: GesetzteZeile[] = [];
  const konturen: Flaeche[] = [];

  for (const [name, text, s, anker] of zeilen) {
    if (!text) continue;
    try {
      const versalhoeheMm = platte.hoeheMm * s.hoeheAnteil;
      // Ecken teilen sich ihre Kante mit der Gegenecke und der Mitte.
      const maxBreite = (anker.endsWith("mitte") ? 0.7 : 0.45) * f.breiteMm;
      const zeile = setzeZeile({
        text,
        schrift: s.schrift,
        versalhoeheMm,
        sperrungEm: s.sperrung,
        mitteX: 0,
        mitteY: 0,
        maxBreiteMm: maxBreite,
      });
      if (zeile.faktor < 0.999) {
        warnungen.push(`${name} war zu breit fuer seinen Platz und wurde auf ${Math.round(zeile.faktor * 100)} % verkleinert.`);
      }

      const punkte = zeile.ringe.flat();
      const x0 = Math.min(...punkte.map((p) => p.x));
      const x1 = Math.max(...punkte.map((p) => p.x));
      const y0 = Math.min(...punkte.map((p) => p.y));
      const y1 = Math.max(...punkte.map((p) => p.y));

      const dx = anker.endsWith("links")
        ? f.xMm + abstand - x0
        : anker.endsWith("rechts")
          ? f.xMm + f.breiteMm - abstand - x1
          : platte.breiteMm / 2 - (x0 + x1) / 2;
      const dy = anker.startsWith("oben") ? f.yMm + abstand - y0 : f.yMm + f.hoeheMm - abstand - y1;

      const flaeche = vereinige(zuFlaeche(zeile.ringe.map((r) => r.map((p) => ({ x: p.x + dx, y: p.y + dy })))));
      gesetzt.push({ name, flaeche, versalhoeheMm: versalhoeheMm * zeile.faktor });
      konturen.push(schutzkontur(flaeche, e.schutzMm));
    } catch (err) {
      warnungen.push(`${name}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  pruefeBeruehrungen(gesetzt, warnungen);
  const schutz = vereinige(...konturen);
  return { zeilen: gesetzt, texte, schutz, textBereich: schutz, warnungen };
}

/**
 * Aufweiten, glaetten (weiter auf und wieder zu), Loecher schliessen. Ein Loch
 * in der Kontur – etwa im Bogen des Z – zeigte mitten im Weiss ein Stueck Karte.
 */
function schutzkontur(text: Flaeche, mm: number): Flaeche {
  if (mm <= 0) return [];
  const geglaettet = versatz(versatz(text, mm + GLAETTUNG_MM), -GLAETTUNG_MM);
  return ohneLoecher(geglaettet);
}
