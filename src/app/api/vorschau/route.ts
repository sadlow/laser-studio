import { NextResponse } from "next/server";
import { rendereSchichtkarte, type Schichtkarte } from "@/engine";

// Node-Laufzeit: Kachel-Parser und Schriftdateien brauchen Buffer und fs.
export const runtime = "nodejs";

export async function POST(request: Request) {
  const token = process.env.MAPBOX_ACCESS_TOKEN;
  if (!token) {
    return NextResponse.json(
      { fehler: "MAPBOX_ACCESS_TOKEN fehlt. Trage ihn in .env.local ein (Vorlage: .env.example)." },
      { status: 500 },
    );
  }

  let karte: Schichtkarte;
  try {
    karte = (await request.json()) as Schichtkarte;
  } catch {
    return NextResponse.json({ fehler: "Anfrage ist kein gueltiges JSON." }, { status: 400 });
  }

  try {
    return NextResponse.json(await rendereSchichtkarte(karte, token));
  } catch (e) {
    return NextResponse.json({ fehler: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
