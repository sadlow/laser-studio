#!/usr/bin/env python3
"""Bilder fuer Amazon Custom (Marcel 16.09.2026): Vorschau ohne Text je Design und Rahmen,
dazu je Option ein Beispiel – alles Koeln am Rhein, gerade von vorn (3D-Motiv "layout").

Aufruf: python3 scripts/amazon-custom/bilder.py [gruppe ...]   (ohne Gruppe: alle)
Vorher: npx tsx scripts/amazon-custom/textfelder.ts. Der Dev-Server muss laufen.
Gruppen: kontrolle, vorschau, design, rahmen, format, massstab, strassennetz, symbol, symbolgroesse
"""
import json, os, subprocess, sys, urllib.parse
from PIL import Image, ImageDraw

STUDIO = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
ZIEL = os.path.join(STUDIO, "export", "amazon-custom")
PX = 2000
FELDER = {f["format"]: f for f in json.load(open(os.path.join(ZIEL, "textfelder.json")))["formate"]}
LAYOUTWERTE = json.load(open(os.path.join(ZIEL, "layoutwerte.json")))

TEXTE = {"adresse": "Koeln Altstadt", "titel": "Zuhause", "namen": "Lena & Jonas", "letzteZeile": "koordinaten", "ortText": "Köln"}
OHNE_TEXT = {"titel": "", "namen": "", "letzteZeile": "wunschtext", "wunschtext": ""}
DESIGNS = {"weiss-auf-schwarz": "netz-weiss", "schwarz-auf-weiss": "netz-schwarz-dreilagig", "schwarz-weisser-rahmen": "netz-schwarz"}
RAHMEN = ["ohne", "schwarz", "weiss", "eiche", "dunkelbraun"]
FORMATE = ["a5", "a4", "a3", "quadrat30"]
MASSSTAB_KM = [1.5, 2.5, 3.5, 5.5, 9]
STUFEN = ["viel", "ausgewogen", "wenig"]
SYMBOLE = ["herz", "haus", "pin", "kreuz"]
GROESSEN = ["klein", "mittel", "gross"]


def entwurf(format="a4", aufbau="netz-weiss", km=3.5, text=True, **kunde):
    texte = dict(TEXTE, **({} if text else OHNE_TEXT))
    return {"lon": 6.9607, "lat": 50.9384, "format": format, **LAYOUTWERTE[format], "aufbau": aufbau, "ausschnittKm": km,
            "kunde": {**texte, "holzrahmen": "ohne", "symbol": "herz", "symbolGroesse": "mittel", "strassenStufe": "ausgewogen", **kunde}}


def aufnehmen(name, e):
    teile = {"entwurf": json.dumps(e, ensure_ascii=False), "foto": "layout", "seiten": "1:1", "softboxen": "0", "grund": "ffffff"}
    subprocess.run(["bash", os.path.join(STUDIO, "scripts", "referenzbilder.sh"), f"amazon-{name}", urllib.parse.urlencode(teile, quote_via=urllib.parse.quote), str(PX), str(PX)],
                   check=True, stdout=subprocess.DEVNULL)
    quelle = os.path.join(STUDIO, "export", "produktfoto", "nah", f"amazon-{name}.png")
    bild = Image.open(quelle).convert("RGB")
    os.remove(quelle)
    return bild


def speichern(bild, gruppe, name, px=1000):
    ordner = os.path.join(ZIEL, "bilder", gruppe)
    os.makedirs(ordner, exist_ok=True)
    bild.resize((px, px), Image.LANCZOS).save(os.path.join(ordner, f"{name}.jpg"), quality=92)


def symbol_ausschnitt(bild, format="a4", seite_mm=70):
    """Quadrat um den Standort-Anker – gleich gross fuer alle Symbole, damit die Groessen vergleichbar sind."""
    f = FELDER[format]
    faktor = PX / 400
    x, y = f["symbolAnker"]["x"] * faktor, f["symbolAnker"]["y"] * faktor
    halb = seite_mm * f["pxProMm"] * faktor / 2
    return bild.crop((round(x - halb), round(y - halb), round(x + halb), round(y + halb)))


