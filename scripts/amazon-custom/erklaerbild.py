#!/usr/bin/env python3
"""Explosionszeichnung als fertiges Listing-Bild, je Design eins (Marcel 16./17.09.2026: "damit jeder versteht, was er kauft").

Die Explosionszeichnung aus dem 3D-Modell, mit Leonardo als echte Aufnahme auf ruhigem, warmem Grund gerechnet
("muss nicht so hart technisch wirken"). Ohne Beschriftung und Linien – die setzt Marcel im Listing Designer.
Alle Designs mit derselben Kamera, demselben Abstand und Grund, damit die Bilder als Reihe zusammenpassen; nur die
Beschreibung der Lagen im Prompt unterscheidet sich.

Schritte: aufnehmen (Referenz), generieren (1K, rund 0,04 $), hochskalieren (Ultra 2x, rund 0,05 $), zeilen (nur
Schwarz auf Weiss: die Untertitelzeilen lesbar auf die schwarze Platte, siehe zeilen.py; kostenlos, beliebig oft).
Aufruf: python3 scripts/amazon-custom/erklaerbild.py <design> [schritt ...]   (ohne Schritt: alle)   SEED=4712 fuer eine Alternative
Designs wie in bilder.py: weiss-auf-schwarz, schwarz-auf-weiss, schwarz-weisser-rahmen. Das Design ist Pflicht –
jeder Lauf kostet Geld.
Ergebnis: export/amazon-custom/erklaerbild/<design>/explosionszeichnung.jpg
"""
import json, os, sys, time

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "listing-fotos"))
from PIL import Image  # noqa: E402

from bilder import DESIGNS, ZIEL, aufnehmen, entwurf  # noqa: E402
from generieren import modul  # noqa: E402
from zeilen import zeilen_einsetzen  # noqa: E402

MOTIV = {"foto": "explosion", "abstand": "90", "hintergrund": "warm", "zoom": "0.95"}
KOPF = (
    "Friendly, clean product visualization: an exploded view of a personalized layered acrylic city map artwork of Köln. "
    "Its separate layers float one behind another with generous even space between them, seen from the front right. "
)
TEXT = "into which the script word 'Zuhause' and two small uppercase lines are laser-cut"
HERZ = "a small glossy red mirror acrylic heart floats just in front of it"
GRUND = "the Rhine river cut out and a small engraved heart-shaped patch where the heart is glued"
# Von vorn nach hinten wie in stapel.ts. Gravur auf Weiss ist nur eine feine helle Rille – im Prompt kraeftiger
# beschrieben, erfindet Leonardo dunkle Linien, die das Stueck nicht hat.
# Ohne die Zusaetze bei den Designs mit weissem Hintergrund (erster Versuch, 17.09.2026) schob Leonardo das Herz
# neben die Platten, spiegelte "Zuhause" auf die weisse Lage und liess deren unteren Teil milchig durchscheinen.
# Beim vierlagigen erfand der zweite Versuch dann "STADT & REGION 50°N / 6°E" statt der Zeilen aus der Referenz.
LAGE_OHNE_TEXT = "a glossy, solid opaque white acrylic layer without any text"
HERZ_AUF_KARTE = "The heart stays in front of the left part of the map, inside the outline of the layers."
SCHRIFT_WIE_REFERENZ = "Copy the lettering exactly from the reference image."
LAGEN = {
    "weiss-auf-schwarz": (
        f"In front: a glossy white laser-cut acrylic street network with a white lower panel {TEXT}; {HERZ}. "
        f"Behind it: a glossy black acrylic layer with fine light engraved streets, {GRUND}. "
    ),
    "schwarz-auf-weiss": (
        f"In front: a glossy black laser-cut acrylic street network with a black lower panel {TEXT}; {HERZ}. "
        f"{HERZ_AUF_KARTE} Behind it: {LAGE_OHNE_TEXT}, with very fine, subtle frosted engraved streets, {GRUND}. "
    ),
    "schwarz-weisser-rahmen": (
        f"In front: a glossy white acrylic cover layer that is only a narrow border around an open window and a white "
        f"lower panel {TEXT}; {HERZ}. {SCHRIFT_WIE_REFERENZ} {HERZ_AUF_KARTE} Behind it: a glossy black laser-cut acrylic street network with a "
        f"solid black lower panel without any text. Behind that: {LAGE_OHNE_TEXT}, with very fine, subtle frosted "
        f"engraved streets, {GRUND}. "
    ),
}
FUSS = (
    "At the back: a glossy blue mirror acrylic sheet. "
    "Background: a soft, warm sand-beige backdrop with a gentle light falloff towards the edges, calm and inviting like "
    "a lifestyle product shot rather than a technical rendering; soft natural window light from the left and subtle soft "
    "shadows. True-to-life materials, crisp polished laser-cut edges. Keep the geometry and the position of every layer "
    "exactly as in the reference image. No labels, no arrows, no extra text, no logos, no people."
)


