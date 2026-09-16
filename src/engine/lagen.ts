import type { Punkt } from "./clip";
import { laengenImFenster, waehleNetz } from "./dichte";
import { baueNetz } from "./netz";
import {
  flaecheMm2,
  ohneLoecher,
  rechteck,
  ringeInMm,
  schneide,
  teile,
  vereinige,
  versatz,
  ziehAb,
  ziehLinienAb,
  zuFlaeche,
  type Flaeche,
} from "./geometrie";
import { symbolEinpassen } from "./symbole";
import { ortZuMm } from "./geo";
import type { KartenRohdaten } from "./kacheln";
import { stencilStege } from "./stencil";
import {
  REFERENZ_KARTENBREITE_MM,
  type Kennzahlen,
  type Layout,
  type Schichtkarte,
  type SchichtkartenErgebnis,
  type Teil,
} from "./typen";
import { kleineInselnFluten, wasserImFenster } from "./wasser";
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
  symbol: Teil[];
  symbolLage: SchichtkartenErgebnis["symbol"];
  /** Aussenkontur des Symbols – in den Lagen ueber dem Hintergrund ausgeschnitten. */
  symbolLoch: Flaeche;
  textBereich: Flaeche;
  kennzahlen: Omit<Kennzahlen, "zoomEntsprechung" | "loseNetzstuecke" | "loseTextteile" | "hintergrundTeile" | "rechenzeitMs" | "symbolUeberNetzMm" | "randImRahmenMm" | "gravurWegM" | "gravurFlaecheMm2">;
}

// Liegt nach dem Nachruecken mehr Netzflaeche lose, bleiben die Wege ganz
// Gravur – sonst waere das Netz ein Flickenteppich aus geschnittenen und
// gravierten Gassen. Gemessen: Allgaeu 1,1-1,4 %, Venedig bei 2 km 78 %.
const NACHRUECKEN_MAX_LOSE_ANTEIL = 0.1;

// Klebemarke fuer das Symbol auf dem Hintergrund.
const MARKE_EINZUG_MM = 0.3;
const MARKE_BREITE_MM = 0.25;

