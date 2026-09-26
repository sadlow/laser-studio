"use client";

import { GRAVUR_ART_TITEL, type GravurArt } from "@/engine/typen-fertigung";
import type { Schichtkarte } from "@/engine/typen";
import { Auswahl, Zahl } from "./felder";
import type { Aenderung } from "./aenderung";

interface Props {
  karte: Schichtkarte;
  aendern: (teil: Aenderung) => void;
}

/** Gravur in der Laserdatei – Flaeche rastert, Linien fahren den Weg nur ab (typen-fertigung.ts). */
export function GravurWahl({ karte, aendern }: Props) {
  const g = karte.gravurExport;
  return (
    <div className="space-y-2">
      <Auswahl<GravurArt>
        titel="Gravur in der Laserdatei"
        wert={g.art}
        optionen={(Object.keys(GRAVUR_ART_TITEL) as GravurArt[]).map((art) => ({ wert: art, titel: GRAVUR_ART_TITEL[art] }))}
        aendern={(art) => aendern({ gravurExport: { ...g, art } })}
      />
      {g.art !== "flaeche" && (
        <div className="grid grid-cols-2 gap-3">
          <Zahl titel="Linienbreite mit Defokus" einheit="mm" schritt={0.01} min={0.02} wert={g.strahlMm}
            aendern={(v) => aendern({ gravurExport: { ...g, strahlMm: v } })} />
          <Zahl titel="Parallele Linien mindestens" einheit="mm" schritt={0.05} min={0} wert={g.minAbstandMm ?? 0}
            aendern={(v) => aendern({ gravurExport: { ...g, minAbstandMm: v } })} />
        </div>
      )}
      <p className="text-xs" style={{ color: "var(--gedaempft)" }}>
        {g.art === "flaeche" && "Gefuellte Flaechen in Sollbreite – die Lasersoftware rastert sie Zeile fuer Zeile."}
        {g.art === "mittellinie" &&
          "Jeder Weg einmal als durchgehende Linie, ohne doppelte Stuecke. Die Breite macht der Strahl (Gravurprobe: Defokus 6 mm). Wege, die an einer Kreuzung enden, halten um die halbe Linienbreite davor an. Laeuft ein Weg naeher als der Mindestabstand neben einem wichtigeren her (bis 35 Grad), faellt das Stueck weg – der Strahl braennte beide als eine Rille; Kreuzungen bleiben. 0 = alle Linien."}
        {g.art === "kontur" &&
          "Eng anliegende Ringe um jeden Weg, um den halben Strahl nach innen; breite Wege bekommen so viele Durchgaenge, bis die Sollbreite gedeckt ist. Wege schmaler als der Strahl bleiben Mittellinie. Parallele Linien unter dem Mindestabstand fallen wie bei der Mittellinie weg."}
      </p>
    </div>
  );
}
