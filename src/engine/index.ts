import { berechneLayout } from "./layout";
import { baueSvg } from "./svg";
import { ladeKartenPfade } from "./tiles";
import { IST_LINIEN_EBENE, type EbenenKey, type Entwurfsergebnis, type KartenEntwurf } from "./typen";

export * from "./typen";
export { FORMATE, masseAusEntwurf } from "./formate";
export { berechneLayout } from "./layout";
export { standardEntwurf } from "./standard";

/**
 * Der einzige Einstieg: Parameter rein, SVG und Masse raus.
 *
 * Keine UI-Abhaengigkeit, kein Dateisystem, kein Zustand. Dieselbe Funktion
 * bedient die Live-Vorschau im Browser und spaeter die Produktion – sonst gibt
 * es zwei Geometrien fuer dasselbe Produkt, und die driften unbemerkt
 * auseinander.
 */
export async function rendereEntwurf(entwurf: KartenEntwurf, token: string): Promise<Entwurfsergebnis> {
  const warnungen: string[] = [];
  const layout = berechneLayout(entwurf);

  if (layout.kartenfeld.hoeheMm < 20) {
    warnungen.push("Das Kartenfeld ist unter 20 mm hoch – Rahmen oder Textfeld nehmen fast alles weg.");
  }

  const aktiveEbenen = entwurf.ebenen.filter((e) => e.rolle !== "aus").map((e) => e.key as EbenenKey);

  let pfade: Record<string, { d: string; art: "flaeche" | "linie" }[]> = {};
  let ausschnittMeter = { breite: 0, hoehe: 0 };

  if (aktiveEbenen.length > 0) {
    const ergebnis = await ladeKartenPfade({
      lon: entwurf.lon,
      lat: entwurf.lat,
      zoom: entwurf.zoom,
      kartenfeld: layout.kartenfeld,
      ebenen: aktiveEbenen,
      token,
    });
    pfade = ergebnis.pfade;
    ausschnittMeter = ergebnis.ausschnittMeter;
  } else {
    warnungen.push("Keine Kartenebene aktiv – die Platte bleibt leer.");
  }

  const svg = baueSvg({ entwurf, layout, pfade });

  const statistik = entwurf.ebenen
    .filter((e) => e.rolle !== "aus")
    .map((e) => ({ ebene: e.key, rolle: e.rolle, pfade: (pfade[e.key] ?? []).length }));

  for (const eintrag of statistik) {
    if (eintrag.pfade === 0) {
      warnungen.push(`Ebene "${eintrag.ebene}" liefert an dieser Stelle keine Daten.`);
    }
  }

  // Ehrlich benennen, was noch fehlt: solange die Texte als <text> in der Datei
  // stehen, haengt das Ergebnis davon ab, welche Schrift die Lasersoftware
  // findet. Fuer den Entwurf des Layouts reicht das, fuer den Schnitt nicht.
  if (entwurf.texte.some((t) => t.rolle !== "aus" && t.text.trim())) {
    warnungen.push("Texte sind noch nicht in Pfade umgewandelt – fuer die Produktion fehlt die Vektorisierung.");
  }

  for (const e of entwurf.ebenen) {
    if (e.rolle === "schnitt" && IST_LINIEN_EBENE[e.key]) {
      warnungen.push(
        `"${e.key}" als Schnitt: eine Strassenlinie hat keine Breite, der Laser faehrt sie als einzelnen Schnitt. ` +
          "Als Gravur ist das fast immer gemeint.",
      );
    }
  }

  return { svg, layout, ausschnittMeter, statistik, warnungen };
}
