import type { Punkt } from "./clip";

// Endpunkte naeher als das sind derselbe Knoten.
const FANG_MM = 0.02;
// An Kreuzungen geht ein Weg nur weiter, wenn er dabei hoechstens so stark abknickt.
const KNICK_MAX_GRAD = 45;
// Kuerzere Reste zeichnet der Laser nur als Punkt.
const MIN_WEG_MM = 0.2;
// Richtung eines Wegs an seinem Ende: gemessen ueber so viel Laenge, nicht nur das letzte Stueck.
const RICHTUNG_MM = 0.3;

interface Ende {
  kante: number;
  /** 0 = Anfang der Kante liegt am Knoten, 1 = ihr Ende. */
  seite: 0 | 1;
  richtung: Punkt;
}

/**
 * Macht aus den Gravurlinien durchgehende Wege fuer die Liniengravur (Marcel 17.09.2026: an einer Kreuzung
 * endeten so viele Linien, dass im Weiss fast ein Loch entstand). Jeder Start und Stopp brennt einen Punkt
 * tiefer ein, jede doppelte Linie faehrt zweimal. Darum: doppelte Kanten raus, an jedem Knoten die geradesten
 * Fortsetzungen zu einem Weg verbinden, und Wege, die an einer Kreuzung enden, um `kuerzenMm` vor dem
 * durchlaufenden Weg anhalten.
 */
