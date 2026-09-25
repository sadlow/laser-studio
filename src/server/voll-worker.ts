/**
 * Volle Rechnung in einem eigenen Thread (rechenwerk.ts). Im Hauptprozess stuende sonst die Skizze: Node rechnet
 * eine Sache gleichzeitig, und eine 60 x 60 bei 12 km rechnet 15-25 s am Stueck (Marcel 25.09.2026).
 */
import { parentPort } from "node:worker_threads";
import { rendereSchichtkarte, type Schichtkarte } from "@/engine";
import { mitKartenQuelle } from "./karten-quelle";

export type AnVollWorker = { id: number; karte: Schichtkarte };

if (parentPort) {
  const port = parentPort;
  port.on("message", async ({ id, karte }: AnVollWorker) => {
    try {
      const { wert, hinweis } = await mitKartenQuelle(karte.kartenQuelle, (q) => rendereSchichtkarte(karte, q, undefined, { teilung: false }), karte.ausschnittKm);
      if (hinweis) wert.warnungen.unshift(hinweis);
      port.postMessage({ id, ergebnis: wert });
    } catch (e) {
      port.postMessage({ id, fehler: e instanceof Error ? e.message : String(e) });
    }
  });
  port.postMessage({ bereit: true });
}
