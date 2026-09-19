/**
 * Haltepunkt zwischen zwei Rechenschritten: gibt der Anfrage Gelegenheit, ihr Abbrechen zu melden (Knopf in der
 * Vorschau oder eine neuere Eingabe), und hoert dann auf. Mitten in einem Schritt wird nicht unterbrochen – die
 * Engine rechnet am Stueck; darum stehen die Haltepunkte zwischen den grossen Schritten.
 */
export async function weiter(signal?: AbortSignal): Promise<void> {
  if (!signal) return;
  await new Promise((r) => setTimeout(r, 0));
  signal.throwIfAborted();
}
