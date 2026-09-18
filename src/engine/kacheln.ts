import { clipPolygon, clipPolyline, type Punkt } from "./clip";
import { DATEN_ZOOM, TILESET, TILE_EXTENT, lonLatToGlobalPx, meterProEinheit } from "./geo";
import type { Zone } from "./typen";

/**
 * Rohdaten der Karte in Millimetern auf der Platte, noch ohne Entscheidung,
 * was daraus wird. Die Lagen-Logik entscheidet, welche Klasse ins Netz geht.
 */
export interface KartenRohdaten {
  /** Linien je Mapbox-Strassenklasse. Tunnel sind bereits entfernt. */
  strassen: Map<string, Punkt[][]>;
  /** Davon die Brueckenstuecke (structure=bridge), ebenfalls je Klasse. */
  bruecken: Map<string, Punkt[][]>;
  wasserFlaechen: Punkt[][];
  wasserlaeufe: Punkt[][];
  ausschnittMeter: { breite: number; hoehe: number };
}

// Wasserlaeufe, die als Flaeche gelesen werden duerfen. Graeben (ditch/drain)
// sind im Massstab einer Wandkarte Rauschen.
const WASSERLAUF_KLASSEN = new Set(["river", "canal"]);

// Wegetypen, die in einer stilisierten Karte nur Rauschen sind. Gemessen an der
// Laenge aller Fuss- und Nebenwege in drei Stadtkacheln (Berlin, Muenchen,
// 16.09.2026): Gehwege 32,5 %, Einfahrten 6,7 %, Ueberwege 2,3 %, Parkplatz-
// gassen 1,7 %. Gehwege laufen parallel zu jeder Strasse und lagen als dicke
// Doppellinie in der Gravur, Ueberwege sind Stummel quer ueber die Fahrbahn.
const WEGETYPEN_OHNE = new Set([
  "sidewalk",
  "crossing",
  "service:driveway",
  "service:parking_aisle",
  "service:drive_through",
  "service:parking",
  "platform",
  "corridor",
]);

// Gleise, die es nicht (mehr) gibt: geplant, im Bau, abgerissen, aufgegeben (Schienen entfernt).
// Mapbox fuehrt sie als Nebengleise; graviert lagen in Frankfurt alte Hafenbahngleise quer ueber den
// Bloecken (31 cm Gravurweg bei 3,5 km). Stillgelegte Gleise ("disused") liegen noch und bleiben.
const NICHT_VORHANDEN = new Set(["proposed", "construction", "razed", "abandoned"]);

// Kacheln aendern sich nicht, waehrend jemand am Titel tippt. Ohne Cache laedt
// jede Aenderung im Formular die ganze Karte neu von Mapbox.
const KACHEL_CACHE = new Map<string, ArrayBuffer | null>();
const CACHE_MAX = 400;

async function ladeKachel(z: number, x: number, y: number, token: string): Promise<ArrayBuffer | null> {
  const schluessel = `${z}/${x}/${y}`;
  if (KACHEL_CACHE.has(schluessel)) return KACHEL_CACHE.get(schluessel) ?? null;
  const url = `https://api.mapbox.com/v4/${TILESET}/${z}/${x}/${y}.mvt?access_token=${encodeURIComponent(token)}`;
  const res = await fetch(url, { cache: "no-store" });
  if (res.status !== 404 && !res.ok) {
    throw new Error(`Mapbox antwortete mit HTTP ${res.status} fuer Kachel ${schluessel}`);
  }
  const daten = res.status === 404 ? null : await res.arrayBuffer();
  if (KACHEL_CACHE.size >= CACHE_MAX) {
    const aeltester = KACHEL_CACHE.keys().next().value;
    if (aeltester !== undefined) KACHEL_CACHE.delete(aeltester);
  }
  KACHEL_CACHE.set(schluessel, daten);
  return daten;
}

/**
 * Holt alle Kacheln unter dem Kartenfenster und rechnet die Geometrie auf
 * Millimeter der Platte um. Geclippt wird an einem Fenster mit Zugabe: die
 * Strassen werden erst gepuffert und dann exakt beschnitten – sonst haetten
 * sie am Fensterrand runde Enden statt gerader Kanten.
 */
