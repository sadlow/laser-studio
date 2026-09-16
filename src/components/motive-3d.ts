import * as THREE from "three";
import type { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import type { SchichtkartenErgebnis, Zone } from "@/engine/typen";
import type { Anordnung, Kulisse } from "./kulisse-3d";
import { layoutFeldMm } from "@/engine/amazon-container";
import { standardSchichtkarte } from "@/engine/standard";
import { gravurDetail, type Stapel } from "./szene-3d";

/**
 * Kameramotive fuer Referenzbilder (Marcel 16.09.2026): neben der Platte an der
 * Wand ein Flat-Lay und Nahaufnahmen, in denen man die glatt gelaserten Kanten
 * und die Tiefe der Lagen sieht – Vorlagen fuer Produktfotos und spaeter Videos.
 * Die Kamera zielt auf echte Stellen dieser Karte, nicht auf feste Punkte.
 */
export type Motiv = "frei" | "wand" | "flach" | "symbol" | "titel" | "wasser" | "kante" | "layout" | "explosion";

export const MOTIV_TITEL: Record<Motiv, string> = {
  frei: "Freie Ansicht",
  wand: "Foto: an der Wand",
  flach: "Foto: flach liegend",
  symbol: "Nah: Symbol",
  titel: "Nah: Titel",
  wasser: "Nah: Uferkante",
  kante: "Nah: Rand",
  layout: "Layout: gerade von vorn",
  explosion: "Explosionszeichnung",
};

interface Aufnahme {
  anordnung: Anordnung;
  /** Ziel auf der Platte (mm, y nach unten) und Hoehe ueber der Rueckseite des Stapels. */
  x: number;
  y: number;
  z: number;
  /** Kamera: Winkel ueber dem Tisch, Richtung um die Senkrechte (0 = von vorn, positiv = von rechts). */
  hoehe: number;
  richtung: number;
  /** Was mindestens ins Bild muss, in mm am Ziel. */
  feld: { breite: number; hoehe: number };
  fov: number;
  licht: { hoehe: number; bereichMm: number; richtung?: number };
  detail?: Zone;
}

// Licht von links hinten oben: Schatten fallen nach rechts vorn, jede Stufe zeichnet sich ab.
const LICHT_RICHTUNG = 215;

/** Ein Punkt an der Uferkante im Kartenfenster, etwa 45 mm neben dem Symbol – nah genug fuer denselben Kiez, weit genug, dass es nicht halb im Bild steht. */
function uferPunkt(e: SchichtkartenErgebnis): { x: number; y: number } | null {
  const f = e.layout.kartenfenster;
  const bezug = e.symbol ? { x: e.symbol.ankerXMm, y: e.symbol.ankerYMm } : { x: f.xMm + f.breiteMm / 2, y: f.yMm + f.hoeheMm / 2 };
  let bester: { x: number; y: number } | null = null;
  let abweichung = Infinity;
  for (const t of e.lagen.find((l) => l.key === "hintergrund")?.teile ?? []) {
    for (const ring of [t.aussen, ...t.loecher]) {
      for (const p of ring) {
        // Der Plattenrand ist keine Uferkante.
        if (p.x < f.xMm + 8 || p.y < f.yMm + 8 || p.x > f.xMm + f.breiteMm - 8 || p.y > f.yMm + f.hoeheMm - 8) continue;
        const a = Math.abs(Math.hypot(p.x - bezug.x, p.y - bezug.y) - 45);
        if (a < abweichung) [abweichung, bester] = [a, p];
      }
    }
  }
  return bester;
}

function aufnahme(motiv: Motiv, e: SchichtkartenErgebnis, s: Stapel, abstandMm: number): Aufnahme | null {
  const { breiteMm: b, hoeheMm: h } = e.layout.platte;
  if (motiv === "layout") {
    // Amazon-Custom-Vorschau (Marcel 16.09.2026): gerade von vorn, kaum Perspektive, Platz fuer
    // den Rahmen auch ohne Rahmen – so steht die Platte bei jeder Rahmenwahl an derselben Stelle.
    const feld = layoutFeldMm(b, h, standardSchichtkarte().holzrahmenProfil);
    return { anordnung: "frei", x: b / 2, y: h / 2, z: s.hoehe, hoehe: 0, richtung: 0, fov: 10, feld: { breite: feld, hoehe: feld }, licht: { hoehe: 35, richtung: -30, bereichMm: feld * 0.7 } };
  }
  if (motiv === "explosion") {
    // Lagen weit auseinander (?abstand=), schraeg von vorn rechts – Ziel ist die Mitte des aufgezogenen Stapels.
    const tiefe = s.hoehe + (s.platten.length - 1) * abstandMm;
    const gross = Math.max(b, h);
    return { anordnung: "frei", x: b / 2, y: h / 2, z: tiefe / 2, hoehe: 18, richtung: 36, fov: 24, feld: { breite: gross * 0.8 + tiefe * 0.8, hoehe: gross * 1.2 },
      licht: { hoehe: 40, richtung: -25, bereichMm: gross + tiefe } };
  }
  const f = e.layout.kartenfenster;
  const nah = (x: number, y: number, feld: number, hoehe: number, richtung: number, z = s.hoehe): Aufnahme => ({
    anordnung: "liegend", x, y, z, hoehe, richtung, feld: { breite: feld, hoehe: 0 }, fov: 20,
    licht: { hoehe: 32, bereichMm: feld * 1.4 },
    detail: { xMm: x - feld * 1.4, yMm: y - feld * 1.4, breiteMm: feld * 2.8, hoeheMm: feld * 2.8 },
  });
  if (motiv === "flach") {
    const rand = 1.3;
    return {
      anordnung: "liegend", x: b / 2, y: h / 2, z: s.hoehe, hoehe: 88, richtung: 0, fov: 30,
      feld: { breite: s.aussen.breiteMm * rand, hoehe: s.aussen.hoeheMm * rand },
      licht: { hoehe: 55, bereichMm: Math.max(s.aussen.breiteMm, s.aussen.hoeheMm) * 0.8 },
    };
  }
  if (motiv === "symbol" && e.symbol) {
    const sy = e.symbol;
    return nah(sy.xMm + sy.breiteMm / 2, sy.yMm + sy.hoeheMm / 2, Math.max(50, sy.breiteMm * 4.5), 38, 20);
  }
  const titel = e.textZonen.find((t) => t.name === "Titel")?.zone;
  if (motiv === "titel" && titel) {
    // Das ganze Wort im Bild – angeschnitten war es nicht mehr lesbar.
    return nah(titel.xMm + titel.breiteMm / 2, titel.yMm + titel.hoeheMm / 2, Math.min(170, Math.max(60, titel.breiteMm * 1.15)), 40, -15);
  }
  const ufer = motiv === "wasser" ? uferPunkt(e) : null;
  if (ufer) return nah(ufer.x, ufer.y, 45, 35, 25);
  if (motiv === "kante") {
    // Ohne Rahmen von aussen auf die Schnittkante mit allen Lagen. Mit Rahmen ueber
    // die Karte auf die Lippe: ihr Schatten und die 6 mm, die das Bild tiefer liegt.
    // Von aussen sah man fast nur die dunkle Aussenseite der Leiste.
    const y = f.yMm + f.hoeheMm * 0.35;
    return e.rahmen ? nah(e.rahmen.ueberstandMm + 4, y, 55, 35, 55) : nah(0, y, 45, 20, -62, s.hoehe / 2);
  }
  return null;
}

export function motivMoeglich(motiv: Motiv, e: SchichtkartenErgebnis): boolean {
  if (motiv === "symbol") return !!e.symbol;
  if (motiv === "titel") return e.textZonen.some((t) => t.name === "Titel");
  if (motiv === "wasser") return !!uferPunkt(e);
  return true;
}

export interface Buehne {
  kamera: THREE.PerspectiveCamera;
  steuerung: OrbitControls;
  licht: THREE.DirectionalLight;
  kulisse: Kulisse;
  /** Abstand der aufgezogenen Lagen – die Explosionszeichnung zielt auf ihre Mitte. */
  abstandMm?: number;
}

const richtung = (hoeheGrad: number, richtungGrad: number) => {
  const [e, a] = [(hoeheGrad * Math.PI) / 180, (richtungGrad * Math.PI) / 180];
  return new THREE.Vector3(Math.sin(a) * Math.cos(e), Math.sin(e), Math.cos(a) * Math.cos(e));
};

/** Stellt Buehne, Kamera, Licht und feine Gravur fuer ein Motiv ein. */
export function motivAnwenden(motiv: Motiv, e: SchichtkartenErgebnis, s: Stapel, { kamera, steuerung, licht, kulisse, abstandMm = 0 }: Buehne) {
  const a = aufnahme(motiv, e, s, abstandMm);
  const anordnung: Anordnung = a?.anordnung ?? (motiv === "wand" ? "wand" : "frei");
  kulisse.anordnen(anordnung, s);
  kulisse.halter.updateMatrixWorld(true);
  gravurDetail(s, e, a?.detail ?? null);

  const hoch = s.aussen.hoeheMm;
  const gross = Math.max(s.aussen.breiteMm, hoch);
  const d = (hoch / 2 / Math.tan((15 * Math.PI) / 180)) * 1.25;
  kamera.fov = a?.fov ?? 30;
  // Spiegel und Gravur liegen 0,02-0,05 mm ueber ihrer Platte. Mit near = 1 mm reichte die
  // Tiefengenauigkeit ab gut 2 m Abstand nicht: im A3-Layoutbild fehlte die Gravur, der Spiegel flimmerte weg.
  kamera.near = a ? 50 : 5;
  kamera.updateProjectionMatrix();
  let bereich = gross * 0.7;
  if (!a) {
    if (anordnung === "wand") {
      steuerung.target.set(0, -hoch * 0.04, -hoch * 0.1);
      kamera.position.set(d * 0.55, hoch * 0.1, d * 1.12);
    } else {
      steuerung.target.set(0, 0, s.hoehe / 2);
      kamera.position.set(d * 0.42, -d * 0.22, d * 0.88);
    }
    licht.position.set(-gross * 0.6, gross * 0.8, gross * 1.2);
    licht.target.position.set(0, 0, 0);
  } else {
    const { breiteMm: b, hoeheMm: h } = e.layout.platte;
    const ziel = s.gruppe.localToWorld(new THREE.Vector3(a.x - b / 2, h / 2 - a.y, a.z));
    const vfov = (kamera.fov * Math.PI) / 180;
    const hfov = 2 * Math.atan(Math.tan(vfov / 2) * kamera.aspect);
    const abstand = Math.max(a.feld.breite / 2 / Math.tan(hfov / 2), a.feld.hoehe / 2 / Math.tan(vfov / 2));
    steuerung.target.copy(ziel);
    kamera.position.copy(ziel).add(richtung(a.hoehe, a.richtung).multiplyScalar(abstand));
    licht.position.copy(ziel).add(richtung(a.licht.hoehe, a.licht.richtung ?? LICHT_RICHTUNG).multiplyScalar(gross * 1.5));
    licht.target.position.copy(ziel);
    bereich = a.licht.bereichMm;
  }
  // Schattenkamera eng um das Motiv: bei Nahaufnahmen sonst 0,2 mm pro Schattenpixel.
  Object.assign(licht.shadow.camera, { left: -bereich, right: bereich, top: bereich, bottom: -bereich, near: 1, far: gross * 4 });
  licht.shadow.camera.updateProjectionMatrix();
  steuerung.maxDistance = d * 3;
  steuerung.update();
}
