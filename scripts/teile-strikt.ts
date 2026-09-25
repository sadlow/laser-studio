// Misst, ob teile() ohne StrictlySimple Loecher dem falschen Teil zuordnet (Befund 25.09.2026): jeder teile()-Aufruf
// der Engine wird mitgeschnitten und seine Eingabe locker und strikt zerlegt. Danach dieselbe Karte ganz locker und
// ganz strikt gerechnet, um Teilezahlen, lose Stuecke und Rechenzeit zu vergleichen.
// Aufruf: npx tsx scripts/teile-strikt.ts [orte,kommagetrennt|alle] [vorlagen,kommagetrennt|alle] [ausgabe.json] [nur-locker]
// nur-locker: ohne strikte Laeufe – 60 x 60 strikt braucht je Ort ueber 30 min (Allgaeu, 25.09.2026).
import fs from "node:fs";
import ClipperLib from "clipper-lib";
import { rendereSchichtkarte, standardSchichtkarte, type Schichtkarte, type SchichtkartenErgebnis } from "../src/engine";
import { flaecheMm2, type Flaeche } from "../src/engine/geometrie";
import { REFERENZORTE } from "../src/referenzorte";
import { ladeVorlage, listeVorlagen } from "../src/server/vorlagen";

const S2 = 1000 * 1000;
const MIN = 0.05;
const NUR_LOCKER = process.argv[5] === "nur-locker";
const LEER: Zerlegung = { teile: 0, loecher: 0, summe: 0, negativ: 0, fremd: 0, ms: 0 };

interface Zerlegung { teile: number; loecher: number; summe: number; negativ: number; fremd: number; ms: number }
interface Aufruf { ort: string; eingabe: number; locker: Zerlegung; strikt: Zerlegung }

// Zerlegt wie teile(): Aussenkontur minus direkte Loecher; negativ = Teil mit mehr Loch als Flaeche, fremd = Loch,
// das nicht in seiner Aussenkontur liegt. Beides heisst: Loch dem falschen Teil zugeordnet.
function zerlege(pfade: Flaeche, strikt: boolean): Zerlegung {
  const t0 = performance.now();
  const c = new ClipperLib.Clipper();
  c.StrictlySimple = strikt;
  c.AddPaths(pfade, ClipperLib.PolyType.ptSubject, true);
  const baum = new ClipperLib.PolyTree();
  original.call(c, ClipperLib.ClipType.ctUnion, baum, ClipperLib.PolyFillType.pftNonZero, ClipperLib.PolyFillType.pftNonZero);
  const ms = performance.now() - t0;
  const z: Zerlegung = { teile: 0, loecher: 0, summe: 0, negativ: 0, fremd: 0, ms };
  const geh = (k: ClipperLib.PolyNode) => {
    for (const kind of k.Childs()) {
      if (!kind.IsHole()) {
        const loecher = kind.Childs();
        const a = (Math.abs(ClipperLib.Clipper.Area(kind.Contour())) - loecher.reduce((s, l) => s + Math.abs(ClipperLib.Clipper.Area(l.Contour())), 0)) / S2;
        if (a < 0) z.negativ++;
        // Entartete Splitter (3 Punkte, 0 mm², Allgaeu 60 x 60) liegen durch Rundung halb draussen – kein Befund.
        for (const l of loecher) if (Math.abs(ClipperLib.Clipper.Area(l.Contour())) / S2 >= 0.001 && !liegtIn(l.Contour(), kind.Contour())) z.fremd++;
        if (a >= MIN) { z.teile++; z.loecher += loecher.length; z.summe += a; }
      }
      geh(kind);
    }
  };
  geh(baum);
  return z;
}

// Erster Eckpunkt des Lochs, der nicht auf der Aussenkante liegt (Beruehrpunkte liefern -1), entscheidet.
function liegtIn(loch: ClipperLib.Path, aussen: ClipperLib.Path): boolean {
  for (const p of loch) {
    const r = ClipperLib.Clipper.PointInPolygon(p, aussen);
    if (r !== -1) return r === 1;
  }
  return true;
}

