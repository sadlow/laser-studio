#!/usr/bin/env python3
"""Kartenbilder fuer Amazon Custom (Marcel 16./17.09.2026) – Koeln am Rhein, gerade von vorn (3D-Motiv "layout").

Ohne Text und ohne Symbol: Titel und Zeilen setzt der Amazon Customizer, Rahmen und Standort-Symbol legen
sich als transparente Masken darueber (masken.py) – das Symbol immer mittig, dort wo der Ort liegt. Mit
Symbol und Text nur die Kontrollbilder (Textfelder pruefen) und die Ausschnitte fuer die Symbolgroesse.

Jedes Format fuellt seine Kachel, die Vorschau ist oft nur 400 px gross: zwischen A5, A4 und A3 aendern
sich nur das Layout und die Rahmenstaerke im Verhaeltnis zur Platte. Rahmen und Massstab darum je Format.
30 x 30 wird ein eigener Artikel mit eigenen Bildern (Gruppe quadrat).

Aufruf: python3 scripts/amazon-custom/bilder.py [gruppe ...]   (ohne Gruppe: alle)
Vorher: npx tsx scripts/amazon-custom/textfelder.ts. Der Dev-Server muss laufen.
Gruppen: kontrolle, vorschau, design, format, rahmen, massstab, strassennetz, symbolgroesse, quadrat
"""
import atexit, json, os, shutil, subprocess, sys, tempfile, urllib.parse
from PIL import Image, ImageDraw

STUDIO = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
ZIEL = os.path.join(STUDIO, "export", "amazon-custom")
PX = 2000
FELDER = {f["format"]: f for f in json.load(open(os.path.join(ZIEL, "textfelder.json")))["formate"]}
LAYOUTWERTE = json.load(open(os.path.join(ZIEL, "layoutwerte.json")))

KOELN = {"lon": 6.9607, "lat": 50.9384}
TEXTE = {"adresse": "Koeln Altstadt", "titel": "Zuhause", "namen": "Lena & Jonas", "letzteZeile": "koordinaten", "ortText": "Köln"}
OHNE_TEXT = {"titel": "", "namen": "", "letzteZeile": "wunschtext", "wunschtext": ""}
DESIGNS = {"weiss-auf-schwarz": "netz-weiss", "schwarz-auf-weiss": "netz-schwarz-dreilagig", "schwarz-weisser-rahmen": "netz-schwarz"}
RAHMEN = ["ohne", "schwarz", "weiss", "eiche", "dunkelbraun"]
# Im Konfigurator; das Quadrat ist ein eigener Artikel (Marcel 17.09.2026)
FORMATE = ["a5", "a4", "a3"]
MASSSTAB_KM = [1.5, 2.5, 3.5, 5.5, 9]
STUFEN = ["viel", "ausgewogen", "wenig"]
SYMBOLE = ["herz", "haus", "pin", "kreuz"]
GROESSEN = ["klein", "mittel", "gross"]
GRUPPEN = ["kontrolle", "vorschau", "design", "format", "rahmen", "massstab", "strassennetz", "symbolgroesse", "quadrat"]

# Viele Bilder zeigen denselben Entwurf (A4 bei 3,5 km ist Vorschau-, Design-, Format-, Rahmen-, Massstabs-
# und Strassennetzbild): je Lauf nur einmal rendern. Kein Zwischenspeicher ueber den Lauf hinaus – nach
# einer Aenderung an der Engine waere er still veraltet.
ROH = tempfile.mkdtemp(prefix="amazon-custom-")
atexit.register(shutil.rmtree, ROH, True)
GERENDERT = {}


def entwurf(format="a4", aufbau="netz-weiss", km=3.5, text=False, mit_symbol=False, **kunde):
    """Karte um Koeln. Ohne Symbol liegt der Ort ausserhalb des Ausschnitts: kein Symbol, kein Ausschnitt im Netz."""
    ort = KOELN if mit_symbol else {"lon": KOELN["lon"] + 0.6, "lat": KOELN["lat"]}
    texte = dict(TEXTE, **({} if text else OHNE_TEXT))
    return {**ort, "kartenMitte": KOELN, "format": format, **LAYOUTWERTE[format], "aufbau": aufbau, "ausschnittKm": km,
            "kunde": {**texte, "holzrahmen": "ohne", "symbol": "herz", "symbolGroesse": "mittel", "strassenStufe": "ausgewogen", **kunde}}


