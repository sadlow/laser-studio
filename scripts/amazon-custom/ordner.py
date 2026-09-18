#!/usr/bin/env python3
"""Stellt die Amazon-Custom-Bilder mit sprechenden Namen in einen Ordner (Marcel 16./17.09.2026).

Aufruf: python3 scripts/amazon-custom/ordner.py ["Zielordner"]   (Standard: ~/Desktop/Schichtkarte Amazon Custom)
Vorher: textfelder.ts, bilder.py, masken.py, symbole.py und erklaerbild.py; das Hauptbild aus scripts/listing-fotos
(aufnahmen.py, generieren.py und hochskalieren.py fuer 01-hero-koeln-schwarz, dann weissgrund.py).
Die Unterordner, die das Skript anlegt, baut es jedes Mal neu auf – so bleibt kein veraltetes Bild liegen.
Nur fertige Bilder (Marcel 17.09.2026): die Kontrollbilder mit den Textfeldern bleiben im Studio-Export.
"""
import os, shutil, sys

HIER = os.path.dirname(os.path.abspath(__file__))
STUDIO = os.path.abspath(os.path.join(HIER, "..", ".."))
QUELLE = os.path.join(STUDIO, "export", "amazon-custom")
BILDER = os.path.join(QUELLE, "bilder")
ZIEL = sys.argv[1] if len(sys.argv) > 1 else os.path.expanduser("~/Desktop/Schichtkarte Amazon Custom")

DESIGN = {"weiss-auf-schwarz": "Weiß auf Schwarz", "schwarz-auf-weiss": "Schwarz auf Weiß", "schwarz-weisser-rahmen": "Schwarz mit weißem Rand"}
RAHMEN = {"ohne": "ohne Rahmen", "schwarz": "Holz schwarz", "weiss": "Holz weiß", "eiche": "Eiche", "dunkelbraun": "Holz dunkelbraun"}
FORMAT = {"a5": "DIN A5", "a4": "DIN A4", "a3": "DIN A3", "quadrat30": "Quadrat 30 x 30"}
SYMBOL = {"herz": "Herz", "haus": "Haus", "pin": "Standort-Pin", "kreuz": "Kreuz"}
GROESSE = {"klein": "klein", "mittel": "mittel", "gross": "groß"}
LOCH = {"loch-schwarz": "für Weiß auf Schwarz", "loch-weiss": "für Schwarz auf Weiß und Schwarz mit weißem Rand"}
KM = {f"{km:g}".replace(".", ",") + "-km": f"{km:g}".replace(".", ",") + " km" for km in [1.5, 2.5, 3.5, 5.5, 9]}
OPTIONEN = {
    "design": ("Design", DESIGN),
    "format": ("Format", FORMAT),
    "rahmen": ("Rahmen", RAHMEN),
    "massstab": ("Maßstab", KM),
    "strassennetz": ("Straßennetz", {"viel": "viele Straßen geschnitten", "ausgewogen": "ausgewogen", "wenig": "wenig geschnitten, viel Gravur"}),
    "standort-symbol": ("Standort-Symbol", SYMBOL),
    "symbolgroesse": ("Symbolgröße", GROESSE),
}
QUADRAT = "5 Quadrat 30 x 30 (eigener Artikel)"
MASKEN = "3 Masken transparent"
HOCH = os.path.join(STUDIO, "export", "produktfoto", "listing", "fotos", "hochskaliert")
# Marcel 17.09.2026: "noch etwas realistischer" – die fruehere Fassung mit den kraeftigeren Spiegelungen bleibt Alternative
HAUPTBILDER = {"01-hero-koeln-schwarz-echt-ultra-k4-a7-weiss.jpg": "A4 – Weiß auf Schwarz, Rahmen schwarz.jpg",
               "01-hero-koeln-schwarz-ultra-k4-a7-weiss.jpg": "A4 – Alternative mit stärkerer Spiegelung.jpg",
               "01-hero-koeln-schwarz-a3-echt-ultra-k4-a7-weiss.jpg": "A3 – Weiß auf Schwarz, Rahmen schwarz.jpg",
               "01-hero-koeln-schwarz-viel-echt-ultra-k4-a7-weiss.jpg": "A4 – viele Straßen geschnitten.jpg"}
