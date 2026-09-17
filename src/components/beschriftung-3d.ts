import * as THREE from "three";
import { HOLZRAHMEN_TITEL } from "@/engine/holzrahmen";
import type { SchichtkartenErgebnis } from "@/engine/typen";
import type { Platte, Stapel } from "./szene-3d";

/**
 * Beschriftung der Explosionszeichnung (Marcel 17.09.2026: der Kunde soll verstehen, was er bestellt).
 * Je Lage Name, Material und Staerke aus der Engine, mit Fuehrungslinie an die Lage. Die Texte stehen
 * seitlich neben dem Stapel, folgen der Kamera und kommen ins gespeicherte Referenzbild.
 */
export interface Beschriftung {
  /** Punkt auf der Lage und Oberkante des Textblocks, in CSS-Pixeln der Leinwand. */
  ax: number;
  ay: number;
  tx: number;
  ty: number;
  zeilen: string[];
  links: boolean;
  /** Schriftgroesse waechst mit der Leinwand – im 1600-px-Bild waren 15 px zu klein fuer eine Infografik. */
  s: number;
}

const SCHRIFT = `"Avenir Next", "Helvetica Neue", Arial, sans-serif`;
const [TITEL_PX, ZEILE_PX, TITEL_HOEHE, ZEILE_HOEHE, LUFT, SPALTE, RAND] = [15, 12.5, 20, 16, 16, 44, 14];
const ADJEKTIV: Record<string, string> = { weiss: "weißes", schwarz: "schwarzes", blau: "blaues", rot: "rotes" };

function texte(e: SchichtkartenErgebnis, p: Platte): string[] | null {
  const r = e.rahmen;
  if (!p.lage) return r ? ["Holzrahmen", `${HOLZRAHMEN_TITEL[r.farbe].replace("weiss", "weiß")}, ${r.breiteMm} × ${r.tiefeMm} mm`] : null;
  const [art, farbe] = p.lage.material.split(" ");
  const stoff = `${ADJEKTIV[farbe] ?? farbe} ${art}, ${p.lage.staerkeMm} mm`;
  if (p.lage.key === "symbol") return [p.lage.titel, stoff, "markiert deinen Ort"];
  if (p.lage.key === "deck") return ["Rand und Schrift", stoff, "lasergeschnitten"];
  if (p.lage.key === "netz") return [e.lagen.some((l) => l.key === "deck") ? "Straßen" : "Straßen und Schrift", stoff, "lasergeschnitten"];
  if (p.lage.key === "hintergrund") return ["Hintergrund", stoff, "feine Wege graviert"];
  return ["Wasser", stoff];
}

/** Ankerpunkt in Stapelkoordinaten: am rechten Rand im oberen Viertel, das Symbol in seiner Mitte. */
function anker(e: SchichtkartenErgebnis, p: Platte): THREE.Vector3 {
  const { breiteMm: b, hoeheMm: h } = e.layout.platte;
  const vorn = p.mesh.position.z + p.staerke;
  const sy = e.symbol;
  if (p.lage?.key === "symbol" && sy) return new THREE.Vector3(sy.xMm + sy.breiteMm / 2 - b / 2, h / 2 - (sy.yMm + sy.hoeheMm / 2), vorn);
  const r = e.rahmen;
  const x = !p.lage && r ? b / 2 - r.ueberstandMm + r.breiteMm / 2 : b / 2 - 3;
  return new THREE.Vector3(x, h * 0.25, vorn);
}

const hoehe = (l: { zeilen: string[] }, s: number) => s * (TITEL_HOEHE + ZEILE_HOEHE * (l.zeilen.length - 1));
const breite = (l: { zeilen: string[] }, s: number) => s * Math.max(...l.zeilen.map((z, i) => z.length * (i ? ZEILE_PX * 0.52 : TITEL_PX * 0.56)));

