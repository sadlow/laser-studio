import { rechteck, schneide, teile, zuFlaeche, ziehAb, type Flaeche } from "./geometrie";
import type { Lage, Teil, Zone } from "./typen-ergebnis";
import type { Einzelteil, Naht, NahtRichtung, Teilungsvorgabe, Uebergang } from "./typen-teilung";

// Bewertung einer Naht fuer teilung.ts: Fugen auf der Naht und Einzelteile, die sie abtrennt.

/** Die beiden Haelften als Rechtecke: A oben bzw. links der Naht, B darunter bzw. rechts. */
export function haelften(platte: Zone, r: NahtRichtung, t: number): { a: Flaeche; b: Flaeche } {
  const { breiteMm: B, hoeheMm: H } = platte;
  return r === "oben-unten"
    ? { a: rechteck(0, 0, B, t), b: rechteck(0, t, B, H - t) }
    : { a: rechteck(0, 0, t, H), b: rechteck(t, 0, B - t, H) };
}

/** Material der Lage und der Lagen darueber, beschnitten auf einen Streifen um die moeglichen Naehte. */
export interface Band {
  material: Flaeche;
  obere: Flaeche;
}

export function bandAus(material: Flaeche, obere: Flaeche, platte: Zone, r: NahtRichtung, von: number, bis: number): Band {
  const streifen = r === "links-rechts" ? rechteck(von, 0, bis - von, platte.hoeheMm) : rechteck(0, von, platte.breiteMm, bis - von);
  return { material: schneide(material, streifen), obere: obere.length ? schneide(obere, streifen) : [] };
}

/** Die Fugen einer Naht: wie viele man sieht und welche kritisch sind. */
export function fugen(lage: Lage, band: Band, platte: Zone, r: NahtRichtung, t: number) {
  const senk = r === "links-rechts";
  const streifen = (bei: number) => (senk ? rechteck(bei - 0.05, 0, 0.1, platte.hoeheMm) : rechteck(0, bei - 0.05, platte.breiteMm, 0.1));
  const aufNaht = schneide(band.material, streifen(t));
  const sichtbar = band.obere.length ? teile(ziehAb(aufNaht, band.obere), 0.001).length : teile(aufNaht, 0.001).length;
  // Je 1 mm neben der Naht: wie weit wandert die Strasse? Daraus der Winkel, in dem sie die Naht kreuzt.
  const neben = [t - 1, t + 1].map((bei) => teile(schneide(band.material, streifen(bei)), 0.001).map((s) => mitteAuf(s, senk)));
  const uebergaenge: Uebergang[] = teile(aufNaht, 0.001).map((s) => fuge(s, senk, platte, lage.key, neben));
  const kritisch = uebergaenge.filter((u) => u.kritisch).length;
  const naht: Naht = { richtung: r, posMm: t, uebergaenge: sichtbar, kritisch, einzelteile: 0, kleine: 0, punkte: sichtbar + kritisch };
  return { naht, uebergaenge };
}

/**
 * Einzelteile: nur Teile, die ueber die Naht reichen, koennen zerfallen. Aus jedem wird je Haelfte das groesste
 * Stueck – alles andere ist ein neues Einzelteil.
 */
export function mitEinzelteilen(naht: Naht, lage: Lage, platte: Zone, v: Teilungsvorgabe) {
  const senk = naht.richtung === "links-rechts";
  const t = naht.posMm;
  const { a, b } = haelften(platte, naht.richtung, t);
  const einzelteile: Einzelteil[] = [];
  let kleine = 0;
  for (const teil of lage.teile) {
    const [von, bis] = spanne(teil, senk);
    if (von >= t || bis <= t) continue;
    const fl = zuFlaeche([teil.aussen, ...teil.loecher]);
    for (const [haelfte, h] of [["A", a], ["B", b]] as const) {
      for (const stueck of teile(schneide(fl, h)).slice(1)) {
        if (stueck.flaecheMm2 < v.kleinMm2) kleine++;
        einzelteile.push({ ...box(stueck), flaecheMm2: stueck.flaecheMm2, haelfte, umriss: stueck.aussen });
      }
    }
  }
  const punkte = naht.uebergaenge + naht.kritisch + v.gewichtEinzelteil * (einzelteile.length + kleine);
  return { naht: { ...naht, einzelteile: einzelteile.length, kleine, punkte }, einzelteile };
}

/**
 * Eine Stossfuge. Kritisch fuer die Montage: schmal (unter 1,5 mm haelt kaum Kleber, das Ende bricht beim Einsetzen)
 * oder im Netz flach gekreuzt (unter 35°) – dann endet die Strasse beidseits in einem spitzen Keil.
 */
function fuge(s: Teil, senk: boolean, platte: Zone, key: Lage["key"], neben: number[][]): Uebergang {
  const bx = box(s);
  const laengeMm = senk ? bx.hoeheMm : bx.breiteMm;
  const mitte = { xMm: bx.xMm + bx.breiteMm / 2, yMm: bx.yMm + bx.hoeheMm / 2 };
  const quer = senk ? platte.hoeheMm : platte.breiteMm;
  const am = senk ? bx.yMm : bx.xMm;
  // Am Plattenrand liegt der Rahmen: breit, gerade, unkritisch.
  const amRand = am < 0.5 || am + laengeMm > quer - 0.5;
  const c = senk ? mitte.yMm : mitte.xMm;
  // Versatz je mm quer zur Naht, gemittelt ueber beide Seiten; ohne Gegenstueck (Strassenende) zaehlt er nicht.
  const versatz = neben
    .map((mitten) => mitten.reduce((best, m) => (Math.abs(m - c) < Math.abs(best - c) ? m : best), Infinity))
    .filter((m) => Math.abs(m - c) <= laengeMm)
    .map((m) => Math.abs(m - c));
  const winkelGrad = versatz.length ? (Math.atan2(1, versatz.reduce((a, b) => a + b, 0) / versatz.length) * 180) / Math.PI : 90;
  const netz = key === "netz" || key === "deck";
  const grund = amRand ? undefined : laengeMm < 1.5 ? "schmal" : netz && winkelGrad < 35 ? `flach (${Math.round(winkelGrad)}°), spitze Enden` : undefined;
  return { ...mitte, laengeMm, kritisch: !!grund, grund };
}

function mitteAuf(s: Teil, senk: boolean): number {
  const b = box(s);
  return senk ? b.yMm + b.hoeheMm / 2 : b.xMm + b.breiteMm / 2;
}

function spanne(t: Teil, senk: boolean): [number, number] {
  let von = Infinity;
  let bis = -Infinity;
  for (const p of t.aussen) {
    const w = senk ? p.x : p.y;
    if (w < von) von = w;
    if (w > bis) bis = w;
  }
  return [von, bis];
}

function box(t: Teil) {
  let [x0, y0, x1, y1] = [Infinity, Infinity, -Infinity, -Infinity];
  for (const p of t.aussen) {
    x0 = Math.min(x0, p.x);
    y0 = Math.min(y0, p.y);
    x1 = Math.max(x1, p.x);
    y1 = Math.max(y1, p.y);
  }
  return { xMm: x0, yMm: y0, breiteMm: x1 - x0, hoeheMm: y1 - y0 };
}
