// Layout "Titel auf der Kante" (Marcel 25.09.2026, Vorbild Kettle Falls): der Titel steht als Material auf der
// Innenkante des unteren Rahmens und ragt in die Karte; Namen und letzte Zeile negativ im verbreiterten unteren Rand.

export type TitelLage = "links" | "mitte" | "rechts";
export type ZeilenLage = "links" | "mitte" | "rechts";

export interface KantenLayout {
  /** Rand rundum, breiter als beim Reiter-Layout: er traegt das Bild. */
  rahmenMm: number;
  /** Unterer Rand mit der ausgeschnittenen Zeile. */
  rahmenUntenMm: number;
  /** Abstand von Titel und Zeile zur seitlichen Kartenkante. */
  einzugMm: number;
  titelSchrift: string;
  titelSperrung: number;
  /** Hoechstens so hoch (Versalhoehe, Anteil der Plattenhoehe) – kurze Titel wachsen nicht weiter. */
  titelVersalAnteil: number;
  /** Hoechstens so breit (Anteil der Plattenbreite, Marcel: ein Drittel); laengere Titel werden kleiner. */
  titelMaxBreiteAnteil: number;
  /** So weit bleiben die Strassen vom Titel weg; zwischen den Buchstaben laufen keine. */
  grabenMm: number;
  /**
   * Nur mit Deckschicht (Aufbau "netz-schwarz"): der weisse Titel sitzt in der Deckschicht, darunter im schwarzen Netz
   * eine Umrandung so breit – Kontrast gegen den weissen Grund, und die Strassen haengen daran (Marcel 25.09.2026).
   */
  konturMm: number;
  zeileSperrung: number;
}
