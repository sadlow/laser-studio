import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { Lage } from "@/engine/typen";

/**
 * Materialien je Lage, getrennt nach Deckflaeche und Schnittkante. Hochglaenzend (Marcel 16.09.2026: das Schwarz
 * sah aus wie frosted Acrylglas) – ausser schwarzem Frost-Acryl, das seit 18.09.2026 bewusst matt ist.
 * Spiegelacryl spiegelt nur vorn, die gelaserte Kante ist farbiges, glaenzendes
 * Acryl – in Nahaufnahmen sieht man genau diese Kanten. Die Spiegelung des Blaus
 * uebernimmt eine echte Spiegelflaeche (spiegel-3d.ts).
 */
export function materialien(lage: Lage): [THREE.Material, THREE.Material] {
  const m = lage.material.toLowerCase();
  const kante = (farbe: number) => new THREE.MeshPhysicalMaterial({ color: farbe, roughness: 0.08, clearcoat: 1, clearcoatRoughness: 0.03 });
  // Dunkelblaues Spiegelacryl, die Kante dunkles Blau (die Spiegelschicht liegt nur auf der Flaeche).
  if (m.includes("blau")) return [new THREE.MeshPhysicalMaterial({ color: 0x2d4f8e, metalness: 1, roughness: 0.02 }), kante(0x1f3d6e)];
  // Rotes Spiegelacryl nicht voll metallisch: sonst haengt seine Farbe allein an
  // der Umgebung, flach liegend vor einer dunklen Wand war das Herz schwarzrot.
  if (m.includes("rot")) return [new THREE.MeshPhysicalMaterial({ color: 0xd01f2e, metalness: 0.55, roughness: 0.05, clearcoat: 1, clearcoatRoughness: 0.02 }), kante(0xa3141f)];
  // Schwarzes Frost-Acryl (18.09.2026): fein matt, die Raumspiegelung verschwimmt zu einem Schimmer. Die gelaserte
  // Kante schmilzt und bleibt glaenzend schwarz. Am Foto Anthrazit (19.09.): mit 0x0d0d0d war es liegend fast
  // tiefschwarz; aufrecht bleibt es bei gut einem Viertel der Helligkeit von Weiss, wie am Foto.
  if (m.includes("frost")) {
    return [new THREE.MeshPhysicalMaterial({ color: 0x1a1a1a, roughness: 0.55, specularIntensity: 0.45, envMapIntensity: 1.2 }), kante(0x050505)];
  }
  // Schwarzes Hochglanz-Acryl: Spiegelung mit wenig Anteil. Stumpf (roughness 0,4)
  // verschmierte die helle Raumumgebung zu Grau. Das gerichtete Licht stand als greller
  // Fleck auf der Gravur (Marcel 16.09.2026): kleiner Spiegelanteil fuer das Licht, die
  // Raumspiegelung ueber envMapIntensity ausgeglichen. Rauer (0,12) machte den Fleck groesser.
  const einfarbig = m.includes("schwarz")
    ? new THREE.MeshPhysicalMaterial({ color: 0x030303, roughness: 0.05, specularIntensity: 0.02, envMapIntensity: 10 })
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
