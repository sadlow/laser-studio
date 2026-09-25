/**
 * Woher die Kartendaten kommen (Marcel 25.09.2026): zuerst das eigene Kartenarchiv – derselbe OSM-Planet als
 * PMTiles-Datei, den der Baseline Customizer liest (Protomaps, Zoom 15) –, Mapbox nur noch als Rueckfall.
 *
 * `KARTE_ARCHIV` ist eine https-Adresse der PMTiles-Datei; gelesen werden nur Byte-Bereiche, je Kachel wenige
 * Kilobyte. Lokal genuegt der oeffentliche Tagesbau (https://build.protomaps.com/JJJJMMTT.pmtiles), im Betrieb die
 * Datei im Studio-Bucket. Ist die Variable leer oder das Archiv nicht erreichbar, rechnet die Karte mit Mapbox und
 * sagt es in den Hinweisen.
 */
import { gunzipSync } from "node:zlib";
import { Compression, PMTiles, SharedPromiseCache, type RangeResponse, type Source } from "pmtiles";
import { ARCHIV_ZOOM, mapboxTokenQuelle, protomapsQuelle, type KachelQuelle } from "@/engine";

export type QuellenWahl = "archiv" | "mapbox";

// Hoechstens so viele Bereichsabrufe gleichzeitig: ein weit herausgezoomter Ausschnitt braucht tausend Kacheln (60 x 60
// bei 30 km rund 1 600), auf einen Schlag lief der Server in den Verbindungs-Timeout (25.09.2026).
const MAX_PARALLEL = 32;
let laufend = 0;
const warteschlange: (() => void)[] = [];
async function platz<T>(arbeit: () => Promise<T>): Promise<T> {
  if (laufend >= MAX_PARALLEL) await new Promise<void>((weiter) => warteschlange.push(weiter));
  laufend++;
  try {
    return await arbeit();
  } finally {
    laufend--;
    warteschlange.shift()?.();
  }
}

class NetzQuelle implements Source {
  constructor(private url: string) {}
  getKey() {
    return this.url;
  }
  getBytes(offset: number, length: number, signal?: AbortSignal): Promise<RangeResponse> {
    return platz(() => this.hole(offset, length, signal));
  }
  private async hole(offset: number, length: number, signal?: AbortSignal): Promise<RangeResponse> {
    const antwort = await fetch(this.url, { headers: { Range: `bytes=${offset}-${offset + length - 1}` }, signal });
    if (antwort.status !== 206) throw new Error(`Kartenarchiv antwortete mit HTTP ${antwort.status}`);
    return { data: await antwort.arrayBuffer() };
  }
}

// gunzipSync statt des Browser-Entpackers – und an beiden Stellen: der Customizer riss sonst beim Verzeichnis ab
// (pmtiles.server.ts dort, 24.09.2026).
async function packeAus(puffer: ArrayBuffer, art?: Compression): Promise<ArrayBuffer> {
  if (art === Compression.None || art === undefined) return puffer;
  if (art === Compression.Gzip) {
    const aus = gunzipSync(Buffer.from(puffer));
    return aus.buffer.slice(aus.byteOffset, aus.byteOffset + aus.byteLength) as ArrayBuffer;
  }
  throw new Error(`Kartenarchiv nutzt eine unbekannte Packung (${art}).`);
}

// Am globalen Objekt: der Entwicklungsserver laedt Module neu, das geoeffnete Archiv (Verzeichnisse) soll bleiben.
const ablage = globalThis as typeof globalThis & {
  __kartenArchiv?: { adresse: string; archiv: PMTiles; kacheln: Map<string, Promise<Uint8Array>> };
};
const MAX_KACHELN = 1500;

export function archivAdresse(): string | null {
  return process.env.KARTE_ARCHIV?.trim() || null;
}

