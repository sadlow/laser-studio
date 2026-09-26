import type { Punkt } from "./clip";
import type { Zone } from "./typen";

/**
 * Das geschnittene Netz als Straenge zwischen Kreuzungen, mit Proben alle PROBE_MM – Grundlage der Querverbindungen
 * (querverbindung.ts). Ein Strang endet an einer Kreuzung (drei und mehr Wege im selben Punkt), am Rahmen oder frei
 * (Sackgasse). Eine Probe ist gestuetzt, wenn dort ein anderer Strang anliegt – auch ohne gemeinsamen Punkt, etwa an
 * einer Ueberfuehrung, die geschnitten mit der Strasse darunter verschmilzt.
 */
export const PROBE_MM = 1;

export interface Kette {
  punkte: Punkt[];
  breiteMm: number;
  /** Proben entlang des Strangs und ob dort etwas stuetzt. */
  proben: Punkt[];
  gestuetzt: boolean[];
  /** Enden: frei = Sackgasse (weder Kreuzung noch Rahmen). */
  anfangFrei: boolean;
  endeFrei: boolean;
}

export interface Spanne {
  kette: number;
  von: number;
  bis: number;
  /** Laenge in mm; eine Sackgasse zaehlt doppelt, sie haengt nur an einem Ende. */
  wert: number;
  frei: "keins" | "anfang" | "ende";
}

export const schluessel = (p: Punkt) => `${Math.round(p.x * 20)},${Math.round(p.y * 20)}`;
const abstand = (a: Punkt, b: Punkt) => Math.hypot(a.x - b.x, a.y - b.y);

export function baueKetten(linien: { l: Punkt[]; w: number }[], f: Zone): Kette[] {
  // Knotengrad: Enden zaehlen einfach, innere Punkte doppelt.
  const grad = new Map<string, number>();
  for (const { l } of linien) l.forEach((p, i) => grad.set(schluessel(p), (grad.get(schluessel(p)) ?? 0) + (i === 0 || i === l.length - 1 ? 1 : 2)));
  // An Kreuzungen teilen.
  const stuecke: { l: Punkt[]; w: number }[] = [];
  for (const { l, w } of linien) {
    let lauf: Punkt[] = [l[0]];
    for (let i = 1; i < l.length; i++) {
      lauf.push(l[i]);
      if (i < l.length - 1 && (grad.get(schluessel(l[i])) ?? 0) >= 3) {
        stuecke.push({ l: lauf, w });
        lauf = [l[i]];
      }
    }
    if (lauf.length >= 2) stuecke.push({ l: lauf, w });
  }
  // Durch Punkte vom Grad 2 verbinden: dort geht dieselbe Strasse nur weiter.
  const enden = new Map<string, number[]>();
  stuecke.forEach((s, i) => {
    for (const p of [s.l[0], s.l[s.l.length - 1]]) (enden.get(schluessel(p)) ?? enden.set(schluessel(p), []).get(schluessel(p))!).push(i);
  });
  const benutzt = new Array(stuecke.length).fill(false);
  const weiter = (von: number, p: Punkt) => {
    const k = schluessel(p);
    if (grad.get(k) !== 2) return -1;
    return (enden.get(k) ?? []).find((j) => j !== von && !benutzt[j]) ?? -1;
  };
  const ketten: Kette[] = [];
  const amRahmen = (p: Punkt) => p.x - f.xMm < 0.5 || p.y - f.yMm < 0.5 || f.xMm + f.breiteMm - p.x < 0.5 || f.yMm + f.hoeheMm - p.y < 0.5;
  stuecke.forEach((s, i) => {
    if (benutzt[i]) return;
    benutzt[i] = true;
    let punkte = [...s.l];
    for (const richtung of [1, -1]) {
      for (let j = weiter(i, richtung === 1 ? punkte[punkte.length - 1] : punkte[0]); j >= 0; ) {
        benutzt[j] = true;
        const t = stuecke[j].l;
        const ende = richtung === 1 ? punkte[punkte.length - 1] : punkte[0];
        const passt = schluessel(t[0]) === schluessel(ende);
        const neu = richtung === 1 ? (passt ? t : [...t].reverse()) : passt ? [...t].reverse() : t;
        punkte = richtung === 1 ? [...punkte, ...neu.slice(1)] : [...neu.slice(0, -1), ...punkte];
        j = weiter(j, richtung === 1 ? punkte[punkte.length - 1] : punkte[0]);
      }
    }
    const frei = (p: Punkt) => (grad.get(schluessel(p)) ?? 0) < 3 && !amRahmen(p);
    const proben = probiere(punkte);
    ketten.push({ punkte, breiteMm: s.w, proben, gestuetzt: proben.map(() => false), anfangFrei: frei(punkte[0]), endeFrei: frei(punkte[punkte.length - 1]) });
  });
  markiereStuetzen(ketten);
  return ketten;
}

