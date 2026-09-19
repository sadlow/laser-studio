/**
 * Holzmaserung als Canvas – fuer den 3D-Rahmen (Textur) und die 2D-Vorschau (Musterbild).
 * Eiche nach dem echten Rahmen (Marcel 19.09.2026, Fotos der ersten A5-Karten), dunkelbraun
 * wie am 16.09. entworfen. Waagerecht nahtlos, damit lange Leisten keine Stossstelle zeigen.
 * Ein Bild = HOLZ_MM entlang und quer.
 */
export type Holz = "eiche" | "dunkelbraun";

export const HOLZ_MM = { entlang: 240, quer: 60 };

const [B, H] = [2048, 512];

type Rgb = [number, number, number];
const TOENE: Record<Holz, { grund: string; ring: Rgb; pore: Rgb; hell?: Rgb }> = {
  // Heller, natuerlicher Eichenton; gemessen am Foto gegen das weisse Acryl daneben.
  eiche: { grund: "#9a6a4a", ring: [78, 48, 26], pore: [72, 44, 24], hell: [198, 158, 116] },
  // Auf dunklem Holz traegt die Maserung erst mit hellen Streifen neben den dunklen Ringen.
  dunkelbraun: { grund: "#4a3223", ring: [24, 14, 8], pore: [20, 12, 7], hell: [122, 88, 60] },
};

const leinwaende = new Map<Holz, HTMLCanvasElement>();
const bilder = new Map<Holz, string>();

type Zufall = () => number;
const rgba = (c: Rgb, a: number) => `rgba(${c.join(", ")}, ${a})`;

