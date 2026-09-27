import { clipPolyline, type Punkt } from "./clip";
import type { NetzAuswahl } from "./dichte";
import { enthaelt, type Flaeche } from "./geometrie";
import type { KartenRohdaten } from "./kacheln";
import { baueKetten, spannen, verstaerkungen, type Kette, type Spanne } from "./netz-ketten";
import { baueSuchgraph, suche, type Suchgraph } from "./netz-suche";
import { waehleSparsam } from "./sparsam";
import type { Schichtkarte, StrassenStufe, Zone } from "./typen";

/**
 * Das geschnittene Netz stabil machen (Marcel 26./27.09.2026), in dieser Reihenfolge:
 * 1. Sparsame Klasse (nur "viel", weit draussen, sparsam.ts): die Wohnstrassen, die weit draussen sonst graviert
 *    werden, dort schneiden, wo keine parallele Strasse naeher als `abstandMm` liegt und das Stueck zwei Stellen des
 *    Netzes verbindet – auf dem Land ja, in der Stadt nicht, Stummel nie.
 * 2. Lose Gruppen anbinden: was weder Rahmen noch Text erreicht, bekommt den kuerzesten Weg ueber gravierte Strassen
 *    zum Netz; ohne Weg bleibt es lose und wird graviert (netz.ts, Skizze).
 * 3. Querverbindungen: ein Strang, der laenger als `stuetzMm` frei laeuft, bekommt von seiner Mitte einen Weg zu
 *    einem anderen Strang. "viel" stuetzt enger als "ausgewogen", "wenig" gar nicht.
 * 4. Verstaerkung nach Strangspanne (netz-ketten.ts).
 */
export interface Querverbindung {
  linie: Punkt[];
  breiteMm: number;
}

/** Ohne Wert in der Vorlage: viel 30, ausgewogen 80, wenig aus (Marcel 26.09.2026). */
export const STUETZ_STANDARD: Record<StrassenStufe, number> = { viel: 30, ausgewogen: 80, wenig: 0 };
const HOECHSTENS_RUNDEN = 400;
// So weit darf der Weg sein, der ein loses Stueck ans Netz bindet.
const ANBINDEN_MM = 40;

export function stuetzMm(k: Schichtkarte): number {
  const s = k.kunde.strassenStufe;
  return k.generalisierung.stufen[s]?.stuetzMm ?? STUETZ_STANDARD[s] ?? 0;
}

export interface Stuetzung {
  /** Stuecke der sparsamen Klasse, die geschnitten werden. */
  zusatz: Querverbindung[];
  anbindungen: Querverbindung[];
  querverbindungen: Querverbindung[];
  verstaerkt: Querverbindung[];
  /** Straenge ohne Halt – graviert statt geschnitten (die volle Rechnung findet sie selbst, die Skizze braucht sie). */
  lose: Punkt[][];
}

export function stuetzeNetz(k: Schichtkarte, roh: KartenRohdaten, f: Zone, auswahl: NetzAuswahl, schutz: Flaeche = []): Stuetzung {
  const leer: Stuetzung = { zusatz: [], anbindungen: [], querverbindungen: [], verstaerkt: [], lose: [] };
  const imFenster = (ls: Punkt[][]) => ls.flatMap((l) => clipPolyline(l, f.xMm, f.yMm, f.xMm + f.breiteMm, f.yMm + f.hoeheMm));
  const netz: { l: Punkt[]; w: number }[] = [];
  const kandidaten: { l: Punkt[]; w: number }[] = [];
  const sparsam = new Map<string, Punkt[][]>();
  for (const g of k.strassen) {
    if (g.ziel === "aus") continue;
    const w = auswahl.breiten.get(g.id);
    const linien = imFenster(g.klassen.flatMap((kl) => roh.strassen.get(kl) ?? []));
    if (w !== undefined) netz.push(...linien.map((l) => ({ l, w })));
    else if (auswahl.sparsam?.klassen.some((x) => x.id === g.id)) sparsam.set(g.id, linien);
    // Kandidaten: gravierte Netzklassen in ihrer Breite, Zufahrten und Feldwege auf Mindestbreite.
    if (w === undefined && g.ziel === "netz") kandidaten.push(...linien.map((l) => ({ l, w: Math.max(k.stabilitaet.rasterMm, g.breiteMm * auswahl.breitenfaktor) })));
    else if (w === undefined && g.nachruecken) kandidaten.push(...linien.map((l) => ({ l, w: k.stabilitaet.rasterMm })));
  }
  if (!netz.length) return leer;
  const zusatz: Querverbindung[] = [];
  // Klasse fuer Klasse, die wichtigste zuerst: was eine behaelt, zaehlt fuer die naechste als Netz.
  for (const { id, breiteMm, abstandMm } of auswahl.sparsam?.klassen ?? []) {
    const linien = sparsam.get(id);
    if (!linien?.length) continue;
    const neu = waehleSparsam(netz.map((n) => n.l), linien, abstandMm, breiteMm, f).map((l) => ({ linie: l, breiteMm }));
    zusatz.push(...neu);
    netz.push(...neu.map((z) => ({ l: z.linie, w: z.breiteMm })));
  }
  const ketten = baueKetten(netz, f);
  const graph = kandidaten.length ? baueSuchgraph(ketten, kandidaten) : null;
  const gehalten = anker(ketten, schutz);
  const anbindungen = graph ? bindeAn(ketten, graph, gehalten) : [];
  const grenze = stuetzMm(k);
  const querverbindungen = graph && grenze > 0 && k.generalisierung.aktiv ? verbinde(ketten, graph, grenze, k) : [];
  const r = { rasterSpanneMm: k.stabilitaet.rasterSpanneMm, freiMm: k.netzMinBreiteMm, langMm: k.stabilitaet.langMm, duenn: k.staerkenMm.acryl <= 2 };
  // Eine Verbindung ist selbst ein Strang: laenger als das Raster frei, mindestens so breit wie ein freier Strang.
  for (const q of [...anbindungen, ...querverbindungen]) {
    const laenge = q.linie.reduce((a, p, i) => (i ? a + Math.hypot(p.x - q.linie[i - 1].x, p.y - q.linie[i - 1].y) : a), 0);
    if (laenge > r.rasterSpanneMm) q.breiteMm = Math.max(q.breiteMm, r.freiMm);
  }
  const lose = ketten.filter((kt) => !gehalten.has(kt.gruppe)).map((kt) => kt.punkte);
  return { zusatz, anbindungen, querverbindungen, verstaerkt: verstaerkungen(ketten.filter((kt) => gehalten.has(kt.gruppe)), r), lose };
}

