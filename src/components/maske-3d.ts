import * as THREE from "three";
import type { SchichtkartenErgebnis } from "@/engine/typen";
import { materialien } from "./material-3d";
import type { Stapel } from "./szene-3d";

/**
 * Masken fuer Amazon Custom (Marcel 17.09.2026): Rahmen, Standort-Symbol und Beschriftung als PNG mit
 * transparentem Grund, die sich ueber das Kartenbild legen. Die Aufnahme zeigt nur das eine Teil und
 * seinen Schatten auf der Karte; die Transparenz entsteht aus zwei Aufnahmen vor Schwarz und Weiss
 * (scripts/amazon-custom/bilder.py). URL: ?nur=symbol|rahmen|beschriftung
 *
 * symbol:       das Symbol, darunter der Hintergrund in seiner Aussenkontur – durch das Loch des Pins
 *               sieht man in echt den Hintergrund, nicht die Strassen des Kartenbilds.
 * rahmen:       der Holzrahmen mit dem Schatten seiner Lippe auf dem Bild.
 * beschriftung: nur die Beschriftung der Explosionszeichnung.
 */
export type Maske = "symbol" | "rahmen" | "beschriftung";

export const MASKEN: Maske[] = ["symbol", "rahmen", "beschriftung"];

const NAME = "maske";

/** Blendet alles ausser der Maske aus; darf nach jedem Motivwechsel erneut laufen. */
export function maskeEinrichten(maske: Maske, e: SchichtkartenErgebnis, s: Stapel) {
  for (const alt of s.gruppe.children.filter((c) => c.name === NAME)) {
    s.gruppe.remove(alt);
    if (alt instanceof THREE.Mesh) alt.geometry.dispose();
  }
  for (const p of s.platten) {
    p.mesh.visible = (maske === "symbol" && p.lage?.key === "symbol") || (maske === "rahmen" && !p.lage);
    for (const zusatz of [p.gravur, p.gravurDetail, p.spiegel]) if (zusatz) zusatz.visible = false;
  }
  if (maske === "beschriftung") return;

  const { breiteMm: b, hoeheMm: h } = e.layout.platte;
  const hinzu = (m: THREE.Mesh, z: number) => {
    m.name = NAME;
    m.position.z = z;
    s.gruppe.add(m);
  };
  // Schatten auf der Oberseite des Stapels – dort faellt er auch am echten Stueck hin.
  const faenger = new THREE.Mesh(new THREE.PlaneGeometry(b, h), new THREE.ShadowMaterial({ opacity: 0.28 }));
  faenger.receiveShadow = true;
  hinzu(faenger, s.hoehe + 0.02);

  const symbol = e.lagen.find((l) => l.key === "symbol");
  const grund = s.platten.find((p) => p.lage?.key === "hintergrund");
  if (maske !== "symbol" || !symbol || !grund?.lage) return;
  const formen = symbol.teile.map((t) => new THREE.Shape(t.aussen.map((p) => new THREE.Vector2(p.x - b / 2, h / 2 - p.y))));
  hinzu(new THREE.Mesh(new THREE.ShapeGeometry(formen), materialien(grund.lage)[0]), grund.mesh.position.z + grund.staerke + 0.01);
}
