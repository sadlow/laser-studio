#!/usr/bin/env python3
"""Echte Schrift ins KI-Foto: Stencil-Stege und Schriftbild aus dem 3D-Modell statt aus dem Bildmodell.

Aufruf: python3 scripts/listing-fotos/schrift_einsetzen.py <foto-name> [...]
Liest fotos/<name>.jpg und die frontale Aufnahme referenzen/<vorlage>.png (aufnahmen.py),
schreibt fotos/<name>-schrift.jpg und kontrolle-schrift-<name>.jpg mit den gemessenen Kanten.

Marcel 16.09.2026: "beim Parisbild sind die Stencils noch immer weg". In der Szene ist
ein 0,5-mm-Steg kaum ein Pixel breit; das Bildmodell zeichnet die Buchstaben geschlossen,
auch mit Beschreibung und zweiter Referenz, und setzt sie groesser als das Produkt.
Darum: KI-Schrift aus dem Textfeld entfernen, die Schlitze der frontalen 3D-Aufnahme
perspektivisch einpassen (vier Ecken des Textfelds) und mit dem Licht des Fotos abdunkeln.
"""
import os, sys

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

HIER = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "export", "produktfoto", "listing")

# Ecken des sichtbaren Textfelds, grob (links oben, rechts oben, rechts unten, links unten);
# nachgemessen wird an den Kanten. Oben begrenzt die Karte, sonst die Rahmenlippe.
EINSETZEN = {
    "lifestyle-paris-antrag": {
        "vorlage": "paris-schrift-frontal",
        "vorlage_ecken": [(605, 1440), (1815, 1440), (1815, 1997), (605, 1997)],
        "foto_ecken": [(283, 672), (752, 652), (768, 882), (287, 918)],
        # Wo KI-Schrift und echte Schrift liegen – ohne Rosen (links), Kerze und Ringschachtel (unten rechts)
        "textzone": [(383, 668), (692, 650), (692, 822), (680, 826), (680, 884), (383, 884)],
    },
}


def luma(bild):
    return bild[..., 0] * 0.299 + bild[..., 1] * 0.587 + bild[..., 2] * 0.114


def kante(L, a, b, art, fenster):
    """Punkte einer Kante zwischen den groben Ecken a und b. art: oben/unten (Spalten) oder links/rechts (Zeilen)."""
    punkte = []
    for t in np.linspace(0.1, 0.9, 60):
        x0, y0 = a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t
        if art in ("oben", "unten"):
            x, y = int(round(x0)), int(round(y0))
            profil, start = L[y - fenster:y + fenster, x], y - fenster
        else:
            x, y = int(round(x0)), int(round(y0))
            profil, start = L[y, x - fenster:x + fenster], x - fenster
        hell, dunkel = np.percentile(profil, 90), np.percentile(profil, 10)
        if hell - dunkel < 40:
            continue
        schwelle = (hell + dunkel) / 2
        d = profil < schwelle
        # oben/links: das Feld liegt dahinter -> letzter Wechsel dunkel->hell; unten/rechts: erster hell->dunkel
        wechsel = np.nonzero(d[:-1] & ~d[1:])[0] if art in ("oben", "links") else np.nonzero(~d[:-1] & d[1:])[0]
        if not len(wechsel):
            continue
        i = wechsel[-1] if art in ("oben", "links") else wechsel[0]
        pos = start + i + (schwelle - profil[i]) / (profil[i + 1] - profil[i])
        punkte.append((x, pos) if art in ("oben", "unten") else (pos, y))
    return np.array(punkte)


def gerade(punkte, waagerecht):
    """Robuste Gerade: y = m x + c (waagerecht) oder x = m y + c. Strassen, die ins Feld laufen, fallen heraus."""
    u, v = (punkte[:, 0], punkte[:, 1]) if waagerecht else (punkte[:, 1], punkte[:, 0])
    behalten = np.ones(len(u), bool)
    for _ in range(4):
        m, c = np.polyfit(u[behalten], v[behalten], 1)
        rest = np.abs(v - (m * u + c))
        behalten = rest < max(1.0, 2.5 * np.median(rest[behalten]))
    return m, c, behalten.sum()


def ecken_messen(L, grob, fenster):
    lo, ro, ru, lu = grob
    oben = gerade(kante(L, lo, ro, "oben", fenster), True)
    unten = gerade(kante(L, lu, ru, "unten", fenster), True)
    links = gerade(kante(L, lo, lu, "links", fenster), False)
    rechts = gerade(kante(L, ro, ru, "rechts", fenster), False)

    def schnitt(h, s):
        # y = mh x + ch, x = ms y + cs
        y = (h[0] * s[1] + h[1]) / (1 - h[0] * s[0])
        return (s[0] * y + s[1], y)

    return [schnitt(oben, links), schnitt(oben, rechts), schnitt(unten, rechts), schnitt(unten, links)], (oben, unten, links, rechts)


def homographie(von, nach):
    A = []
    for (x, y), (u, v) in zip(von, nach):
        A += [[x, y, 1, 0, 0, 0, -u * x, -u * y], [0, 0, 0, x, y, 1, -v * x, -v * y]]
    h = np.linalg.solve(np.array(A, float), np.array(nach, float).ravel())
    return np.append(h, 1).reshape(3, 3)


def weichzeichnen(a, r):
    """Box-Blur, dreimal – annaehernd Gauss, nur numpy."""
    for achse in (0, 1):
        for _ in range(3):
            k = np.cumsum(np.pad(a, [(r + 1, r) if i == achse else (0, 0) for i in range(a.ndim)], mode="edge"), axis=achse)
            a = (np.take(k, range(2 * r + 1, k.shape[achse]), axis=achse) - np.take(k, range(0, k.shape[achse] - 2 * r - 1), axis=achse)) / (2 * r + 1)
    return a


