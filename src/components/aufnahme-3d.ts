import * as THREE from "three";

/**
 * Aufnahme-Parameter aus der URL fuer Referenzbilder aus dem Headless-Browser
 * (Marcel 16.09.2026: Listing-Bilder mit Platz fuer Overlay-Texte).
 *
 *   grund=ffffff     Buehnenfarbe, reinweiss fuer das Amazon-Hauptbild
 *   wandschatten=0   nur der Bodenschatten, kein Schatten an der Wand
 *   softboxen=0      keine Softboxen im Spiegelbild – in Nahaufnahmen vom Wasser wurden
 *                    sie im KI-Foto zu Glasplatten im See
 *   zoom=0.7         Produkt kleiner im Bild (1 = wie das Motiv es rahmt)
 *   versatz=0.2,-0.1 Produkt nach rechts/unten schieben, als Anteil der Bildbreite
 *                    und -hoehe – wie ein Shift-Objektiv, die Perspektive bleibt
 */
export function aufnahmeParameter(url: URLSearchParams) {
  const farbe = url.get("grund") ?? "";
  const zoom = Number(url.get("zoom")) || 1;
  const [dx, dy] = (url.get("versatz") ?? "").split(",").map((v) => Number(v) || 0);
  return {
    grund: /^[0-9a-f]{6}$/i.test(farbe) ? parseInt(farbe, 16) : undefined,
    wandschatten: url.get("wandschatten") !== "0",
    softboxen: url.get("softboxen") !== "0",
    ausschnitt: (kamera: THREE.PerspectiveCamera, renderer: THREE.WebGLRenderer) => {
      kamera.zoom = zoom;
      const g = renderer.getSize(new THREE.Vector2());
      if (dx || dy) kamera.setViewOffset(g.x, g.y, -dx * g.x, -dy * g.y, g.x, g.y);
      else kamera.clearViewOffset();
      kamera.updateProjectionMatrix();
    },
  };
}
