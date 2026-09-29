import ClipperLib from "clipper-lib";
import type { Punkt } from "./clip";
import { teile, vereinige, zuFlaeche, type Flaeche } from "./geometrie";

/**
 * Alle Konturen einer ausgeschnittenen Schrift in mm, dazu welche davon Punzen sind: Loecher im Schnitt, also
 * Material, das stehen bleibt und Stege braucht (das Innere des O).
 */
export function ringeMitPunzen(ink: Flaeche): { ringe: Punkt[][]; punzen: number[] } {
  const c = new ClipperLib.Clipper();
  c.AddPaths(ink, ClipperLib.PolyType.ptSubject, true);
  const baum = new ClipperLib.PolyTree();
  c.Execute(ClipperLib.ClipType.ctUnion, baum, ClipperLib.PolyFillType.pftNonZero, ClipperLib.PolyFillType.pftNonZero);
  const ringe: Punkt[][] = [];
  const punzen: number[] = [];
  const geh = (k: ClipperLib.PolyNode) => {
    for (const kind of k.Childs()) {
      if (kind.IsHole()) punzen.push(ringe.length);
      ringe.push(kind.Contour().map((q) => ({ x: q.X / 1000, y: q.Y / 1000 })));
      geh(kind);
    }
  };
  geh(baum);
  return { ringe, punzen };
}

/** Alle y, an denen eine Senkrechte bei x die Ringe kreuzt – sortiert. */
export function senkrechtKreuzungen(ringe: Punkt[][], x: number): number[] {
  const ys: number[] = [];
  for (const r of ringe) {
    for (let i = 0; i < r.length; i++) {
      const a = r[i];
      const b = r[(i + 1) % r.length];
      if ((a.x <= x && b.x > x) || (b.x <= x && a.x > x)) ys.push(a.y + ((x - a.x) * (b.y - a.y)) / (b.x - a.x));
    }
  }
  return ys.sort((p, q) => p - q);
}

/** Wo der Strahl o + l*d Kanten der Ringe kreuzt: Abstand l und Nummer des Rings, sortiert. */
export function strahlTreffer(o: Punkt, d: Punkt, ringe: Punkt[][]): { l: number; ring: number }[] {
  const out: { l: number; ring: number }[] = [];
  ringe.forEach((r, k) => {
    for (let i = 0; i < r.length; i++) {
      const a = r[i];
      const b = r[(i + 1) % r.length];
      const ex = b.x - a.x;
      const ey = b.y - a.y;
      const det = -d.x * ey + d.y * ex;
      if (Math.abs(det) < 1e-12) continue;
      const qx = a.x - o.x;
      const qy = a.y - o.y;
      const l = (-qx * ey + qy * ex) / det;
      const m = (d.x * qy - d.y * qx) / det;
      if (l > 1e-6 && m >= 0 && m <= 1) out.push({ l, ring: k });
    }
  });
  return out.sort((u, v) => u.l - v.l);
}

/** Liegt p im Ring (gerade-ungerade)? */
export function imRing(p: Punkt, r: Punkt[]): boolean {
  let drin = false;
  for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
    const a = r[i];
    const b = r[j];
    if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) drin = !drin;
  }
  return drin;
}

/** Punzen als fuellbare Flaeche (Umlaufrichtung umgedreht). */
export function alsFlaeche(ringe: Punkt[][]): Flaeche {
  return zuFlaeche(ringe.map((r) => r.slice().reverse()));
}

/** Nach dem Setzen der Stege: Schnittreste unter `minMm2` fallen weg – ein Zipfel so klein loest sich nicht sauber. */
export function ohneSplitter(fl: Flaeche, minMm2: number): Flaeche {
  const t = teile(fl, 0.0001);
  if (t.every((s) => s.flaecheMm2 >= minMm2)) return fl;
  return vereinige(...t.filter((s) => s.flaecheMm2 >= minMm2).map((s) => zuFlaeche([s.aussen, ...s.loecher])));
}

export interface Seite {
  a: Punkt;
  b: Punkt;
  laenge: number;
  /** Abweichung von der Senkrechten (Bogenmass). */
  winkel: number;
  /** Knickt die Kontur an beiden Enden (Ecke statt Rundung)? Trennt den Stamm des D vom runden Rand des O. */
  ecken: boolean;
}

/** Gerade Kanten eines Rings: fast kollineare Stuecke zusammengefasst, mit Eckentest an beiden Enden. */
export function geradeSeiten(r: Punkt[]): Seite[] {
  const n = r.length;
  const richtung = (i: number) => {
    const a = r[((i % n) + n) % n];
    const b = r[(((i + 1) % n) + n) % n];
    return Math.atan2(b.y - a.y, b.x - a.x);
  };
  const diff = (u: number, v: number) => {
    const d = Math.abs(u - v) % (2 * Math.PI);
    return d > Math.PI ? 2 * Math.PI - d : d;
  };
  // Beginn an der schaerfsten Ecke, damit kein Lauf ueber den Ringanfang reisst.
  let start = 0;
  for (let i = 0, best = -1; i < n; i++) {
    const d = diff(richtung(i), richtung(i - 1));
    if (d > best) (best = d), (start = i);
  }
  const bei = (i: number) => r[(((start + i) % n) + n) % n];
  const knick = (d: Punkt, von: number, schritt: number) => {
    // Richtung 0,15 mm hinter dem Ende: knickt sie mehr als 40 Grad, ist dort eine Ecke.
    const p0 = bei(von);
    let k = von;
    let q = p0;
    while (Math.hypot(q.x - p0.x, q.y - p0.y) < 0.15 && Math.abs(k - von) < n) q = bei((k += schritt));
    const v = { x: (q.x - p0.x) * schritt, y: (q.y - p0.y) * schritt };
    const l = Math.hypot(v.x, v.y) || 1;
    return Math.acos(Math.max(-1, Math.min(1, (v.x * d.x + v.y * d.y) / l))) > (40 * Math.PI) / 180;
  };
  const seiten: Seite[] = [];
  for (let i = 0; i < n; ) {
    const a = bei(i);
    let j = i + 1;
    // Verlaengern, solange alle Punkte dazwischen nah an der Geraden liegen.
    while (j < n) {
      const b = bei(j + 1);
      const L = Math.hypot(b.x - a.x, b.y - a.y);
      let ok = L > 0;
      for (let k = i + 1; k <= j && ok; k++) {
        const q = bei(k);
        if (Math.abs((b.x - a.x) * (a.y - q.y) - (a.x - q.x) * (b.y - a.y)) / L > 0.012) ok = false;
      }
      if (!ok) break;
      j++;
    }
    const b = bei(j);
    const L = Math.hypot(b.x - a.x, b.y - a.y);
    if (L > 0.3) {
      const d = { x: (b.x - a.x) / L, y: (b.y - a.y) / L };
      seiten.push({ a, b, laenge: L, winkel: Math.atan2(d.x, d.y), ecken: knick(d, j, 1) && knick(d, i, -1) });
    }
    i = j;
  }
  return seiten;
}
