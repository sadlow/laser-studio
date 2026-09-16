import { setzeEingebettet } from "./ecken";
import { zoomEntsprechung } from "./geo";
import { ringeInMm } from "./geometrie";
import { holzrahmenPruefen } from "./holzrahmen";
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

  // Symbol auf dem Hintergrund, Netzlage mit Ausschnitt: so weit steht es vor.
  const symbolUeberNetzMm = k.staerkenMm.spiegel - (s.lagen.find((l) => l.key === "netz")?.staerkeMm ?? 0);
  if (b.symbolLage && symbolUeberNetzMm <= 0) {
    warnungen.push(`Das Symbol (${k.staerkenMm.spiegel} mm) steht nicht ueber das Netz hinaus, es liegt ${(-symbolUeberNetzMm).toFixed(1)} mm tiefer.`);
  }
  if (!b.symbolLage) {
    warnungen.push("Der Ort liegt ausserhalb des Kartenausschnitts – das Standort-Symbol fehlt. Karte zurueckschieben oder zentrieren.");
  }

  const textZonen = textblock.zeilen.map((z) => ({ name: z.name, zone: umgebend(ringeInMm(z.flaeche).flat()) }));
  const stapelMm = s.lagen.filter((l) => l.key !== "symbol").reduce((summe, l) => summe + l.staerkeMm, 0);
  const holz = holzrahmenPruefen(k, layout, b.symbolLage, textZonen, stapelMm);
  warnungen.push(...holz.warnungen);

  return {
    vorschauSvg: s.vorschauSvg,
    kartenMitte,
    symbol: b.symbolLage,
    lagen: s.lagen,
    layout,
    rahmen: holz.rahmen,
    texte: textblock.texte,
    textZonen,
    ausschnittMeter: roh.ausschnittMeter,
    kennzahlen: {
      ...b.kennzahlen,
      zoomEntsprechung: zoomEntsprechung(k.ausschnittKm * 1000, layout.kartenfenster.breiteMm, kartenMitte.lat),
      loseNetzstuecke: s.loseNetzstuecke,
      loseTextteile: s.loseTextteile,
      hintergrundTeile: s.hintergrundTeile,
      symbolUeberNetzMm,
      randImRahmenMm: holz.randImRahmenMm,
      rechenzeitMs: Date.now() - start,
    },
    warnungen,
  };
}

// Schleife statt Math.min(...): eine Schreibschrift-Zeile hat zehntausende Punkte.
function umgebend(punkte: { x: number; y: number }[]) {
  if (!punkte.length) return { xMm: 0, yMm: 0, breiteMm: 0, hoeheMm: 0 };
  let [x0, y0, x1, y1] = [Infinity, Infinity, -Infinity, -Infinity];
  for (const p of punkte) {
    x0 = Math.min(x0, p.x);
    y0 = Math.min(y0, p.y);
    x1 = Math.max(x1, p.x);
    y1 = Math.max(y1, p.y);
  }
  return { xMm: x0, yMm: y0, breiteMm: x1 - x0, hoeheMm: y1 - y0 };
}
