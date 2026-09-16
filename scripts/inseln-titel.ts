// Inseln im Titel: Flaeche, Breite und wie viel Material neben einem Steg bliebe.
import ClipperLib from "clipper-lib";
import { setzeZeile } from "../src/engine/schrift";
import { zuFlaeche } from "../src/engine/geometrie";
const faelle = [
  { text: "Zuhause", schrift: "Bacalisties.ttf", h: 297 * 0.07, name: "A4 Titel" },
  { text: "Zuhause", schrift: "Bacalisties.ttf", h: 210 * 0.07, name: "A5 Titel" },
  { text: "BERLIN 52°30'59\"N FAMILIE HOFFMANN 8", schrift: "AvantGardeCE-Demi.otf", h: 297 * 0.017, name: "A4 Zeile" },
  { text: "BERLIN 52°30'59\"N FAMILIE HOFFMANN 8", schrift: "AvantGardeCE-Demi.otf", h: 210 * 0.017, name: "A5 Zeile" },
  { text: "BERLIN 52°30'59\"N FAMILIE HOFFMANN 8", schrift: "AvantGardeCE-Demi.otf", h: 420 * 0.017, name: "A3 Zeile" },
];
for (const f of faelle) {
  const g = setzeZeile({ text: f.text, schrift: f.schrift, versalhoeheMm: f.h, sperrungEm: 0.06, mitteX: 0, mitteY: 0, maxBreiteMm: 1e9 });
  const c = new ClipperLib.Clipper();
  c.AddPaths(zuFlaeche(g.ringe), ClipperLib.PolyType.ptSubject, true);
  const baum = new ClipperLib.PolyTree();
  c.Execute(ClipperLib.ClipType.ctUnion, baum, ClipperLib.PolyFillType.pftNonZero, ClipperLib.PolyFillType.pftNonZero);
  const zeilen: string[] = [];
  const geh = (n: ClipperLib.PolyNode) => { for (const k of n.Childs()) { if (k.IsHole()) {
    const r = k.Contour().map(p => ({ x: p.X / 1000, y: p.Y / 1000 }));
    const a = Math.abs(ClipperLib.Clipper.Area(k.Contour())) / 1e6;
    const w = Math.max(...r.map(p => p.x)) - Math.min(...r.map(p => p.x));
    const h = Math.max(...r.map(p => p.y)) - Math.min(...r.map(p => p.y));
    // groesster einbeschriebener Kreis grob: Flaeche / halber Umfang
    let u = 0; for (let i = 0; i < r.length; i++) { const p = r[i], q = r[(i + 1) % r.length]; u += Math.hypot(q.x - p.x, q.y - p.y); }
    const dicke = (2 * a) / u;
    zeilen.push(`x=${Math.min(...r.map(p => p.x)).toFixed(0).padStart(4)} ${w.toFixed(2)}x${h.toFixed(2)}mm ${a.toFixed(2)}mm2 mittl.Dicke ${dicke.toFixed(2)}mm ${(100 * a / (f.h * f.h)).toFixed(1)}%`);
  } geh(k); } };
  geh(baum);
  console.log(`\n${f.name} (Versalhoehe ${f.h.toFixed(1)} mm)`); zeilen.sort().forEach(z => console.log("  " + z));
}
