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
    // Das Signal endet, wenn die Vorschau abbricht oder eine neuere Eingabe sie ueberholt: dann hoert die Engine nach
    // dem laufenden Schritt auf, statt fuer niemanden weiterzurechnen.
    return NextResponse.json(await rendereSchichtkarte(karte, token, request.signal));
  } catch (e) {
    if (request.signal.aborted) return new Response(null, { status: 499 });
    return NextResponse.json({ fehler: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
