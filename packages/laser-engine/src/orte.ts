/**
 * Was der Kunde ins Ortsfeld tippt, in Koordinaten übersetzen.
 *
 * Erwartbar ist alles, was sich irgendwo kopieren lässt: Dezimalgrad aus dem Rechtsklick
 * in Google Maps (`53.5511, 9.9937`), Grad/Minuten/Sekunden aus derselben Quelle
 * (`53°33'04.0"N 9°59'37.3"E`), eine ganze Google-Maps-Adresse, oder schlicht ein
 * Straßenname. Nur das Letzte braucht eine Suche; alles andere lässt sich hier lesen, und
 * das ist auch besser so — eine Suche, die aus Koordinaten wieder Koordinaten macht, kann
 * nur schlechter werden.
 *
 * Im Zweifel `null`. Ein falsch geratener Ort ist schlimmer als eine Rückfrage: Auf dem
 * Poster steht am Ende eine Adresse, die jemand seinen Eltern schenkt.
 */
// Aus baseline-customizer app/domain/karte/orte.ts (25.09.2026). Hier zusaetzlich `stadt` je Vorschlag: sie steht im
// Laser-Studio vor den Koordinaten ("BERLIN 52°30'59"N ..."), ohne Postleitzahl.

/** Web-Mercator reicht bis hierhin (baseline-customizer zustand.ts). */
const MAX_BREITE = 85.0511;

export interface Ortsangabe {
  lat: number;
  lon: number;
  /** Woher die Zahlen kommen — für die Anzeige im Formular. */
  art: "dezimal" | "grad" | "adresse";
}

const gueltig = (lat: number, lon: number) =>
  Number.isFinite(lat) &&
  Number.isFinite(lon) &&
  Math.abs(lat) <= MAX_BREITE &&
  Math.abs(lon) <= 180;

