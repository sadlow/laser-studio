import type { KachelQuelle, Merkmal } from "./quelle";

/**
 * Das eigene Kartenarchiv (Protomaps Basemap 4, OpenStreetMap) im Vokabular der Engine.
 *
 * Abgeleitet aus einem Abgleich Kachel fuer Kachel an den acht Referenzorten (24.09.2026,
 * Protomaps 4.15.2 gegen mapbox-streets-v8, Laenge je Klassenpaar; docs/plan-laserkarte.md):
 * Haupt- und Nebenstrassen, Wohnstrassen, Fuss- und Radwege, Feldwege, Gleise decken sich zu
 * 88-98 %. Gelesen wird Zoom 15 – auf 14 fehlen dem Archiv ein Fuenftel der Zufahrten und die
 * Haelfte der Privatstrassen, die Mapbox auf 14 fuehrt.
 *
 * Nicht uebersetzbar: Mapbox trennt Einfahrten und Parkplatzgassen von den Zufahrten
 * (`service:driveway`, `service:parking_aisle`, im Laser-Studio weggelassen). Das Archiv fuehrt
 * sie trotz Dokumentation als gewoehnliches `minor_road/service` – nachgezaehlt in vier Staedten.
 * Sie landen deshalb bei den Zufahrten.
 */
export const ARCHIV_ZOOM = 15;

// Bei Mapbox eigene Wegetypen, die das Laser-Studio weglaesst (WEGETYPEN_OHNE): Gehwege,
// Ueberwege, Einfahrten, Parkplatzgassen, Bahnsteige, Gaenge in Gebaeuden.
const WEG_OHNE = new Set(["sidewalk", "crossing", "driveway", "parking_aisle", "drive-through", "parking", "platform", "corridor"]);

// Gleise, die es nicht (mehr) gibt – wie NICHT_VORHANDEN im Laser-Studio. Stillgelegte bleiben.
const GLEIS_WEG = new Set(["proposed", "construction", "razed", "abandoned"]);

// Mapbox fuehrt diese als major_rail (gemessen: subway 88 %, rail 98 %); die uebrigen – Stadtbahn,
// Strassenbahn, Standseilbahn, Einschienenbahn, Parkeisenbahn – als minor_rail.
const HAUPTGLEIS = new Set(["rail", "subway", "narrow_gauge", "preserved"]);

// Strassenklassen, die in beiden Schemas gleich heissen.
const GLEICH = new Set([
  "motorway", "motorway_link", "trunk", "trunk_link", "primary", "primary_link",
  "secondary", "secondary_link", "tertiary", "tertiary_link",
]);

// Wasserflaechen, die Mapbox nicht als Wasser fuehrt: Brunnen und Becken standen sonst als
// geschnittene Loecher im Schwarz, Riffe und Salzpfannen sind kein Wasser zum Ausschneiden.
const WASSER_OHNE = new Set(["fountain", "swimming_pool", "reef", "playa"]);
const WASSERLAUF = new Set(["river", "canal"]);

const text = (w: unknown) => (typeof w === "string" ? w : "");
const ja = (w: unknown) => w === true || w === "true" || w === "yes" || w === 1;

/** Strasse, Weg oder Gleis in die Klasse von mapbox-streets-v8. */
export function strassenKlasse(p: Record<string, unknown>): string | null {
  const art = text(p.kind);
  const detail = text(p.kind_detail);
  const zugang = text(p.access);
  switch (art) {
    case "highway":
    case "major_road":
      return GLEICH.has(detail) ? detail : null;
    case "minor_road":
      if (detail === "service") return "service";
      if (WEG_OHNE.has(detail)) return null;
      if (detail === "raceway") return "street_limited";
      // Zugang beschraenkt heisst bei Mapbox street_limited (gemessen: Privatstrassen 77 %).
      return zugang === "private" || zugang === "no" ? "street_limited" : "street";
    case "other":
      if (detail === "living_street") return "street";
      if (detail === "busway" || detail === "alley" || detail === "emergency_access") return "service";
      return null;
    case "path":
      if (WEG_OHNE.has(detail)) return null;
      if (detail === "pedestrian" || detail === "track") return detail;
      if (detail === "alley") return "service";
      return "path";
    case "rail":
      if (GLEIS_WEG.has(detail)) return null;
      if (text(p.service) || detail === "disused") return "service_rail";
      return HAUPTGLEIS.has(detail) ? "major_rail" : "minor_rail";
    default:
      // Faehren, Seilbahnen, Rollfelder, Anleger: keine Strassen einer Wandkarte.
      return null;
  }
}

export function ordneProtomaps(ebene: string, p: Record<string, unknown>, typ: number): Merkmal | null {
  if (ebene === "roads") {
    // Nur Linien, und nie, was unter der Erde liegt (Mapbox: structure=tunnel).
    if (typ !== 2 || ja(p.is_tunnel)) return null;
    const klasse = strassenKlasse(p);
    return klasse ? { art: "strasse", klasse, bruecke: ja(p.is_bridge) } : null;
  }
  if (ebene === "water") {
    const art = text(p.kind);
    if (typ === 3) return WASSER_OHNE.has(art) ? null : { art: "wasserflaeche" };
    // Verrohrte Abschnitte liegen unter der Erde wie ein Tunnel.
    if (typ === 2 && WASSERLAUF.has(art) && !text(p.tunnel)) return { art: "wasserlauf" };
  }
  return null;
}

/** Das eigene Archiv; `hole` liefert entpackte Kachelbytes (Zwischenspeicher liegt beim Aufrufer). */
export function protomapsQuelle(hole: KachelQuelle["hole"]): KachelQuelle {
  return { name: "protomaps-4", zoom: ARCHIV_ZOOM, ebenen: ["roads", "water"], hole, ordne: ordneProtomaps };
}
