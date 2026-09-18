import type { Punkt } from "./clip";
import { vereinige, zuFlaeche, type Flaeche } from "./geometrie";
import { alsFlaeche, geradeSeiten, ringeMitPunzen, senkrechtKreuzungen } from "./punzen";

// Kleiner ist ein Rechenrest, keine Punze: zufuellen.
const REST_MM = 0.35;
// So weit greift der Steg ueber Punzenkante und Aussenkante hinaus, damit die Teile sicher getrennt sind.
const UEBERSTAND_MM = 0.06;

export interface StegRegeln {
  /** Breite jedes Stegs. */
  stegMm: number;
  /** Schmalere Punzen (Schleife im &) bekommen nur einen Steg und werden zur offenen Schleife. */
  offenUnterMm: number;
}

export interface Stege {
  stege: Flaeche;
  /** Punzen, die zu klein fuer jeden Steg sind – der Aufrufer fuellt sie zu. */
  zugefuellt: Flaeche;
  anzahl: number;
  zugefuelltAnzahl: number;
  /** Punzen, fuer die kein Steg gefunden wurde – sie fielen heraus. */
  ohneSteg: number;
}

/**
 * Stege fuer eine Glyphe der Druckschrift, gesetzt wie in gezeichneten Stencil-Schriften (Oswald, Big Shoulders):
 * - Punze an einem geraden Stamm (B D P R, die 4): der Steg laeuft am Stamm entlang, oben und unten. Der Stamm
 *   bleibt ein sauberes Rechteck, der Bogen setzt mit Abstand an.
 * - Beim A ist der Stamm der rechte Schenkel; der Steg liegt schraeg daran, statt die Spitze zu spalten.
 * - Runde Punzen (O 0 6 8 9 °): senkrecht oben und unten, moeglichst mittig, aber nur, wo der Steg eine einzige
 *   Wand quert – bei 6 und 9 nicht durch den Ansatz des Bogens.
 * Jeder Steg ist ein Rechteck gleicher Breite. Frueher wurden Engstellen rund aufgebissen, das sah zerfressen aus
 * (Marcel 18.09.2026: "sieht am Bildschirm schon nicht gut aus").
 */
export function stegeDruckschrift(ink: Flaeche, R: StegRegeln, nurUnten = false): Stege {
  const { ringe, punzen } = ringeMitPunzen(ink);
  const zugefuellt: Punkt[][] = [];
  const achsen: { r: Punkt[]; winkel: number; x: number; rund: boolean; einSteg: boolean }[] = [];
  for (const i of punzen) {
    const r = ringe[i];
    const xs = r.map((p) => p.x);
    const ys = r.map((p) => p.y);
    const breite = Math.max(...xs) - Math.min(...xs);
    const hoehe = Math.max(...ys) - Math.min(...ys);
    const mitte = (Math.min(...xs) + Math.max(...xs)) / 2;
    if (breite < REST_MM || hoehe < REST_MM) {
      zugefuellt.push(r);
      continue;
    }
    // Zufuellen gaebe einen Klecks: lieber ein Steg, der die Schleife oeffnet.
    if (breite < R.offenUnterMm || hoehe < R.offenUnterMm) {
      achsen.push({ r, winkel: 0, x: mitte, rund: false, einSteg: true });
      continue;
    }
    const stamm = geradeSeiten(r)
      .filter((s) => s.ecken && Math.abs(Math.sin(s.winkel)) < Math.sin((35 * Math.PI) / 180) && s.laenge * Math.abs(Math.cos(s.winkel)) >= 0.45 * hoehe)
      // Senkrechte zuerst, bei gleich schraegen Schenkeln (A) der rechte.
      .sort((s, t) => Math.abs(Math.sin(s.winkel)) - Math.abs(Math.sin(t.winkel)) || t.a.x + t.b.x - s.a.x - s.b.x)[0];
    if (!stamm) {
      achsen.push({ r, winkel: 0, x: mitte, rund: true, einSteg: false });
      continue;
    }
    // Gedreht, bis der Stamm senkrecht steht; der Steg liegt auf der Seite der Punze buendig am Stamm.
    const w = Math.atan2(stamm.b.x - stamm.a.x, stamm.b.y - stamm.a.y);
    const xs0 = dreh(stamm.a, w).x;
    const seite = r.reduce((m, p) => m + dreh(p, w).x, 0) / r.length > xs0 ? 1 : -1;
    achsen.push({ r, winkel: w, x: xs0 + (seite * R.stegMm) / 2, rund: false, einSteg: false });
  }

  const stege: Flaeche[] = [];
  let ohneSteg = 0;
  for (const a of achsen) {
    // Je Steg: Drehung, Achse im gedrehten Bild, oben oder unten.
    let plaene: { winkel: number; x: number; oben: boolean }[] = (nurUnten ? [false] : [true, false]).map((oben) => ({ winkel: a.winkel, x: a.x, oben }));
    if (a.einSteg) {
      // Die kuerzere Querung gewinnt.
      const [o, u] = [true, false].map((oben) => band(gedreht(a.r, ringe, 0), a.x, oben, R.stegMm)?.laengster ?? Infinity);
      plaene = [{ winkel: 0, x: a.x, oben: o <= u }];
    } else if (a.rund) {
      plaene = rundeStege(a.r, ringe, a.x, R.stegMm, nurUnten);
    }
    const vorher = stege.length;
    for (const p of plaene) {
      const b = band(gedreht(a.r, ringe, p.winkel), p.x, p.oben, R.stegMm);
      if (!b) continue;
      const h = R.stegMm / 2;
      const ecken = [{ x: p.x - h, y: b.ya }, { x: p.x + h, y: b.ya }, { x: p.x + h, y: b.yb }, { x: p.x - h, y: b.yb }];
      stege.push(zuFlaeche([ecken.map((q) => dreh(q, -p.winkel))]));
    }
    if (stege.length === vorher) ohneSteg++;
  }
  return { stege: vereinige(...stege), zugefuellt: alsFlaeche(zugefuellt), anzahl: stege.length, zugefuelltAnzahl: zugefuellt.length, ohneSteg };
}