/** Texte links und rechts neben dem Stapel, von oben nach unten ohne Ueberschneidung. */
export function beschriftungen(e: SchichtkartenErgebnis, stapel: Stapel, kamera: THREE.Camera, w: number, h: number): Beschriftung[] {
  const bild = (v: THREE.Vector3) => {
    const n = stapel.gruppe.localToWorld(v.clone()).project(kamera);
    return { x: ((n.x + 1) / 2) * w, y: ((1 - n.y) / 2) * h };
  };
  const { breiteMm: b, hoeheMm: ph } = e.layout.platte;
  const ecken = stapel.platten.flatMap((p) => [-1, 1].flatMap((sx) => [-1, 1].map((sy) => bild(new THREE.Vector3((sx * b) / 2, (sy * ph) / 2, p.mesh.position.z)))));
  const [links, rechts] = [Math.min(...ecken.map((p) => p.x)), Math.max(...ecken.map((p) => p.x))];
  const mitte = (links + rechts) / 2;
  const roh = stapel.platten.flatMap((p) => {
    const zeilen = texte(e, p);
    return zeilen ? [{ ...bild(anker(e, p)), zeilen }] : [];
  });
  const liste: Beschriftung[] = [];
  const gross = Math.min(2.4, Math.max(1, h / 620));
  for (const seiteLinks of [true, false]) {
    const seite = roh.filter((r) => r.x < mitte === seiteLinks).sort((a, c) => a.y - c.y);
    if (!seite.length) continue;
    // Reicht der Platz neben dem Stapel nicht, wird die Schrift kleiner, statt in den Stapel zu laufen.
    const platz = (seiteLinks ? links : w - rechts) - RAND - gross * SPALTE;
    const s = Math.max(0.8, Math.min(gross, platz / Math.max(...seite.map((r) => breite(r, 1)))));
    let unten = -Infinity;
    const bloecke = seite.map((r) => {
      const ty = Math.max(r.y - (s * TITEL_HOEHE) / 2, unten + s * LUFT);
      unten = ty + hoehe(r, s);
      return { ...r, ty };
    });
    const ueber = unten - (h - RAND);
    for (const bl of bloecke) {
      const ty = Math.max(RAND, bl.ty - Math.max(0, ueber));
      const tx = seiteLinks ? Math.max(RAND + breite(bl, s), links - s * SPALTE) : Math.min(w - RAND - breite(bl, s), rechts + s * SPALTE);
      liste.push({ ax: bl.x, ay: bl.y, tx, ty, zeilen: bl.zeilen, links: seiteLinks, s });
    }
  }
  return liste;
}

const linienStart = (l: Beschriftung) => ({ x: l.links ? l.tx + 8 * l.s : l.tx - 8 * l.s, y: l.ty + (l.s * TITEL_HOEHE) / 2 });
/** Grundlinie der Zeile i im Block. */
const grundlinie = (l: Beschriftung, i: number) => l.ty + l.s * (TITEL_PX + (i ? TITEL_HOEHE - TITEL_PX + 2 + ZEILE_HOEHE * (i - 1) + ZEILE_PX : 0));
const farbeFuer = (hell: boolean) => (hell ? "#f3f1ec" : "#26231f");
const esc = (t: string) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;");

/** Die SVG-Ebene ueber der Leinwand deckungsgleich legen und fuellen; null blendet sie aus. */
export function ebeneZeichnen(ebene: SVGSVGElement, leinwand: HTMLCanvasElement, liste: Beschriftung[] | null, hell: boolean) {
  ebene.style.display = liste ? "block" : "none";
  if (!liste) return;
  const [w, h] = [leinwand.clientWidth, leinwand.clientHeight];
  Object.assign(ebene.style, { left: `${leinwand.offsetLeft}px`, top: `${leinwand.offsetTop}px`, width: `${w}px`, height: `${h}px` });
  ebene.setAttribute("viewBox", `0 0 ${w} ${h}`);
  ebene.innerHTML = beschriftungSvg(liste, hell);
}

function beschriftungSvg(liste: Beschriftung[], hell: boolean): string {
  const farbe = farbeFuer(hell);
  return liste
    .map((l) => {
      const s = linienStart(l);
      const anker = l.links ? "end" : "start";
      const zeilen = l.zeilen
        .map((z, i) => {
          return `<text x="${l.tx}" y="${grundlinie(l, i)}" text-anchor="${anker}" font-size="${l.s * (i ? ZEILE_PX : TITEL_PX)}" font-weight="${i ? 400 : 600}">${esc(z)}</text>`;
        })
        .join("");
      return `<line x1="${s.x}" y1="${s.y}" x2="${l.ax}" y2="${l.ay}" stroke="${farbe}" stroke-width="${1.2 * l.s}"/><circle cx="${l.ax}" cy="${l.ay}" r="${3 * l.s}" fill="${farbe}"/>${zeilen}`;
    })
    .join("")
    .replace(/<text /g, `<text fill="${farbe}" font-family='${SCHRIFT}' `);
}

/** Dieselbe Beschriftung ins gespeicherte Bild, skala = Bildpixel je CSS-Pixel. */
export function zeichneBeschriftung(g: CanvasRenderingContext2D, liste: Beschriftung[], hell: boolean, skala: number) {
  const farbe = farbeFuer(hell);
  g.save();
  g.scale(skala, skala);
  g.strokeStyle = g.fillStyle = farbe;
  for (const l of liste) {
    g.lineWidth = 1.2 * l.s;
    const s = linienStart(l);
    g.beginPath();
    g.moveTo(s.x, s.y);
    g.lineTo(l.ax, l.ay);
    g.stroke();
    g.beginPath();
    g.arc(l.ax, l.ay, 3 * l.s, 0, Math.PI * 2);
    g.fill();
    g.textAlign = l.links ? "right" : "left";
    l.zeilen.forEach((z, i) => {
      g.font = `${i ? 400 : 600} ${l.s * (i ? ZEILE_PX : TITEL_PX)}px ${SCHRIFT}`;
      g.fillText(z, l.tx, grundlinie(l, i));
    });
  }
  g.restore();
}
