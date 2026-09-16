import { clipPolyline, type Punkt } from "./clip";
import type { NetzAuswahl } from "./dichte";
import { ausTeilen, flaecheMm2, puffereLinien, rechteck, schneide, teile, vereinige, ziehAb, ziehLinienAb, type Flaeche } from "./geometrie";
import type { KartenRohdaten } from "./kacheln";
import { BRUECKE_RAND_MM, type BrueckenLinien } from "./bruecken";
import { REFERENZ_KARTENBREITE_MM, type Layout, type Schichtkarte } from "./typen";
import { SPLITTER_MM2 } from "./wasser";

// Strichbreite (bei A4), mit der Netzstrassen graviert werden, die nicht
// geschnitten werden koennen – so breit wie frueher die gravierten Wohnstrassen.
const GRAVUR_HERABGESTUFT_MM = 0.45;

export interface Netz {
  /** Strassen samt zugefuellter Kleinbloecke, ohne lose Stuecke, im Fenster. */
  netz: Flaeche;
  gravur: { linien: Punkt[][]; breiteMm: number }[];
  /** Brueckenstuecke je Lage – gravierte traegt ueber Wasser der Hintergrund (bruecken.ts). */
  bruecken: { graviert: BrueckenLinien[]; netz: BrueckenLinien[] };
  kleineBloecke: number;
  /** Lose Stuecke, die statt geschnitten graviert werden. */
  loseZurGravur: number;
  /** Ihr Anteil an der Netzflaeche im Fenster. */
  loseAnteil: number;
}

/**
 * Puffert die gewaehlten Netzklassen, alle anderen gehen in die Gravur. Die Brueckenstuecke
 * gehen je nach Lage ihres Wegs mit – was davon ueber Wasser steht, entscheidet bruecken.ts.
 *
 * Gravierte Bruecken nur fuer Strassen und Gleise. Fuss- und Radwege, Fussgaengerzonen,
 * Zufahrten und Feldwege nicht: in diesen Klassen stecken Stege, Anleger und Pontons – in
 * Hamburg wurden die Bootsanleger zu schwarzen Kaemmen im Hafenbecken.
 */
export function baueNetz(k: Schichtkarte, roh: KartenRohdaten, layout: Layout, schutz: Flaeche, auswahl: NetzAuswahl, symbolLoch: Flaeche = []): Netz {
  const { platte, kartenfenster: f } = layout;
  const fensterFl = rechteck(f.xMm, f.yMm, f.breiteMm, f.hoeheMm);
  const imFenster = (linien: Punkt[][]) =>
    linien.flatMap((l) => clipPolyline(l, f.xMm, f.yMm, f.xMm + f.breiteMm, f.yMm + f.hoeheMm));
  const massstab = f.breiteMm / REFERENZ_KARTENBREITE_MM;
  const strichHerabgestuft = Math.max(0.15, GRAVUR_HERABGESTUFT_MM * massstab * auswahl.dichtefaktor);
  const brueckeFuer = (strich: number) => Math.max(k.netzMinBreiteMm, strich + 2 * BRUECKE_RAND_MM);
  const netzTeile: Flaeche[] = [];
  const netzLinien: Punkt[][] = [];
  const gravur: Netz["gravur"] = [];
  const netzBruecken: BrueckenLinien[] = [];
  const gravurBruecken: BrueckenLinien[] = [];
  for (const gruppe of k.strassen) {
    if (gruppe.ziel === "aus") continue;
    const linien = gruppe.klassen.flatMap((kl) => roh.strassen.get(kl) ?? []);
    if (!linien.length) continue;
    const bruecken = gruppe.klassen.flatMap((kl) => roh.bruecken.get(kl) ?? []);
    const breite = auswahl.breiten.get(gruppe.id);
    if (breite !== undefined) {
      netzTeile.push(puffereLinien(linien, breite));
      netzLinien.push(...linien);
      if (bruecken.length) netzBruecken.push({ linien: bruecken, breiteMm: breite });
      continue;
    }
    const strich = gruppe.ziel === "netz" ? strichHerabgestuft : Math.max(0.15, gruppe.breiteMm * massstab * auswahl.dichtefaktor);
    gravur.push({ linien: imFenster(linien), breiteMm: strich });
    const befahren = gruppe.ziel === "netz" || gruppe.klassen.some((kl) => kl.endsWith("_rail"));
    if (befahren && bruecken.length) gravurBruecken.push({ linien: bruecken, breiteMm: brueckeFuer(strich) });
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
  // Ihre Bruecken werden damit zu Bruecken gravierter Wege.
  const rahmen = ziehAb(rechteck(0, 0, platte.breiteMm, platte.hoeheMm), fensterFl);
  // Das Symbol-Loch zaehlt mit: was es vom Netz abtrennt, faellt sonst lose heraus.
  const [, ...lose] = teile(ziehAb(vereinige(rahmen, mitBloecken, schutz), symbolLoch), SPLITTER_MM2);
  const loseFl = lose.length ? ausTeilen(lose) : [];
  if (lose.length) {
    gravur.push({ linien: ziehLinienAb(imFenster(netzLinien), loseFl, true), breiteMm: strichHerabgestuft });
    const loseBruecken = netzBruecken.flatMap((b) => ziehLinienAb(b.linien, loseFl, true));
    if (loseBruecken.length) gravurBruecken.push({ linien: loseBruecken, breiteMm: brueckeFuer(strichHerabgestuft) });
  }
  return {
    netz: lose.length ? ziehAb(mitBloecken, loseFl) : mitBloecken,
    gravur,
    bruecken: { graviert: gravurBruecken, netz: netzBruecken.map((b) => ({ ...b, linien: ziehLinienAb(b.linien, loseFl) })) },
    kleineBloecke: kleineBloecke.length,
    loseZurGravur: lose.length,
    loseAnteil: lose.reduce((a, t) => a + t.flaecheMm2, 0) / Math.max(1, flaecheMm2(mitBloecken)),
  };
}
