import { teile, vereinige, ziehAb, type Flaeche } from "./geometrie";
import type { Bausteine } from "./lagen";
import type { Stapel } from "./stapel";
import { FARBE_LOSE, laserSvg, vorschauSvg, type Gravur, type Malschritt } from "./svg";
import type { HolzAufbau, HolzPlatte, Lage, LagenKey, Layout, Schichtkarte, Teil } from "./typen";
import { SPLITTER_MM2 } from "./wasser";

/** Die Platten der Holzkarte, wenn die Vorlage keine nennt (Marcel 15.11.2026, Plattenstamm der Pipeline). */
export const HOLZ_STANDARD: HolzAufbau = {
  netz: { material: "HDF Birne furniert", staerkeMm: 3 },
  grund: { material: "Edelsperrholz Nussbaum", staerkeMm: 5 },
  blau: { material: "Acrylglas hellblau Frost", staerkeMm: 3 },
};

// Vorschaufarben, abgenommen an den Produktfotos „We said yes“ (Birne / Nuss / Blau).
export const FARBE_BIRNE = "#d8a477";
export const FARBE_NUSS = "#5e4231";
export const FARBE_HELLBLAU = "#4f9fd6";
// Auf Birne brennt der Laser dunkelbraun; duenne UltraLight-Striche wirkten mit dem helleren Ton nur wie ein Hauch.
export const GRAVUR_AUF_BIRNE = "#5c3519";
export const GRAVUR_AUF_NUSS = "#3d2a1e";

interface Vorstufe {
  rahmen: Flaeche;
  hintergrund: Teil[];
  blau: Teil[];
  markerLagen: Lage[];
  markerSchritte: Malschritt[];
  gravur: Gravur;
}

/**
 * Aufbau "holz": wie netz-weiss – Netzlage ueber Grund mit ausgeschnittenem Wasser ueber Blau –, aber aus Holz, und die
 * Texte stehen graviert auf der Netzlage statt ausgeschnitten (Layout "herz"). Der Marker sitzt wie bei Acryl auf dem
 * Grund, die Netzlage hat dort ein Loch.
 */
export function stapleHolz(k: Schichtkarte, layout: Layout, b: Bausteine, laserdateien: boolean, v: Vorstufe): Stapel {
  const holz = k.holz ?? HOLZ_STANDARD;
  const netz = teile(ziehAb(vereinige(v.rahmen, b.netz), b.symbolLoch), SPLITTER_MM2);
  const [netzHaupt, ...lose] = netz;
  // Text, der in ein Loch der Netzlage faellt (Herz, Marker), haette kein Material: weg damit.
  const text = teile(ziehAb(b.textGravur, ziehAb(b.plattenFl, vereinige(v.rahmen, b.netz))), 0.01);

  const schritte: Malschritt[] = [
    { art: "flaeche", teile: v.blau, fuellung: FARBE_HELLBLAU },
    { art: "flaeche", teile: v.hintergrund, fuellung: FARBE_NUSS, schatten: true },
    { art: "gravur", gravur: v.gravur, farbe: GRAVUR_AUF_NUSS },
    { art: "flaeche", teile: b.klebeflaeche, fuellung: GRAVUR_AUF_NUSS },
    { art: "flaeche", teile: netzHaupt ? [netzHaupt] : [], fuellung: FARBE_BIRNE, schatten: true },
    { art: "flaeche", teile: lose, fuellung: k.loseTeileMarkieren ? FARBE_LOSE : FARBE_BIRNE },
    { art: "flaeche", teile: text, fuellung: GRAVUR_AUF_BIRNE },
    ...v.markerSchritte,
  ];
  const lage = (key: LagenKey, titel: string, p: HolzPlatte, t: Teil[], gravur: Gravur = [], klebe: Teil[] = [], textGravur: Teil[] = []): Lage => {
    const beschreibung = `Lage ${titel} – ${p.material}, ${p.staerkeMm} mm`;
    return {
      key, titel, material: p.material, staerkeMm: p.staerkeMm, teile: t, gravur, klebeflaeche: klebe,
      ...(textGravur.length ? { textGravur } : {}),
      laserSvg: laserdateien ? laserSvg(layout, beschreibung, t, gravur, klebe, textGravur) : "",
    };
  };
  return {
    lagen: [
      ...v.markerLagen,
      lage("netz", "Netz", holz.netz, netz, [], [], text),
      lage("hintergrund", "Grund", holz.grund, v.hintergrund, b.gravur, b.klebeflaeche),
      lage("blau", "Wasser", holz.blau, v.blau),
    ],
    vorschauSvg: vorschauMitHolz(layout, schritte),
    loseNetzstuecke: lose.length,
    loseTextteile: 0,
    hintergrundTeile: v.hintergrund.length,
  };
}

// Die gemeinsame Vorschau malt; nur der Titel der Datei sagt Holz.
function vorschauMitHolz(layout: Layout, schritte: Malschritt[]) {
  return vorschauSvg(layout, schritte).replace("<title>Schichtkarte – Vorschau</title>", "<title>Holzkarte – Vorschau</title>");
}

