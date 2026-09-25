import { NextResponse } from "next/server";
import type { Schichtkarte } from "@/engine";
import { merke } from "@/server/ergebnis-cache";
import { rechneVoll } from "@/server/rechenwerk";

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
    // Im Worker-Thread (rechenwerk.ts), damit die Skizze im Hauptprozess frei bleibt. Bricht die Vorschau ab oder
    // ueberholt eine neuere Eingabe, wird der Worker beendet. Ohne Nahtsuche: die holt /api/teilung bei Bedarf nach.
    const r = await rechneVoll(karte, request.signal);
    merke(karte, r);
    return NextResponse.json(r);
  } catch (e) {
    if (request.signal.aborted) return new Response(null, { status: 499 });
    return NextResponse.json({ fehler: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
