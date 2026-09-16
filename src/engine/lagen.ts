import { clipPolyline, type Punkt } from "./clip";
import {
  ausTeilen,
  enthaelt,
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

export interface Lagengeometrie {
  herz: Teil[];
  weiss: Teil[];
  /** Index der Teile, die NICHT am Hauptteil haengen. */
  weissLose: { imNetz: number; imText: number };
  schwarz: Teil[];
  gravur: { linien: Punkt[][]; breiteMm: number }[];
  blau: Teil[];
  stencil: { anzahl: number; ohneSteg: number; zugefuellt: number };
  wasserFlaechen: number;
  netz: { weissAnteilFenster: number; loecherZugefuellt: number; anMindestbreite: string[]; faktor: number };
}

// Unterhalb dieser Flaeche ist es ein Rechenrest, kein Acrylteil.
const SPLITTER_MM2 = 0.3;

export function baueLagen(k: Schichtkarte, layout: Layout, roh: KartenRohdaten, text: Textblock): Lagengeometrie {
  const { platte, kartenfenster: f } = layout;
  const plattenFl = rechteck(0, 0, platte.breiteMm, platte.hoeheMm);
  const fensterFl = rechteck(f.xMm, f.yMm, f.breiteMm, f.hoeheMm);
  // Weisse Schutzkontur um Texte in der Karte (eingebettetes Layout, sonst leer).
  const schutz = schneide(text.schutz, fensterFl);

  // --- Strassen: Netz (weisser Acrylstreifen) oder Gravur (heller Strich auf Schwarz).
  // Die Breiten gelten fuer A4 und wachsen mit dem Format – sonst saehe A3 filigran
  // und A5 klobig aus, obwohl beide denselben Ausschnitt zeigen.
  const faktor = f.breiteMm / REFERENZ_KARTENBREITE_MM;
  const netzTeile: Flaeche[] = [];
  const gravur: Lagengeometrie["gravur"] = [];
  const anMindestbreite: string[] = [];
  for (const gruppe of k.strassen) {
    if (gruppe.ziel === "aus") continue;
    const linien = gruppe.klassen.flatMap((kl) => roh.strassen.get(kl) ?? []);
    if (!linien.length) continue;
    if (gruppe.ziel === "netz") {
      const skaliert = gruppe.breiteMm * faktor;
      if (skaliert < k.netzMinBreiteMm) anMindestbreite.push(gruppe.titel);
      netzTeile.push(puffereLinien(linien, Math.max(k.netzMinBreiteMm, skaliert)));
    } else {
      const exakt = linien.flatMap((l) =>
        clipPolyline(l, f.xMm, f.yMm, f.xMm + f.breiteMm, f.yMm + f.hoeheMm),
      );
      // Unter der Schutzkontur sieht man die Gravur nicht – in den ausgeschnittenen
      // Buchstaben aber schon, als helle Striche im Schwarz. Darum dort weg.
      gravur.push({
        linien: ziehLinienAb(exakt, schutz),
        breiteMm: Math.max(0.15, gruppe.breiteMm * faktor),
      });
    }
  }
  const netz = vereinige(schneide(vereinige(...netzTeile), fensterFl), schutz);

  // Kleine Bloecke zwischen den Strassen bleiben weiss. Beim Schneiden fiele
  // dort ein Splitter heraus, der haengen bleibt oder verbrennt – dieselbe
  // Ueberlegung wie bei den zugefuellten Innenflaechen im Text. Die Schutzkontur
  // zaehlt mit: ein schmaler Rest zwischen ihr und einer Strasse ist genauso einer.
  const kleineBloecke = teile(ziehAb(fensterFl, netz), SPLITTER_MM2).filter(
    (b) => b.flaecheMm2 < k.netzMinLochMm2,
  );
  const weissImFenster = kleineBloecke.length ? vereinige(netz, ausTeilen(kleineBloecke)) : netz;
  // Dichte des Netzes ohne die Textflaechen – die sagen nichts ueber "zu dicht".
  const ohneSchutz = ziehAb(fensterFl, schutz);
  const weissAnteilFenster = flaecheMm2(schneide(weissImFenster, ohneSchutz)) / Math.max(1, flaecheMm2(ohneSchutz));

  // --- Weiss: alles ausserhalb des Fensters bleibt stehen, im Fenster Netz und
  // Schutzkonturen. Die Woerter werden ausgeschnitten, Innenflaechen an Stegen.
  const weissBasis = vereinige(ziehAb(plattenFl, fensterFl), weissImFenster);

  // Stege je Zeile, damit die Strahlen einer Zeile nie an einer anderen enden.
  const ausschnitte: Flaeche[] = [];
  const st = { anzahl: 0, ohneSteg: 0, zugefuelltAnzahl: 0 };
  for (const zeile of text.zeilen) {
    const z = stencilStege(zeile.flaeche, k.stegMm, k.stencilMinInselBreiteMm);
    ausschnitte.push(ziehAb(vereinige(zeile.flaeche, z.zugefuellt), z.stege));
    st.anzahl += z.anzahl;
    st.ohneSteg += z.ohneSteg;
    st.zugefuelltAnzahl += z.zugefuelltAnzahl;
  }
  const weiss = teile(ziehAb(weissBasis, vereinige(...ausschnitte)), SPLITTER_MM2);

  // Das groesste Teil ist Rahmen + Netz + Textflaeche. Alles andere ist lose.
  let imNetz = 0;
  let imText = 0;
  for (const t of weiss.slice(1)) {
    if (enthaelt(text.textBereich, schwerpunkt(t))) imText++;
    else imNetz++;
  }

  // --- Schwarz: durchgehend, nur das Wasser wird geschnitten.
  let wasser: Flaeche = [];
  let wasserFlaechen = 0;
  if (k.wasser) {
    const roheFlaeche = vereinige(
      zuFlaeche(roh.wasserFlaechen),
      k.wasserlaeufe ? puffereLinien(roh.wasserlaeufe, k.wasserlaufBreiteMm) : [],
    );
    // Ein Teich von 3 mm2 ist ein Loch, das niemand bemerkt, aber jemand
    // sauber machen muss. Unter der Grenze bleibt das Schwarz geschlossen.
    // Unter einer Schutzkontur ebenso: dort ist es unsichtbar, und die weisse
    // Flaeche braucht darunter Schwarz zum Aufkleben.
    const behalten = teile(ziehAb(schneide(roheFlaeche, fensterFl), schutz), SPLITTER_MM2).filter(
      (t) => t.flaecheMm2 >= k.wasserMinFlaecheMm2,
    );
    wasserFlaechen = behalten.length;
    wasser = ausTeilen(behalten);
  }
  const schwarz = teile(ziehAb(plattenFl, wasser), SPLITTER_MM2);

  // --- Herz: Mitte auf dem Ort, der Ort ist die Mitte des Ausschnitts. Die
  // Groesse gilt fuer A4 und waechst mit – fest 11 mm waere auf A5 riesig.
  const herz = teile(
    zuFlaeche([herzRing(f.xMm + f.breiteMm / 2, f.yMm + f.hoeheMm / 2, k.herzBreiteMm * faktor)]),
  );

  return {
    herz,
    weiss,
    weissLose: { imNetz, imText },
    schwarz,
    gravur,
    blau: teile(plattenFl),
    stencil: { anzahl: st.anzahl, ohneSteg: st.ohneSteg, zugefuellt: st.zugefuelltAnzahl },
    wasserFlaechen,
    netz: { weissAnteilFenster, loecherZugefuellt: kleineBloecke.length, anMindestbreite, faktor },
  };
}

function schwerpunkt(t: Teil): Punkt {
  let x = 0;
  let y = 0;
  for (const p of t.aussen) {
    x += p.x;
    y += p.y;
  }
  return { x: x / t.aussen.length, y: y / t.aussen.length };
}
