import { NextResponse } from "next/server";
import { mitKartenQuelle } from "@/server/karten-quelle";
import { rendereSchichtkarte, teilungFuer, type Schichtkarte } from "@/engine";
import { gemerkt, merke } from "@/server/ergebnis-cache";

export const runtime = "nodejs";

/**
 * Naehte einer geteilten Karte auf Knopfdruck: die Vorschau rechnet ohne sie (Marcel 25.09.2026). Liegt die Karte
 * noch im Speicher, wird nur die Nahtsuche gerechnet – auch beim Umwaehlen einer Naht.
 */
export async function POST(request: Request) {
  try {
    const karte = (await request.json()) as Schichtkarte;
    let r = gemerkt(karte);
    const t0 = Date.now();
    const treffer = !!r;
    if (!r) {
      r = (await mitKartenQuelle(karte.kartenQuelle, (q) => rendereSchichtkarte(karte, q, request.signal, { teilung: false }), karte.ausschnittKm)).wert;
      merke(karte, r);
    }
    const t1 = Date.now();
    const antwort = teilungFuer(r, karte);
    // Fuer die Messung im Browser: ob die Karte aus dem Speicher kam und was die Naehte kosteten.
    return NextResponse.json(antwort, { headers: { "x-karte": treffer ? "gemerkt" : `neu ${t1 - t0} ms`, "x-naehte-ms": String(Date.now() - t1) } });
  } catch (e) {
    if (request.signal.aborted) return new Response(null, { status: 499 });
    return NextResponse.json({ fehler: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
