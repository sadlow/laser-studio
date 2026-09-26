import { clipPolyline, type Punkt } from "./clip";
import type { NetzAuswahl } from "./dichte";
import type { KartenRohdaten } from "./kacheln";
import { baueKetten, PROBE_MM, schluessel, spannen, type Kette, type Spanne } from "./netz-ketten";
import type { Schichtkarte, StrassenStufe, Zone } from "./typen";

/**
 * Querverbindungen (Marcel 26.09.2026): ein geschnittener Strang, der lange frei laeuft – Bali, Lanzarote bei 30 km –,
 * ist instabil. Statt eine ganze Klasse nachzuschneiden, holt die Stufe einzelne Wege ins Netz: von der Mitte einer
 * zu langen Spanne der kuerzeste Weg ueber gravierte Strassen und Feldwege zu einem anderen Strang. "viel" stuetzt
 * enger als "ausgewogen", "wenig" gar nicht (`stuetzMm` je Stufe, 0 = aus).
 */
export interface Querverbindung {
  linie: Punkt[];
  breiteMm: number;
}

/** Ohne Wert in der Vorlage: viel 30, ausgewogen 80, wenig aus (Marcel 26.09.2026). */
export const STUETZ_STANDARD: Record<StrassenStufe, number> = { viel: 30, ausgewogen: 80, wenig: 0 };
const HOECHSTENS_RUNDEN = 400;

export function stuetzMm(k: Schichtkarte): number {
  const s = k.kunde.strassenStufe;
  return k.generalisierung.stufen[s]?.stuetzMm ?? STUETZ_STANDARD[s] ?? 0;
}

export function querverbindungen(k: Schichtkarte, roh: KartenRohdaten, f: Zone, auswahl: NetzAuswahl): Querverbindung[] {
  const grenze = stuetzMm(k);
  if (!(grenze > 0) || !k.generalisierung.aktiv) return [];
  const imFenster = (ls: Punkt[][]) => ls.flatMap((l) => clipPolyline(l, f.xMm, f.yMm, f.xMm + f.breiteMm, f.yMm + f.hoeheMm));
  const netz: { l: Punkt[]; w: number }[] = [];
  const kandidaten: { l: Punkt[]; w: number }[] = [];
  for (const g of k.strassen) {
    if (g.ziel === "aus") continue;
    const w = auswahl.breiten.get(g.id);
    const linien = imFenster(g.klassen.flatMap((kl) => roh.strassen.get(kl) ?? []));
    if (w !== undefined) netz.push(...linien.map((l) => ({ l, w })));
    // Kandidaten: gravierte Netzklassen in ihrer Breite, Zufahrten und Feldwege auf Mindestbreite.
    else if (g.ziel === "netz") kandidaten.push(...linien.map((l) => ({ l, w: Math.max(k.netzMinBreiteMm, g.breiteMm * auswahl.breitenfaktor) })));
    else if (g.nachruecken) kandidaten.push(...linien.map((l) => ({ l, w: k.netzMinBreiteMm })));
  }
  if (!netz.length || !kandidaten.length) return [];
  const ketten = baueKetten(netz, f);

  // Kandidatengraph ueber gemeinsame Punkte; jeder Punkt, der an einem Strang liegt, ist ein Anschluss.
  const nachbarn = new Map<string, { k: string; d: number; w: number }[]>();
  const ort = new Map<string, Punkt>();
  for (const { l, w } of kandidaten) {
    for (let i = 1; i < l.length; i++) {
      const [a, b] = [schluessel(l[i - 1]), schluessel(l[i])];
      if (a === b) continue;
      const d = Math.hypot(l[i].x - l[i - 1].x, l[i].y - l[i - 1].y);
      (nachbarn.get(a) ?? nachbarn.set(a, []).get(a)!).push({ k: b, d, w });
      (nachbarn.get(b) ?? nachbarn.set(b, []).get(b)!).push({ k: a, d, w });
      ort.set(a, l[i - 1]);
      ort.set(b, l[i]);
    }
  }
  const gitter = new Map<string, [number, number][]>();
  ketten.forEach((kt, ki) => kt.proben.forEach((p, pi) => (gitter.get(`${Math.floor(p.x)},${Math.floor(p.y)}`) ?? gitter.set(`${Math.floor(p.x)},${Math.floor(p.y)}`, []).get(`${Math.floor(p.x)},${Math.floor(p.y)}`)!).push([ki, pi])));
  const anschluss = new Map<string, [number, number]>();
  for (const [s, p] of ort) {
    let bester: [number, number] | null = null;
    let bd = Infinity;
    for (let ax = -1; ax <= 1; ax++) for (let ay = -1; ay <= 1; ay++) {
      for (const [ki, pi] of gitter.get(`${Math.floor(p.x) + ax},${Math.floor(p.y) + ay}`) ?? []) {
        const d = Math.hypot(ketten[ki].proben[pi].x - p.x, ketten[ki].proben[pi].y - p.y);
        if (d < Math.max(0.6, ketten[ki].breiteMm / 2) && d < bd) [bester, bd] = [[ki, pi], d];
      }
    }
    if (bester) anschluss.set(s, bester);
  }

  // Stufe fuer Stufe von der weitesten Grenze herunter: "viel" setzt erst die Verbindungen von "ausgewogen" und stuetzt
  // dann enger nach. Sonst fand es mit seiner kurzen Suchweite fuer manche lange Spanne gar keinen Weg (Lanzarote 30 km).
  const grenzen = [...new Set([...Object.keys(STUETZ_STANDARD).map((st) => stuetzMm({ ...k, kunde: { ...k.kunde, strassenStufe: st as StrassenStufe } })), grenze])]
    .filter((g) => g >= grenze && g > 0)
    .sort((x, y) => y - x);
  const aus: Querverbindung[] = [];
  let runden = 0;
  for (const g of grenzen) {
    const offen: Spanne[] = ketten.flatMap((kt, ki) => spannen(kt, ki)).filter((s) => s.wert > g);
    while (offen.length && runden++ < HOECHSTENS_RUNDEN) {
      offen.sort((a, b) => b.wert - a.wert);
      const s = offen.shift()!;
      // Der Weg darf so lang sein wie die Grenze – laenger waere er selbst eine zu lange freie Spanne.
      const weg = suche(s, ketten, nachbarn, anschluss, ort, g);
      if (!weg) continue;
      aus.push({ linie: weg.punkte, breiteMm: weg.breite });
      for (const [ki, pi] of [weg.start, weg.ziel]) {
        ketten[ki].gestuetzt[pi] = true;
        // Die betroffenen Spannen neu: alte raus, neue rein.
        for (let i = offen.length - 1; i >= 0; i--) if (offen[i].kette === ki) offen.splice(i, 1);
        offen.push(...spannen(ketten[ki], ki).filter((x) => x.wert > g));
      }
    }
  }
  return aus;
}

