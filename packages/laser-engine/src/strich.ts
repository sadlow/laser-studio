import ClipperLib from "clipper-lib";
import type { Punkt } from "./clip";
import { ohneLoecher, ringeInMm, vereinige, versatz, ziehAb, type Flaeche } from "./geometrie";

// Breitere Striche interessieren nicht – so weit wird quer zum Strich gesucht.
const SUCHWEITE_MM = 2;
const ZELLE_MM = 0.5;
// Gegenkante hoechstens so schraeg, sonst misst der Strahl in eine Ecke statt quer ueber den Strich.
const PARALLEL_COS = Math.cos((25 * Math.PI) / 180);

interface Kante {
  a: Punkt;
  b: Punkt;
  t: Punkt;
  laenge: number;
}

/**
 * Strichbreiten ausgeschnittener Schrift, laengengewichtet: von jeder Kantenmitte senkrecht ins Material
 * bis zur fast parallelen Gegenkante. Nach dem Clipper-Umlauf (aussen positiv, Loecher negativ) liegt das
 * Material immer links der Kantenrichtung.
 */
export function strichbreiten(fl: Flaeche): { breiteMm: number; laengeMm: number }[] {
  const kanten: Kante[] = ringeInMm(vereinige(fl)).flatMap((r) =>
    r.map((a, i) => {
      const b = r[(i + 1) % r.length];
      const laenge = Math.hypot(b.x - a.x, b.y - a.y);
      return { a, b, laenge, t: { x: (b.x - a.x) / (laenge || 1), y: (b.y - a.y) / (laenge || 1) } };
    }),
  ).filter((k) => k.laenge > 1e-6);

  const gitter = new Map<string, Kante[]>();
  const zelle = (x: number, y: number) => `${Math.floor(x / ZELLE_MM)},${Math.floor(y / ZELLE_MM)}`;
  for (const k of kanten) {
    for (let gx = Math.floor(Math.min(k.a.x, k.b.x) / ZELLE_MM); gx <= Math.floor(Math.max(k.a.x, k.b.x) / ZELLE_MM); gx++) {
      for (let gy = Math.floor(Math.min(k.a.y, k.b.y) / ZELLE_MM); gy <= Math.floor(Math.max(k.a.y, k.b.y) / ZELLE_MM); gy++) {
        const s = `${gx},${gy}`;
        const liste = gitter.get(s);
        if (liste) liste.push(k);
        else gitter.set(s, [k]);
      }
    }
  }

  const ergebnis: { breiteMm: number; laengeMm: number }[] = [];
  for (const k of kanten) {
    if (k.laenge < 0.02) continue;
    const m = { x: (k.a.x + k.b.x) / 2, y: (k.a.y + k.b.y) / 2 };
    const n = { x: -k.t.y, y: k.t.x };
    const kandidaten = new Set<Kante>();
    for (let s = 0; s <= SUCHWEITE_MM; s += ZELLE_MM / 2) {
      for (const dx of [-ZELLE_MM, 0, ZELLE_MM]) {
        for (const dy of [-ZELLE_MM, 0, ZELLE_MM]) {
          for (const h of gitter.get(zelle(m.x + n.x * s + dx, m.y + n.y * s + dy)) ?? []) kandidaten.add(h);
        }
      }
    }
    let naechste = SUCHWEITE_MM;
    let treffer: Kante | null = null;
    for (const h of kandidaten) {
      if (h === k) continue;
      const ex = h.b.x - h.a.x;
      const ey = h.b.y - h.a.y;
      const det = -n.x * ey + n.y * ex;
      if (Math.abs(det) < 1e-12) continue;
      const qx = h.a.x - m.x;
      const qy = h.a.y - m.y;
      const d = (-qx * ey + qy * ex) / det;
      const u = (n.x * qy - n.y * qx) / det;
      if (d > 0.003 && u >= 0 && u <= 1 && d < naechste) {
        naechste = d;
        treffer = h;
      }
    }
    if (treffer && Math.abs(k.t.x * treffer.t.x + k.t.y * treffer.t.y) > PARALLEL_COS) ergebnis.push({ breiteMm: naechste, laengeMm: k.laenge });
  }
  return ergebnis;
}

// Die Messung kostet bei einer A5-Zeile bis 200 ms. Der Text aendert sich selten, die Karte oft: gemerkt wird
// je Form, unabhaengig davon, wo die Zeile auf der Platte steht.
const GEMESSEN = new Map<string, number>();