/** Gruppen, die halten: ein Strang endet am Rahmen oder in einer Schutzflaeche (Reiter, Titel). */
function anker(ketten: Kette[], schutz: Flaeche): Set<number> {
  const gehalten = new Set(ketten.filter((kt) => kt.amRahmen).map((kt) => kt.gruppe));
  if (!schutz.length) return gehalten;
  for (const kt of ketten) {
    if (gehalten.has(kt.gruppe)) continue;
    if ([kt.punkte[0], kt.punkte[kt.punkte.length - 1]].some((p) => enthaelt(schutz, p))) gehalten.add(kt.gruppe);
  }
  return gehalten;
}

/** Lose Gruppen ueber gravierte Wege ans Netz binden, die groesste zuerst; `gehalten` waechst dabei. */
function bindeAn(ketten: Kette[], g: Suchgraph, gehalten: Set<number>): Querverbindung[] {
  const lose = new Map<number, number>();
  for (const kt of ketten) if (!gehalten.has(kt.gruppe)) lose.set(kt.gruppe, (lose.get(kt.gruppe) ?? 0) + kt.proben.length);
  const aus: Querverbindung[] = [];
  for (const gruppe of [...lose.keys()].sort((a, b) => lose.get(b)! - lose.get(a)!)) {
    if (gehalten.has(gruppe)) continue;
    const weg = suche(g, (ki) => ketten[ki].gruppe === gruppe, (ki) => gehalten.has(ketten[ki].gruppe), ANBINDEN_MM);
    if (!weg) continue;
    aus.push({ linie: weg.punkte, breiteMm: weg.breite });
    gehalten.add(gruppe);
  }
  return aus;
}

function verbinde(ketten: Kette[], g: Suchgraph, grenze: number, k: Schichtkarte): Querverbindung[] {
  // Stufe fuer Stufe von der weitesten Grenze herunter: "viel" setzt erst die Verbindungen von "ausgewogen" und stuetzt
  // dann enger nach. Sonst fand es mit seiner kurzen Suchweite fuer manche lange Spanne gar keinen Weg (Lanzarote 30 km).
  const grenzen = [...new Set([...Object.keys(STUETZ_STANDARD).map((st) => stuetzMm({ ...k, kunde: { ...k.kunde, strassenStufe: st as StrassenStufe } })), grenze])]
    .filter((x) => x >= grenze && x > 0)
    .sort((x, y) => y - x);
  const aus: Querverbindung[] = [];
  let runden = 0;
  for (const gr of grenzen) {
    const offen: Spanne[] = ketten.flatMap((kt, ki) => spannen(kt, ki)).filter((s) => s.wert > gr);
    while (offen.length && runden++ < HOECHSTENS_RUNDEN) {
      offen.sort((a, b) => b.wert - a.wert);
      const s = offen.shift()!;
      // Mittlere Haelfte der Spanne; bei einer Sackgasse die aeussere Haelfte, dort haengt sie am weitesten frei.
      const n = s.bis - s.von;
      const [a, b] = s.frei === "ende" ? [s.von + n / 2, s.bis] : s.frei === "anfang" ? [s.von, s.von + n / 2] : [s.von + n / 4, s.bis - n / 4];
      // Der Weg darf so lang sein wie die Grenze – laenger waere er selbst eine zu lange freie Spanne.
      const weg = suche(g, (ki, pi) => ki === s.kette && pi >= a && pi <= b, (ki) => ki !== s.kette, gr);
      if (!weg) continue;
      aus.push({ linie: weg.punkte, breiteMm: weg.breite });
      for (const [ki, pi] of [weg.start, weg.ziel]) {
        ketten[ki].gestuetzt[pi] = true;
        // Die betroffenen Spannen neu: alte raus, neue rein.
        for (let i = offen.length - 1; i >= 0; i--) if (offen[i].kette === ki) offen.splice(i, 1);
        offen.push(...spannen(ketten[ki], ki).filter((x) => x.wert > gr));
      }
    }
  }
  return aus;
}