/** Wellige Linie ueber die ganze Breite, oben und unten wiederholt – nahtlos in beide Richtungen. */
function welle(ctx: CanvasRenderingContext2D, y0: number, hub: number, wellen: number, phase: number, von = 0, bis = B) {
  for (const v of [-H, 0, H]) {
    ctx.beginPath();
    for (let x = von; x <= bis; x += 8) {
      const y = y0 + v + Math.sin((x / B) * 6.283 * wellen + phase) * hub;
      if (x === von) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
}

/**
 * Eiche vom echten Rahmen: dichte, fast gerade Porenstreifen, immer wieder unterbrochen, dazwischen hellere und
 * dunklere Baender und kurze helle Spiegel. Die fruehere Maserung aus wenigen weichen Ringen wirkte daneben
 * glatt und gelblich wie Kiefer.
 */
function eiche(ctx: CanvasRenderingContext2D, zufall: Zufall) {
  const t = TOENE.eiche;
  for (let i = 0; i < 45; i++) {
    ctx.strokeStyle = rgba(zufall() < 0.5 ? t.hell! : t.ring, 0.07 + zufall() * 0.12);
    ctx.lineWidth = 4 + zufall() * 34;
    welle(ctx, zufall() * H, 1 + zufall() * 5, 1 + Math.floor(zufall() * 2), zufall() * 6.28);
  }
  // Porenstreifen: Laeufe von 40 bis 700 px, Luecken dazwischen; ueber den Rand hinaus zweimal gezeichnet.
  for (let i = 0; i < 300; i++) {
    const [y0, hub, wellen, phase] = [zufall() * H, 0.5 + zufall() * 3, 1 + Math.floor(zufall() * 2), zufall() * 6.28];
    ctx.strokeStyle = rgba(t.ring, 0.24 + zufall() * 0.42);
    ctx.lineWidth = 0.5 + zufall() * 1.1;
    for (let x = zufall() * 200; x < B; ) {
      const lauf = 40 + zufall() * 660;
      for (const v of [0, -B]) welle(ctx, y0, hub, wellen, phase, Math.round(x / 8) * 8 + v, Math.round((x + lauf) / 8) * 8 + v);
      x += lauf + 10 + zufall() * 220;
    }
  }
  for (let i = 0; i < 3800; i++) {
    ctx.fillStyle = rgba(t.pore, 0.15 + zufall() * 0.3);
    ctx.fillRect(zufall() * B, zufall() * H, 2 + zufall() * 12, 1);
  }
  for (let i = 0; i < 180; i++) {
    ctx.fillStyle = rgba(t.hell!, 0.12 + zufall() * 0.18);
    ctx.fillRect(zufall() * B, zufall() * H, 4 + zufall() * 18, 1 + zufall());
  }
}

/** Dunkelbraun: Jahresringe als lange, leicht wellige Linien, dazu kurze Poren. */
function dunkelbraun(ctx: CanvasRenderingContext2D, zufall: Zufall) {
  const t = TOENE.dunkelbraun;
  // Zurueckhaltend: kraeftiger wirkte es wie Zebrano.
  for (let i = 0; i < 140; i++) {
    const [y0, hub, wellen, phase, ton] = [zufall() * H, 1 + zufall() * 6, 1 + Math.floor(zufall() * 3), zufall() * 6.28, zufall()];
    const farbe = t.hell && zufall() < 0.35 ? t.hell : t.ring;
    ctx.strokeStyle = `rgba(${farbe[0] + ton * 30}, ${farbe[1] + ton * 20}, ${farbe[2] + ton * 10}, ${0.08 + zufall() * 0.2})`;
    ctx.lineWidth = 0.6 + zufall() * 1.8;
    for (const v of [-H, 0, H]) {
      ctx.beginPath();
      for (let x = 0; x <= B; x += 16) {
        const y = y0 + v + Math.sin((x / B) * 6.283 * wellen + phase) * hub;
        if (x) ctx.lineTo(x, y);
        else ctx.moveTo(x, y);
      }
      ctx.stroke();
    }
  }
  for (let i = 0; i < 2200; i++) {
    ctx.fillStyle = rgba(t.pore, 0.1 + zufall() * 0.22);
    ctx.fillRect(zufall() * B, zufall() * H, 3 + zufall() * 16, 1);
  }
}

export function holzLeinwand(holz: Holz): HTMLCanvasElement {
  const fertig = leinwaende.get(holz);
  if (fertig) return fertig;
  const leinwand = document.createElement("canvas");
  [leinwand.width, leinwand.height] = [B, H];
  const ctx = leinwand.getContext("2d")!;
  ctx.fillStyle = TOENE[holz].grund;
  ctx.fillRect(0, 0, B, H);
  let saat = 11;
  const zufall = () => (saat = (saat * 16807) % 2147483647) / 2147483647;
  (holz === "eiche" ? eiche : dunkelbraun)(ctx, zufall);
  leinwaende.set(holz, leinwand);
  return leinwand;
}

// Die 2D-Vorschau zeigt die Textur ohne Licht; erst die Beleuchtung der 3D-Ansicht hebt sie auf den Ton am Foto.
// Eiche flach gezeichnet war dunkles Nussbaum (138/95/65 statt 184/142/111): je Kanal so viel heller.
const OHNE_LICHT: Partial<Record<Holz, Rgb>> = { eiche: [1.33, 1.49, 1.71] };

/** Dasselbe als Bild-URL fuer SVG-Muster in der 2D-Vorschau – so hell, wie das Holz im Raum wirkt. */
export function holzBild(holz: Holz): string {
  const fertig = bilder.get(holz);
  if (fertig) return fertig;
  const quelle = holzLeinwand(holz);
  const faktor = OHNE_LICHT[holz];
  let url = quelle.toDataURL("image/jpeg", 0.85);
  if (faktor) {
    const c = document.createElement("canvas");
    [c.width, c.height] = [B, H];
    const ctx = c.getContext("2d")!;
    ctx.drawImage(quelle, 0, 0);
    const px = ctx.getImageData(0, 0, B, H);
    for (let i = 0; i < px.data.length; i += 4) {
      for (let k = 0; k < 3; k++) px.data[i + k] = Math.min(255, px.data[i + k] * faktor[k]);
    }
    ctx.putImageData(px, 0, 0);
    url = c.toDataURL("image/jpeg", 0.85);
  }
  bilder.set(holz, url);
  return url;
}
