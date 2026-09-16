import { clipPolyline, type Punkt } from "./clip";
import type { KartenRohdaten } from "./kacheln";
import type { Schichtkarte, StrassenGruppe, Zone } from "./typen";

/**
 * Welche Strassen geschnitten werden und wie breit – aus der Dichte vor Ort
 * (Vertrag: `Generalisierung` in typen-strassen.ts).
 *
 * Gemessen an acht Referenzorten, A4, 3,5 km, Deckung auf dem Land mit den
 * Breiten der Vorlage: Berlin-Tiergarten 33 %, Hamburg 49 %, Bogota 50 %,
 * Amsterdam 61 %, Tokio 64 %, New York 75 %, Allgaeu 7 %, Venedig 3 %. Mit
 * einer festen Breite lief Tokio weiss zu und das Allgaeu blieb schwarz.
 */
// Nachgerueckt wird erst unter der halben Zieldeckung, dann bis 10 % darueber:
// eine ganze Klasse auf Mindestbreite laesst sich nicht feiner dosieren.
// Venedig bei 2 km: Gassen 35 %.
const NACHRUECKEN_UNTER = 0.5;
const NACHRUECKEN_BIS = 1.1;

export interface NetzAuswahl {
  /** Breite je Gruppen-id aller geschnittenen Gruppen, in mm auf der Platte. */
  breiten: Map<string, number>;
  dichtefaktor: number;
  /** Deckung mit den Breiten der Vorlage (x Format), vor jeder Anpassung. */
  deckungVorOrt: number;
  /** Deckung mit den gewaehlten Breiten. */
  deckung: number;
  herabgestuft: string[];
  nachgerueckt: string[];
  anMindestbreite: string[];
}

/** Strassenlaenge je Gruppe im Kartenfenster, in mm auf der Platte. */
export function laengenImFenster(k: Schichtkarte, roh: KartenRohdaten, f: Zone): Map<string, number> {
  const laengen = new Map<string, number>();
  for (const g of k.strassen) {
    let summe = 0;
    for (const klasse of g.klassen) {
      for (const linie of roh.strassen.get(klasse) ?? []) {
        for (const t of clipPolyline(linie, f.xMm, f.yMm, f.xMm + f.breiteMm, f.yMm + f.hoeheMm)) summe += laenge(t);
      }
    }
    laengen.set(g.id, summe);
  }
  return laengen;
}

export function waehleNetz(k: Schichtkarte, laengen: Map<string, number>, landMm2: number, formatfaktor: number): NetzAuswahl {
  const g = k.generalisierung;
  const land = Math.max(1, landMm2);
  const lang = (s: StrassenGruppe) => (laengen.get(s.id) ?? 0) > 0;
  // Feinste zuerst: sie werden als erste graviert statt geschnitten.
  let netz = k.strassen.filter((s) => s.ziel === "netz" && lang(s)).sort((a, b) => a.breiteMm - b.breiteMm);
  const deckungMit = (gruppen: StrassenGruppe[], df: number) =>
    gruppen.reduce((s, x) => s + laengen.get(x.id)! * Math.max(k.netzMinBreiteMm, x.breiteMm * formatfaktor * df), 0) / land;
  const deckungVorOrt = netz.reduce((s, x) => s + laengen.get(x.id)! * x.breiteMm * formatfaktor, 0) / land;
  const herabgestuft: string[] = [];
  const nachgerueckt: string[] = [];

  let df = 1;
  if (g.aktiv) {
    df = loese((d) => deckungMit(netz, d), g.zielDeckung, g.maxFaktor);
    while (netz.length > 1 && netz[0].breiteMm * formatfaktor * df * g.maxAufdickung < k.netzMinBreiteMm) {
      herabgestuft.push(netz[0].titel);
      netz = netz.slice(1);
      df = loese((d) => deckungMit(netz, d), g.zielDeckung, g.maxFaktor);
    }
    // Zu licht: die naechste Gravurklasse rueckt nach, solange das Netz nicht zu
    // dicht wird. Allgaeu: Zufahrten und Feldwege; Venedig ab 2 km: Gassen.
    // Kleinstaedte (Deckung 20-28 %) bleiben, wie sie sind.
    if (g.nachruecken && !herabgestuft.length && deckungMit(netz, df) < g.zielDeckung * NACHRUECKEN_UNTER) {
      const kandidaten = k.strassen.filter((s) => s.ziel === "gravur" && s.nachruecken && lang(s));
      for (const kandidat of kandidaten) {
        const probe = [kandidat, ...netz];
        if (deckungMit(probe, df) > g.zielDeckung * NACHRUECKEN_BIS) break;
        netz = probe;
        nachgerueckt.push(kandidat.titel);
      }
    }
  }

  const breiten = new Map<string, number>();
  const anMindestbreite: string[] = [];
  for (const x of netz) {
    // Nachgerueckte Klassen sind fuer die Gravur bemessen – im Netz gilt die Mindestbreite.
    const breite = nachgerueckt.includes(x.titel) ? k.netzMinBreiteMm : x.breiteMm * formatfaktor * df;
    if (breite < k.netzMinBreiteMm && !nachgerueckt.includes(x.titel)) anMindestbreite.push(x.titel);
    breiten.set(x.id, Math.max(k.netzMinBreiteMm, breite));
  }
  const deckung = [...breiten.entries()].reduce((s, [id, b]) => s + (laengen.get(id) ?? 0) * b, 0) / land;
  return { breiten, dichtefaktor: df, deckungVorOrt, deckung, herabgestuft, nachgerueckt, anMindestbreite };
}

/** Faktor, bei dem die Deckung das Ziel trifft; die Deckung waechst mit dem Faktor. */
function loese(deckung: (df: number) => number, ziel: number, max: number): number {
  if (deckung(max) <= ziel) return max;
  let lo = 0.01;
  let hi = max;
  if (deckung(lo) >= ziel) return lo;
  for (let i = 0; i < 32; i++) {
    const mitte = (lo + hi) / 2;
    if (deckung(mitte) > ziel) hi = mitte;
    else lo = mitte;
  }
  return lo;
}

function laenge(l: Punkt[]): number {
  let s = 0;
  for (let i = 1; i < l.length; i++) s += Math.hypot(l[i].x - l[i - 1].x, l[i].y - l[i - 1].y);
  return s;
}
