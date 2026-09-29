import type { Punkt } from "./clip";
import { puffereLinien, rechteck, teile, vereinige, ziehAb, ziehLinienAb, zuFlaeche, type Flaeche } from "./geometrie";
import { setzeZeile } from "./schrift";
import type { Lage } from "./typen";

/**
 * Grenzwert-Testblatt fuer die Netz-Lage (Marcel 17.09.2026: bei A5 und "viel" liefen Strassen zusammen –
 * erst am Acryl messen, wie eng geschnitten werden kann). Geschnitten wie das Netz: Material bleibt
 * stehen, die Bloecke fallen heraus. Jede Reihe prueft einen Grenzwert:
 *   A Spalt zwischen parallelen Strassen   – heute ohne Grenze, jeder Spalt wird geschnitten
 *   B Strassenbreite zwischen Spalten      – netzMinBreiteMm
 *   C zusammenlaufende Strassen (Keil)     – wie weit die Spitze offen bleibt, Skala = Spaltbreite
 *   D kleine Bloecke, je vier Quadrate     – netzMinLochMm2
 * Alle Masse sind Sollmasse ohne Schnittfuge, wie in den Exportdateien.
 */
export const TESTWERTE = {
  spaltMm: [0.3, 0.4, 0.5, 0.6, 0.8, 1, 1.2, 1.5],
  strasseMm: [0.4, 0.5, 0.6, 0.7, 0.8, 1],
  keile: [{ grad: 5, laengeMm: 32, skalaMm: [0.5, 1, 1.5] }, { grad: 10, laengeMm: 22, skalaMm: [1, 2] }],
  blockMm2: [1, 1.5, 2, 3, 4, 6],
};

const RAND = 4;
const STRASSE = 1;
const SPALT_B = 1.5;
const SCHRIFT = "AvantGarde-Book.otf";
const TITEL_MM = 2;
const ZIFFER_MM = 1.8;
const REIHEN_ABSTAND = 3;

export interface Testblatt {
  breiteMm: number;
  hoeheMm: number;
  lage: Lage;
}

const zahl = (n: number) => String(n).replace(".", ",");