/** Punze und alle Ringe um `winkel` gedreht – im gedrehten Bild laeuft der Steg senkrecht. */
function gedreht(r: Punkt[], ringe: Punkt[][], winkel: number) {
  return { rr: r.map((p) => dreh(p, winkel)), aa: ringe.map((ring) => ring.map((p) => dreh(p, winkel))) };
}

/**
 * Runde Punze: oben und unten, wenn der Steg dort nur eine Wand quert. Laeuft er oben durch den Ansatz eines Bogens
 * (die 6 der DIN: Diagonale und Bauch verschmelzen ueber der schmalen Punze), nimmt die Seite mit der duennsten Wand
 * seinen Platz ein – ein waagerechter Steg.
 */
function rundeStege(r: Punkt[], ringe: Punkt[][], mitte: number, steg: number, nurUnten: boolean) {
  const cy = r.reduce((s, p) => s + p.y, 0) / r.length;
  const richtungen = [
    { winkel: 0, oben: true, mitte },
    { winkel: 0, oben: false, mitte },
    { winkel: Math.PI / 2, oben: true, mitte: dreh({ x: mitte, y: cy }, Math.PI / 2).x },
    { winkel: Math.PI / 2, oben: false, mitte: dreh({ x: mitte, y: cy }, Math.PI / 2).x },
  ].map((d) => ({ ...d, ...rundeAchse(gedreht(r, ringe, d.winkel), d.mitte, d.oben, steg) }));
  const wand = Math.min(...richtungen.map((d) => d.l));
  const gut = (d: (typeof richtungen)[number]) => Number.isFinite(d.l) && d.l <= Math.max(1.5 * wand, wand + 0.4);
  const [oben, unten, ...seiten] = richtungen;
  if (nurUnten) return [unten].map(({ winkel, x, oben: o }) => ({ winkel, x, oben: o }));
  const wahl = [oben, unten].filter(gut);
  for (const s of seiten.filter(gut).sort((d, e) => d.l - e.l)) if (wahl.length < 2) wahl.push(s);
  return (wahl.length ? wahl : [oben, unten]).map(({ winkel, x, oben: o }) => ({ winkel, x, oben: o }));
}

const dreh = (p: Punkt, a: number): Punkt => ({ x: p.x * Math.cos(a) - p.y * Math.sin(a), y: p.x * Math.sin(a) + p.y * Math.cos(a) });

/** Von der Punze senkrecht nach oben bzw. unten bis zur ersten Aussenkante: durch wie viel Schnitt der Strahl laeuft. */
function quer(rr: Punkt[], aa: Punkt[][], x: number, oben: boolean) {
  const eigen = senkrechtKreuzungen([rr], x);
  if (!eigen.length) return null;
  const kante = oben ? eigen[0] : eigen[eigen.length - 1];
  const ys = senkrechtKreuzungen(aa, x);
  const jenseits = oben ? ys.filter((y) => y < kante - 0.001) : ys.filter((y) => y > kante + 0.001);
  if (!jenseits.length) return null;
  const aussen = oben ? Math.max(...jenseits) : Math.min(...jenseits);
  return { kante, aussen, laenge: Math.abs(aussen - kante) };
}

/** Steg an Achse x (im gedrehten Bild): Hoehe ueber alle Strahlen; `laengster` unendlich, wenn einer die Punze verfehlt. */
function band({ rr, aa }: { rr: Punkt[]; aa: Punkt[][] }, x: number, oben: boolean, steg: number) {
  const h = steg / 2 - 0.005;
  const q = [x - h, x - h / 2, x, x + h / 2, x + h].map((xs) => quer(rr, aa, xs, oben));
  const ok = q.filter((z): z is NonNullable<typeof z> => !!z);
  if (!ok.length) return null;
  const innen = oben ? Math.max(...ok.map((z) => z.kante)) : Math.min(...ok.map((z) => z.kante));
  const aussen = oben ? Math.min(...ok.map((z) => z.aussen)) : Math.max(...ok.map((z) => z.aussen));
  return {
    ya: Math.min(innen, aussen) - UEBERSTAND_MM,
    yb: Math.max(innen, aussen) + UEBERSTAND_MM,
    laengster: ok.length === q.length ? Math.max(...ok.map((z) => z.laenge)) : Infinity,
  };
}

/** Die Stelle naechst der Mitte, an der der Steg die duennste Wand quert (hoechstens 30 % laenger); l = ihre Laenge. */
function rundeAchse(g: { rr: Punkt[]; aa: Punkt[][] }, mitte: number, oben: boolean, steg: number): { x: number; l: number } {
  const xs = g.rr.map((p) => p.x);
  const kandidaten: { x: number; l: number }[] = [];
  for (let x = Math.min(...xs) + steg / 2; x <= Math.max(...xs) - steg / 2 + 1e-9; x += 0.02) {
    const b = band(g, x, oben, steg);
    if (b && Number.isFinite(b.laengster)) kandidaten.push({ x, l: b.laengster });
  }
  if (!kandidaten.length) return { x: mitte, l: Infinity };
  const wand = Math.min(...kandidaten.map((c) => c.l));
  return kandidaten.filter((c) => c.l <= wand * 1.3 + 0.05).sort((c, d) => Math.abs(c.x - mitte) - Math.abs(d.x - mitte) || c.l - d.l)[0];
}
