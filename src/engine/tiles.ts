import { clipPolygon, clipPolyline, type Punkt } from "./clip";
import { DATEN_ZOOM, TILESET, TILE_EXTENT, ausschnittInMetern, lonLatToGlobalPx, meterProEinheit } from "./geo";
import type { EbenenKey, Zone } from "./typen";

// Filter je Ausgabe-Ebene, uebernommen aus fetch-vector-tiles.js.
// Welche Strassenklasse als "Hauptstrasse" gilt, ist dort an echten Karten
// festgelegt worden – nicht neu erfinden.
const STRASSEN_HAUPT = new Set([
  "motorway", "motorway_link",
  "trunk", "trunk_link",
  "primary", "primary_link",
  "secondary", "secondary_link",
  "tertiary", "tertiary_link",
  "street", "street_limited",
  "service",
]);

const GRUEN_LANDUSE = new Set(["park", "cemetery", "pitch", "golf_course", "school", "hospital", "wood"]);
const GRUEN_LANDCOVER = new Set(["wood", "grass", "scrub"]);

interface QuellDef {
  layer: string;
  nimm: (klasse: string) => boolean;
}

const QUELLEN: Record<EbenenKey, QuellDef[]> = {
  water: [
    { layer: "water", nimm: () => true },
    { layer: "waterway", nimm: () => true },
  ],
  roads: [{ layer: "road", nimm: (k) => STRASSEN_HAUPT.has(k) }],
  streets: [{ layer: "road", nimm: () => true }],
  green: [
    { layer: "landcover", nimm: (k) => GRUEN_LANDCOVER.has(k) },
    { layer: "landuse", nimm: (k) => GRUEN_LANDUSE.has(k) },
  ],
  buildings: [{ layer: "building", nimm: () => true }],
};

export interface Pfad {
  d: string;
  art: "flaeche" | "linie";
}

interface TileDaten {
  x: number;
  y: number;
  tile: unknown;
}

