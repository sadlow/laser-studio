import { clipPolygon, clipPolyline, type Punkt } from "./clip";
import { TILE_EXTENT, lonLatToGlobalPx, meterProEinheit } from "./geo";
import type { KachelQuelle } from "./quelle";
import type { Zone } from "./typen";

/**
 * Rohdaten der Karte in Millimetern auf der Platte, noch ohne Entscheidung,
 * was daraus wird. Die Lagen-Logik entscheidet, welche Klasse ins Netz geht.
 *
 * Abweichung vom Laser-Studio (docs/plan-laserkarte.md): Woher die Kacheln kommen und wie ein
 * Feature heisst, entscheidet die `KachelQuelle`. Die Engine denkt weiter in den
 * Strassenklassen von mapbox-streets-v8 – daran haengen Vorlagen und Breiten –, die Quelle
 * uebersetzt ihr eigenes Schema dorthin (quelle-mapbox.ts, quelle-protomaps.ts).
 */
export interface KartenRohdaten {
  /** Linien je Strassenklasse (Vokabular mapbox-streets-v8). Tunnel sind bereits entfernt. */
  strassen: Map<string, Punkt[][]>;
  /** Davon die Brueckenstuecke, ebenfalls je Klasse. */
  bruecken: Map<string, Punkt[][]>;
  wasserFlaechen: Punkt[][];
  wasserlaeufe: Punkt[][];
  ausschnittMeter: { breite: number; hoehe: number };
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
  quelle: KachelQuelle;
  /** Abgebrochene Vorschau: noch offene Kachelabrufe enden mit. */
  signal?: AbortSignal;
}): Promise<KartenRohdaten> {
  const { lon, lat, ausschnittBreiteM, fenster, zugabeMm, quelle, signal } = opts;
  const zoom = quelle.zoom;

  const ausschnittMeter = {
    breite: ausschnittBreiteM,
    hoehe: (ausschnittBreiteM * fenster.hoeheMm) / fenster.breiteMm,
  };
  const mProEinheit = meterProEinheit(zoom, lat);
  const einheitenBreite = ausschnittMeter.breite / mProEinheit;
  const einheitenHoehe = ausschnittMeter.hoehe / mProEinheit;
  const mmProEinheit = fenster.breiteMm / einheitenBreite;

  const mitte = lonLatToGlobalPx(lon, lat, zoom);
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
        quelle.hole(zoom, tx, ty, signal).then((buf) =>
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
    for (const name of quelle.ebenen) {
      const ebene = k.tile.layers[name];
      if (!ebene) continue;
      for (let i = 0; i < ebene.length; i++) {
        const f = ebene.feature(i);
        const merkmal = quelle.ordne(name, f.properties, f.type);
        if (!merkmal) continue;
        if (merkmal.art === "strasse") {
          const liste = strassen.get(merkmal.klasse) ?? [];
          const brueckenListe = bruecken.get(merkmal.klasse) ?? [];
          for (const ring of f.loadGeometry()) {
            const coords = ring.map((p) => nachMm(p, k.x, k.y));
            for (const stueck of clipPolyline(coords, kx0, ky0, kx1, ky1)) {
              liste.push(stueck);
              if (merkmal.bruecke) brueckenListe.push(stueck);
            }
          }
          strassen.set(merkmal.klasse, liste);
          if (merkmal.bruecke) bruecken.set(merkmal.klasse, brueckenListe);
        } else if (merkmal.art === "wasserflaeche") {
          for (const ring of f.loadGeometry()) {
            const geclippt = clipPolygon(
              ring.map((p) => nachMm(p, k.x, k.y)),
              cx0, cy0, cx1, cy1,
            );
            if (geclippt.length >= 3) wasserFlaechen.push(geclippt);
          }
        } else {
          for (const ring of f.loadGeometry()) {
            const coords = ring.map((p) => nachMm(p, k.x, k.y));
            for (const stueck of clipPolyline(coords, cx0, cy0, cx1, cy1)) wasserlaeufe.push(stueck);
          }
        }
      }
    }
  }

  return { strassen, bruecken, wasserFlaechen, wasserlaeufe, ausschnittMeter };
}
