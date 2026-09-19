import type { Punkt } from "./clip";
import type { Zone } from "./typen";

// So nah am Fensterrand endet keine Netzstrasse mehr, sie laeuft bis in den Rahmen.
const ANSCHLUSS_MM = 4;
// Flacher als 60 Grad auf den Rand zu wuerde die Verlaengerung am Rand entlang schrammen.
const MIN_COS = 0.5;
// Bleibt zwischen Kuppe und Rahmen weniger Luft, fuehrt ein kurzes Stueck senkrecht hin.
const LUFT_MM = 1;
// Richtung am Ende ueber so viel Laenge gemessen, nicht nur am letzten Stueck.
const RICHTUNG_MM = 0.5;
// Endpunkte naeher als das haengen an einer anderen Strasse (Kachelgrenze, Einmuendung).
const FANG_MM = 0.05;
// Bis ueber die Fensterkante: der Beschnitt am Fenster schneidet dann gerade ab.
const UEBER_MM = 0.5;

/**
 * Netzstrassen, die kurz vor dem Rahmen enden – Sackgasse, Weiterfuehrung als Fussweg oder Zufahrt, Tunnel –, hingen
 * mit einer runden Kuppe knapp vor dem Rahmen; dazwischen lief ein schmaler Schnitt, und die Strasse war vom Rahmen
 * getrennt (Marcel 19.09.2026: schwaecht das Netz). Tiergarten A5: 17 Enden 0,2-4 mm vor dem Rahmen.
 * Zeigt das Ende auf den Rand, laeuft die Strasse gerade weiter bis in den Rahmen. Liegt die Kuppe nur knapp neben
 * dem Rand, fuehrt ein kurzes Stueck senkrecht hin. Gibt nur die Anschlussstuecke zurueck.
 */
export function anschluesseAnRahmen(linien: Punkt[][], alleNetzLinien: Punkt[][], f: Zone, breiteMm: number): Punkt[][] {
  const [x0, y0, x1, y1] = [f.xMm, f.yMm, f.xMm + f.breiteMm, f.yMm + f.hoeheMm];
  const gitter = new Map<string, Set<Punkt[]>>();
  const zelle = (p: Punkt) => `${Math.floor(p.x / FANG_MM)},${Math.floor(p.y / FANG_MM)}`;
  for (const l of alleNetzLinien) {
    for (const p of l) {
      const z = zelle(p);
      if (!gitter.has(z)) gitter.set(z, new Set());
      gitter.get(z)!.add(l);
    }
  }
  const haengtAn = (p: Punkt, eigene: Punkt[]) => {
    const gx = Math.floor(p.x / FANG_MM);
    const gy = Math.floor(p.y / FANG_MM);
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        for (const l of gitter.get(`${gx + dx},${gy + dy}`) ?? []) {
          if (l !== eigene && l.some((q) => Math.hypot(q.x - p.x, q.y - p.y) <= FANG_MM)) return true;
        }
      }
    }
    return false;
  };

  const stuecke: Punkt[][] = [];
  for (const l of linien) {
    // Laeuft die Strasse irgendwo aus dem Fenster, haengt sie schon am Rahmen – ihr inneres Ende ist eine Sackgasse.
    if (l.length < 2 || l.some((q) => q.x <= x0 || q.x >= x1 || q.y <= y0 || q.y >= y1)) continue;
    for (const ende of [l, [...l].reverse()]) {
      const p = ende[ende.length - 1];
      const rand = Math.min(p.x - x0, x1 - p.x, p.y - y0, y1 - p.y);
      if (rand <= 0 || rand > ANSCHLUSS_MM || haengtAn(p, l)) continue;
      const u = richtung(ende);
      if (!u) continue;
      // Wie weit geradeaus bis zum Rand, und wie steil trifft die Strasse dort auf?
      const tx = u.x > 0 ? (x1 - p.x) / u.x : u.x < 0 ? (x0 - p.x) / u.x : Infinity;
      const ty = u.y > 0 ? (y1 - p.y) / u.y : u.y < 0 ? (y0 - p.y) / u.y : Infinity;
      const t = Math.min(tx, ty);
      const cos = tx < ty ? Math.abs(u.x) : Math.abs(u.y);
      if (t <= ANSCHLUSS_MM && cos >= MIN_COS) {
        stuecke.push([p, { x: p.x + u.x * (t + UEBER_MM), y: p.y + u.y * (t + UEBER_MM) }]);
      } else if (rand - breiteMm / 2 < LUFT_MM) {
        const ziel =
          rand === p.x - x0 ? { x: x0 - UEBER_MM, y: p.y }
          : rand === x1 - p.x ? { x: x1 + UEBER_MM, y: p.y }
          : rand === p.y - y0 ? { x: p.x, y: y0 - UEBER_MM }
          : { x: p.x, y: y1 + UEBER_MM };
        stuecke.push([p, ziel]);
      }
    }
  }
  return stuecke;
}

/** Richtung am Ende der Linie (Einheitsvektor), gemessen ueber die letzten RICHTUNG_MM. */
function richtung(l: Punkt[]): Punkt | null {
  const p = l[l.length - 1];
  for (let i = l.length - 2; i >= 0; i--) {
    const d = Math.hypot(p.x - l[i].x, p.y - l[i].y);
    if (d >= RICHTUNG_MM || i === 0) return d > 1e-6 ? { x: (p.x - l[i].x) / d, y: (p.y - l[i].y) / d } : null;
  }
  return null;
}
