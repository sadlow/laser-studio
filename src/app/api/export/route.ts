import { NextResponse } from "next/server";
import type { GeoPunkt, Kundeneingabe, Schichtkarte } from "@/engine/typen";
import { exportiere } from "@/server/export";
import { ladeVorlage } from "@/server/vorlagen";

export const runtime = "nodejs";
// Mehrere Varianten mit Gravur-Flaechen brauchen einige Sekunden.
export const maxDuration = 300;

interface Anfrage {
  vorlagenIds: string[];
  /** Den Entwurf auf dem Bildschirm mitnehmen, auch wenn er keine Vorlage ist. */
  aktuell?: Schichtkarte;
  kunde: Kundeneingabe;
  lon: number;
  lat: number;
  kartenMitte?: GeoPunkt;
}

export async function POST(request: Request) {

  try {
    const a = (await request.json()) as Anfrage;
    const varianten = a.vorlagenIds.map((id) => {
      const v = ladeVorlage(id);
      if (!v) throw new Error(`Vorlage "${id}" nicht gefunden.`);
      return { id: v.id, name: v.name, karte: v.karte };
    });
    if (a.aktuell) {
      const { kunde: _k, lon: _lo, lat: _la, kartenMitte: _m, ...karte } = a.aktuell;
      varianten.push({ id: "aktueller-entwurf", name: "Aktueller Entwurf", karte });
    }
    if (!varianten.length) return NextResponse.json({ fehler: "Keine Variante ausgewaehlt." }, { status: 400 });

    return NextResponse.json(await exportiere({ varianten, kunde: a.kunde, lon: a.lon, lat: a.lat, kartenMitte: a.kartenMitte }));
  } catch (e) {
    return NextResponse.json({ fehler: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
