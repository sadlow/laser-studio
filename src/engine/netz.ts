import { clipPolyline, type Punkt } from "./clip";
import type { NetzAuswahl } from "./dichte";
import { ausTeilen, flaecheMm2, puffereLinien, rechteck, schneide, teile, vereinige, ziehAb, ziehLinienAb, type Flaeche } from "./geometrie";
import type { KartenRohdaten } from "./kacheln";
import { REFERENZ_KARTENBREITE_MM, type Layout, type Schichtkarte } from "./typen";
import { SPLITTER_MM2 } from "./wasser";

// Strichbreite (bei A4), mit der Netzstrassen graviert werden, die nicht
// geschnitten werden koennen – so breit wie frueher die gravierten Wohnstrassen.
const GRAVUR_HERABGESTUFT_MM = 0.45;

export interface Netz {
  /** Strassen samt zugefuellter Kleinbloecke, ohne lose Stuecke, im Fenster. */
  netz: Flaeche;
  gravur: { linien: Punkt[][]; breiteMm: number }[];
  kleineBloecke: number;
  /** Lose Stuecke, die statt geschnitten graviert werden. */
  loseZurGravur: number;
  /** Ihr Anteil an der Netzflaeche im Fenster. */
  loseAnteil: number;
}

/**
 * Puffert die gewaehlten Netzklassen, alle anderen gehen in die Gravur.
 *
 * Bruecken ueber Wasser bleiben geschnitten, auch wenn ihre Klasse gerade graviert wird
 * (Marcel 17.09.2026: bei "wenig geschnitten" verschwanden in Koeln die Rheinbruecken).
 * Gravur ueber Wasser gibt es nicht – die Bahn als Gravurklasse hatte ueber dem Rhein
 * schlicht keinen Strich mehr. Gilt fuer Netzklassen, nicht fuer Fusswege.
 */
export function baueNetz(k: Schichtkarte, roh: KartenRohdaten, layout: Layout, schutz: Flaeche, auswahl: NetzAuswahl, symbolLoch: Flaeche = [], wasser: Flaeche = []): Netz {
  const { platte, kartenfenster: f } = layout;
  const fensterFl = rechteck(f.xMm, f.yMm, f.breiteMm, f.hoeheMm);
  const imFenster = (linien: Punkt[][]) =>
    linien.flatMap((l) => clipPolyline(l, f.xMm, f.yMm, f.xMm + f.breiteMm, f.yMm + f.hoeheMm));
  const strichHerabgestuft = Math.max(0.15, GRAVUR_HERABGESTUFT_MM * (f.breiteMm / REFERENZ_KARTENBREITE_MM) * auswahl.dichtefaktor);
  const netzTeile: Flaeche[] = [];
  const netzLinien: Punkt[][] = [];
  const gravur: Netz["gravur"] = [];
  for (const gruppe of k.strassen) {
    if (gruppe.ziel === "aus") continue;
    const linien = gruppe.klassen.flatMap((kl) => roh.strassen.get(kl) ?? []);
    if (!linien.length) continue;
    const breite = auswahl.breiten.get(gruppe.id);
    if (breite !== undefined) {
      netzTeile.push(puffereLinien(linien, breite));
      netzLinien.push(...linien);
      continue;
    }
    const bruecken = gruppe.ziel === "netz" && wasser.length
      ? gruppe.klassen.flatMap((kl) => roh.bruecken.get(kl) ?? []).filter((l) => ziehLinienAb([l], wasser, true).length > 0)
      : [];
    if (bruecken.length) {
      netzTeile.push(puffereLinien(bruecken, Math.max(k.netzMinBreiteMm, gruppe.breiteMm * (f.breiteMm / REFERENZ_KARTENBREITE_MM) * auswahl.dichtefaktor)));
      netzLinien.push(...bruecken);
    }
    const strich = gruppe.ziel === "netz"
      ? strichHerabgestuft
      : Math.max(0.15, gruppe.breiteMm * (f.breiteMm / REFERENZ_KARTENBREITE_MM) * auswahl.dichtefaktor);
    gravur.push({ linien: imFenster(linien), breiteMm: strich });
  }
  const strassen = schneide(vereinige(...netzTeile), fensterFl);

  // Kleine Bloecke zwischen Strassen und Texten loesen sich nicht sauber heraus.
  // Sie gehen im Netz auf – als Material, egal welche Farbe das Netz hat.
  const kleineBloecke = teile(ziehAb(fensterFl, vereinige(strassen, schutz)), SPLITTER_MM2).filter(
    (b) => b.flaecheMm2 < k.netzMinLochMm2,
  );
  const mitBloecken = ziehAb(kleineBloecke.length ? vereinige(strassen, ausTeilen(kleineBloecke)) : strassen, symbolLoch);

  // Lose Stuecke haengen nirgends am Netz (meist nur ueber einen gravierten Weg,
  // eine Treppe oder einen Tunnel) und fielen beim Schneiden heraus. Sie werden
  // graviert statt geschnitten – "meist nur Artefakte" (Marcel 16.09.2026).
  const rahmen = ziehAb(rechteck(0, 0, platte.breiteMm, platte.hoeheMm), fensterFl);
  // Das Symbol-Loch zaehlt mit: was es vom Netz abtrennt, faellt sonst lose heraus.
  const [, ...lose] = teile(ziehAb(vereinige(rahmen, mitBloecken, schutz), symbolLoch), SPLITTER_MM2);
  if (!lose.length) return { netz: mitBloecken, gravur, kleineBloecke: kleineBloecke.length, loseZurGravur: 0, loseAnteil: 0 };

  const loseFl = ausTeilen(lose);
  gravur.push({ linien: ziehLinienAb(imFenster(netzLinien), loseFl, true), breiteMm: strichHerabgestuft });
  return {
    netz: ziehAb(mitBloecken, loseFl),
    gravur,
    kleineBloecke: kleineBloecke.length,
    loseZurGravur: lose.length,
    loseAnteil: lose.reduce((a, t) => a + t.flaecheMm2, 0) / Math.max(1, flaecheMm2(mitBloecken)),
  };
}
