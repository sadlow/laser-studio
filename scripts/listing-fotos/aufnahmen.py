#!/usr/bin/env python3
"""Referenzbilder fuer die Listing-Fotos: vier Orte, je Bildrolle eine Einstellung.

Aufruf: python3 scripts/listing-fotos/aufnahmen.py [name ...]   (ohne Namen: alle)
Nutzt scripts/referenzbilder.sh (Dev-Server muss laufen) und legt die PNGs
unter referenzen/ ab.
"""
import json, os, shutil, subprocess, sys, urllib.parse

STUDIO = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
ZIEL = os.path.join(STUDIO, "export", "produktfoto", "listing", "referenzen")

ORTE = {
    # Erste gemeinsame Wohnung / Einweihung, Altstadt am Rhein
    "koeln": {"lon": 6.9607, "lat": 50.9384, "aufbau": "netz-weiss",
              "kunde": {"adresse": "Koeln Altstadt", "titel": "Zuhause", "namen": "Lena & Jonas",
                        "letzteZeile": "koordinaten", "ortText": "Köln", "holzrahmen": "eiche"}},
    # Lieblingsurlaubsort, Palma mit Kathedrale und Bucht
    "mallorca": {"lon": 2.6470, "lat": 39.5706, "kartenMitte": {"lon": 2.6440, "lat": 39.5745},
                 "aufbau": "netz-weiss",
                 "kunde": {"adresse": "Palma", "titel": "Mallorca", "namen": "Anna & Max",
                           "letzteZeile": "koordinaten", "ortText": "Palma", "holzrahmen": "ohne"}},
    # Ort der ersten Begegnung, Washington Square
    "newyork": {"lon": -73.9973, "lat": 40.7308, "aufbau": "netz-schwarz",
                "kunde": {"adresse": "New York", "titel": "New York", "namen": "Sophie & Ben",
                          "letzteZeile": "wunschtext", "wunschtext": "Hier fing alles an", "holzrahmen": "schwarz"}},
    # Heimat beim Auszug, Binnenalster
    "hamburg": {"lon": 9.9935, "lat": 53.5537, "kartenMitte": {"lon": 9.9950, "lat": 53.5555}, "aufbau": "netz-weiss",
                "kunde": {"adresse": "Hamburg", "titel": "Heimat", "namen": "Für Paul",
                          "letzteZeile": "koordinaten", "ortText": "Hamburg", "holzrahmen": "weiss"}},
}

def rahmen(ort, farbe):
    e = json.loads(json.dumps(ORTE[ort]))
    e["kunde"]["holzrahmen"] = farbe
    return e

def ohne(ort):
    return rahmen(ort, "ohne")

# name: (entwurf, motiv, zoom, versatz, grund) – alles 1:1 wie die Listing-Rollen
AUFNAHMEN = {
    "hero-koeln-eiche": (ORTE["koeln"], "wand", 1.3, (-0.03, -0.03), "ffffff"),
    "hero-koeln-ohne": (ohne("koeln"), "wand", 1.3, (-0.03, -0.03), "ffffff"),
    "heroetsy-koeln": (ORTE["koeln"], "wand", 0.8, (0, 0.04), None),
    "lifestyle-mallorca": (ORTE["mallorca"], "wand", 0.62, (0.18, 0.1), None),
    "personalize-newyork": (ORTE["newyork"], "flach", 0.8, None, None),
    "desire-hamburg": (ORTE["hamburg"], "wand", 0.62, (-0.17, 0.12), None),
    "features-koeln": (ohne("koeln"), "symbol", 1, (0.1, 0), None),
    "features-rand-mallorca": (ORTE["mallorca"], "kante", 1, None, None),
    "titel-koeln": (ohne("koeln"), "titel", 1, None, None),
    "frames-schwarz": (rahmen("koeln", "schwarz"), "wand", 1, None, None, {"frontal": "1", "wandschatten": "0", "bodenschatten": "0", "umgebung": "0", "softboxen": "0"}),
    "frames-weiss": (rahmen("koeln", "weiss"), "wand", 1, None, None, {"frontal": "1", "wandschatten": "0", "bodenschatten": "0", "umgebung": "0", "softboxen": "0"}),
    "frames-eiche": (ORTE["koeln"], "wand", 1, None, None, {"frontal": "1", "wandschatten": "0", "bodenschatten": "0", "umgebung": "0", "softboxen": "0"}),
}


