import * as THREE from "three";

/**
 * Fotoansicht fuer Referenzbilder (Marcel 16.09.2026: aus dem 3D-Rendering mit
 * dem Leonardo-Skill ein fotorealistisches Produktfoto machen). Die Platte steht
 * mit der Unterkante auf dem Boden und lehnt oben an einer Wand; Boden und Wand
 * sind unsichtbar und fangen nur die Schatten – so weiss das Bildmodell, wo das
 * Produkt steht und woher das Licht kommt.
 */
const NEIGUNG_GRAD = 12;

export interface Kulisse {
  /** Traeger fuer den Stapel: Drehpunkt an der Unterkante. */
  halter: THREE.Group;
  setze: (foto: boolean) => void;
  entsorgen: () => void;
}

export function baueKulisse(szene: THREE.Scene, h: number, gross: number): Kulisse {
  const halter = new THREE.Group();
  halter.position.y = -h / 2;
  szene.add(halter);

  const schatten = (deckkraft: number) => new THREE.ShadowMaterial({ opacity: deckkraft });
  const boden = new THREE.Mesh(new THREE.PlaneGeometry(gross * 4, gross * 4), schatten(0.14));
  boden.rotation.x = -Math.PI / 2;
  boden.position.y = -h / 2;
  boden.receiveShadow = true;
  // Die Oberkante liegt hinten an der Wand an.
  const wandZ = -h * Math.sin((NEIGUNG_GRAD * Math.PI) / 180) - 0.5;
  const wand = new THREE.Mesh(new THREE.PlaneGeometry(gross * 4, gross * 4), schatten(0.07));
  wand.position.set(0, gross * 1.5, wandZ);
  wand.receiveShadow = true;
  const kulisse = new THREE.Group();
  kulisse.add(boden, wand);

  return {
    halter,
    setze: (foto) => {
      halter.rotation.x = foto ? (-NEIGUNG_GRAD * Math.PI) / 180 : 0;
      if (foto) szene.add(kulisse);
      else szene.remove(kulisse);
      szene.background = new THREE.Color(foto ? 0xf3f0ea : 0xeceae4);
    },
    entsorgen: () => {
      for (const m of [boden, wand]) {
        m.geometry.dispose();
        (m.material as THREE.Material).dispose();
      }
    },
  };
}
