import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * Adresse -> Koordinaten und Ortsname. Dieselbe Mapbox-Geocoding-Abfrage wie
 * tools/get-map-data.sh im Bulk-Script (deutsch, bester Treffer).
 */
export async function GET(request: Request) {
  const token = process.env.MAPBOX_ACCESS_TOKEN;
  const adresse = new URL(request.url).searchParams.get("q")?.trim();
  if (!token) return NextResponse.json({ fehler: "MAPBOX_ACCESS_TOKEN fehlt." }, { status: 500 });
  if (!adresse) return NextResponse.json({ fehler: "Keine Adresse angegeben." }, { status: 400 });

  const url =
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(adresse)}.json` +
    `?access_token=${encodeURIComponent(token)}&language=de&limit=1`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) return NextResponse.json({ fehler: `Geocoding HTTP ${res.status}` }, { status: 502 });

  const daten = await res.json();
  const treffer = daten.features?.[0];
  if (!treffer) return NextResponse.json({ fehler: `Nichts gefunden fuer "${adresse}".` }, { status: 404 });

  // Stadt: bei Adressen steht sie im Kontext, bei Orten ist es der Treffer selbst.
  const kontext: { id: string; text_de?: string; text?: string }[] = treffer.context ?? [];
  const stadt =
    kontext.find((c) => c.id.startsWith("place"))?.text_de ??
    kontext.find((c) => c.id.startsWith("place"))?.text ??
    (String(treffer.place_type?.[0]) === "place" ? (treffer.text_de ?? treffer.text) : "");

  return NextResponse.json({
    lon: treffer.center[0],
    lat: treffer.center[1],
    adresse: treffer.place_name_de ?? treffer.place_name,
    stadt: stadt ?? "",
  });
}
