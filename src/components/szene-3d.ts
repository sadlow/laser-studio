import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { Punkt } from "@/engine/clip";
import type { Lage, SchichtkartenErgebnis } from "@/engine/typen";

/**
 * Die Lagen als Acrylplatten in mm (Marcel 16.09.2026: "echtes 3D, das ich um
 * die Y-Achse drehen kann"). Jede Lage wird aus ihrer Schnittgeometrie
 * extrudiert, von unten nach oben gestapelt; die Gravur liegt als Textur auf
 * dem Hintergrund, die Spiegel spiegeln die Umgebung.
 *
 * Staerken sind Annahme bis auf die Deckschicht: oben 2 mm (Marcel), sonst 3 mm.
 */
const STAERKE_OBEN_MM = 2;
const STAERKE_MM = 3;
// Punkte naeher als das zusammenfassen – die gepufferten Strassen haben runde
// Ecken aus sehr vielen kurzen Stuecken, die Triangulierung dauerte sonst Sekunden.
const PUNKTABSTAND_MM = 0.12;

export interface Platte {
  mesh: THREE.Mesh;
  gravur?: THREE.Mesh;
  /** Unterkante ohne Abstand zwischen den Lagen. */
  z: number;
  staerke: number;
  index: number;
}

function material(lage: Lage): THREE.Material {
  const m = lage.material.toLowerCase();
  if (m.includes("blau")) return new THREE.MeshPhysicalMaterial({ color: 0x6aa3e0, metalness: 1, roughness: 0.08 });
  if (m.includes("rot")) return new THREE.MeshPhysicalMaterial({ color: 0xd8313d, metalness: 1, roughness: 0.12 });
  // Schwarz wirkte grau: auch schwarzer Lack spiegelt rund 4 % der hellen
  // Raumumgebung, der Klarlack noch einmal so viel. Weniger Spiegelanteil, kein Klarlack.
  if (m.includes("schwarz")) return new THREE.MeshPhysicalMaterial({ color: 0x020202, roughness: 0.4, specularIntensity: 0.3, envMapIntensity: 0.3 });
  return new THREE.MeshPhysicalMaterial({ color: 0xf2f0ea, roughness: 0.3, clearcoat: 0.5, clearcoatRoughness: 0.2 });
}

function ausduennen(ring: Punkt[]): Punkt[] {
  const aus: Punkt[] = [];
  for (const p of ring) {
    const l = aus[aus.length - 1];
    if (!l || Math.hypot(p.x - l.x, p.y - l.y) >= PUNKTABSTAND_MM) aus.push(p);
  }
  return aus.length >= 3 ? aus : ring;
}

function platteGeometrie(lage: Lage, b: number, h: number, staerke: number): THREE.BufferGeometry | null {
  // mm auf der Platte (y nach unten) -> Szene (Mitte im Ursprung, y nach oben)
  const v = (p: Punkt) => new THREE.Vector2(p.x - b / 2, h / 2 - p.y);
  const teile = lage.teile.map((t) => {
    const form = new THREE.Shape(ausduennen(t.aussen).map(v));
    form.holes = t.loecher.map((l) => new THREE.Path(ausduennen(l).map(v)));
    return new THREE.ExtrudeGeometry(form, { depth: staerke, bevelEnabled: false, curveSegments: 1 });
  });
  if (!teile.length) return null;
  const ganz = teile.length === 1 ? teile[0] : mergeGeometries(teile);
  if (teile.length > 1) teile.forEach((g) => g.dispose());
  return ganz;
}

/** Gravur als transparente Textur – so behalten die Linien ihre echte Breite. */
function gravurFlaeche(lage: Lage, b: number, h: number, hell: boolean): THREE.Mesh | undefined {
  if (!lage.gravur.some((g) => g.linien.length)) return undefined;
  const pxProMm = Math.min(6, 4096 / Math.max(b, h));
  const leinwand = document.createElement("canvas");
  leinwand.width = Math.round(b * pxProMm);
  leinwand.height = Math.round(h * pxProMm);
  const ctx = leinwand.getContext("2d")!;
  ctx.strokeStyle = hell ? "#9d988e" : "#bdb6a8";
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  for (const g of lage.gravur) {
    ctx.lineWidth = Math.max(1, g.breiteMm * pxProMm);
    ctx.beginPath();
    for (const linie of g.linien) {
      linie.forEach((p, i) => (i ? ctx.lineTo(p.x * pxProMm, p.y * pxProMm) : ctx.moveTo(p.x * pxProMm, p.y * pxProMm)));
    }
    ctx.stroke();
  }
  const textur = new THREE.CanvasTexture(leinwand);
  textur.colorSpace = THREE.SRGBColorSpace;
  textur.anisotropy = 8;
  const mat = new THREE.MeshStandardMaterial({ map: textur, transparent: true, roughness: 0.9, depthWrite: false });
  return new THREE.Mesh(new THREE.PlaneGeometry(b, h), mat);
}

export function baueSzene(ergebnis: SchichtkartenErgebnis): { gruppe: THREE.Group; platten: Platte[]; hoehe: number } {
  const { breiteMm: b, hoeheMm: h } = ergebnis.layout.platte;
  const gruppe = new THREE.Group();
  const platten: Platte[] = [];
  // Lagen kommen von oben nach unten; gestapelt wird von unten.
  const vonUnten = [...ergebnis.lagen].reverse();
  const oberstePlatte = ergebnis.lagen.find((l) => l.key !== "symbol");
  let z = 0;
  vonUnten.forEach((lage, index) => {
    const staerke = lage === oberstePlatte ? STAERKE_OBEN_MM : STAERKE_MM;
    const geo = platteGeometrie(lage, b, h, staerke);
    if (!geo) return;
    const mesh = new THREE.Mesh(geo, material(lage));
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    const gravur = gravurFlaeche(lage, b, h, lage.material.toLowerCase().includes("schwarz"));
    gruppe.add(mesh);
    if (gravur) gruppe.add(gravur);
    platten.push({ mesh, gravur, z, staerke, index });
    z += staerke;
  });
  return { gruppe, platten, hoehe: z };
}

/** Lagen mit Abstand auseinanderziehen – 0 ist der fertige Stapel. */
export function stapeln(platten: Platte[], abstandMm: number) {
  for (const p of platten) {
    p.mesh.position.z = p.z + p.index * abstandMm;
    if (p.gravur) p.gravur.position.z = p.z + p.index * abstandMm + p.staerke + 0.02;
  }
}

export function entsorgen(gruppe: THREE.Group) {
  gruppe.traverse((o) => {
    if (o instanceof THREE.Mesh) {
      o.geometry.dispose();
      const mat = o.material as THREE.MeshStandardMaterial;
      mat.map?.dispose();
      mat.dispose();
    }
  });
}
