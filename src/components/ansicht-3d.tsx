"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { SchichtkartenErgebnis } from "@/engine/typen";
import { Hinweis3D, Leiste3D, SEITEN, seitenZahl, type Seiten } from "./ansicht-3d-leiste";
import { aufnahmeParameter } from "./aufnahme-3d";
import { starteBuehne, type Buehne, type Einstellung } from "./buehne-3d";
import { ABSTAND_EXPLOSION_MM, ABSTAND_MAX_MM } from "./explosion-3d";
import { HINTERGRUND_TITEL, type Hintergrund } from "./hintergrund-3d";
import { STIMMUNG_TITEL, type Stimmung } from "./licht-3d";
import { MOTIV_TITEL, motivMoeglich, type Motiv } from "./motive-3d";

const AUSEINANDER_MM = 14;

/** Startwerte aus der URL – dieselben Parameter schreibt die Ansicht beim Einstellen zurueck. */
function ausUrl(url: URLSearchParams) {
  const f = url.get("foto");
  const wert = <T extends string>(schluessel: string, liste: Record<T, string>, standard: T) => ((url.get(schluessel) ?? "") in liste ? (url.get(schluessel) as T) : standard);
  const abstand = url.get("lagen") === "auseinander" || url.has("abstand") ? Number(url.get("abstand")) || AUSEINANDER_MM : 0;
  return {
    motiv: (f === "1" ? "wand" : f && f in MOTIV_TITEL ? f : "frei") as Motiv,
    seiten: ((SEITEN as readonly string[]).includes(url.get("seiten") ?? "") ? url.get("seiten") : "4:3") as Seiten,
    stimmung: wert<Stimmung>("licht", STIMMUNG_TITEL, "studio"),
    hintergrund: wert<Hintergrund>("hintergrund", HINTERGRUND_TITEL, "hell"),
    abstandMm: Math.min(ABSTAND_MAX_MM, abstand),
    beschriftung: url.get("beschriftung") === "1",
  };
}

/**
 * Drehbare 3D-Ansicht des Lagenstapels. Maus ziehen dreht (auch um die Y-Achse), Rad zoomt,
 * rechte Maustaste verschiebt. Der Regler zieht die Lagen auseinander, bis zur Explosionszeichnung
 * mit Hintergrund und Beschriftung als Infografik. Die Motive stellen Buehne und Kamera fuer
 * Referenzbilder ein (Leonardo-Skill): an der Wand, flach liegend und Nahaufnahmen.
 *
 * URL (auch fuer Headless-Aufnahmen, die Ansicht schreibt sie beim Einstellen mit): ?ansicht=3d&foto=explosion
 * &abstand=90&hintergrund=grau&beschriftung=1&licht=fenster&seiten=16:9&vollbild=1 (foto=1 ist die Wand).
 */
