import { weiter } from "./abbruch";
import type { Punkt } from "./clip";
import { breitenbezug, laengenImFenster, waehleNetz } from "./dichte";
import { brueckenStreifen } from "./bruecken";
import { duenneAus } from "./gravur-duenn";
import { baueNetz } from "./netz";
import {
  ausTeilen,
  flaecheMm2,
  ohneLoecher,
  rechteck,
  schneide,
  teile,
  vereinige,
  versatz,
  ziehAb,
  ziehLinienAb,
  zuFlaeche,
  type Flaeche,
} from "./geometrie";
import { MARKER_FARBEN, markerAlsListe, markerFarbe, platziereMarker } from "./marker";
import type { MarkerFarbe } from "./typen";
import type { KartenRohdaten } from "./kacheln";
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
  /** Schwarze Umrandung unter einem Titel der Deckschicht (kante.ts), im Fenster. */
  traeger: Flaeche;
  /** Geschnittenes Wasser, ohne den Bereich unter den Texten. */
  wasser: Flaeche;
  /** Was aus der weissen Oberseite fuer die Buchstaben herausgeschnitten wird. */
  textAusschnitt: Flaeche;
  gravur: { linien: Punkt[][]; breiteMm: number }[];
  klebeflaeche: Teil[];
  symbol: Teil[];
  /** Die Marker je Spiegelacryl-Farbe; leer, wenn der Kunde keinen Marker gesetzt hat. */
  symbolJeFarbe: { farbe: MarkerFarbe; teile: Teil[] }[];
  symbolLage: SchichtkartenErgebnis["symbol"];
  /** Alle sichtbaren Marker. */
  symbole: SchichtkartenErgebnis["symbole"];
  /** Marker der Liste, die ausserhalb des Ausschnitts liegen und darum fehlen. */
  markerAusserhalb: number;
  /** Aussenkontur des Symbols – in den Lagen ueber dem Hintergrund ausgeschnitten. */
  symbolLoch: Flaeche;
  textBereich: Flaeche;
  kennzahlen: Omit<Kennzahlen, "zoomEntsprechung" | "loseNetzstuecke" | "loseTextteile" | "hintergrundTeile" | "rechenzeitMs" | "symbolUeberNetzMm" | "randImRahmenMm" | "gravurWegM" | "gravurFlaecheMm2">;
}

// Liegt nach dem Nachruecken mehr Netzflaeche lose, bleiben die Wege ganz
// Gravur – sonst waere das Netz ein Flickenteppich aus geschnittenen und
// gravierten Gassen. Gemessen: Allgaeu 1,1-1,4 %, Venedig bei 2 km 78 %.
const NACHRUECKEN_MAX_LOSE_ANTEIL = 0.1;

// Klebeflaeche fuer das Symbol: so weit nach innen, dass das Symbol sie trotz halber Schnittfuge
// abdeckt – und so weit vom Loch des Pins weg, dass man die Gravur dort nicht sieht.
const KLEBE_EINZUG_MM = 0.3;