def pfad(design, name):
    ordner = os.path.join(ZIEL, "erklaerbild", design)
    os.makedirs(ordner, exist_ok=True)
    return os.path.join(ordner, name)


def protokoll(design, eintrag):
    with open(pfad(design, "protokoll.jsonl"), "a") as f:
        f.write(json.dumps({"zeit": time.strftime("%Y-%m-%d %H:%M"), **eintrag}, ensure_ascii=False) + "\n")


def schritt(design, name):
    if name == "aufnehmen":
        e = entwurf(aufbau=DESIGNS[design], text=True, mit_symbol=True)
        aufnehmen(e, **MOTIV).resize((1600, 1600), Image.LANCZOS).save(pfad(design, "referenz.png"))
    elif name == "generieren":
        gen, up = modul("generate"), modul("upload_ref")
        config = gen.load_config()
        ref = up.upload_reference_image(config, pfad(design, "referenz.png"))
        seed, prompt = int(os.environ.get("SEED", 4711)), KOPF + LAGEN[design] + FUSS
        erg = gen.generate_and_download(config, prompt, pfad(design, "generiert.jpg"), aspect_ratio="1:1", resolution="1K", style="Stock Photo",
                                        ref_image_id=ref, ref_strength="HIGH", prompt_enhance="OFF", seed=seed)
        protokoll(design, {"schritt": name, "seed": seed, "referenz": ref, "ergebnis": erg, "prompt": prompt})
    elif name == "hochskalieren":
        with open(pfad(design, "protokoll.jsonl")) as f:
            bild_id = [json.loads(z) for z in f if '"generieren"' in z][-1]["ergebnis"][0]["id"]
        up = modul("upscale")
        erg = up.upscale_and_download(up.load_config(), bild_id, pfad(design, "explosionszeichnung.jpg"), mode="ultra", style="REALISTIC",
                                      creativity_strength=4, upscale_multiplier=2.0, detail_contrast=5, similarity=7)
        protokoll(design, {"schritt": name, "bild": bild_id, "ergebnis": erg})
    elif name == "zeilen" and DESIGNS[design] == "netz-schwarz-dreilagig":
        # Nur hier ist die Schrift in Schwarz geschnitten; auf Weiss zeichnet Leonardo die Zeilen selbst lesbar.
        e = entwurf(aufbau=DESIGNS[design], text=True, mit_symbol=True)
        protokoll(design, {"schritt": name, **zeilen_einsetzen(e, pfad(design, "explosionszeichnung.jpg"))})


if __name__ == "__main__":
    if len(sys.argv) < 2 or sys.argv[1] not in DESIGNS:
        sys.exit("Design fehlt: " + ", ".join(DESIGNS))
    for n in sys.argv[2:] or ["aufnehmen", "generieren", "hochskalieren", "zeilen"]:
        print(sys.argv[1], "Schritt", n, flush=True)
        schritt(sys.argv[1], n)
