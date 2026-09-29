import { TILESET } from "./geo";
import type { KachelQuelle, Merkmal } from "./quelle";

/**
 * Die Regeln des Laser-Studios fuer mapbox-streets-v8, unveraendert aus dessen kacheln.ts
 * (Stand 4530558, 19.09.2026). Nur noch fuer den Abgleich mit dem eigenen Archiv
 * (scripts/messe-laserkarte-orte.ts) – der Customizer verkauft nichts aus Mapbox-Daten.
 */

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

export function ordneMapbox(ebene: string, p: Record<string, unknown>, typ: number): Merkmal | null {
  if (ebene === "road") {
    // Nur Linien. Punkte sind Ampeln und Schilder, Flaechen sind Plaetze.
    if (typ !== 2) return null;
    // Tunnel liegen unter der Erde – als Acrylstreifen laegen sie mitten
    // auf einem Stadtblock. Gemessen: Berlin-Tiergarten hat 21 Tunnelstuecke.
    if (p.structure === "tunnel") return null;
    const art = String(p.type ?? "");
    if (WEGETYPEN_OHNE.has(art) || NICHT_VORHANDEN.has(art)) return null;
    return { art: "strasse", klasse: String(p.class ?? ""), bruecke: p.structure === "bridge" };
  }
  if (ebene === "water") return typ === 3 ? { art: "wasserflaeche" } : null;
  if (ebene === "waterway") return typ === 2 && WASSERLAUF_KLASSEN.has(String(p.class)) ? { art: "wasserlauf" } : null;
  return null;
}

/** Mapbox-Kacheln ueber das Netz; `hole` liefert die Bytes (mit Token, Zwischenspeicher liegt beim Aufrufer). */
export function mapboxQuelle(hole: KachelQuelle["hole"]): KachelQuelle {
  return { name: TILESET, zoom: 14, ebenen: ["road", "water", "waterway"], hole, ordne: ordneMapbox };
}

// --- Laser-Studio: Mapbox bleibt als Rueckfall, wenn das eigene Archiv nicht erreichbar ist (Marcel 25.09.2026). ---

// Kacheln aendern sich nicht, waehrend jemand am Titel tippt. Am globalen Objekt: der Entwicklungsserver laedt das
// Modul bei jeder Codeaenderung neu und behielt sonst jede alte Kopie samt Kacheln – nach drei Tagen 6 GB (19.09.2026).
const ablage = globalThis as typeof globalThis & { __laserKacheln?: Map<string, ArrayBuffer | null> };
const KACHEL_CACHE = (ablage.__laserKacheln ??= new Map<string, ArrayBuffer | null>());
const CACHE_MAX = 400;

/** Mapbox-Kacheln mit dem Token, wie bis 25.09.2026 fest verdrahtet in kacheln.ts. */
export function mapboxTokenQuelle(token: string): KachelQuelle {
  return mapboxQuelle(async (z, x, y, signal) => {
    const schluessel = `${z}/${x}/${y}`;
    if (KACHEL_CACHE.has(schluessel)) return KACHEL_CACHE.get(schluessel) ?? null;
    const url = `https://api.mapbox.com/v4/${TILESET}/${z}/${x}/${y}.mvt?access_token=${encodeURIComponent(token)}`;
    const res = await fetch(url, { cache: "no-store", signal });
    if (res.status !== 404 && !res.ok) throw new Error(`Mapbox antwortete mit HTTP ${res.status} fuer Kachel ${schluessel}`);
    const daten = res.status === 404 ? null : await res.arrayBuffer();
    if (KACHEL_CACHE.size >= CACHE_MAX) {
      const aeltester = KACHEL_CACHE.keys().next().value;
      if (aeltester !== undefined) KACHEL_CACHE.delete(aeltester);
    }
    KACHEL_CACHE.set(schluessel, daten);
    return daten;
  });
}
