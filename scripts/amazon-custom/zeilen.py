"""Untertitelzeilen auf der schwarzen Schriftplatte der Explosionszeichnung (Marcel 17.09.2026).

Schraeg gesehen sind die kleinen Buchstaben im 3 mm dicken schwarzen Acryl fast geschlossen: das 3D-Modell zeigt nur
Glanzpunkte, Leonardo macht daraus Striche oder laesst die Zeilen weg. Am fertigen Stueck stehen sie weiss auf schwarz
(die weisse Lage scheint durch), und im Listing-Bild sollen sie lesbar sein ("die schwarze Deckschicht hat gar keine
Untertitelzeilen"). Die Zeilen kommen darum aus der Frontansicht desselben Entwurfs und werden ueber die vier
Plattenecken perspektivisch auf die Platte im Endbild gelegt. Der Bereich darunter wird vorher aus der umgebenden
Platte neu gefuellt – so verschwinden erfundene Striche, und der Schritt darf beliebig oft laufen.
"""
import numpy as np
from PIL import Image, ImageFilter

from bilder import FELDER, aufnehmen

DUNKEL = 60        # max(R, G, B) der schwarzen Platte
HELLIGKEIT = 0.85  # Anteil der hellen Titelkanten: lesbar, aber nicht wie aufgedruckt
ZEILEN = ["Namen", "Letzte Zeile"]


def fuellen(F, bereich):
    """Bereich spaltenweise zwischen der Platte direkt darueber und darunter verlaufen lassen, dann waagerecht
    glaetten. Ein Mittel aus weiterem Umkreis wurde sichtbar dunkler als der Glanz der Platte ringsum."""
    neu = F.copy()
    platte = F.max(axis=2) < DUNKEL
    for x in np.nonzero(bereich.any(0))[0]:
        ys = np.nonzero(bereich[:, x])[0]
        o, u = ys.min(), ys.max()
        rand = [F[s, x][platte[s, x]] for s in (slice(max(o - 6, 0), o), slice(u + 1, u + 7))]
        oben, unten = [r.mean(axis=0) if len(r) else None for r in rand]
        oben, unten = (oben if oben is not None else unten), (unten if unten is not None else oben)
        if oben is None:
            continue
        t = np.linspace(0, 1, u - o + 1)[:, None]
        neu[o:u + 1, x] = oben * (1 - t) + unten * t
    kern = np.ones(9) / 9
    glatt = np.stack([np.apply_along_axis(lambda z: np.convolve(z, kern, mode="same"), 1, neu[:, :, k]) for k in range(3)], 2)
    glatt += np.random.default_rng(1).normal(0, 1, F.shape[:2])[:, :, None]
    return np.where(bereich[:, :, None], glatt, F)


def gerade(t, w):
    """w = a * t + b; Ausreisser (Schnittkanten im Netz, Glanzpunkte) fallen schrittweise heraus."""
    ok = np.ones(len(t), bool)
    for _ in range(4):
        a, b = np.polyfit(t[ok], w[ok], 1)
        rest = np.abs(a * t + b - w)
        ok = rest <= max(1.5, 2.5 * np.median(rest[ok]))
        if ok.sum() < 20:
            raise ValueError("Plattenkante nicht gefunden")
    return a, b


def schwarz(bild):
    """Schwarze Platte – ohne das tiefe Blau im Schatten des Spiegels, das ist ebenso dunkel."""
    a = np.asarray(bild).astype(int)
    return (a.max(axis=2) < DUNKEL) & (a[:, :, 2] - a[:, :, 0] < 15)


