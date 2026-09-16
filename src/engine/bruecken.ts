import type { Punkt } from "./clip";
import { ausTeilen, puffereLinien, schneide, teile, vereinige, versatz, ziehAb, ziehLinienAb, type Flaeche } from "./geometrie";
import type { Schichtkarte, Teil } from "./typen";

/**
 * Bruecken ueber Wasser (Marcel 17.09.2026): eine Bruecke zeigt sich in der Lage ihres Wegs.
 * Geschnittene Strassen tragen sie im Netz – darunter wird kein Wasser geschnitten (stapel.ts).
 * Gravierte Strassen und Gleise bekommen einen Streifen Hintergrund, auf dem die Gravur
 * weiterlaeuft (welche Klassen: netz.ts). Vorher fiel ihre Gravur ueber Wasser einfach weg: bei
 * "wenig" fehlten Koelns Rheinbruecken, und die Berliner S-Bahn und Koelns Stadtbahn (Nebengleise,
 * immer graviert) querten nie einen Fluss.
 */

// Streifen = Strich plus dieser Rand je Seite, damit der Laser nicht an der Schnittkante graviert.
export const BRUECKE_RAND_MM = 0.3;
// Gleise auf einer geschnittenen Strassenbruecke (Strassenbahn, Stadtbahn) gehoeren zu ihr und
// bekommen keinen eigenen Streifen daneben.
const AUF_NETZBRUECKE_MM = 0.6;
// Das Ufer liegt in den Daten oft unter dem Widerlager: die Bruecke endet knapp im Wasser.
// Verlaengert erreicht ihr Streifen sicher Land.
const VERLAENGERUNG_MM = 1;

export interface BrueckenLinien {
  linien: Punkt[][];
  /** Netz: Strassenbreite. Gravur: Breite des Streifens. */
  breiteMm: number;
}

/** Hintergrund, der ueber dem geschnittenen Wasser stehen bleibt. */
export function brueckenStreifen(k: Schichtkarte, graviert: BrueckenLinien[], netz: BrueckenLinien[], wasser: Flaeche): Flaeche {
  if (!wasser.length || !graviert.length) return [];
  const netzFl = vereinige(...netz.map((b) => puffereLinien(b.linien, b.breiteMm)));
  const nah = versatz(netzFl, AUF_NETZBRUECKE_MM);
  const streifen = vereinige(...graviert.map((b) => puffereLinien(ziehLinienAb(b.linien.map(verlaengert), nah), b.breiteMm)));
  if (!streifen.length) return [];
  // Schlitze zu einer Nachbarbruecke bleiben offen: sie fallen mit ihrem Wasser heraus. Geschlossen
  // (Schliessen ueber Wasser) verschoben sich die Uferpunkte, und echte Bruecken fielen weg.
  const stuecke = teile(schneide(streifen, wasser), 0.01);
  return ausTeilen(nurVerbindende(stuecke, teile(ziehAb(streifen, wasser), 0.01), wasser, netzFl, k.wasserMinFlaecheMm2));
}

function verlaengert(l: Punkt[]): Punkt[] {
  if (l.length < 2) return l;
  const weiter = (von: Punkt, bis: Punkt) => {
    const d = Math.hypot(bis.x - von.x, bis.y - von.y) || 1;
    return { x: bis.x + ((bis.x - von.x) / d) * VERLAENGERUNG_MM, y: bis.y + ((bis.y - von.y) / d) * VERLAENGERUNG_MM };
  };
  return [weiter(l[1], l[0]), ...l, weiter(l[l.length - 2], l[l.length - 1])];
}

// Beruehrung ueber gemeinsame Eckpunkte: am Ufer schneiden Streifen und Wasserkante sich in
// denselben Punkten (Clipper rechnet in µm). Raster 50 µm mit Nachbarzellen gegen Rundungsreste.
const RASTER = 20;
const zelle = (p: Punkt) => [Math.round(p.x * RASTER), Math.round(p.y * RASTER)] as const;
const ecken = (t: Teil) => [t.aussen, ...t.loecher].flat();

/** Findet zu einem Punkt die Teile, die dort eine Ecke haben. */
function eckenRegister(teile: Teil[]) {
  const karte = new Map<string, number>();
  teile.forEach((t, i) => ecken(t).forEach((p) => karte.set(zelle(p).join(), i)));
  return (p: Punkt) => {
    const [x, y] = zelle(p);
    const treffer: number[] = [];
    for (const dx of [-1, 0, 1]) {
      for (const dy of [-1, 0, 1]) {
        const i = karte.get(`${x + dx},${y + dy}`);
        if (i !== undefined) treffer.push(i);
      }
    }
    return treffer;
  };
}

/**
 * Nur Stuecke, die ein Ufer mit einem anderen verbinden: was im Wasser endet, waere ein Stummel
 * mit Kerbe. Trennt eine Bruecke ein Stueck Wasser unter der Mindestflaeche ab, entfaellt sie –
 * das Loch waere zu klein zum Schneiden, und die Gracht soll bleiben (Amsterdam).
 */
function nurVerbindende(stuecke: Teil[], anLand: Teil[], wasser: Flaeche, netzFl: Flaeche, minFlaecheMm2: number): Teil[] {
  const ufer = eckenRegister(anLand);
  let bruecken = stuecke.filter((t) => new Set(ecken(t).flatMap(ufer)).size >= 2);
  // Je zu kleinem Stueck faellt die kleinste beruehrende Bruecke weg, bis keins mehr bleibt.
  for (let runde = 0; runde < 6 && bruecken.length; runde++) {
    const klein = teile(ziehAb(wasser, vereinige(ausTeilen(bruecken), netzFl)), 0.01).filter((t) => t.flaecheMm2 < minFlaecheMm2);
    if (!klein.length) break;
    const inKlein = eckenRegister(klein);
    const weg = new Map<number, Teil>();
    for (const b of bruecken) {
      for (const i of new Set(ecken(b).flatMap(inKlein))) {
        if (!weg.has(i) || b.flaecheMm2 < weg.get(i)!.flaecheMm2) weg.set(i, b);
      }
    }
    if (!weg.size) break;
    const raus = new Set(weg.values());
    bruecken = bruecken.filter((b) => !raus.has(b));
  }
  return bruecken;
}
