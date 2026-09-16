#!/usr/bin/env python3
"""Stellt die Amazon-Custom-Bilder mit sprechenden Namen in einen Ordner (Marcel 16.09.2026).

Aufruf: python3 scripts/amazon-custom/ordner.py ["Zielordner"]   (Standard: ~/Desktop/Schichtkarte Amazon Custom)
Vorher: textfelder.ts, bilder.py und fuer das Erklaerbild listing-fotos/explosion_beschriften.py.
"""
import os, shutil, sys

STUDIO = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
QUELLE = os.path.join(STUDIO, "export", "amazon-custom")
LISTING = os.path.join(STUDIO, "export", "produktfoto", "listing", "fotos")
ZIEL = sys.argv[1] if len(sys.argv) > 1 else os.path.expanduser("~/Desktop/Schichtkarte Amazon Custom")

DESIGN = {"weiss-auf-schwarz": "Weiß auf Schwarz", "schwarz-auf-weiss": "Schwarz auf Weiß", "schwarz-weisser-rahmen": "Schwarz mit weißem Rand"}
RAHMEN = {"ohne": "ohne Rahmen", "schwarz": "Holz schwarz", "weiss": "Holz weiß", "eiche": "Eiche", "dunkelbraun": "Holz dunkelbraun"}
FORMAT = {"a5": "DIN A5", "a4": "DIN A4", "a3": "DIN A3", "quadrat30": "Quadrat 30 x 30"}
OPTIONEN = {
    "design": ("Design", DESIGN),
    "rahmen": ("Rahmen", RAHMEN),
    "format": ("Format", FORMAT),
    "massstab": ("Maßstab", {n: n.replace("-km", " km") for n in ["1,5-km", "2,5-km", "3,5-km", "5,5-km", "9-km"]}),
    "strassennetz": ("Straßennetz", {"viel": "viele Straßen geschnitten", "ausgewogen": "ausgewogen", "wenig": "wenig geschnitten, viel Gravur"}),
    "standort-symbol": ("Standort-Symbol", {"herz": "Herz", "haus": "Haus", "pin": "Standort-Pin", "kreuz": "Kreuz"}),
    "symbolgroesse": ("Symbolgröße", {"klein": "klein", "mittel": "mittel", "gross": "groß"}),
}


def kopiere(von, nach):
    os.makedirs(os.path.dirname(nach), exist_ok=True)
    shutil.copyfile(von, nach)


if __name__ == "__main__":
    for datei in sorted(os.listdir(os.path.join(QUELLE, "bilder", "vorschau"))):
        format_, rest = datei[:-4].split("-", 1)
        design = next(d for d in DESIGN if rest.startswith(d))
        rahmen = rest.split("rahmen-")[-1]
        name = f"{FORMAT[format_]} – {DESIGN[design]} – {RAHMEN[rahmen]}.jpg"
        kopiere(os.path.join(QUELLE, "bilder", "vorschau", datei), os.path.join(ZIEL, "1 Vorschau ohne Text", name))
        kopiere(os.path.join(QUELLE, "bilder", "vorschau-400", datei), os.path.join(ZIEL, "1 Vorschau ohne Text", "400 px", name))
    for gruppe, (titel, namen) in OPTIONEN.items():
        for alt, neu in namen.items():
            kopiere(os.path.join(QUELLE, "bilder", "optionen", gruppe, f"{alt}.jpg"), os.path.join(ZIEL, "2 Optionen", titel, f"{neu}.jpg"))
    kopiere(os.path.join(LISTING, "hochskaliert", "08-explosion-koeln-ultra-k4-a7.jpg"), os.path.join(ZIEL, "3 Erklärbild", "Aufbau – ohne Beschriftung.jpg"))
    kopiere(os.path.join(LISTING, "08-explosion-koeln-beschriftet.jpg"), os.path.join(ZIEL, "3 Erklärbild", "Aufbau – beschriftet.jpg"))
    for f, name in [("a4", "A4"), ("quadrat30", "30 x 30")]:
        kopiere(os.path.join(QUELLE, "bilder", "kontrolle", f"{f}.jpg"), os.path.join(ZIEL, f"Kontrollbild Textfelder {name}.jpg"))
    for datei in ["textfelder.md", "textfelder.json"]:
        kopiere(os.path.join(QUELLE, datei), os.path.join(ZIEL, datei))
    kopiere(os.path.join(QUELLE, "UEBERSICHT.md"), os.path.join(ZIEL, "Übersicht.md"))
    print("Ordner:", ZIEL)