def ecken(bild):
    """Ecken der schwarzen Platte (oben links, oben rechts, unten rechts, unten links) als Schnittpunkte der
    Kantengeraden. Gemessen wird nur die Mitte jeder Kante – die gerundeten Ecken bleiben aussen vor."""
    d = schwarz(bild)

    def kante(m, hinten):
        i = m.shape[1] - 1 - m[:, ::-1].argmax(1) if hinten else m.argmax(1)
        t = np.nonzero(m.sum(1) >= 20)[0]
        t = t[len(t) // 5: len(t) - len(t) // 5]
        return gerade(t, i[t])

    (a1, b1), (a2, b2) = kante(d, False), kante(d, True)        # links, rechts: x = a * y + b
    (a3, b3), (a4, b4) = kante(d.T, False), kante(d.T, True)    # oben, unten:   y = a * x + b

    def schnitt(a, b, c, e):
        y = (c * b + e) / (1 - a * c)
        return a * y + b, y
    return [schnitt(a1, b1, a3, b3), schnitt(a2, b2, a3, b3), schnitt(a2, b2, a4, b4), schnitt(a1, b1, a4, b4)]


def homographie(von, nach):
    A, v = [], []
    for (x, y), (u, w) in zip(von, nach):
        A += [[x, y, 1, 0, 0, 0, -u * x, -u * y], [0, 0, 0, x, y, 1, -w * x, -w * y]]
        v += [u, w]
    return np.append(np.linalg.solve(np.array(A, float), np.array(v, float)), 1).reshape(3, 3)


def uebertragen(flaeche, H, groesse):
    """Flaeche (0..1) aus der Frontansicht ins Endbild, doppelt aufgeloest gerechnet gegen Treppenkanten."""
    Hi = np.linalg.inv(np.diag([2, 2, 1]) @ H)
    Hi /= Hi[2, 2]
    b = Image.fromarray((np.clip(flaeche, 0, 1) * 255).astype(np.uint8))
    b = b.transform((groesse[0] * 2, groesse[1] * 2), Image.PERSPECTIVE, tuple(Hi.flatten()[:8]), Image.BICUBIC)
    return np.asarray(b.resize(groesse, Image.LANCZOS)).astype(float) / 255


def kasten(format, namen, px, rand):
    """Rechteck um die Beispielzeilen (Container 400 px) in Pixeln der Frontansicht."""
    z = [t for t in FELDER[format]["beispielZeilen"] if t["name"] in namen]
    f = px / 400
    m = np.zeros((px, px))
    m[round((min(t["y"] for t in z) - rand) * f):round((max(t["y"] + t["hoehe"] for t in z) + rand) * f),
      round((min(t["x"] for t in z) - rand) * f):round((max(t["x"] + t["breite"] for t in z) + rand) * f)] = 1
    return m


def zeilen_einsetzen(e, pfad):
    """Setzt die Zeilen des Entwurfs e in das Bild unter pfad (ueberschreibt es) und gibt Messwerte zurueck."""
    front, ziel = aufnehmen(e), Image.open(pfad).convert("RGB")
    fa, F = np.asarray(front).astype(float), np.asarray(ziel).astype(float)
    von, nach = ecken(front), ecken(ziel)
    H, px = homographie(von, nach), fa.shape[0]
    hell = np.clip((fa.mean(axis=2) - 60) / 150, 0, 1)

    F = fuellen(F, uebertragen(kasten(e["format"], ZEILEN, px, 4), H, ziel.size) > 0.02)

    titel = uebertragen(kasten(e["format"], ["Titel"], px, 2), H, ziel.size) > 0.5
    kanten = titel & (F.mean(axis=2) > 110)
    farbe = np.median(F[kanten], axis=0) if kanten.sum() > 200 else np.array([219.0, 211.0, 199.0])
    zeilen = uebertragen(hell * kasten(e["format"], ZEILEN, px, 3), H, ziel.size)
    weich = Image.fromarray((np.clip(zeilen * 1.1, 0, 1) * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.5))
    alpha = np.asarray(weich).astype(float)[:, :, None] / 255 * 0.9
    F = F * (1 - alpha) + farbe * HELLIGKEIT * alpha
    Image.fromarray(np.clip(F, 0, 255).astype(np.uint8)).save(pfad, quality=95)
    return {"ecken_front": np.round(von, 1).tolist(), "ecken_bild": np.round(nach, 1).tolist(), "farbe": np.round(farbe).tolist()}
