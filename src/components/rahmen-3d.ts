import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { SchichtkartenErgebnis } from "@/engine/typen";

type Rahmen = NonNullable<SchichtkartenErgebnis["rahmen"]>;

// Luft zwischen Platte und Falzwand – unsichtbar, aber die Platte muss hinein.
const FALZ_LUFT_MM = 0.5;
// Fuge an den Gehrungen: ohne sie wirkt der Rahmen wie aus einem Block gefraest.
const FUGE_MM = 0.12;

/** Eine Leiste von vorn gesehen als Trapez, von z = von aus tiefe mm nach vorn. */
function leiste(punkte: [number, number][], von: number, tiefe: number): THREE.BufferGeometry {
  const form = new THREE.Shape(punkte.map(([x, y]) => new THREE.Vector2(x, y)));
  const geo = new THREE.ExtrudeGeometry(form, { depth: tiefe, bevelEnabled: false });
  geo.translate(0, 0, von);
  return geo;
}

/**
 * Holzrahmen in mm (Marcel 16.09.2026), Plattenmitte im Ursprung, z = 0 an der
 * Rueckseite des Rahmens. Vier Leisten mit Gehrung, jede aus zwei Teilen: vorn
 * die Lippe, die innen ueber das Motiv steht, dahinter die Falzwand neben dem
 * Stapel. Die Bildoberflaeche liegt an der Rueckseite der Lippe.
 */
export function rahmenGeometrie(r: Rahmen, b: number, h: number): THREE.BufferGeometry {
  const licht = [b / 2 - r.ueberstandMm, h / 2 - r.ueberstandMm];
  const [ab, ah] = [licht[0] + r.breiteMm, licht[1] + r.breiteMm];
  const falz = [b / 2 + FALZ_LUFT_MM, h / 2 + FALZ_LUFT_MM];
  const g = FUGE_MM;
  const ring = ([ib, ih]: number[], von: number, tiefe: number) => [
    leiste([[-ab + g, ah], [ab - g, ah], [ib - g, ih], [-ib + g, ih]], von, tiefe),
    leiste([[-ab + g, -ah], [-ib + g, -ih], [ib - g, -ih], [ab - g, -ah]], von, tiefe),
    leiste([[ab, ah - g], [ib, ih - g], [ib, -ih + g], [ab, -ah + g]], von, tiefe),
    leiste([[-ab, -ah + g], [-ib, -ih + g], [-ib, ih - g], [-ab, ah - g]], von, tiefe),
  ];
  const falzTiefe = Math.max(0.1, r.tiefeMm - r.einlassMm);
  const teile = [...ring(falz, 0, falzTiefe), ...ring(licht, falzTiefe, Math.max(0.1, r.einlassMm))];
  const ganz = mergeGeometries(teile);
  teile.forEach((t) => t.dispose());
  return ganz;
}

/** Holz matt: schwarz und weiss lackiert, Eiche natur. Schwarz mit wenig Spiegelanteil, sonst wirkt es grau. */
export function rahmenMaterial(farbe: Rahmen["farbe"]): THREE.Material {
  if (farbe === "schwarz") return new THREE.MeshPhysicalMaterial({ color: 0x131211, roughness: 0.62, specularIntensity: 0.35, envMapIntensity: 0.4 });
  if (farbe === "eiche") return new THREE.MeshPhysicalMaterial({ color: 0xb98f62, roughness: 0.72, specularIntensity: 0.4 });
  return new THREE.MeshPhysicalMaterial({ color: 0xefece5, roughness: 0.66 });
}
