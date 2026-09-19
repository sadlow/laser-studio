import * as THREE from "three";
import { sichtbareGravur } from "@/engine/gravur-export";
import type { GravurExport, Lage, Zone } from "@/engine/typen";

/**
 * Die Gravur wie am echten Stueck (erste A5-Karten, Marcel 19.09.2026), gegen die Flaeche daneben gemessen: eine
 * Rille, samt Waenden etwa so breit wie der Strahl (0,4-0,45 mm), der dunkle Kern nur halb so breit. Auf Weiss ein
 * grauer Kern, die obere Wand im Schatten – gut lesbar. Auf schwarzem Frost ein dunkler, glatt geschmolzener Grund,
 * nur die untere Wand faengt Licht – von weitem ein feiner, kaum hellerer Strich; vorher hellgrau und viel zu
 * kraeftig. Licht von oben ist eingezeichnet; nah legt die Bump-Map das Licht der Szene dazu.
 *
 * Je Strich: Anteil der Linienbreite, Versatz nach unten (Anteil der Breite), Farbe – nacheinander gezeichnet.
 */
const RILLE: Record<"weiss" | "schwarz", [number, number, string][]> = {
  weiss: [[1, 0, "#d2d2cf"], [0.34, 0, "#8a8a87"], [0.22, -0.3, "#70706d"]],
  schwarz: [[1, 0, "#1c1c1c"], [0.3, 0.32, "#7e7e7c"], [0.4, 0, "#101010"]],
};
// Anteil der Linienbreite, ueber den die Rillenwand abfaellt – der Rest ist flacher Grund.
const WAND = 0.3;

/**
 * Gravur als transparente Textur – so behalten die Linien ihre echte Breite (sichtbareGravur: als Mittellinie
 * so breit wie der Strahl). Die ganze Platte bekommt hoechstens 6 px/mm (A4: 1260 x 1782 px). Fuer eine
 * Nahaufnahme reicht das nicht, eine 0,5-mm-Rille waere dort ein verwaschener Streifen: dann wird nur der
 * Bereich im Bild fein nachgezeichnet.
 */
export function gravurFlaeche(lage: Lage, b: number, h: number, e: GravurExport | undefined, bereich?: Zone): THREE.Mesh | undefined {
  if (!lage.gravur.some((g) => g.linien.length) && !lage.klebeflaeche.length) return undefined;
  const r = bereich ?? { xMm: 0, yMm: 0, breiteMm: b, hoeheMm: h };
  const pxProMm = Math.min(bereich ? 40 : 6, 4096 / Math.max(r.breiteMm, r.hoeheMm));
  const striche = RILLE[lage.material.toLowerCase().includes("schwarz") ? "schwarz" : "weiss"];
  const gravur = sichtbareGravur(lage.gravur, e);
  const [bild, hoehe] = [leinwand(r, pxProMm), leinwand(r, pxProMm)];

  for (const [anteil, versatz, ton] of striche) {
    bild.strokeStyle = ton;
    linien(bild, gravur, anteil, pxProMm, versatz);
  }
  // Klebeflaeche unter dem Symbol als Flaechengravur: sichtbar, wenn die Lagen auseinandergezogen sind.
  bild.fillStyle = striche[1][2];
  flaechen(bild, lage);
  // Hoehe: weiss ist die Oberflaeche, schwarz der Rillengrund; die Unschaerfe macht die Wand.
  hoehe.fillStyle = "#fff";
  hoehe.fillRect(r.xMm, r.yMm, r.breiteMm, r.hoeheMm);
  hoehe.strokeStyle = hoehe.fillStyle = "#000";
  hoehe.filter = `blur(${Math.max(0.5, (WAND / 2) * Math.max(...gravur.map((g) => g.breiteMm), 0.1) * pxProMm)}px)`;
  linien(hoehe, gravur, 1 - WAND, pxProMm);
  flaechen(hoehe, lage);

  const mat = new THREE.MeshStandardMaterial({
    map: textur(bild.canvas, true),
    bumpMap: textur(hoehe.canvas, false),
    // Nah zeigt die Rille ihre Kanten; von weitem mittelt die Mip-Map sie weg, dann zaehlt nur die Farbe.
    bumpScale: bereich ? 1.2 : 0.6,
    transparent: true,
    roughness: 0.9,
    depthWrite: false,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(r.breiteMm, r.hoeheMm), mat);
  // Plattenkoordinaten (y nach unten) -> Szene (Plattenmitte im Ursprung, y nach oben).
  mesh.position.set(r.xMm + r.breiteMm / 2 - b / 2, h / 2 - (r.yMm + r.hoeheMm / 2), 0);
  return mesh;
}

function leinwand(r: Zone, pxProMm: number): CanvasRenderingContext2D {
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(r.breiteMm * pxProMm));
  c.height = Math.max(1, Math.round(r.hoeheMm * pxProMm));
  const ctx = c.getContext("2d")!;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.scale(pxProMm, pxProMm);
  ctx.translate(-r.xMm, -r.yMm);
  return ctx;
}

/** Alle Linien in anteil der Breite, um versatz x Breite nach unten verschoben (Plattenkoordinaten, y nach unten). */
function linien(ctx: CanvasRenderingContext2D, gravur: Lage["gravur"], anteil: number, pxProMm: number, versatz = 0) {
  for (const g of gravur) {
    const dy = versatz * g.breiteMm;
    ctx.lineWidth = Math.max(1 / pxProMm, g.breiteMm * anteil);
    ctx.beginPath();
    for (const linie of g.linien) linie.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y + dy) : ctx.moveTo(p.x, p.y + dy)));
    ctx.stroke();
  }
}

function flaechen(ctx: CanvasRenderingContext2D, lage: Lage) {
  ctx.beginPath();
  for (const t of lage.klebeflaeche) {
    for (const ring of [t.aussen, ...t.loecher]) ring.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
    ctx.closePath();
  }
  ctx.fill("evenodd");
}

function textur(c: HTMLCanvasElement, farbig: boolean): THREE.CanvasTexture {
  const t = new THREE.CanvasTexture(c);
  if (farbig) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}
