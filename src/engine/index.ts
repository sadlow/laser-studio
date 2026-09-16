import { zoomEntsprechung } from "./geo";
import { ladeKartenRohdaten } from "./kacheln";
import { baueLagen } from "./lagen";
import { berechneLayout } from "./layout";
import { laserSvg, vorschauSvg } from "./svg";
import { setzeEingebettet } from "./ecken";
import { setzePosterText } from "./textblock";
import { REFERENZ_KARTENBREITE_MM, type Lage, type Schichtkarte, type SchichtkartenErgebnis } from "./typen";

export * from "./typen";
export { FORMATE, masseAusFormat } from "./formate";
export { berechneLayout } from "./layout";
export {
  standardLayoutFuer,
  standardSchichtkarte,
  STRASSEN_STANDARD,
  TITELSCHRIFTEN,
  ZEILENSCHRIFTEN,
} from "./standard";

/**
 * Der einzige Einstieg: Produktparameter rein, Vorschau und je Lage eine
 * Laserdatei raus.
 *
 * Keine UI-Abhaengigkeit, kein Zustand. Dieselbe Funktion bedient die
 * Live-Vorschau und spaeter die Produktion – sonst gaebe es zwei Geometrien
 * fuer dasselbe Produkt, und die driften unbemerkt auseinander.
 */
export async function rendereSchichtkarte(k: Schichtkarte, token: string): Promise<SchichtkartenErgebnis> {
  const start = Date.now();
  const layout = berechneLayout(k);
  const warnungen: string[] = [];

  // Zugabe beim Laden: so breit wie die breiteste Netzstrasse, damit gepufferte
  // Strassen am Fensterrand gerade enden statt rund.
  const faktor = layout.kartenfenster.breiteMm / REFERENZ_KARTENBREITE_MM;
  const breitesteStrasse = Math.max(
    k.netzMinBreiteMm,
    ...k.strassen.filter((s) => s.ziel === "netz").map((s) => s.breiteMm * faktor),
  );

  const roh = await ladeKartenRohdaten({
    lon: k.lon,
    lat: k.lat,
    ausschnittBreiteM: k.ausschnittKm * 1000,
    fenster: layout.kartenfenster,
    zugabeMm: breitesteStrasse + 1,
    token,
  });

  const textblock = k.layoutArt === "eingebettet" ? setzeEingebettet(k, layout) : setzePosterText(k, layout);
  warnungen.push(...textblock.warnungen);

  const g = baueLagen(k, layout, roh, textblock);

  if (g.netz.anMindestbreite.length > 0) {
    warnungen.push(
      `Auf diesem Format waeren ${g.netz.anMindestbreite.join(", ")} schmaler als ${k.netzMinBreiteMm} mm ` +
        "und werden auf die Mindestbreite gehalten – sie wirken dadurch kraeftiger als auf A4.",
    );
  }
  if (g.weissLose.imNetz > 0) {
    warnungen.push(
      `${g.weissLose.imNetz} Strassenstuecke haengen nicht am Netz und fallen lose heraus ` +
        "(orange markiert). Meist sind sie nur ueber eine gravierte Strasse angebunden.",
    );
  }
  if (g.weissLose.imText > 0) {
    warnungen.push(`${g.weissLose.imText} Innenflaechen im Text sind trotz Stegen lose.`);
  }
  if (g.stencil.ohneSteg > 0) {
    warnungen.push(`${g.stencil.ohneSteg} Innenflaechen im Text haben keinen Steg bekommen.`);
  }
  if (g.schwarz.length > 1) {
    warnungen.push(
      `Die schwarze Lage zerfaellt durch das Wasser in ${g.schwarz.length} Teile – ` +
        "die muessen beim Verkleben einzeln ausgerichtet werden.",
    );
  }

  const lagen: Lage[] = [
    {
      key: "herz",
      titel: "Herz",
      material: "Spiegelacryl rot",
      teile: g.herz,
      gravur: [],
      laserSvg: laserSvg(layout, "Lage Herz – Spiegelacryl rot", g.herz),
    },
    {
      key: "weiss",
      titel: "Weiss",
      material: "Acrylglas weiss",
      teile: g.weiss,
      gravur: [],
      laserSvg: laserSvg(layout, "Lage Weiss – Acrylglas weiss", g.weiss),
    },
    {
      key: "schwarz",
      titel: "Schwarz",
      material: "Acrylglas schwarz",
      teile: g.schwarz,
      gravur: g.gravur,
      laserSvg: laserSvg(layout, "Lage Schwarz – Acrylglas schwarz", g.schwarz, g.gravur),
    },
    {
      key: "blau",
      titel: "Blau",
      material: "Spiegelacryl blau",
      teile: g.blau,
      gravur: [],
      laserSvg: laserSvg(layout, "Lage Blau – Spiegelacryl blau", g.blau),
    },
  ];

  return {
    vorschauSvg: vorschauSvg(layout, g, k.loseTeileMarkieren),
    lagen,
    layout,
    texte: textblock.texte,
    ausschnittMeter: roh.ausschnittMeter,
    kennzahlen: {
      weissAnteilFenster: g.netz.weissAnteilFenster,
      netzLoecherZugefuellt: g.netz.loecherZugefuellt,
      netzAnMindestbreite: g.netz.anMindestbreite,
      formatfaktor: g.netz.faktor,
      zoomEntsprechung: zoomEntsprechung(k.ausschnittKm * 1000, layout.kartenfenster.breiteMm, k.lat),
      weissTeile: g.weiss.length,
      weissLoseImNetz: g.weissLose.imNetz,
      weissLoseImText: g.weissLose.imText,
      schwarzTeile: g.schwarz.length,
      stencilStege: g.stencil.anzahl,
      punzenOhneSteg: g.stencil.ohneSteg,
      inselnZugefuellt: g.stencil.zugefuellt,
      wasserFlaechenGeschnitten: g.wasserFlaechen,
      rechenzeitMs: Date.now() - start,
    },
    warnungen,
  };
}
