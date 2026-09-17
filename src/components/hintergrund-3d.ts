import * as THREE from "three";

/**
 * Hintergruende der 3D-Ansicht (Marcel 17.09.2026: Explosionszeichnung als Infografik – auf dem hellen
 * Buehnenton verschwanden die weissen Lagen). Grau und Dunkel sind ein Verlauf wie eine ausgeleuchtete
 * Hohlkehle, in der Mitte heller. Hell ist der bisherige Buehnenton.
 */
export type Hintergrund = "hell" | "weiss" | "warm" | "grau" | "dunkel";

export const HINTERGRUND_TITEL: Record<Hintergrund, string> = {
  hell: "Hintergrund hell",
  weiss: "Hintergrund weiss",
  warm: "Hintergrund warm",
  grau: "Hintergrund grau",
  dunkel: "Hintergrund dunkel",
};

// Mitte und Rand. Grau so hell, dass das schwarze Acryl lesbar bleibt und Weiss trotzdem absteht.
// Warm fuer das Erklaerbild (Marcel 17.09.2026: "muss nicht so hart technisch wirken"), Sand statt Grau.
const VERLAUF: Partial<Record<Hintergrund, [string, string]>> = {
  warm: ["#c9bead", "#968a7b"],
  grau: ["#b3b8bd", "#80868c"],
  dunkel: ["#3d434a", "#16191c"],
};

/**
 * Szenenhintergrund; ohne Wahl der Buehnenton der Anordnung. Der Verlauf bekommt ein feines
 * Rauschen – glatt zeigte er im gespeicherten 2800-px-Bild Stufen.
 */
export function hintergrundBild(h: Hintergrund, buehne: THREE.Color): THREE.Color | THREE.CanvasTexture {
  if (h === "weiss") return new THREE.Color(0xffffff);
  const verlauf = VERLAUF[h];
  if (!verlauf) return buehne;
  const n = 1024;
  const leinwand = document.createElement("canvas");
  leinwand.width = leinwand.height = n;
  const g = leinwand.getContext("2d")!;
  const r = g.createRadialGradient(n / 2, n * 0.42, 0, n / 2, n / 2, n * 0.75);
  r.addColorStop(0, verlauf[0]);
  r.addColorStop(1, verlauf[1]);
  g.fillStyle = r;
  g.fillRect(0, 0, n, n);
  const pixel = g.getImageData(0, 0, n, n);
  for (let i = 0; i < pixel.data.length; i += 4) {
    const rauschen = (Math.random() - 0.5) * 3;
    for (let k = 0; k < 3; k++) pixel.data[i + k] += rauschen;
  }
  g.putImageData(pixel, 0, 0);
  const textur = new THREE.CanvasTexture(leinwand);
  textur.colorSpace = THREE.SRGBColorSpace;
  return textur;
}
