#!/usr/bin/env python3
"""Explosionszeichnung als fertiges Listing-Bild (Marcel 16./17.09.2026: "damit jeder versteht, was er kauft").

Die Explosionszeichnung aus dem 3D-Modell, mit Leonardo als echte Aufnahme auf ruhigem, warmem Grund gerechnet
("muss nicht so hart technisch wirken"). Ohne Beschriftung und Linien – die setzt Marcel im Listing Designer.

Schritte: aufnehmen (Referenz), generieren (1K, rund 0,04 $), hochskalieren (Ultra 2x, rund 0,05 $).
Aufruf: python3 scripts/amazon-custom/erklaerbild.py [schritt ...]   (ohne: alle)   SEED=4712 fuer eine Alternative
Ergebnis: export/amazon-custom/erklaerbild/explosionszeichnung.jpg
"""
import json, os, sys, time

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "listing-fotos"))
from PIL import Image  # noqa: E402

from bilder import ZIEL, aufnehmen, entwurf  # noqa: E402
from generieren import modul  # noqa: E402

HIER = os.path.join(ZIEL, "erklaerbild")
MOTIV = {"foto": "explosion", "abstand": "90", "hintergrund": "warm", "zoom": "0.95"}
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
    if name == "aufnehmen":
        e = entwurf(text=True, mit_symbol=True)
        aufnehmen(e, **MOTIV).resize((1600, 1600), Image.LANCZOS).save(pfad("referenz.png"))
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
        erg = up.upscale_and_download(up.load_config(), bild_id, pfad("explosionszeichnung.jpg"), mode="ultra", style="REALISTIC",
                                      creativity_strength=4, upscale_multiplier=2.0, detail_contrast=5, similarity=7)
        protokoll({"schritt": name, "bild": bild_id, "ergebnis": erg})


if __name__ == "__main__":
    for n in sys.argv[1:] or ["aufnehmen", "generieren", "hochskalieren"]:
        print("Schritt", n, flush=True)
        schritt(n)
