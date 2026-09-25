"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { mischen, type Aenderung } from "@/components/aenderung";
import { EingabeFertigung, EingabeStrassen } from "@/components/eingabe-fertigung";
import { EingabeLayout, EingabePlatte } from "@/components/eingabe-produkt";
import { Komposer } from "@/components/komposer";
import { KundeGestaltung } from "@/components/kunde-gestaltung";
import { KundeStandort } from "@/components/kunde-standort";
import { KundeTexte } from "@/components/kunde-texte";
import { PrototypPlatten } from "@/components/prototyp-platten";
import { TechnikExport } from "@/components/technik-export";
import { TechnikPruefung } from "@/components/technik-pruefung";
import { TechnikReferenzorte } from "@/components/technik-referenzorte";
import { TechnikTeilung } from "@/components/technik-teilung";
import { TechnikVorlagen } from "@/components/technik-vorlagen";
import { useNaehte } from "@/components/use-naehte";
import { useSkizze } from "@/components/use-skizze";
import { standardSchichtkarte } from "@/engine/standard";
import type { Schichtkarte, SchichtkartenErgebnis } from "@/engine/typen";

/**
 * Vollbild in drei Spalten (Marcel 16.09.2026): links, was der Kunde spaeter
 * selbst einstellt; in der Mitte das grosse Arbeitsfeld; rechts die Technik
 * fuer den Prototypenbau.
 */
