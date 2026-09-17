#!/usr/bin/env python3
"""Transparente Masken fuer Amazon Custom (Marcel 17.09.2026): Holzrahmen und Standort-Symbole als PNG, die
sich im Customizer ueber das Kartenbild legen, wenn die Option gewaehlt ist. Deckungsgleich mit bilder.py,
weil beide aus demselben Layoutmotiv kommen; das Symbol sitzt mittig auf dem Ort.

Je Maske zwei Aufnahmen, nur das Teil samt Schatten auf der Karte, vor Schwarz und vor Weiss (?nur=, maske-3d.ts).
Wie stark der weisse Grund durchscheint, ist die Transparenz.

Aufruf: python3 scripts/amazon-custom/masken.py [rahmen|symbol ...]   (ohne: beide)
Ergebnis: bilder/masken[-400]/<format>/rahmen/<farbe>.png und .../symbol/<symbol>-<groesse>.png
"""
import os, sys

import numpy as np
from PIL import Image

from bilder import FORMATE, GROESSEN, PX, SYMBOLE, ZIEL, aufnehmen, entwurf

FARBEN = ["schwarz", "weiss", "eiche", "dunkelbraun"]
# Durch das Loch des Pins sieht man den Hintergrund: schwarz bei Weiss auf Schwarz, weiss bei den beiden anderen Designs.
PIN_LOCH = {"loch-schwarz": "netz-weiss", "loch-weiss": "netz-schwarz-dreilagig"}


def maske(e, nur, **motiv):
    einstellung = {"nur": nur, "spiegel": "0", **motiv}
    schwarz = np.asarray(aufnehmen(e, grund="000000", **einstellung)).astype(float)
    weiss = np.asarray(aufnehmen(e, grund="ffffff", **einstellung)).astype(float)
    alpha = np.clip(1 - (weiss - schwarz).mean(axis=2) / 255, 0, 1)
    farbe = np.clip(schwarz / np.maximum(alpha, 1e-3)[..., None], 0, 255)
    return Image.fromarray(np.dstack([farbe, alpha * 255]).round().astype(np.uint8), "RGBA")


def speichern(bild, pfad):
    # Vormultipliziert verkleinern: sonst ziehen die unsichtbaren Randpixel einen dunklen Saum ins Bild.
    for px, ordner in [(PX, "masken"), (400, "masken-400")]:
        datei = os.path.join(ZIEL, "bilder", ordner, pfad + ".png")
        os.makedirs(os.path.dirname(datei), exist_ok=True)
        klein = bild if px == bild.width else bild.convert("RGBa").resize((px, px), Image.LANCZOS).convert("RGBA")
        klein.save(datei, optimize=True)


def masken(art, formate):
    for f in formate:
        if art == "rahmen":
            for farbe in FARBEN:
                speichern(maske(entwurf(format=f, holzrahmen=farbe), "rahmen"), f"{f}/rahmen/{farbe}")
            continue
        for s in SYMBOLE:
            for g in GROESSEN:
                if s != "pin":
                    speichern(maske(entwurf(format=f, mit_symbol=True, symbol=s, symbolGroesse=g), "symbol"), f"{f}/symbol/{s}-{g}")
                    continue
                for loch, aufbau in PIN_LOCH.items():
                    speichern(maske(entwurf(format=f, aufbau=aufbau, mit_symbol=True, symbol=s, symbolGroesse=g), "symbol"), f"{f}/symbol/{s}-{g}-{loch}")


if __name__ == "__main__":
    for art in sys.argv[1:] or ["rahmen", "symbol"]:
        print("Masken", art, flush=True)
        masken(art, FORMATE + ["quadrat30"])