def gruppe(name):
    if name == "kontrolle":
        # Mit Beispieltext und den berechneten Feldern darueber: passen Container und Bild zusammen?
        for f in ["a4", "quadrat30"]:
            bild = aufnehmen(f"kontrolle-{f}", entwurf(format=f))
            d = ImageDraw.Draw(bild)
            faktor = PX / 400
            for t in FELDER[f]["felder"] or FELDER[f]["beispielZeilen"]:
                d.rectangle([t["x"] * faktor, t["y"] * faktor, (t["x"] + t["breite"]) * faktor, (t["y"] + t["hoehe"]) * faktor], outline=(230, 40, 30), width=3)
            speichern(bild, "kontrolle", f, 1600)
    elif name == "vorschau":
        for d, aufbau in DESIGNS.items():
            for r in RAHMEN:
                bild = aufnehmen(f"vorschau-{d}-{r}", entwurf(aufbau=aufbau, text=False, holzrahmen=r))
                speichern(bild, "vorschau", f"a4-{d}-rahmen-{r}", PX)
                speichern(bild, "vorschau-400", f"a4-{d}-rahmen-{r}", 400)
        for f in ["a5", "a3", "quadrat30"]:
            bild = aufnehmen(f"vorschau-{f}", entwurf(format=f, text=False))
            speichern(bild, "vorschau", f"{f}-weiss-auf-schwarz-rahmen-ohne", PX)
            speichern(bild, "vorschau-400", f"{f}-weiss-auf-schwarz-rahmen-ohne", 400)
    elif name == "design":
        for d, aufbau in DESIGNS.items():
            speichern(aufnehmen(f"design-{d}", entwurf(aufbau=aufbau)), "optionen/design", d)
    elif name == "rahmen":
        for r in RAHMEN:
            speichern(aufnehmen(f"rahmen-{r}", entwurf(holzrahmen=r)), "optionen/rahmen", r)
    elif name == "format":
        # Groessen im gleichen Massstab: das groesste Bildfeld fuellt die Kachel.
        gross = max(FELDER[f]["bildkanteMm"] for f in FORMATE)
        for f in FORMATE:
            bild = aufnehmen(f"format-{f}", entwurf(format=f))
            seite = round(1000 * FELDER[f]["bildkanteMm"] / gross)
            kachel = Image.new("RGB", (1000, 1000), (255, 255, 255))
            kachel.paste(bild.resize((seite, seite), Image.LANCZOS), ((1000 - seite) // 2, 1000 - seite))
            speichern(kachel, "optionen/format", f)
    elif name == "massstab":
        for km in MASSSTAB_KM:
            speichern(aufnehmen(f"massstab-{km}", entwurf(km=km)), "optionen/massstab", f"{str(km).replace('.', ',')}-km")
    elif name == "strassennetz":
        for s in STUFEN:
            speichern(aufnehmen(f"strassen-{s}", entwurf(strassenStufe=s)), "optionen/strassennetz", s)
    elif name == "symbol":
        for s in SYMBOLE:
            speichern(symbol_ausschnitt(aufnehmen(f"symbol-{s}", entwurf(symbol=s))), "optionen/standort-symbol", s, 600)
    elif name == "symbolgroesse":
        for g in GROESSEN:
            speichern(symbol_ausschnitt(aufnehmen(f"groesse-{g}", entwurf(symbolGroesse=g))), "optionen/symbolgroesse", g, 600)


if __name__ == "__main__":
    for n in sys.argv[1:] or ["kontrolle", "vorschau", "design", "rahmen", "format", "massstab", "strassennetz", "symbol", "symbolgroesse"]:
        print("Gruppe", n)
        gruppe(n)
