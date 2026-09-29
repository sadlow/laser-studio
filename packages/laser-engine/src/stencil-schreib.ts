import type { Punkt } from "./clip";
import { vereinige, zuFlaeche, type Flaeche } from "./geometrie";
import { alsFlaeche, imRing, ringeMitPunzen, strahlTreffer } from "./punzen";
import type { Stege, StegRegeln } from "./stencil";

const REST_MM = 0.35;
const UEBERSTAND_MM = 0.06;
// Proben entlang der Punzenkante; der Strahl beginnt so weit in der Punze.
const SCHRITT_MM = 0.08;
const ANLAUF_MM = 0.15;

/**
 * Stege fuer die Schreibschrift: quer durch die duennste Wand einer Schleife, senkrecht zum Strich – wie ein
 * abgesetzter Haarstrich. Senkrechte Stege am Scheitel schnitten schraege Schleifen schief an und sahen aus wie
 * Risse; die dicken Abstriche bleiben jetzt ganz. Zwei Stege je Schleife, mindestens ein Drittel des Umfangs
 * auseinander; eine Schleife schmaler als `offenUnterMm` bekommt einen.
 */
export function stegeSchreibschrift(ink: Flaeche, R: StegRegeln): Stege {
  const { ringe, punzen } = ringeMitPunzen(ink);
  const stege: Flaeche[] = [];
  const zugefuellt: Punkt[][] = [];
  let ohneSteg = 0;
  for (const nr of punzen) {
    const r = ringe[nr];
    const xs = r.map((p) => p.x);
    const ys = r.map((p) => p.y);
    const breite = Math.min(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys));
    if (breite < REST_MM) {
      zugefuellt.push(r);
      continue;
    }
    const { kandidaten, n } = querungen(r, nr, ringe, R.stegMm);
    if (!kandidaten.length) {
      ohneSteg++;
      continue;
    }
    const gewaehlt = [kandidaten[0]];
    for (const k of kandidaten) {
      if (gewaehlt.length >= (breite < R.offenUnterMm ? 1 : 2)) break;
      if (gewaehlt.every((g) => Math.min(Math.abs(g.i - k.i), n - Math.abs(g.i - k.i)) >= n / 3)) gewaehlt.push(k);
    }
    for (const g of gewaehlt) stege.push(zuFlaeche([g.ecken]));
  }
  return { stege: vereinige(...stege), zugefuellt: alsFlaeche(zugefuellt), anzahl: stege.length, zugefuelltAnzahl: zugefuellt.length, ohneSteg };
}

/** Moegliche Stege entlang der Punze, der kuerzeste zuerst. Jeder quert genau eine Wand bis ins Freie. */
function querungen(r: Punkt[], nr: number, ringe: Punkt[][], steg: number) {
  const proben = abtasten(r);
  const n = proben.length;
  const out: { i: number; laenge: number; ecken: Punkt[] }[] = [];
  for (let i = 0; i < n; i++) {
    const p = proben[i];
    const v = proben[(i + 2) % n];
    const u = proben[(i - 2 + n) % n];
    const tl = Math.hypot(v.x - u.x, v.y - u.y) || 1;
    const t = { x: (v.x - u.x) / tl, y: (v.y - u.y) / tl };
    // Normale in den Strich, weg von der Punze.
    let d = { x: -t.y, y: t.x };
    if (imRing({ x: p.x + d.x * 0.03, y: p.y + d.y * 0.03 }, r)) d = { x: -d.x, y: -d.y };
    let ein = Infinity;
    let aus = -Infinity;
    let ok = true;
    for (const s of [-steg / 2, -steg / 4, 0, steg / 4, steg / 2]) {
      const o = { x: p.x + t.x * s - d.x * ANLAUF_MM, y: p.y + t.y * s - d.y * ANLAUF_MM };
      const h = strahlTreffer(o, d, ringe);
      // Erst die eigene Punzenkante (hinein in den Strich), dann die naechste Kante (hinaus).
      if (h.length < 2 || h[0].ring !== nr) {
        ok = false;
        break;
      }
      ein = Math.min(ein, h[0].l);
      aus = Math.max(aus, h[1].l);
    }
    if (!ok) continue;
    const ecke = (s: number, l: number) => ({ x: p.x + t.x * s + d.x * (l - ANLAUF_MM), y: p.y + t.y * s + d.y * (l - ANLAUF_MM) });
    const [e0, e1] = [ein - UEBERSTAND_MM, aus + UEBERSTAND_MM];
    out.push({ i, laenge: aus - ein, ecken: [ecke(-steg / 2, e0), ecke(steg / 2, e0), ecke(steg / 2, e1), ecke(-steg / 2, e1)] });
  }
  return { kandidaten: out.sort((a, b) => a.laenge - b.laenge), n };
}

/** Ring in gleichen Schritten. */
function abtasten(r: Punkt[]): Punkt[] {
  const out: Punkt[] = [];
  let rest = 0;
  for (let i = 0; i < r.length; i++) {
    const a = r[i];
    const b = r[(i + 1) % r.length];
    const L = Math.hypot(b.x - a.x, b.y - a.y);
    let s = rest;
    for (; s < L; s += SCHRITT_MM) out.push({ x: a.x + ((b.x - a.x) * s) / L, y: a.y + ((b.y - a.y) * s) / L });
    rest = s - L;
  }
  return out;
}
