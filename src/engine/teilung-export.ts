import type { Punkt } from "./clip";
import { ausTeilen, schneide, teile, ziehLinienAb, type Flaeche } from "./geometrie";
import { bogenSvg } from "./produktion";
import { haelften } from "./teilung";
import type { GravurExport, Lage, Teil, Zone } from "./typen";
import type { NahtRichtung } from "./typen-teilung";

export interface Plattenhaelfte {
  haelfte: "A" | "B";
  /** Wo die Haelfte in der Karte liegt, fuer die Uebersicht ("oben", "links" …). */
  ort: string;
  /** Die Lage, beschnitten und so gedreht, wie sie auf der Rohplatte liegt: Kartenkanten auf den Plattenkanten. */
  lage: Lage;
  laserSvg: string;
}

/**
 * Eine Lage an der Naht in zwei Rohplatten. Jede Haelfte wird nur gedreht, nie gespiegelt – die Oberseite (Frost,
 * Gravur) bleibt oben. Sie liegt mit ihren Kartenkanten auf den Plattenkanten, die Naht 2 mm und mehr vor der
 * gegenueberliegenden Kante; geschnitten werden nur die Naht und das Innere (bogenSvg mit offenen Kanten).
 */
export function teileLage(
  lage: Lage,
  platte: Zone,
  naht: { richtung: NahtRichtung; posMm: number },
  rohplatte: { breiteMm: number; hoeheMm: number },
  gravurExport: GravurExport,
  info: { titel: string; beschreibung: string },
): Plattenhaelfte[] {
  const { a, b } = haelften(platte, naht.richtung, naht.posMm);
  const material = ausTeilen(lage.teile);
  const kleber = ausTeilen(lage.klebeflaeche);
  const ou = naht.richtung === "oben-unten";
  const { breiteMm: B, hoeheMm: H } = platte;
  const t = naht.posMm;

  return (["A", "B"] as const).map((haelfte) => {
    const rect = haelfte === "A" ? a : b;
    const dreh = drehung(ou, haelfte, B, H);
    const neu: Lage = {
      ...lage,
      teile: teile(schneide(material, rect)).map((s) => dreheTeil(s, dreh)),
      gravur: lage.gravur.map((g) => ({ ...g, linien: ziehLinienAb(g.linien, rect, true).map((l) => l.map(dreh)) })),
      klebeflaeche: klebeflaecheIn(kleber, rect).map((s) => dreheTeil(s, dreh)),
      laserSvg: "",
    };
    const ort = ou ? (haelfte === "A" ? "oben" : "unten") : haelfte === "A" ? "links" : "rechts";
    const masse = ou ? `${B} x ${haelfte === "A" ? t : H - t}` : `${H} x ${haelfte === "A" ? t : B - t}`;
    const svg = bogenSvg(rohplatte, [{ lage: neu, dx: 0, dy: 0 }], {
      titel: `${info.titel} – Haelfte ${haelfte} (${ort})`,
      beschreibung: `${info.beschreibung}; Haelfte ${haelfte} = ${ort}, ${masse} mm, Naht bei ${t} mm ${naht.richtung}; ` +
        `Kartenkanten = Plattenkanten, dort kein Schnitt`,
    }, gravurExport, true);
    return { haelfte, ort, lage: neu, laserSvg: svg };
  });
}

function klebeflaecheIn(kleber: Flaeche, rect: Flaeche): Teil[] {
  return kleber.length ? teile(schneide(kleber, rect), 0.01) : [];
}

/**
 * Karte -> Rohplatte. Oben-unten: A bleibt, B dreht um 180°, damit auch seine Kartenkante an der Plattenkante y = 0
 * liegt. Links-rechts: A um 90° gegen, B um 90° mit dem Uhrzeigersinn – die lange Seite auf die Plattenbreite.
 */
export function drehung(ou: boolean, haelfte: "A" | "B", B: number, H: number): (p: Punkt) => Punkt {
  if (ou) return haelfte === "A" ? (p) => ({ x: p.x, y: p.y }) : (p) => ({ x: B - p.x, y: H - p.y });
  return haelfte === "A" ? (p) => ({ x: H - p.y, y: p.x }) : (p) => ({ x: p.y, y: B - p.x });
}

function dreheTeil(t: Teil, d: (p: Punkt) => Punkt): Teil {
  return { ...t, aussen: t.aussen.map(d), loecher: t.loecher.map((r) => r.map(d)) };
}