function probiere(l: Punkt[]): Punkt[] {
  const aus: Punkt[] = [l[0]];
  for (let i = 1; i < l.length; i++) {
    const d = abstand(l[i - 1], l[i]);
    const n = Math.max(1, Math.ceil(d / PROBE_MM));
    for (let j = 1; j <= n; j++) aus.push({ x: l[i - 1].x + ((l[i].x - l[i - 1].x) * j) / n, y: l[i - 1].y + ((l[i].y - l[i - 1].y) * j) / n });
  }
  return aus;
}

/** Enden an Kreuzung oder Rahmen stuetzen; innen stuetzt, was ein anderer Strang beruehrt. */
function markiereStuetzen(ketten: Kette[]) {
  const gitter = new Map<string, [number, number][]>();
  const zelle = (p: Punkt) => `${Math.floor(p.x / 2)},${Math.floor(p.y / 2)}`;
  ketten.forEach((k, ki) => k.proben.forEach((p, pi) => (gitter.get(zelle(p)) ?? gitter.set(zelle(p), []).get(zelle(p))!).push([ki, pi])));
  ketten.forEach((k, ki) => {
    k.gestuetzt[0] = !k.anfangFrei;
    k.gestuetzt[k.proben.length - 1] = !k.endeFrei;
    k.proben.forEach((p, pi) => {
      if (k.gestuetzt[pi]) return;
      const [gx, gy] = [Math.floor(p.x / 2), Math.floor(p.y / 2)];
      for (let ax = -1; ax <= 1 && !k.gestuetzt[pi]; ax++) for (let ay = -1; ay <= 1; ay++) {
        const liste = gitter.get(`${gx + ax},${gy + ay}`);
        if (liste?.some(([kj, pj]) => kj !== ki && abstand(p, ketten[kj].proben[pj]) < (k.breiteMm + ketten[kj].breiteMm) / 2)) {
          k.gestuetzt[pi] = true;
          break;
        }
      }
    });
  });
}

/** Die freien Spannen eines Strangs zwischen gestuetzten Proben. */
export function spannen(k: Kette, ki: number): Spanne[] {
  const aus: Spanne[] = [];
  const stuetzen = k.gestuetzt.flatMap((g, i) => (g ? [i] : []));
  const len = (a: number, b: number) => (b - a) * PROBE_MM;
  if (!stuetzen.length) {
    // Beide Enden frei: ein loses Stueck, das faellt ohnehin lose -> Gravur (netz.ts).
    return aus;
  }
  const n = k.proben.length - 1;
  if (stuetzen[0] > 0) aus.push({ kette: ki, von: 0, bis: stuetzen[0], wert: 2 * len(0, stuetzen[0]), frei: "anfang" });
  for (let i = 1; i < stuetzen.length; i++) {
    if (stuetzen[i] - stuetzen[i - 1] > 1) aus.push({ kette: ki, von: stuetzen[i - 1], bis: stuetzen[i], wert: len(stuetzen[i - 1], stuetzen[i]), frei: "keins" });
  }
  const letzte = stuetzen[stuetzen.length - 1];
  if (letzte < n) aus.push({ kette: ki, von: letzte, bis: n, wert: 2 * len(letzte, n), frei: "ende" });
  return aus;
}
