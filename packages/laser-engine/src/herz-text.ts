import { fensterFlaeche } from "./fenster";
import { flaecheMm2, rechteck, schneide, vereinige, ziehAb, zuFlaeche, type Flaeche } from "./geometrie";
import type { Punkt } from "./clip";
import { setzeGlyphen } from "./schrift";
import type { HerzZeile, Layout, Schichtkarte } from "./typen";
import { koordinatenHolz } from "./geo";
import type { GesetzteZeile, Textblock } from "./zeilen";

/**
 * Layout "herz": Titel, Ringe und drei Zeilen unter dem Herz, wie auf der Holzkarte „MD2 We said yes“. Die Texte
 * werden graviert, nicht geschnitten – darum keine Verstaerkung und keine Stege: `schnitt` bleibt leer, die Flaeche ist
 * die Schrift selbst (lagen.ts sammelt sie als Gravur).
 */
export function setzeHerzText(k: Schichtkarte, layout: Layout): Textblock {
  const h = k.herz!;
  const { platte } = layout;
  const warnungen: string[] = [];
  const mitteX = platte.breiteMm / 2;
  const maxBreite = platte.breiteMm * h.maxBreiteAnteil;
  const fenster = fensterFlaeche(k, layout);

  const texte = {
    titel: stil(k.kunde.titel.trim(), h.titel),
    zeile1: stil(k.kunde.namen.trim(), h.zeile1),
    // Letzte Zeile im Format der bisherigen Holzkarte (geo.ts), davor optional ein Ort.
    zeile2: stil(
      k.kunde.letzteZeile === "koordinaten" ? [k.kunde.ortText.trim(), koordinatenHolz(k.lat, k.lon)].filter(Boolean).join(" ") : k.kunde.wunschtext.trim(),
      h.zeile3,
    ),
  };
  const ortDatum = stil((k.kunde.ortDatum ?? "").trim(), h.zeile2);

  const gesetzt: GesetzteZeile[] = [];
  const zeilen: [string, string, HerzZeile][] = [
    ["Titel", texte.titel, h.titel],
    ["Namen", texte.zeile1, h.zeile1],
    ["Ort und Datum", ortDatum, h.zeile2],
    ["Letzte Zeile", texte.zeile2, h.zeile3],
  ];
  for (const [name, text, z] of zeilen) {
    if (!text) continue;
    try {
      const versalhoeheMm = platte.hoeheMm * z.versalAnteil;
      const g = setzeGlyphen({ text, schrift: z.schrift, versalhoeheMm, sperrungEm: z.sperrung, mitteX, mitteY: platte.hoeheMm * z.mitteAnteil, maxBreiteMm: maxBreite });
      if (g.faktor < 0.999) warnungen.push(`${name} war zu breit und wurde auf ${Math.round(g.faktor * 100)} % verkleinert.`);
      const flaeche = vereinige(...g.glyphen.map((x) => vereinige(zuFlaeche(x.ringe))));
      gesetzt.push(zeile(name, flaeche, versalhoeheMm * g.faktor));
    } catch (e) {
      warnungen.push(`${name}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  if (h.ringe) gesetzt.push(zeile("Ringe", ringe(mitteX, platte.hoeheMm * h.ringe.mitteAnteil, platte.breiteMm * h.ringe.breiteAnteil, platte.hoeheMm * h.ringe.strichAnteil), 0));

  for (const z of gesetzt) {
    const imHerz = flaecheMm2(schneide(z.flaeche, fenster));
    if (imHerz > 0.5) warnungen.push(`${z.name} ragt in das Herz (${imHerz.toFixed(1)} mm²) – dort liegt keine Platte zum Gravieren.`);
  }

  return {
    zeilen: gesetzt,
    texte,
    schutz: [],
    textBereich: ziehAb(rechteck(0, 0, platte.breiteMm, platte.hoeheMm), fenster),
    warnungen,
  };
}

function zeile(name: string, flaeche: Flaeche, versalhoeheMm: number): GesetzteZeile {
  return { name, flaeche, schnitt: [], versalhoeheMm, zugabeMm: 0, stege: 0, zugefuellt: 0, ohneSteg: 0 };
}

function stil(text: string, z: HerzZeile) {
  return z.versalien ? text.toLocaleUpperCase("de-DE") : text;
}

/** Zwei verschlungene Ringe in `breite`, so hoch wie ein Ring, Strich `strich` (Vorlage: 11,1 x 6,6 mm bei A4). */
function ringe(mitteX: number, mitteY: number, breite: number, strich: number): Flaeche {
  const d = breite / 1.68;
  const r = d / 2;
  const versatz = (breite - d) / 2;
  const ring = (cx: number) => ziehAb(kreis(cx, mitteY, r), kreis(cx, mitteY, Math.max(0.05, r - strich)));
  return vereinige(ring(mitteX - versatz), ring(mitteX + versatz));
}

function kreis(cx: number, cy: number, r: number): Flaeche {
  const n = 96;
  const punkte: Punkt[] = [];
  for (let i = 0; i < n; i++) punkte.push({ x: cx + r * Math.cos((2 * Math.PI * i) / n), y: cy + r * Math.sin((2 * Math.PI * i) / n) });
  return vereinige(zuFlaeche([punkte]));
}
