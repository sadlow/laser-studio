// Clipping gegen ein Rechteck, uebernommen aus
// extendscript-bulk-processing/tools/fetch-vector-tiles.js.
//
// Warum ueberhaupt geclippt wird: die Pfade muessen PHYSISCH am Kartenfeld
// enden. Eine viewBox schneidet nur die Anzeige ab – der Laser wuerde die
// Geometrie darueber hinaus fahren.

export interface Punkt {
  x: number;
  y: number;
}

const INSIDE = 0,
  LEFT = 1,
  RIGHT = 2,
  BOTTOM = 4,
  TOP = 8;

function outCode(x: number, y: number, x0: number, y0: number, x1: number, y1: number) {
  let c = INSIDE;
  if (x < x0) c |= LEFT;
  else if (x > x1) c |= RIGHT;
  if (y < y0) c |= TOP;
  else if (y > y1) c |= BOTTOM;
  return c;
}

/** Cohen-Sutherland fuer ein einzelnes Segment. */
function clipSegment(
  px: number,
  py: number,
  qx: number,
  qy: number,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
): [number, number, number, number] | null {
  let codeP = outCode(px, py, x0, y0, x1, y1);
  let codeQ = outCode(qx, qy, x0, y0, x1, y1);
  for (;;) {
    if (!(codeP | codeQ)) return [px, py, qx, qy];
    if (codeP & codeQ) return null;
    const code = codeP ? codeP : codeQ;
    let x = 0,
      y = 0;
    if (code & TOP) {
      x = px + ((qx - px) * (y0 - py)) / (qy - py);
      y = y0;
    } else if (code & BOTTOM) {
      x = px + ((qx - px) * (y1 - py)) / (qy - py);
      y = y1;
    } else if (code & RIGHT) {
      y = py + ((qy - py) * (x1 - px)) / (qx - px);
      x = x1;
    } else if (code & LEFT) {
      y = py + ((qy - py) * (x0 - px)) / (qx - px);
      x = x0;
    }
    if (code === codeP) {
      px = x;
      py = y;
      codeP = outCode(px, py, x0, y0, x1, y1);
    } else {
      qx = x;
      qy = y;
      codeQ = outCode(qx, qy, x0, y0, x1, y1);
    }
  }
}

/** Zerlegt eine Polylinie in die Stuecke, die im Rechteck liegen. */
export function clipPolyline(coords: Punkt[], x0: number, y0: number, x1: number, y1: number): Punkt[][] {
  if (coords.length < 2) return [];
  const result: Punkt[][] = [];
  let current: Punkt[] = [];
  for (let i = 0; i + 1 < coords.length; i++) {
    const c = clipSegment(coords[i].x, coords[i].y, coords[i + 1].x, coords[i + 1].y, x0, y0, x1, y1);
    if (!c) {
      if (current.length) {
        result.push(current);
        current = [];
      }
      continue;
    }
    const a = { x: c[0], y: c[1] };
    const b = { x: c[2], y: c[3] };
    if (!current.length) {
      current.push(a, b);
    } else {
      const last = current[current.length - 1];
      // Toleranz in mm: die Stuecke sind klein, 0.01 mm liegt unter der
      // Fertigungsgenauigkeit und haelt zusammenhaengende Zuege zusammen.
      if (Math.abs(last.x - a.x) < 0.01 && Math.abs(last.y - a.y) < 0.01) {
        current.push(b);
      } else {
        result.push(current);
        current = [a, b];
      }
    }
  }
  if (current.length) result.push(current);
  return result;
}

/** Sutherland-Hodgman gegen das Rechteck. */
export function clipPolygon(coords: Punkt[], x0: number, y0: number, x1: number, y1: number): Punkt[] {
  if (coords.length < 3) return [];
  const sides = [
    { drin: (p: Punkt) => p.x >= x0, schnitt: (a: Punkt, b: Punkt) => ({ x: x0, y: a.y + ((b.y - a.y) * (x0 - a.x)) / (b.x - a.x) }) },
    { drin: (p: Punkt) => p.x <= x1, schnitt: (a: Punkt, b: Punkt) => ({ x: x1, y: a.y + ((b.y - a.y) * (x1 - a.x)) / (b.x - a.x) }) },
    { drin: (p: Punkt) => p.y >= y0, schnitt: (a: Punkt, b: Punkt) => ({ x: a.x + ((b.x - a.x) * (y0 - a.y)) / (b.y - a.y), y: y0 }) },
    { drin: (p: Punkt) => p.y <= y1, schnitt: (a: Punkt, b: Punkt) => ({ x: a.x + ((b.x - a.x) * (y1 - a.y)) / (b.y - a.y), y: y1 }) },
  ];
  let output = coords.slice();
  for (const side of sides) {
    const input = output;
    output = [];
    if (!input.length) break;
    let S = input[input.length - 1];
    for (const E of input) {
      const Ein = side.drin(E);
      const Sin = side.drin(S);
      if (Ein) {
        if (!Sin) output.push(side.schnitt(S, E));
        output.push(E);
      } else if (Sin) {
        output.push(side.schnitt(S, E));
      }
      S = E;
    }
  }
  return output;
}
