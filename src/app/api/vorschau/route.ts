import { NextResponse } from "next/server";
import { rendereSchichtkarte, type Schichtkarte } from "@/engine";
import { merke } from "@/server/ergebnis-cache";

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
    // Ohne Nahtsuche: die holt /api/teilung bei Bedarf nach, aus dem Speicher.
    const r = await rendereSchichtkarte(karte, token, request.signal, { teilung: false });
    merke(karte, r);
    return NextResponse.json(r);
  } catch (e) {
    if (request.signal.aborted) return new Response(null, { status: 499 });
    return NextResponse.json({ fehler: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
