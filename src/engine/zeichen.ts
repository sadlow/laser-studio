import { gms } from "./geo";
import type { Schichtkarte } from "./typen";

/**
 * Hoechstlaengen der Kundentexte (Marcel 16.09.2026): Titel 20 Zeichen, jede Zeile
 * darunter 30. Gezaehlt wird die Zeile, wie sie auf dem Poster steht – bei
 * "Ort + Koordinaten" zaehlen die Koordinaten mit, dem Ort bleibt der Rest.
 *
 * Ohne Browser- und Kartenabhaengigkeit: der Designer (und spaeter der
 * Shop-Customizer) begrenzt seine Felder damit, die Engine meldet Entwuerfe,
 * die darueber liegen – etwa aus einem Link oder einer aelteren Sitzung.
 */
export const MAX_ZEICHEN = { titel: 20, zeile: 30 } as const;

export interface Zeichenstand {
  /** Zeichen der Zeile auf dem Poster. */
  zeichen: number;
  max: number;
  /** Was das Eingabefeld zulaesst – beim Ort vor den Koordinaten weniger als max. */
  feldMax: number;
}

/** Zeichen statt UTF-16-Einheiten: ein Emoji zaehlt einmal. */
const laenge = (text: string) => [...text].length;

/** Koordinaten wie auf dem Poster, z.B. 50°56‘18“N 6°57‘39“O. */
export const koordinatenText = (k: Schichtkarte) => `${gms(k.lat, "breite")} ${gms(k.lon, "laenge")}`;

/** Die letzte Zeile vor der Versalien-Umwandlung. */
export function letzteZeileText(k: Schichtkarte) {
  return k.kunde.letzteZeile === "koordinaten"
    ? [k.kunde.ortText.trim(), koordinatenText(k)].filter(Boolean).join(" ")
    : k.kunde.wunschtext.trim();
}

export function zeichenstand(k: Schichtkarte): Record<"titel" | "zeile1" | "zeile2", Zeichenstand> {
  const { titel, zeile } = MAX_ZEICHEN;
  const ortPlatz = Math.max(0, zeile - laenge(koordinatenText(k)) - 1);
  return {
    titel: { zeichen: laenge(k.kunde.titel.trim()), max: titel, feldMax: titel },
    zeile1: { zeichen: laenge(k.kunde.namen.trim()), max: zeile, feldMax: zeile },
    zeile2: { zeichen: laenge(letzteZeileText(k)), max: zeile, feldMax: k.kunde.letzteZeile === "koordinaten" ? ortPlatz : zeile },
  };
}

/** Hinweise fuer Texte ueber der Hoechstlaenge. Gekuerzt wird nie still: es ist Kundentext. */
export function zeichenWarnungen(k: Schichtkarte): string[] {
  const stand = zeichenstand(k);
  const namen = { titel: "Der Titel", zeile1: "Die Namenszeile", zeile2: "Die letzte Zeile" } as const;
  return (Object.keys(stand) as (keyof typeof stand)[])
    .filter((z) => stand[z].zeichen > stand[z].max)
    .map((z) => {
      const mitKoordinaten = z === "zeile2" && k.kunde.letzteZeile === "koordinaten";
      return (
        `${namen[z]} hat ${stand[z].zeichen} Zeichen${mitKoordinaten ? " mit Koordinaten" : ""}, ` +
        `vorgesehen sind hoechstens ${stand[z].max}${mitKoordinaten ? " – den Ort kuerzen" : ""}.`
      );
    });
}