export function Ansicht3D({ ergebnis }: { ergebnis: SchichtkartenErgebnis }) {
  const box = useRef<HTMLDivElement>(null);
  const ebene = useRef<SVGSVGElement>(null);
  const [url] = useState(() => new URLSearchParams(window.location.search));
  const [start] = useState(() => ausUrl(url));
  const [motiv, setMotiv] = useState<Motiv>(start.motiv);
  const [seiten, setSeiten] = useState<Seiten>(start.seiten);
  const [stimmung, setStimmung] = useState<Stimmung>(start.stimmung);
  const [hintergrund, setHintergrund] = useState<Hintergrund>(start.hintergrund);
  const [abstand, setAbstand] = useState(start.abstandMm);
  const [beschriftung, setBeschriftung] = useState(start.beschriftung);
  const [baut, setBaut] = useState(true);
  const [zurueck, setZurueck] = useState(0);
  const vollbild = url.get("vollbild") === "1";
  const aufnahme = useMemo(() => aufnahmeParameter(url), [url]);
  const motive = useMemo(() => (Object.keys(MOTIV_TITEL) as Motiv[]).filter((m) => motivMoeglich(m, ergebnis)), [ergebnis]);
  const aktiv = motive.includes(motiv) ? motiv : "frei";
  const einstellung: Einstellung = { motiv: aktiv, stimmung, abstandMm: abstand, hintergrund, beschriftung };
  const aktuell = useRef(einstellung);
  aktuell.current = einstellung;
  const buehne = useRef<Buehne | null>(null);
  // Im Fotomotiv zeigt die Leinwand genau das Seitenverhaeltnis des Referenzbilds.
  const verhaeltnis = useRef<number | null>(null);
  verhaeltnis.current = aktiv === "frei" ? null : seitenZahl(seiten);

  useEffect(() => {
    if (!box.current || !ebene.current) return;
    setBaut(true);
    const b = starteBuehne(ergebnis, { box: box.current, ebene: ebene.current, aufnahme, verhaeltnis: () => verhaeltnis.current, gebaut: () => setBaut(false) }, aktuell.current);
    buehne.current = b;
    return () => {
      buehne.current = null;
      b.beenden();
    };
  }, [ergebnis, aufnahme]);

  // Motiv, Seitenverhaeltnis oder "zuruecksetzen" stellen die Kamera neu, in der Explosionszeichnung auch
  // die Beschriftung (sie braucht Rand); alles andere nicht.
  const kameraSchluessel = `${aktiv}|${seiten}|${zurueck}|${aktiv === "explosion" && beschriftung}`;
  const letzterSchluessel = useRef("");
  useEffect(() => {
    buehne.current?.setze(einstellung, kameraSchluessel !== letzterSchluessel.current);
    letzterSchluessel.current = kameraSchluessel;
  }, [kameraSchluessel, stimmung, abstand, hintergrund, beschriftung, baut]);

  // Einstellungen in die URL: Neu laden behaelt sie, und der Link taugt fuer Headless-Aufnahmen.
  useEffect(() => {
    if (vollbild) return;
    const neu = new URL(window.location.href);
    const setzen = (k: string, v: string | null) => (v === null ? neu.searchParams.delete(k) : neu.searchParams.set(k, v));
    setzen("foto", aktiv === "frei" ? null : aktiv);
    setzen("lagen", null);
    setzen("abstand", abstand > 0 ? String(abstand) : null);
    setzen("licht", stimmung === "studio" ? null : stimmung);
    setzen("seiten", seiten === "4:3" ? null : seiten);
    setzen("hintergrund", hintergrund === "hell" ? null : hintergrund);
    setzen("beschriftung", beschriftung ? "1" : null);
    window.history.replaceState(null, "", neu);
  }, [aktiv, abstand, stimmung, seiten, hintergrund, beschriftung, vollbild]);

  const setzeMotiv = (m: Motiv) => {
    // Eine Explosionszeichnung mit geschlossenem Stapel zeigt nichts.
    if (m === "explosion" && abstand < 10) setAbstand(ABSTAND_EXPLOSION_MM);
    setMotiv(m);
  };
  const speichern = () => {
    const png = buehne.current?.referenz();
    if (!png) return;
    const a = document.createElement("a");
    a.href = png;
    a.download = `schichtkarte-${aktiv}-${seiten.replace(":", "x")}.png`;
    a.click();
  };
  return (
    <div className={vollbild ? "fixed inset-0 z-50" : "relative h-full w-full overflow-hidden rounded-md"} style={vollbild ? { background: "#f3f0ea" } : undefined}>
      {/* Die Next-Entwickleranzeige gehoert nicht ins Referenzbild. */}
      {vollbild && <style>{"nextjs-portal{display:none!important}"}</style>}
      <div ref={box} className="absolute inset-0 flex items-center justify-center" data-ansicht="3d" data-motiv={aktiv} data-bereit={baut ? undefined : "1"} />
      <svg ref={ebene} className="pointer-events-none absolute" style={{ display: "none" }} />
      {!vollbild && (
        <Leiste3D abstand={abstand} setzeAbstand={setAbstand} motiv={aktiv} motive={motive} setzeMotiv={setzeMotiv}
          stimmung={stimmung} setzeStimmung={setStimmung} hintergrund={hintergrund} setzeHintergrund={setHintergrund}
          beschriftung={beschriftung} setzeBeschriftung={setBeschriftung}
          seiten={seiten} setzeSeiten={setSeiten} speichern={speichern} zuruecksetzen={() => setZurueck((z) => z + 1)} />
      )}
      {baut && <p className="absolute inset-0 flex items-center justify-center text-sm" style={{ color: "var(--gedaempft)" }}>baut 3D…</p>}
      {aktiv === "frei" && !vollbild && <Hinweis3D ergebnis={ergebnis} />}
    </div>
  );
}
