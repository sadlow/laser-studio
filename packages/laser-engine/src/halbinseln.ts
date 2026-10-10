import type { Punkt } from "./clip";
import { flaecheMm2, rechteck, ringeInMm, saeubere, schliesse, schneide, teile, vereinige, versatz, ziehAb, zuFlaeche, type Flaeche } from "./geometrie";
import { ringeMitPunzen } from "./punzen";
import { abtasten, probenAbstand, querungen } from "./querung";

/**
 * So breit muss ein Anschluss sein, damit eine Materialflaeche allein an ihm haengen darf. Das & der Bacalisties hing
 * mit seinem oberen Bogen an einem Hals von 0,9 mm (A5) und brach beim Herausdruecken weg (Musterstueck 10.10.2026);
 * eine Punze haelt an zwei Stegen von 0,7 mm. Ein einzelner Hals traegt nicht nur, er muss auch das Hebeln abfangen –
 * deshalb rund drei Stegbreiten. Ein Hals ab Stegbreite zaehlt wie ein Steg.
 */
export const ANSCHLUSS_MM = 2;
// Kleinere Flaechen sind Rechenreste an Innenecken, keine Halbinseln.
const MIN_FLAECHE_MM2 = 0.5;
// Ein Steg muss ueberwiegend durch Schrift laufen – sonst laeuft er durch den Hals, also durch Material.
const TINTE_ANTEIL = 0.6;

export interface HalbinselStege {
  stege: Flaeche;
  anzahl: number;
  /** Halbinseln, die Stege brauchten. */
  halbinseln: number;
  /** Halbinseln, fuer die kein Steg gefunden wurde. */
  ohneSteg: number;
}

/**
 * Stege fuer Halbinseln: Material, das keine Punze ist, weil die Schrift sich nicht ganz schliesst, aber nur an
 * schmalen Haelsen am Rest der Platte haengt. Gefunden wird es mit einem Schliessen der Schrift um ANSCHLUSS_MM / 2:
 * jeder schmalere Hals wird dabei zu Schrift, die Halbinsel zum Loch.
 * - Alle Haelse schmaler als ein Steg (das Loch bleibt auch beim Schliessen um Stegbreite): zwei Stege wie eine Punze.
 * - Genau ein Hals von Stegbreite bis ANSCHLUSS_MM: er zaehlt als ein Steg, der zweite kommt gegenueber dazu.
 * - Zwei Haelse ab Stegbreite: haelt wie eine Punze an zwei Stegen, nichts zu tun.
 */
export function stegeHalbinseln(ink: Flaeche, stegMm: number): HalbinselStege {
  const ergebnis: HalbinselStege = { stege: [], anzahl: 0, halbinseln: 0, ohneSteg: 0 };
  if (!ink.length) return ergebnis;
  // Auf 5 µm ausgeduennt: die Schrift kommt mit zehntausend Punkten, das Schliessen dauerte so fast eine Sekunde.
  const grob = saeubere(ink, 0.005);
  const punzen = lochFlaeche(grob);
  const gross = schliesse(grob, ANSCHLUSS_MM / 2);
  const kandidaten = ringeMitPunzen(gross);
  const neu = kandidaten.punzen.filter((nr) => {
    const h = alsLoch(kandidaten.ringe[nr]);
    const a = flaecheMm2(h);
    return a >= MIN_FLAECHE_MM2 && flaecheMm2(schneide(h, punzen)) < 0.5 * a;
  });
  if (!neu.length) return ergebnis;

  const duenn = ziehAb(lochFlaeche(schliesse(grob, stegMm / 2)), punzen);
  const stege: Flaeche[] = [];
  for (const nr of neu) {
    const r = kandidaten.ringe[nr];
    const h = alsLoch(r);
    const a = flaecheMm2(h);
    // Gerechnet wird nur um die Halbinsel herum – die ganze Zeile kostete Sekunden je Titel.
    const umgebung = (mm: number) => {
      const xs = r.map((p) => p.x);
      const ys = r.map((p) => p.y);
      const x0 = Math.min(...xs) - mm;
      const y0 = Math.min(...ys) - mm;
      return rechteck(x0, y0, Math.max(...xs) + mm - x0, Math.max(...ys) + mm - y0);
    };
    const tinte = schneide(grob, umgebung(4));
    let soll = 2;
    // Wo der Hals an der Halbinsel ansetzt: die Probe naechst seiner Muendung ins uebrige Material.
    let halsBei: Punkt | null = null;
    if (flaecheMm2(schneide(h, duenn)) < 0.5 * a) {
      // Haelse: Fuellstuecke, die an die Halbinsel und an anderes Material grenzen.
      const grossNah = schneide(gross, umgebung(4));
      const fuellung = teile(ziehAb(schneide(gross, umgebung(3)), tinte), 0.0001).map((s) => zuFlaeche([s.aussen, ...s.loecher]));
      const muendungen = fuellung.flatMap((f) => {
        const frei = ziehAb(versatz(f, 0.03), grossNah);
        const andere = ziehAb(frei, h);
        return flaecheMm2(schneide(frei, h)) > 0.0005 && flaecheMm2(andere) > 0.0005 ? [andere] : [];
      });
      if (muendungen.length !== 1) continue;
      soll = 1;
      const p = ringeInMm(muendungen[0]).flat();
      halsBei = { x: p.reduce((s, q) => s + q.x, 0) / p.length, y: p.reduce((s, q) => s + q.y, 0) / p.length };
    }
    ergebnis.halbinseln++;
    const { kandidaten: k, n } = querungen(r, nr, kandidaten.ringe, stegMm);
    const proben = abtasten(r);
    const hals = halsBei ? naechste(proben, halsBei) : -1;
    const durchSchrift = (q: (typeof k)[number]) => {
      const s = zuFlaeche([q.ecken]);
      return flaecheMm2(schneide(s, tinte)) >= TINTE_ANTEIL * Math.abs(flaecheMm2(s));
    };
    // Ein Steg gegenueber dem Hals; zwei wie bei einer Punze, ein Drittel des Umfangs auseinander.
    const gewaehlt: typeof k = [];
    for (const q of k) {
      if (gewaehlt.length >= soll) break;
      if (hals >= 0 && probenAbstand(q.i, hals, n) < n / 3) continue;
      if (gewaehlt.every((g) => probenAbstand(g.i, q.i, n) >= n / 3) && durchSchrift(q)) gewaehlt.push(q);
    }
    if (!gewaehlt.length) ergebnis.ohneSteg++;
    for (const g of gewaehlt) stege.push(zuFlaeche([g.ecken]));
  }
  ergebnis.stege = vereinige(...stege);
  ergebnis.anzahl = stege.length;
  return ergebnis;
}

/** Ring eines Lochs als positive Flaeche. */
function alsLoch(r: Punkt[]): Flaeche {
  const f = zuFlaeche([r]);
  return flaecheMm2(f) < 0 ? zuFlaeche([r.slice().reverse()]) : f;
}

/** Alle Punzen einer Flaeche als positive Flaeche. */
function lochFlaeche(fl: Flaeche): Flaeche {
  const loecher = teile(fl, 0).flatMap((t) => t.loecher);
  return loecher.length ? vereinige(...loecher.map(alsLoch)) : [];
}

/** Nummer der Probe, die p am naechsten liegt. */
function naechste(proben: Punkt[], p: Punkt): number {
  let beste = 0;
  proben.forEach((q, i) => {
    if (Math.hypot(q.x - p.x, q.y - p.y) < Math.hypot(proben[beste].x - p.x, proben[beste].y - p.y)) beste = i;
  });
  return beste;
}
