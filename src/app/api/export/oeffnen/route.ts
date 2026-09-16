import { execFile } from "node:child_process";
import path from "node:path";
import { NextResponse } from "next/server";
import { EXPORT_ORDNER } from "@/server/export";

export const runtime = "nodejs";

/** Oeffnet einen Exportordner im Finder. Nur Ordner unterhalb von export/. */
export async function POST(request: Request) {
  const { ordner } = (await request.json()) as { ordner: string };
  const ziel = path.resolve(ordner ?? "");
  if (!ziel.startsWith(EXPORT_ORDNER + path.sep)) {
    return NextResponse.json({ fehler: "Nur Ordner im Exportverzeichnis." }, { status: 400 });
  }
  await new Promise<void>((fertig, fehler) => execFile("open", [ziel], (e) => (e ? fehler(e) : fertig())));
  return NextResponse.json({ ok: true });
}