export async function ladeKartenRohdaten(opts: {
  lon: number;
  lat: number;
  /** Breite des Kartenfensters in Metern Wirklichkeit. Die Hoehe folgt dem Fenster. */
  ausschnittBreiteM: number;
  fenster: Zone;
  zugabeMm: number;
  token: string;
}): Promise<KartenRohdaten> {
  const { lon, lat, ausschnittBreiteM, fenster, zugabeMm, token } = opts;

  const ausschnittMeter = {
    breite: ausschnittBreiteM,
    hoehe: (ausschnittBreiteM * fenster.hoeheMm) / fenster.breiteMm,
  };
  const mProEinheit = meterProEinheit(DATEN_ZOOM, lat);
  const einheitenBreite = ausschnittMeter.breite / mProEinheit;
  const einheitenHoehe = ausschnittMeter.hoehe / mProEinheit;
  const mmProEinheit = fenster.breiteMm / einheitenBreite;

  const mitte = lonLatToGlobalPx(lon, lat, DATEN_ZOOM);
  // Das Fenster wird um die Zugabe erweitert – auch beim Kachelabruf.
  const zugabeEinheiten = zugabeMm / mmProEinheit;
  const links = mitte.x - einheitenBreite / 2;
  const oben = mitte.y - einheitenHoehe / 2;

  const tx0 = Math.floor((links - zugabeEinheiten) / TILE_EXTENT);
  const tx1 = Math.floor((links + einheitenBreite + zugabeEinheiten) / TILE_EXTENT);
  const ty0 = Math.floor((oben - zugabeEinheiten) / TILE_EXTENT);
  const ty1 = Math.floor((oben + einheitenHoehe + zugabeEinheiten) / TILE_EXTENT);

  const { VectorTile } = await import("@mapbox/vector-tile");
  const Pbf = (await import("pbf")).default;

  const anfragen: Promise<{ x: number; y: number; tile: InstanceType<typeof VectorTile> } | null>[] = [];
  for (let tx = tx0; tx <= tx1; tx++) {
    for (let ty = ty0; ty <= ty1; ty++) {
      anfragen.push(
        ladeKachel(DATEN_ZOOM, tx, ty, token).then((buf) =>
          buf && buf.byteLength ? { x: tx, y: ty, tile: new VectorTile(new Pbf(new Uint8Array(buf))) } : null,
        ),
      );
    }
  }
  const kacheln = (await Promise.all(anfragen)).filter((k) => k !== null);

  const nachMm = (p: Punkt, tx: number, ty: number): Punkt => ({
    x: fenster.xMm + (tx * TILE_EXTENT + p.x - links) * mmProEinheit,
    y: fenster.yMm + (ty * TILE_EXTENT + p.y - oben) * mmProEinheit,
  });

  const cx0 = fenster.xMm - zugabeMm;
  const cy0 = fenster.yMm - zugabeMm;
  const cx1 = fenster.xMm + fenster.breiteMm + zugabeMm;
  const cy1 = fenster.yMm + fenster.hoeheMm + zugabeMm;

  const strassen = new Map<string, Punkt[][]>();
  const bruecken = new Map<string, Punkt[][]>();
  const wasserFlaechen: Punkt[][] = [];
  const wasserlaeufe: Punkt[][] = [];

  for (const k of kacheln) {
    // Strassen nur im eigenen Kachelfeld: der Puffer am Kachelrand enthaelt dieselbe Strasse aus der Nachbarkachel.
    // Doppelt stoert das Netz nicht, aber die Liniengravur faehrt sie zweimal ab – an einer Kachelecke viermal
    // (Gravurprobe 17.09.2026: dort fast ein Loch im Weiss).
    const ecke = nachMm({ x: 0, y: 0 }, k.x, k.y);
    const gegenecke = nachMm({ x: TILE_EXTENT, y: TILE_EXTENT }, k.x, k.y);
    const [kx0, ky0, kx1, ky1] = [Math.max(cx0, ecke.x), Math.max(cy0, ecke.y), Math.min(cx1, gegenecke.x), Math.min(cy1, gegenecke.y)];
    const road = k.tile.layers.road;
    if (road) {
      for (let i = 0; i < road.length; i++) {
        const f = road.feature(i);
        // Nur Linien. Punkte sind Ampeln und Schilder, Flaechen sind Plaetze.
        if (f.type !== 2) continue;
        // Tunnel liegen unter der Erde – als Acrylstreifen laegen sie mitten
        // auf einem Stadtblock. Gemessen: Berlin-Tiergarten hat 21 Tunnelstuecke.
        if (f.properties.structure === "tunnel") continue;
        const typ = String(f.properties.type ?? "");
        if (WEGETYPEN_OHNE.has(typ) || NICHT_VORHANDEN.has(typ)) continue;
        const klasse = String(f.properties.class ?? "");
        const liste = strassen.get(klasse) ?? [];
        const brueckenListe = bruecken.get(klasse) ?? [];
        const bruecke = f.properties.structure === "bridge";
        for (const ring of f.loadGeometry()) {
          const coords = ring.map((p) => nachMm(p, k.x, k.y));
          for (const stueck of clipPolyline(coords, kx0, ky0, kx1, ky1)) {
            liste.push(stueck);
            if (bruecke) brueckenListe.push(stueck);
          }
        }
        strassen.set(klasse, liste);
        if (bruecke) bruecken.set(klasse, brueckenListe);
      }
    }

    const water = k.tile.layers.water;
    if (water) {
      for (let i = 0; i < water.length; i++) {
        const f = water.feature(i);
        if (f.type !== 3) continue;
        for (const ring of f.loadGeometry()) {
          const geclippt = clipPolygon(
            ring.map((p) => nachMm(p, k.x, k.y)),
            cx0, cy0, cx1, cy1,
          );
          if (geclippt.length >= 3) wasserFlaechen.push(geclippt);
        }
      }
    }

    const waterway = k.tile.layers.waterway;
    if (waterway) {
      for (let i = 0; i < waterway.length; i++) {
        const f = waterway.feature(i);
        if (f.type !== 2 || !WASSERLAUF_KLASSEN.has(String(f.properties.class))) continue;
        for (const ring of f.loadGeometry()) {
          const coords = ring.map((p) => nachMm(p, k.x, k.y));
          for (const stueck of clipPolyline(coords, cx0, cy0, cx1, cy1)) wasserlaeufe.push(stueck);
        }
      }
    }
  }

  return { strassen, bruecken, wasserFlaechen, wasserlaeufe, ausschnittMeter };
}
