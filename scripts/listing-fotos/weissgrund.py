#!/usr/bin/env python3
"""Amazon-Hauptbild auf reinweissen Grund bringen (Marcel 17.09.2026).

Amazon verlangt fuer das Hauptbild RGB 255, 255, 255. Leonardo legt das Produkt trotz "pure white background" auf ein
helles Grau (240-250), sobald der Prompt Softboxen fuer die Spiegelungen nennt. Das Produkt bleibt unberuehrt: Maske
ist in jeder Zeile alles zwischen dem aeussersten linken und rechten dunklen Rahmenpixel. Ausserhalb wird je Zeile auf
das Grau des Grundes normiert – der Grund wird 255, der weiche Kontaktschatten bleibt als Schatten erhalten.

Aufruf: python3 scripts/listing-fotos/weissgrund.py <eingabe.jpg> [ausgabe.jpg]   (ohne Ausgabe: <eingabe>-weiss.jpg)
Nur fuer Motive mit dunklem Rahmen rundum – ohne Rahmen findet die Maske die Produktkante nicht.
"""
import sys

import numpy as np
from PIL import Image, ImageFilter

DUNKEL = 80   # max(R, G, B) des Rahmens
RAND_PX = 3   # Kantenglaettung am Rahmen bleibt unberuehrt


def produktmaske(a):
    dunkel = a.max(axis=2) < DUNKEL
    maske = np.zeros(a.shape[:2], np.uint8)
    for y in np.nonzero(dunkel.sum(axis=1) >= 10)[0]:
        xs = np.nonzero(dunkel[y])[0]
        maske[y, xs.min():xs.max() + 1] = 255
    return np.asarray(Image.fromarray(maske).filter(ImageFilter.MaxFilter(2 * RAND_PX + 1))) > 0


def grauverlauf(grund):
    """Grau des Grundes je Zeile: helles Quantil, damit der Schatten nicht mitzieht; ueber 31 Zeilen geglaettet."""
    werte = np.array([np.nanpercentile(r, 80) if np.isfinite(r).sum() > 20 else np.nan for r in grund])
    ok = np.isfinite(werte)
    werte = np.interp(np.arange(len(werte)), np.nonzero(ok)[0], werte[ok])
    return np.convolve(np.pad(werte, 15, mode="edge"), np.ones(31) / 31, mode="valid")


def weiss_ziehen(bild, schatten=232, weiss_ab=248):
    """Fast-Weiss wird Weiss, echter Schatten (dunkler als `schatten`) bleibt, dazwischen linear. Nach dem
    Zeilenabgleich blieben Ecken und der Rand ueber dem Rahmen sonst bei 249-253 (Lichtabfall zur Seite)."""
    hell = bild.mean(axis=2, keepdims=True)
    ziel = np.where(hell >= weiss_ab, 255.0, np.where(hell <= schatten, hell,
                    schatten + (hell - schatten) * (255 - schatten) / (weiss_ab - schatten)))
    # Der Grund hat einen leichten Blaustich: nur heller skaliert blieben Rot und Gruen bei 253. Zum Weiss hin neutral.
    neutral = np.clip((ziel - schatten) / (255 - schatten), 0, 1)
    return np.clip(bild * ziel / np.maximum(hell, 1) * (1 - neutral) + ziel * neutral, 0, 255)


def weissgrund(pfad, ziel):
    a = np.asarray(Image.open(pfad).convert("RGB")).astype(float)
    produkt = produktmaske(a)
    zeilen = grauverlauf(np.where(produkt, np.nan, a.mean(axis=2)))
    weiss = weiss_ziehen(np.clip(a * (255 / zeilen)[:, None, None], 0, 255))
    aussen = Image.fromarray((~produkt * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(1.5))
    anteil = np.asarray(aussen).astype(float)[:, :, None] / 255
    Image.fromarray(np.clip(a * (1 - anteil) + weiss * anteil, 0, 255).astype(np.uint8)).save(ziel, quality=95)
    rand = np.concatenate([weiss[:8].reshape(-1, 3), weiss[-8:].reshape(-1, 3), weiss[:, :8].reshape(-1, 3), weiss[:, -8:].reshape(-1, 3)])
    return {"grau_zeilen": [round(float(zeilen.min())), round(float(zeilen.max()))], "rand_unter_250": int((rand.min(axis=1) < 250).sum())}


if __name__ == "__main__":
    eingabe = sys.argv[1]
    ausgabe = sys.argv[2] if len(sys.argv) > 2 else eingabe.rsplit(".", 1)[0] + "-weiss.jpg"
    print(ausgabe, weissgrund(eingabe, ausgabe))
