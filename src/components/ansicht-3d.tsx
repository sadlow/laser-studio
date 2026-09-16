"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import type { SchichtkartenErgebnis } from "@/engine/typen";
import { Leiste3D, SEITEN, seitenZahl, type Seiten } from "./ansicht-3d-leiste";
import { aufnahmeParameter } from "./aufnahme-3d";
import { baueKulisse } from "./kulisse-3d";
import { MOTIV_TITEL, motivAnwenden, motivMoeglich, type Motiv } from "./motive-3d";
import { baueSzene, entsorgen, stapeln, type Stapel } from "./szene-3d";

const AUSEINANDER_MM = 14;
const ohne = { anwenden: (_m: Motiv) => {}, groesse: () => {}, referenz: () => "" };

/**
 * Drehbare 3D-Ansicht des Lagenstapels. Maus ziehen dreht (auch um die
 * Y-Achse), Rad zoomt, rechte Maustaste verschiebt. "Lagen auseinander" zieht
 * den Stapel auf. Die Motive stellen Buehne und Kamera fuer Referenzbilder ein
 * (Leonardo-Skill): an der Wand, flach liegend und Nahaufnahmen.
 *
 * URL fuer Headless-Aufnahmen: ?ansicht=3d&foto=symbol&seiten=16:9&vollbild=1
 * (foto=1 ist die Wand), ?lagen=auseinander zieht den Stapel auf.
 */
