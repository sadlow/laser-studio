// Web-Mercator-Mathematik, uebernommen aus
// extendscript-bulk-processing/tools/fetch-vector-tiles.js.
// Nicht neu hergeleitet: die Werte sind dort an echten Drucken kalibriert.

/** mapbox-streets-v8 liefert 4096 Einheiten je Tile. */
export const TILE_EXTENT = 4096;
export const TILESET = "mapbox.mapbox-streets-v8";

/**
 * Datendetail. Bleibt fest bei 14, auch wenn der Ausschnitt weiter oder enger
 * wird – z14 ist die dichteste Stufe von mapbox-streets-v8. Der Ausschnitt
 * kommt ueber die Meter-Rechnung, nicht ueber die Tile-Stufe.
 */
export const DATEN_ZOOM = 14;

export function lonLatToTile(lon: number, lat: number, z: number) {
  const n = Math.pow(2, z);
  const x = Math.floor(((lon + 180) / 360) * n);
  const latRad = (lat * Math.PI) / 180;
  const y = Math.floor(((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n);
  return { x, y };
}

/** Lat/Lon -> globale Tile-Pixel (TILE_EXTENT Einheiten je Tile). */
export function lonLatToGlobalPx(lon: number, lat: number, z: number) {
  const n = Math.pow(2, z);
  const tx = ((lon + 180) / 360) * n;
  const latRad = (lat * Math.PI) / 180;
  const ty = ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n;
  return { x: tx * TILE_EXTENT, y: ty * TILE_EXTENT };
}

/** Meter je Tile-Pixel-Einheit bei gegebenem Zoom und Breitengrad. */
export function meterProEinheit(zoom: number, lat: number) {
  const erdumfang = 40075016.686;
  const meterProTile = (erdumfang / Math.pow(2, zoom)) * Math.cos((lat * Math.PI) / 180);
  return meterProTile / TILE_EXTENT;
}

/**
 * Wieviel Welt zeigt die Karte? Der Anzeige-Zoom bestimmt den Massstab, die
 * Plattengroesse die Kantenlaenge. Ein Zoom weniger zeigt die doppelte Strecke.
 */
export function ausschnittInMetern(zoom: number, lat: number, breiteMm: number, hoeheMm: number) {
  // Bezug: bei Zoom z entspricht ein Tile 256 Display-Pixeln; als Druckmass
  // rechnen wir 1 Tile auf 256 / 3.7795 mm (96 dpi). Der Faktor ist damit
  // dieselbe Groesse, die auch Mapbox-Static-Maps zugrunde legt.
  const mmProTile = 256 / 3.779528;
  const meterProTile = (40075016.686 / Math.pow(2, zoom)) * Math.cos((lat * Math.PI) / 180);
  const meterProMm = meterProTile / mmProTile;
  return { breite: breiteMm * meterProMm, hoehe: hoeheMm * meterProMm };
}
