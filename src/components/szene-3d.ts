import * as THREE from "three";
import { Reflector } from "three/examples/jsm/objects/Reflector.js";
import type { Punkt } from "@/engine/clip";
import type { Lage, SchichtkartenErgebnis, Zone } from "@/engine/typen";
import { gravurFlaeche } from "./gravur-3d";
import { materialien, nachFlaechen } from "./material-3d";
import { rahmenGeometrie, rahmenMaterial } from "./rahmen-3d";
import { spiegelFlaeche } from "./spiegel-3d";

/**
 * Die Lagen als Acrylplatten in mm (Marcel 16.09.2026: "echtes 3D, das ich um
 * die Y-Achse drehen kann"). Jede Lage wird aus ihrer Schnittgeometrie mit
 * ihrer Materialstaerke extrudiert und von unten nach oben gestapelt; die Gravur
 * liegt als Textur auf dem Hintergrund, das Blau spiegelt echt (spiegel-3d.ts).
 *
 * Das Symbol liegt auf dem Hintergrund (der Lage auf dem Wasser), geklebt an
 * die gravierte Klebeflaeche, im Ausschnitt der Netzlage – und steht darueber hinaus.
 * Auseinandergezogen schwebt es ueber dem Stapel, der Holzrahmen noch darueber.
 */
// Punkte naeher als das zusammenfassen – die gepufferten Strassen haben runde
// Ecken aus sehr vielen kurzen Stuecken, die Triangulierung dauerte sonst Sekunden.
const PUNKTABSTAND_MM = 0.12;
const SYMBOL_LUFT_MM = 0.1;

/** Form um ihre Mitte verkleinern, so dass der Rand etwa mm nach innen rueckt. */
function einruecken(geo: THREE.BufferGeometry, mm: number) {
  geo.computeBoundingBox();
  const mitte = geo.boundingBox!.getCenter(new THREE.Vector3());
  const groesse = geo.boundingBox!.getSize(new THREE.Vector3());
  const f = 1 - (2 * mm) / Math.max(1, Math.min(groesse.x, groesse.y));
  geo.translate(-mitte.x, -mitte.y, 0);
  geo.scale(f, f, 1);
  geo.translate(mitte.x, mitte.y, 0);
}

export interface Platte {
  mesh: THREE.Mesh;
  gravur?: THREE.Mesh;
  /** Fein nachgezeichnete Gravur einer Nahaufnahme – ersetzt dann die grobe. */
  gravurDetail?: THREE.Mesh;
  /** Echte Spiegelflaeche auf dem blauen Spiegelacryl. */
  spiegel?: Reflector;
  lage?: Lage;
  /** Unterkante ohne Abstand zwischen den Lagen. */
  z: number;
  staerke: number;
  index: number;
}

export interface Stapel {
  gruppe: THREE.Group;
  platten: Platte[];
  /** Oberkante der obersten Lage, gemessen von der Rueckseite des Stapels. */
  hoehe: number;
  /** Aussenmasse samt Holzrahmen; hintenMm ist seine Rueckseite (0 ohne Rahmen). */
  aussen: { breiteMm: number; hoeheMm: number; hintenMm: number };
}

function ausduennen(ring: Punkt[]): Punkt[] {
  const aus: Punkt[] = [];
  for (const p of ring) {
    const l = aus[aus.length - 1];
    if (!l || Math.hypot(p.x - l.x, p.y - l.y) >= PUNKTABSTAND_MM) aus.push(p);
  }
  return aus.length >= 3 ? aus : ring;
}

function platteGeometrie(lage: Lage, b: number, h: number, staerke: number): THREE.BufferGeometry | null {
  // mm auf der Platte (y nach unten) -> Szene (Mitte im Ursprung, y nach oben)
  const v = (p: Punkt) => new THREE.Vector2(p.x - b / 2, h / 2 - p.y);
  const teile = lage.teile.map((t) => {
    const form = new THREE.Shape(ausduennen(t.aussen).map(v));
    form.holes = t.loecher.map((l) => new THREE.Path(ausduennen(l).map(v)));
    return new THREE.ExtrudeGeometry(form, { depth: staerke, bevelEnabled: false, curveSegments: 1 });
  });
  return teile.length ? nachFlaechen(teile) : null;
}

