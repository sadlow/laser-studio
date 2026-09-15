import { masseAusEntwurf } from "./formate";
import type { KartenEntwurf, Layout, Zone } from "./typen";

/**
 * Parameter -> Zonen. Das ist die Stelle, die im Illustrator heute ein Template
 * ist: Rahmen, Kartenfeld, Textzonen. Hier sind es Zahlen, und deshalb gilt
 * dasselbe Layout fuer jedes Format, ohne eine zweite Vorlagendatei.
 *
 * Ursprung ist die linke obere Ecke der Platte, Einheit durchgehend mm.
 */
export function berechneLayout(e: KartenEntwurf): Layout {
  const { breiteMm, hoeheMm } = masseAusEntwurf(e);
  const rahmen = Math.max(0, e.rahmenMm);

  const platte: Zone = { xMm: 0, yMm: 0, breiteMm, hoeheMm };

  const innenBreite = Math.max(1, breiteMm - 2 * rahmen);
  const innenHoehe = Math.max(1, hoeheMm - 2 * rahmen);

  const textfeldHoehe = Math.max(0, e.textfeldMm);
  const textabstand = textfeldHoehe > 0 ? Math.max(0, e.textabstandMm) : 0;

  // Das Textfeld nimmt sich seine Hoehe vom unteren Ende des Innenraums.
  // Bleibt zu wenig fuer die Karte uebrig, schrumpft das Textfeld, nicht die
  // Karte auf null: eine Karte ohne Flaeche ist kein Produkt mehr.
  const maxTextfeld = Math.max(0, innenHoehe - textabstand - 10);
  const textfeld = Math.min(textfeldHoehe, maxTextfeld);

  const kartenfeld: Zone = {
    xMm: rahmen,
    yMm: rahmen,
    breiteMm: innenBreite,
    hoeheMm: innenHoehe - (textfeld > 0 ? textfeld + textabstand : 0),
  };

  const textfeldZone: Zone | null =
    textfeld > 0
      ? {
          xMm: rahmen,
          yMm: rahmen + kartenfeld.hoeheMm + textabstand,
          breiteMm: innenBreite,
          hoeheMm: textfeld,
        }
      : null;

  return {
    platte,
    kartenfeld,
    textfeld: textfeldZone,
    textzeilen: verteileZeilen(textfeldZone, e.texte.length),
  };
}

/**
 * Teilt das Textfeld in gleich hohe Zeilen. Bewusst einfach: die Feinheiten
 * (Zeile wiegt mehr als die naechste) kommen erst, wenn wir am echten Entwurf
 * sehen, dass es sie braucht.
 */
function verteileZeilen(textfeld: Zone | null, anzahl: number): Zone[] {
  if (!textfeld || anzahl <= 0) return [];
  const hoehe = textfeld.hoeheMm / anzahl;
  const zeilen: Zone[] = [];
  for (let i = 0; i < anzahl; i++) {
    zeilen.push({
      xMm: textfeld.xMm,
      yMm: textfeld.yMm + i * hoehe,
      breiteMm: textfeld.breiteMm,
      hoeheMm: hoehe,
    });
  }
  return zeilen;
}
