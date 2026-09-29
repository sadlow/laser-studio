import ClipperLib from "clipper-lib";

/**
 * clipper-lib haelt lokale Minima und Scanlinien in sortierten verketteten Listen und fuegt jedes Element einzeln ein,
 * mit einem Lauf vom Anfang. Bei grossen Karten wird das quadratisch: 60 x 60 Berlin 9 km verbrachte 14 von 29 s CPU in
 * InsertLocalMinima und Reset (Profil 25.09.2026). Hier dieselben Listen, dieselbe Reihenfolge – nur schneller gebaut:
 *
 *   Minima   werden gesammelt und vor Reset einmal sortiert (absteigend nach Y; gleiches Y: spaeter eingefuegt zuerst,
 *            genau wie das Einfuegen der Bibliothek).
 *   Scanlinien bekommen einen Zeiger aufs Listenende: Reset fuegt sie absteigend ein, also immer hinten an.
 *
 * Das Ergebnis ist Punkt fuer Punkt dasselbe (Vergleich der Laserdateien an den Referenzorten). Abschaltbar mit
 * CLIPPER_LANGSAM=1 fuer genau diesen Vergleich.
 */
interface Minimum {
  Y: number;
  Next: Minimum | null;
}
interface Scanlinie {
  Y: number;
  Next: Scanlinie | null;
}
interface Basis {
  m_MinimaList: Minimum | null;
  m_Scanbeam: Scanlinie | null;
  _minimaNeu?: Minimum[];
  _scanEnde?: Scanlinie | null;
}

type Proto = Record<string, (this: Basis, ...a: unknown[]) => unknown>;
// Die Typen der Bibliothek kennen ClipperBase und Scanbeam nicht.
const Lib = ClipperLib as unknown as { ClipperBase: { prototype: unknown }; Clipper: { prototype: unknown }; Scanbeam: new () => Scanlinie };
const aus = typeof process !== "undefined" && process.env?.CLIPPER_LANGSAM === "1";

// Die Bibliothek kopiert beim Laden die Methoden der Basis in Clipper (Inherit) – beide Prototypen brauchen es.
for (const proto of [Lib.ClipperBase.prototype, Lib.Clipper.prototype] as Proto[]) {
  if (aus || proto._schnell) continue;
  proto._schnell = () => true;

  proto.InsertLocalMinima = function (neu: unknown) {
    (this._minimaNeu ??= []).push(neu as Minimum);
  };

  const verknuepfe = (b: Basis) => {
    const neu = b._minimaNeu;
    if (!neu?.length) return;
    b._minimaNeu = [];
    const alle: Minimum[] = [];
    // Spaeter eingefuegt steht bei gleichem Y vorn: neue vor die schon verketteten, die neuen rueckwaerts.
    for (let i = neu.length - 1; i >= 0; i--) alle.push(neu[i]);
    for (let m = b.m_MinimaList; m; m = m.Next) alle.push(m);
    alle.sort((a, c) => c.Y - a.Y);
    for (let i = 0; i < alle.length; i++) alle[i].Next = alle[i + 1] ?? null;
    b.m_MinimaList = alle[0] ?? null;
  };

  const reset = proto.Reset;
  proto.Reset = function (...a: unknown[]) {
    verknuepfe(this);
    return reset.apply(this, a);
  };

  const leeren = proto.DisposeLocalMinimaList;
  proto.DisposeLocalMinimaList = function (...a: unknown[]) {
    this._minimaNeu = [];
    return leeren.apply(this, a);
  };

  proto.InsertScanbeam = function (y: unknown) {
    const Y = y as number;
    const kopf = this.m_Scanbeam;
    const neu = (): Scanlinie => {
      const s = new Lib.Scanbeam();
      s.Y = Y;
      s.Next = null;
      return s;
    };
    if (kopf === null) {
      this.m_Scanbeam = this._scanEnde = neu();
      return;
    }
    if (Y > kopf.Y) {
      const s = neu();
      s.Next = kopf;
      this.m_Scanbeam = s;
      return;
    }
    // Schneller Weg: kleiner als das Ende -> hinten an; gleich dem Ende -> schon da.
    const ende = this._scanEnde;
    if (ende && ende.Next === null && Y <= ende.Y && Y <= kopf.Y) {
      if (Y === ende.Y) return;
      const s = neu();
      ende.Next = s;
      this._scanEnde = s;
      return;
    }
    // Wie die Bibliothek: sortiert absteigend, Doppelte ignoriert.
    let sb = kopf;
    while (sb.Next !== null && Y <= sb.Next.Y) sb = sb.Next;
    if (Y === sb.Y) return;
    const s = neu();
    s.Next = sb.Next;
    sb.Next = s;
    if (s.Next === null) this._scanEnde = s;
  };
}
