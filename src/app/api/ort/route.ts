import { NextResponse } from "next/server";

export const runtime = "nodejs";

interface Treffer {
  center: [number, number];
  text?: string;
  text_de?: string;
  place_name?: string;
  place_name_de?: string;
  place_type?: string[];
  context?: { id: string; text_de?: string; text?: string }[];
}

/**
 * Adresse -> Koordinaten und Ortsname (`q`), oder Koordinaten -> Ortsname
 * (`lon`, `lat`, fuer eingefuegte Google-Koordinaten). Dieselbe Mapbox-
 * Geocoding-Abfrage wie tools/get-map-data.sh im Bulk-Script (deutsch, bester Treffer).
 */
export async function GET(request: Request) {
  const token = process.env.MAPBOX_ACCESS_TOKEN;
  const p = new URL(request.url).searchParams;
  const adresse = p.get("q")?.trim();
  const lon = Number(p.get("lon"));
  const lat = Number(p.get("lat"));
  const rueckwaerts = p.has("lon") && p.has("lat") && Number.isFinite(lon) && Number.isFinite(lat);
  if (!token) return NextResponse.json({ fehler: "MAPBOX_ACCESS_TOKEN fehlt." }, { status: 500 });
  if (!adresse && !rueckwaerts) return NextResponse.json({ fehler: "Keine Adresse angegeben." }, { status: 400 });

  const suche = rueckwaerts ? `${lon},${lat}` : encodeURIComponent(adresse!);
  const url =
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${suche}.json` +
    `?access_token=${encodeURIComponent(token)}&language=de&limit=1${rueckwaerts ? "&types=address,place" : ""}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) return NextResponse.json({ fehler: `Geocoding HTTP ${res.status}` }, { status: 502 });

  const daten = await res.json();
  const treffer: Treffer | undefined = daten.features?.[0];
  if (!treffer) {
    if (rueckwaerts) return NextResponse.json({ lon, lat, adresse: "", stadt: "" });
    return NextResponse.json({ fehler: `Nichts gefunden fuer "${adresse}".` }, { status: 404 });
  }

  // Stadt: bei Adressen steht sie im Kontext, bei Orten ist es der Treffer selbst.
  const kontext = treffer.context ?? [];
  const stadt =
    kontext.find((c) => c.id.startsWith("place"))?.text_de ??
    kontext.find((c) => c.id.startsWith("place"))?.text ??
    (String(treffer.place_type?.[0]) === "place" ? (treffer.text_de ?? treffer.text) : "");

  return NextResponse.json({
    // Rueckwaerts bleiben die eingegebenen Koordinaten – der Treffer liegt nur in der Naehe.
    lon: rueckwaerts ? lon : treffer.center[0],
    lat: rueckwaerts ? lat : treffer.center[1],
    adresse: treffer.place_name_de ?? treffer.place_name ?? "",
    stadt: stadt ?? "",
  });
}
