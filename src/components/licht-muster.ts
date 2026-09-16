import * as THREE from "three";

/**
 * Gezeichnete Lichtmasken und Fensterbilder fuer die Sonnenstimmungen (licht-3d.ts).
 * Alles aus dem Zufall mit festem Startwert: dasselbe Muster bei jedem Aufbau, damit
 * Referenzbilder wiederholbar bleiben.
 */
function zufall(start: number) {
  let s = start;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

function leinwand(n: number) {
  const c = document.createElement("canvas");
  c.width = c.height = n;
  return [c, c.getContext("2d")!] as const;
}

function textur(c: HTMLCanvasElement) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Zweige mit Blaettern, schwarz auf durchsichtig – Grundlage fuer Schatten und Aussicht. */
function laub(n: number, start: number, zweige: [number, number, number][], groesse = 1) {
  const [c, g] = leinwand(n);
  const r = zufall(start);
  const s = (n / 1024) * groesse;
  g.fillStyle = "#000";
  for (const [x0, y0, w0] of zweige) {
    let [x, y, w] = [x0 * n, y0 * n, w0];
    const schritte = 24 + Math.floor(r() * 18);
    for (let i = 0; i < schritte; i++) {
      x += Math.cos(w) * 16 * s;
      y += Math.sin(w) * 16 * s;
      w += (r() - 0.5) * 0.35;
      for (let b = 0; b < 3; b++) {
        const wb = w + (r() - 0.5) * 2.6;
        const weg = (12 + r() * 30) * s;
        g.save();
        g.translate(x + Math.cos(wb) * weg, y + Math.sin(wb) * weg);
        g.rotate(wb + (r() - 0.5));
        g.beginPath();
        g.ellipse(0, 0, (18 + r() * 16) * s, (7 + r() * 6) * s, 0, 0, Math.PI * 2);
        g.fill();
        g.restore();
      }
    }
  }
  return c;
}

/**
 * Sonne durch Laub: weiss = Sonne, dunkel = Blattschatten. Zweige ragen von den Raendern
 * herein und lassen die Mitte lichter, damit die Karte nicht ganz im Schatten liegt.
 * Weichgezeichnet – Licht durch Blaetter hat keine harten Kanten.
 */
export function blaetterMaske(): THREE.CanvasTexture {
  const n = 1024;
  const [c, g] = leinwand(n);
  g.fillStyle = "#fff";
  g.fillRect(0, 0, n, n);
  const zweige: [number, number, number][] = [
    [-0.04, 0.12, 0.35], [-0.04, 0.5, -0.1], [0.3, -0.04, 1.2], [0.68, -0.04, 1.9], [1.04, 0.3, 2.9], [1.04, 0.76, 3.4], [-0.04, 0.88, -0.5],
  ];
  g.filter = "blur(9px)";
  g.globalAlpha = 0.86;
  g.drawImage(laub(n, 4711, zweige), 0, 0);
  return textur(c);
}

/**
 * Sonne durch ein Sprossenfenster: helle Scheiben im dunklen Raum, die Sprossen als weiche
 * Schattenlinien, davor ein Zweig. Schraeg projiziert werden die Scheiben zu Parallelogrammen.
 */
export function fensterMaske(): THREE.CanvasTexture {
  const n = 1024;
  const [c, g] = leinwand(n);
  g.fillStyle = "#1d1a17";
  g.fillRect(0, 0, n, n);
  g.filter = "blur(8px)";
  g.fillStyle = "#fff";
  const [x0, y0, bw, bh, sprosse] = [120, 70, 760, 880, 24];
  const [spalten, zeilen] = [2, 3];
  const pw = (bw - sprosse * (spalten - 1)) / spalten;
  const ph = (bh - sprosse * (zeilen - 1)) / zeilen;
  for (let i = 0; i < spalten; i++) {
    for (let j = 0; j < zeilen; j++) g.fillRect(x0 + i * (pw + sprosse), y0 + j * (ph + sprosse), pw, ph);
  }
  g.filter = "blur(14px)";
  g.globalAlpha = 0.55;
  g.drawImage(laub(n, 815, [[1.04, 0.1, 2.6], [0.8, -0.04, 2.1]], 1.3), 0, 0);
  return textur(c);
}

/** Das Fenster, wie es sich in Acryl und Spiegel zeigt: heller Himmel, Laub, Rahmen und Sprossen. */
export function fensterBild(): THREE.CanvasTexture {
  const n = 512;
  const [c, g] = leinwand(n);
  const himmel = g.createLinearGradient(0, 0, 0, n);
  himmel.addColorStop(0, "#dce8f4");
  himmel.addColorStop(0.55, "#fff7ea");
  himmel.addColorStop(1, "#ffe6c4");
  g.fillStyle = himmel;
  g.fillRect(0, 0, n, n);
  g.filter = "blur(6px)";
  g.globalAlpha = 0.35;
  g.drawImage(laub(n, 99, [[1.04, 0.05, 2.5], [-0.04, 0.2, 0.4]], 1.1), 0, 0);
  g.filter = "none";
  g.globalAlpha = 1;
  g.fillStyle = "#3a332c";
  const [rand, sprosse] = [16, 10];
  for (const [x, y, w, h] of [[0, 0, n, rand], [0, n - rand, n, rand], [0, 0, rand, n], [n - rand, 0, rand, n], [n / 2 - sprosse / 2, 0, sprosse, n],
    [0, n / 3 - sprosse / 2, n, sprosse], [0, (2 * n) / 3 - sprosse / 2, n, sprosse]]) {
    g.fillRect(x, y, w, h);
  }
  return textur(c);
}