def aufnehmen(e, px=PX, **einstellung):
    """3D-Aufnahme ueber referenzbilder.sh. Standard: Layoutmotiv auf Weiss; grund=None laesst die Kulisse stehen."""
    teile = {"entwurf": json.dumps(e, ensure_ascii=False), "foto": "layout", "seiten": "1:1", "softboxen": "0", "grund": "ffffff", **einstellung}
    query = urllib.parse.urlencode({k: v for k, v in teile.items() if v is not None}, quote_via=urllib.parse.quote)
    if (query, px) not in GERENDERT:
        name = f"amazon-custom-{os.getpid()}"
        subprocess.run(["bash", os.path.join(STUDIO, "scripts", "referenzbilder.sh"), name, query, str(px), str(px)], check=True, stdout=subprocess.DEVNULL)
        quelle = os.path.join(STUDIO, "export", "produktfoto", "nah", f"{name}.png")
        GERENDERT[(query, px)] = shutil.move(quelle, os.path.join(ROH, f"{len(GERENDERT)}.png"))
    return Image.open(GERENDERT[(query, px)]).convert("RGB")


def speichern(bild, pfad, px=1000):
    datei = os.path.join(ZIEL, "bilder", pfad + ".jpg")
    os.makedirs(os.path.dirname(datei), exist_ok=True)
    bild.resize((px, px), Image.LANCZOS).save(datei, quality=92)


def km_name(km):
    return f"{km:g}".replace(".", ",") + "-km"


def symbol_ausschnitt(bild, format="a4", seite_mm=70):
    """Quadrat um den Standort-Anker – gleich gross fuer alle Symbole, damit die Groessen vergleichbar sind."""
    f = FELDER[format]
    faktor = PX / 400
    x, y = f["symbolAnker"]["x"] * faktor, f["symbolAnker"]["y"] * faktor
    halb = seite_mm * f["pxProMm"] * faktor / 2
    return bild.crop((round(x - halb), round(y - halb), round(x + halb), round(y + halb)))


def vorschau(formate, ordner):
    """Grundbild der Live-Vorschau je Design – Text, Rahmen und Symbol kommen darueber."""
    for f in formate:
        for d, aufbau in DESIGNS.items():
            bild = aufnehmen(entwurf(format=f, aufbau=aufbau))
            speichern(bild, f"{ordner}/vorschau/{f}/{d}", PX)
            speichern(bild, f"{ordner}/vorschau-400/{f}/{d}", 400)


def rahmen(f, ordner):
    """Die Leiste ist bei jedem Format gleich breit – auf A5 wirkt sie darum kraeftiger als auf A3."""
    for r in RAHMEN:
        speichern(aufnehmen(entwurf(format=f, holzrahmen=r)), f"{ordner}/rahmen/{f}/{r}")


def massstab(f, ordner):
    """Derselbe Massstab zeigt in jedem Format denselben Ausschnitt; je kleiner die Platte, desto mehr wird graviert."""
    for km in MASSSTAB_KM:
        speichern(aufnehmen(entwurf(format=f, km=km)), f"{ordner}/massstab/{f}/{km_name(km)}")


def gruppe(name):
    k = "konfigurator"
    if name == "kontrolle":
        # Mit Beispieltext und den berechneten Feldern darueber: passen Container und Bild zusammen?
        for f in FORMATE + ["quadrat30"]:
            bild = aufnehmen(entwurf(format=f, text=True, mit_symbol=True)).copy()
            d = ImageDraw.Draw(bild)
            faktor = PX / 400
            for t in FELDER[f]["felder"] or FELDER[f]["beispielZeilen"]:
                d.rectangle([t["x"] * faktor, t["y"] * faktor, (t["x"] + t["breite"]) * faktor, (t["y"] + t["hoehe"]) * faktor], outline=(230, 40, 30), width=3)
            speichern(bild, f"kontrolle/{f}", 1600)
    elif name == "vorschau":
        vorschau(FORMATE, k)
    elif name == "design":
        for d, aufbau in DESIGNS.items():
            speichern(aufnehmen(entwurf(aufbau=aufbau)), f"{k}/design/{d}")
    elif name == "format":
        # Jedes Format so gross wie moeglich – die Masse stehen im Optionsnamen.
        for f in FORMATE:
            speichern(aufnehmen(entwurf(format=f)), f"{k}/format/{f}")
    elif name == "rahmen":
        for f in FORMATE:
            rahmen(f, k)
    elif name == "massstab":
        for f in FORMATE:
            massstab(f, k)
    elif name == "strassennetz":
        for s in STUFEN:
            speichern(aufnehmen(entwurf(strassenStufe=s)), f"{k}/strassennetz/{s}")
    elif name == "symbolgroesse":
        for g in GROESSEN:
            speichern(symbol_ausschnitt(aufnehmen(entwurf(symbolGroesse=g, mit_symbol=True))), f"{k}/symbolgroesse/{g}", 600)
    elif name == "quadrat":
        q = "quadrat30"
        vorschau([q], q)
        for d, aufbau in DESIGNS.items():
            speichern(aufnehmen(entwurf(format=q, aufbau=aufbau)), f"{q}/design/{d}")
        rahmen(q, q)
        massstab(q, q)


if __name__ == "__main__":
    for n in sys.argv[1:] or GRUPPEN:
        print("Gruppe", n, flush=True)
        gruppe(n)