export function baueTestblatt(): Testblatt {
  const bloecke: Flaeche[] = [];
  const schrift: Punkt[][] = [];
  const striche: Punkt[][] = [];
  let y = RAND;
  let breite = 0;

  // Reihe: Titel, darunter Gruppen im festen Raster mit ihrem Wert darunter.
  const reihe = (titel: string, teilung: number, hoehe: number, gruppen: { wert: string; bau: (mitteX: number, oben: number) => Flaeche[] }[]) => {
    schrift.push(...text(titel, RAND, y + TITEL_MM / 2, TITEL_MM, "links"));
    const oben = y + TITEL_MM + 2;
    gruppen.forEach((g, i) => {
      const mitteX = RAND + teilung * (i + 0.5);
      bloecke.push(...g.bau(mitteX, oben));
      schrift.push(...text(g.wert, mitteX, oben + hoehe + 1.2 + ZIFFER_MM / 2, ZIFFER_MM));
    });
    breite = Math.max(breite, RAND + teilung * gruppen.length);
    y = oben + hoehe + 1.2 + ZIFFER_MM + REIHEN_ABSTAND;
  };

  // Streifen nebeneinander: Spalte der Breite s, dazwischen Strassen der Breite r.
  const kamm = (anzahl: number, s: number, r: number, laenge: number) => (mitteX: number, oben: number) => {
    const links = mitteX - (anzahl * s + (anzahl - 1) * r) / 2;
    return Array.from({ length: anzahl }, (_, j) => rechteck(links + j * (s + r), oben, s, laenge));
  };

  reihe("A  Spalt zwischen Strassen, mm (Strasse 1)", 10.5, 14, TESTWERTE.spaltMm.map((s) => ({ wert: zahl(s), bau: kamm(3, s, STRASSE, 14) })));
  reihe("B  Strassenbreite, mm (Spalt 1,5)", 12.5, 14, TESTWERTE.strasseMm.map((r) => ({ wert: zahl(r), bau: kamm(4, SPALT_B, r, 14) })));

  // C: zwei Strassen laufen in einer Spitze zusammen. Der Block dazwischen ist bei Abstand x von der
  // Spitze (Mittellinien) 2·x·tan(a/2) − r/cos(a/2) breit; die Striche darunter markieren diese Breite.
  schrift.push(...text("C  Zusammenlaufende Strassen, Striche = Spaltbreite mm", RAND, y + TITEL_MM / 2, TITEL_MM, "links"));
  let x = RAND;
  const keilOben = y + TITEL_MM + 2;
  let keilUnten = keilOben;
  for (const k of TESTWERTE.keile) {
    const halb = ((k.grad / 2) * Math.PI) / 180;
    const auf = k.laengeMm * Math.tan(halb);
    const hoehe = 2 * (auf + STRASSE / 2 + 3);
    schrift.push(...text(`${k.grad}°`, x, keilOben + hoehe / 2, ZIFFER_MM, "links"));
    const spitze = { x: x + 7, y: keilOben + hoehe / 2 };
    const strassen = puffereLinien(
      [-1, 1].map((v) => [spitze, { x: spitze.x + k.laengeMm, y: spitze.y + v * auf }]),
      STRASSE,
    );
    bloecke.push(ziehAb(rechteck(spitze.x, keilOben, k.laengeMm, hoehe), strassen));
    for (const w of k.skalaMm) {
      const sx = spitze.x + (w + STRASSE / Math.cos(halb)) / (2 * Math.tan(halb));
      striche.push([{ x: sx, y: keilOben + hoehe + 0.6 }, { x: sx, y: keilOben + hoehe + 2 }]);
      schrift.push(...text(zahl(w), sx, keilOben + hoehe + 3.2 + ZIFFER_MM / 2, ZIFFER_MM));
    }
    x = spitze.x + k.laengeMm + 8;
    keilUnten = Math.max(keilUnten, keilOben + hoehe + 3.2 + ZIFFER_MM);
  }
  breite = Math.max(breite, x - 8);
  y = keilUnten + REIHEN_ABSTAND;

  // D: vier Quadrate je Flaeche, getrennt von Strassen – wie ein kleiner Block im Raster.
  reihe("D  Kleine Bloecke, mm² (Strasse 1)", 9, Math.sqrt(Math.max(...TESTWERTE.blockMm2)) * 2 + STRASSE, TESTWERTE.blockMm2.map((a) => ({
    wert: zahl(a),
    bau: (mitteX: number, oben: number) => {
      const s = Math.sqrt(a);
      const links = mitteX - s - STRASSE / 2;
      return [0, 1].flatMap((i) => [0, 1].map((j) => rechteck(links + i * (s + STRASSE), oben + j * (s + STRASSE), s, s)));
    },
  })));

  const breiteMm = Math.ceil(breite + RAND);
  const hoeheMm = Math.ceil(y - REIHEN_ABSTAND + RAND);
  const material = ziehAb(rechteck(0, 0, breiteMm, hoeheMm), vereinige(...bloecke));
  return {
    breiteMm,
    hoeheMm,
    lage: {
      key: "netz",
      titel: "Testblatt Netz",
      material: "Acrylglas 2 mm (weiss oder schwarz)",
      teile: teile(material, 0.01),
      staerkeMm: 2,
      gravur: [
        { linien: schrift, breiteMm: 0.12 },
        { linien: striche, breiteMm: 0.2 },
      ],
      klebeflaeche: [],
      laserSvg: "",
    },
  };
}

/** Gefuellte Beschriftung als Gravur: waagrechte Linien dichter als ihre Breite, auf die Buchstaben beschnitten. */
function text(inhalt: string, x: number, mitteY: number, hoeheMm: number, ausrichtung: "links" | "mitte" = "mitte"): Punkt[][] {
  const z = setzeZeile({ text: inhalt, schrift: SCHRIFT, versalhoeheMm: hoeheMm, sperrungEm: 0, mitteX: 0, mitteY, maxBreiteMm: 500 });
  const dx = ausrichtung === "mitte" ? x : x + z.breiteMm / 2;
  const flaeche = vereinige(zuFlaeche(z.ringe.map((r) => r.map((p) => ({ x: p.x + dx, y: p.y })))));
  const linien: Punkt[][] = [];
  for (let ly = mitteY - hoeheMm; ly <= mitteY + hoeheMm; ly += 0.08) {
    linien.push([{ x: dx - z.breiteMm, y: ly }, { x: dx + z.breiteMm, y: ly }]);
  }
  return ziehLinienAb(linien, flaeche, true);
}
