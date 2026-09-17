import * as THREE from "three";
import type { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import type { SchichtkartenErgebnis } from "@/engine/typen";
import type { Beleuchtung } from "./licht-3d";
import { motivAufnahme, type Motiv } from "./motive-3d";
import type { Stapel } from "./szene-3d";

/**
 * Explosionszeichnung als Infografik (Marcel 17.09.2026: "so weit auseinanderziehen, dass man eine
 * tolle Infografik erstellen kann – die meisten haben so etwas noch nie gesehen").
 */

/** Weitester Abstand zwischen zwei Lagen im Regler. */
export const ABSTAND_MAX_MM = 200;
/** Damit startet die Explosionszeichnung, wenn der Stapel noch zu ist. */
export const ABSTAND_EXPLOSION_MM = 60;
/** So viel weiter weg steht die Kamera mit Beschriftung – daneben braucht der Text Platz. */
export const RAUM_BESCHRIFTUNG = 1.5;
/** Ab hier spiegelt das Blau nur noch den Raum: aufgezogen wurden aus den Lagen davor zackige Flecken. */
export const SPIEGEL_BIS_MM = 5;

/** Mitte des aufgezogenen Stapels in Weltkoordinaten. */
export function stapelMitte(s: Stapel, abstandMm: number): THREE.Vector3 {
  const tiefe = s.hoehe + (s.platten.length - 1) * abstandMm;
  return s.gruppe.localToWorld(new THREE.Vector3(0, 0, tiefe / 2));
}

/**
 * Beim Auseinanderziehen bleibt der Stapel im Bild: Blickziel, Kamera und Licht ruecken mit seiner
 * Mitte. In der Explosionszeichnung passt die Kamera auch ihren Abstand an, aus der Richtung, in die
 * sie gerade schaut – eine Drehung mit der Maus bleibt erhalten. Andere Motive bleiben stehen.
 */
export function folgeAbstand(
  motiv: Motiv,
  e: SchichtkartenErgebnis,
  s: Stapel,
  kamera: THREE.PerspectiveCamera,
  steuerung: OrbitControls,
  beleuchtung: Beleuchtung,
  vorher: number,
  jetzt: number,
  raum = 1,
) {
  if (motiv !== "frei" && motiv !== "explosion") return;
  const weg = stapelMitte(s, jetzt).sub(stapelMitte(s, vorher));
  steuerung.target.add(weg);
  kamera.position.add(weg);
  beleuchtung.verschieben(weg);
  const a = motiv === "explosion" ? motivAufnahme("explosion", e, s, jetzt) : null;
  if (!a) return;
  const vfov = (kamera.fov * Math.PI) / 180;
  const hfov = 2 * Math.atan(Math.tan(vfov / 2) * kamera.aspect);
  const abstand = Math.max(a.feld.breite / 2 / Math.tan(hfov / 2), a.feld.hoehe / 2 / Math.tan(vfov / 2));
  kamera.position.sub(steuerung.target).setLength(abstand * raum).add(steuerung.target);
  const licht = beleuchtung.licht;
  const bereich = a.licht.bereichMm;
  Object.assign(licht.shadow.camera, { left: -bereich, right: bereich, top: bereich, bottom: -bereich });
  licht.shadow.camera.updateProjectionMatrix();
}
