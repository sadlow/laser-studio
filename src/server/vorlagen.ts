import fs from "node:fs";
import path from "node:path";
import { standardSchichtkarte, staerkenAus } from "@/engine/standard";
import type { Schichtkarte } from "@/engine/typen";

/**
 * Eine Vorlage ist das Produkt: alle Parameter ausser der Kundeneingabe und
 * dem Ort. Die Kundeneingabe ist die Bestellung. Beides zusammen ergibt die
 * Laserdateien – dieselbe Trennung braucht spaeter der Shop.
 *
 * Abgelegt als JSON im Repo (vorlagen/), damit sie versioniert sind und ein
 * anderes System sie lesen kann, ohne diese App zu kennen.
 */
export type Produktparameter = Omit<Schichtkarte, "kunde" | "lon" | "lat" | "kartenMitte" | "teilungWahl">;

export interface Vorlage {
  id: string;
  name: string;
  beschreibung: string;
  karte: Produktparameter;
}

export const VORLAGEN_ORDNER = path.join(process.cwd(), "vorlagen");

export function listeVorlagen(): Vorlage[] {
  if (!fs.existsSync(VORLAGEN_ORDNER)) return [];
  return fs
    .readdirSync(VORLAGEN_ORDNER)
    .filter((d) => d.endsWith(".json"))
    .map((d) => lese(path.join(VORLAGEN_ORDNER, d)))
    .sort((a, b) => a.name.localeCompare(b.name, "de"));
}

export function ladeVorlage(id: string): Vorlage | null {
  const datei = path.join(VORLAGEN_ORDNER, `${pruefeId(id)}.json`);
  return fs.existsSync(datei) ? lese(datei) : null;
}

/**
 * Vorlagen altern: kommt ein Parameter dazu, fehlt er in allen aelteren
 * Dateien, und die Engine bricht beim Laden ab. Darum wird mit den
 * Standardwerten aufgefuellt – auch in den verschachtelten Gruppen.
 */
function lese(datei: string): Vorlage {
  const v = JSON.parse(fs.readFileSync(datei, "utf8")) as Vorlage;
  const { kunde: _k, lon: _lo, lat: _la, ...basis } = standardSchichtkarte();
  const k = v.karte as Partial<Produktparameter>;
  return {
    ...v,
    karte: {
      ...basis,
      ...k,
      eingebettet: { ...basis.eingebettet, ...k.eingebettet },
      generalisierung: {
        ...basis.generalisierung,
        ...k.generalisierung,
        stufen: { ...basis.generalisierung.stufen, ...k.generalisierung?.stufen },
      },
      symbolStufenMm: k.symbolStufenMm?.length ? k.symbolStufenMm : basis.symbolStufenMm,
      staerkenMm: staerkenAus(k.staerkenMm),
      grundSchwarzFrost: k.grundSchwarzFrost ?? (k as { schwarzFrost?: boolean }).schwarzFrost ?? basis.grundSchwarzFrost,
      holzrahmenProfil: { ...basis.holzrahmenProfil, ...k.holzrahmenProfil },
      gravurExport: { ...basis.gravurExport, ...k.gravurExport },
      teilung: { ...basis.teilung, ...k.teilung },
      titelStil: { ...basis.titelStil, ...k.titelStil },
      zeilenStil: { ...basis.zeilenStil, ...k.zeilenStil },
    },
  };
}

/** Speichert unter einer id aus dem Namen. Gleicher Name ueberschreibt – gewollt beim Nachjustieren. */
export function speichereVorlage(name: string, beschreibung: string, karte: Schichtkarte): Vorlage {
  const id = slug(name);
  if (!id) throw new Error("Die Vorlage braucht einen Namen.");
  // Kunde und Ort gehoeren zur Bestellung, nicht zum Produkt.
  const { kunde: _kunde, lon: _lon, lat: _lat, kartenMitte: _mitte, teilungWahl: _naht, ...produkt } = karte;
  const vorlage: Vorlage = { id, name: name.trim(), beschreibung: beschreibung.trim(), karte: produkt };
  fs.mkdirSync(VORLAGEN_ORDNER, { recursive: true });
  fs.writeFileSync(path.join(VORLAGEN_ORDNER, `${id}.json`), JSON.stringify(vorlage, null, 2) + "\n");
  return vorlage;
}

export function slug(text: string): string {
  return text
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function pruefeId(id: string): string {
  if (!/^[a-z0-9-]{1,60}$/.test(id)) throw new Error(`Ungueltige Vorlagen-id "${id}".`);
  return id;
}
