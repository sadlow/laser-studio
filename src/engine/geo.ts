// Web-Mercator-Mathematik, uebernommen aus
// extendscript-bulk-processing/tools/fetch-vector-tiles.js.
// Nicht neu hergeleitet: die Werte sind dort an echten Drucken kalibriert.

/** mapbox-streets-v8 liefert 4096 Einheiten je Kachel. */
export const TILE_EXTENT = 4096;
export const TILESET = "mapbox.mapbox-streets-v8";

/**
 * Datendetail. Bleibt fest bei 14 – die dichteste Stufe von mapbox-streets-v8.
 * Der eingestellte Zoom steuert nur den Ausschnitt, nicht die Datenmenge.
 */
export const DATEN_ZOOM = 14;

/** Lat/Lon -> globale Kachel-Einheiten (TILE_EXTENT je Kachel). */
export function lonLatToGlobalPx(lon: number, lat: number, z: number) {
  const n = Math.pow(2, z);
  const tx = ((lon + 180) / 360) * n;
  const latRad = (lat * Math.PI) / 180;
  const ty = ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n;
  return { x: tx * TILE_EXTENT, y: ty * TILE_EXTENT };
}

/** Globale Kachel-Einheiten -> Lat/Lon (Umkehrung von lonLatToGlobalPx). */
export function globalPxToLonLat(x: number, y: number, z: number) {
  const n = Math.pow(2, z);
  const lon = (x / TILE_EXTENT / n) * 360 - 180;
  const lat = (Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / TILE_EXTENT / n))) * 180) / Math.PI;
  return { lon, lat };
}

/**
 * Ort -> mm auf der Platte und zurueck, fuer ein Kartenfenster mit gegebener
 * Mitte und Breite in Metern. Dieselbe Abbildung wie in kacheln.ts – sonst
 * saesse das Herz neben der Strasse, die es markiert.
 */
export function ortZuMm(
  ort: { lon: number; lat: number },
  mitte: { lon: number; lat: number },
  ausschnittBreiteM: number,
  fenster: { xMm: number; yMm: number; breiteMm: number; hoeheMm: number },
) {
  const mmProEinheit = fenster.breiteMm / (ausschnittBreiteM / meterProEinheit(DATEN_ZOOM, mitte.lat));
  const c = lonLatToGlobalPx(mitte.lon, mitte.lat, DATEN_ZOOM);
  const p = lonLatToGlobalPx(ort.lon, ort.lat, DATEN_ZOOM);
  return {
    x: fenster.xMm + fenster.breiteMm / 2 + (p.x - c.x) * mmProEinheit,
    y: fenster.yMm + fenster.hoeheMm / 2 + (p.y - c.y) * mmProEinheit,
  };
}

export function mmZuOrt(
  p: { x: number; y: number },
  mitte: { lon: number; lat: number },
  ausschnittBreiteM: number,
  fenster: { xMm: number; yMm: number; breiteMm: number; hoeheMm: number },
) {
  const mmProEinheit = fenster.breiteMm / (ausschnittBreiteM / meterProEinheit(DATEN_ZOOM, mitte.lat));
  const c = lonLatToGlobalPx(mitte.lon, mitte.lat, DATEN_ZOOM);
  return globalPxToLonLat(
    c.x + (p.x - fenster.xMm - fenster.breiteMm / 2) / mmProEinheit,
    c.y + (p.y - fenster.yMm - fenster.hoeheMm / 2) / mmProEinheit,
    DATEN_ZOOM,
  );
}

/** Meter je Kachel-Einheit bei gegebenem Zoom und Breitengrad. */
export function meterProEinheit(zoom: number, lat: number) {
  const meterProKachel = (40075016.686 / Math.pow(2, zoom)) * Math.cos((lat * Math.PI) / 180);
  return meterProKachel / TILE_EXTENT;
}

/**
 * Welchem Mapbox-Zoom entspricht ein Ausschnitt? Nur zur Orientierung – das
 * Bulk-Script und Mapbox Studio denken in Zoomstufen. Bezug wie bei Mapbox
 * Static Maps: 1 Kachel = 256 Pixel bei 96 dpi.
 */
export function zoomEntsprechung(ausschnittBreiteM: number, kartenBreiteMm: number, lat: number): number {
  const mmProKachel = 256 / 3.779528;
  const meterProKachel = (ausschnittBreiteM / kartenBreiteMm) * mmProKachel;
  return Math.log2((40075016.686 * Math.cos((lat * Math.PI) / 180)) / meterProKachel);
}

/**
 * Grad/Minuten/Sekunden wie auf dem Koordinatenposter: ganze Sekunden,
 * deutsches "O" fuer Ost. Uebernommen aus decimalToDMS() im Bulk-Script,
 * damit Poster und Acrylkarte dieselbe Zeile tragen.
 */
export function gms(wert: number, art: "breite" | "laenge"): string {
  const abs = Math.abs(wert);
  let grad = Math.floor(abs);
  let minuten = Math.floor((abs - grad) * 60);
  let sekunden = Math.round(abs * 3600 - grad * 3600 - minuten * 60);
  if (sekunden >= 60) {
    sekunden -= 60;
    minuten += 1;
  }
  if (minuten >= 60) {
    minuten -= 60;
    grad += 1;
  }
  const richtung = art === "breite" ? (wert >= 0 ? "N" : "S") : wert >= 0 ? "O" : "W";
  // ‘ und “ wie auf dem Poster: InDesign macht aus ' und " typografische
  // Anfuehrungszeichen, in Avant Garde schraege Striche statt senkrechter.
  return `${grad}°${minuten}‘${sekunden}“${richtung}`;
}