export function baueSzene(ergebnis: SchichtkartenErgebnis): Stapel {
  const { breiteMm: b, hoeheMm: h } = ergebnis.layout.platte;
  const gruppe = new THREE.Group();
  const platten: Platte[] = [];
  const platzieren = (lage: Lage, z: number, index: number) => {
    const geo = platteGeometrie(lage, b, h, lage.staerkeMm);
    if (!geo) return;
    const mesh = new THREE.Mesh(geo, materialien(lage));
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    const gravur = gravurFlaeche(lage, b, h, ergebnis.gravurExport);
    const echt = lage.key === "blau" ? spiegelFlaeche(b, h) : undefined;
    const spiegel = echt?.spiegel;
    gruppe.add(mesh);
    if (gravur) gruppe.add(gravur);
    if (echt) gruppe.add(echt.spiegel, echt.studio);
    platten.push({ mesh, gravur, spiegel, lage, z, staerke: lage.staerkeMm, index });
  };
  // Lagen kommen von oben nach unten; gestapelt wird von unten.
  let z = 0;
  let klebeflaeche = 0;
  [...ergebnis.lagen].reverse().filter((l) => l.key !== "symbol").forEach((lage, index) => {
    platzieren(lage, z, index);
    if (lage.key === "hintergrund") klebeflaeche = z + lage.staerkeMm;
    z += lage.staerkeMm;
  });
  const symbol = ergebnis.lagen.find((l) => l.key === "symbol");
  if (symbol) platzieren(symbol, klebeflaeche, platten.length);
  // Symbol und Ausschnitt haben dieselbe Kontur – ohne Luft flimmerten ihre Waende
  // ineinander. Echt sorgt die Schnittfuge fuer diese Luft.
  const gesetzt = platten[platten.length - 1];
  if (symbol && gesetzt?.lage === symbol) einruecken(gesetzt.mesh.geometry, SYMBOL_LUFT_MM);

  const r = ergebnis.rahmen;
  if (!r) return { gruppe, platten, hoehe: z, aussen: { breiteMm: b, hoeheMm: h, hintenMm: 0 } };
  // Die Bildoberflaeche liegt einlassMm hinter der Front des Rahmens.
  const mesh = new THREE.Mesh(rahmenGeometrie(r, b, h), rahmenMaterial(r.farbe));
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  gruppe.add(mesh);
  const hinten = z + r.einlassMm - r.tiefeMm;
  platten.push({ mesh, z: hinten, staerke: r.tiefeMm, index: platten.length });
  const zugabe = 2 * (r.breiteMm - r.ueberstandMm);
  return { gruppe, platten, hoehe: z, aussen: { breiteMm: b + zugabe, hoeheMm: h + zugabe, hintenMm: Math.min(0, hinten) } };
}

/** Lagen mit Abstand auseinanderziehen – 0 ist der fertige Stapel. */
export function stapeln(platten: Platte[], abstandMm: number) {
  for (const p of platten) {
    p.mesh.position.z = p.z + p.index * abstandMm;
    if (p.gravur) p.gravur.position.z = p.z + p.index * abstandMm + p.staerke + 0.02;
    if (p.gravurDetail) p.gravurDetail.position.z = p.z + p.index * abstandMm + p.staerke + 0.03;
    // 0,05 mm: bei Flat-Lay-Abstand (70 cm) flimmerten 0,02 mm mit der Deckflaeche.
    if (p.spiegel) p.spiegel.position.z = p.z + p.index * abstandMm + p.staerke + 0.05;
  }
}

/** Feine Gravur fuer den Bereich einer Nahaufnahme; null stellt die grobe wieder her. */
export function gravurDetail(stapel: Stapel, ergebnis: SchichtkartenErgebnis, bereich: Zone | null) {
  const { breiteMm: b, hoeheMm: h } = ergebnis.layout.platte;
  for (const p of stapel.platten) {
    if (!p.gravur || !p.lage) continue;
    if (p.gravurDetail) {
      stapel.gruppe.remove(p.gravurDetail);
      entsorgen(p.gravurDetail);
      p.gravurDetail = undefined;
    }
    p.gravur.visible = !bereich;
    if (!bereich) continue;
    p.gravurDetail = gravurFlaeche(p.lage, b, h, ergebnis.gravurExport, bereich);
    if (!p.gravurDetail) continue;
    p.gravurDetail.position.z = p.gravur.position.z + 0.01;
    stapel.gruppe.add(p.gravurDetail);
  }
}

export function entsorgen(objekt: THREE.Object3D) {
  objekt.traverse((o) => {
    // Der Spiegel haelt ein eigenes Renderziel.
    if (o instanceof Reflector) o.dispose();
    if (o instanceof THREE.Mesh) {
      o.geometry.dispose();
      for (const mat of (Array.isArray(o.material) ? o.material : [o.material]) as THREE.MeshStandardMaterial[]) {
        mat.map?.dispose();
        mat.dispose();
      }
    }
  });
}
