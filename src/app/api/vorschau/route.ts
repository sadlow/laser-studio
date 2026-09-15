import { NextResponse } from "next/server";
import { rendereEntwurf, type KartenEntwurf } from "@/engine";

// Node-Laufzeit: der Tile-Parser arbeitet mit Buffern.
export const runtime = "nodejs";

export async function POST(request: Request) {
  const token = process.env.MAPBOX_ACCESS_TOKEN;
  if (!token) {
    return NextResponse.json(
      { fehler: "MAPBOX_ACCESS_TOKEN fehlt. Trage ihn in .env.local ein (Vorlage: .env.example)." },
      { status: 500 },
    );
  }

  let entwurf: KartenEntwurf;
  try {
    entwurf = (await request.json()) as KartenEntwurf;
  } catch {
    return NextResponse.json({ fehler: "Anfrage ist kein gueltiges JSON." }, { status: 400 });
  }

  try {
    const ergebnis = await rendereEntwurf(entwurf, token);
    return NextResponse.json(ergebnis);
  } catch (e) {
    const text = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ fehler: text }, { status: 500 });
  }
}
