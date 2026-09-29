import { einzelteilFlaeche, f1, GRAU, materialVon, ORANGE, ROT, stellenAus, zeichneAusschnitt, type Stelle } from "./montageplan-zeichnen";
import { PdfSeite, pdfDatei } from "./pdf";
import type { Flaeche } from "./geometrie";
import type { LagenKey, LagenTeilung, SchichtkartenErgebnis } from "./typen";

// A3 quer: die Karte im Ueberblick gross genug, um Strassen zu erkennen, und die Liste daneben.
const B = 420;
const H = 297;
const DETAIL_MM = 40;

export interface MontageplanDaten {
  titel: string;
  datum: string;
  /** Laserdateien je Lage: bei geteilten Lagen A und B, sonst eine. */
  dateien: Partial<Record<LagenKey, string[]>>;
  /** Freie Zeilen fuer die erste Seite (Ort, Texte, Rahmen). */
  angaben: string[];
}

/**
 * Montageplan fuer die Werkstatt (Marcel 25.09.2026): wo die Naht jeder Lage liegt, welche Stuecke einzeln
 * eingesetzt werden (E) und welche Uebergaenge heikel sind (K). Eine Seite Ueberblick, je geteilter Lage die ganze
 * Karte mit allen Stellen, dann jede Stelle vergroessert.
 */
export function montageplanPdf(r: SchichtkartenErgebnis, d: MontageplanDaten): Buffer | null {
  const t = r.teilung;
  if (!t) return null;
  const seiten: PdfSeite[] = [];
  const { breiteMm: KB, hoeheMm: KH } = r.layout.platte;

  // 1. Ueberblick
  const s1 = new PdfSeite(B, H);
  let y = 20;
  const zeile = (text: string, pt = 10, fett = false, abstand = 5.5) => {
    s1.text(15, y, pt, text, fett);
    y += abstand;
  };
  zeile(`Montageplan – ${d.titel}`, 18, true, 9);
  zeile(`${KB / 10} x ${KH / 10} cm aus Rohplatten ${t.rohplatte.breiteMm / 10} x ${t.rohplatte.hoeheMm / 10} cm · erstellt ${d.datum}`, 10, false, 8);
  for (const a of d.angaben) zeile(a, 9);
  y += 4;
  zeile("Lagen und Dateien", 12, true, 7);
  for (const l of r.lagen) {
    const teilung = t.lagen.find((x) => x.key === l.key);
    const dateien = (d.dateien[l.key] ?? []).join(", ");
    const was = teilung
      ? `Naht ${teilung.gewaehlt.richtung} bei ${teilung.gewaehlt.posMm} mm – ${teilung.gewaehlt.uebergaenge} Uebergaenge, ` +
        `${teilung.gewaehlt.kritisch} kritisch (K), ${teilung.gewaehlt.einzelteile} Einzelteile (E)`
      : l.key === "blau" ? "ungeteilt, Rohformat – kein Laser"
      : t.gehrung.includes(l.key) ? "vier Leisten mit Gehrung auf einem Bogen, in den Ecken auf Stoss" : "ungeteilt";
    zeile(`${l.titel} (${l.material}, ${l.staerkeMm} mm): ${was}`, 10, true, 4.8);
    if (dateien) zeile(`    ${dateien}`, 9, false, 6);
  }
  y += 4;
  zeile("Reihenfolge", 12, true, 7);
  const schritte = [
    "1. Blau als ganze Platte in den Rahmen legen.",
    ...t.lagen.slice().reverse().map((l, i) =>
      `${i + 2}. ${l.titel}: Haelfte A, dann B, Kartenkanten an den Rahmen, Naht stumpf gestossen. ` +
        (l.gewaehlt.einzelteile ? `Einzelteile E1-E${l.gewaehlt.einzelteile} nach Detailbild einsetzen.` : "Keine Einzelteile."),
    ),
    ...(t.gehrung.length ? [`${t.lagen.length + 2}. Deckrahmen: Leisten oben, unten, links, rechts auflegen, Gehrungen in den Ecken buendig.`] : []),
    `${t.lagen.length + 2 + t.gehrung.length}. Symbol auf die Klebeflaeche im Hintergrund.`,
  ];
  for (const s of schritte) zeile(s, 10);
  y += 4;
  zeile("Legende", 12, true, 7);
  s1.pfad([[{ x: 15, y: y - 1.2 }, { x: 30, y: y - 1.2 }]], { linie: ROT, breiteMm: 0.35, offen: true, strich: [2, 1.2] });
  s1.text(33, y, 9, "Naht");
  s1.rechteck(55, y - 3, 6, 3.5, { fuellung: ORANGE });
  s1.text(63, y, 9, "E = Einzelteil: erst die Naht trennt es ab, einzeln einsetzen");
  s1.kreis(168, y - 1.2, 2, { linie: ROT, breiteMm: 0.4 });
  s1.text(172, y, 9, "K = kritischer Uebergang: schmal (unter 1,5 mm) oder flach gekreuzt (spitze Enden)");
  seiten.push(s1);

  // 2. Je geteilte Lage: Ueberblick und Details
  for (const l of t.lagen) {
    const lage = r.lagen.find((x) => x.key === l.key);
    if (!lage) continue;
    const material = materialVon(lage);
    const einzel = einzelteilFlaeche(l);
    const stellen = stellenAus(l);
    const s = new PdfSeite(B, H);
    s.text(15, 14, 14, `${l.titel} – Naht ${l.gewaehlt.richtung} bei ${l.gewaehlt.posMm} mm`, true);
    const gross = 265;
    zeichneAusschnitt(s, material, l, stellen, { xMm: 0, yMm: 0, breiteMm: KB, hoeheMm: KH }, { xMm: 15, yMm: 20, breiteMm: gross, hoeheMm: gross }, einzel);
    haelftenBeschriften(s, l, KB, KH, 15, 20, gross / KB, d.dateien[l.key] ?? []);
    let ly = 26;
    s.text(290, 20, 11, stellen.length ? "Stellen" : "Keine kritischen Stellen.", true);
    for (const st of stellen) {
      if (ly > H - 12) {
        s.text(290, ly, 8, `… und ${stellen.length - stellen.indexOf(st)} weitere, siehe Detailseiten`);
        break;
      }
      s.text(290, ly, 8, st.nr, true, st.nr.startsWith("E") ? ORANGE : ROT);
      s.text(299, ly, 7, st.text.length > 70 ? `${st.text.slice(0, 69)}…` : st.text);
      ly += 4.6;
    }
    seiten.push(s);
    seiten.push(...detailSeiten(l.titel, material, l, stellen, einzel));
  }
  return pdfDatei(seiten, `Montageplan ${d.titel}`);
}