export default function Seite() {
  const [karte, setKarte] = useState<Schichtkarte>(standardSchichtkarte);
  const [ergebnis, setErgebnis] = useState<SchichtkartenErgebnis | null>(null);
  // Fuer welchen Kartenstand das volle Ergebnis gilt – aelter heisst: die Skizze ist aktueller.
  const [ergebnisStand, setErgebnisStand] = useState<string | null>(null);
  const [fehler, setFehler] = useState<string | null>(null);
  const [laedt, setLaedt] = useState(false);
  const [abgebrochen, setAbgebrochen] = useState(false);
  const laufNr = useRef(0);
  const lauf = useRef<AbortController | null>(null);

  const rendern = useCallback(async (k: Schichtkarte) => {
    // Eine neuere Eingabe ueberholt die laufende Rechnung: abbrechen, dann rechnet der Server nicht fuer niemanden weiter.
    lauf.current?.abort();
    const abbruch = new AbortController();
    lauf.current = abbruch;
    const nr = ++laufNr.current;
    setLaedt(true);
    setAbgebrochen(false);
    try {
      const res = await fetch("/api/vorschau", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(k),
        signal: abbruch.signal,
      });
      const daten = await res.json();
      // Eine ueberholte Antwort darf die aktuelle nicht ueberschreiben.
      if (nr !== laufNr.current) return;
      if (!res.ok) setFehler(daten.fehler ?? "Unbekannter Fehler");
      else {
        setErgebnis(daten as SchichtkartenErgebnis);
        setErgebnisStand(standVon(k));
        setFehler(null);
      }
    } catch (err) {
      if (abbruch.signal.aborted) return;
      if (nr === laufNr.current) setFehler(err instanceof Error ? err.message : String(err));
    } finally {
      if (nr === laufNr.current) setLaedt(false);
    }
  }, []);

  // Abbrechen laesst die Vorschau auf dem letzten Stand; "Neu berechnen" holt die Rechnung nach.
  const abbrechen = () => {
    lauf.current?.abort();
    laufNr.current++;
    setLaedt(false);
    setAbgebrochen(true);
  };

  // Sammelt schnelle Aenderungen (Regler, Tippen) zu einem Lauf. Die Nahtwahl aendert die Karte nicht – sie rechnet
  // nur die Naehte nach (useNaehte).
  const stand = standVon(karte);
  const aktuelleKarte = useRef(karte);
  aktuelleKarte.current = karte;
  // Die volle Rechnung erst, wenn eine Weile nichts geaendert wurde – bis dahin zeigt die Skizze den Stand.
  useEffect(() => {
    const t = setTimeout(() => void rendern(aktuelleKarte.current), 1200);
    return () => clearTimeout(t);
  }, [stand, rendern]);
  const naehte = useNaehte(karte, ergebnis);
  const skizze = useSkizze(karte, stand);
  const vollAktuell = ergebnisStand === stand;
  const skizzeAktuell = skizze?.stand === stand;
  const anzeige = vollAktuell ? naehte.anzeige : skizzeAktuell ? skizze.daten : (naehte.anzeige ?? skizze?.daten ?? null);

  const aendern = (teil: Aenderung) => setKarte((alt) => mischen(alt, teil));

  // Startwerte aus der URL – fuer Referenzbilder aus dem Headless-Browser:
  // ?entwurf={"lon":…,"lat":…,"aufbau":…,"kunde":{…}} (eine Aenderung wie aus dem
  // Formular) und kurz ?holzrahmen=schwarz. Ungueltiges JSON wird ignoriert.
  useEffect(() => {
    const url = new URLSearchParams(window.location.search);
    let teil: Aenderung = {};
    try {
      teil = JSON.parse(url.get("entwurf") ?? "{}") as Aenderung;
    } catch {
      teil = {};
    }
    const rahmen = url.get("holzrahmen");
    if (rahmen === "schwarz" || rahmen === "weiss" || rahmen === "eiche" || rahmen === "dunkelbraun") teil = { ...teil, kunde: { ...teil.kunde, holzrahmen: rahmen } };
    if (Object.keys(teil).length) setKarte((alt) => mischen(alt, teil));
  }, []);

  return (
    <main className="grid h-screen grid-cols-[330px_minmax(0,1fr)_380px] overflow-hidden">
      <aside className="space-y-3 overflow-y-auto border-r p-3" style={{ borderColor: "var(--linie)" }}>
        <header className="px-1 pt-1 pb-2">
          <h1 className="text-base font-semibold">Laser Studio · Schichtkarte</h1>
          <p className="text-xs" style={{ color: "var(--gedaempft)" }}>
            Was der Kunde spaeter selbst einstellt
          </p>
        </header>
        <KundeStandort karte={karte} aendern={aendern} />
        <KundeTexte karte={karte} aendern={aendern} />
        <KundeGestaltung karte={karte} aendern={aendern} />
      </aside>

      <section className="min-h-0 p-3">
        <Komposer
          anzeige={anzeige}
          nurSkizze={!vollAktuell && skizzeAktuell}
          ergebnis={naehte.anzeige}
          fehler={fehler}
          laedt={laedt}
          abgebrochen={abgebrochen}
          abbrechen={abbrechen}
          neuRechnen={() => void rendern(karte)}
          karte={karte}
          aendern={aendern}
        />
      </section>

      <aside className="space-y-3 overflow-y-auto border-l p-3" style={{ borderColor: "var(--linie)" }}>
        <p className="px-1 pt-1 text-xs font-medium" style={{ color: "var(--gedaempft)" }}>
          Technik und Prototypenbau
        </p>
        <TechnikPruefung ergebnis={naehte.anzeige} />
        <TechnikTeilung ergebnis={naehte.anzeige} karte={karte} aendern={aendern} rechnen={naehte.rechnen} laeuft={naehte.laeuft} fehler={naehte.fehler} />
        <TechnikExport karte={karte} />
        <PrototypPlatten karte={karte} />
        <TechnikReferenzorte karte={karte} aendern={aendern} />
        <TechnikVorlagen karte={karte} aendern={aendern} />
        <EingabePlatte karte={karte} aendern={aendern} />
        <EingabeLayout karte={karte} aendern={aendern} />
        <EingabeStrassen karte={karte} aendern={aendern} />
        <EingabeFertigung karte={karte} aendern={aendern} />
      </aside>
    </main>
  );
}

/** Kartenstand ohne Nahtwahl: sie aendert die Karte nicht, nur die Naehte (useNaehte). */
function standVon(k: Schichtkarte): string {
  const { teilungWahl: _wahl, ...rest } = k;
  return JSON.stringify(rest);
}
