import * as THREE from "three";
import type { Lage, Zone } from "@/engine/typen";

/**
 * Gravur als transparente Textur – so behalten die Linien ihre echte Breite.
 * Die ganze Platte bekommt hoechstens 6 px/mm (A4: 1260 x 1782 px). Fuer eine
 * Nahaufnahme reicht das nicht, eine 0,25-mm-Linie waere dort ein verwaschener
 * Streifen: dann wird nur der Bereich im Bild fein nachgezeichnet.
 */
export function gravurFlaeche(lage: Lage, b: number, h: number, bereich?: Zone): THREE.Mesh | undefined {
  if (!lage.gravur.some((g) => g.linien.length) && !lage.klebeflaeche.length) return undefined;
  const r = bereich ?? { xMm: 0, yMm: 0, breiteMm: b, hoeheMm: h };
  const pxProMm = Math.min(bereich ? 40 : 6, 4096 / Math.max(r.breiteMm, r.hoeheMm));
  const leinwand = document.createElement("canvas");
  leinwand.width = Math.max(1, Math.round(r.breiteMm * pxProMm));
  leinwand.height = Math.max(1, Math.round(r.hoeheMm * pxProMm));
  const ctx = leinwand.getContext("2d")!;
  ctx.strokeStyle = lage.material.toLowerCase().includes("schwarz") ? "#9d988e" : "#bdb6a8";
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.scale(pxProMm, pxProMm);
  ctx.translate(-r.xMm, -r.yMm);
  for (const g of lage.gravur) {
    ctx.lineWidth = Math.max(1 / pxProMm, g.breiteMm);
    ctx.beginPath();
    for (const linie of g.linien) linie.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
    ctx.stroke();
  }
  // Klebeflaeche unter dem Symbol: sichtbar, wenn die Lagen auseinandergezogen sind.
  ctx.fillStyle = ctx.strokeStyle;
  ctx.beginPath();
  for (const t of lage.klebeflaeche) {
    for (const ring of [t.aussen, ...t.loecher]) ring.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
    ctx.closePath();
  }
  ctx.fill("evenodd");
  const textur = new THREE.CanvasTexture(leinwand);
  textur.colorSpace = THREE.SRGBColorSpace;
  textur.anisotropy = 8;
  const mat = new THREE.MeshStandardMaterial({ map: textur, transparent: true, roughness: 0.9, depthWrite: false });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(r.breiteMm, r.hoeheMm), mat);
  // Plattenkoordinaten (y nach unten) -> Szene (Plattenmitte im Ursprung, y nach oben).
  mesh.position.set(r.xMm + r.breiteMm / 2 - b / 2, h / 2 - (r.yMm + r.hoeheMm / 2), 0);
  return mesh;
}
