import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import type { SchichtkartenErgebnis } from "@/engine/typen";
import type { aufnahmeParameter } from "./aufnahme-3d";
import { beschriftungen, ebeneZeichnen, zeichneBeschriftung } from "./beschriftung-3d";
import { folgeAbstand, RAUM_BESCHRIFTUNG, SPIEGEL_BIS_MM } from "./explosion-3d";
import { HELLE_SCHRIFT, type Hintergrund } from "./hintergrund-3d";
import { baueKulisse } from "./kulisse-3d";
import { baueBeleuchtung, type Stimmung } from "./licht-3d";
import { motivAnwenden, type Motiv } from "./motive-3d";
import { studioEinrichten } from "./spiegel-3d";
import { baueSzene, entsorgen, stapeln, type Stapel } from "./szene-3d";

/** Was die Leiste einstellt – die Buehne uebernimmt es, sobald der Stapel gebaut ist. */
export interface Einstellung {
  motiv: Motiv;
  stimmung: Stimmung;
  abstandMm: number;
  hintergrund: Hintergrund;
  beschriftung: boolean;
}

export interface Buehne {
  setze: (e: Einstellung, motivNeu: boolean) => void;
  referenz: () => string;
  beenden: () => void;
}

interface Anschluss {
  box: HTMLDivElement;
  ebene: SVGSVGElement;
  aufnahme: ReturnType<typeof aufnahmeParameter>;
  /** Seitenverhaeltnis der Leinwand im Fotomotiv, sonst null. */
  verhaeltnis: () => number | null;
  gebaut: () => void;
}

/**
 * Renderer, Kamera, Licht und Stapel der 3D-Ansicht (aus ansicht-3d.tsx). Gezeichnet wird nur, wenn sich
 * etwas geaendert hat – im Headless-Browser kostet ein Bild mit Schatten Sekunden.
 */
