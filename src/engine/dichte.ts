import { clipPolyline, type Punkt } from "./clip";
import type { KartenRohdaten } from "./kacheln";
import type { Schichtkarte, StrassenGruppe, Zone } from "./typen";

/**
 * Welche Strassen geschnitten werden und wie breit – aus der Dichte vor Ort
 * und der Stufe, die der Kunde waehlt (Vertrag: `Generalisierung` in
 * typen-strassen.ts).
 *
 * Gemessen an acht Referenzorten, A4, 3,5 km, Deckung auf dem Land mit den
 * Breiten der Vorlage: Berlin-Tiergarten 33 %, Hamburg 49 %, Bogota 50 %,
 * Amsterdam 61 %, Tokio 64 %, New York 75 %, Allgaeu 7 %, Venedig 3 %. Mit
 * einer festen Breite lief Tokio weiss zu und das Allgaeu blieb schwarz.
 */
// "licht" rueckt erst unter der halben Zieldeckung nach. Nachgerueckt wird bis
// 10 % ueber das Ziel: eine ganze Klasse auf Mindestbreite laesst sich nicht
// feiner dosieren (Venedig bei 2 km: Gassen 35 %).
const NACHRUECKEN_UNTER = 0.5;
const NACHRUECKEN_BIS = 1.1;

export interface NetzAuswahl {
  /** Breite je Gruppen-id aller geschnittenen Gruppen, in mm auf der Platte. */
  breiten: Map<string, number>;
  dichtefaktor: number;
  /** Deckung mit den Breiten der Vorlage (x Format), vor jeder Anpassung. */
  deckungVorOrt: number;
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

export function waehleNetz(
  k: Schichtkarte,
  laengen: Map<string, number>,
  landMm2: number,
  formatfaktor: number,
  ohneNachruecken = false,
): NetzAuswahl {
  const g = k.generalisierung;
  const stufe = g.stufen[k.kunde.strassenStufe] ?? g.stufen.ausgewogen;
  const land = Math.max(1, landMm2);
  const lang = (s: StrassenGruppe) => (laengen.get(s.id) ?? 0) > 0;
  // Feinste zuerst: sie werden als erste graviert statt geschnitten.
  let netz = k.strassen.filter((s) => s.ziel === "netz" && lang(s)).sort((a, b) => a.breiteMm - b.breiteMm);
  const nachgerueckt: StrassenGruppe[] = [];
  const breite = (x: StrassenGruppe, df: number) =>
    nachgerueckt.includes(x) ? k.netzMinBreiteMm : Math.max(k.netzMinBreiteMm, x.breiteMm * formatfaktor * df);
  const deckungMit = (gruppen: StrassenGruppe[], df: number) =>
    gruppen.reduce((s, x) => s + laengen.get(x.id)! * breite(x, df), 0) / land;
  const loeseFuer = (gruppen: StrassenGruppe[]) => loese((d) => deckungMit(gruppen, d), stufe.zielDeckung, g.maxFaktor);
  const schneidbar = (gruppen: StrassenGruppe[], df: number) => {
    const feinste = gruppen.find((x) => !nachgerueckt.includes(x));
    return !feinste || feinste.breiteMm * formatfaktor * df * stufe.maxAufdickung >= k.netzMinBreiteMm;
  };
  const deckungVorOrt = netz.reduce((s, x) => s + laengen.get(x.id)! * x.breiteMm * formatfaktor, 0) / land;
  const herabgestuft: string[] = [];

  let df = 1;
  if (g.aktiv) {
    df = loeseFuer(netz);
    while (netz.length > 1 && !schneidbar(netz, df)) {
      herabgestuft.push(netz[0].titel);
      netz = netz.slice(1);
      df = loeseFuer(netz);
    }
    const modus = ohneNachruecken || herabgestuft.length ? "nie" : stufe.nachruecken;
    if (modus === "immer" || (modus === "licht" && deckungMit(netz, df) < stufe.zielDeckung * NACHRUECKEN_UNTER)) {
      for (const kandidat of k.strassen.filter((s) => s.ziel === "gravur" && s.nachruecken && lang(s))) {
        nachgerueckt.push(kandidat);
        const probe = [kandidat, ...netz];
        // "licht": Breiten bleiben, "immer": das Netz gibt fuer die neue Klasse nach.
        const dfProbe = modus === "immer" ? loeseFuer(probe) : df;
        if (deckungMit(probe, dfProbe) > stufe.zielDeckung * NACHRUECKEN_BIS || !schneidbar(netz, dfProbe)) {
          nachgerueckt.pop();
          break;
        }
        netz = probe;
        df = dfProbe;
      }
    }
  }

  const breiten = new Map<string, number>();
  const anMindestbreite: string[] = [];
  for (const x of netz) {
    if (!nachgerueckt.includes(x) && x.breiteMm * formatfaktor * df < k.netzMinBreiteMm) anMindestbreite.push(x.titel);
    breiten.set(x.id, breite(x, df));
  }
  return { breiten, dichtefaktor: df, deckungVorOrt, herabgestuft, nachgerueckt: nachgerueckt.map((x) => x.titel), anMindestbreite };
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