function haelftenBeschriften(s: PdfSeite, l: LagenTeilung, KB: number, KH: number, x0: number, y0: number, m: number, dateien: string[]) {
  const n = l.gewaehlt;
  const ou = n.richtung === "oben-unten";
  const mitten = ou
    ? [{ x: KB / 2, y: n.posMm / 2 }, { x: KB / 2, y: (n.posMm + KH) / 2 }]
    : [{ x: n.posMm / 2, y: KH / 2 }, { x: (n.posMm + KB) / 2, y: KH / 2 }];
  mitten.forEach((p, i) => {
    const text = `${i ? "B" : "A"}${dateien[i] ? ` · ${dateien[i]}` : ""}`;
    s.rechteck(x0 + p.x * m - 2, y0 + p.y * m - 5, text.length * 2.1 + 4, 7, { fuellung: [1, 1, 1], linie: GRAU, breiteMm: 0.2 });
    s.text(x0 + p.x * m, y0 + p.y * m, 10, text, true);
  });
}

function detailSeiten(titel: string, material: Flaeche, l: LagenTeilung, stellen: Stelle[], einzel: Flaeche): PdfSeite[] {
  const seiten: PdfSeite[] = [];
  const [spalten, zeilen, bw, bh] = [3, 2, 125, 112];
  for (let i = 0; i < stellen.length; i += spalten * zeilen) {
    const s = new PdfSeite(B, H);
    s.text(15, 14, 12, `${titel} – Details ${i / (spalten * zeilen) + 1} (Ausschnitt ${DETAIL_MM} x ${DETAIL_MM} mm, Naht rot)`, true);
    stellen.slice(i, i + spalten * zeilen).forEach((st, j) => {
      const x = 15 + (j % spalten) * (bw + 5);
      const y = 20 + Math.floor(j / spalten) * (bh + 22);
      // Grosse Einzelteile ganz zeigen, sonst 40 mm um die Stelle.
      const seite = Math.max(DETAIL_MM, (st.box?.breiteMm ?? 0) + 6, (st.box?.hoeheMm ?? 0) + 6);
      const fenster = { xMm: st.xMm - seite / 2, yMm: st.yMm - seite / 2, breiteMm: seite, hoeheMm: seite };
      zeichneAusschnitt(s, material, l, stellen, fenster, { xMm: x, yMm: y, breiteMm: bw, hoeheMm: bh }, einzel);
      s.text(x, y + bh + 6, 10, st.nr, true, st.nr.startsWith("E") ? ORANGE : ROT);
      s.text(x + 10, y + bh + 6, 7.5, st.text.length > 75 ? `${st.text.slice(0, 74)}…` : st.text);
      if (seite > DETAIL_MM) s.text(x + 10, y + bh + 10.5, 7, `Ausschnitt ${f1(seite)} mm`, false, GRAU);
    });
    seiten.push(s);
  }
  return seiten;
}
