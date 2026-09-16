/**
 * Textfelder fuer Amazon Custom (Marcel 16.09.2026): Lage, Groesse und Schriftgroesse der drei
 * Zeilen im Container 400 x 400 px, je Format. Das zugehoerige Vorschaubild ist das 3D-Motiv
 * "layout" (bilder.py); Platte und Container haben dieselbe Mitte (engine/amazon-container.ts).
 *
 * Aufruf: npx tsx scripts/amazon-custom/textfelder.ts
 * Schreibt export/amazon-custom/textfelder.json, textfelder.md und layoutwerte.json (fuer bilder.py).
 */
import fs from "node:fs";
import path from "node:path";
import { rendereSchichtkarte } from "../../src/engine";
import { CONTAINER_PX, inContainer, layoutFeldMm } from "../../src/engine/amazon-container";
import { masseAusFormat } from "../../src/engine/formate";
import { standardLayoutWerte } from "../../src/engine/poster-masse";
import { schriftMasse } from "../../src/engine/schrift";
import { standardSchichtkarte } from "../../src/engine/standard";
import type { FormatKey, Schichtkarte, TextStil } from "../../src/engine/typen";
import { MAX_ZEICHEN } from "../../src/engine/zeichen";

const ZIEL = path.join(process.cwd(), "export", "amazon-custom");
export const KOELN = { lon: 6.9607, lat: 50.9384 };
// Der Text ist ein Schlitz: man sieht die Lage darunter (Design-Namen wie im Studio).
const TEXTFARBE = {
  "Weiss auf Schwarz (netz-weiss)": "#151515",
  "Schwarz auf Weiss (netz-schwarz-dreilagig)": "#f6f5f1",
  "Schwarz, weisser Rahmen (netz-schwarz)": "#151515",
};
const r1 = (n: number) => Math.round(n * 10) / 10;

function token() {
  const env = fs.readFileSync(path.join(process.cwd(), ".env.local"), "utf8");
  return env.match(/MAPBOX[A-Z_]*TOKEN\s*=\s*(\S+)/)?.[1] ?? "";
}

async function format(f: Exclude<FormatKey, "frei">) {
  const basis = standardSchichtkarte();
  const w = standardLayoutWerte(f);
  const k: Schichtkarte = { ...basis, ...KOELN, format: f, ...w, kunde: { ...basis.kunde, adresse: "Koeln Altstadt", titel: "Zuhause", namen: "Lena & Jonas", ortText: "Köln" } };
  const { breiteMm: b, hoeheMm: h } = masseAusFormat(f);
  const feld = layoutFeldMm(b, h, k.holzrahmenProfil);
  const s = CONTAINER_PX / feld;
  const box = (x0: number, y0: number, x1: number, y1: number) => {
    const [lo, ru] = [inContainer(x0, y0, b, h, feld), inContainer(x1, y1, b, h, feld)];
    return { x: r1(lo.x), y: r1(lo.y), breite: r1(ru.x - lo.x), hoehe: r1(ru.y - lo.y) };
  };
  const felder = [];
  if (w.layoutArt === "poster") {
    // Wie textblock.ts: Zeilen mittig, hoechstens so breit wie das Textfeld, Mitte der Versalhoehe auf der Linie.
    const maxBreite = b - 2 * k.rahmenMm - 2 * Math.max(4, b * 0.05);
    const zeilen: [string, TextStil, number, number][] = [
      ["Titel", k.titelStil, k.titelMitteAnteil, MAX_ZEICHEN.titel],
      ["Namen oder Freitext", k.zeilenStil, k.zeile1MitteAnteil, MAX_ZEICHEN.zeile],
      ["Letzte Zeile", k.zeilenStil, k.zeile2MitteAnteil, MAX_ZEICHEN.zeile],
    ];
    for (const [name, stil, anteil, maxZeichen] of zeilen) {
      const m = schriftMasse(stil.schrift);
      const versal = h * stil.hoeheAnteil;
      const groesse = (versal * m.unitsPerEm) / m.versalhoehe;
      const mitte = h * anteil;
      const oben = mitte - versal / 2 - ((m.oberlaenge - m.versalhoehe) / m.unitsPerEm) * groesse;
      const unten = mitte + versal / 2 + (m.unterlaenge / m.unitsPerEm) * groesse;
      felder.push({
        name, ...box(b / 2 - maxBreite / 2, oben, b / 2 + maxBreite / 2, unten),
        mitteVersalhoeheY: r1(inContainer(0, mitte, b, h, feld).y), schriftgroessePx: r1(groesse * s), versalhoehePx: r1(versal * s),
        schrift: stil.schrift, sperrungEm: stil.sperrung, versalien: stil.versalien, ausrichtung: "mittig", maxZeichen,
      });
    }
  }
  // Mit Beispieltext gesetzt: wo die Zeilen wirklich stehen, und wo das Symbol sitzt.
  const r = await rendereSchichtkarte(k, token());
  const beispiel = r.textZonen.map((z) => ({ name: z.name, ...box(z.zone.xMm, z.zone.yMm, z.zone.xMm + z.zone.breiteMm, z.zone.yMm + z.zone.hoeheMm) }));
  const anker = r.symbol && inContainer(r.symbol.ankerXMm, r.symbol.ankerYMm, b, h, feld);
  return {
    format: f, layoutArt: w.layoutArt, platteMm: { breite: b, hoehe: h }, bildkanteMm: r1(feld), pxProMm: Math.round(s * 1000) / 1000,
    felder, beispielZeilen: beispiel, symbolAnker: anker && { x: r1(anker.x), y: r1(anker.y) }, layoutwerte: w,
  };
}

