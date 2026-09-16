#!/usr/bin/env python3
"""Beschriftung der Explosionszeichnung (Marcel 16.09.2026: Erklaerbild, "damit jeder versteht, was er kauft").

Aufruf: python3 scripts/listing-fotos/explosion_beschriften.py
Liest fotos/hochskaliert/08-explosion-koeln-ultra-k4-a7.jpg, schreibt fotos/08-explosion-koeln-beschriftet.jpg.
Das Bildmodell erfindet Schrift; darum kommen Namen, Material und Staerke erst hier dazu. Die Ankerpunkte
gelten fuer genau dieses Bild (Koordinaten auf 1024 px) – nach einer neuen Generierung nachmessen.
"""
import os
from PIL import Image, ImageDraw, ImageFont

HIER = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "export", "produktfoto", "listing", "fotos")
SCHRIFT = "/System/Library/Fonts/Avenir Next.ttc"
FARBE = (42, 38, 34)

# (Anker auf dem Bauteil, Textanfang, Ausrichtung, Zeilen) – Material und Staerke wie in der Engine
BESCHRIFTUNG = [
    ((300, 480), (238, 452), "rechts", ["Herz", "rotes Spiegelacryl, 3 mm", "markiert deinen Ort"]),
    ((290, 770), (238, 742), "rechts", ["Straßen und Schrift", "weißes Acrylglas, 2 mm,", "lasergeschnitten"]),
    ((705, 815), (640, 880), "links", ["Hintergrund", "schwarzes Acrylglas, 2 mm,", "feine Wege graviert"]),
    ((840, 205), (640, 34), "links", ["Wasser", "blaues Spiegelacryl, 3 mm"]),
]
FUSSNOTE = "Holzrahmen optional wählbar: Schwarz, Weiß, Dunkelbraun oder Eiche"


def schrift(groesse, fett=False):
    # Avenir Next.ttc: Index 2 Demi Bold, 7 Regular (0 ist Bold)
    return ImageFont.truetype(SCHRIFT, groesse, index=2 if fett else 7)


if __name__ == "__main__":
    bild = Image.open(os.path.join(HIER, "hochskaliert", "08-explosion-koeln-ultra-k4-a7.jpg")).convert("RGB")
    s = bild.width / 1024
    d = ImageDraw.Draw(bild)
    titel, zeile = schrift(round(19 * s), True), schrift(round(15 * s))
    for (ax, ay), (tx, ty), ausrichtung, zeilen in BESCHRIFTUNG:
        hoehen = [round(24 * s)] + [round(19 * s)] * (len(zeilen) - 1)
        y = ty * s
        breite = max(d.textlength(z, font=titel if i == 0 else zeile) for i, z in enumerate(zeilen))
        for i, z in enumerate(zeilen):
            f = titel if i == 0 else zeile
            x = tx * s - d.textlength(z, font=f) if ausrichtung == "rechts" else tx * s
            d.text((x, y), z, font=f, fill=FARBE)
            y += hoehen[i]
        # Fuehrungslinie vom Text zum Bauteil
        if ausrichtung == "rechts":
            start = (tx * s + 8 * s, ty * s + 12 * s)
        elif ay < ty:
            start = (tx * s + 18 * s, ty * s - 6 * s)
        else:
            start = (tx * s + breite + 10 * s, ty * s + 12 * s)
        d.line([start, (ax * s, ay * s)], fill=FARBE, width=max(2, round(1.3 * s)))
        r = 4 * s
        d.ellipse([ax * s - r, ay * s - r, ax * s + r, ay * s + r], fill=FARBE)
    fuss = schrift(round(14 * s))
    d.text(((bild.width - d.textlength(FUSSNOTE, font=fuss)) / 2, 985 * s), FUSSNOTE, font=fuss, fill=FARBE)
    bild.save(os.path.join(HIER, "08-explosion-koeln-beschriftet.jpg"), quality=93)
    print("gespeichert", bild.size)
