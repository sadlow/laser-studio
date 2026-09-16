import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { SchichtkartenErgebnis } from "@/engine/typen";
import { HOLZ_MM, holzLeinwand, type Holz } from "./holz-muster";

type Rahmen = NonNullable<SchichtkartenErgebnis["rahmen"]>;

// Luft zwischen Platte und Falzwand – unsichtbar, aber die Platte muss hinein.
const FALZ_LUFT_MM = 0.5;
// Fuge an den Gehrungen: ohne sie wirkt der Rahmen wie aus einem Block gefraest.
const FUGE_MM = 0.12;

/**
 * Eine Leiste von vorn gesehen als Trapez, von z = von aus tiefe mm nach vorn.
 * Senkrechte Leisten drehen die Texturkoordinaten ihrer Deckflaechen, damit die
 * Maserung entlang der Leiste laeuft; die Seitenflaechen tun das von selbst.
 */
function leiste(punkte: [number, number][], von: number, tiefe: number, senkrecht: boolean): THREE.BufferGeometry {
  const form = new THREE.Shape(punkte.map(([x, y]) => new THREE.Vector2(x, y)));
  const geo = new THREE.ExtrudeGeometry(form, { depth: tiefe, bevelEnabled: false });
  geo.translate(0, 0, von);
  const deckel = geo.groups.find((g) => g.materialIndex === 0);
  const uv = geo.getAttribute("uv");
  if (senkrecht && deckel) {
    for (let i = deckel.start; i < deckel.start + deckel.count; i++) uv.setXY(i, uv.getY(i), uv.getX(i));
  }
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
    leiste([[-ab + g, ah], [ab - g, ah], [ib - g, ih], [-ib + g, ih]], von, tiefe, false),
    leiste([[-ab + g, -ah], [-ib + g, -ih], [ib - g, -ih], [ab - g, -ah]], von, tiefe, false),
    leiste([[ab, ah - g], [ib, ih - g], [ib, -ih + g], [ab, -ah + g]], von, tiefe, true),
    leiste([[-ab, -ah + g], [-ib, -ih + g], [-ib, ih - g], [-ab, ah - g]], von, tiefe, true),
  ];
  const falzTiefe = Math.max(0.1, r.tiefeMm - r.einlassMm);
  const teile = [...ring(falz, 0, falzTiefe), ...ring(licht, falzTiefe, Math.max(0.1, r.einlassMm))];
  const ganz = mergeGeometries(teile);
  teile.forEach((t) => t.dispose());
  return ganz;
}

/** Maserung als Textur – Eiche oder dunkelbraun (holz-muster.ts), Koordinaten in mm. */
function holzTextur(holz: Holz): THREE.CanvasTexture {
  const textur = new THREE.CanvasTexture(holzLeinwand(holz));
  textur.wrapS = textur.wrapT = THREE.RepeatWrapping;
  textur.colorSpace = THREE.SRGBColorSpace;
  textur.anisotropy = 8;
  textur.repeat.set(1 / HOLZ_MM.entlang, 1 / HOLZ_MM.quer);
  return textur;
}

/** Holz matt: schwarz und weiss lackiert, Eiche natur, dunkelbraun geoelt. Schwarz mit wenig Spiegelanteil, sonst wirkt es grau. */
export function rahmenMaterial(farbe: Rahmen["farbe"]): THREE.Material {
  if (farbe === "schwarz") return new THREE.MeshPhysicalMaterial({ color: 0x131211, roughness: 0.62, specularIntensity: 0.35, envMapIntensity: 0.4 });
  if (farbe === "eiche") return new THREE.MeshPhysicalMaterial({ map: holzTextur("eiche"), roughness: 0.7, specularIntensity: 0.4 });
  if (farbe === "dunkelbraun") return new THREE.MeshPhysicalMaterial({ map: holzTextur("dunkelbraun"), roughness: 0.6, specularIntensity: 0.45 });
  return new THREE.MeshPhysicalMaterial({ color: 0xefece5, roughness: 0.66 });
}