(async () => {
  fs.mkdirSync(ZIEL, { recursive: true });
  const formate = [];
  for (const f of ["a4", "a5", "a3", "quadrat30"] as const) formate.push(await format(f));
  const json = { container: `${CONTAINER_PX} x ${CONTAINER_PX} px`, beispiel: "Koeln Altstadt, 3,5 km, Zuhause / LENA & JONAS / KOELN + Koordinaten", textfarbe: TEXTFARBE, formate };
  fs.writeFileSync(path.join(ZIEL, "textfelder.json"), JSON.stringify(json, null, 2) + "\n");
  fs.writeFileSync(path.join(ZIEL, "layoutwerte.json"), JSON.stringify(Object.fromEntries(formate.map((f) => [f.format, f.layoutwerte])), null, 2) + "\n");
  const md = [`# Textfelder Amazon Custom (Container ${CONTAINER_PX} x ${CONTAINER_PX} px)`, "",
    "x/y = linke obere Ecke des Felds. Schriftgroesse so, dass die Versalhoehe wie beim Produkt ist. Zeilen mittig.", ""];
  for (const f of formate) {
    md.push(`## ${f.format.toUpperCase()} (${f.platteMm.breite} x ${f.platteMm.hoehe} mm, ${f.layoutArt})`, "",
      `Bildkante ${f.bildkanteMm} mm, ${f.pxProMm} px/mm. Symbol-Anker (Koeln): ${f.symbolAnker ? `${f.symbolAnker.x} / ${f.symbolAnker.y}` : "-"}`, "");
    if (f.felder.length) {
      md.push("| Feld | x | y | Breite | Hoehe | Schrift px | Versal px | Schrift | Sperrung | Versalien | max. Zeichen |", "|---|---|---|---|---|---|---|---|---|---|---|");
      for (const t of f.felder) md.push(`| ${t.name} | ${t.x} | ${t.y} | ${t.breite} | ${t.hoehe} | ${t.schriftgroessePx} | ${t.versalhoehePx} | ${t.schrift} | ${t.sperrungEm} em | ${t.versalien ? "ja" : "nein"} | ${t.maxZeichen} |`);
    } else {
      md.push("Eingebettetes Layout: die Reiter wachsen mit dem Text, darum hier die Lage mit dem Beispieltext.", "",
        "| Zeile | x | y | Breite | Hoehe |", "|---|---|---|---|---|", ...f.beispielZeilen.map((z) => `| ${z.name} | ${z.x} | ${z.y} | ${z.breite} | ${z.hoehe} |`));
    }
    md.push("");
  }
  fs.writeFileSync(path.join(ZIEL, "textfelder.md"), md.join("\n"));
  console.log(md.join("\n"));
})();
