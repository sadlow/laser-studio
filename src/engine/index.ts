import { setzeEingebettet } from "./ecken";
import { zoomEntsprechung } from "./geo";
import { ladeKartenRohdaten } from "./kacheln";
import { baueBausteine } from "./lagen";
import { berechneLayout } from "./layout";
import { stapleLagen } from "./stapel";
import { setzePosterText } from "./textblock";
import { REFERENZ_KARTENBREITE_MM, type Schichtkarte, type SchichtkartenErgebnis } from "./typen";

export * from "./typen";
export { FORMATE, masseAusFormat } from "./formate";
export { berechneLayout } from "./layout";
export { POSTER_MASSE, standardLayoutWerte } from "./poster-masse";
export { SYMBOL_TITEL, symbolPfad, type SymbolArt, type SymbolGroesse } from "./symbole";
export {
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

  const kartenMitte = k.kartenMitte ?? { lon: k.lon, lat: k.lat };
  const roh = await ladeKartenRohdaten({
    lon: kartenMitte.lon,
    lat: kartenMitte.lat,
    ausschnittBreiteM: k.ausschnittKm * 1000,
    fenster: layout.kartenfenster,
    zugabeMm: breitesteStrasse + 1,
    token,
  });

  const textblock = k.layoutArt === "eingebettet" ? setzeEingebettet(k, layout) : setzePosterText(k, layout);
  warnungen.push(...textblock.warnungen);

  const b = baueBausteine(k, layout, roh, textblock);
  const s = stapleLagen(k, layout, b);
  const netzFarbe = k.aufbau === "netz-weiss" ? "weissen" : "schwarzen";

  if (b.kennzahlen.herabgestuft.length > 0) {
    warnungen.push(
      `Das Strassennetz ist hier sehr dicht (${Math.round(b.kennzahlen.deckungVorOrt * 100)} % Deckung bei ` +
        `${k.ausschnittKm.toFixed(1)} km): ${b.kennzahlen.herabgestuft.join(", ")} waeren nicht mehr schneidbar ` +
        "und werden graviert statt geschnitten.",
    );
  }
  if (b.kennzahlen.nachgerueckt.length > 0) {
    const immer = k.generalisierung.stufen[k.kunde.strassenStufe]?.nachruecken === "immer";
    warnungen.push(
      (immer ? "Mehr Strassen geschnitten: " : `Der Ort ist licht (${Math.round(b.kennzahlen.deckungVorOrt * 100)} % Deckung): `) +
        `${b.kennzahlen.nachgerueckt.join(", ")} werden mitgeschnitten statt graviert.`,
    );
  }
  if (b.kennzahlen.nachrueckenVerworfen.length > 0) {
    warnungen.push(
      `Der Ort ist licht, aber ${b.kennzahlen.nachrueckenVerworfen.join(", ")} bilden hier kein zusammenhaengendes ` +
        "Netz (Bruecken oder Anschluesse fehlen) und bleiben graviert. Ein engerer Ausschnitt kann helfen.",
    );
  }
  if (b.kennzahlen.netzAnMindestbreite.length > 0) {
    warnungen.push(
      `${b.kennzahlen.netzAnMindestbreite.join(", ")} waeren hier schmaler als ${k.netzMinBreiteMm} mm ` +
        "und werden auf die Mindestbreite gehalten – sie wirken dadurch kraeftiger als die uebrigen Strassen.",
    );
  }
  if (s.loseNetzstuecke > 0) {
    warnungen.push(
      `${s.loseNetzstuecke} Strassenstuecke haengen nicht am ${netzFarbe} Netz und fallen lose heraus ` +
        "(orange markiert). Meist sind sie nur ueber eine gravierte Strasse angebunden.",
    );
  }
  if (s.loseTextteile > 0) {
    warnungen.push(`${s.loseTextteile} Innenflaechen im Text sind trotz Stegen lose.`);
  }
  if (b.kennzahlen.punzenOhneSteg > 0) {
    warnungen.push(`${b.kennzahlen.punzenOhneSteg} Innenflaechen im Text haben keinen Steg bekommen.`);
  }
  if (s.hintergrundTeile > 1) {
    warnungen.push(
      `Die Hintergrund-Lage zerfaellt durch das Wasser in ${s.hintergrundTeile} Teile – ` +
        "die muessen beim Verkleben einzeln ausgerichtet werden.",
    );
  }

  // Symbol auf Blau, Lagen darueber mit Ausschnitt: so tief sitzt es.
  const ueberBlau = s.lagen.filter((l) => l.key !== "symbol" && l.key !== "blau").reduce((summe, l) => summe + l.staerkeMm, 0);
  const symbolVertiefungMm = ueberBlau - k.staerkenMm.spiegel;
  if (symbolVertiefungMm < 0) {
    warnungen.push(`Das Symbol (${k.staerkenMm.spiegel} mm) steht ${(-symbolVertiefungMm).toFixed(1)} mm ueber die Oberflaeche hinaus.`);
  }
  if (!b.symbolLage) {
    warnungen.push("Der Ort liegt ausserhalb des Kartenausschnitts – das Standort-Symbol fehlt. Karte zurueckschieben oder zentrieren.");
  }

  return {
    vorschauSvg: s.vorschauSvg,
    kartenMitte,
    symbol: b.symbolLage,
    lagen: s.lagen,
    layout,
    texte: textblock.texte,
    ausschnittMeter: roh.ausschnittMeter,
    kennzahlen: {
      ...b.kennzahlen,
      zoomEntsprechung: zoomEntsprechung(k.ausschnittKm * 1000, layout.kartenfenster.breiteMm, kartenMitte.lat),
      loseNetzstuecke: s.loseNetzstuecke,
      loseTextteile: s.loseTextteile,
      hintergrundTeile: s.hintergrundTeile,
      symbolVertiefungMm,
      rechenzeitMs: Date.now() - start,
    },
    warnungen,
  };
}
