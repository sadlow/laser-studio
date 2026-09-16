import { NextResponse } from "next/server";
import type { Schichtkarte } from "@/engine/typen";
import { listeVorlagen, speichereVorlage } from "@/server/vorlagen";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({ vorlagen: listeVorlagen() });
}

export async function POST(request: Request) {
  try {
    const { name, beschreibung, karte } = (await request.json()) as {
      name: string;
      beschreibung?: string;
      karte: Schichtkarte;
    };
    const vorlage = speichereVorlage(name ?? "", beschreibung ?? "", karte);
    return NextResponse.json({ vorlage, vorlagen: listeVorlagen() });
  } catch (e) {
    return NextResponse.json({ fehler: e instanceof Error ? e.message : String(e) }, { status: 400 });
  }
}