export function baueBausteine(k: Schichtkarte, layout: Layout, roh: KartenRohdaten, text: Textblock): Bausteine {
  const { platte, kartenfenster: f } = layout;
  const plattenFl = rechteck(0, 0, platte.breiteMm, platte.hoeheMm);
  const fensterFl = rechteck(f.xMm, f.yMm, f.breiteMm, f.hoeheMm);
  const schutz = schneide(text.schutz, fensterFl);
  const faktor = f.breiteMm / REFERENZ_KARTENBREITE_MM;

  // --- Standort-Symbol: Anker auf dem Ort (Spitze bei Herz und Pin), Groesse
  // fuer A4 und mitwachsend. Liegt der Ort ausserhalb des verschobenen
  // Ausschnitts, gibt es kein Symbol.
  const anker = ortZuMm({ lon: k.lon, lat: k.lat }, k.kartenMitte ?? { lon: k.lon, lat: k.lat }, k.ausschnittKm * 1000, f);
  const imFenster = anker.x >= f.xMm && anker.x <= f.xMm + f.breiteMm && anker.y >= f.yMm && anker.y <= f.yMm + f.hoeheMm;
  const eingepasst = symbolEinpassen(k.kunde.symbol ?? "herz", anker.x, anker.y, (k.symbolBreitenMm[k.kunde.symbolGroesse] ?? 11) * faktor);
  const symbol = imFenster ? teile(zuFlaeche(eingepasst.ringe)) : [];
  const symbolLage = imFenster ? { ankerXMm: anker.x, ankerYMm: anker.y, ...eingepasst.box } : null;
  // Das Symbol wird auf den Hintergrund geklebt (die Lage auf dem Wasser) und
  // steht ueber das Netz hinaus (Marcel 16.09.2026). Die Lagen darueber haben
  // dort einen Ausschnitt in Symbolform – nur die Aussenkontur, sonst bliebe im
  // Loch des Pins eine lose Scheibe. Unter dem Symbol wird kein Wasser
  // geschnitten, sonst fehlte am Fluss die Klebeflaeche.
  const symbolLoch = imFenster ? ohneLoecher(zuFlaeche(eingepasst.ringe)) : [];
  const wasser = wasserImFenster(k, roh, fensterFl, vereinige(schutz, symbolLoch));

  // --- Strassen. Breiten gelten fuer A4, wachsen mit dem Format und folgen der
  // Dichte vor Ort (dichte.ts). Gemessen wird auf dem Land: Wasser ist blau,
  // dort wirkt nichts zu dicht. Die Textreiter zaehlen mit – die Strassen unter
  // ihnen stecken in den Laengen (Quadrat sonst 38 statt 33 %).
  const land = flaecheMm2(ziehAb(fensterFl, wasser.gesamt));
  const laengen = laengenImFenster(k, roh, f);
  let auswahl = waehleNetz(k, laengen, land, faktor);
  let n = baueNetz(k, roh, layout, schutz, auswahl, symbolLoch, wasser.geschnitten);
  // Nachgerueckte Wege muessen ein Netz ergeben, keine losen Stuecke: Venedigs
  // Gassen bei 2 km liegen auf Inseln, deren Bruecken Fusswege und Treppen
  // sind – 78 % der Gassenflaeche lose. Dann bleibt es bei der Gravur.
  const nachrueckenVerworfen: string[] = [];
  if (auswahl.nachgerueckt.length && n.loseAnteil > NACHRUECKEN_MAX_LOSE_ANTEIL) {
    nachrueckenVerworfen.push(...auswahl.nachgerueckt);
    auswahl = waehleNetz(k, laengen, land, faktor, true);
    n = baueNetz(k, roh, layout, schutz, auswahl, symbolLoch, wasser.geschnitten);
  }
  const { netz, gravur: gravurRoh } = n;

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

  const inseln = kleineInselnFluten(k, plattenFl, wasser.geschnitten, netz);

  // Gravur weder in den ausgeschnittenen Buchstaben (helle Striche im Schwarz)
  // noch ueber Wasser (dort ist kein Material, der Laser graviert Luft) noch
  // unter dem Netz (unsichtbar). Das Netz allein spart gemessen 31 % Gravurweg
  // bei 160 ms Rechenzeit – A4 Berlin: 15,0 m auf 10,4 m.
  const gravurAus = vereinige(schutz, inseln.wasser, netz, symbolLoch);
  const gravur = gravurRoh.map((g) => ({ linien: ziehLinienAb(g.linien, gravurAus), breiteMm: g.breiteMm }));
  // Klebemarke: der Umriss des Symbols, leicht nach innen gesetzt – das Symbol
  // verliert beim Schneiden eine halbe Fuge und deckt die Marke trotzdem ab.
  const marke = ringeInMm(versatz(symbolLoch, -MARKE_EINZUG_MM)).map((r) => [...r, r[0]]);
  if (marke.length) gravur.push({ linien: marke, breiteMm: MARKE_BREITE_MM });


  return {
    plattenFl,
    fensterFl,
    netz,
    schutz,
    wasser: inseln.wasser,
    textAusschnitt: vereinige(...ausschnitte),
    gravur,
    symbol,
    symbolLage,
    symbolLoch,
    textBereich: text.textBereich,
    kennzahlen: {
      netzAnteilFenster,
      netzLoecherZugefuellt: n.kleineBloecke,
      netzAnMindestbreite: auswahl.anMindestbreite,
      formatfaktor: faktor,
      dichtefaktor: auswahl.dichtefaktor,
      deckungVorOrt: auswahl.deckungVorOrt,
      herabgestuft: auswahl.herabgestuft,
      nachgerueckt: auswahl.nachgerueckt,
      nachrueckenVerworfen,
      loseZurGravur: n.loseZurGravur,
      stencilStege: stege,
      punzenOhneSteg: ohneSteg,
      inselnZugefuellt: zugefuellt,
      wasserFlaechenGeschnitten: wasser.anzahl,
      wasserInselnGeflutet: inseln.geflutet,
    },
  };
}
