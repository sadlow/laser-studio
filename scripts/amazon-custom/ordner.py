#!/usr/bin/env python3
"""Stellt die Amazon-Custom-Bilder mit sprechenden Namen in einen Ordner (Marcel 16./17.09.2026).

Aufruf: python3 scripts/amazon-custom/ordner.py ["Zielordner"]   (Standard: ~/Desktop/Schichtkarte Amazon Custom)
Vorher: textfelder.ts, bilder.py, symbole.py und fuer das Erklaerbild listing-fotos/explosion_beschriften.py.
Die Unterordner, die das Skript anlegt, baut es jedes Mal neu auf – so bleibt kein veraltetes Bild liegen.
"""
import os, shutil, sys

HIER = os.path.dirname(os.path.abspath(__file__))
STUDIO = os.path.abspath(os.path.join(HIER, "..", ".."))
QUELLE = os.path.join(STUDIO, "export", "amazon-custom")
BILDER = os.path.join(QUELLE, "bilder")
LISTING = os.path.join(STUDIO, "export", "produktfoto", "listing", "fotos")
ZIEL = sys.argv[1] if len(sys.argv) > 1 else os.path.expanduser("~/Desktop/Schichtkarte Amazon Custom")

DESIGN = {"weiss-auf-schwarz": "Weiß auf Schwarz", "schwarz-auf-weiss": "Schwarz auf Weiß", "schwarz-weisser-rahmen": "Schwarz mit weißem Rand"}
RAHMEN = {"ohne": "ohne Rahmen", "schwarz": "Holz schwarz", "weiss": "Holz weiß", "eiche": "Eiche", "dunkelbraun": "Holz dunkelbraun"}
FORMAT = {"a5": "DIN A5", "a4": "DIN A4", "a3": "DIN A3", "quadrat30": "Quadrat 30 x 30"}
KM = {f"{km:g}".replace(".", ",") + "-km": f"{km:g}".replace(".", ",") + " km" for km in [1.5, 2.5, 3.5, 5.5, 9]}
OPTIONEN = {
    "design": ("Design", DESIGN),
    "format": ("Format", FORMAT),
    "rahmen": ("Rahmen", RAHMEN),
    "massstab": ("Maßstab", KM),
    "strassennetz": ("Straßennetz", {"viel": "viele Straßen geschnitten", "ausgewogen": "ausgewogen", "wenig": "wenig geschnitten, viel Gravur"}),
    "standort-symbol": ("Standort-Symbol", {"herz": "Herz", "haus": "Haus", "pin": "Standort-Pin", "kreuz": "Kreuz"}),
    "symbolgroesse": ("Symbolgröße", {"klein": "klein", "mittel": "mittel", "gross": "groß"}),
}
QUADRAT = "4 Quadrat 30 x 30 (eigener Artikel)"
TEILE = ["1 Vorschau ohne Text", "2 Optionen", "3 Erklärbild", QUADRAT, "Kontrollbilder Textfelder"]


def kopiere(von, nach):
    os.makedirs(os.path.dirname(nach), exist_ok=True)
    shutil.copyfile(von, nach)


def vorschau(quelle, ziel, je_format):
    for f in sorted(os.listdir(os.path.join(quelle, "vorschau"))):
        unter = os.path.join(ziel, FORMAT[f]) if je_format else ziel
        for datei in sorted(os.listdir(os.path.join(quelle, "vorschau", f))):
            # rsplit: das Design "schwarz-weisser-rahmen" enthaelt selbst "-rahmen"
            design, rahmen = datei[:-4].rsplit("-rahmen-", 1)
            name = f"{DESIGN[design]} – {RAHMEN[rahmen]}.jpg"
            kopiere(os.path.join(quelle, "vorschau", f, datei), os.path.join(unter, name))
            kopiere(os.path.join(quelle, "vorschau-400", f, datei), os.path.join(unter, "400 px", name))


def optionen(quelle, ziel, je_format):
    """Rahmen und Massstab liegen je Format in Unterordnern; beim Quadrat gibt es nur eins."""
    for gruppe, (titel, namen) in OPTIONEN.items():
        ordner = os.path.join(quelle, gruppe)
        if not os.path.isdir(ordner):
            continue
        for eintrag in sorted(os.listdir(ordner)):
            pfad = os.path.join(ordner, eintrag)
            if not os.path.isdir(pfad):
                kopiere(pfad, os.path.join(ziel, titel, namen[eintrag[:-4]] + ".jpg"))
                continue
            for datei in sorted(os.listdir(pfad)):
                unter = os.path.join(ziel, titel, FORMAT[eintrag]) if je_format else os.path.join(ziel, titel)
                kopiere(os.path.join(pfad, datei), os.path.join(unter, namen[datei[:-4]] + ".jpg"))


if __name__ == "__main__":
    for teil in TEILE:
        shutil.rmtree(os.path.join(ZIEL, teil), ignore_errors=True)
    konfigurator, quadrat = os.path.join(BILDER, "konfigurator"), os.path.join(BILDER, "quadrat30")
    vorschau(konfigurator, os.path.join(ZIEL, "1 Vorschau ohne Text"), True)
    optionen(konfigurator, os.path.join(ZIEL, "2 Optionen"), True)
    vorschau(quadrat, os.path.join(ZIEL, QUADRAT, "1 Vorschau ohne Text"), False)
    optionen(quadrat, os.path.join(ZIEL, QUADRAT, "2 Optionen"), False)
    kopiere(os.path.join(LISTING, "hochskaliert", "08-explosion-koeln-ultra-k4-a7.jpg"), os.path.join(ZIEL, "3 Erklärbild", "Aufbau – ohne Beschriftung.jpg"))
    kopiere(os.path.join(LISTING, "08-explosion-koeln-beschriftet.jpg"), os.path.join(ZIEL, "3 Erklärbild", "Aufbau – beschriftet.jpg"))
    for f in ["a5", "a4", "a3"]:
        kopiere(os.path.join(BILDER, "kontrolle", f"{f}.jpg"), os.path.join(ZIEL, "Kontrollbilder Textfelder", f"{FORMAT[f]}.jpg"))
    kopiere(os.path.join(BILDER, "kontrolle", "quadrat30.jpg"), os.path.join(ZIEL, QUADRAT, "Kontrollbild Textfelder.jpg"))
    for datei in ["textfelder.md", "textfelder.json"]:
        kopiere(os.path.join(QUELLE, datei), os.path.join(ZIEL, datei))
    kopiere(os.path.join(HIER, "UEBERSICHT.md"), os.path.join(ZIEL, "Übersicht.md"))
    print("Ordner:", ZIEL)
