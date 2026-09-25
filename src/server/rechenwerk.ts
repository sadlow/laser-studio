/**
 * Die volle Rechnung laeuft in einem Worker-Thread (voll-worker.ts), die Skizze im Hauptprozess – so wartet die
 * Skizze nie auf die volle Rechnung (Marcel 25.09.2026: bei 60 x 60 hing die Skizze hinter 15-25 s Rechenzeit).
 * Muster wie `baseline-customizer/app/services/laserkarte/rechner.server.ts`, fuer ein Studio mit einem Nutzer
 * vereinfacht: ein Worker, die neueste Eingabe gewinnt – eine laufende Rechnung wird hart beendet, nicht erst am
 * naechsten Haltepunkt der Engine.
 *
 * Laeuft der Worker nicht an (etwa ohne tsx), rechnet der Hauptprozess wie bisher.
 */
import { join } from "node:path";
import { Worker } from "node:worker_threads";
import { rendereSchichtkarte, type Schichtkarte, type SchichtkartenErgebnis } from "@/engine";
import { mitKartenQuelle } from "./karten-quelle";

interface Platz {
  worker: Worker;
  bereit: Promise<void>;
  auftrag: { id: number; erfuellen: (r: SchichtkartenErgebnis) => void; ablehnen: (e: Error) => void } | null;
}

const ablage = globalThis as typeof globalThis & { __vollRechner?: { platz: Platz | null; naechsteId: number; kaputt: boolean } };
const zustand = (ablage.__vollRechner ??= { platz: null, naechsteId: 1, kaputt: false });

function starte(): Platz {
  // Dieselbe TypeScript-Quelle ueber tsx, ohne Build (wie der Customizer in der Entwicklung). CommonJS-Register, weil
  // das Paket kein "type": "module" hat – der ESM-Weg scheiterte an Verzeichnis-Importen und "@/engine". Der Pfad wird
  // zusammengesetzt statt aufgeloest, sonst packt Next tsx samt esbuild in den Server-Bundle.
  const tsx = join(process.cwd(), "node_modules/tsx/dist/cjs/api/index.cjs");
  const quelle = join(process.cwd(), "src/server/voll-worker.ts");
  const worker = new Worker(`require(${JSON.stringify(tsx)}).register(); require(${JSON.stringify(quelle)});`, { eval: true, resourceLimits: { maxOldGenerationSizeMb: 6144 } });
  let bereitMelden: () => void = () => {};
  const platz: Platz = { worker, bereit: new Promise((r) => (bereitMelden = r)), auftrag: null };
  worker.on("message", (n: { bereit?: true; id?: number; ergebnis?: SchichtkartenErgebnis; fehler?: string }) => {
    if (n.bereit) return bereitMelden();
    const a = platz.auftrag;
    if (!a || a.id !== n.id) return;
    platz.auftrag = null;
    if (n.ergebnis) a.erfuellen(n.ergebnis);
    else a.ablehnen(new Error(n.fehler ?? "Rechnung fehlgeschlagen"));
  });
  worker.on("error", (e) => {
    platz.auftrag?.ablehnen(e);
    platz.auftrag = null;
    if (zustand.platz === platz) zustand.platz = null;
  });
  return platz;
}

function abgebrochen(): Error {
  const e = new Error("Abgebrochen");
  e.name = "AbortError";
  return e;
}

/** Volle Rechnung (ohne Naehte) fuer die Vorschau. Der Hinweis zur Kartenquelle steht schon in den Warnungen. */
export async function rechneVoll(karte: Schichtkarte, signal?: AbortSignal): Promise<SchichtkartenErgebnis> {
  if (zustand.kaputt) return imHauptprozess(karte, signal);
  // Die neueste Eingabe gewinnt: eine laufende Rechnung wird beendet, samt Worker.
  if (zustand.platz?.auftrag) {
    zustand.platz.auftrag.ablehnen(abgebrochen());
    void zustand.platz.worker.terminate();
    zustand.platz = null;
  }
  let platz: Platz;
  try {
    platz = zustand.platz ??= starte();
    await Promise.race([platz.bereit, new Promise((_, nein) => setTimeout(() => nein(new Error("Worker startet nicht")), 30_000))]);
  } catch (e) {
    console.error("Rechenwerk: Worker nicht verfuegbar, rechne im Hauptprozess", e);
    zustand.kaputt = true;
    return imHauptprozess(karte, signal);
  }
  const id = zustand.naechsteId++;
  return new Promise<SchichtkartenErgebnis>((erfuellen, ablehnen) => {
    platz.auftrag = { id, erfuellen, ablehnen };
    signal?.addEventListener("abort", () => {
      if (platz.auftrag?.id !== id) return;
      platz.auftrag = null;
      ablehnen(abgebrochen());
      // Hart beenden: die Geometrie rechnet am Stueck und schaut erst zwischen den Schritten auf den Abbruch.
      void platz.worker.terminate();
      if (zustand.platz === platz) zustand.platz = null;
    }, { once: true });
    platz.worker.postMessage({ id, karte });
  });
}

async function imHauptprozess(karte: Schichtkarte, signal?: AbortSignal) {
  const { wert, hinweis } = await mitKartenQuelle(karte.kartenQuelle, (q) => rendereSchichtkarte(karte, q, signal, { teilung: false }), karte.ausschnittKm);
  if (hinweis) wert.warnungen.unshift(hinweis);
  return wert;
}
