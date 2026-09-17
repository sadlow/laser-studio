"""Gravur zurueck ins Endbild der Video-Ads (Marcel 17.09.2026: "beim Rauszoomen verschwinden die gravierten Strassen").

In der Totale wird die Gravur bei A3 schmaler als ein Pixel. Leonardo glaettet sie zu Schwarz – auch wenn der Prompt
sie ausdruecklich verlangt –, und Veo blendet sie beim Herauszoomen aus. Die Linien kommen darum aus einem 4K-Rendering
derselben Kamera: grau auf Schwarz, rundum von Schwarz umgeben (Kantenglaettung der weissen Strassen, die Uferkante
und Schatten auf dem weissen Grund sind auch grau, liegen aber an Weiss oder Blau). Eingesetzt nur, wo das Foto dunkel ist.

Ausrichtung: Leonardo haelt die Perspektive nicht sicher ein (A3: im Foto sieht man die linke Rahmenseite, im
Rendering die rechte). Die Rahmenecken geben darum nur den Start; danach wandern die vier Ecken, bis die weissen
Strassen beider Bilder am besten uebereinanderliegen.
"""
import os, sys

import numpy as np
from PIL import Image, ImageFilter

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "amazon-custom"))
from zeilen import ecken, homographie, uebertragen  # noqa: E402

FARBE = np.array([185.0, 182.0, 174.0])  # GRAVUR_AUF_SCHWARZ aus stapel.ts
STAERKE = 0.85
KLEIN = 4  # Ausrichtung auf einem Viertel der Fotogroesse


def filter_maske(maske, filt):
    return np.asarray(Image.fromarray((maske * 255).astype(np.uint8)).filter(filt)).astype(float) / 255


def gravurmaske(render):
    a = np.asarray(render).astype(float)
    hell, spanne = a.mean(axis=2), a.max(axis=2) - a.min(axis=2)
    an_rand = filter_maske((hell > 190) | (a[:, :, 2] - a[:, :, 0] > 40), ImageFilter.MaxFilter(9)) > 0
    umgebung = filter_maske(hell < 40, ImageFilter.BoxBlur(4))
    linie = (hell > 55) & (hell < 190) & (spanne < 35) & ~an_rand & (umgebung > 0.4)
    return np.clip((hell - 40) / 110, 0, 1) * linie


def strassen(bild, groesse):
    """Nur schmales Weiss: grosse weisse Flaechen (Grund, Schriftfeld) wuerden die Deckung sonst immer hoch aussehen lassen."""
    a = np.asarray(bild.resize(groesse, Image.BILINEAR)).astype(float)
    weiss = (a.mean(axis=2) > 170) & (a.max(axis=2) - a.min(axis=2) < 40)
    schmal = weiss & (filter_maske(weiss, ImageFilter.BoxBlur(4)) < 0.7)
    return filter_maske(schmal, ImageFilter.GaussianBlur(1.5))


def ausrichten(render, foto):
    """Ecken im Foto so verschieben, dass die Strassen des Renderings auf denen des Fotos liegen."""
    von, start = np.array(ecken(render)), np.array(ecken(foto))
    klein = (foto.size[0] // KLEIN, foto.size[1] // KLEIN)
    ziel, quelle = strassen(foto, klein), strassen(render, (render.size[0] // KLEIN, render.size[1] // KLEIN))
    von_k = von / KLEIN

    def guete(nach):
        warp = uebertragen(quelle, homographie(von_k, nach), klein)
        return (warp * ziel).sum() / np.sqrt((warp ** 2).sum() * (ziel ** 2).sum() + 1e-9)

    nach, beste = start / KLEIN, None
    beste = guete(nach)
    for schritt in [6, 3, 1.5, 0.75]:
        besser = True
        while besser:
            besser = False
            for i in range(8):
                for d in (schritt, -schritt):
                    probe = nach.copy().reshape(-1)
                    probe[i] += d
                    wert = guete(probe.reshape(4, 2))
                    if wert > beste:
                        nach, beste, besser = probe.reshape(4, 2), wert, True
    return von, nach * KLEIN, beste


def gravur_einsetzen(foto_pfad, render_pfad):
    """Setzt die Gravur aus render_pfad (4K) in foto_pfad ein (ueberschreibt) und gibt die Ausrichtung zurueck."""
    foto, render = Image.open(foto_pfad).convert("RGB"), Image.open(render_pfad).convert("RGB")
    von, nach, guete = ausrichten(render, foto)
    maske = uebertragen(gravurmaske(render), homographie(von, nach), foto.size)
    f = np.asarray(foto).astype(float)
    # Auch auf glaenzendem Grau (Softbox-Reflex im Schwarz) – dort ist die Gravur am echten Stueck ebenso zu sehen
    alpha = (maske * np.clip((130 - f.mean(axis=2)) / 60, 0, 1) * STAERKE)[:, :, None]
    Image.fromarray(np.clip(f * (1 - alpha) + FARBE * alpha, 0, 255).astype(np.uint8)).save(foto_pfad, quality=95)
    return {"ecken_render": np.round(von, 1).tolist(), "ecken_foto": np.round(nach, 1).tolist(), "deckung": round(float(guete), 3)}
