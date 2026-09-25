import ClipperLib from "clipper-lib";
import type { Punkt } from "./clip";
import type { Teil } from "./typen";

// Clipper rechnet ganzzahlig. Faktor 1000 = Mikrometer – feiner als jede
// Schnittfuge, grob genug, dass keine Rundungsfehler entstehen.
const S = 1000;

/** Polygone in Clipper-Einheiten. Loch oder Flaeche steckt in der Umlaufrichtung. */
export type Flaeche = ClipperLib.Paths;

const NONZERO = ClipperLib.PolyFillType.pftNonZero;

export function zuFlaeche(ringe: Punkt[][]): Flaeche {
  return ringe
    .filter((r) => r.length >= 3)
    .map((r) => r.map((p) => ({ X: Math.round(p.x * S), Y: Math.round(p.y * S) })));
}

function zuPfad(linie: Punkt[]): ClipperLib.Path {
  return linie.map((p) => ({ X: Math.round(p.x * S), Y: Math.round(p.y * S) }));
}

function vonPfad(pfad: ClipperLib.Path): Punkt[] {
  return pfad.map((p) => ({ x: p.X / S, y: p.Y / S }));
}

export function rechteck(x: number, y: number, breite: number, hoehe: number): Flaeche {
  return zuFlaeche([
    [
      { x, y },
      { x: x + breite, y },
      { x: x + breite, y: y + hoehe },
      { x, y: y + hoehe },
    ],
  ]);
}

function ausfuehren(typ: ClipperLib.ClipType, subjekt: Flaeche, clip: Flaeche): Flaeche {
  const c = new ClipperLib.Clipper();
  c.AddPaths(subjekt, ClipperLib.PolyType.ptSubject, true);
  if (clip.length) c.AddPaths(clip, ClipperLib.PolyType.ptClip, true);
  const ergebnis: Flaeche = [];
  c.Execute(typ, ergebnis, NONZERO, NONZERO);
  return ergebnis;
}

export function vereinige(...flaechen: Flaeche[]): Flaeche {
  const alle = flaechen.flat();
  if (!alle.length) return [];
  return ausfuehren(ClipperLib.ClipType.ctUnion, alle, []);
}

export function ziehAb(subjekt: Flaeche, clip: Flaeche): Flaeche {
  if (!subjekt.length) return [];
  if (!clip.length) return subjekt;
  return ausfuehren(ClipperLib.ClipType.ctDifference, subjekt, clip);
}

export function schneide(subjekt: Flaeche, clip: Flaeche): Flaeche {
  if (!subjekt.length || !clip.length) return [];
  return ausfuehren(ClipperLib.ClipType.ctIntersection, subjekt, clip);
}

/**
 * Macht aus Linien Flaechen der gegebenen Breite, mit runden Enden und Ecken.
 * Alle Linien gehen in EINEN Offset-Lauf – Clipper vereinigt dabei selbst.
 * Einzeln puffern und danach vereinigen waere bei tausenden Strassenstuecken
 * um ein Vielfaches langsamer.
 */
export function puffereLinien(linien: Punkt[][], breiteMm: number): Flaeche {
  const pfade = linien.filter((l) => l.length >= 2).map(zuPfad);
  if (!pfade.length || breiteMm <= 0) return [];
  // arcTolerance 0.03 mm: so fein werden Rundungen angenaehert.
  const co = new ClipperLib.ClipperOffset(2, 0.03 * S);
  co.AddPaths(pfade, ClipperLib.JoinType.jtRound, ClipperLib.EndType.etOpenRound);
  const ergebnis: Flaeche = [];
  co.Execute(ergebnis, (breiteMm / 2) * S);
  return ergebnis;
}

/** Waechst eine Flaeche nach aussen (positiv) oder schrumpft sie (negativ). */
export function versatz(flaeche: Flaeche, mm: number): Flaeche {
  if (!flaeche.length) return [];
  const co = new ClipperLib.ClipperOffset(2, 0.03 * S);
  co.AddPaths(flaeche, ClipperLib.JoinType.jtRound, ClipperLib.EndType.etClosedPolygon);
  const ergebnis: Flaeche = [];
  co.Execute(ergebnis, mm * S);
  return ergebnis;
}

/** Rechteck mit runden Ecken: erst um den Radius schrumpfen, dann rund aufweiten. */
export function abgerundetesRechteck(x: number, y: number, breite: number, hoehe: number, radius: number): Flaeche {
  const r = Math.max(0, Math.min(radius, breite / 2 - 0.01, hoehe / 2 - 0.01));
  if (r <= 0) return rechteck(x, y, breite, hoehe);
  return versatz(rechteck(x + r, y + r, breite - 2 * r, hoehe - 2 * r), r);
}

/**
 * Schliessen: erst aufweiten, dann um dasselbe Mass zurueck. Innenecken und
 * Kerben unter dem doppelten Radius werden rund gefuellt, Aussenformen bleiben.
 */
export function schliesse(flaeche: Flaeche, radius: number): Flaeche {
  if (radius <= 0 || !flaeche.length) return flaeche;
  return versatz(versatz(flaeche, radius), -radius);
}

