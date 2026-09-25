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
import { mapboxTokenQuelle, protomapsQuelle, type KachelQuelle } from "@/engine";

export type QuellenWahl = "archiv" | "mapbox";

class NetzQuelle implements Source {
  constructor(private url: string) {}
  getKey() {
    return this.url;
  }
  async getBytes(offset: number, length: number, signal?: AbortSignal): Promise<RangeResponse> {
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

function archivQuelle(adresse: string): KachelQuelle {
  const a = archiv(adresse);
  return protomapsQuelle(async (z, x, y) => {
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
}

/**
 * Rechnet mit der gewaehlten Quelle; faellt das Archiv aus, noch einmal ganz mit Mapbox – nie gemischt, eine Karte
 * aus zwei Quellen haette zwei Zoomstufen. `hinweis` sagt, was passiert ist.
 */
export async function mitKartenQuelle<T>(
  wahl: QuellenWahl | undefined,
  rechne: (quelle: KachelQuelle) => Promise<T>,
): Promise<{ wert: T; quelle: string; hinweis: string | null }> {
  const token = process.env.MAPBOX_ACCESS_TOKEN ?? "";
  const adresse = archivAdresse();
  if ((wahl ?? "archiv") === "archiv" && adresse) {
    try {
      const q = archivQuelle(adresse);
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