/** Kennung einer Form unabhaengig von ihrer Lage auf der Platte – zum Merken der Messung. */
function signatur(fl: Flaeche, anteil: number): string {
  let minX = Infinity;
  let minY = Infinity;
  for (const pfad of fl) for (const p of pfad) (minX = Math.min(minX, p.X)), (minY = Math.min(minY, p.Y));
  let [n, sx, sy, sxy] = [0, 0, 0, 0];
  for (const pfad of fl) {
    for (const p of pfad) {
      n++;
      sx += p.X - minX;
      sy += p.Y - minY;
      sxy = (sxy * 31 + (p.X - minX) * 7 + (p.Y - minY)) % 1000000007;
    }
  }
  return `${anteil}:${fl.length}:${n}:${sx}:${sy}:${sxy}`;
}

/** Die Breite, unter der `anteil` der gemessenen Strichlaenge liegt – 5 %: Auslaeufe und Spitzen zaehlen nicht. */
export function duennsterStrich(fl: Flaeche, anteil = 0.05): number {
  const schluessel = signatur(fl, anteil);
  const bekannt = GEMESSEN.get(schluessel);
  if (bekannt !== undefined) return bekannt;
  const breite = miss(fl, anteil);
  if (GEMESSEN.size > 200) GEMESSEN.clear();
  GEMESSEN.set(schluessel, breite);
  return breite;
}

function miss(fl: Flaeche, anteil: number): number {
  const werte = strichbreiten(fl).sort((x, y) => x.breiteMm - y.breiteMm);
  const summe = werte.reduce((s, w) => s + w.laengeMm, 0);
  let bisher = 0;
  for (const w of werte) {
    bisher += w.laengeMm;
    if (bisher >= anteil * summe) return w.breiteMm;
  }
  return SUCHWEITE_MM;
}

/**
 * Verstaerkt ausgeschnittene Schrift, bis ihr Strich schneidbar ist (Testblatt 17.09.2026: Schnitte unter
 * 0,5 mm loesen sich nicht aus 2 mm Acryl, Buchstaben brauchen mehr). Die ganze Zeile gleichmaessig, damit die
 * Buchstaben zueinander passen.
 *
 * `nurAussen` laesst die Innenflaechen, wie sie sind, und weitet nur die Aussenkontur (Marcel 17.09.2026 fuer die
 * Schreibschrift: „nur die Aussenkonturlinie erweitern, die Innenteile lassen und mit Stegen verbinden"). Sonst
 * schrumpfen die Punzen mit, und die Stege haengen an immer weniger Material.
 */
export function mitMindeststrich(fl: Flaeche, minMm: number, nurAussen = false): { flaeche: Flaeche; zugabeMm: number; versatzMm: number } {
  if (!fl.length || !(minMm > 0)) return { flaeche: fl, zugabeMm: 0, versatzMm: 0 };
  const duennster = duennsterStrich(fl);
  if (duennster >= minMm) return { flaeche: fl, zugabeMm: 0, versatzMm: 0 };
  if (!nurAussen) return { flaeche: versatz(fl, (minMm - duennster) / 2), zugabeMm: minMm - duennster, versatzMm: (minMm - duennster) / 2 };
  // Nur aussen: ein Strich am Rand einer Punze waechst nur auf einer Seite, darum in Schritten bis er reicht.
  const loecher = ziehAb(ohneLoecher(fl), fl);
  let zugabeMm = 0;
  let flaeche = fl;
  for (let i = 0; i < 3; i++) {
    const fehlt = minMm - duennsterStrich(flaeche);
    if (fehlt <= 0.01) break;
    zugabeMm += fehlt / 2;
    flaeche = ziehAb(versatz(ohneLoecher(fl), zugabeMm), loecher);
  }
  return { flaeche, zugabeMm, versatzMm: zugabeMm };
}

/**
 * Wie versatz(), aber mit spitzen Ecken (Gehrung bis 2,5-fach): verstaerkte Druckschrift behaelt ihre Ecken. Rund
 * versetzt blaehte sie sich an jeder Kreuzung und jedem Ende auf (Marcel 18.09.2026).
 */
export function versatzEckig(fl: Flaeche, mm: number): Flaeche {
  if (!fl.length || !mm) return fl;
  const co = new ClipperLib.ClipperOffset(2.5, 30);
  co.AddPaths(fl, ClipperLib.JoinType.jtMiter, ClipperLib.EndType.etClosedPolygon);
  const ergebnis: Flaeche = [];
  co.Execute(ergebnis, mm * 1000);
  return ergebnis;
}