export function starteBuehne(ergebnis: SchichtkartenErgebnis, a: Anschluss, start: Einstellung): Buehne {
  let [aus, bild, neu] = [false, 0, true];
  let e = start;
  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  const pixel = Math.min(window.devicePixelRatio, 2);
  renderer.setPixelRatio(pixel);
  renderer.shadowMap.enabled = true;
  // PCFSoftShadowMap gibt es in three nicht mehr; weiche Kanten ueber shadow.radius.
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  a.box.appendChild(renderer.domElement);

  const szene = new THREE.Scene();
  const { breiteMm: b, hoeheMm: h } = ergebnis.layout.platte;
  const gross = Math.max(b, h);
  const kamera = new THREE.PerspectiveCamera(30, 1, 1, gross * 20);
  const steuerung = new OrbitControls(kamera, renderer.domElement);
  steuerung.enableDamping = true;
  steuerung.dampingFactor = 0.08;
  steuerung.minDistance = 20;
  const auf = a.aufnahme;
  const kulisse = baueKulisse(szene, gross, auf.grund, auf.wandschatten, auf.bodenschatten);
  const beleuchtung = baueBeleuchtung(szene, renderer, kulisse);

  const groesse = () => {
    let [w, hh] = [a.box.clientWidth, a.box.clientHeight];
    if (!w || !hh) return;
    const v = a.verhaeltnis();
    if (v && w / hh > v) w = Math.round(hh * v);
    else if (v) hh = Math.round(w / v);
    renderer.setSize(w, hh);
    kamera.aspect = w / hh;
    kamera.updateProjectionMatrix();
    neu = true;
  };
  const beobachter = new ResizeObserver(groesse);
  beobachter.observe(a.box);

  let stapel: Stapel | null = null;
  let studio: THREE.Group | undefined;
  let [abstand, kameraAbstand] = [start.abstandMm, start.abstandMm];

  const motiv = () => {
    if (!stapel) return;
    groesse();
    motivAnwenden(e.motiv, ergebnis, stapel, { kamera, steuerung, licht: beleuchtung.licht, kulisse, abstandMm: e.abstandMm });
    // Die freie Ansicht zielt auf den geschlossenen Stapel, die Explosionszeichnung auf den aufgezogenen.
    kameraAbstand = e.motiv === "explosion" ? e.abstandMm : 0;
    if (e.motiv === "explosion" && e.beschriftung) kamera.position.sub(steuerung.target).multiplyScalar(RAUM_BESCHRIFTUNG).add(steuerung.target);
    beleuchtung.ausrichten();
    auf.ausschnitt(kamera, renderer, steuerung.target);
    beleuchtung.merken(kamera, steuerung.target);
    auf.drehen(kamera, steuerung.target);
  };
  const licht = () => {
    beleuchtung.setze(e.stimmung);
    beleuchtung.merken(kamera, steuerung.target);
    if (auf.umgebung !== undefined) szene.environmentIntensity = auf.umgebung;
    if (studio && auf.softboxen) studioEinrichten(studio, e.stimmung);
    else studio?.clear();
  };
  // Aufgezogen spiegelt das Blau nur den Raum – als voller Spiegel wirkte es dort fast schwarz mit
  // pixeligen Lichtflecken. Etwas Farbe und weichere Spiegelung zeigen es als blaues Spiegelacryl.
  const spiegeln = () => {
    const zu = abstand < SPIEGEL_BIS_MM;
    for (const p of stapel?.platten ?? []) {
      if (p.spiegel) p.spiegel.visible = auf.spiegel && zu;
      if (p.lage?.key !== "blau") continue;
      const flaeche = (p.mesh.material as THREE.MeshPhysicalMaterial[])[0];
      [flaeche.metalness, flaeche.roughness, flaeche.clearcoat] = zu ? [1, 0.02, 0] : [0.45, 0.22, 1];
    }
  };

  // Erst malen, dann bauen: die Triangulierung dauert bei dichten Karten spuerbar.
  const bauen = window.setTimeout(() => {
    if (aus) return;
    stapel = baueSzene(ergebnis);
    stapeln(stapel.platten, abstand);
    kulisse.halter.add(stapel.gruppe);
    studio = stapel.gruppe.getObjectByName("spiegelstudio") as THREE.Group | undefined;
    spiegeln();
    kulisse.hintergrund(e.hintergrund);
    motiv();
    licht();
    neu = true;
    a.gebaut();
  }, 30);

  const beschriften = () => {
    const c = renderer.domElement;
    ebeneZeichnen(a.ebene, c, e.beschriftung && stapel ? beschriftungen(ergebnis, stapel, kamera, c.clientWidth, c.clientHeight) : null, HELLE_SCHRIFT[e.hintergrund]);
  };

  const zeichnen = () => {
    if (aus) return;
    bild = requestAnimationFrame(zeichnen);
    if (stapel && abstand !== e.abstandMm) {
      abstand = Math.abs(e.abstandMm - abstand) < 0.05 ? e.abstandMm : abstand + (e.abstandMm - abstand) * 0.15;
      stapeln(stapel.platten, abstand);
      spiegeln();
      neu = true;
    }
    if (stapel && kameraAbstand !== abstand) {
      folgeAbstand(e.motiv, ergebnis, stapel, kamera, steuerung, beleuchtung, kameraAbstand, abstand, e.beschriftung ? RAUM_BESCHRIFTUNG : 1);
      kameraAbstand = abstand;
    }
    if (steuerung.update() || neu) {
      beleuchtung.folgen(kamera, steuerung.target);
      renderer.render(szene, kamera);
      beschriften();
      neu = false;
    }
  };
  zeichnen();

  return {
    setze: (neuE, motivNeu) => {
      const vorher = e;
      e = neuE;
      if (!stapel) return;
      if (neuE.hintergrund !== vorher.hintergrund) kulisse.hintergrund(neuE.hintergrund);
      if (neuE.stimmung !== vorher.stimmung) licht();
      if (motivNeu) motiv();
      neu = true;
    },
    referenz: () => {
      // Referenzbild mit rund 2800 px an der langen Kante, danach zurueck – mit Beschriftung, wenn sie an ist.
      const c = renderer.domElement;
      const [w, hh] = [c.clientWidth, c.clientHeight];
      renderer.setPixelRatio(Math.min(4, 2800 / Math.max(w, hh)));
      renderer.render(szene, kamera);
      let png = c.toDataURL("image/png");
      if (e.beschriftung && stapel) {
        const leinwand = document.createElement("canvas");
        [leinwand.width, leinwand.height] = [c.width, c.height];
        const g = leinwand.getContext("2d")!;
        g.drawImage(c, 0, 0);
        zeichneBeschriftung(g, beschriftungen(ergebnis, stapel, kamera, w, hh), HELLE_SCHRIFT[e.hintergrund], c.width / w);
        png = leinwand.toDataURL("image/png");
      }
      renderer.setPixelRatio(pixel);
      neu = true;
      return png;
    },
    beenden: () => {
      aus = true;
      window.clearTimeout(bauen);
      cancelAnimationFrame(bild);
      beobachter.disconnect();
      steuerung.dispose();
      if (stapel) entsorgen(stapel.gruppe);
      kulisse.entsorgen();
      beleuchtung.entsorgen();
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
