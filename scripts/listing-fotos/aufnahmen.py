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

def aufnehmen(name):
    entwurf, motiv, zoom, versatz, grund = AUFNAHMEN[name]
    teile = {"entwurf": json.dumps(entwurf, ensure_ascii=False), "foto": motiv, "seiten": "1:1"}
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
