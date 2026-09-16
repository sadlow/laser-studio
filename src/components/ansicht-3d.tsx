"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import type { SchichtkartenErgebnis } from "@/engine/typen";
import { baueKulisse } from "./kulisse-3d";
import { baueSzene, entsorgen, stapeln } from "./szene-3d";

const AUSEINANDER_MM = 14;

/**
 * Drehbare 3D-Ansicht des Lagenstapels. Maus ziehen dreht (auch um die
 * Y-Achse), Rad zoomt, rechte Maustaste verschiebt. "Lagen auseinander" zieht
 * den Stapel auf, damit man sieht, welche Platte was traegt. "Fotoansicht"
 * lehnt die Platte an eine Wand und speichert ein Referenzbild fuer den
 * Leonardo-Skill.
 */
export function Ansicht3D({ ergebnis }: { ergebnis: SchichtkartenErgebnis }) {
  const box = useRef<HTMLDivElement>(null);
  // ?lagen=auseinander startet aufgezogen – fuer Tests und geteilte Links.
  const [auseinander, setAuseinander] = useState(() => new URLSearchParams(window.location.search).get("lagen") === "auseinander");
  // ?foto=1 startet in der Fotoansicht – fuer Referenzbilder aus dem Headless-Browser.
  const [foto, setFoto] = useState(() => new URLSearchParams(window.location.search).get("foto") === "1");
  const [baut, setBaut] = useState(true);
  const ziel = useRef(0);
  const startansicht = useRef<() => void>(() => {});
  const fotoSetzen = useRef<(an: boolean) => void>(() => {});
  const referenz = useRef<() => string>(() => "");
  ziel.current = auseinander ? AUSEINANDER_MM : 0;

  useEffect(() => fotoSetzen.current(foto), [foto, baut]);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    let aus = false;
    let bild = 0;
    setBaut(true);

    const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    el.appendChild(renderer.domElement);

    const szene = new THREE.Scene();
    szene.background = new THREE.Color(0xeceae4);
    const pmrem = new THREE.PMREMGenerator(renderer);
    szene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    szene.environmentIntensity = 0.7;

    const { breiteMm: b, hoeheMm: h } = ergebnis.layout.platte;
    const gross = Math.max(b, h);
    const kamera = new THREE.PerspectiveCamera(30, 1, 1, gross * 20);
    const steuerung = new OrbitControls(kamera, renderer.domElement);
    steuerung.enableDamping = true;
    steuerung.dampingFactor = 0.08;

    const licht = new THREE.DirectionalLight(0xffffff, 1.6);
    licht.position.set(-gross * 0.6, gross * 0.8, gross * 1.2);
    licht.castShadow = true;
    licht.shadow.mapSize.set(2048, 2048);
    Object.assign(licht.shadow.camera, { left: -gross * 0.7, right: gross * 0.7, top: gross * 0.7, bottom: -gross * 0.7, near: 1, far: gross * 4 });
    licht.shadow.bias = -0.0004;
    licht.shadow.normalBias = 0.3;
    szene.add(licht, new THREE.HemisphereLight(0xffffff, 0xd8d4ca, 0.6));
    const kulisse = baueKulisse(szene, h, gross);

    let abstand = ziel.current;
    let ansichtFoto = false;
    let stapel: ReturnType<typeof baueSzene> | null = null;
    // Erst malen, dann bauen: die Triangulierung dauert bei dichten Karten spuerbar.
    const bauen = window.setTimeout(() => {
      if (aus) return;
      stapel = baueSzene(ergebnis);
      stapeln(stapel.platten, abstand);
      // Im Halter sitzt die Unterkante auf dessen Drehpunkt; gerade stehend liegt die Mitte im Ursprung.
      stapel.gruppe.position.y = h / 2;
      kulisse.halter.add(stapel.gruppe);
      const d = (h / 2 / Math.tan((15 * Math.PI) / 180)) * 1.25;
      startansicht.current = () => {
        if (ansichtFoto) {
          steuerung.target.set(0, -h * 0.04, -h * 0.1);
          kamera.position.set(d * 0.55, h * 0.1, d * 1.12);
        } else {
          steuerung.target.set(0, 0, stapel!.hoehe / 2);
          kamera.position.set(d * 0.42, -d * 0.22, d * 0.88);
        }
        steuerung.update();
      };
      fotoSetzen.current = (an) => {
        ansichtFoto = an;
        kulisse.setze(an);
        startansicht.current();
      };
      referenz.current = () => {
        // Doppelte Aufloesung fuer das Referenzbild, danach zurueck.
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2) * 2);
        groesse();
        renderer.render(szene, kamera);
        const bild = renderer.domElement.toDataURL("image/png");
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        groesse();
        return bild;
      };
      startansicht.current();
      steuerung.minDistance = d * 0.25;
      steuerung.maxDistance = d * 3;
      setBaut(false);
    }, 30);

    const groesse = () => {
      const w = el.clientWidth;
      const hh = el.clientHeight;
      if (!w || !hh) return;
      renderer.setSize(w, hh);
      kamera.aspect = w / hh;
      kamera.updateProjectionMatrix();
    };
    const beobachter = new ResizeObserver(groesse);
    beobachter.observe(el);
    groesse();

    const zeichnen = () => {
      if (aus) return;
      bild = requestAnimationFrame(zeichnen);
      if (stapel && Math.abs(abstand - ziel.current) > 0.01) {
        abstand += (ziel.current - abstand) * 0.15;
        stapeln(stapel.platten, abstand);
      }
      steuerung.update();
      renderer.render(szene, kamera);
    };
    zeichnen();

    return () => {
      aus = true;
      window.clearTimeout(bauen);
      cancelAnimationFrame(bild);
      beobachter.disconnect();
      steuerung.dispose();
      if (stapel) entsorgen(stapel.gruppe);
      kulisse.entsorgen();
      szene.environment?.dispose();
      pmrem.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [ergebnis]);

  return (
    <div className="relative h-full w-full overflow-hidden rounded-md">
      <div ref={box} className="absolute inset-0" data-ansicht="3d" />
      <div className="absolute top-3 right-3 flex gap-1.5 text-xs">
        <button type="button" onClick={() => setAuseinander((a) => !a)} className="rounded-md border px-2.5 py-1 shadow-sm"
          style={auseinander ? { background: "var(--akzent)", borderColor: "var(--akzent)", color: "#fff" } : { background: "var(--karte)", borderColor: "var(--linie)" }}>
          Lagen auseinander
        </button>
        <button type="button" onClick={() => setFoto((f) => !f)} className="rounded-md border px-2.5 py-1 shadow-sm"
          style={foto ? { background: "var(--akzent)", borderColor: "var(--akzent)", color: "#fff" } : { background: "var(--karte)", borderColor: "var(--linie)" }}>
          Fotoansicht
        </button>
        {foto && (
          <button type="button" className="rounded-md border px-2.5 py-1 shadow-sm" style={{ background: "var(--karte)", borderColor: "var(--linie)" }}
            onClick={() => {
              const a = document.createElement("a");
              a.href = referenz.current();
              a.download = "schichtkarte-referenz.png";
              a.click();
            }}>
            Referenzbild speichern
          </button>
        )}
        <button type="button" onClick={() => startansicht.current()} className="rounded-md border px-2.5 py-1 shadow-sm"
          style={{ background: "var(--karte)", borderColor: "var(--linie)" }}>
          Ansicht zuruecksetzen
        </button>
      </div>
      {baut && <p className="absolute inset-0 flex items-center justify-center text-sm" style={{ color: "var(--gedaempft)" }}>baut 3D…</p>}
      <p className="pointer-events-none absolute bottom-3 left-3 text-xs" style={{ color: "var(--gedaempft)", display: foto ? "none" : undefined }}>
        Ziehen dreht · Rad zoomt · rechte Maustaste verschiebt · {ergebnis.lagen.map((l) => `${l.titel} ${l.staerkeMm} mm`).join(" · ")}
        {" "}· Symbol auf dem Hintergrund, {ergebnis.kennzahlen.symbolUeberNetzMm.toFixed(1)} mm ueber dem Netz
      </p>
    </div>
  );
}
