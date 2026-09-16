import { clipPolyline, type Punkt } from "./clip";
import {
  ausTeilen,
  flaecheMm2,
  puffereLinien,
  rechteck,
  schneide,
  teile,
  vereinige,
  ziehAb,
  ziehLinienAb,
  zuFlaeche,
  type Flaeche,
} from "./geometrie";
import { herzRing } from "./herz";
import type { KartenRohdaten } from "./kacheln";
import { stencilStege } from "./stencil";
import { REFERENZ_KARTENBREITE_MM, type Layout, type Schichtkarte, type Teil } from "./typen";
import type { Textblock } from "./zeilen";

/**
 * Die Formen, aus denen jeder Aufbau seine Lagen zusammensetzt. Welche Lage
 * was davon traegt, entscheidet stapel.ts: dasselbe Strassennetz ist im einen
 * Aufbau weisses Material, im anderen ein Loch im Schwarz.
 */
export interface Bausteine {
  plattenFl: Flaeche;
  fensterFl: Flaeche;
  /** Strassen der Netz-Klassen samt zugefuellter Kleinbloecke, im Fenster. */
  netz: Flaeche;
  /** Weisse Form um die Texte (Reiter oder Kontur), im Fenster. */
  schutz: Flaeche;
  /** Geschnittenes Wasser, ohne den Bereich unter den Texten. */
  wasser: Flaeche;
  /** Was aus der weissen Oberseite fuer die Buchstaben herausgeschnitten wird. */
  textAusschnitt: Flaeche;
  gravur: { linien: Punkt[][]; breiteMm: number }[];
  herz: Teil[];
  textBereich: Flaeche;
  kennzahlen: {
    netzAnteilFenster: number;
    netzLoecherZugefuellt: number;
    netzAnMindestbreite: string[];
    formatfaktor: number;
    stencilStege: number;
    punzenOhneSteg: number;
    inselnZugefuellt: number;
    wasserFlaechenGeschnitten: number;
  };
}

// Unterhalb dieser Flaeche ist es ein Rechenrest, kein Acrylteil.
export const SPLITTER_MM2 = 0.3;