/**
 * Zerlegt eine Flaeche in physische Teile: jede Aussenkontur mit ihren
 * Loechern ist ein Stueck Acryl. Das ist die Zahl, die in der Werkstatt zaehlt.
 */
export function teile(flaeche: Flaeche, minFlaecheMm2 = 0.05, strikt = false): Teil[] {
  if (!flaeche.length) return [];
  const c = new ClipperLib.Clipper();
  // strikt: Loecher, die die Aussenkante in einem Punkt beruehren, ordnet Clipper sonst manchmal dem falschen Teil zu –
  // das Loch fehlt dann (Entwurf "Titel auf der Kante", 25.09.2026). Noch nicht Standard: Auswirkung auf die Lagen offen.
  c.StrictlySimple = strikt;
  c.AddPaths(flaeche, ClipperLib.PolyType.ptSubject, true);
  const baum = new ClipperLib.PolyTree();
  c.Execute(ClipperLib.ClipType.ctUnion, baum, NONZERO, NONZERO);

  const ergebnis: Teil[] = [];
  const besuche = (knoten: ClipperLib.PolyNode) => {
    for (const kind of knoten.Childs()) {
      if (!kind.IsHole()) {
        const aussen = kind.Contour();
        const loecher = kind.Childs().map((l) => l.Contour());
        const flaecheMm2 =
          (Math.abs(ClipperLib.Clipper.Area(aussen)) -
            loecher.reduce((s, l) => s + Math.abs(ClipperLib.Clipper.Area(l)), 0)) /
          (S * S);
        // Unterhalb der Grenze sind es Rechenreste des Clippings, kein Material.
        if (flaecheMm2 >= minFlaecheMm2) {
          ergebnis.push({ aussen: vonPfad(aussen), loecher: loecher.map(vonPfad), flaecheMm2 });
        }
      }
      // Loecher koennen wieder Teile enthalten (Insel im Wasser, Punze im Buchstaben).
      besuche(kind);
    }
  };
  besuche(baum);
  return ergebnis.sort((a, b) => b.flaecheMm2 - a.flaecheMm2);
}

/** Nur die Aussenkonturen – Loecher werden geschlossen. */
export function ohneLoecher(flaeche: Flaeche, minFlaecheMm2 = 0.05): Flaeche {
  return vereinige(teile(flaeche, minFlaecheMm2).map((t) => zuPfad(t.aussen)));
}

/**
 * Linien, soweit sie ausserhalb (`innen` = false) oder innerhalb der Flaeche
 * liegen. Gebraucht fuer die Gravur: unter einer weissen Schutzkontur ist sie
 * unsichtbar, in den ausgeschnittenen Buchstaben stoerten helle Striche.
 */
export function ziehLinienAb(linien: Punkt[][], flaeche: Flaeche, innen = false): Punkt[][] {
  if (!flaeche.length || !linien.length) return innen ? [] : linien;
  const c = new ClipperLib.Clipper();
  c.AddPaths(linien.filter((l) => l.length >= 2).map(zuPfad), ClipperLib.PolyType.ptSubject, false);
  c.AddPaths(flaeche, ClipperLib.PolyType.ptClip, true);
  const baum = new ClipperLib.PolyTree();
  c.Execute(innen ? ClipperLib.ClipType.ctIntersection : ClipperLib.ClipType.ctDifference, baum, NONZERO, NONZERO);
  return ClipperLib.Clipper.OpenPathsFromPolyTree(baum).map(vonPfad);
}

/** Mittelwert der Aussenkontur – reicht, um ein Teil einem Bereich zuzuordnen. */
export function schwerpunkt(t: Teil): Punkt {
  let x = 0;
  let y = 0;
  for (const p of t.aussen) {
    x += p.x;
    y += p.y;
  }
  return { x: x / t.aussen.length, y: y / t.aussen.length };
}

/** Liegt der Punkt in der Flaeche? */
export function enthaelt(flaeche: Flaeche, p: Punkt): boolean {
  if (!flaeche.length) return false;
  return schneide(rechteck(p.x - 0.01, p.y - 0.01, 0.02, 0.02), flaeche).length > 0;
}

/** Teile zurueck in eine Flaeche. */
export function ausTeilen(t: Teil[]): Flaeche {
  const ringe: ClipperLib.Paths = [];
  for (const teil of t) {
    ringe.push(zuPfad(teil.aussen));
    for (const loch of teil.loecher) ringe.push(zuPfad(loch));
  }
  return ringe;
}

export function verschiebe(fl: Flaeche, dx: number, dy: number): Flaeche {
  return fl.map((p) => p.map((q) => ({ X: q.X + Math.round(dx * S), Y: q.Y + Math.round(dy * S) })));
}

/** Alle Ringe einer Flaeche in mm – fuer Ray-Casting und Ausgabe. */
export function ringeInMm(flaeche: Flaeche): Punkt[][] {
  return flaeche.map(vonPfad);
}

export function flaecheMm2(flaeche: Flaeche): number {
  return flaeche.reduce((s, p) => s + ClipperLib.Clipper.Area(p), 0) / (S * S);
}