# Weitere Anlaesse (Marcel 16.09.2026: "finde noch ein paar Anlaesse dazu")
ORTE.update({
    # Hochzeit am Neckar
    "heidelberg": {"lon": 8.7102, "lat": 49.4120, "kartenMitte": {"lon": 8.6980, "lat": 49.4100}, "aufbau": "netz-schwarz",
                   "kunde": {"adresse": "Heidelberg", "titel": "Für immer", "namen": "Laura & David",
                             "letzteZeile": "wunschtext", "wunschtext": "Heidelberg 12.06.2026", "holzrahmen": "weiss"}},
    # Hausbau am See
    "starnberg": {"lon": 11.3330, "lat": 48.0040, "kartenMitte": {"lon": 11.3400, "lat": 47.9990}, "aufbau": "netz-weiss",
                  "kunde": {"adresse": "Starnberg", "titel": "Unser Haus", "namen": "Familie Wagner",
                            "letzteZeile": "koordinaten", "ortText": "Starnberg", "holzrahmen": "eiche"}},
    # Geburt
    "muenchen": {"lon": 11.5860, "lat": 48.1620, "aufbau": "netz-weiss",
                 "kunde": {"adresse": "Muenchen", "titel": "Mia", "namen": "Geboren am 04.03.2026",
                           "letzteZeile": "koordinaten", "ortText": "München", "holzrahmen": "weiss"}},
    # Heiratsantrag
    "paris": {"lon": 2.3375, "lat": 48.8583, "kartenMitte": {"lon": 2.3450, "lat": 48.8566}, "aufbau": "netz-weiss",
              "kunde": {"adresse": "Paris", "titel": "Paris", "namen": "Julia & Tom",
                        "letzteZeile": "wunschtext", "wunschtext": "Hier hat sie Ja gesagt", "holzrahmen": "schwarz"}},
    # Auswandern
    "berlin": {"lon": 13.4230, "lat": 52.4960, "kartenMitte": {"lon": 13.4200, "lat": 52.4990}, "aufbau": "netz-weiss",
               "kunde": {"adresse": "Berlin Kreuzberg", "titel": "Berlin", "namen": "Für Lukas",
                         "letzteZeile": "wunschtext", "wunschtext": "Heimat im Gepäck", "holzrahmen": "ohne"}},
    # Elternhaus zu Weihnachten
    "dresden": {"lon": 13.7560, "lat": 51.0600, "kartenMitte": {"lon": 13.7420, "lat": 51.0550}, "aufbau": "netz-weiss",
                "kunde": {"adresse": "Dresden", "titel": "Elternhaus", "namen": "Für Mama & Papa",
                          "letzteZeile": "koordinaten", "ortText": "Dresden", "holzrahmen": "eiche"}},
    # Urlaubsort an der Nordsee
    "sylt": {"lon": 8.3070, "lat": 54.9080, "kartenMitte": {"lon": 8.3150, "lat": 54.9060}, "aufbau": "netz-schwarz",
             "kunde": {"adresse": "Westerland", "titel": "Sylt", "namen": "Unser Lieblingsort",
                       "letzteZeile": "koordinaten", "ortText": "Westerland", "holzrahmen": "weiss"}},
    # Hochzeitsreise
    "barcelona": {"lon": 2.1770, "lat": 41.3830, "kartenMitte": {"lon": 2.1820, "lat": 41.3860}, "aufbau": "netz-weiss",
                  "kunde": {"adresse": "Barcelona", "titel": "Barcelona", "namen": "Unsere Hochzeitsreise",
                            "letzteZeile": "koordinaten", "ortText": "Barcelona", "holzrahmen": "ohne"}},
})
AUFNAHMEN.update({
    "heidelberg-hochzeit": (ORTE["heidelberg"], "wand", 0.72, (0, 0.06), None),
    "starnberg-hausbau": (ORTE["starnberg"], "wand", 0.62, (0.16, 0.1), None),
    "muenchen-geburt": (ORTE["muenchen"], "wand", 0.62, (-0.15, 0.1), None),
    "paris-antrag": (ORTE["paris"], "wand", 0.68, (0.1, 0.08), None),
    "berlin-auswandern": (ORTE["berlin"], "wand", 0.6, (-0.12, 0.12), None),
    "dresden-weihnachten": (ORTE["dresden"], "wand", 0.66, (0, 0.1), None),
    "sylt-urlaub": (ORTE["sylt"], "wand", 0.62, (0.15, 0.1), None),
    "barcelona-flatlay": (ORTE["barcelona"], "flach", 0.72, None, None),
    "paris-herz": (ohne("paris"), "symbol", 1, (0.1, 0), None),
    "starnberg-ufer": (ohne("starnberg"), "wasser", 1, None, None, {"softboxen": "0"}),
})
AUFNAHMEN.update({f"test-{o}": (ORTE[o], "wand", 1, None, None) for o in
                  ["heidelberg", "starnberg", "muenchen", "paris", "berlin", "dresden", "sylt", "barcelona"]})

