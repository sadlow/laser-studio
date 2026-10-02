import type { Punkt } from "./clip";
import { clipPolyline } from "./clip";
import { breitenbezug, laengenImFenster, waehleNetz } from "./dichte";
import { stuetzeNetz } from "./querverbindung";
import { schluessel } from "./netz-ketten";
import { flaecheMm2, rechteck, ringeInMm, schneide, vereinige, zuFlaeche, type Flaeche } from "./geometrie";
import { setzeEingebettet } from "./ecken";
import { ladeKartenRohdaten } from "./kacheln";
import { setzeKante } from "./kante";
import { berechneLayout } from "./layout";
import { anschluesseAnRahmen } from "./randanschluss";
import { FARBE_FROST, GRAVUR_AUF_SCHWARZ, GRAVUR_AUF_WEISS } from "./stapel";
import { FARBE_SCHWARZ, FARBE_WEISS } from "./svg";
import { MARKER_LAGE, markerFarbe, platziereMarker } from "./marker";
import { setzePosterText } from "./textblock";
import { REFERENZ_KARTENBREITE_MM, type Schichtkarte, type Skizze } from "./typen";
import { vervollstaendige } from "./vervollstaendige";
import { wasserImFenster } from "./wasser";
import type { KachelQuelle } from "./quelle";
import { mapboxTokenQuelle } from "./quelle-mapbox";

// Wie netz.ts: herabgestufte Netzklassen werden in dieser Breite graviert.
const GRAVUR_HERABGESTUFT_MM = 0.45;

/**
 * Live-Vorschau fuer das Justieren (Marcel 25.09.2026: "der Kunde darf in der Liveansicht nicht auf Aktualisierungen
 * warten"). Dieselben Kacheln, dieselbe Strassenauswahl, dieselben Breiten und Texte wie die Produktion – aber die
 * Strassen als Striche statt verschmolzener Flaechen, keine Stege und Spalte. Wasser und lose Stuecke wie in der
 * Produktion (Marcel 27.09.2026: der Kunde soll in der Vorschau das echte Schnittergebnis sehen).
 * Sieht aus wie das Produkt und kostet einen Bruchteil; geschnitten wird nie danach, sondern nach rendereSchichtkarte.
 */
