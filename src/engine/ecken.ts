import type { Punkt } from "./clip";
import {
  abgerundetesRechteck,
  ohneLoecher,
  rechteck,
  schliesse,
  schneide,
  vereinige,
  versatz,
  zuFlaeche,
  type Flaeche,
} from "./geometrie";
import { setzeZeile } from "./schrift";
import type { Anker, Layout, Schichtkarte, TextStil } from "./typen";
import { pruefeBeruehrungen, zeilenAusEingabe, type GesetzteZeile, type Textblock } from "./zeilen";

// So weit greift die weisse Form in den Rahmen. Enden beide exakt aufeinander,
// beruehren sie sich nur in einer Linie und bleiben zwei Teile.
const UEBERLAPPUNG_MM = 1;
// Glaettung der Buchstaben-Kontur: Kerben unter dem Doppelten werden geschlossen.
const GLAETTUNG_MM = 2.5;
// Luecke zwischen gestapelten Zeilen = Versalhoehe der unteren. So stehen sie
// auf dem Poster (Namen und Koordinaten: Mitten 2 Versalhoehen auseinander).
const ZEILENLUECKE_ANTEIL = 1.0;

interface Satz {
  name: string;
  ringe: Punkt[][];
  box: { x0: number; x1: number; y0: number; y1: number };
  versalhoeheMm: number;
}

/**
 * Eingebettetes Layout: Die Karte fuellt die Platte, die Texte stehen am Rand.
 *
 * Zeilen mit demselben Anker bilden einen Block und stehen uebereinander wie
 * auf der DIN-Version. Jeder Block bekommt eine weisse Form, die in Rahmen und
 * Strassennetz uebergeht: ein abgerundetes Rechteck (Reiter) oder eine Kontur
 * um die Buchstaben. Die Kontur war beim Quadrat-Entwurf unruhig – bei einer
 * Schreibschrift folgt sie jedem Schwung, und drei Texte in drei Ecken zogen
 * den Blick in alle Richtungen (Marcel 16.09.2026).
 */