/** Kuerzester Weg (Dijkstra, hoechstens `grenze` mm) von der Mitte der Spanne zu einem anderen Strang. */
function suche(s: Spanne, ketten: Kette[], nachbarn: Map<string, { k: string; d: number; w: number }[]>, anschluss: Map<string, [number, number]>, ort: Map<string, Punkt>, grenze: number) {
  // Mittlere Haelfte einer Spanne; bei einer Sackgasse die aeussere Haelfte, dort haengt sie am weitesten frei.
  const n = s.bis - s.von;
  const [a, b] = s.frei === "ende" ? [s.von + n / 2, s.bis] : s.frei === "anfang" ? [s.von, s.von + n / 2] : [s.von + n / 4, s.bis - n / 4];
  const dist = new Map<string, number>();
  const vor = new Map<string, string>();
  const breite = new Map<string, number>();
  const schlange: [number, string][] = [];
  for (const [k, [ki, pi]] of anschluss) {
    if (ki === s.kette && pi >= a && pi <= b) {
      dist.set(k, 0);
      schlange.push([0, k]);
    }
  }
  while (schlange.length) {
    schlange.sort((x, y) => y[0] - x[0]);
    const [d, k] = schlange.pop()!;
    if (d > (dist.get(k) ?? Infinity)) continue;
    const an = anschluss.get(k);
    if (d > PROBE_MM && an && an[0] !== s.kette) {
      const punkte: Punkt[] = [];
      let start = k;
      for (let c: string | undefined = k; c; c = vor.get(c)) {
        punkte.push(ort.get(c)!);
        start = c;
      }
      return { punkte: punkte.reverse(), breite: breite.get(k) ?? 0.8, start: anschluss.get(start)!, ziel: an };
    }
    for (const e of nachbarn.get(k) ?? []) {
      const nd = d + e.d;
      if (nd > grenze || nd >= (dist.get(e.k) ?? Infinity)) continue;
      dist.set(e.k, nd);
      vor.set(e.k, k);
      breite.set(e.k, Math.max(breite.get(k) ?? 0, e.w));
      schlange.push([nd, e.k]);
    }
  }
  return null;
}