export function baueBausteine(k: Schichtkarte, layout: Layout, roh: KartenRohdaten, text: Textblock): Bausteine {
  const { platte, kartenfenster: f } = layout;
  const plattenFl = rechteck(0, 0, platte.breiteMm, platte.hoeheMm);
  const fensterFl = rechteck(f.xMm, f.yMm, f.breiteMm, f.hoeheMm);
  const schutz = schneide(text.schutz, fensterFl);

  // --- Strassen. Breiten gelten fuer A4 und wachsen mit dem Format – sonst saehe
  // A3 filigran und A5 klobig aus, obwohl beide denselben Ausschnitt zeigen.
  const faktor = f.breiteMm / REFERENZ_KARTENBREITE_MM;
  const netzTeile: Flaeche[] = [];
  const gravurRoh: Bausteine["gravur"] = [];
  const netzAnMindestbreite: string[] = [];
  for (const gruppe of k.strassen) {
    if (gruppe.ziel === "aus") continue;
    const linien = gruppe.klassen.flatMap((kl) => roh.strassen.get(kl) ?? []);
    if (!linien.length) continue;
    if (gruppe.ziel === "netz") {
      const skaliert = gruppe.breiteMm * faktor;
      if (skaliert < k.netzMinBreiteMm) netzAnMindestbreite.push(gruppe.titel);
      netzTeile.push(puffereLinien(linien, Math.max(k.netzMinBreiteMm, skaliert)));
    } else {
      const exakt = linien.flatMap((l) => clipPolyline(l, f.xMm, f.yMm, f.xMm + f.breiteMm, f.yMm + f.hoeheMm));
      gravurRoh.push({ linien: exakt, breiteMm: Math.max(0.15, gruppe.breiteMm * faktor) });
    }
  }
  const strassen = schneide(vereinige(...netzTeile), fensterFl);

  // Kleine Bloecke zwischen Strassen und Texten loesen sich nicht sauber heraus.
  // Sie gehen im Netz auf – als Material, egal welche Farbe das Netz hat.
  const kleineBloecke = teile(ziehAb(fensterFl, vereinige(strassen, schutz)), SPLITTER_MM2).filter(
    (b) => b.flaecheMm2 < k.netzMinLochMm2,
  );
  const netz = kleineBloecke.length ? vereinige(strassen, ausTeilen(kleineBloecke)) : strassen;
  // Dichte ohne die Textflaechen – die sagen nichts ueber "zu dicht".
  const ohneSchutz = ziehAb(fensterFl, schutz);
  const netzAnteilFenster = flaecheMm2(schneide(netz, ohneSchutz)) / Math.max(1, flaecheMm2(ohneSchutz));

  // --- Text: ausgeschnitten, Innenflaechen an Stegen. Stege je Zeile, damit die
  // Strahlen einer Zeile nie an einer anderen enden.
  const ausschnitte: Flaeche[] = [];
  let [stege, ohneSteg, zugefuellt] = [0, 0, 0];
  for (const zeile of text.zeilen) {
    const z = stencilStege(zeile.flaeche, k.stegMm, k.stencilMinInselBreiteMm);
    ausschnitte.push(ziehAb(vereinige(zeile.flaeche, z.zugefuellt), z.stege));
    stege += z.anzahl;
    ohneSteg += z.ohneSteg;
    zugefuellt += z.zugefuelltAnzahl;
  }

  // --- Wasser. Unter den Texten nicht: dort unsichtbar, und die Deckflaeche
  // braucht darunter Material zum Aufkleben. Ein Teich von 3 mm2 ist ein Loch,
  // das niemand bemerkt, aber jemand sauber machen muss. Unter Bruecken wird
  // spaeter ebenfalls nicht geschnitten (stapel.ts).
  let wasser: Flaeche = [];
  let wasserFlaechen = 0;
  if (k.wasser) {
    const roheFlaeche = vereinige(
      zuFlaeche(roh.wasserFlaechen),
      k.wasserlaeufe ? puffereLinien(roh.wasserlaeufe, k.wasserlaufBreiteMm) : [],
    );
    const behalten = teile(ziehAb(schneide(roheFlaeche, fensterFl), schutz), SPLITTER_MM2).filter(
      (t) => t.flaecheMm2 >= k.wasserMinFlaecheMm2,
    );
    wasserFlaechen = behalten.length;
    wasser = ausTeilen(behalten);
  }

  // Gravur weder in den ausgeschnittenen Buchstaben (helle Striche im Schwarz)
  // noch ueber Wasser (dort ist kein Material, der Laser graviert Luft) noch
  // unter dem Netz (unsichtbar). Das Netz allein spart gemessen 31 % Gravurweg
  // bei 160 ms Rechenzeit – A4 Berlin: 15,0 m auf 10,4 m.
  const gravurAus = vereinige(schutz, wasser, netz);
  const gravur = gravurRoh.map((g) => ({ linien: ziehLinienAb(g.linien, gravurAus), breiteMm: g.breiteMm }));

  // --- Herz: Mitte auf dem Ort, Groesse fuer A4 und mitwachsend.
  const herz = teile(zuFlaeche([herzRing(f.xMm + f.breiteMm / 2, f.yMm + f.hoeheMm / 2, k.herzBreiteMm * faktor)]));

  return {
    plattenFl,
    fensterFl,
    netz,
    schutz,
    wasser,
    textAusschnitt: vereinige(...ausschnitte),
    gravur,
    herz,
    textBereich: text.textBereich,
    kennzahlen: {
      netzAnteilFenster,
      netzLoecherZugefuellt: kleineBloecke.length,
      netzAnMindestbreite,
      formatfaktor: faktor,
      stencilStege: stege,
      punzenOhneSteg: ohneSteg,
      inselnZugefuellt: zugefuellt,
      wasserFlaechenGeschnitten: wasserFlaechen,
    },
  };
}
