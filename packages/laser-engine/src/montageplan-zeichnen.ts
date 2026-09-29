import type { Punkt } from "./clip";
import { ausTeilen, rechteck, ringeInMm, schneide, zuFlaeche, type Flaeche } from "./geometrie";
import type { Farbe, PdfSeite } from "./pdf";
import type { LagenTeilung, Zone } from "./typen";

export const ROT: Farbe = [0.85, 0.1, 0.12];
export const ORANGE: Farbe = [0.98, 0.55, 0.05];
export const GRAU: Farbe = [0.55, 0.55, 0.55];
export const MATERIAL: Farbe = [0.8, 0.8, 0.78];

/** Eine Stelle im Montageplan: E = Einzelteil, K = kritischer Uebergang. */
export interface Stelle {
  nr: string;
  xMm: number;
  yMm: number;
  /** Box des Einzelteils, zum Einfaerben im Detail. */
  box?: Zone;
  text: string;
}

export function stellenAus(l: LagenTeilung): Stelle[] {
  const n = l.gewaehlt;
  const entlang = (x: number, y: number) => Math.round(n.richtung === "oben-unten" ? x : y);
  const quer = n.richtung === "oben-unten" ? "von links" : "von oben";
  const e = l.stellen.einzelteile.map((t, i) => ({
    nr: `E${i + 1}`,
    xMm: t.xMm + t.breiteMm / 2,
    yMm: t.yMm + t.hoeheMm / 2,
    box: { xMm: t.xMm, yMm: t.yMm, breiteMm: t.breiteMm, hoeheMm: t.hoeheMm },
    text: `Einzelteil, Haelfte ${t.haelfte}, ${entlang(t.xMm + t.breiteMm / 2, t.yMm + t.hoeheMm / 2)} mm ${quer}, ` +
      `${f1(t.breiteMm)} x ${f1(t.hoeheMm)} mm, ${Math.round(t.flaecheMm2)} mm²`,
  }));
  const k = l.stellen.uebergaenge.filter((u) => u.kritisch).map((u, i) => ({
    nr: `K${i + 1}`,
    xMm: u.xMm,
    yMm: u.yMm,
    text: `Uebergang ${u.grund}, ${entlang(u.xMm, u.yMm)} mm ${quer}, Fuge ${f1(u.laengeMm)} mm`,
  }));
  return [...e, ...k];
}

/**
 * Zeichnet einen Kartenausschnitt (Karten-mm `fenster`) auf die Seite in `ziel`: Material grau, Naht rot gestrichelt,
 * Einzelteile orange, Stellen mit Nummer. Die Geometrie wird vorher auf das Fenster beschnitten – sonst traegt jedes
 * Detailbild das ganze Netz.
 */
export function zeichneAusschnitt(
  seite: PdfSeite,
  material: Flaeche,
  l: LagenTeilung,
  stellen: Stelle[],
  fenster: Zone,
  ziel: Zone,
  einzelteile: Flaeche,
) {
  const s = Math.min(ziel.breiteMm / fenster.breiteMm, ziel.hoeheMm / fenster.hoeheMm);
  const auf = (p: Punkt): Punkt => ({ x: ziel.xMm + (p.x - fenster.xMm) * s, y: ziel.yMm + (p.y - fenster.yMm) * s });
  const fr = rechteck(fenster.xMm, fenster.yMm, fenster.breiteMm, fenster.hoeheMm);
  const ringe = (fl: Flaeche) => ringeInMm(schneide(fl, fr)).map((r) => r.map(auf));

  seite.rechteck(ziel.xMm, ziel.yMm, fenster.breiteMm * s, fenster.hoeheMm * s, { fuellung: [1, 1, 1], linie: GRAU, breiteMm: 0.2 });
  seite.pfad(ringe(material), { fuellung: MATERIAL, linie: [0.35, 0.35, 0.35], breiteMm: 0.1 });
  if (einzelteile.length) seite.pfad(ringe(einzelteile), { fuellung: ORANGE, linie: [0.6, 0.3, 0], breiteMm: 0.15 });

  const n = l.gewaehlt;
  const [a, b] = n.richtung === "oben-unten"
    ? [{ x: fenster.xMm, y: n.posMm }, { x: fenster.xMm + fenster.breiteMm, y: n.posMm }]
    : [{ x: n.posMm, y: fenster.yMm }, { x: n.posMm, y: fenster.yMm + fenster.hoeheMm }];
  const innen = (p: Punkt) => p.x >= fenster.xMm - 0.01 && p.x <= fenster.xMm + fenster.breiteMm + 0.01 && p.y >= fenster.yMm - 0.01 && p.y <= fenster.yMm + fenster.hoeheMm + 0.01;
  if (innen(a) && innen(b)) seite.pfad([[auf(a), auf(b)]], { linie: ROT, breiteMm: 0.35, offen: true, strich: [2, 1.2] });

  for (const st of stellen) {
    const p = { x: st.xMm, y: st.yMm };
    if (!innen(p)) continue;
    const q = auf(p);
    const r = Math.max(2.2, Math.min(6, 3 * s));
    const farbe = st.nr.startsWith("E") ? ORANGE : ROT;
    seite.kreis(q.x, q.y, r, { linie: farbe, breiteMm: 0.4 });
    seite.text(q.x + r + 0.6, q.y - r * 0.3, 7, st.nr, true, farbe);
  }
}

/** Die Einzelteile als Flaeche, zum Einfaerben. */
export function einzelteilFlaeche(l: LagenTeilung): Flaeche {
  return zuFlaeche(l.stellen.einzelteile.map((t) => t.umriss));
}

export function materialVon(l: { teile: Parameters<typeof ausTeilen>[0] }): Flaeche {
  return ausTeilen(l.teile);
}

export function f1(n: number): string {
  return (Math.round(n * 10) / 10).toString().replace(".", ",");
}
