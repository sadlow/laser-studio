// Misst die Innenflaechen (Inseln) jeder Textzeile: welches Zeichen, wie gross.
// Grundlage fuer die Grenze, ab der eine Insel Stege bekommt statt zugefuellt zu werden.
import ClipperLib from "clipper-lib";
import { setzeZeile } from "../src/engine/schrift";
import { zuFlaeche } from "../src/engine/geometrie";

const zeilen = [
  { text: "BERLIN 52°30'59\"N 13°20'15\"O", schrift: "JosefinSans-SemiBold.ttf", h: 297 * 0.017 },
  { text: "FAMILIE HOFFMANN ÄÖÜ 0689 ABDOPQR", schrift: "JosefinSans-SemiBold.ttf", h: 297 * 0.017 },
  { text: "Zuhause", schrift: "Amalfi Coast.ttf", h: 297 * 0.062 },
];
for (const z of zeilen) {
  const g = setzeZeile({ text: z.text, schrift: z.schrift, versalhoeheMm: z.h, sperrungEm: 0.08, mitteX: 0, mitteY: 0, maxBreiteMm: 1e9 });
  const c = new ClipperLib.Clipper();
  c.AddPaths(zuFlaeche(g.ringe), ClipperLib.PolyType.ptSubject, true);
  const baum = new ClipperLib.PolyTree();
  c.Execute(ClipperLib.ClipType.ctUnion, baum, ClipperLib.PolyFillType.pftNonZero, ClipperLib.PolyFillType.pftNonZero);
  const inseln: string[] = [];
  const geh = (n: ClipperLib.PolyNode) => { for (const k of n.Childs()) { if (k.IsHole()) {
    const r = k.Contour(); const xs = r.map(p => p.X / 1000), ys = r.map(p => p.Y / 1000);
    const a = Math.abs(ClipperLib.Clipper.Area(r)) / 1e6;
    inseln.push(`x=${Math.min(...xs).toFixed(1).padStart(6)}  ${(Math.max(...xs)-Math.min(...xs)).toFixed(2)}x${(Math.max(...ys)-Math.min(...ys)).toFixed(2)}mm  ${a.toFixed(2)}mm2  ${(100 * a / (z.h * z.h)).toFixed(1)} % der Versalhoehe²`);
  } geh(k); } };
  geh(baum);
  console.log(`\n${z.text}  (Versalhoehe ${z.h.toFixed(1)} mm, ${inseln.length} Inseln)`);
  inseln.forEach(i => console.log("  " + i));
}
