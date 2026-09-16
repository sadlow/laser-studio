/**
 * Holzmaserung als Canvas – fuer den 3D-Rahmen (Textur) und die 2D-Vorschau (Musterbild).
 * Eiche (Marcel 16.09.2026: "etwas staerker gemasert und leicht dunkler") und dunkelbraunes
 * Holz. Jahresringe als lange, leicht wellige Linien, dazu kurze Poren; waagerecht nahtlos,
 * damit lange Leisten keine Stossstelle zeigen. Ein Bild = HOLZ_MM entlang und quer.
 */
export type Holz = "eiche" | "dunkelbraun";

export const HOLZ_MM = { entlang: 240, quer: 60 };

type Rgb = [number, number, number];
const TOENE: Record<Holz, { grund: string; ring: Rgb; pore: Rgb; hell?: Rgb }> = {
  eiche: { grund: "#9c7147", ring: [86, 58, 32], pore: [62, 40, 20] },
  // Auf dunklem Holz traegt die Maserung erst mit hellen Streifen neben den dunklen Ringen.
  dunkelbraun: { grund: "#4a3223", ring: [24, 14, 8], pore: [20, 12, 7], hell: [122, 88, 60] },
};

const leinwaende = new Map<Holz, HTMLCanvasElement>();
const bilder = new Map<Holz, string>();

export function holzLeinwand(holz: Holz): HTMLCanvasElement {
  const fertig = leinwaende.get(holz);
  if (fertig) return fertig;
  const t = TOENE[holz];
  const leinwand = document.createElement("canvas");
  [leinwand.width, leinwand.height] = [2048, 512];
  const ctx = leinwand.getContext("2d")!;
  ctx.fillStyle = t.grund;
  ctx.fillRect(0, 0, 2048, 512);
  let saat = 11;
  const zufall = () => (saat = (saat * 16807) % 2147483647) / 2147483647;
  // Zurueckhaltend: kraeftiger wirkte es wie Zebrano statt Eiche.
  for (let i = 0; i < 140; i++) {
    const [y0, welle, wellen, phase, ton] = [zufall() * 512, 1 + zufall() * 6, 1 + Math.floor(zufall() * 3), zufall() * 6.28, zufall()];
    const farbe = t.hell && zufall() < 0.35 ? t.hell : t.ring;
    ctx.strokeStyle = `rgba(${farbe[0] + ton * 30}, ${farbe[1] + ton * 20}, ${farbe[2] + ton * 10}, ${0.08 + zufall() * 0.2})`;
    ctx.lineWidth = 0.6 + zufall() * 1.8;
    for (const versatz of [-512, 0, 512]) {
      ctx.beginPath();
      for (let x = 0; x <= 2048; x += 16) {
        const y = y0 + versatz + Math.sin((x / 2048) * 6.283 * wellen + phase) * welle;
        if (x) ctx.lineTo(x, y);
        else ctx.moveTo(x, y);
      }
      ctx.stroke();
    }
  }
  for (let i = 0; i < 2200; i++) {
    ctx.fillStyle = `rgba(${t.pore.join(", ")}, ${0.1 + zufall() * 0.22})`;
    ctx.fillRect(zufall() * 2048, zufall() * 512, 3 + zufall() * 16, 1);
  }
  leinwaende.set(holz, leinwand);
  return leinwand;
}

/** Dasselbe als Bild-URL fuer SVG-Muster in der 2D-Vorschau. */
export function holzBild(holz: Holz): string {
  const fertig = bilder.get(holz);
  if (fertig) return fertig;
  const url = holzLeinwand(holz).toDataURL("image/jpeg", 0.85);
  bilder.set(holz, url);
  return url;
}
