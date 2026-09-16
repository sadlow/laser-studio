import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import type { Kulisse } from "./kulisse-3d";
import { blaetterMaske, fensterBild, fensterMaske } from "./licht-muster";

/**
 * Lichtstimmungen der 3D-Ansicht (Marcel 16.09.2026: "statt einer Softbox irgendeine
 * komplexere Lichtquelle, die ein bisschen wie Sonnenlicht aussieht, oder vertraeumte
 * Schatten").
 *
 * studio:   neutrales Licht zum Pruefen der Details, wie bisher.
 * blaetter: tiefe, warme Sonne durch Laub – weiche Lichtflecken auf Platte, Wand und Tisch.
 * fenster:  Sonne durch ein Sprossenfenster – helle Scheiben mit weichen Sprossenschatten.
 *
 * Die Sonne ist ein SpotLight mit Lichtmaske weit draussen in Richtung des Hauptlichts; ein
 * Punktlicht mit Maske ergibt die Muster, die ein gerichtetes Licht nicht kann. Gespiegelt
 * wird in beiden Sonnenstimmungen ein Fenster statt der Leuchtkaesten der RoomEnvironment.
 */
export type Stimmung = "studio" | "blaetter" | "fenster";

export const STIMMUNG_TITEL: Record<Stimmung, string> = {
  studio: "Licht: Studio",
  blaetter: "Licht: Sonne durch Blaetter",
  fenster: "Licht: Sonne durchs Fenster",
};

/** Richtung des Fensters im Raum, in der die Sonne steht (Azimut wie atan2(x, z)). */
const FENSTER = new THREE.Vector3(-4.5, 4.6, 9.9);

/** Warmer Raum mit hellem Fenster – das spiegelt sich im Hochglanz statt eines Leuchtkastens. */
function sonnenRaum(bild: THREE.Texture): THREE.Scene {
  const raum = new THREE.Scene();
  const flaeche = (b: number, h: number, farbe: THREE.Color, map?: THREE.Texture) =>
    new THREE.Mesh(new THREE.PlaneGeometry(b, h), new THREE.MeshBasicMaterial({ color: farbe, map, side: THREE.DoubleSide }));
  const waende = new THREE.Mesh(new THREE.BoxGeometry(20, 14, 20), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.3, 0.27, 0.24), side: THREE.BackSide }));
  waende.position.y = 5;
  const boden = flaeche(20, 20, new THREE.Color(0.36, 0.3, 0.24));
  boden.rotation.x = -Math.PI / 2;
  boden.position.y = -1.9;
  const fenster = flaeche(6.5, 5.5, new THREE.Color(3.2, 3.05, 2.8), bild);
  fenster.position.copy(FENSTER);
  fenster.lookAt(0, FENSTER.y * 0.6, 0);
  raum.add(waende, boden, fenster);
  return raum;
}

export interface Beleuchtung {
  licht: THREE.DirectionalLight;
  setze: (s: Stimmung) => void;
  /** Nach jedem Motiv: Sonne und gespiegeltes Fenster folgen dem Hauptlicht. */
  ausrichten: () => void;
  entsorgen: () => void;
}

export function baueBeleuchtung(szene: THREE.Scene, renderer: THREE.WebGLRenderer, kulisse: Kulisse): Beleuchtung {
  const pmrem = new THREE.PMREMGenerator(renderer);
  const [studioRaum, sonnenraum] = [new RoomEnvironment(), sonnenRaum(fensterBild())];
  const umgebung = { studio: pmrem.fromScene(studioRaum).texture, sonne: pmrem.fromScene(sonnenraum, 0.02).texture };
  studioRaum.dispose();
  sonnenraum.traverse((o) => {
    if (!(o instanceof THREE.Mesh)) return;
    o.geometry.dispose();
    o.material.map?.dispose();
    o.material.dispose();
  });
  const masken = { blaetter: blaetterMaske(), fenster: fensterMaske() };

  const licht = new THREE.DirectionalLight(0xffffff, 1.6);
  licht.castShadow = true;
  licht.shadow.mapSize.set(2048, 2048);
  licht.shadow.bias = -0.0004;
  licht.shadow.normalBias = 0.3;
  const himmel = new THREE.HemisphereLight(0xffffff, 0xd8d4ca, 0.6);
  const sonne = new THREE.SpotLight(0xffecd4, 0, 0, 0.3, 0.45, 0);
  sonne.castShadow = true;
  sonne.shadow.mapSize.set(2048, 2048);
  sonne.shadow.bias = -0.0003;
  sonne.shadow.normalBias = 0.3;
  sonne.shadow.radius = 3;
  szene.add(licht, licht.target, himmel, sonne, sonne.target);

  let stimmung: Stimmung = "studio";
  const ausrichten = () => {
    if (stimmung === "studio") {
      szene.environmentRotation.copy(kulisse.umgebungDrehung);
      return;
    }
    const ziel = licht.target.position;
    const bereich = Math.max(licht.shadow.camera.right, 10);
    const richtung = licht.position.clone().sub(ziel).normalize();
    // Weit weg und schmal: fast parallele Strahlen wie bei der Sonne.
    const abstand = bereich * 8;
    sonne.position.copy(ziel).addScaledVector(richtung, abstand);
    sonne.target.position.copy(ziel);
    sonne.angle = Math.atan((bereich * 1.5) / abstand);
    Object.assign(sonne.shadow.camera, { near: Math.max(1, abstand - bereich * 4), far: abstand + bereich * 4 });
    sonne.shadow.camera.updateProjectionMatrix();
    // Das Fenster im Raum dorthin drehen, wo die Sonne steht – Spiegelung und Licht passen zusammen.
    szene.environmentRotation.set(0, Math.atan2(richtung.x, richtung.z) - Math.atan2(FENSTER.x, FENSTER.z), 0);
  };

  const setze = (s: Stimmung) => {
    stimmung = s;
    const studio = s === "studio";
    szene.environment = studio ? umgebung.studio : umgebung.sonne;
    szene.environmentIntensity = studio ? 0.7 : 0.55;
    licht.color.set(studio ? 0xffffff : 0xfff4e8);
    licht.intensity = studio ? 1.6 : 0.3;
    licht.castShadow = studio;
    himmel.color.set(studio ? 0xffffff : 0xfff8f0);
    himmel.groundColor.set(studio ? 0xd8d4ca : 0xc8b8a4);
    himmel.intensity = studio ? 0.6 : 0.35;
    sonne.visible = !studio;
    sonne.intensity = studio ? 0 : 3.4;
    sonne.map = studio ? null : masken[s];
    kulisse.sonnig(!studio);
    ausrichten();
  };

  setze("studio");
  return {
    licht,
    setze,
    ausrichten,
    entsorgen: () => {
      umgebung.studio.dispose();
      umgebung.sonne.dispose();
      masken.blaetter.dispose();
      masken.fenster.dispose();
      sonne.shadow.dispose();
      licht.shadow.dispose();
      pmrem.dispose();
    },
  };
}
