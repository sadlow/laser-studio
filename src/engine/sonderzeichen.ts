import { flaecheMm2, ringeInMm, schneide, teile, vereinige, verschiebe, versatz, ziehAb, zuFlaeche, type Flaeche } from "./geometrie";
import { ringeMitPunzen } from "./punzen";

export const GRAD = 0xb0;

/** Abstand zweier Flaechen bis `max` – Bisektion ueber den Versatz, auf 0,01 mm genau. */
export function abstand(a: Flaeche, b: Flaeche, max: number): number {
  if (!a.length || !b.length) return max;
  if (schneide(a, b).length) return 0;
  if (!schneide(versatz(a, max), b).length) return max;
  let [lo, hi] = [0, max];
  while (hi - lo > 0.01) {
    const m = (lo + hi) / 2;
    if (schneide(versatz(a, m), b).length) hi = m;
    else lo = m;
  }
  return lo;
}

function box(fl: Flaeche) {
  const p = ringeInMm(fl).flat();
  return { x0: Math.min(...p.map((q) => q.x)), x1: Math.max(...p.map((q) => q.x)), y0: Math.min(...p.map((q) => q.y)), y1: Math.max(...p.map((q) => q.y)) };
}

function kreis(cx: number, cy: number, r: number): Flaeche {
  return zuFlaeche([Array.from({ length: 96 }, (_, i) => ({ x: cx + r * Math.cos((i / 48) * Math.PI), y: cy + r * Math.sin((i / 48) * Math.PI) }))]);
}

/**
 * Gradzeichen, das sich schneiden laesst. Bei A5 hat der Ring der Schrift nach dem Verstaerken kein Inneres mehr
 * und wurde als Punkt ausgeschnitten ("52•24", Marcel 17.09.2026). Dann ein Ring mit dem Strich der Schrift und
 * einem Innenkreis, der seinen Steg traegt – oben buendig und mittig, wo die Schrift ihr Zeichen hat.
 */
export function gradRing(ink: Flaeche, strichMm: number, innenMm: number): Flaeche {
  const { ringe, punzen } = ringeMitPunzen(ink);
  const innen = punzen.map((i) => {
    const xs = ringe[i].map((p) => p.x);
    return Math.max(...xs) - Math.min(...xs);
  });
  if (innen.some((w) => w >= innenMm)) return ink;
  const b = box(ink);
  const ra = Math.max((b.x1 - b.x0) / 2, innenMm / 2 + strichMm);
  const cx = (b.x0 + b.x1) / 2;
  return ziehAb(kreis(cx, b.y0 + ra, ra), kreis(cx, b.y0 + ra, ra - strichMm));
}

/**
 * Teile einer Glyphe auseinander, bis Material dazwischen steht: die beiden Striche des „ und “, die Punkte des
 * Umlauts. Verstaerkt standen sie 0,3 mm auseinander und brannten zu einem Klecks zusammen. Verschoben wird das
 * kleinere Teil vom groesseren weg, waagerecht oder senkrecht – nie verformt.
 */
export function spreize(ink: Flaeche, materialMm: number): Flaeche {
  const t = teile(ink, 0.001);
  if (t.length < 2) return ink;
  const stuecke = t.map((s) => zuFlaeche([s.aussen, ...s.loecher]));
  let bewegt = false;
  for (let i = 0; i < stuecke.length; i++) {
    for (let j = i + 1; j < stuecke.length; j++) {
      const d = abstand(stuecke[i], stuecke[j], materialMm + 0.1);
      if (d >= materialMm) continue;
      const [a, b] = [box(stuecke[i]), box(stuecke[j])];
      const dx = (b.x0 + b.x1 - a.x0 - a.x1) / 2;
      const dy = (b.y0 + b.y1 - a.y0 - a.y1) / 2;
      const k = Math.abs(flaecheMm2(stuecke[i]) - flaecheMm2(stuecke[j])) < 0.05 * flaecheMm2(stuecke[i]) || flaecheMm2(stuecke[j]) < flaecheMm2(stuecke[i]) ? j : i;
      const weg = (k === j ? 1 : -1) * (materialMm - d + 0.02);
      stuecke[k] = Math.abs(dx) >= Math.abs(dy) ? verschiebe(stuecke[k], Math.sign(dx || 1) * weg, 0) : verschiebe(stuecke[k], 0, Math.sign(dy || 1) * weg);
      bewegt = true;
    }
  }
  return bewegt ? vereinige(...stuecke) : ink;
}

/**
 * Zwischen zwei Buchstaben muss Material stehen bleiben, sonst brennen sie zusammen. Wo die verstaerkte Schrift
 * enger steht, rueckt der Rest der Zeile nach rechts. Gibt den engsten Abstand vorher zurueck.
 */
export function abstaendeSichern(glyphen: { ink: Flaeche }[], materialMm: number): number {
  let engstes = Infinity;
  let vorige: Flaeche | null = null;
  for (let i = 0; i < glyphen.length; i++) {
    if (!glyphen[i].ink.length) continue;
    if (vorige) {
      const d = abstand(vorige, glyphen[i].ink, materialMm + 0.2);
      engstes = Math.min(engstes, d);
      if (d < materialMm) {
        const schub = materialMm - d + 0.02;
        for (let k = i; k < glyphen.length; k++) glyphen[k].ink = verschiebe(glyphen[k].ink, schub, 0);
      }
    }
    vorige = glyphen[i].ink;
  }
  return engstes;
}
