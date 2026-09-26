import type { Punkt } from "./clip";

/**
 * Kreuzungen nur einmal brennen (Gravurprobe Abstand, Marcel 27.09.2026: im Stern und an vielen Kreuzungen der
 * Kartenstuecke ging die Mitte sehr tief – jeder durchlaufende Weg brennt den Knoten noch einmal). An jedem Knoten
 * laeuft nur der laengste Weg durch; jeder weitere setzt dort aus, so weit er in dessen Rille laege: halbe Linienbreite
 * durch den Sinus des Kreuzungswinkels (90 Grad: 0,25 mm je Seite bei 0,5 mm Strahl). Die Luecke liegt ganz in der
 * Rille des ersten Wegs und ist nicht zu sehen.
 */
export interface Weg {
  punkte: Punkt[];
  /** Knoten, durch die der Weg laeuft, mit dem Punktindex dort. */
  durch: { knoten: number; index: number }[];
  /** Endet der Weg an einer Kreuzung, haelt er um die halbe Linienbreite davor an (wie bisher in wege.ts). */
  kuerzeAnfang: boolean;
  kuerzeEnde: boolean;
}

// Bei sehr spitzem Winkel waere die Luecke lang; laenger als so viele halbe Linienbreiten wird sie nicht.
const LUECKE_MAX = 6;

export function kreuzungenEinmal(wege: Weg[], halbeBreiteMm: number): Punkt[][] {
  if (!(halbeBreiteMm > 0)) return wege.map((w) => w.punkte);
  const laengen = wege.map((w) => laenge(w.punkte));
  const anKnoten = new Map<number, { weg: number; index: number }[]>();
  wege.forEach((w, i) => w.durch.forEach((d) => anKnoten.set(d.knoten, [...(anKnoten.get(d.knoten) ?? []), { weg: i, index: d.index }])));
  const luecken = wege.map((w, i) => [
    ...(w.kuerzeAnfang ? [[-1, halbeBreiteMm] as [number, number]] : []),
    ...(w.kuerzeEnde ? [[laengen[i] - halbeBreiteMm, laengen[i] + 1] as [number, number]] : []),
  ]);
  for (const liste of anKnoten.values()) {
    if (liste.length < 2) continue;
    liste.sort((a, b) => laengen[b.weg] - laengen[a.weg]);
    const r0 = richtung(wege[liste[0].weg].punkte, liste[0].index);
    for (const { weg, index } of liste.slice(1)) {
      const r = richtung(wege[weg].punkte, index);
      const sin = Math.abs(r0.x * r.y - r0.y * r.x);
      const halb = Math.min(LUECKE_MAX * halbeBreiteMm, halbeBreiteMm / Math.max(sin, 1e-3));
      const s = laenge(wege[weg].punkte.slice(0, index + 1));
      luecken[weg].push([s - halb, s + halb]);
    }
  }
  return wege.flatMap((w, i) => (luecken[i].length ? ohne(w.punkte, luecken[i]) : [w.punkte]));
}

function richtung(l: Punkt[], i: number): Punkt {
  const a = l[Math.max(0, i - 1)];
  const b = l[Math.min(l.length - 1, i + 1)];
  const d = Math.hypot(b.x - a.x, b.y - a.y) || 1;
  return { x: (b.x - a.x) / d, y: (b.y - a.y) / d };
}

function laenge(l: Punkt[]): number {
  let s = 0;
  for (let i = 1; i < l.length; i++) s += Math.hypot(l[i].x - l[i - 1].x, l[i].y - l[i - 1].y);
  return s;
}

/** Die Linie ohne die Abschnitte [von, bis] (Bogenlaenge); ueberlappende Luecken werden eine. */
function ohne(l: Punkt[], roh: [number, number][]): Punkt[][] {
  const luecken: [number, number][] = [];
  for (const g of [...roh].sort((a, b) => a[0] - b[0])) {
    const letzte = luecken[luecken.length - 1];
    if (letzte && g[0] <= letzte[1]) letzte[1] = Math.max(letzte[1], g[1]);
    else luecken.push([...g]);
  }
  const aus: Punkt[][] = [];
  let lauf: Punkt[] = [l[0]];
  let s = 0;
  let li = 0;
  let drin = luecken[0][0] <= 0;
  if (drin) lauf = [];
  for (let i = 1; i < l.length; i++) {
    const [a, b] = [l[i - 1], l[i]];
    const d = Math.hypot(b.x - a.x, b.y - a.y);
    const bei = (t: number): Punkt => ({ x: a.x + ((b.x - a.x) * (t - s)) / (d || 1), y: a.y + ((b.y - a.y) * (t - s)) / (d || 1) });
    // Alle Luecken-Grenzen auf diesem Stueck abarbeiten.
    for (;;) {
      if (li >= luecken.length) break;
      const grenze = drin ? luecken[li][1] : luecken[li][0];
      if (grenze > s + d) break;
      const p = bei(Math.max(s, grenze));
      if (drin) {
        lauf = [p];
        drin = false;
        li++;
      } else {
        lauf.push(p);
        if (lauf.length >= 2) aus.push(lauf);
        lauf = [];
        drin = true;
      }
    }
    if (!drin) lauf.push(b);
    s += d;
  }
  if (!drin && lauf.length >= 2) aus.push(lauf);
  return aus;
}
