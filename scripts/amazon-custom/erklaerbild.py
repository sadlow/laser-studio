#!/usr/bin/env python3
"""Erklaerbild fuer Amazon (Marcel 16./17.09.2026: "damit jeder versteht, was er kauft").

Die Explosionszeichnung aus dem 3D-Modell, mit Leonardo als echte Aufnahme auf ruhigem, warmem Grund gerechnet
("muss nicht so hart technisch wirken"), danach die Beschriftung aus derselben Kamera darueber gelegt. Schrift
erfindet das Bildmodell – darum kommt sie erst zum Schluss, als transparente Ebene (?nur=beschriftung).

Schritte: aufnehmen (Referenz ohne und Beschriftung als Maske), generieren (1K, rund 0,04 $),
hochskalieren (Ultra 2x, rund 0,05 $), beschriften.
Aufruf: python3 scripts/amazon-custom/erklaerbild.py [schritt ...]   (ohne: alle)   SEED=4712 fuer eine Alternative
Ergebnis: export/amazon-custom/erklaerbild/
"""
import json, os, sys, time

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "listing-fotos"))
from PIL import Image, ImageDraw, ImageFont  # noqa: E402

from bilder import ZIEL, aufnehmen, entwurf  # noqa: E402
from generieren import modul  # noqa: E402
from masken import maske  # noqa: E402

HIER = os.path.join(ZIEL, "erklaerbild")
FUSSNOTE = "Holzrahmen optional wählbar: Schwarz, Weiß, Dunkelbraun oder Eiche"
# Beschriftung=platz: die Kamera steht so weit weg wie mit Beschriftung, die Texte bleiben aus.
MOTIV = {"foto": "explosion", "abstand": "90", "beschriftung": "platz", "zoom": "1.15"}
PROMPT = (
    "Friendly, clean product visualization: an exploded view of a personalized layered acrylic city map artwork of Köln. "
    "Its separate layers float one behind another with generous even space between them, seen from the front right. "
    "In front: a glossy white laser-cut acrylic street network with a white lower panel into which the script word "
    "'Zuhause' and two small uppercase lines are laser-cut; a small glossy red mirror acrylic heart floats just in front "
    "of it. Behind it: a glossy black acrylic layer with fine light engraved streets, the Rhine river cut out and a small "
    "engraved heart-shaped patch where the heart is glued. At the back: a glossy blue mirror acrylic sheet. "
    "Background: a soft, warm sand-beige backdrop with a gentle light falloff towards the edges, calm and inviting like "
    "a lifestyle product shot rather than a technical rendering; soft natural window light from the left and subtle soft "
    "shadows. True-to-life materials, crisp polished laser-cut edges. Keep the geometry and the position of every layer "
    "exactly as in the reference image. No labels, no arrows, no extra text, no logos, no people."
)


def pfad(name):
    os.makedirs(HIER, exist_ok=True)
    return os.path.join(HIER, name)


def protokoll(eintrag):
    with open(pfad("protokoll.jsonl"), "a") as f:
        f.write(json.dumps({"zeit": time.strftime("%Y-%m-%d %H:%M"), **eintrag}, ensure_ascii=False) + "\n")


def schritt(name):
    e = entwurf(text=True, mit_symbol=True)
    if name == "aufnehmen":
        aufnehmen(e, hintergrund="warm", **MOTIV).resize((1600, 1600), Image.LANCZOS).save(pfad("referenz.png"))
        maske(e, "beschriftung", **{**MOTIV, "beschriftung": "1"}).save(pfad("beschriftung.png"))
    elif name == "generieren":
        gen, up = modul("generate"), modul("upload_ref")
        config = gen.load_config()
        ref = up.upload_reference_image(config, pfad("referenz.png"))
        seed = int(os.environ.get("SEED", 4711))
        erg = gen.generate_and_download(config, PROMPT, pfad("generiert.jpg"), aspect_ratio="1:1", resolution="1K", style="Stock Photo",
                                        ref_image_id=ref, ref_strength="HIGH", prompt_enhance="OFF", seed=seed)
        protokoll({"schritt": name, "seed": seed, "referenz": ref, "ergebnis": erg, "prompt": PROMPT})
    elif name == "hochskalieren":
        with open(pfad("protokoll.jsonl")) as f:
            bild_id = [json.loads(z) for z in f if '"generieren"' in z][-1]["ergebnis"][0]["id"]
        up = modul("upscale")
        erg = up.upscale_and_download(up.load_config(), bild_id, pfad("hochskaliert.jpg"), mode="ultra", style="REALISTIC",
                                      creativity_strength=4, upscale_multiplier=2.0, detail_contrast=5, similarity=7)
        protokoll({"schritt": name, "bild": bild_id, "ergebnis": erg})
    elif name == "beschriften":
        foto = Image.open(pfad("hochskaliert.jpg" if os.path.exists(pfad("hochskaliert.jpg")) else "generiert.jpg")).convert("RGBA")
        ebene = Image.open(pfad("beschriftung.png")).convert("RGBa").resize(foto.size, Image.LANCZOS).convert("RGBA")
        foto.convert("RGB").save(pfad("erklaerbild.jpg"), quality=93)
        foto.alpha_composite(ebene)
        d = ImageDraw.Draw(foto)
        # Avenir Next.ttc: Index 7 Regular (wie die Beschriftung aus dem Studio)
        schrift = ImageFont.truetype("/System/Library/Fonts/Avenir Next.ttc", round(foto.width * 0.017), index=7)
        d.text(((foto.width - d.textlength(FUSSNOTE, font=schrift)) / 2, foto.height * 0.955), FUSSNOTE, font=schrift, fill=(38, 35, 31))
        foto.convert("RGB").save(pfad("erklaerbild-beschriftet.jpg"), quality=93)


if __name__ == "__main__":
    for n in sys.argv[1:] or ["aufnehmen", "generieren", "hochskalieren", "beschriften"]:
        print("Schritt", n, flush=True)
        schritt(n)