export function Ansicht3D({ ergebnis }: { ergebnis: SchichtkartenErgebnis }) {
  const box = useRef<HTMLDivElement>(null);
  const [url] = useState(() => new URLSearchParams(window.location.search));
  const [auseinander, setAuseinander] = useState(() => url.get("lagen") === "auseinander");
  const [motiv, setMotiv] = useState<Motiv>(() => {
    const f = url.get("foto");
    return f === "1" ? "wand" : f && f in MOTIV_TITEL ? (f as Motiv) : "frei";
  });
  const [seiten, setSeiten] = useState<Seiten>(() => ((SEITEN as readonly string[]).includes(url.get("seiten") ?? "") ? (url.get("seiten") as Seiten) : "4:3"));
  const vollbild = url.get("vollbild") === "1";
  const aufnahme = useMemo(() => aufnahmeParameter(url), [url]);
  const [baut, setBaut] = useState(true);
  const motive = useMemo(() => (Object.keys(MOTIV_TITEL) as Motiv[]).filter((m) => motivMoeglich(m, ergebnis)), [ergebnis]);
  const aktiv = motive.includes(motiv) ? motiv : "frei";
  const ziel = useRef(0);
  const verhaeltnis = useRef<number | null>(null);
  const steuer = useRef(ohne);
  ziel.current = auseinander ? AUSEINANDER_MM : 0;
  // Im Fotomotiv zeigt die Leinwand genau das Seitenverhaeltnis des Referenzbilds.
  verhaeltnis.current = aktiv === "frei" ? null : seitenZahl(seiten);

  useEffect(() => {
    steuer.current.groesse();
    steuer.current.anwenden(aktiv);
  }, [aktiv, seiten, baut]);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    let aus = false;
    let bild = 0;
    setBaut(true);

    const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    const pixel = Math.min(window.devicePixelRatio, 2);
    renderer.setPixelRatio(pixel);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    el.appendChild(renderer.domElement);

    const szene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(renderer);
    szene.environment = pmrem.fromScene(new RoomEnvironment()).texture;
    szene.environmentIntensity = 0.7;

    const { breiteMm: b, hoeheMm: h } = ergebnis.layout.platte;
    const gross = Math.max(b, h);
    const kamera = new THREE.PerspectiveCamera(30, 1, 1, gross * 20);
    const steuerung = new OrbitControls(kamera, renderer.domElement);
    steuerung.enableDamping = true;
    steuerung.dampingFactor = 0.08;
    steuerung.minDistance = 20;

    const licht = new THREE.DirectionalLight(0xffffff, 1.6);
    licht.castShadow = true;
    licht.shadow.mapSize.set(2048, 2048);
    licht.shadow.bias = -0.0004;
    licht.shadow.normalBias = 0.3;
    szene.add(licht, licht.target, new THREE.HemisphereLight(0xffffff, 0xd8d4ca, 0.6));
    const kulisse = baueKulisse(szene, gross, aufnahme.grund, aufnahme.wandschatten);

    // Gezeichnet wird nur, wenn sich etwas geaendert hat – im Headless-Browser
    // (Software-Grafik) kostet ein Bild mit Schatten Sekunden.
    let neu = true;
    const groesse = () => {
      let [w, hh] = [el.clientWidth, el.clientHeight];
      if (!w || !hh) return;
      const v = verhaeltnis.current;
      if (v && w / hh > v) w = Math.round(hh * v);
      else if (v) hh = Math.round(w / v);
      renderer.setSize(w, hh);
      kamera.aspect = w / hh;
      kamera.updateProjectionMatrix();
      neu = true;
    };
    const beobachter = new ResizeObserver(groesse);
    beobachter.observe(el);
    groesse();

    let abstand = ziel.current;
    let stapel: Stapel | null = null;
    // Erst malen, dann bauen: die Triangulierung dauert bei dichten Karten spuerbar.
    const bauen = window.setTimeout(() => {
      if (aus) return;
      const s = baueSzene(ergebnis);
      stapel = s;
      stapeln(s.platten, abstand);
      kulisse.halter.add(s.gruppe);
      steuer.current = {
        groesse,
        anwenden: (m) => {
          motivAnwenden(m, ergebnis, s, { kamera, steuerung, licht, kulisse });
          aufnahme.ausschnitt(kamera, renderer);
          neu = true;
        },
        referenz: () => {
          // Referenzbild mit rund 2800 px an der langen Kante, danach zurueck.
          const g = renderer.getSize(new THREE.Vector2());
          renderer.setPixelRatio(Math.min(4, 2800 / Math.max(g.x, g.y)));
          renderer.render(szene, kamera);
          const png = renderer.domElement.toDataURL("image/png");
          renderer.setPixelRatio(pixel);
          return png;
        },
      };
      setBaut(false);
    }, 30);

    const zeichnen = () => {
      if (aus) return;
      bild = requestAnimationFrame(zeichnen);
      if (stapel && Math.abs(abstand - ziel.current) > 0.01) {
        abstand += (ziel.current - abstand) * 0.15;
        stapeln(stapel.platten, abstand);
        neu = true;
      }
      if (steuerung.update() || neu) {
        renderer.render(szene, kamera);
        neu = false;
      }
    };
    zeichnen();

    return () => {
      aus = true;
      steuer.current = ohne;
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

  const speichern = () => {
    const a = document.createElement("a");
    a.href = steuer.current.referenz();
    a.download = `schichtkarte-${aktiv}-${seiten.replace(":", "x")}.png`;
    a.click();
  };
  const r = ergebnis.rahmen;

  return (
    <div className={vollbild ? "fixed inset-0 z-50" : "relative h-full w-full overflow-hidden rounded-md"} style={vollbild ? { background: "#f3f0ea" } : undefined}>
      {/* Die Next-Entwickleranzeige gehoert nicht ins Referenzbild. */}
      {vollbild && <style>{"nextjs-portal{display:none!important}"}</style>}
      <div ref={box} className="absolute inset-0 flex items-center justify-center" data-ansicht="3d" data-motiv={aktiv} data-bereit={baut ? undefined : "1"} />
      {!vollbild && (
        <Leiste3D auseinander={auseinander} umschalten={() => setAuseinander((x) => !x)} motiv={aktiv} motive={motive} setzeMotiv={setMotiv}
          seiten={seiten} setzeSeiten={setSeiten} speichern={speichern} zuruecksetzen={() => steuer.current.anwenden(aktiv)} />
      )}
      {baut && <p className="absolute inset-0 flex items-center justify-center text-sm" style={{ color: "var(--gedaempft)" }}>baut 3D…</p>}
      <p className="pointer-events-none absolute bottom-3 left-3 text-xs" style={{ color: "var(--gedaempft)", display: aktiv !== "frei" || vollbild ? "none" : undefined }}>
        Ziehen dreht · Rad zoomt · rechte Maustaste verschiebt · {ergebnis.lagen.map((l) => `${l.titel} ${l.staerkeMm} mm`).join(" · ")}
        {" "}· Symbol auf dem Hintergrund, {ergebnis.kennzahlen.symbolUeberNetzMm.toFixed(1)} mm ueber dem Netz
        {r && ` · Holzrahmen ${r.farbe}, ${r.breiteMm} × ${r.tiefeMm} mm, Bild ${r.einlassMm} mm tief`}
      </p>
    </div>
  );
}
