import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { Lage } from "@/engine/typen";

/**
 * Materialien je Lage, getrennt nach Deckflaeche und Schnittkante. Spiegelacryl
 * spiegelt nur vorn, die gelaserte Kante ist farbiges, glaenzendes Acryl – in
 * Nahaufnahmen sieht man genau diese Kanten.
 */
export function materialien(lage: Lage): [THREE.Material, THREE.Material] {
  const m = lage.material.toLowerCase();
  const kante = (farbe: number) => new THREE.MeshPhysicalMaterial({ color: farbe, roughness: 0.22, clearcoat: 0.8, clearcoatRoughness: 0.1 });
  if (m.includes("blau")) return [new THREE.MeshPhysicalMaterial({ color: 0x6aa3e0, metalness: 1, roughness: 0.08 }), kante(0x3f73ad)];
  if (m.includes("rot")) return [new THREE.MeshPhysicalMaterial({ color: 0xd8313d, metalness: 1, roughness: 0.12 }), kante(0xa3141f)];
  // Schwarz wirkte grau: auch schwarzer Lack spiegelt rund 4 % der hellen
  // Raumumgebung, der Klarlack noch einmal so viel. Weniger Spiegelanteil, kein Klarlack.
  const einfarbig = m.includes("schwarz")
    ? new THREE.MeshPhysicalMaterial({ color: 0x020202, roughness: 0.4, specularIntensity: 0.3, envMapIntensity: 0.3 })
    : new THREE.MeshPhysicalMaterial({ color: 0xf2f0ea, roughness: 0.3, clearcoat: 0.5, clearcoatRoughness: 0.2 });
  return [einfarbig, einfarbig];
}

/** Teil einer nicht indizierten Geometrie (Eckpunkte start bis start + count). */
function ausschnitt(geo: THREE.BufferGeometry, start: number, count: number): THREE.BufferGeometry {
  const teil = new THREE.BufferGeometry();
  for (const [name, attr] of Object.entries(geo.attributes)) {
    const a = attr as THREE.BufferAttribute;
    teil.setAttribute(name, new THREE.BufferAttribute(a.array.slice(start * a.itemSize, (start + count) * a.itemSize), a.itemSize));
  }
  return teil;
}

/**
 * Extrudierte Teile zu einer Geometrie mit zwei Gruppen: 0 Deckflaechen, 1 Kanten.
 * ExtrudeGeometry legt genau diese Gruppen an; beim Zusammenfuegen vieler Teile
 * gingen sie sonst verloren.
 */
export function nachFlaechen(teile: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const [deckel, kanten]: THREE.BufferGeometry[][] = [[], []];
  for (const g of teile) {
    for (const gruppe of g.groups) (gruppe.materialIndex === 1 ? kanten : deckel).push(ausschnitt(g, gruppe.start, gruppe.count));
    g.dispose();
  }
  const zusammen = (liste: THREE.BufferGeometry[]) => {
    const ganz = liste.length === 1 ? liste[0] : mergeGeometries(liste);
    if (liste.length > 1) liste.forEach((x) => x.dispose());
    return ganz;
  };
  const [d, k] = [zusammen(deckel), zusammen(kanten)];
  const ganz = mergeGeometries([d, k], true);
  d.dispose();
  k.dispose();
  return ganz;
}
