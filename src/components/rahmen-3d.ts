import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { SchichtkartenErgebnis } from "@/engine/typen";

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

/**
 * Eichenmaserung (Marcel 16.09.2026: "etwas staerker gemasert und leicht
 * dunkler"): Jahresringe als lange, leicht wellige Linien, dazu kurze Poren.
 * Waagerecht nahtlos, damit lange Leisten keine Stossstelle zeigen.
 */
function eichenTextur(): THREE.CanvasTexture {
  const leinwand = document.createElement("canvas");
  [leinwand.width, leinwand.height] = [2048, 512];
  const ctx = leinwand.getContext("2d")!;
  ctx.fillStyle = "#9c7147";
  ctx.fillRect(0, 0, 2048, 512);
  let saat = 11;
  const zufall = () => (saat = (saat * 16807) % 2147483647) / 2147483647;
  // Zurueckhaltend: kraeftiger wirkte es wie Zebrano statt Eiche.
  for (let i = 0; i < 140; i++) {
    const [y0, welle, wellen, phase, ton] = [zufall() * 512, 1 + zufall() * 6, 1 + Math.floor(zufall() * 3), zufall() * 6.28, zufall()];
    ctx.strokeStyle = `rgba(${86 + ton * 30}, ${58 + ton * 20}, ${32 + ton * 10}, ${0.08 + zufall() * 0.2})`;
    ctx.lineWidth = 0.6 + zufall() * 1.8;
    for (const versatz of [-512, 0, 512]) {
      ctx.beginPath();
      for (let x = 0; x <= 2048; x += 16) {
        const y = y0 + versatz + Math.sin((x / 2048) * 6.283 * wellen + phase) * welle;
        if (x) ctx.lineTo(x, y);
        else ctx.moveTo(x, y);
      }
      ctx.stroke();
    }
  }
  for (let i = 0; i < 2200; i++) {
    ctx.fillStyle = `rgba(62, 40, 20, ${0.1 + zufall() * 0.22})`;
    ctx.fillRect(zufall() * 2048, zufall() * 512, 3 + zufall() * 16, 1);
  }
  const textur = new THREE.CanvasTexture(leinwand);
  textur.wrapS = textur.wrapT = THREE.RepeatWrapping;
  textur.colorSpace = THREE.SRGBColorSpace;
  textur.anisotropy = 8;
  // Texturkoordinaten sind mm: ein Bild = 240 mm entlang, 60 mm quer zur Maserung.
  textur.repeat.set(1 / 240, 1 / 60);
  return textur;
}

/** Holz matt: schwarz und weiss lackiert, Eiche natur. Schwarz mit wenig Spiegelanteil, sonst wirkt es grau. */
export function rahmenMaterial(farbe: Rahmen["farbe"]): THREE.Material {
  if (farbe === "schwarz") return new THREE.MeshPhysicalMaterial({ color: 0x131211, roughness: 0.62, specularIntensity: 0.35, envMapIntensity: 0.4 });
  if (farbe === "eiche") return new THREE.MeshPhysicalMaterial({ map: eichenTextur(), roughness: 0.7, specularIntensity: 0.4 });
  return new THREE.MeshPhysicalMaterial({ color: 0xefece5, roughness: 0.66 });
}
