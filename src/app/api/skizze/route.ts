import { NextResponse } from "next/server";
import { mitKartenQuelle } from "@/server/karten-quelle";
import type { Schichtkarte } from "@/engine";
import { skizziereSchichtkarte } from "@/engine/skizze";

export const runtime = "nodejs";

/** Skizze fuer die Live-Vorschau: Millisekunden statt Sekunden, nicht fuer die Produktion (skizze.ts). */
export async function POST(request: Request) {
  try {
    const karte = (await request.json()) as Schichtkarte;
    const { wert } = await mitKartenQuelle(karte.kartenQuelle, (q) => skizziereSchichtkarte(karte, q, request.signal), karte.ausschnittKm);
    return NextResponse.json(wert);
  } catch (e) {
    if (request.signal.aborted) return new Response(null, { status: 499 });
    return NextResponse.json({ fehler: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