// Haken in Clipper: nur Aufrufe aus teile(); `erzwungen` setzt StrictlySimple fuer die ganze Karte.
const proto = ClipperLib.Clipper.prototype as unknown as Record<string, (...a: unknown[]) => unknown> & { __pfade?: Flaeche };
const original = proto.Execute;
const addPaths = proto.AddPaths;
let erzwungen: boolean | null = null;
let mitschneiden = false;
let aufrufe: Aufruf[] = [];
proto.AddPaths = function (this: typeof proto, ...a: unknown[]) {
  (this.__pfade ??= []).push(...(a[0] as Flaeche));
  return addPaths.apply(this, a);
};
proto.Execute = function (this: typeof proto & { StrictlySimple: boolean }, ...a: unknown[]) {
  if (!(a[1] instanceof ClipperLib.PolyTree)) return original.apply(this, a);
  const stapel = new Error().stack!.split("\n");
  const i = stapel.findIndex((z) => /at teile \(/.test(z));
  if (i < 0) return original.apply(this, a);
  if (mitschneiden) {
    const ort = (stapel[i + 1].match(/\/src\/engine\/([^:]+:\d+)/) ?? stapel[i + 1].match(/at (\S+)/))?.[1] ?? "?";
    const pfade = this.__pfade ?? [];
    aufrufe.push({ ort, eingabe: flaecheMm2(pfade), locker: zerlege(pfade, false), strikt: NUR_LOCKER ? LEER : zerlege(pfade, true) });
  }
  if (erzwungen !== null) this.StrictlySimple = erzwungen;
  return original.apply(this, a);
};

function lagenBild(r: SchichtkartenErgebnis) {
  return Object.fromEntries(r.lagen.map((l) => [l.key, `${l.teile.length}/${l.teile.reduce((s, t) => s + t.loecher.length, 0)}`]));
}
function kennzahlen(r: SchichtkartenErgebnis) {
  const k = r.kennzahlen;
  return { lose: k.loseNetzstuecke, zurGravur: k.loseZurGravur, text: k.loseTextteile, hg: k.hintergrundTeile, zu: k.netzLoecherZugefuellt, inseln: k.wasserInselnGeflutet };
}

async function main() {
  const orte = process.argv[2] && process.argv[2] !== "alle" ? process.argv[2].split(",") : REFERENZORTE.map((o) => o.id);
  const vorlagen = process.argv[3] && process.argv[3] !== "alle" ? process.argv[3].split(",") : listeVorlagen().map((v) => v.id);
  const ausgabe = process.argv[4];
  const token = fs.readFileSync(".env.local", "utf8").match(/MAPBOX_ACCESS_TOKEN=(.*)/)?.[1]?.trim() ?? "";
  const faelle: unknown[] = [];
  for (const vid of vorlagen) {
    const v = ladeVorlage(vid)!;
    for (const oid of orte) {
      const o = REFERENZORTE.find((x) => x.id === oid)!;
      const basis = standardSchichtkarte();
      const k: Schichtkarte = { ...basis, ...v.karte, lon: o.lon, lat: o.lat,
        kunde: { ...basis.kunde, adresse: o.name, ortText: o.ortText, holzrahmen: v.karte.format === "quadrat60" ? "schwarz" : basis.kunde.holzrahmen } };
      // Mitschnitt zuerst: laedt nebenbei die Kacheln, die Zeitlaeufe danach rechnen ohne Netzwerk und ohne Haken-Last.
      aufrufe = []; mitschneiden = true; erzwungen = false;
      await rendereSchichtkarte(k, token);
      mitschneiden = false;
      let t0 = Date.now(); const locker = await rendereSchichtkarte(k, token); const msLocker = Date.now() - t0;
      erzwungen = true;
      t0 = Date.now(); const strikt = NUR_LOCKER ? locker : await rendereSchichtkarte(k, token); const msStrikt = NUR_LOCKER ? 0 : Date.now() - t0;
      erzwungen = null;

      // 5 mm²: so viel verlieren grosse Karten an Splittern unter MIN (Tokio 60 x 60: 1,6 mm²).
      const falsch = (z: Zerlegung, e: number) => Math.abs(z.summe - e) > 5 || z.negativ > 0 || z.fremd > 0;
      const abw = aufrufe.filter((x) => falsch(x.locker, x.eingabe));
      const anders = aufrufe.filter((x) => x.locker.teile !== x.strikt.teile || x.locker.loecher !== x.strikt.loecher);
      const tLocker = aufrufe.reduce((s, x) => s + x.locker.ms, 0), tStrikt = aufrufe.reduce((s, x) => s + x.strikt.ms, 0);
      const fall = {
        vorlage: vid, ort: oid, aufrufe: aufrufe.length, msLocker, msStrikt,
        teileMsLocker: Math.round(tLocker), teileMsStrikt: Math.round(tStrikt),
        lagenLocker: lagenBild(locker), lagenStrikt: lagenBild(strikt),
        kennLocker: kennzahlen(locker), kennStrikt: kennzahlen(strikt),
        abweichungLocker: abw.map((x) => ({ ort: x.ort, eingabe: +x.eingabe.toFixed(1), locker: +x.locker.summe.toFixed(1), strikt: +x.strikt.summe.toFixed(1), negativ: x.locker.negativ, fremd: x.locker.fremd })),
        abweichungStrikt: NUR_LOCKER ? [] : aufrufe.filter((x) => falsch(x.strikt, x.eingabe)).map((x) => ({ ort: x.ort, eingabe: +x.eingabe.toFixed(1), strikt: +x.strikt.summe.toFixed(1), negativ: x.strikt.negativ, fremd: x.strikt.fremd })),
        andereZerlegung: anders.map((x) => `${x.ort} ${x.locker.teile}/${x.locker.loecher} -> ${x.strikt.teile}/${x.strikt.loecher}`),
      };
      faelle.push(fall);
      console.log(JSON.stringify(fall));
    }
  }
  if (ausgabe) fs.writeFileSync(ausgabe, JSON.stringify(faelle, null, 2));
}

main().catch((e) => { console.error(e); process.exit(1); });