def maske_im_viereck(form, ecken, einzug):
    m = Image.new("L", (form[1], form[0]), 0)
    mitte = np.mean(ecken, axis=0)
    innen = [tuple(mitte + (np.array(e) - mitte) * (1 - einzug / max(1, np.linalg.norm(np.array(e) - mitte)))) for e in ecken]
    ImageDraw.Draw(m).polygon(innen, fill=255)
    return np.asarray(m) > 0


def einsetzen(name):
    cfg = EINSETZEN[name]
    foto = np.asarray(Image.open(os.path.join(HIER, "fotos", name + ".jpg")).convert("RGB")).astype(float)
    vorlage = np.asarray(Image.open(os.path.join(HIER, "referenzen", cfg["vorlage"] + ".png")).convert("RGB")).astype(float)
    Lf, Lv = luma(foto), luma(vorlage)
    ecken_f, kanten_f = ecken_messen(weichzeichnen(Lf, 1), cfg["foto_ecken"], 14)
    ecken_v, _ = ecken_messen(Lv, cfg["vorlage_ecken"], 30)
    print("Foto-Ecken", np.round(ecken_f, 1).tolist(), "Vorlage-Ecken", np.round(ecken_v, 1).tolist())

    # Schlitze der Vorlage: dunkel im grauen Feld, 0..1
    feld_v = maske_im_viereck(Lv.shape, ecken_v, 25)
    grau = np.median(Lv[feld_v])
    schlitz = np.clip((grau - 12 - Lv) / (grau - 12 - np.percentile(Lv[feld_v & (Lv < grau - 60)], 20)), 0, 1) * feld_v

    # Rueckwaerts abbilden: Fotopixel -> Vorlage, 4x4 Unterabtastung gegen Treppen
    H = homographie(ecken_v, ecken_f)
    Hi = np.linalg.inv(H)
    feld_f = maske_im_viereck(Lf.shape, ecken_f, 3)
    ys, xs = np.nonzero(feld_f)
    M = np.zeros(Lf.shape)
    for dy in (0.125, 0.375, 0.625, 0.875):
        for dx in (0.125, 0.375, 0.625, 0.875):
            p = Hi @ np.vstack([xs + dx - 0.5, ys + dy - 0.5, np.ones(len(xs))])
            u, v = p[0] / p[2], p[1] / p[2]
            x0, y0 = np.clip(np.floor(u).astype(int), 0, schlitz.shape[1] - 2), np.clip(np.floor(v).astype(int), 0, schlitz.shape[0] - 2)
            fx, fy = np.clip(u - x0, 0, 1), np.clip(v - y0, 0, 1)
            wert = (schlitz[y0, x0] * (1 - fx) * (1 - fy) + schlitz[y0, x0 + 1] * fx * (1 - fy)
                    + schlitz[y0 + 1, x0] * (1 - fx) * fy + schlitz[y0 + 1, x0 + 1] * fx * fy)
            M[ys, xs] += wert / 16

    # Nur in der Textzone: im Feld stehen auch Rosen, Kerze und Ringschachtel davor. Ohne
    # Zone wurden sie als "dunkle Schrift" erkannt und weichgezeichnet.
    zone_bild = Image.new("L", (Lf.shape[1], Lf.shape[0]), 0)
    ImageDraw.Draw(zone_bild).polygon(cfg["textzone"], fill=255)
    feld_ki = maske_im_viereck(Lf.shape, ecken_f, 6) & (np.asarray(zone_bild) > 0)
    M *= feld_ki

    # KI-Schrift entfernen: dunkler als die hellste Umgebung, etwas aufgeweitet, dann aus der Umgebung auffuellen
    hell = np.asarray(Image.fromarray(Lf.astype(np.uint8)).filter(ImageFilter.MaxFilter(15))).astype(float)
    ki = ((hell - Lf) > 22) & feld_ki
    ki = np.asarray(Image.fromarray((ki * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(5))) > 0
    ki &= feld_ki
    gewicht = (~ki & feld_ki).astype(float)
    glatt = np.stack([weichzeichnen(foto[..., c] * gewicht, 6) for c in range(3)], -1) / np.maximum(weichzeichnen(gewicht, 6), 1e-4)[..., None]
    rauschen = np.std((foto - np.stack([weichzeichnen(foto[..., c], 1) for c in range(3)], -1))[gewicht > 0], axis=0)
    rng = np.random.default_rng(4711)
    frei = np.where(ki[..., None], glatt + rng.normal(0, 1, foto.shape) * rauschen, foto)

    # Schlitz: Anteil der Feldhelligkeit, der durch die Schlitze kommt (schwarzes Acryl). Eine
    # angedeutete helle Schnittwand in jedem Schlitz machte die 1-2 px breiten Striche nur grau.
    k = cfg.get("schlitz", 0.1)
    print(f"KI-Schrift: {ki.sum()} px entfernt, Schlitzhelligkeit {k:.2f}")
    ergebnis = np.clip(frei * (1 - M[..., None] * (1 - k)), 0, 255).astype(np.uint8)
    Image.fromarray(ergebnis).save(os.path.join(HIER, "fotos", name + "-schrift.jpg"), quality=95)

    kontrolle = Image.fromarray(ergebnis)
    zeichnen = ImageDraw.Draw(kontrolle)
    zeichnen.polygon([tuple(e) for e in ecken_f], outline=(0, 255, 0))
    zeichnen.polygon(cfg["textzone"], outline=(255, 200, 0))
    kontrolle.save(os.path.join(HIER, f"kontrolle-schrift-{name}.jpg"), quality=92)


if __name__ == "__main__":
    for n in sys.argv[1:] or EINSETZEN:
        einsetzen(n)
