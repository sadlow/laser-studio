import * as THREE from "three";
import type { Stapel } from "./szene-3d";

/**
 * Buehne fuer Referenzbilder (Marcel 16.09.2026: aus dem 3D-Rendering mit dem
 * Leonardo-Skill fotorealistische Produktfotos machen). Boden und Wand sind
 * unsichtbar und fangen nur die Schatten – so weiss das Bildmodell, wo das
 * Produkt steht und woher das Licht kommt.
 *
 * frei:    aufrecht, Plattenmitte im Ursprung, keine Buehne.
 * wand:    steht auf dem Boden und lehnt oben an einer Wand.
 * liegend: flach auf dem Tisch, Oberseite nach oben – Flat-Lay und Nahaufnahmen.
 */
const NEIGUNG_GRAD = 12;

export type Anordnung = "frei" | "wand" | "liegend";

export interface Kulisse {
  /** Traeger fuer den Stapel: Drehpunkt an der Rueckseite (bei "wand" an der Unterkante). */
  halter: THREE.Group;
  anordnen: (art: Anordnung, stapel: Stapel) => void;
  /** Drehung der Raumumgebung, die zur Anordnung gehoert – die Sonnenstimmungen drehen selbst. */
  umgebungDrehung: THREE.Euler;
  /** Sonnenstimmung: Wand und Boden werden beleuchtete Flaechen, damit die Lichtmuster darauf fallen. */
  sonnig: (an: boolean) => void;
  entsorgen: () => void;
}

/**
 * grund: Buehnenfarbe der Fotomotive, z.B. reinweiss fuer das Amazon-Hauptbild.
 * wandschatten: auf Weiss zeichnete der Schatten an der Wand ein graues Dreieck
 * hinter die Platte – im KI-Foto sah sie aus wie ein Tischaufsteller.
 */
export function baueKulisse(szene: THREE.Scene, gross: number, grund = 0xf3f0ea, wandschatten = true, bodenschatten = true): Kulisse {
  const halter = new THREE.Group();
  szene.add(halter);

  // Eine ShadowMaterial-Flaeche zeigt nur Schatten, keine Lichtmaske. In der Sonne sind
  // Wand und Boden darum mattes Material in der Buehnenfarbe.
  const [schattenBoden, schattenWand] = [new THREE.ShadowMaterial({ opacity: 0.14 }), new THREE.ShadowMaterial({ opacity: 0.07 })];
  const matt = new THREE.MeshStandardMaterial({ color: grund, roughness: 0.95 });
  const boden = new THREE.Mesh<THREE.PlaneGeometry, THREE.Material>(new THREE.PlaneGeometry(gross * 5, gross * 5), schattenBoden);
  boden.rotation.x = -Math.PI / 2;
  boden.receiveShadow = true;
  const wand = new THREE.Mesh<THREE.PlaneGeometry, THREE.Material>(new THREE.PlaneGeometry(gross * 5, gross * 5), schattenWand);
  wand.receiveShadow = true;
  const umgebungDrehung = new THREE.Euler();

  return {
    halter,
    umgebungDrehung,
    sonnig: (an) => {
      boden.material = an ? matt : schattenBoden;
      wand.material = an ? matt : schattenWand;
    },
    anordnen: (art, stapel) => {
      const { hoeheMm: hoch, hintenMm } = stapel.aussen;
      const neigung = (NEIGUNG_GRAD * Math.PI) / 180;
      szene.remove(boden, wand);
      halter.position.set(0, 0, 0);
      halter.rotation.set(art === "wand" ? -neigung : art === "liegend" ? -Math.PI / 2 : 0, 0, 0);
      // Die Rueckseite (mit Rahmen dessen Rueckseite) liegt bei z = 0 im Halter.
      stapel.gruppe.position.set(0, 0, art === "frei" ? 0 : -hintenMm);
      if (art === "wand") {
        // Drehpunkt an der Unterkante; die Oberkante lehnt hinten an der Wand.
        halter.position.y = -hoch / 2;
        stapel.gruppe.position.y = hoch / 2;
        boden.position.y = -hoch / 2;
        wand.position.set(0, -hoch / 2 + gross * 2.5, -hoch * Math.sin(neigung) - 0.5);
        if (bodenschatten) szene.add(boden);
        if (wandschatten) szene.add(wand);
      } else if (art === "liegend") {
        // Knapp unter der Rueckseite, sonst flimmern Tisch und Plattenboden ineinander.
        boden.position.y = -0.05;
        if (bodenschatten) szene.add(boden);
      }
      szene.background = new THREE.Color(art === "frei" ? 0xeceae4 : grund);
      // Flach liegend spiegelte das Hochglanz-Schwarz die Deckenleuchte der
      // Raumumgebung als weisses Rechteck mitten in der Karte. Gekippt steht
      // ueber der Platte eine Wand statt der Leuchte.
      umgebungDrehung.set(art === "liegend" ? 0.9 : 0, 0, 0);
      szene.environmentRotation.copy(umgebungDrehung);
    },
    entsorgen: () => {
      for (const m of [boden, wand]) m.geometry.dispose();
      for (const m of [schattenBoden, schattenWand, matt]) m.dispose();
    },
  };
}
