import { NextResponse } from "next/server";
import { ortBei, OrtsucheFehler, sucheOrte } from "@/server/orte";

export const runtime = "nodejs";

/**
 * Adresssuche wie im Baseline Customizer (Photon, OpenStreetMap): `?q=Goerzallee 256` -> Vorschlagsliste,
 * `?lon=…&lat=…` -> der naechste Ort (fuer eingefuegte Koordinaten). Ueber den Server, damit gedrosselt und
 * zwischengespeichert wird. Die alte Mapbox-Suche (`/api/ort`) bleibt der Rueckfall der Oberflaeche.
 */
export async function GET(request: Request) {
  const p = new URL(request.url).searchParams;
  try {
    if (p.has("lon") && p.has("lat")) return NextResponse.json({ ort: await ortBei(Number(p.get("lon")), Number(p.get("lat"))) });
    return NextResponse.json({ vorschlaege: await sucheOrte((p.get("q") ?? "").slice(0, 200), { sprache: p.get("lang") ?? "de" }) });
  } catch (e) {
    const status = e instanceof OrtsucheFehler ? e.status : 500;
    return NextResponse.json({ fehler: e instanceof Error ? e.message : "Adresssuche fehlgeschlagen" }, { status });
  }
}
