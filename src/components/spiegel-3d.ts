import * as THREE from "three";
import { Reflector } from "three/examples/jsm/objects/Reflector.js";

/**
 * Echte Spiegelung fuer das blaue Spiegelacryl (Marcel 16.09.2026: "sieht noch
 * etwas zu matt oder satiniert aus"). Eine Umgebungstextur spiegelt nur einen
 * gleichmaessig hellen Raum. Echtes Spiegelacryl spiegelt die Kanten der Lagen
 * darueber – das Wasser wirkt dadurch tiefer, als es ist.
 *
 * Die Flaeche liegt knapp ueber dem Blau und ist nur durch die Wasserschnitte
 * zu sehen; ueberall sonst deckt der Hintergrund sie ab.
 *
 * Im Spiegel steht ein kleines Studio: mittelgraues Umfeld und drei Softboxen,
 * nur fuer das Spiegelbild sichtbar. Die Raumumgebung als Hintergrund lieferte
 * dort Schwarz (die schraege Schnittebene des Spiegels schneidet den Himmel weg),
 * die helle Buehnenfarbe ein blasses Grau.
 *
 * Dunkelblaues Spiegelacryl (Marcel 16.09.2026: "das Blau wirkt heller, als es
 * wirklich ist", die harten Spiegelungen verdeckten Details): Toenung 0x7fb2ea ->
 * 0x2d4f8e, Softboxen mit weichem Verlauf statt harter Kante und 1,3 -> 0,7.
 */
// Hell wie ein Raum: bei 0x6f7378 wirkte das Wasser fast schwarz.
const UMFELD = new THREE.Color(0xb4b9bf);

/** Lichtfleck, der zum Rand hin im Umfeld verschwindet. */
function verlauf(): THREE.CanvasTexture {
  const leinwand = document.createElement("canvas");
  leinwand.width = leinwand.height = 128;
  const g = leinwand.getContext("2d")!;
  const r = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  r.addColorStop(0, "rgba(255,255,255,1)");
  r.addColorStop(0.4, "rgba(255,255,255,0.7)");
  r.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = r;
  g.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(leinwand);
}

function softbox(breite: number, hoehe: number, x: number, y: number, z: number): THREE.Mesh {
  const box = new THREE.Mesh(
    new THREE.PlaneGeometry(breite, hoehe),
    new THREE.MeshBasicMaterial({
      color: new THREE.Color(0.7, 0.7, 0.7),
      map: verlauf(),
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
  );
  box.position.set(x, y, z);
  box.lookAt(0, 0, 0);
  return box;
}

/** Spiegel und Studio in Plattenkoordinaten (Mitte im Ursprung, z aus der Platte heraus). */
export function spiegelFlaeche(b: number, h: number): { spiegel: Reflector; studio: THREE.Group } {
  const spiegel = new Reflector(new THREE.PlaneGeometry(b, h), {
    color: 0x2d4f8e,
    textureWidth: 2048,
    textureHeight: 2048,
    clipBias: 0.003,
  });
  const studio = new THREE.Group();
  studio.name = "spiegelstudio";
  // Direkt darueber fuer das Flat-Lay, schraeg dahinter fuer Nahaufnahmen von vorn, seitlich als Streifen.
  studio.add(softbox(420, 260, 0, 40, 700), softbox(520, 220, 0, 620, 430), softbox(140, 520, -520, 120, 380));
  studio.visible = false;

  const zeichnen = spiegel.onBeforeRender;
  spiegel.onBeforeRender = function (renderer, szene, ...rest) {
    const hintergrund = szene.background;
    szene.background = UMFELD;
    studio.visible = true;
    zeichnen.call(this, renderer, szene, ...rest);
    studio.visible = false;
    szene.background = hintergrund;
  };
  return { spiegel, studio };
}
