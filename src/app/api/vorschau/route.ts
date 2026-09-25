import { NextResponse } from "next/server";
import { rendereSchichtkarte, type Schichtkarte } from "@/engine";
import { merke } from "@/server/ergebnis-cache";
import { mitKartenQuelle } from "@/server/karten-quelle";

// Node-Laufzeit: Kachel-Parser und Schriftdateien brauchen Buffer und fs.
export const runtime = "nodejs";

export async function POST(request: Request) {

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
    const { wert: r, hinweis } = await mitKartenQuelle(karte.kartenQuelle, (q) => rendereSchichtkarte(karte, q, request.signal, { teilung: false }));
    if (hinweis) r.warnungen.unshift(hinweis);
    merke(karte, r);
    return NextResponse.json(r);
  } catch (e) {
    if (request.signal.aborted) return new Response(null, { status: 499 });
    return NextResponse.json({ fehler: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
