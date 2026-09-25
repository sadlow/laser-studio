import fs from "node:fs";
import path from "node:path";
import { rendereSchichtkarte } from "@/engine";
import { HOLZRAHMEN_TITEL } from "@/engine/holzrahmen";
import { gravurBeschreibung, produktionsSvg } from "@/engine/produktion";
import { standardSchichtkarte } from "@/engine/standard";
import type { GeoPunkt, Kundeneingabe, Schichtkarte } from "@/engine/typen";
import { geteilteDateien } from "./export-geteilt";
import { mitKartenQuelle } from "./karten-quelle";
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
 * Produktionsdaten: eine Laserdatei pro Lage (von oben nach unten nummeriert), die Vorschau, die
 * verwendeten Parameter und eine Uebersicht fuer die Werkstatt. Die Parameter liegen bei, damit sich
 * ein Stueck spaeter exakt nachbauen laesst – auch wenn die Vorlage bis dahin weiterentwickelt wurde.
 * Eine einzelne Variante (der Exportknopf) landet direkt im Ordner, mehrere je in einem Unterordner.
 */
export async function exportiere(auftrag: ExportAuftrag): Promise<ExportErgebnis> {
  // Ortszeit im Ordnernamen – UTC stand zwei Stunden daneben.
  const jetzt = new Date(Date.now() - new Date().getTimezoneOffset() * 60000);
  const datum = jetzt.toISOString().slice(0, 16).replace("T", " ");
  const stempel = jetzt.toISOString().slice(0, 16).replace(/[-:]/g, "").replace("T", "-");
  const kennung = slug(auftrag.kunde.ortText || auftrag.kunde.titel || "test") || "test";
  const ordner = path.join(EXPORT_ORDNER, `${stempel}_${kennung}`);
  fs.mkdirSync(ordner, { recursive: true });

  const ergebnis: ExportErgebnis = { ordner, varianten: [] };

  for (const v of auftrag.varianten) {
    const karte: Schichtkarte = { ...v.karte, kunde: auftrag.kunde, lon: auftrag.lon, lat: auftrag.lat, kartenMitte: auftrag.kartenMitte };
    // Ein Entwurf aus einem offenen Browserfenster kennt die Einstellung vielleicht noch nicht.
    karte.gravurExport ??= standardSchichtkarte().gravurExport;
    const { wert: r, hinweis } = await mitKartenQuelle(karte.kartenQuelle, (q) => rendereSchichtkarte(karte, q), karte.ausschnittKm);
    if (hinweis) r.warnungen.unshift(hinweis);
    const ziel = auftrag.varianten.length === 1 ? ordner : path.join(ordner, v.id);
    fs.mkdirSync(ziel, { recursive: true });

    const dateien: string[] = [];
    const schreibe = (name: string, inhalt: string | Buffer) => {
      fs.writeFileSync(path.join(ziel, name), inhalt);
      dateien.push(name);
    };

    schreibe("00-vorschau.svg", r.vorschauSvg);
    // Groesser als das Laserfeld: je Lage zwei Rohplatten und ein Montageplan (export-geteilt.ts).
    const geteilt = r.teilung
      ? geteilteDateien(r, karte, { vorlage: v.name, datum, angaben: angaben(karte, r) }, schreibe)
      : null;
    if (!geteilt) {
      r.lagen.forEach((lage, i) => {
        const nummer = i + 1;
        const name = `${String(nummer).padStart(2, "0")}-${slug(lage.titel)}.svg`;
        schreibe(name, produktionsSvg(r.layout, lage, { vorlage: v.name, datum, nummer, gravurExport: karte.gravurExport }));
      });
    }
    schreibe("parameter.json", JSON.stringify(karte, null, 2) + "\n");
    schreibe("uebersicht.txt", uebersicht(v.name, datum, karte, r, geteilt));

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

/** Kopfzeilen fuer den Montageplan. */
function angaben(karte: Schichtkarte, r: Awaited<ReturnType<typeof rendereSchichtkarte>>): string[] {
  return [
    `Texte: ${r.texte.titel} / ${r.texte.zeile1} / ${r.texte.zeile2}`,
    `Ort: ${karte.lat.toFixed(5)}, ${karte.lon.toFixed(5)} · Ausschnitt ${karte.ausschnittKm} km · ${karte.aufbau}`,
    r.rahmen ? `Holzrahmen: ${HOLZRAHMEN_TITEL[r.rahmen.farbe]}` : "Holzrahmen: ohne – bei dieser Groesse nicht vorgesehen",
  ];
}

function uebersicht(name: string, datum: string, karte: Schichtkarte, r: Awaited<ReturnType<typeof rendereSchichtkarte>>, geteilt: string[] | null): string {
  const { platte } = r.layout;
  const zeilen = [
    `Schichtkarte – ${name}`,
    `erstellt ${datum}`,
    ``,
    `Platte:     ${platte.breiteMm} x ${platte.hoeheMm} mm (${karte.format}, ${karte.layoutArt}, ${karte.aufbau})`,
    `Ort (Symbol-Anker): ${karte.lat.toFixed(5)}, ${karte.lon.toFixed(5)} – ${karte.kunde.symbol}, ${karte.kunde.symbolGroesse}`,
    `Ausschnitt: ${karte.ausschnittKm} km breit um ${r.kartenMitte.lat.toFixed(5)}, ${r.kartenMitte.lon.toFixed(5)}`,
    `Kartendaten: ${r.kartenQuelle.startsWith("protomaps") ? "eigenes Archiv, OpenStreetMap (© OpenStreetMap-Mitwirkende)" : "Mapbox"} (${r.kartenQuelle})`,
    `Texte:      ${r.texte.titel} / ${r.texte.zeile1} / ${r.texte.zeile2}`,
    ``,
    `Lagen von oben nach unten (Dateinummer = Reihenfolge):`,
    ...(geteilt ? [
      `Geteilt auf Rohplatten ${r.teilung!.rohplatte.breiteMm} x ${r.teilung!.rohplatte.hoeheMm} mm: Kartenkanten = Plattenkanten, geschnitten wird nur die Naht und das Innere.`,
      `Montageplan mit Einzelteilen (E) und kritischen Uebergaengen (K): montageplan.pdf`,
      ...geteilt,
    ] : []),
    ...(geteilt ? [] : r.lagen).map((l, i) => `  ${String(i + 1).padStart(2, "0")}  ${l.titel.padEnd(16)} ${l.material.padEnd(24)} ${String(l.staerkeMm).padStart(3)} mm  ${l.teile.length} Teil(e)`),
    // Das Symbol wird zuletzt eingesetzt: auf die Klebeflaeche im Hintergrund, durch den Ausschnitt im Netz.
    `Symbol: auf die gravierte Klebeflaeche des Hintergrunds kleben (Tropfen Sekundenkleber), Netz hat den Ausschnitt; steht ${r.kennzahlen.symbolUeberNetzMm.toFixed(1)} mm ueber dem Netz.`,
    r.rahmen
      ? `Holzrahmen: ${HOLZRAHMEN_TITEL[r.rahmen.farbe]}, Profil ${r.rahmen.breiteMm} mm breit / ${r.rahmen.tiefeMm} mm tief, Bild ${r.rahmen.einlassMm} mm eingelassen, ${r.rahmen.ueberstandMm} mm Ueberstand – sichtbarer Rand ${r.kennzahlen.randImRahmenMm.toFixed(1)} mm.`
      : `Holzrahmen: ohne`,
    ``,
    `Jede Datei: Ebene "1 Gravur" (${gravurBeschreibung(karte.gravurExport)}), "2 Klebeflaeche" (gruen, Flaeche, nur Hintergrund), "3 Schnitt innen" (rot), "4 Schnitt aussen" (blau).`,
    `Gravurweg: ${r.kennzahlen.gravurWegM.toFixed(1)} m als Mittellinie, Flaeche ${Math.round(r.kennzahlen.gravurFlaecheMm2)} mm²`,
    `Stencil-Stege: ${r.kennzahlen.stencilStege}, zugefuellte Innenflaechen: ${r.kennzahlen.inselnZugefuellt}`,
    `Netz im Fenster: ${Math.round(r.kennzahlen.netzAnteilFenster * 100)} %, lose Netzstuecke: ${r.kennzahlen.loseNetzstuecke}`,
  ];
  if (r.warnungen.length) zeilen.push(``, `Hinweise:`, ...r.warnungen.map((w) => `  - ${w}`));
  return zeilen.join("\n") + "\n";
}