def aufnehmen(name):
    entwurf, motiv, zoom, versatz, grund, *extra = AUFNAHMEN[name]
    teile = {"entwurf": json.dumps(entwurf, ensure_ascii=False), "foto": motiv, "seiten": "1:1", **(extra[0] if extra else {})}
    if zoom != 1: teile["zoom"] = str(zoom)
    if versatz: teile["versatz"] = f"{versatz[0]},{versatz[1]}"
    if grund:
        teile["grund"] = grund
        teile["wandschatten"] = "0"
    query = urllib.parse.urlencode(teile, quote_via=urllib.parse.quote)
    subprocess.run(["bash", os.path.join(STUDIO, "scripts", "referenzbilder.sh"), name, query, "1600", "1600"], check=True)
    os.makedirs(ZIEL, exist_ok=True)
    shutil.move(os.path.join(STUDIO, "export", "produktfoto", "nah", name + ".png"), os.path.join(ZIEL, name + ".png"))


def rahmen_drei():
    """Drei Rahmen frontal auf einer gezeichneten Kommode – eine Kamera, eine gerade
    Kante zur Wand, gleiche Groesse. Die frueheren Einzelaufnahmen schraeg von rechts
    nebeneinander passten zu keiner Kamera: Leonardo machte daraus ein Escher-Bild
    mit ansteigender Kommode und kleiner werdenden Rahmen (Marcel 16.09.2026).
    Die Aufnahmen haben keinen Schatten und einen einfarbigen Grund, darum lassen
    sie sich sauber freistellen; Schatten macht Leonardo."""
    import numpy as np
    from PIL import Image, ImageDraw
    wand = np.array([243, 240, 234])
    B, kante, platte, hoehe = 1600, 1190, 34, 620
    leinwand = Image.new("RGB", (B, B), tuple(int(v) for v in wand))
    d = ImageDraw.Draw(leinwand)
    d.rectangle((0, kante, B, kante + platte), fill=(216, 188, 148))   # Deckplatte
    d.rectangle((0, kante + platte, B, B), fill=(194, 162, 120))       # Front
    d.line((0, kante, B, kante), fill=(172, 146, 108), width=3)        # gerade Kante zur Wand
    for i, n in enumerate(["frames-schwarz", "frames-weiss", "frames-eiche"]):
        rgb = np.asarray(Image.open(os.path.join(ZIEL, n + ".png")).convert("RGB")).astype(np.int32)
        diff = np.abs(rgb - wand).sum(axis=2)
        ys, xs = np.nonzero(diff > 30)
        box = (xs.min(), ys.min(), xs.max() + 1, ys.max() + 1)
        maske = Image.fromarray((np.clip((diff - 4) / 16, 0, 1) * 255).astype(np.uint8)).crop(box)
        # Ohne Raumspiegelung ist Schwarz schwarz, aber Weiss nur hellgrau: jede Kachel
        # am weissen Textfeld (unteres Fuenftel, Mitte) auf Weiss abgleichen.
        x0, y0, x1, y1 = box
        feld = rgb[y0 + (y1 - y0) * 82 // 100:y0 + (y1 - y0) * 90 // 100, x0 + (x1 - x0) * 30 // 100:x0 + (x1 - x0) * 70 // 100]
        faktor = min(1.35, 244 / max(1, np.median(feld)))
        bild = Image.fromarray(np.clip(rgb * faktor, 0, 255).astype(np.uint8)).crop(box)
        breite = round(bild.width * hoehe / bild.height)
        bild, maske = bild.resize((breite, hoehe), Image.LANCZOS), maske.resize((breite, hoehe), Image.LANCZOS)
        mitte = round(B / 6 + i * B / 3)
        leinwand.paste(bild, (mitte - breite // 2, kante + platte // 2 - hoehe), maske)
    leinwand.save(os.path.join(ZIEL, "frames-drei.png"))


if __name__ == "__main__":
    for n in sys.argv[1:] or AUFNAHMEN:
        if n == "frames-drei":
            rahmen_drei()
        else:
            aufnehmen(n)
