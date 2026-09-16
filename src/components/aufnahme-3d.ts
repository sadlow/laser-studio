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
 *   bodenschatten=0  auch kein Bodenschatten – fuer Aufnahmen, die nebeneinandergesetzt werden
 *   umgebung=0.2     Staerke der Raumspiegelung; frontal spiegelte das Hochglanz-Schwarz
 *                    die helle Umgebung hinter der Kamera und wurde grau
 *   frontal=1        Kamera gerade vor das Produkt, gleicher Abstand und gleiche Hoehe.
 *                    Mehrere Aufnahmen lassen sich so nebeneinandersetzen: schraeg von
 *                    rechts ergaben drei Rahmen in einer Reihe ein Escher-Bild
 */
export function aufnahmeParameter(url: URLSearchParams) {
  const farbe = url.get("grund") ?? "";
  const zoom = Number(url.get("zoom")) || 1;
  const [dx, dy] = (url.get("versatz") ?? "").split(",").map((v) => Number(v) || 0);
  const frontal = url.get("frontal") === "1";
  return {
    grund: /^[0-9a-f]{6}$/i.test(farbe) ? parseInt(farbe, 16) : undefined,
    wandschatten: url.get("wandschatten") !== "0",
    softboxen: url.get("softboxen") !== "0",
    bodenschatten: url.get("bodenschatten") !== "0",
    umgebung: url.get("umgebung") === null ? undefined : Number(url.get("umgebung")),
    ausschnitt: (kamera: THREE.PerspectiveCamera, renderer: THREE.WebGLRenderer, ziel: THREE.Vector3) => {
      if (frontal) {
        const abstand = kamera.position.distanceTo(ziel);
        const hoehe = kamera.position.y - ziel.y;
        kamera.position.set(ziel.x, kamera.position.y, ziel.z + Math.sqrt(Math.max(0, abstand * abstand - hoehe * hoehe)));
        kamera.lookAt(ziel);
      }
      kamera.zoom = zoom;
      const g = renderer.getSize(new THREE.Vector2());
      if (dx || dy) kamera.setViewOffset(g.x, g.y, -dx * g.x, -dy * g.y, g.x, g.y);
      else kamera.clearViewOffset();
      kamera.updateProjectionMatrix();
    },
  };
}
