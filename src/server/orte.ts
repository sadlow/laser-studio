/**
 * Adresssuche über Photon (Komoot), die offene Suche auf OpenStreetMap-Daten.
 *
 * Warum nicht Google: Deren Bedingungen verbieten die Nutzung zusammen mit einer fremden
 * Karte ausdrücklich („No Use With Non-Google Maps"). Unsere Karte ist nicht von Google,
 * also fällt das aus — unabhängig davon, dass die Kunden Google-Koordinaten kopieren. Die
 * Koordinaten selbst liest der Customizer ohnehin selbst (`app/domain/karte/orte.ts`).
 *
 * Gemessen am 23.09.2026 gegen acht echte Adressen: Photon und Nominatim finden alle acht,
 * fünf davon auf den Meter gleich. Die eine große Abweichung (19,8 km) war kein Fehler der
 * Suche, sondern fünf deutsche Rotenburgs — dagegen hilft keine bessere Suche, sondern die
 * Vorschlagsliste, in der der Kunde das richtige auswählt.
 *
 * Läuft über den Server, nicht aus dem Browser: So lässt sich drosseln und zwischenspeichern,
 * und die Suchbegriffe der Kunden gehen nicht direkt vom Kundenrechner zu einem Dritten.
 */
// Aus baseline-customizer app/services/karte/orte.server.ts (25.09.2026); hier dazu `ortBei` fuer eingefuegte
// Koordinaten – die Zeile vor den Koordinaten braucht den Ortsnamen.
import { leseVorschlaege, type Ortsvorschlag } from "@/engine/orte";

/** Eigene Instanz möglich; ohne Angabe die öffentliche von Komoot. */
const DIENST = process.env.PHOTON_URL?.trim() || "https://photon.komoot.io/api";
const MAX_SUCHEN_JE_MINUTE = Number(process.env.KARTE_SUCHEN_JE_MINUTE ?? 120);
const MAX_IM_SPEICHER = 200;

export class OrtsucheFehler extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

const speicher = new Map<string, Ortsvorschlag[]>();
let fenster = { beginn: 0, suchen: 0 };

export function setzeOrtsucheZurueck() {
  speicher.clear();
  fenster = { beginn: 0, suchen: 0 };
}

/**
 * Vorschläge zu einem Suchbegriff. Kurze Eingaben werden nicht gesucht: Bei ein bis zwei
 * Zeichen kommt nichts Brauchbares zurück, und der Dienst wird mit jedem Tastendruck
 * gefragt.
 */
export async function sucheOrte(
  begriff: string,
  optionen: { abruf?: typeof fetch; sprache?: string } = {},
): Promise<Ortsvorschlag[]> {
  const q = begriff.trim();
  if (q.length < 3) return [];
  const sprache = optionen.sprache === "en" ? "en" : "de";
  const schluessel = `${sprache}|${q.toLowerCase()}`;
  const gespeichert = speicher.get(schluessel);
  if (gespeichert) return gespeichert;

  const jetzt = Date.now();
  if (jetzt - fenster.beginn > 60_000) fenster = { beginn: jetzt, suchen: 0 };
  if (++fenster.suchen > MAX_SUCHEN_JE_MINUTE)
    throw new OrtsucheFehler("Zu viele Suchen, bitte kurz warten.", 429);

  const url = `${DIENST}?q=${encodeURIComponent(q)}&lang=${sprache}&limit=8`;
  let antwort: Response;
  try {
    antwort = await (optionen.abruf ?? fetch)(url, {
      headers: { "User-Agent": "Papierschmiede Laser Studio" },
      signal: AbortSignal.timeout(6000),
    });
  } catch (fehler) {
    throw new OrtsucheFehler(
      `Adresssuche nicht erreichbar: ${fehler instanceof Error ? fehler.message : fehler}`,
      502,
    );
  }
  if (!antwort.ok) throw new OrtsucheFehler(`Adresssuche antwortet ${antwort.status}`, 502);

  const vorschlaege = leseVorschlaege(await antwort.json());
  if (speicher.size >= MAX_IM_SPEICHER) {
    const aeltester = speicher.keys().next().value;
    if (aeltester !== undefined) speicher.delete(aeltester);
  }
  speicher.set(schluessel, vorschlaege);
  return vorschlaege;
}

/** Der naechste Ort zu Koordinaten (Photon `reverse`) – fuer den Ortsnamen vor den Koordinaten. */
export async function ortBei(lon: number, lat: number, optionen: { abruf?: typeof fetch } = {}): Promise<Ortsvorschlag | null> {
  const url = `${DIENST.replace(/\/api\/?$/, "")}/reverse?lon=${lon}&lat=${lat}&lang=de&limit=1`;
  const antwort = await (optionen.abruf ?? fetch)(url, {
    headers: { "User-Agent": "Papierschmiede Laser Studio" },
    signal: AbortSignal.timeout(6000),
  });
  if (!antwort.ok) throw new OrtsucheFehler(`Adresssuche antwortet ${antwort.status}`, 502);
  return leseVorschlaege(await antwort.json(), 1)[0] ?? null;
}
