import type { Punkt } from "./clip";
import { PROBE_MM, schluessel, type Kette } from "./netz-ketten";

/**
 * Wege ueber gravierte Strassen, die ins Netz geholt werden koennen (querverbindung.ts): der Graph der Kandidaten
 * ueber gemeinsame Punkte und die Anschluesse – jeder Kandidatenpunkt, der an einem geschnittenen Strang liegt.
 */
export interface Suchgraph {
  nachbarn: Map<string, { k: string; d: number; w: number }[]>;
  ort: Map<string, Punkt>;
  /** Kandidatenpunkt -> [Strang, Probe] */
  anschluss: Map<string, [number, number]>;
}

export interface Fund {
  punkte: Punkt[];
  breite: number;
  start: [number, number];
  ziel: [number, number];
}

export function baueSuchgraph(ketten: Kette[], kandidaten: { l: Punkt[]; w: number }[]): Suchgraph {
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
  const zelle = (p: Punkt, ax = 0, ay = 0) => `${Math.floor(p.x) + ax},${Math.floor(p.y) + ay}`;
  const gitter = new Map<string, [number, number][]>();
  ketten.forEach((kt, ki) => kt.proben.forEach((p, pi) => (gitter.get(zelle(p)) ?? gitter.set(zelle(p), []).get(zelle(p))!).push([ki, pi])));
  const anschluss = new Map<string, [number, number]>();
  for (const [s, p] of ort) {
    let bester: [number, number] | null = null;
    let bd = Infinity;
    for (let ax = -1; ax <= 1; ax++) for (let ay = -1; ay <= 1; ay++) {
      for (const [ki, pi] of gitter.get(zelle(p, ax, ay)) ?? []) {
        const d = Math.hypot(ketten[ki].proben[pi].x - p.x, ketten[ki].proben[pi].y - p.y);
        if (d < Math.max(0.6, ketten[ki].breiteMm / 2) && d < bd) [bester, bd] = [[ki, pi], d];
      }
    }
    if (bester) anschluss.set(s, bester);
  }
  return { nachbarn, ort, anschluss };
}

/**
 * Kuerzester Weg (Dijkstra, hoechstens `grenze` mm) von einem Anschluss, fuer den `quelle` gilt, zu einem, fuer den
 * `ziel` gilt.
 */
export function suche(g: Suchgraph, quelle: (ki: number, pi: number) => boolean, ziel: (ki: number, pi: number) => boolean, grenze: number): Fund | null {
  const dist = new Map<string, number>();
  const vor = new Map<string, string>();
  const breite = new Map<string, number>();
  const schlange = new Heap();
  for (const [k, [ki, pi]] of g.anschluss) {
    if (quelle(ki, pi)) {
      dist.set(k, 0);
      schlange.push(0, k);
    }
  }
  while (schlange.laenge) {
    const [d, k] = schlange.pop();
    if (d > (dist.get(k) ?? Infinity)) continue;
    const an = g.anschluss.get(k);
    if (d > PROBE_MM && an && ziel(an[0], an[1])) {
      const punkte: Punkt[] = [];
      let start = k;
      for (let c: string | undefined = k; c; c = vor.get(c)) {
        punkte.push(g.ort.get(c)!);
        start = c;
      }
      return { punkte: punkte.reverse(), breite: breite.get(k) ?? 0.8, start: g.anschluss.get(start)!, ziel: an };
    }
    for (const e of g.nachbarn.get(k) ?? []) {
      const nd = d + e.d;
      if (nd > grenze || nd >= (dist.get(e.k) ?? Infinity)) continue;
      dist.set(e.k, nd);
      vor.set(e.k, k);
      breite.set(e.k, Math.max(breite.get(k) ?? 0, e.w));
      schlange.push(nd, e.k);
    }
  }
  return null;
}

/** Kleinster Abstand zuerst (Binaerheap) – mit Sortieren je Schritt brauchte New York bei 30 km 52 s. */
class Heap {
  private a: [number, string][] = [];
  get laenge() {
    return this.a.length;
  }
  push(d: number, k: string) {
    const a = this.a;
    a.push([d, k]);
    for (let i = a.length - 1; i > 0; ) {
      const e = (i - 1) >> 1;
      if (a[e][0] <= a[i][0]) break;
      [a[e], a[i]] = [a[i], a[e]];
      i = e;
    }
  }
  pop(): [number, string] {
    const a = this.a;
    const oben = a[0];
    const letzter = a.pop()!;
    if (a.length) {
      a[0] = letzter;
      for (let i = 0; ; ) {
        const [l, r] = [2 * i + 1, 2 * i + 2];
        let m = i;
        if (l < a.length && a[l][0] < a[m][0]) m = l;
        if (r < a.length && a[r][0] < a[m][0]) m = r;
        if (m === i) break;
        [a[m], a[i]] = [a[i], a[m]];
        i = m;
      }
    }
    return oben;
  }
}
