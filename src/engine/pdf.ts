// Kleinstes PDF, das der Montageplan braucht: Vektorlinien, Flaechen, Text in Helvetica. Ohne Abhaengigkeit, damit die
// Engine sie in den Shop-Konfigurator mitnimmt. Masse in mm, y nach unten wie in der Karte.

import type { Punkt } from "./clip";

const PT = 72 / 25.4;

export type Farbe = [number, number, number];

export class PdfSeite {
  private ops: string[] = [];
  constructor(readonly breiteMm: number, readonly hoeheMm: number) {}

  private p(x: number, y: number) {
    return `${z(x * PT)} ${z((this.hoeheMm - y) * PT)}`;
  }

  /** Ringe (geschlossen) oder Linien; gefuellt nach even-odd oder nur gezogen. */
  pfad(ringe: Punkt[][], stil: { fuellung?: Farbe; linie?: Farbe; breiteMm?: number; offen?: boolean; strich?: number[] }) {
    const d = ringe
      .filter((r) => r.length >= 2)
      .map((r) => `${this.p(r[0].x, r[0].y)} m ${r.slice(1).map((q) => `${this.p(q.x, q.y)} l`).join(" ")}${stil.offen ? "" : " h"}`)
      .join(" ");
    if (!d) return;
    const kopf = [
      stil.fuellung ? `${stil.fuellung.map(z).join(" ")} rg` : "",
      stil.linie ? `${stil.linie.map(z).join(" ")} RG ${z((stil.breiteMm ?? 0.2) * PT)} w` : "",
      `[${(stil.strich ?? []).map((s) => z(s * PT)).join(" ")}] 0 d 1 j 1 J`,
    ].join(" ");
    const zug = stil.fuellung && stil.linie ? "B*" : stil.fuellung ? "f*" : "S";
    this.ops.push(`q ${kopf} ${d} ${zug} Q`);
  }

  rechteck(x: number, y: number, b: number, h: number, stil: Parameters<PdfSeite["pfad"]>[1]) {
    this.pfad([[{ x, y }, { x: x + b, y }, { x: x + b, y: y + h }, { x, y: y + h }]], stil);
  }

  kreis(x: number, y: number, r: number, stil: Parameters<PdfSeite["pfad"]>[1]) {
    const ring = Array.from({ length: 24 }, (_, i) => ({ x: x + r * Math.cos((i / 24) * 2 * Math.PI), y: y + r * Math.sin((i / 24) * 2 * Math.PI) }));
    this.pfad([ring], stil);
  }

  /** Grundlinie bei y; fett = Helvetica-Bold. */
  text(x: number, y: number, groessePt: number, s: string, fett = false, farbe: Farbe = [0, 0, 0]) {
    this.ops.push(`BT ${farbe.map(z).join(" ")} rg /${fett ? "F2" : "F1"} ${z(groessePt)} Tf ${this.p(x, y)} Td (${text(s)}) Tj ET`);
  }

  inhalt(): string {
    return this.ops.join("\n");
  }
}

/** Setzt die Seiten zu einer PDF-Datei zusammen. */
export function pdfDatei(seiten: PdfSeite[], titel: string): Buffer {
  const objekte: string[] = [];
  const neu = (inhalt: string) => objekte.push(inhalt);
  neu("<< /Type /Catalog /Pages 2 0 R >>");
  const kids = seiten.map((_, i) => `${5 + i * 2} 0 R`).join(" ");
  neu(`<< /Type /Pages /Kids [${kids}] /Count ${seiten.length} >>`);
  neu("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>");
  neu("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>");
  for (const s of seiten) {
    const nr = objekte.length + 1;
    neu(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${z(s.breiteMm * PT)} ${z(s.hoeheMm * PT)}] ` +
        `/Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${nr + 1} 0 R >>`,
    );
    const inhalt = Buffer.from(s.inhalt(), "latin1");
    neu(`<< /Length ${inhalt.length} >>\nstream\n${inhalt.toString("latin1")}\nendstream`);
  }
  neu(`<< /Title (${text(titel)}) /Producer (Laser Studio) >>`);

  let aus = "%PDF-1.4\n%\xe2\xe3\xcf\xd3\n";
  const offsets: number[] = [];
  objekte.forEach((o, i) => {
    offsets.push(Buffer.byteLength(aus, "latin1"));
    aus += `${i + 1} 0 obj\n${o}\nendobj\n`;
  });
  const xref = Buffer.byteLength(aus, "latin1");
  aus += `xref\n0 ${objekte.length + 1}\n0000000000 65535 f \n${offsets.map((o) => `${String(o).padStart(10, "0")} 00000 n \n`).join("")}`;
  aus += `trailer\n<< /Size ${objekte.length + 1} /Root 1 0 R /Info ${objekte.length} 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(aus, "latin1");
}

function z(n: number): string {
  return (Math.round(n * 100) / 100).toString();
}

/** Text fuer WinAnsi: Klammern und Backslash maskieren; Umlaute gehen, Zeichen ausserhalb Latin-1 werden "?". */
function text(s: string): string {
  const ersetzt = s.replace(/[–—]/g, "-").replace(/[“”„]/g, '"').replace(/[‘’]/g, "'").replace(/²/g, "\xb2").replace(/×/g, "x").replace(/…/g, "...");
  return Array.from(ersetzt, (c) => (c.charCodeAt(0) > 255 ? "?" : c)).join("").replace(/([()\\])/g, "\\$1");
}