function archiv(adresse: string) {
  if (ablage.__kartenArchiv?.adresse !== adresse) {
    ablage.__kartenArchiv = {
      adresse,
      archiv: new PMTiles(new NetzQuelle(adresse), new SharedPromiseCache(100, true, packeAus), packeAus),
      kacheln: new Map(),
    };
  }
  return ablage.__kartenArchiv;
}

/**
 * Kachelstufe nach Ausschnitt (Marcel 25.09.2026, 60 x 60 weit herausgezoomt): Zoom 15 gilt bis 12 km – dort braucht
 * eine 60 x 60 rund 250 Kacheln. Weiter draussen waeren es bei 30 km 1 600 (Hunderte MB) fuer Zufahrten und Fusswege,
 * die bei 1 mm = 50 m niemand sieht; jede Stufe darunter viertelt die Kacheln. Das Archiv fuehrt Strassen dann ab
 * Wohnstrasse (Zoom 13) bzw. Nebenstrasse.
 */
export function archivZoom(ausschnittKm: number): number {
  // Zum Messen: KARTE_ZOOM erzwingt eine Stufe (scripts/voll-weit.ts).
  if (process.env.KARTE_ZOOM) return Number(process.env.KARTE_ZOOM);
  return ausschnittKm <= 12.5 ? ARCHIV_ZOOM : ausschnittKm <= 25 ? 14 : 13;
}

function archivQuelle(adresse: string, ausschnittKm: number): KachelQuelle {
  const a = archiv(adresse);
  const zoom = archivZoom(ausschnittKm);
  const basis = protomapsQuelle(async (z, x, y) => {
    const schluessel = `${z}/${x}/${y}`;
    const da = a.kacheln.get(schluessel);
    if (da) return da;
    // Eine fehlende Kachel ist kein Fehler: ueber offenem Meer fuehrt das Archiv keine.
    const abruf = a.archiv.getZxy(z, x, y).then((r) => (r?.data ? new Uint8Array(r.data) : new Uint8Array(0)));
    abruf.catch(() => a.kacheln.delete(schluessel));
    a.kacheln.set(schluessel, abruf);
    while (a.kacheln.size > MAX_KACHELN) a.kacheln.delete(a.kacheln.keys().next().value!);
    return abruf;
  });
  return { ...basis, zoom };
}

/**
 * Rechnet mit der gewaehlten Quelle; faellt das Archiv aus, noch einmal ganz mit Mapbox – nie gemischt, eine Karte
 * aus zwei Quellen haette zwei Zoomstufen. `hinweis` sagt, was passiert ist.
 */
export async function mitKartenQuelle<T>(
  wahl: QuellenWahl | undefined,
  rechne: (quelle: KachelQuelle) => Promise<T>,
  ausschnittKm = 3.5,
): Promise<{ wert: T; quelle: string; hinweis: string | null }> {
  const token = process.env.MAPBOX_ACCESS_TOKEN ?? "";
  const adresse = archivAdresse();
  if ((wahl ?? "archiv") === "archiv" && adresse) {
    try {
      const q = archivQuelle(adresse, ausschnittKm);
      return { wert: await rechne(q), quelle: q.name, hinweis: null };
    } catch (e) {
      if (e instanceof Error && e.name === "AbortError") throw e;
      if (!token) throw e;
      const q = mapboxTokenQuelle(token);
      const grund = e instanceof Error ? e.message : String(e);
      return { wert: await rechne(q), quelle: q.name, hinweis: `Eigenes Kartenarchiv nicht erreichbar (${grund}) – mit Mapbox gerechnet.` };
    }
  }
  if (!token) throw new Error("Weder KARTE_ARCHIV noch MAPBOX_ACCESS_TOKEN gesetzt (.env.local).");
  const q = mapboxTokenQuelle(token);
  const hinweis = (wahl ?? "archiv") === "archiv" ? "KARTE_ARCHIV ist nicht gesetzt – mit Mapbox gerechnet." : null;
  return { wert: await rechne(q), quelle: q.name, hinweis };
}
