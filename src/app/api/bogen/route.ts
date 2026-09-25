import { NextResponse } from "next/server";
import type { GeoPunkt, Kundeneingabe } from "@/engine/typen";
import { erzeugeBogen, PLATTEN, type PlattenKey, type Variation } from "@/server/bogen";
import { ladeVorlage, type Produktparameter } from "@/server/vorlagen";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function GET() {
  return NextResponse.json({
    platten: Object.entries(PLATTEN).map(([key, p]) => ({ key, titel: p.titel, plaetze: p.orte.length })),
  });
}

export async function POST(request: Request) {
  try {
    const a = (await request.json()) as {
      platte: PlattenKey;
      vorlageId: string;
      variation: Variation;
      werte: number[];
      kunde: Kundeneingabe;
      lon: number;
      lat: number;
      kartenMitte?: GeoPunkt;
      /** Der Entwurf aus dem Studio, ohne ihn vorher als Vorlage zu speichern. */
      aktuell?: Produktparameter;
    };
    if (!(a.platte in PLATTEN)) throw new Error(`Unbekannte Platte "${a.platte}".`);
    const vorlage =
      a.vorlageId === "aktuell" && a.aktuell
        ? { id: "entwurf", name: "Aktueller Entwurf", beschreibung: "", karte: a.aktuell }
        : ladeVorlage(a.vorlageId);
    if (!vorlage) throw new Error(`Vorlage "${a.vorlageId}" nicht gefunden.`);
    return NextResponse.json(await erzeugeBogen({ ...a, vorlage }));
  } catch (e) {
    return NextResponse.json({ fehler: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
