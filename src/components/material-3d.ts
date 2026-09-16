import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { Lage } from "@/engine/typen";

/**
 * Materialien je Lage, getrennt nach Deckflaeche und Schnittkante. Alles
 * hochglaenzend (Marcel 16.09.2026: das Schwarz sah aus wie frosted Acrylglas).
 * Spiegelacryl spiegelt nur vorn, die gelaserte Kante ist farbiges, glaenzendes
 * Acryl – in Nahaufnahmen sieht man genau diese Kanten. Die Spiegelung des Blaus
 * uebernimmt eine echte Spiegelflaeche (spiegel-3d.ts).
 */
export function materialien(lage: Lage): [THREE.Material, THREE.Material] {
  const m = lage.material.toLowerCase();
  const kante = (farbe: number) => new THREE.MeshPhysicalMaterial({ color: farbe, roughness: 0.08, clearcoat: 1, clearcoatRoughness: 0.03 });
  if (m.includes("blau")) return [new THREE.MeshPhysicalMaterial({ color: 0x6aa3e0, metalness: 1, roughness: 0.02 }), kante(0x3f73ad)];
  // Rotes Spiegelacryl nicht voll metallisch: sonst haengt seine Farbe allein an
  // der Umgebung, flach liegend vor einer dunklen Wand war das Herz schwarzrot.
  if (m.includes("rot")) return [new THREE.MeshPhysicalMaterial({ color: 0xd01f2e, metalness: 0.55, roughness: 0.05, clearcoat: 1, clearcoatRoughness: 0.02 }), kante(0xa3141f)];
  // Schwarzes Hochglanz-Acryl: scharfe Spiegelung mit wenig Anteil. Stumpf
  // (roughness 0,4) verschmierte die helle Raumumgebung zu Grau.
  const einfarbig = m.includes("schwarz")
    ? new THREE.MeshPhysicalMaterial({ color: 0x030303, roughness: 0.05, specularIntensity: 0.5, envMapIntensity: 0.6 })
    : new THREE.MeshPhysicalMaterial({ color: 0xf2f0ea, roughness: 0.18, clearcoat: 1, clearcoatRoughness: 0.03 });
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
