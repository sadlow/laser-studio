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
  zuFlaeche,
  type Flaeche,
} from "./geometrie";
import { herzRing } from "./herz";
import type { KartenRohdaten } from "./kacheln";
import { stencilStege } from "./stencil";
import { REFERENZ_KARTENBREITE_MM, type Layout, type Schichtkarte, type Teil } from "./typen";

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

export function baueLagen(
  k: Schichtkarte,
  layout: Layout,
  roh: KartenRohdaten,
  textzeilen: { name: string; flaeche: Flaeche; versalhoeheMm: number }[],
): Lagengeometrie {
  const { platte, kartenfenster: f } = layout;
  const plattenFl = rechteck(0, 0, platte.breiteMm, platte.hoeheMm);
  const fensterFl = rechteck(f.xMm, f.yMm, f.breiteMm, f.hoeheMm);

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
      gravur.push({ linien: exakt, breiteMm: Math.max(0.15, gruppe.breiteMm * faktor) });
    }
  }
  let netz = schneide(vereinige(...netzTeile), fensterFl);

  // Kleine Bloecke zwischen den Strassen bleiben weiss. Beim Schneiden fiele
  // dort ein Splitter heraus, der haengen bleibt oder verbrennt – dieselbe
  // Ueberlegung wie bei den zugefuellten Innenflaechen im Text.
  const kleineBloecke = teile(ziehAb(fensterFl, netz), SPLITTER_MM2).filter(
    (b) => b.flaecheMm2 < k.netzMinLochMm2,
  );
  if (kleineBloecke.length) netz = vereinige(netz, ausTeilen(kleineBloecke));
  const weissAnteilFenster = flaecheMm2(netz) / (f.breiteMm * f.hoeheMm);

  // --- Weiss: alles ausserhalb des Fensters bleibt stehen, im Fenster nur das Netz.
  // Die Woerter werden ausgeschnitten, ihre Innenflaechen haengen an Stegen.
  const weissBasis = vereinige(ziehAb(plattenFl, fensterFl), netz);

  // Stege je Zeile: ob eine Innenflaeche zu klein fuer einen Steg ist, haengt
  // an der Schriftgroesse. Eine feste mm2-Grenze fuellte bei A5 die Punzen der
  // A zu und liess bei A3 das Gradzeichen wieder in zwei Halbmonde zerfallen.
  const ausschnitte: Flaeche[] = [];
  const st = { anzahl: 0, ohneSteg: 0, zugefuelltAnzahl: 0 };
  for (const zeile of textzeilen) {
    const minInsel = k.stencilMinInselAnteil * zeile.versalhoeheMm * zeile.versalhoeheMm;
    const z = stencilStege(zeile.flaeche, k.stegMm, minInsel);
    ausschnitte.push(ziehAb(vereinige(zeile.flaeche, z.zugefuellt), z.stege));
    st.anzahl += z.anzahl;
    st.ohneSteg += z.ohneSteg;
    st.zugefuelltAnzahl += z.zugefuelltAnzahl;
  }
  const weiss = teile(ziehAb(weissBasis, vereinige(...ausschnitte)), SPLITTER_MM2);

  // Das groesste Teil ist Rahmen + Netz + Textflaeche. Alles andere ist lose.
  const unterkanteFenster = f.yMm + f.hoeheMm;
  let imNetz = 0;
  let imText = 0;
  for (const t of weiss.slice(1)) {
    if (schwerpunktY(t) < unterkanteFenster) imNetz++;
    else imText++;
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
    const behalten = teile(schneide(roheFlaeche, fensterFl), SPLITTER_MM2).filter(
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

function schwerpunktY(t: Teil): number {
  let summe = 0;
  for (const p of t.aussen) summe += p.y;
  return summe / t.aussen.length;
}