export function verbindeWege(linien: Punkt[][], kuerzenMm: number): Punkt[][] {
  const knoten: Punkt[] = [];
  const gitter = new Map<string, number[]>();
  const knotenVon = (p: Punkt) => {
    const gx = Math.round(p.x / FANG_MM);
    const gy = Math.round(p.y / FANG_MM);
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        for (const i of gitter.get(`${gx + dx},${gy + dy}`) ?? []) if (Math.hypot(knoten[i].x - p.x, knoten[i].y - p.y) <= FANG_MM) return i;
      }
    }
    knoten.push(p);
    gitter.set(`${gx},${gy}`, [...(gitter.get(`${gx},${gy}`) ?? []), knoten.length - 1]);
    return knoten.length - 1;
  };

  // Kanten mit ihren Knoten; dieselbe Kante zweimal (gleiche Knoten, gleicher Verlauf) nur einmal.
  const kanten: { punkte: Punkt[]; von: number; nach: number }[] = [];
  const bekannt = new Set<string>();
  for (const l of linien) {
    if (l.length < 2 || laenge(l) < 1e-6) continue;
    const von = knotenVon(l[0]);
    const nach = knotenVon(l[l.length - 1]);
    const mitte = punktBei(l, laenge(l) / 2);
    const schluessel = `${Math.min(von, nach)}-${Math.max(von, nach)}-${Math.round(mitte.x / FANG_MM)}-${Math.round(mitte.y / FANG_MM)}`;
    if (bekannt.has(schluessel)) continue;
    bekannt.add(schluessel);
    kanten.push({ punkte: l, von, nach });
  }

  const anKnoten = new Map<number, Ende[]>();
  kanten.forEach((k, i) => {
    for (const seite of [0, 1] as const) {
      const pts = seite === 0 ? k.punkte : [...k.punkte].reverse();
      const weiter = punktBei(pts, Math.min(RICHTUNG_MM, laenge(pts)));
      const d = Math.hypot(weiter.x - pts[0].x, weiter.y - pts[0].y) || 1;
      const id = seite === 0 ? k.von : k.nach;
      anKnoten.set(id, [...(anKnoten.get(id) ?? []), { kante: i, seite, richtung: { x: (weiter.x - pts[0].x) / d, y: (weiter.y - pts[0].y) / d } }]);
    }
  });

  // An jedem Knoten die geradesten Paare verbinden. Zwei Enden gehoeren immer zusammen (Knick im Weg).
  const partner = new Map<string, Ende>();
  const name = (e: Ende) => `${e.kante}:${e.seite}`;
  const grad = new Map<number, number>();
  for (const [id, enden] of anKnoten) {
    grad.set(id, enden.length);
    const paare: [number, Ende, Ende][] = [];
    for (let i = 0; i < enden.length; i++) {
      for (let j = i + 1; j < enden.length; j++) {
        if (enden[i].kante === enden[j].kante) continue;
        const cos = -(enden[i].richtung.x * enden[j].richtung.x + enden[i].richtung.y * enden[j].richtung.y);
        paare.push([Math.acos(Math.max(-1, Math.min(1, cos))), enden[i], enden[j]]);
      }
    }
    paare.sort((a, b) => a[0] - b[0]);
    for (const [knick, a, b] of paare) {
      if (partner.has(name(a)) || partner.has(name(b))) continue;
      if (enden.length > 2 && knick > (KNICK_MAX_GRAD * Math.PI) / 180) continue;
      partner.set(name(a), b);
      partner.set(name(b), a);
    }
  }

  // Wege ablaufen: erst von offenen Enden aus, dann die Ringe.
  const benutzt = new Set<number>();
  const wege: { punkte: Punkt[]; start: number; ende: number }[] = [];
  const laufe = (kante: number, seite: 0 | 1) => {
    const punkte: Punkt[] = [];
    const start = seite === 0 ? kanten[kante].von : kanten[kante].nach;
    let [k, s] = [kante, seite];
    let ende = start;
    while (!benutzt.has(k)) {
      benutzt.add(k);
      const pts = s === 0 ? kanten[k].punkte : [...kanten[k].punkte].reverse();
      punkte.push(...(punkte.length ? pts.slice(1) : pts));
      const gegen: Ende = { kante: k, seite: s === 0 ? 1 : 0, richtung: { x: 0, y: 0 } };
      ende = gegen.seite === 0 ? kanten[k].von : kanten[k].nach;
      const weiter = partner.get(name(gegen));
      if (!weiter) break;
      [k, s] = [weiter.kante, weiter.seite];
    }
    wege.push({ punkte, start, ende });
  };
  for (const enden of anKnoten.values()) for (const e of enden) if (!partner.has(name(e)) && !benutzt.has(e.kante)) laufe(e.kante, e.seite);
  kanten.forEach((_, i) => !benutzt.has(i) && laufe(i, 0));

  // Endet ein Weg an einer Kreuzung, laeuft dort ein anderer durch: kurz davor anhalten.
  const ergebnis: Punkt[][] = [];
  for (const w of wege) {
    let pts = w.punkte;
    if (kuerzenMm > 0 && (grad.get(w.start) ?? 0) > 2) pts = kuerze(pts, kuerzenMm);
    if (kuerzenMm > 0 && (grad.get(w.ende) ?? 0) > 2) pts = kuerze([...pts].reverse(), kuerzenMm).reverse();
    if (pts.length >= 2 && laenge(pts) >= MIN_WEG_MM) ergebnis.push(pts);
  }
  return ergebnis;
}

function laenge(l: Punkt[]): number {
  let s = 0;
  for (let i = 1; i < l.length; i++) s += Math.hypot(l[i].x - l[i - 1].x, l[i].y - l[i - 1].y);
  return s;
}

/** Punkt nach `abstand` mm entlang der Linie. */
function punktBei(l: Punkt[], abstand: number): Punkt {
  let rest = abstand;
  for (let i = 1; i < l.length; i++) {
    const d = Math.hypot(l[i].x - l[i - 1].x, l[i].y - l[i - 1].y);
    if (rest <= d && d > 0) return { x: l[i - 1].x + ((l[i].x - l[i - 1].x) * rest) / d, y: l[i - 1].y + ((l[i].y - l[i - 1].y) * rest) / d };
    rest -= d;
  }
  return l[l.length - 1];
}

/** Nimmt vom Anfang der Linie `mm` weg. */
function kuerze(l: Punkt[], mm: number): Punkt[] {
  let rest = mm;
  for (let i = 1; i < l.length; i++) {
    const d = Math.hypot(l[i].x - l[i - 1].x, l[i].y - l[i - 1].y);
    if (rest < d) return [punktBei([l[i - 1], l[i]], rest), ...l.slice(i)];
    rest -= d;
  }
  return [];
}