VIDEO = os.path.join(STUDIO, "export", "produktfoto", "video")
VIDEOS = {"koeln-herz-zu-rahmen": "A4 – vom Herz zum ganzen Bild.mp4", "koeln-a3-herz-zu-rahmen": "A3 – vom Herz zum ganzen Bild.mp4",
          "koeln-flug-herz": "A4 – Nahflug um das Herz.mp4", "koeln-a3-flug-herz": "A3 – Nahflug um das Herz.mp4",
          "ad-koeln-a4": "Ad A4 – Nahflug und Dollyzoom, 15 s.mp4",
          "ad-koeln-a3": "Ad A3 – Nahflug und Dollyzoom, 15 s.mp4"}
TEILE = ["0 Hauptbild", "1 Vorschau ohne Text", "2 Optionen", MASKEN, "3 Erklärbild", "4 Erklärbild", "4 Explosionszeichnung", QUADRAT,
         "4 Quadrat 30 x 30 (eigener Artikel)", "Kontrollbilder Textfelder", "6 Video"]


def kopiere(von, nach):
    os.makedirs(os.path.dirname(nach), exist_ok=True)
    shutil.copyfile(von, nach)


def vorschau(quelle, ziel, formate):
    for f in formate:
        unter = os.path.join(ziel, FORMAT[f]) if len(formate) > 1 else ziel
        for datei in sorted(os.listdir(os.path.join(quelle, "vorschau", f))):
            name = DESIGN[datei[:-4]] + ".jpg"
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


def maskenname(art, stamm):
    if art == "rahmen":
        return RAHMEN[stamm]
    symbol, groesse, *loch = stamm.split("-", 2)
    return " – ".join([SYMBOL[symbol], GROESSE[groesse]] + ([LOCH[loch[0]]] if loch else []))


def masken(formate, ziel):
    """Rahmen und Symbole je Format als PNG mit transparentem Grund, 2000 px und 400 px."""
    for f in formate:
        unter = os.path.join(ziel, FORMAT[f]) if len(formate) > 1 else ziel
        for art, titel in [("rahmen", "Rahmen"), ("symbol", "Standort-Symbol")]:
            for datei in sorted(os.listdir(os.path.join(BILDER, "masken", f, art))):
                name = maskenname(art, datei[:-4]) + ".png"
                kopiere(os.path.join(BILDER, "masken", f, art, datei), os.path.join(unter, titel, name))
                kopiere(os.path.join(BILDER, "masken-400", f, art, datei), os.path.join(unter, titel, "400 px", name))


if __name__ == "__main__":
    for teil in TEILE:
        shutil.rmtree(os.path.join(ZIEL, teil), ignore_errors=True)
    for datei, name in HAUPTBILDER.items():
        kopiere(os.path.join(HOCH, datei), os.path.join(ZIEL, "0 Hauptbild", name))
    konfigurator, quadrat = os.path.join(BILDER, "konfigurator"), os.path.join(BILDER, "quadrat30")
    vorschau(konfigurator, os.path.join(ZIEL, "1 Vorschau ohne Text"), ["a5", "a4", "a3"])
    optionen(konfigurator, os.path.join(ZIEL, "2 Optionen"), True)
    masken(["a5", "a4", "a3"], os.path.join(ZIEL, MASKEN))
    vorschau(quadrat, os.path.join(ZIEL, QUADRAT, "1 Vorschau ohne Text"), ["quadrat30"])
    optionen(quadrat, os.path.join(ZIEL, QUADRAT, "2 Optionen"), False)
    masken(["quadrat30"], os.path.join(ZIEL, QUADRAT, MASKEN))
    for stamm, name in DESIGN.items():
        kopiere(os.path.join(QUELLE, "erklaerbild", stamm, "explosionszeichnung.jpg"), os.path.join(ZIEL, "4 Explosionszeichnung", name + ".jpg"))
    for clip, name in VIDEOS.items():
        kopiere(os.path.join(VIDEO, clip, clip + ".mp4"), os.path.join(ZIEL, "6 Video", name))
    for datei in ["textfelder.md", "textfelder.json"]:
        kopiere(os.path.join(QUELLE, datei), os.path.join(ZIEL, datei))
    kopiere(os.path.join(HIER, "UEBERSICHT.md"), os.path.join(ZIEL, "Übersicht.md"))
    print("Ordner:", ZIEL)
