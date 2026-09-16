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
    "frames-schwarz": (rahmen("koeln", "schwarz"), "wand", 1, None, None),
    "frames-weiss": (rahmen("koeln", "weiss"), "wand", 1, None, None),
    "frames-eiche": (ORTE["koeln"], "wand", 1, None, None),
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

if __name__ == "__main__":
    for n in sys.argv[1:] or AUFNAHMEN:
        aufnehmen(n)
