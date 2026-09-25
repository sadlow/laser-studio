import { ausTeilen, type Flaeche } from "./geometrie";
import { bandAus, fugen, mitEinzelteilen } from "./teilung-bewertung";
import type { Lage, Zone } from "./typen-ergebnis";
import type { LagenTeilung, Naht, NahtRichtung, Teilungsvorgabe, TeilungsErgebnis, TeilungsWahl } from "./typen-teilung";

export { haelften } from "./teilung-bewertung";

/**
 * Karten groesser als das Laserfeld (60 x 60 auf 60 x 30,5): jede Lage aus zwei Rohplatten. Fuer jede Lage wird die
 * Naht gesucht, die das sauberste Bild gibt (Marcel 25.09.2026) – probiert werden beide Richtungen und jede Lage im
 * Band, das die Rohplatte laesst, gezaehlt wird genau:
 *   Uebergaenge  wo man die Fuge sieht – Material der Lage auf der Naht, soweit keine Lage darueber es verdeckt
 *   Einzelteile  Stuecke, die erst die Naht vom Rest trennt (Sackgasse ueber die Naht, Landzunge), kleine doppelt
 * Die Front (Lage mit der Schrift) wird immer oben-unten geteilt, sonst liefe die Naht durch Titel und Zeilen.
 * Blau wird nicht geteilt: es kommt im Rohformat.
 */
export function berechneTeilung(platte: Zone, lagen: Lage[], v: Teilungsvorgabe, wahl: TeilungsWahl = {}): TeilungsErgebnis | null {
  const { breiteMm: B, hoeheMm: H } = platte;
  const { breiteMm: rb, hoeheMm: rh } = v.rohplatte;
  if ((B <= rb && H <= rh) || (B <= rh && H <= rb)) return null;

  // Beide Haelften muessen mit Rand auf die Rohplatte passen, die lange Seite auf die Breite.
  const max = rh - v.randMm;
  const band = (lang: number, quer: number): [number, number] | null =>
    lang > rb ? null : quer - max > max ? null : [Math.max(quer - max, 0), Math.min(max, quer)];
  const baender: Partial<Record<NahtRichtung, [number, number]>> = {};
  const ou = band(B, H);
  const lr = band(H, B);
  if (ou) baender["oben-unten"] = ou;
  if (lr) baender["links-rechts"] = lr;

  // Die Deckschicht (nur Rahmen und Reiter) kommt als Rahmenbogen aus vier Leisten (teilung-rahmen.ts); dann traegt
  // sie die Schrift, und das Netz darunter darf in beide Richtungen geteilt werden.
  const deck = lagen.some((l) => l.key === "deck");
  const geteilt = lagen.filter((l) => l.key !== "symbol" && l.key !== "blau" && l.key !== "deck");
  const frontKey = deck ? undefined : geteilt[0]?.key;
  const ergebnis: LagenTeilung[] = [];
  let obere: Flaeche = ausTeilen(lagen.filter((l) => l.key === "symbol" || l.key === "deck").flatMap((l) => l.teile));

  for (const lage of geteilt) {
    const front = lage.key === frontKey;
    const material = ausTeilen(lage.teile);
    const richtungen = (Object.keys(baender) as NahtRichtung[]).filter((r) => !front || r === "oben-unten");
    // Erst guenstig: nur die Fugen, auf einem schmalen Streifen um das Band. Einzelteile brauchen die ganze Lage und
    // kommen nur dazu, solange eine Naht noch gewinnen kann – Punkte ohne Einzelteile sind eine untere Schranke.
    const vorlaeufig: Naht[] = [];
    for (const r of richtungen) {
      const [lo, hi] = baender[r]!;
      const band = bandAus(material, obere, platte, r, lo - 2, hi + 2);
      for (let t = Math.ceil(lo); t <= hi + 1e-9; t += v.schrittMm) vorlaeufig.push(fugen(lage, band, platte, r, t).naht);
    }
    if (!vorlaeufig.length) continue;
    // Gleichstand: naeher an der Mitte, die Haelften bleiben gleich gross.
    const mitte = (n: Naht) => Math.abs(n.posMm - (n.richtung === "oben-unten" ? H : B) / 2);
    const ordnung = (a: Naht, b: Naht) => a.punkte - b.punkte || mitte(a) - mitte(b);
    vorlaeufig.sort(ordnung);
    const kandidaten: Naht[] = [];
    const gerechnet = new Map<string, ReturnType<typeof mitEinzelteilen>>();
    const voll = (n: Naht) => {
      const schluessel = `${n.richtung}@${n.posMm}`;
      if (!gerechnet.has(schluessel)) gerechnet.set(schluessel, mitEinzelteilen(n, lage, platte, v));
      return gerechnet.get(schluessel)!;
    };
    for (const naht of vorlaeufig) {
      // Genug fuer die Auswahl im Studio, dann nur noch, was die Beste schlagen kann.
      if (kandidaten.length >= 5 && naht.punkte > kandidaten[0].punkte) break;
      kandidaten.push(voll(naht).naht);
      kandidaten.sort(ordnung);
    }

    const w = wahl[lage.key];
    const manuell = !!w && richtungen.includes(w.richtung) && w.posMm >= baender[w.richtung]![0] - 1e-6 && w.posMm <= baender[w.richtung]![1] + 1e-6;
    const ziel = manuell ? w! : kandidaten[0];
    const zielBand = bandAus(material, obere, platte, ziel.richtung, ziel.posMm - 2, ziel.posMm + 2);
    const f = fugen(lage, zielBand, platte, ziel.richtung, ziel.posMm);
    const detail = voll(f.naht);
    const alternativen = kandidaten.filter((n) => n.richtung !== ziel.richtung || Math.abs(n.posMm - ziel.posMm) > 1e-6);
    ergebnis.push({
      key: lage.key,
      titel: lage.titel,
      front,
      gewaehlt: { ...detail.naht, manuell },
      alternativen: auswahl(alternativen, 4),
      stellen: { uebergaenge: f.uebergaenge, einzelteile: detail.einzelteile },
    });
    obere = [...obere, ...material];
  }

  return {
    rohplatte: v.rohplatte,
    bandMm: ou ?? lr ?? [0, 0],
    lagen: ergebnis,
    ungeteilt: lagen.filter((l) => l.key === "symbol" || l.key === "blau").map((l) => l.key),
    gehrung: deck ? ["deck"] : [],
  };
}

/** Die besten Alternativen, jede Richtung vertreten, Nachbarn im Abstand von mindestens 2 mm. */
function auswahl(sortiert: Naht[], n: number): Naht[] {
  const raus: Naht[] = [];
  for (const r of ["oben-unten", "links-rechts"] as NahtRichtung[]) {
    const beste = sortiert.find((k) => k.richtung === r);
    if (beste) raus.push(beste);
  }
  for (const k of sortiert) {
    if (raus.length >= n) break;
    if (!raus.some((x) => x.richtung === k.richtung && Math.abs(x.posMm - k.posMm) < 2)) raus.push(k);
  }
  return raus.sort((a, b) => a.punkte - b.punkte).slice(0, n);
}