/** Laedt eine einzelne Kachel. 404 heisst: dort gibt es keine Daten (z.B. offenes Meer). */
async function ladeTile(z: number, x: number, y: number, token: string): Promise<ArrayBuffer | null> {
  const url = `https://api.mapbox.com/v4/${TILESET}/${z}/${x}/${y}.mvt?access_token=${encodeURIComponent(token)}`;
  const res = await fetch(url, { cache: "no-store" });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Mapbox antwortete mit HTTP ${res.status} fuer Kachel ${z}/${x}/${y}`);
  return await res.arrayBuffer();
}

/**
 * Holt alle Kacheln, die das Kartenfeld abdecken, und liefert die Pfade je
 * Ebene bereits in **Millimetern auf der Platte**.
 *
 * Das ist der Unterschied zum alten Werkzeug: dort endet die Rechnung in
 * Tile-Pixeln und eine viewBox macht daraus wieder ein Mass. Hier ist das
 * Millimeter-Mass das Ergebnis, und das Layout gibt es vor.
 */
export async function ladeKartenPfade(opts: {
  lon: number;
  lat: number;
  zoom: number;
  kartenfeld: Zone;
  ebenen: EbenenKey[];
  token: string;
}): Promise<{ pfade: Record<string, Pfad[]>; ausschnittMeter: { breite: number; hoehe: number } }> {
  const { lon, lat, zoom, kartenfeld, ebenen, token } = opts;

  // 1. Wieviel Welt zeigt die Platte, und wieviele Tile-Einheiten sind das?
  const ausschnittMeter = ausschnittInMetern(zoom, lat, kartenfeld.breiteMm, kartenfeld.hoeheMm);
  const mProEinheit = meterProEinheit(DATEN_ZOOM, lat);
  const einheitenBreite = ausschnittMeter.breite / mProEinheit;
  const einheitenHoehe = ausschnittMeter.hoehe / mProEinheit;

  // 2. Fensterausschnitt in globalen Tile-Pixeln, zentriert auf den Ort.
  const mitte = lonLatToGlobalPx(lon, lat, DATEN_ZOOM);
  const links = mitte.x - einheitenBreite / 2;
  const oben = mitte.y - einheitenHoehe / 2;

  // 3. Welche Kacheln beruehrt dieses Fenster?
  const tileX0 = Math.floor(links / TILE_EXTENT);
  const tileX1 = Math.floor((links + einheitenBreite) / TILE_EXTENT);
  const tileY0 = Math.floor(oben / TILE_EXTENT);
  const tileY1 = Math.floor((oben + einheitenHoehe) / TILE_EXTENT);

  const { VectorTile } = await import("@mapbox/vector-tile");
  const Pbf = (await import("pbf")).default;

  const anfragen: Promise<TileDaten | null>[] = [];
  for (let tx = tileX0; tx <= tileX1; tx++) {
    for (let ty = tileY0; ty <= tileY1; ty++) {
      anfragen.push(
        ladeTile(DATEN_ZOOM, tx, ty, token).then((buf) =>
          buf && buf.byteLength > 0 ? { x: tx, y: ty, tile: new VectorTile(new Pbf(new Uint8Array(buf))) } : null,
        ),
      );
    }
  }
  const kacheln = (await Promise.all(anfragen)).filter((k): k is TileDaten => k !== null);

  // 4. Umrechnung Tile-Einheit -> mm auf der Platte.
  const mmProEinheitX = kartenfeld.breiteMm / einheitenBreite;
  const mmProEinheitY = kartenfeld.hoeheMm / einheitenHoehe;

  const nachMm = (pt: Punkt, tx: number, ty: number): Punkt => ({
    x: kartenfeld.xMm + (tx * TILE_EXTENT + pt.x - links) * mmProEinheitX,
    y: kartenfeld.yMm + (ty * TILE_EXTENT + pt.y - oben) * mmProEinheitY,
  });

  // Clipping-Rechteck ist das Kartenfeld selbst, ohne Zugabe: was darueber
  // hinausragt, wuerde der Laser in den Rahmen fahren.
  const cx0 = kartenfeld.xMm;
  const cy0 = kartenfeld.yMm;
  const cx1 = kartenfeld.xMm + kartenfeld.breiteMm;
  const cy1 = kartenfeld.yMm + kartenfeld.hoeheMm;

  const pfade: Record<string, Pfad[]> = {};
  for (const ebene of ebenen) pfade[ebene] = [];

  for (const kachel of kacheln) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const layers = (kachel.tile as any).layers as Record<string, any>;
    for (const ebene of ebenen) {
      for (const quelle of QUELLEN[ebene]) {
        const layer = layers[quelle.layer];
        if (!layer) continue;
        for (let i = 0; i < layer.length; i++) {
          const feature = layer.feature(i);
          const klasse = String(feature.properties?.class ?? "");
          if (!quelle.nimm(klasse)) continue;
          for (const p of featureNachPfaden(feature, kachel.x, kachel.y, nachMm, cx0, cy0, cx1, cy1)) {
            pfade[ebene].push(p);
          }
        }
      }
    }
  }

  return { pfade, ausschnittMeter };
}

/** Vector-Tile-Feature -> SVG-Pfade in mm. Typ 1=Punkt, 2=Linie, 3=Flaeche. */
function featureNachPfaden(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  feature: any,
  tx: number,
  ty: number,
  nachMm: (p: Punkt, tx: number, ty: number) => Punkt,
  cx0: number,
  cy0: number,
  cx1: number,
  cy1: number,
): Pfad[] {
  const geom = feature.loadGeometry() as Punkt[][];
  const typ = feature.type as number;
  const out: Pfad[] = [];

  if (typ === 2) {
    for (const ring of geom) {
      if (ring.length < 2) continue;
      const coords = ring.map((pt) => nachMm(pt, tx, ty));
      for (const stueck of clipPolyline(coords, cx0, cy0, cx1, cy1)) {
        if (stueck.length < 2) continue;
        out.push({ d: alsPfad(stueck, false), art: "linie" });
      }
    }
  } else if (typ === 3) {
    for (const ring of geom) {
      if (ring.length < 3) continue;
      const coords = ring.map((pt) => nachMm(pt, tx, ty));
      const geclippt = clipPolygon(coords, cx0, cy0, cx1, cy1);
      if (geclippt.length < 3) continue;
      out.push({ d: alsPfad(geclippt, true), art: "flaeche" });
    }
  }
  // Punkte (Typ 1) tragen auf einer Lasergravur nichts bei und werden verworfen.
  return out;
}

function alsPfad(punkte: Punkt[], geschlossen: boolean): string {
  let d = "";
  for (let i = 0; i < punkte.length; i++) {
    d += (i === 0 ? "M" : "L") + punkte[i].x.toFixed(2) + "," + punkte[i].y.toFixed(2) + " ";
  }
  return geschlossen ? d.trim() + " Z" : d.trim();
}
