import type { Punkt } from "./clip";
import type { Zone } from "./typen";

/**
 * Sparsame Klasse fuer "viel" weit draussen (Marcel 27.09.2026): die Wohnstrassen, die ab 1,5-fachem Massstab graviert
 * werden, dort doch schneiden, wo sie das Netz sinnvoll ergaenzen – ohne das Stadtbild zu verfaelschen.
 *
 * 1. Dichte am Original: eine Stelle bleibt nur, wenn keine andere Strasse (geschnitten oder aus der Klasse) naeher als
 *    `abstandMm` parallel daneben laeuft. Gemessen quer zur Richtung – die Fortsetzung derselben Strasse zaehlt nicht.
 *    Ein gieriges Ausduennen liess in New York jede zweite Strasse eines Rasters stehen.
 * 2. Nur, was haelt: ein Stueck bleibt, wenn ein Ende am Netz, an einem behaltenen Stueck oder am Rahmen liegt – lose
 *    Stuecke fallen weg. Beide Enden zu verlangen liess auf Lanzarote nichts uebrig (Wohnstrassen enden dort an
 *    Feldwegen); Kaemme verhindert schon die Dichte.
 */
const PROBE = 1;
const PARALLEL_SIN = Math.sin((35 * Math.PI) / 180);
// Quer naeher als das ist dieselbe Strasse (Fortsetzung, doppelt gefuehrt), keine Nachbarin.
const DIESELBE_MM = 0.3;

interface Probe { x: number; y: number; dx: number; dy: number; linie: number }

export function waehleSparsam(netz: Punkt[][], klasse: Punkt[][], abstandMm: number, breiteMm: number, f: Zone): Punkt[][] {
  const alle = [...netz, ...klasse];
  const proben = alle.map((l, i) => probiere(l, i));
  const zelle = Math.max(abstandMm, 1);
  const gitter = new Map<string, Probe[]>();
  const schl = (x: number, y: number) => `${Math.floor(x / zelle)},${Math.floor(y / zelle)}`;
  for (const ps of proben) for (const p of ps) (gitter.get(schl(p.x, p.y)) ?? gitter.set(schl(p.x, p.y), []).get(schl(p.x, p.y))!).push(p);
  const nahe = (p: Probe, r: number, treffer: (q: Probe) => boolean) => {
    const [gx, gy] = [Math.floor(p.x / zelle), Math.floor(p.y / zelle)];
    for (let ax = -1; ax <= 1; ax++) for (let ay = -1; ay <= 1; ay++) {
      for (const q of gitter.get(`${gx + ax},${gy + ay}`) ?? []) if (Math.abs(q.x - p.x) < r && Math.abs(q.y - p.y) < r && treffer(q)) return true;
    }
    return false;
  };

  // 1. Freie Laeufe der Klasse.
  const stuecke: Punkt[][] = [];
  for (let i = netz.length; i < alle.length; i++) {
    let lauf: Punkt[] = [];
    for (const p of proben[i]) {
      const dicht = nahe(p, abstandMm, (q) => {
        if (q.linie === p.linie) return false;
        if (Math.abs(p.dx * q.dy - p.dy * q.dx) > PARALLEL_SIN) return false;
        const quer = Math.abs((q.x - p.x) * p.dy - (q.y - p.y) * p.dx);
        const laengs = Math.abs((q.x - p.x) * p.dx + (q.y - p.y) * p.dy);
        return quer > DIESELBE_MM && quer < abstandMm && laengs < abstandMm;
      });
      if (dicht) {
        if (lauf.length >= 2) stuecke.push(lauf);
        lauf = [];
      } else lauf.push({ x: p.x, y: p.y });
    }
    if (lauf.length >= 2) stuecke.push(lauf);
  }

  // 2. Nur Stuecke mit einem haltenden Ende – wiederholt, bis nichts mehr dazukommt.
  const netzGitter = new Map<string, Punkt[]>();
  const merke = (p: Punkt) => (netzGitter.get(schl(p.x, p.y)) ?? netzGitter.set(schl(p.x, p.y), []).get(schl(p.x, p.y))!).push(p);
  for (let i = 0; i < netz.length; i++) proben[i].forEach(merke);
  const fang = breiteMm + 0.3;
  const amRahmen = (p: Punkt) => p.x - f.xMm < fang || p.y - f.yMm < fang || f.xMm + f.breiteMm - p.x < fang || f.yMm + f.hoeheMm - p.y < fang;
  const haelt = (p: Punkt, eigene: Set<Punkt>) => {
    if (amRahmen(p)) return true;
    const [gx, gy] = [Math.floor(p.x / zelle), Math.floor(p.y / zelle)];
    for (let ax = -1; ax <= 1; ax++) for (let ay = -1; ay <= 1; ay++) {
      for (const q of netzGitter.get(`${gx + ax},${gy + ay}`) ?? []) if (!eigene.has(q) && Math.hypot(q.x - p.x, q.y - p.y) < fang) return true;
    }
    return false;
  };
  let offen = stuecke.map((s) => ({ s, eigene: new Set(s) }));
  const behalten: Punkt[][] = [];
  for (let aenderung = true; aenderung; ) {
    aenderung = false;
    const rest: typeof offen = [];
    for (const o of offen) {
      if (haelt(o.s[0], o.eigene) || haelt(o.s[o.s.length - 1], o.eigene)) {
        behalten.push(o.s);
        o.s.forEach(merke);
        aenderung = true;
      } else rest.push(o);
    }
    offen = rest;
  }
  return behalten;
}

function probiere(l: Punkt[], linie: number): Probe[] {
  const aus: Probe[] = [];
  for (let i = 1; i < l.length; i++) {
    const d = Math.hypot(l[i].x - l[i - 1].x, l[i].y - l[i - 1].y);
    if (d === 0) continue;
    const [dx, dy] = [(l[i].x - l[i - 1].x) / d, (l[i].y - l[i - 1].y) / d];
    const n = Math.max(1, Math.ceil(d / PROBE));
    for (let j = aus.length ? 1 : 0; j <= n; j++) aus.push({ x: l[i - 1].x + ((l[i].x - l[i - 1].x) * j) / n, y: l[i - 1].y + ((l[i].y - l[i - 1].y) * j) / n, dx, dy, linie });
  }
  return aus;
}
