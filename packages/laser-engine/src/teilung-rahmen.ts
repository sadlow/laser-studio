import type { Punkt } from "./clip";
import { ausTeilen, schneide, teile, zuFlaeche } from "./geometrie";
import { bogenSvg } from "./produktion";
import type { GravurExport, Lage, Teil, Zone } from "./typen";

const ABSTAND_MM = 3;

export interface Rahmenbogen {
  laserSvg: string;
  /** Leisten in Bogenreihenfolge, fuer Uebersicht und Montageplan. */
  leisten: { name: string; breiteMm: number; hoeheMm: number }[];
  passt: boolean;
}

/**
 * Deckschicht, die nur aus Rahmen und Textreitern besteht (Aufbau "netz-schwarz"), als verschnittoptimierter Bogen
 * (Marcel 25.09.2026): die Platte in vier Leisten geteilt, die Gehrung laeuft von der Aussen- zur Innenecke (der
 * untere Rand ist breiter, darum nicht immer 45°). Jede Leiste liegt mit der Aussenkante oben und untereinander auf
 * einer Rohplatte. Oben und unten nehmen ihre
 * Reiter mit. Statt zwei Plattenhaelften mit viel Abfall in der Mitte eine Platte.
 */
export function rahmenbogen(lage: Lage, platte: Zone, fenster: Zone, rohplatte: { breiteMm: number; hoeheMm: number }, gravurExport: GravurExport, info: { titel: string; beschreibung: string }): Rahmenbogen {
  const { breiteMm: B, hoeheMm: H } = platte;
  const [x0, y0, x1, y1] = [fenster.xMm, fenster.yMm, fenster.xMm + fenster.breiteMm, fenster.yMm + fenster.hoeheMm];
  // Im Fenster liegen nur die Reiter: der obere gehoert zur oberen Leiste, der untere zur unteren.
  const cy = (y0 + y1) / 2;
  const material = ausTeilen(lage.teile);
  // Je Seite ein Bereich; die Drehung legt die Aussenkante der Seite auf y = 0, die Oberseite bleibt oben.
  const seiten: { name: string; bereich: Punkt[]; dreh: (p: Punkt) => Punkt }[] = [
    { name: "oben", bereich: pk([0, 0], [B, 0], [x1, y0], [x1, cy], [x0, cy], [x0, y0]), dreh: (p) => ({ x: p.x, y: p.y }) },
    { name: "unten", bereich: pk([B, H], [0, H], [x0, y1], [x0, cy], [x1, cy], [x1, y1]), dreh: (p) => ({ x: B - p.x, y: H - p.y }) },
    { name: "links", bereich: pk([0, H], [0, 0], [x0, y0], [x0, y1]), dreh: (p) => ({ x: H - p.y, y: p.x }) },
    { name: "rechts", bereich: pk([B, 0], [B, H], [x1, y1], [x1, y0]), dreh: (p) => ({ x: p.y, y: B - p.x }) },
  ];

  const stuecke: { lage: Lage; dx: number; dy: number }[] = [];
  const leisten: Rahmenbogen["leisten"] = [];
  let y = 0;
  for (const s of seiten) {
    const teileSeite = teile(schneide(material, zuFlaeche([s.bereich]))).map((t) => dreheTeil(t, s.dreh));
    if (!teileSeite.length) continue;
    const pkt = teileSeite.flatMap((t) => t.aussen);
    const [x0, x1] = [Math.min(...pkt.map((p) => p.x)), Math.max(...pkt.map((p) => p.x))];
    const hoehe = Math.max(...pkt.map((p) => p.y));
    stuecke.push({ lage: { ...lage, teile: teileSeite, gravur: [], klebeflaeche: [] }, dx: 0, dy: y });
    leisten.push({ name: s.name, breiteMm: x1 - x0, hoeheMm: hoehe });
    y += hoehe + ABSTAND_MM;
  }
  const passt = y - ABSTAND_MM <= rohplatte.hoeheMm;
  const laserSvg = bogenSvg(rohplatte, stuecke, {
    titel: `${info.titel} – Rahmenbogen`,
    beschreibung: `${info.beschreibung}; vier Leisten mit Gehrung (${leisten.map((l) => l.name).join(", ")}), Aussenkante jeweils unten ` +
      `bzw. oben liegend; die oberste Leiste liegt an der Plattenkante`,
  }, gravurExport, true);
  return { laserSvg, leisten, passt };
}

function pk(...p: [number, number][]): Punkt[] {
  return p.map(([x, y]) => ({ x, y }));
}

function dreheTeil(t: Teil, d: (p: Punkt) => Punkt): Teil {
  return { ...t, aussen: t.aussen.map(d), loecher: t.loecher.map((r) => r.map(d)) };
}
