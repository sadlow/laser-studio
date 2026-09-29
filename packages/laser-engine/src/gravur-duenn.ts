import type { Punkt } from "./clip";

/**
 * Gravurlinien ausduennen (Marcel 26.09.2026): bei grossem Ausschnitt liegen die Mittellinien so dicht, dass der Strahl
 * mehrere zugleich brennt und die Rille nur tiefer wird, statt zwei Linien zu zeigen. Berlin 60 x 60 bei 34,8 km: 75 %
 * des Gravurwegs hatten eine andere Linie naeher als 0,5 mm, 53 % naeher als 0,25 mm (scripts/gravur-dichte.ts).
 *
 * Der Mindestabstand gilt zwischen Mittellinien. Wichtige Linien zuerst (breitere Klasse, dann laengere Linie); ein
 * Stueck einer spaeteren Linie faellt weg, wenn schon eine geschriebene Linie naeher als der Mindestabstand ANLIEGT –
 * annaehernd parallel, bis 35 Grad. Kreuzungen bleiben: eine Linie, die steil quer laeuft, ist keine doppelte.
 *
 * Erhalten bleiben die Originalpunkte; nur lange Segmente werden dazwischen unterteilt, damit ein Stueck nicht erst
 * am Segmentende faellt.
 */
export interface GravurGruppe {
  linien: Punkt[][];
  breiteMm: number;
}

// Erlaubt bis zu dieser Abweichung der Richtung (Sinus) gilt eine nahe Linie als parallel.
const PARALLEL_SIN = Math.sin((35 * Math.PI) / 180);
// Reststuecke kuerzer als so viele Mindestabstaende fallen weg.
const REST_FAKTOR = 4;

interface Probe {
  x: number;
  y: number;
  /** Richtung, Einheitsvektor. */
  dx: number;
  dy: number;
}

export function duenneAus(gruppen: GravurGruppe[], abstandMm: number): { gruppen: GravurGruppe[]; vorherM: number; nachherM: number } {
  const laenge = (l: Punkt[]) => l.reduce((s, p, i) => (i ? s + Math.hypot(p.x - l[i - 1].x, p.y - l[i - 1].y) : s), 0);
  const vorherM = gruppen.reduce((s, g) => s + g.linien.reduce((a, l) => a + laenge(l), 0), 0) / 1000;
  if (!(abstandMm > 0)) return { gruppen, vorherM, nachherM: vorherM };

  // Zeile fuer Zeile prueft eine Zelle von der Groesse des Mindestabstands ihre 3 x 3 Nachbarn.
  const zelle = abstandMm;
  const schritt = abstandMm / 3;
  const gitter = new Map<number, Probe[]>();
  const schluessel = (gx: number, gy: number) => gx * 1_000_003 + gy;

  const belegt = (p: Probe) => {
    const gx = Math.floor(p.x / zelle);
    const gy = Math.floor(p.y / zelle);
    for (let ax = -1; ax <= 1; ax++) {
      for (let ay = -1; ay <= 1; ay++) {
        const liste = gitter.get(schluessel(gx + ax, gy + ay));
        if (!liste) continue;
        for (const q of liste) {
          if (Math.hypot(q.x - p.x, q.y - p.y) >= abstandMm) continue;
          // Nur annaehernd parallele Nachbarn zaehlen: quer laufende Linien kreuzen, sie decken nichts doppelt.
          if (Math.abs(p.dx * q.dy - p.dy * q.dx) <= PARALLEL_SIN) return true;
        }
      }
    }
    return false;
  };
  const merke = (p: Probe) => {
    const k = schluessel(Math.floor(p.x / zelle), Math.floor(p.y / zelle));
    const liste = gitter.get(k);
    if (liste) liste.push(p);
    else gitter.set(k, [p]);
  };

  // Reihenfolge: breitere Gruppe zuerst (Wohnstrassen vor Wegen), darin die laengere Linie.
  const reihenfolge = gruppen.map((g, i) => i).sort((a, b) => gruppen[b].breiteMm - gruppen[a].breiteMm || a - b);
  const neu: GravurGruppe[] = gruppen.map((g) => ({ breiteMm: g.breiteMm, linien: [] }));
  let nachher = 0;

  for (const gi of reihenfolge) {
    const geordnet = gruppen[gi].linien.map((l) => ({ l, len: laenge(l) })).sort((a, b) => b.len - a.len);
    for (const { l } of geordnet) {
      if (l.length < 2) continue;
      // Proben: Originalpunkte und Zwischenpunkte auf langen Segmenten; Richtung = die des Segments.
      const proben: Probe[] = [];
      for (let i = 0; i < l.length; i++) {
        if (i > 0) {
          const d = Math.hypot(l[i].x - l[i - 1].x, l[i].y - l[i - 1].y);
          const n = Math.max(1, Math.ceil(d / schritt));
          const dx = d > 0 ? (l[i].x - l[i - 1].x) / d : 1;
          const dy = d > 0 ? (l[i].y - l[i - 1].y) / d : 0;
          for (let j = 1; j <= n; j++) {
            const t = j / n;
            proben.push({ x: l[i - 1].x + (l[i].x - l[i - 1].x) * t, y: l[i - 1].y + (l[i].y - l[i - 1].y) * t, dx, dy });
          }
        } else {
          proben.push({ x: l[0].x, y: l[0].y, dx: 1, dy: 0 });
        }
      }
      // Die Richtung des ersten Punkts von seinem Nachfolger.
      if (proben.length > 1) {
        proben[0].dx = proben[1].dx;
        proben[0].dy = proben[1].dy;
      }
      // Laeufe zwischen belegten Proben. Belegt wird gegen den Stand VOR dieser Linie geprueft: die eigene Linie
      // zaehlt erst danach, sonst faellt jede Kurve an sich selbst weg (eine Schleife mit Abstand unter dem
      // Mindestabstand bleibt damit stehen).
      const frei = proben.map((p) => !belegt(p));
      const ganz = frei.every(Boolean);
      let lauf: Probe[] = [];
      const abschluss = () => {
        const punkte = lauf.map((p) => ({ x: p.x, y: p.y }));
        const l = laenge(punkte);
        // Abgeschnittene Reste unter der Mindestlaenge fallen mit weg – sonst bleiben Schnipsel und Punkte stehen
        // (Gravurprobe Abstand, Berlin 20 km bei 1 mm). Ein ganzer kurzer Weg bleibt.
        if (punkte.length >= 2 && (ganz || l >= abstandMm * REST_FAKTOR)) {
          neu[gi].linien.push(punkte);
          nachher += l;
          lauf.forEach(merke);
        }
        lauf = [];
      };
      proben.forEach((p, i) => {
        if (frei[i]) lauf.push(p);
        else abschluss();
      });
      abschluss();
    }
  }
  return { gruppen: neu, vorherM, nachherM: nachher / 1000 };
}