export async function skizziereSchichtkarte(eingabe: Schichtkarte, quelleOderToken: KachelQuelle | string, signal?: AbortSignal): Promise<Skizze> {
  const start = Date.now();
  const k = vervollstaendige(eingabe);
  const layout = berechneLayout(k);
  const { platte: p, kartenfenster: f } = layout;
  const faktor = f.breiteMm / REFERENZ_KARTENBREITE_MM;
  const breiteste = Math.max(k.netzMinBreiteMm, ...k.strassen.filter((s) => s.ziel === "netz").map((s) => s.breiteMm * faktor));
  const kartenMitte = k.kartenMitte ?? { lon: k.lon, lat: k.lat };
  const quelle = typeof quelleOderToken === "string" ? mapboxTokenQuelle(quelleOderToken) : quelleOderToken;
  const roh = await ladeKartenRohdaten({
    lon: kartenMitte.lon, lat: kartenMitte.lat, ausschnittBreiteM: k.ausschnittKm * 1000, fenster: f, zugabeMm: breiteste + 1, signal,
    quelle,
  });

  const fensterFl = rechteck(f.xMm, f.yMm, f.breiteMm, f.hoeheMm);
  const text = k.layoutArt === "eingebettet" ? setzeEingebettet(k, layout) : k.layoutArt === "kante" ? setzeKante(k, layout) : setzePosterText(k, layout);
  // Wasser wie in der Produktion gefiltert (wasser.ts: schmaler als 1 mm und kleine Flaechen nicht geschnitten) – sonst
  // zeigte die Skizze einen durchgehenden Kanal, den die volle Rechnung Sekunden spaeter unterbrach (Marcel 27.09.2026).
  const w = wasserImFenster(k, roh, fensterFl, vereinige(text.schutz, text.traeger ?? []));
  const wasser = w.geschnitten;
  const land = f.breiteMm * f.hoeheMm - flaecheMm2(w.gesamt);
  const auswahl = waehleNetz(k, laengenImFenster(k, roh, f), land, breitenbezug(k, f));

  // Stuetzung wie im Netz (querverbindung.ts); was ohne Halt bleibt, zeigt die Skizze graviert wie die volle Rechnung.
  const stuetzen = stuetzeNetz(k, roh, f, auswahl, vereinige(text.schutz, text.traeger ?? []));
  const loseSchluessel = new Set(stuetzen.lose.flatMap((l) => l.map(schluessel)));
  const istLose = (l: Punkt[]) => loseSchluessel.size > 0 && l.filter((p) => loseSchluessel.has(schluessel(p))).length * 2 > l.length;

  // Strassen: geschnittene als breite Striche (mit Anschluss an den Rahmen), gravierte als feine Linien.
  const alleNetz = k.strassen.filter((g) => auswahl.breiten.has(g.id)).flatMap((g) => g.klassen.flatMap((kl) => roh.strassen.get(kl) ?? []));
  const netz: string[] = [];
  const gravur: string[] = [];
  const strahl = k.gravurExport.art === "mittellinie" ? k.gravurExport.strahlMm : null;
  for (const g of k.strassen) {
    if (g.ziel === "aus") continue;
    const linien = g.klassen.flatMap((kl) => roh.strassen.get(kl) ?? []);
    if (!linien.length) continue;
    const breite = auswahl.breiten.get(g.id);
    const lose = breite !== undefined ? linien.filter(istLose) : [];
    if (lose.length) gravur.push(striche(lose, strahl ?? Math.max(0.15, GRAVUR_HERABGESTUFT_MM * auswahl.breitenfaktor)));
    if (breite !== undefined) {
      const fest = lose.length ? linien.filter((l) => !istLose(l)) : linien;
      netz.push(striche([...fest, ...anschluesseAnRahmen(fest, alleNetz, f, breite)], breite));
    } else {
      const soll = g.ziel === "netz" ? GRAVUR_HERABGESTUFT_MM * auswahl.breitenfaktor : g.breiteMm * auswahl.breitenfaktor;
      gravur.push(striche(linien.flatMap((l) => clipPolyline(l, f.xMm, f.yMm, f.xMm + f.breiteMm, f.yMm + f.hoeheMm)), strahl ?? Math.max(0.15, soll)));
    }
  }

  for (const q of [...stuetzen.zusatz, ...stuetzen.anbindungen, ...stuetzen.querverbindungen, ...stuetzen.verstaerkt]) netz.push(striche([q.linie], q.breiteMm));

  // Farben wie stapel.ts: weisses Netz auf Schwarz, schwarzes Netz auf Weiss, schwarzes Netz unter weisser Deckschicht.
  const deck = k.aufbau === "netz-schwarz";
  const netzWeiss = k.aufbau === "netz-weiss";
  const grund = netzWeiss ? (k.grundSchwarzFrost ? FARBE_FROST : FARBE_SCHWARZ) : FARBE_WEISS;
  const netzFarbe = netzWeiss ? FARBE_WEISS : FARBE_SCHWARZ;
  const obenFarbe = deck ? FARBE_WEISS : netzFarbe;
  const rahmen = `M0,0H${z(p.breiteMm)}V${z(p.hoeheMm)}H0Z` + ringD([[f.xMm, f.yMm], [f.xMm, f.yMm + f.hoeheMm], [f.xMm + f.breiteMm, f.yMm + f.hoeheMm], [f.xMm + f.breiteMm, f.yMm]].map(([x, y]) => ({ x, y })));
  const ausschnitt = text.zeilen.map((zl) => flD(zl.schnitt)).join("");

  const marker = platziereMarker(k, kartenMitte, f, faktor);
  const markerPfade = marker.platziert
    .map((m, i) => `<path id="${i === 0 ? "symbol" : `symbol-${m.index}`}" d="${m.ringe.map((r) => ringD(r)).join("")}" fill="${MARKER_LAGE[markerFarbe(m.marker)].fuellung}" fill-rule="evenodd"/>`)
    .join("");

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" version="1.1" width="${z(p.breiteMm)}mm" height="${z(p.hoeheMm)}mm" viewBox="0 0 ${z(p.breiteMm)} ${z(p.hoeheMm)}">` +
    `<title>Schichtkarte – Skizze</title><defs>` +
    `<linearGradient id="blau" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#1b4b82"/><stop offset=".45" stop-color="#7fb4e3"/>` +
    `<stop offset=".55" stop-color="#5d97cf"/><stop offset="1" stop-color="#173f70"/></linearGradient>` +
    `<linearGradient id="rot" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#7d0c12"/><stop offset=".45" stop-color="#f0525a"/><stop offset="1" stop-color="#8f1016"/></linearGradient>` +
    `<linearGradient id="gold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#7a5a17"/><stop offset=".45" stop-color="#f3d88a"/><stop offset="1" stop-color="#8a6a1f"/></linearGradient>` +
    `<linearGradient id="silber" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#6d7175"/><stop offset=".45" stop-color="#f2f4f6"/><stop offset="1" stop-color="#7b7f84"/></linearGradient>` +
    `<clipPath id="fenster"><rect x="${z(f.xMm)}" y="${z(f.yMm)}" width="${z(f.breiteMm)}" height="${z(f.hoeheMm)}"/></clipPath></defs>` +
    `<rect width="${z(p.breiteMm)}" height="${z(p.hoeheMm)}" fill="${grund}"/>` +
    `<path d="${flD(wasser)}" fill="url(#blau)" fill-rule="nonzero"/>` +
    `<g fill="none" stroke="${netzWeiss ? GRAVUR_AUF_SCHWARZ : GRAVUR_AUF_WEISS}" stroke-linecap="round" stroke-linejoin="round">${gravur.join("")}</g>` +
    `<g clip-path="url(#fenster)" fill="none" stroke="${netzFarbe}" stroke-linecap="round" stroke-linejoin="round">${netz.join("")}</g>` +
    (text.freiraum?.length ? `<path d="${flD(text.freiraum)}" fill="${grund}"/>` : "") +
    (text.traeger?.length ? `<path d="${flD(text.traeger)}" fill="${FARBE_SCHWARZ}"/>` : "") +
    `<path d="${rahmen}" fill="${obenFarbe}" fill-rule="evenodd"/>` +
    `<path d="${flD(text.schutz)}" fill="${obenFarbe}"/>` +
    // Durch die ausgeschnittene Schrift sieht man, was darunter liegt: mit Deckschicht das schwarze Netz, sonst den Grund.
    `<path d="${ausschnitt}" fill="${deck ? FARBE_SCHWARZ : grund}"/>` +
    markerPfade +
    `</svg>`;

  return {
    vorschauSvg: svg,
    layout,
    kartenMitte,
    symbol: marker.platziert[0]?.lage ?? null,
    symbole: marker.platziert.map((m) => m.lage),
    ausschnittMeter: roh.ausschnittMeter,
    rahmen: (k.kunde.holzrahmen ?? "ohne") === "ohne" ? null : { farbe: k.kunde.holzrahmen as Exclude<typeof k.kunde.holzrahmen, "ohne">, ...k.holzrahmenProfil },
    rechenzeitMs: Date.now() - start,
    kartenQuelle: quelle.name,
  };
}

function striche(linien: Punkt[][], breite: number): string {
  const d = linien.filter((l) => l.length >= 2).map((l) => `M${l.map((q) => `${z(q.x)},${z(q.y)}`).join("L")}`).join("");
  return d ? `<path d="${d}" stroke-width="${z(breite)}"/>` : "";
}

function ringD(r: Punkt[]): string {
  return r.length >= 3 ? `M${r.map((q) => `${z(q.x)},${z(q.y)}`).join("L")}Z` : "";
}

function flD(fl: Flaeche): string {
  return ringeInMm(fl).map(ringD).join("");
}

const z = (n: number) => (Math.round(n * 100) / 100).toString();