/** `53°33'04.0"N` → 53.5511. Minuten und Sekunden sind wahlfrei. */
const GRAD =
  /(\d{1,3})\s*°\s*(?:(\d{1,2})\s*['′]\s*(?:([\d.,]+)\s*["″])?)?\s*([NSEWOnsewo])?/;

function liesGrad(text: string): number | null {
  const t = GRAD.exec(text);
  if (!t) return null;
  const grad = Number(t[1]);
  const minuten = Number(t[2] ?? 0);
  const sekunden = Number((t[3] ?? "0").replace(",", "."));
  if (!Number.isFinite(grad) || !Number.isFinite(minuten) || !Number.isFinite(sekunden))
    return null;
  const wert = grad + minuten / 60 + sekunden / 3600;
  // S und W zählen negativ. „O" für Osten ist deutsch und bleibt positiv.
  return /[SWsw]/.test(t[4] ?? "") ? -wert : wert;
}

/** Zahlen aus einer Google-Maps-Adresse: `/@53.55,9.99,15z` oder `?q=53.55,9.99`. */
function ausAdresse(text: string): Ortsangabe | null {
  const t = /[@=](-?\d{1,3}\.\d+)[,%2C]+(-?\d{1,3}\.\d+)/i.exec(text);
  if (!t) return null;
  const lat = Number(t[1]);
  const lon = Number(t[2]);
  return gueltig(lat, lon) ? { lat, lon, art: "adresse" } : null;
}

/**
 * Koordinaten aus einer Eingabe lesen. `null` heißt „das sind keine Koordinaten" — dann
 * ist es ein Suchbegriff und gehört in die Adresssuche.
 */
export function leseOrt(eingabe: string): Ortsangabe | null {
  const text = eingabe.trim();
  if (!text) return null;
  if (/^https?:\/\//i.test(text) || text.includes("/maps")) return ausAdresse(text);

  // Grad/Minuten/Sekunden: erkennbar am Gradzeichen, das in keiner Dezimalangabe
  // zusammen mit Minuten vorkommt.
  if (text.includes("°") && /['′"″]/.test(text)) {
    const teile = text.split(/(?<=[NSEWOnsewo])\s*[,;]?\s*/).filter(Boolean);
    const stuecke = teile.length >= 2 ? teile : text.split(/\s{2,}|,|;/).filter(Boolean);
    if (stuecke.length < 2) return null;
    const a = liesGrad(stuecke[0]);
    const b = liesGrad(stuecke.slice(1).join(" "));
    if (a === null || b === null) return null;
    // Reihenfolge nach den Himmelsrichtungen, nicht nach der Position: Manche schreiben
    // die Länge zuerst.
    const ersteIstLaenge = /[EWeWoO]/.test(stuecke[0]) && !/[NSns]/.test(stuecke[0]);
    const [lat, lon] = ersteIstLaenge ? [b, a] : [a, b];
    return gueltig(lat, lon) ? { lat, lon, art: "grad" } : null;
  }

  // Dezimalgrad. Zwei Zahlen, getrennt durch Komma, Semikolon oder Leerraum. Ein Komma
  // als Dezimaltrenner (`53,5511`) wird nur akzeptiert, wenn es eindeutig bleibt — sonst
  // ist `53,5511, 9,9937` nicht von vier Zahlen zu unterscheiden.
  const ohneRichtung = text.replace(/[NSEWOnsewo°]/g, " ").trim();
  const mitPunkt = ohneRichtung.match(/-?\d{1,3}\.\d+/g);
  const zahlen =
    mitPunkt && mitPunkt.length >= 2
      ? mitPunkt
      : ohneRichtung.split(/[;\s]+/).filter(Boolean).length === 2
        ? ohneRichtung.split(/[;\s]+/).map((s) => s.replace(",", "."))
        : null;
  if (!zahlen || zahlen.length < 2) return null;
  let lat = Number(zahlen[0]);
  let lon = Number(zahlen[1]);
  if (/[SsWw]/.test(text)) {
    // Führende Himmelsrichtungen: `N 53.55 W 9.99`.
    if (/[Ss]/.test(text.split(/[\d-]/)[0] ?? "")) lat = -Math.abs(lat);
    if (/[Ww]/.test(text)) lon = -Math.abs(lon);
  }
  if (!gueltig(lat, lon)) return null;
  return { lat, lon, art: "dezimal" };
}

/** Ein Suchtreffer der Adresssuche. */
export interface Ortsvorschlag {
  /** Was fett angezeigt wird: Straße, Platz oder Ortsname. */
  name: string;
  /** Der Rest der Anschrift, grau dahinter. */
  zusatz: string;
  lat: number;
  lon: number;
  /** Ort ohne Postleitzahl – fuer die Zeile vor den Koordinaten (Laser-Studio). */
  stadt: string;
}

/**
 * Photon-Antwort in Vorschläge. Photon liefert GeoJSON mit OSM-Feldern; welche davon eine
 * lesbare Zeile ergeben, steht hier und nicht verstreut in der Oberfläche.
 */
export function leseVorschlaege(antwort: unknown, grenze = 6): Ortsvorschlag[] {
  const merkmale = (antwort as { features?: unknown[] })?.features;
  if (!Array.isArray(merkmale)) return [];
  const vorschlaege: Ortsvorschlag[] = [];
  for (const m of merkmale) {
    const f = m as {
      geometry?: { coordinates?: unknown };
      properties?: Record<string, unknown>;
    };
    const koordinaten = f.geometry?.coordinates;
    if (!Array.isArray(koordinaten) || koordinaten.length < 2) continue;
    const lon = Number(koordinaten[0]);
    const lat = Number(koordinaten[1]);
    if (!gueltig(lat, lon)) continue;
    const p = f.properties ?? {};
    const text = (wert: unknown) => (typeof wert === "string" && wert.trim() ? wert.trim() : null);
    // Die Hausnummer gehört in die **fette** Zeile, nicht in den grauen Zusatz: Zwei
    // Häuser derselben Straße wären sonst in der Liste nicht zu unterscheiden, und genau
    // dafür ist die Liste da. Photon führt sie getrennt (`street` + `housenumber`) und
    // lässt `name` bei einer Adresse leer.
    const strasse = text(p.street);
    const nummer = text(p.housenumber);
    const name =
      text(p.name) ??
      (strasse ? [strasse, nummer].filter(Boolean).join(" ") : null) ??
      text(p.city) ??
      text(p.country);
    if (!name) continue;
    const ort = [text(p.postcode), text(p.city)].filter(Boolean).join(" ");
    const zusatz = [
      // Eine Straße, die schon im Namen steht, nicht wiederholen.
      strasse && text(p.name) ? [strasse, nummer].filter(Boolean).join(" ") : null,
      ort && ort !== name ? ort : null,
      text(p.state) !== text(p.city) ? text(p.state) : null,
      text(p.country),
    ]
      .filter(Boolean)
      .join(", ");
    vorschlaege.push({ name, zusatz, lat, lon, stadt: text(p.city) ?? (p.type === "city" ? name : "") });
    if (vorschlaege.length >= grenze) break;
  }
  return vorschlaege;
}
