import fs from "node:fs";
import path from "node:path";
import { rendereSchichtkarte } from "@/engine";
import { produktionsSvg } from "@/engine/produktion";
import type { GeoPunkt, Kundeneingabe, Schichtkarte } from "@/engine/typen";
import { slug, type Produktparameter } from "./vorlagen";

export const EXPORT_ORDNER = path.join(process.cwd(), "export");

export interface ExportAuftrag {
  varianten: { id: string; name: string; karte: Produktparameter }[];
  kunde: Kundeneingabe;
  lon: number;
  lat: number;
  kartenMitte?: GeoPunkt;
}

export interface ExportErgebnis {
  ordner: string;
  varianten: {
    id: string;
    name: string;
    dateien: string[];
    lagen: { titel: string; material: string; staerkeMm: number; teile: number }[];
    warnungen: string[];
  }[];
}

/**
 * Testexemplare: je Variante ein Ordner mit einer Laserdatei pro Lage (von
 * oben nach unten nummeriert), der Vorschau, den verwendeten Parametern und
 * einer Uebersicht fuer die Werkstatt. Die Parameter liegen bei, damit sich
 * ein Prototyp spaeter exakt nachbauen laesst – auch wenn die Vorlage bis
 * dahin weiterentwickelt wurde.
 */
export async function exportiere(auftrag: ExportAuftrag, token: string): Promise<ExportErgebnis> {
  const jetzt = new Date();
  const datum = jetzt.toISOString().slice(0, 16).replace("T", " ");
  const stempel = jetzt.toISOString().slice(0, 16).replace(/[-:]/g, "").replace("T", "-");
  const kennung = slug(auftrag.kunde.ortText || auftrag.kunde.titel || "test") || "test";
  const ordner = path.join(EXPORT_ORDNER, `${stempel}_${kennung}`);
  fs.mkdirSync(ordner, { recursive: true });

  const ergebnis: ExportErgebnis = { ordner, varianten: [] };

  for (const v of auftrag.varianten) {
    const karte: Schichtkarte = { ...v.karte, kunde: auftrag.kunde, lon: auftrag.lon, lat: auftrag.lat, kartenMitte: auftrag.kartenMitte };
    const r = await rendereSchichtkarte(karte, token);
    const ziel = path.join(ordner, v.id);
    fs.mkdirSync(ziel, { recursive: true });

    const dateien: string[] = [];
    const schreibe = (name: string, inhalt: string) => {
      fs.writeFileSync(path.join(ziel, name), inhalt);
      dateien.push(name);
    };

    schreibe("00-vorschau.svg", r.vorschauSvg);
    r.lagen.forEach((lage, i) => {
      const nummer = i + 1;
      const name = `${String(nummer).padStart(2, "0")}-${slug(lage.titel)}.svg`;
      schreibe(name, produktionsSvg(r.layout, lage, { vorlage: v.name, datum, nummer }));
    });
    schreibe("parameter.json", JSON.stringify(karte, null, 2) + "\n");
    schreibe("uebersicht.txt", uebersicht(v.name, datum, karte, r));

    ergebnis.varianten.push({
      id: v.id,
      name: v.name,
      dateien,
      lagen: r.lagen.map((l) => ({ titel: l.titel, material: l.material, staerkeMm: l.staerkeMm, teile: l.teile.length })),
      warnungen: r.warnungen,
    });
  }
  return ergebnis;
}

function uebersicht(name: string, datum: string, karte: Schichtkarte, r: Awaited<ReturnType<typeof rendereSchichtkarte>>): string {
  const { platte } = r.layout;
  const zeilen = [
    `Schichtkarte – ${name}`,
    `erstellt ${datum}`,
    ``,
    `Platte:     ${platte.breiteMm} x ${platte.hoeheMm} mm (${karte.format}, ${karte.layoutArt}, ${karte.aufbau})`,
    `Ort (Symbol-Anker): ${karte.lat.toFixed(5)}, ${karte.lon.toFixed(5)} – ${karte.kunde.symbol}, ${karte.kunde.symbolGroesse}`,
    `Ausschnitt: ${karte.ausschnittKm} km breit um ${r.kartenMitte.lat.toFixed(5)}, ${r.kartenMitte.lon.toFixed(5)}`,
    `Texte:      ${r.texte.titel} / ${r.texte.zeile1} / ${r.texte.zeile2}`,
    ``,
    `Lagen von oben nach unten (Dateinummer = Reihenfolge):`,
    ...r.lagen.map((l, i) => `  ${String(i + 1).padStart(2, "0")}  ${l.titel.padEnd(16)} ${l.material.padEnd(20)} ${String(l.staerkeMm).padStart(3)} mm  ${l.teile.length} Teil(e)`),
    // Das Symbol wird zuletzt eingesetzt: auf Blau geklebt, durch die Ausschnitte der Lagen darueber.
    `Symbol: sitzt auf Blau (Tropfen Sekundenkleber), alle Lagen darueber haben den Ausschnitt; ${r.kennzahlen.symbolVertiefungMm.toFixed(1)} mm vertieft.`,
    ``,
    `Jede Datei: Ebene "1 Gravur" (Flaeche), "2 Schnitt innen" (rot), "3 Schnitt aussen" (blau).`,
    `Stencil-Stege: ${r.kennzahlen.stencilStege}, zugefuellte Innenflaechen: ${r.kennzahlen.inselnZugefuellt}`,
    `Netz im Fenster: ${Math.round(r.kennzahlen.netzAnteilFenster * 100)} %, lose Netzstuecke: ${r.kennzahlen.loseNetzstuecke}`,
  ];
  if (r.warnungen.length) zeilen.push(``, `Hinweise:`, ...r.warnungen.map((w) => `  - ${w}`));
  return zeilen.join("\n") + "\n";
}
