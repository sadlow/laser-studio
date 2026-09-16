/**
 * Referenzorte: Strasseneinstellungen und Grenzwerte muessen weltweit tragen,
 * nicht nur in Berlin (Marcel 16.09.2026). Jeder Ort steht fuer eine Art
 * Kartenbild, das anders bricht. Feste Koordinaten statt Ortssuche – "Rialto
 * Venedig" landete dort auf dem Festland.
 *
 * Kein Engine-Bestandteil: Testdaten fuer Studio und `scripts/referenzorte.ts`.
 */
export interface Referenzort {
  id: string;
  name: string;
  /** Was dieser Ort pruefen soll. */
  pruefung: string;
  /** Ort vor den Koordinaten in der letzten Zeile. */
  ortText: string;
  lon: number;
  lat: number;
}

export const REFERENZORTE: Referenzort[] = [
  { id: "berlin", name: "Berlin Tiergarten", pruefung: "Ausgangsentwurf wie das Poster", ortText: "Berlin", lon: 13.3375, lat: 52.5164 },
  { id: "allgaeu", name: "Wildpoldsried (Allgaeu)", pruefung: "Laendlich: wenige Strassen, viele Feldwege", ortText: "Wildpoldsried", lon: 10.402146, lat: 47.766838 },
  { id: "hamburg", name: "Hamburg Jungfernstieg", pruefung: "Grossstadt mit viel Wasser: Alster, Fleete, Hafen", ortText: "Hamburg", lon: 9.992035, lat: 53.553523 },
  { id: "amsterdam", name: "Amsterdam Dam", pruefung: "Grachtenring: schmale Kanaele, viele Bruecken", ortText: "Amsterdam", lon: 4.892996, lat: 52.373298 },
  { id: "new-york", name: "New York City", pruefung: "Manhattan-Spitze: Raster, zwei Fluesse, Schnellstrassen", ortText: "New York", lon: -74.005994, lat: 40.712749 },
  { id: "bogota", name: "Bogota", pruefung: "Dichtes Strassenraster, wenig Wasser", ortText: "Bogota", lon: -74.083633, lat: 4.653382 },
  { id: "tokio", name: "Tokio Shibuya", pruefung: "Extrem dicht, schmale Gassen", ortText: "Tokio", lon: 139.69878, lat: 35.664455 },
  { id: "venedig", name: "Venedig Rialto", pruefung: "Keine Autostrassen, nur Gassen und Kanaele", ortText: "Venedig", lon: 12.3359, lat: 45.438 },
];
