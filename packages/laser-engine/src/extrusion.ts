// @ts-expect-error libtess liefert keine TypeScript-Deklaration.
import libtess from 'libtess';
import type { Teil } from './typen';
import type { Punkt } from './clip';

/** GLU verarbeitet auch sich berührende Löcher und Konturen ohne künstliche Stege.
 * Die Konturen bleiben unverändert; Customizer und Laser-Studio teilen diese Extrusion. */
export function extrusionsDaten(teile: Teil[], breite: number, hoehe: number, tiefe: number) {
  const deckel: number[] = [], kanten: number[] = [];
  const punkt = (p: Punkt): Punkt => ({ x: p.x - breite / 2, y: hoehe / 2 - p.y });
  const t = new libtess.GluTesselator();
  const gl = libtess.gluEnum;
  let dreieck: Punkt[] = [];
  t.gluTessNormal(0, 0, 1);
  t.gluTessProperty(gl.GLU_TESS_WINDING_RULE, libtess.windingRule.GLU_TESS_WINDING_ODD);
  t.gluTessCallback(gl.GLU_TESS_EDGE_FLAG, () => {}); // Nur Dreiecke, keine Fächer/Streifen.
  t.gluTessCallback(gl.GLU_TESS_COMBINE, (c: number[]) => ({ x: c[0], y: c[1] }));
  t.gluTessCallback(gl.GLU_TESS_ERROR, (n: number) => { throw new Error(`Schnittfläche nicht triangulierbar (${n})`); });
  t.gluTessCallback(gl.GLU_TESS_VERTEX, (p: Punkt) => {
    dreieck.push(p);
    if (dreieck.length !== 3) return;
    let [a,b,c] = dreieck;
    if ((b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x)<0) [b,c]=[c,b];
    deckel.push(a.x,a.y,tiefe,b.x,b.y,tiefe,c.x,c.y,tiefe,a.x,a.y,0,c.x,c.y,0,b.x,b.y,0);
    dreieck = [];
  });
  for (const teil of teile) {
    t.gluTessBeginPolygon(null);
    for (const [i, ring] of [teil.aussen, ...teil.loecher].entries()) {
      const r = ring.map(punkt);
      t.gluTessBeginContour();
      for (const p of r) t.gluTessVertex([p.x,p.y,0],p);
      t.gluTessEndContour();
      const fl = r.reduce((s,p,j)=>s+p.x*r[(j+1)%r.length].y-r[(j+1)%r.length].x*p.y,0);
      if ((fl > 0) !== (i === 0)) r.reverse();
      for (let j=0;j<r.length;j++) {
        const a=r[j],b=r[(j+1)%r.length];
        if (a.x===b.x && a.y===b.y) continue;
        kanten.push(a.x,a.y,0,b.x,b.y,0,b.x,b.y,tiefe,a.x,a.y,0,b.x,b.y,tiefe,a.x,a.y,tiefe);
      }
    }
    t.gluTessEndPolygon();
  }
  t.gluDeleteTess();
  return { deckel, kanten };
}
