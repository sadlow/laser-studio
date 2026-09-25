import { NextResponse } from "next/server";
import type { Schichtkarte } from "@/engine";
import { skizziereSchichtkarte } from "@/engine/skizze";

export const runtime = "nodejs";

/** Skizze fuer die Live-Vorschau: Millisekunden statt Sekunden, nicht fuer die Produktion (skizze.ts). */
export async function POST(request: Request) {
  const token = process.env.MAPBOX_ACCESS_TOKEN;
  if (!token) return NextResponse.json({ fehler: "MAPBOX_ACCESS_TOKEN fehlt." }, { status: 500 });
  try {
    const karte = (await request.json()) as Schichtkarte;
    return NextResponse.json(await skizziereSchichtkarte(karte, token, request.signal));
  } catch (e) {
    if (request.signal.aborted) return new Response(null, { status: 499 });
    return NextResponse.json({ fehler: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