export function setzeEingebettet(k: Schichtkarte, layout: Layout): Textblock {
  const { platte, kartenfenster: f } = layout;
  const e = k.eingebettet;
  const warnungen: string[] = [];
  const texte = zeilenAusEingabe(k);

  const eingaben: [string, string, TextStil, Anker][] = [
    ["Titel", texte.titel, k.titelStil, e.titelAnker],
    ["Namen", texte.zeile1, k.zeilenStil, e.zeile1Anker],
    ["Letzte Zeile", texte.zeile2, k.zeilenStil, e.zeile2Anker],
  ];

  // 1. Jede Zeile fuer sich setzen, Reihenfolge merken.
  const bloecke = new Map<Anker, Satz[]>();
  for (const [name, text, s, anker] of eingaben) {
    if (!text) continue;
    try {
      const versalhoeheMm = platte.hoeheMm * s.hoeheAnteil;
      const maxBreite = (anker.endsWith("mitte") ? 0.7 : 0.45) * f.breiteMm;
      const z = setzeZeile({ text, schrift: s.schrift, versalhoeheMm, sperrungEm: s.sperrung, mitteX: 0, mitteY: 0, maxBreiteMm: maxBreite });
      if (z.faktor < 0.999) {
        warnungen.push(`${name} war zu breit fuer seinen Platz und wurde auf ${Math.round(z.faktor * 100)} % verkleinert.`);
      }
      const pk = z.ringe.flat();
      const box = {
        x0: Math.min(...pk.map((p) => p.x)),
        x1: Math.max(...pk.map((p) => p.x)),
        y0: Math.min(...pk.map((p) => p.y)),
        y1: Math.max(...pk.map((p) => p.y)),
      };
      bloecke.set(anker, [...(bloecke.get(anker) ?? []), { name, ringe: z.ringe, box, versalhoeheMm: versalhoeheMm * z.faktor }]);
    } catch (err) {
      warnungen.push(`${name}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  const gesetzt: GesetzteZeile[] = [];
  const formen: Flaeche[] = [];

  for (const [anker, saetze] of bloecke) {
    // 2. Stapeln. Positioniert wird nach Umriss: die weisse Form soll den Rand
    // immer genau erreichen, egal wie weit der Schwung des Kundentextes reicht.
    const breite = Math.max(...saetze.map((s) => s.box.x1 - s.box.x0));
    let y = 0;
    const lagen = saetze.map((s, i) => {
      if (i > 0) y += s.versalhoeheMm * ZEILENLUECKE_ANTEIL;
      const dx = anker.endsWith("links")
        ? -s.box.x0
        : anker.endsWith("rechts")
          ? breite - s.box.x1
          : breite / 2 - (s.box.x0 + s.box.x1) / 2;
      const dy = y - s.box.y0;
      y += s.box.y1 - s.box.y0;
      return { s, dx, dy };
    });
    const hoehe = y;

    // 3. Block an den Rand. Beim Reiter liegt der Innenabstand innerhalb der
    // Form, bei der Kontur greift sie 1 mm in den Rahmen.
    const abstand = e.form === "kontur" ? e.schutzMm - UEBERLAPPUNG_MM : e.schutzMm;
    const bx = anker.endsWith("links")
      ? f.xMm + abstand
      : anker.endsWith("rechts")
        ? f.xMm + f.breiteMm - abstand - breite
        : platte.breiteMm / 2 - breite / 2;
    const by = anker.startsWith("oben") ? f.yMm + abstand : f.yMm + f.hoeheMm - abstand - hoehe;

    const flaechen = lagen.map(({ s, dx, dy }) => {
      const fl = vereinige(zuFlaeche(s.ringe.map((r) => r.map((p) => ({ x: p.x + dx + bx, y: p.y + dy + by })))));
      gesetzt.push({ name: s.name, flaeche: fl, versalhoeheMm: s.versalhoeheMm });
      return fl;
    });

    formen.push(
      e.form === "kontur"
        ? schutzkontur(vereinige(...flaechen), e.schutzMm)
        : reiter(layout, anker, bx - e.schutzMm, by - e.schutzMm, breite + 2 * e.schutzMm, hoehe + 2 * e.schutzMm, e.eckenRadiusMm),
    );
  }

  pruefeBeruehrungen(gesetzt, warnungen);
  const schutz = vereinige(...formen);
  return { zeilen: gesetzt, texte, schutz, textBereich: schutz, warnungen };
}

/**
 * Abgerundetes Rechteck, das am Rand haengt. Auf der Randseite wird es in den
 * Rahmen verlaengert, damit seine runden Ecken dort im Weiss verschwinden; der
 * Uebergang zum Rahmen wird mit demselben Radius ausgerundet – sonst stoesst
 * der Reiter mit einer harten Innenecke an und wirkt angeklebt statt eingebunden.
 */
function reiter(layout: Layout, anker: Anker, x: number, y: number, b: number, h: number, radius: number): Flaeche {
  const { platte, kartenfenster: f } = layout;
  const zug = radius + UEBERLAPPUNG_MM;
  let [x0, y0, x1, y1] = [x, y, x + b, y + h];
  const baender: Flaeche[] = [];

  if (anker.startsWith("oben")) {
    y0 -= zug;
    baender.push(rechteck(0, 0, platte.breiteMm, f.yMm));
  } else {
    y1 += zug;
    baender.push(rechteck(0, f.yMm + f.hoeheMm, platte.breiteMm, platte.hoeheMm - f.yMm - f.hoeheMm));
  }
  if (anker.endsWith("links")) {
    x0 -= zug;
    baender.push(rechteck(0, 0, f.xMm, platte.hoeheMm));
  } else if (anker.endsWith("rechts")) {
    x1 += zug;
    baender.push(rechteck(f.xMm + f.breiteMm, 0, platte.breiteMm - f.xMm - f.breiteMm, platte.hoeheMm));
  }

  const form = abgerundetesRechteck(x0, y0, x1 - x0, y1 - y0, radius);
  const eingebunden = schliesse(vereinige(form, ...baender), radius);
  return schneide(eingebunden, rechteck(f.xMm, f.yMm, f.breiteMm, f.hoeheMm));
}

/** Kontur um die Buchstaben: aufweiten, glaetten, Loecher schliessen. */
function schutzkontur(text: Flaeche, mm: number): Flaeche {
  if (mm <= 0) return [];
  return ohneLoecher(versatz(versatz(text, mm + GLAETTUNG_MM), -GLAETTUNG_MM));
}