export async function baueBausteine(k: Schichtkarte, layout: Layout, roh: KartenRohdaten, text: Textblock, signal?: AbortSignal): Promise<Bausteine> {
  const { platte, kartenfenster: f } = layout;
  const plattenFl = rechteck(0, 0, platte.breiteMm, platte.hoeheMm);
  const fensterFl = rechteck(f.xMm, f.yMm, f.breiteMm, f.hoeheMm);
  const schutz = schneide(text.schutz, fensterFl);
  const freiraum = text.freiraum ? schneide(text.freiraum, fensterFl) : [];
  const traeger = text.traeger ? schneide(text.traeger, fensterFl) : [];
  // Fuer das Netz zaehlt die Umrandung unter dem Titel wie Text: Strassen, die an ihr enden, haengen am Netz.
  const schutzNetz = traeger.length ? vereinige(schutz, traeger) : schutz;
  const faktor = f.breiteMm / REFERENZ_KARTENBREITE_MM;

  // --- Marker (marker.ts): Anker auf ihrem Ort (Spitze bei Herz und Pin), Groesse
  // fuer A4 und mitwachsend. Liegt ein Marker ausserhalb des verschobenen
  // Ausschnitts, faellt er weg.
  const kartenMitte = k.kartenMitte ?? { lon: k.lon, lat: k.lat };
  const marker = platziereMarker(k, kartenMitte, f, faktor);
  const symbol = teile(vereinigeAlle(marker.platziert.map((m) => zuFlaeche(m.ringe))));
  // Je Farbe eine Lage. Ohne Liste wie bisher genau die rote, auch wenn das Symbol ausserhalb liegt.
  const symbolJeFarbe: { farbe: MarkerFarbe; teile: Teil[] }[] = markerAlsListe(k)
    ? MARKER_FARBEN.flatMap((farbe) => {
        const eigene = marker.platziert.filter((m) => markerFarbe(m.marker) === farbe);
        if (!eigene.length) return [];
        return [{ farbe, teile: eigene.length === marker.platziert.length ? symbol : teile(vereinigeAlle(eigene.map((m) => zuFlaeche(m.ringe)))) }];
      })
    : [{ farbe: "rot", teile: symbol }];

  const symbolLage = marker.platziert[0]?.lage ?? null;
  // Das Symbol wird auf den Hintergrund geklebt (die Lage auf dem Wasser) und
  // steht ueber das Netz hinaus (Marcel 16.09.2026). Die Lagen darueber haben
  // dort einen Ausschnitt in Symbolform – nur die Aussenkontur, sonst bliebe im
  // Loch des Pins eine lose Scheibe. Unter dem Symbol wird kein Wasser
  // geschnitten, sonst fehlte am Fluss die Klebeflaeche.
  const symbolLoch = vereinigeAlle(marker.platziert.map((m) => ohneLoecher(zuFlaeche(m.ringe))));
  const wasser = wasserImFenster(k, roh, fensterFl, vereinige(schutz, symbolLoch, traeger));
  await weiter(signal);

  // --- Strassen. Breiten gelten fuer A4, wachsen mit dem Format und folgen der
  // Dichte vor Ort (dichte.ts). Gemessen wird auf dem Land: Wasser ist blau,
  // dort wirkt nichts zu dicht. Die Textreiter zaehlen mit – die Strassen unter
  // ihnen stecken in den Laengen (Quadrat sonst 38 statt 33 %).
  const land = flaecheMm2(ziehAb(fensterFl, wasser.gesamt));
  const laengen = laengenImFenster(k, roh, f);
  const bezug = breitenbezug(k, f);
  let auswahl = waehleNetz(k, laengen, land, bezug);
  let n = baueNetz(k, roh, layout, schutzNetz, auswahl, symbolLoch, freiraum);
  await weiter(signal);
  // Nachgerueckte Wege muessen ein Netz ergeben, keine losen Stuecke: Venedigs
  // Gassen bei 2 km liegen auf Inseln, deren Bruecken Fusswege und Treppen
  // sind – 78 % der Gassenflaeche lose. Dann bleibt es bei der Gravur.
  const nachrueckenVerworfen: string[] = [];
  if (auswahl.nachgerueckt.length && n.loseAnteil > NACHRUECKEN_MAX_LOSE_ANTEIL) {
    nachrueckenVerworfen.push(...auswahl.nachgerueckt);
    auswahl = waehleNetz(k, laengen, land, bezug, true);
    n = baueNetz(k, roh, layout, schutzNetz, auswahl, symbolLoch, freiraum);
  }
  const { netz, gravur: gravurRoh } = n;

  // Dichte ohne die Textflaechen – die sagen nichts ueber "zu dicht".
  const ohneSchutz = ziehAb(fensterFl, schutz);
  const netzAnteilFenster = flaecheMm2(schneide(netz, ohneSchutz)) / Math.max(1, flaecheMm2(ohneSchutz));

  // --- Text: ausgeschnitten, Innenflaechen an Stegen – gesetzt und gestegt schon beim Setzen (schnitt-text.ts).
  const ausschnitte: Flaeche[] = [];
  let [stege, ohneSteg, zugefuellt] = [0, 0, 0];
  for (const zeile of text.zeilen) {
    ausschnitte.push(zeile.schnitt);
    stege += zeile.stege;
    ohneSteg += zeile.ohneSteg;
    zugefuellt += zeile.zugefuellt;
  }

  // Unter den Bruecken gravierter Wege bleibt der Hintergrund stehen (bruecken.ts). Was dabei
  // an Inseln wieder angebunden wird, bleibt; die Gravur laeuft ueber die Bruecke weiter.
  const streifen = brueckenStreifen(k, n.bruecken.graviert, n.bruecken.netz, wasser.geschnitten);
  const inseln = kleineInselnFluten(k, plattenFl, ziehAb(wasser.geschnitten, streifen), netz);

  // Gravur weder in den ausgeschnittenen Buchstaben (helle Striche im Schwarz)
  // noch ueber Wasser (dort ist kein Material, der Laser graviert Luft) noch
  // unter dem Netz (unsichtbar). Das Netz allein spart gemessen 31 % Gravurweg
  // bei 160 ms Rechenzeit – A4 Berlin: 15,0 m auf 10,4 m.
  const gravurAus = vereinige(schutz, traeger, inseln.wasser, netz, symbolLoch);
  const beschnitten = gravurRoh.map((g) => ({ linien: ziehLinienAb(g.linien, gravurAus), breiteMm: g.breiteMm }));
  // Linien, die der Strahl gemeinsam brennen wuerde, nur einmal (gravur-duenn.ts) – nicht bei Flaechengravur.
  const dicht = k.gravurExport.art !== "flaeche" ? duenneAus(beschnitten, k.gravurExport.minAbstandMm ?? 0) : null;
  const gravur = dicht ? dicht.gruppen : beschnitten;
  // Unter dem Symbol eine gravierte Flaeche statt einer Umrisslinie (Marcel 17.09.2026): angeraut
  // haelt der Kleber besser, und die Stelle ist beim Aufsetzen markiert.
  const klebeflaeche = teile(versatz(ausTeilen(symbol), -KLEBE_EINZUG_MM), 0.01);

  return {
    plattenFl,
    fensterFl,
    netz,
    schutz,
    traeger,
    wasser: inseln.wasser,
    textAusschnitt: vereinige(...ausschnitte),
    gravur,
    klebeflaeche,
    symbol,
    symbolJeFarbe,
    symbolLage,
    symbole: marker.platziert.map((m) => m.lage),
    markerAusserhalb: marker.ausserhalb,
    symbolLoch,
    textBereich: text.textBereich,
    kennzahlen: {
      netzAnteilFenster,
      netzLoecherZugefuellt: n.kleineBloecke,
      querverbindungen: n.querverbindungen,
      verstaerkt: n.verstaerkt,
      angebunden: n.angebunden,
      zusatzM: n.zusatzM,
      netzAnMindestbreite: auswahl.anMindestbreite,
      formatfaktor: faktor,
      dichtefaktor: auswahl.dichtefaktor,
      breitenfaktor: auswahl.breitenfaktor,
      deckungVorOrt: auswahl.deckungVorOrt,
      herabgestuft: auswahl.herabgestuft,
      nachgerueckt: auswahl.nachgerueckt,
      nachrueckenVerworfen,
      loseZurGravur: n.loseZurGravur,
      stencilStege: stege,
      punzenOhneSteg: ohneSteg,
      inselnZugefuellt: zugefuellt,
      schriftZugabeMm: Math.max(0, ...text.zeilen.map((z) => z.zugabeMm)),
      wasserFlaechenGeschnitten: wasser.anzahl,
      wasserInselnGeflutet: inseln.geflutet,
    },
  };
}

/** Ein Marker bleibt seine Flaeche wie bisher; erst mehrere werden vereinigt (ueberlappende Marker sind ein Teil). */
function vereinigeAlle(flaechen: Flaeche[]): Flaeche {
  if (flaechen.length === 0) return [];
  return flaechen.length === 1 ? flaechen[0] : vereinige(...flaechen);
}
