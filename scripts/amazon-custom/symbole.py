#!/usr/bin/env python3
"""Standort-Symbole fuer Amazon Custom (Marcel 17.09.2026): je Symbol eine schraege Nahaufnahme aus
dem 3D-Modell, mit Leonardo zur echten Aufnahme gerechnet (1K, Referenz HIGH, je rund 0,04 $).
Das Symbol ist im Konfigurator nur eine kleine Kachel – dort zaehlt, dass Form und Material lesbar sind.

Aufruf: python3 scripts/amazon-custom/symbole.py [aufnehmen|generieren] [symbol ...]
  ohne Schritt beide, ohne Symbol alle vier. SEED=4712 ... erzeugt eine Alternative.
Der Dev-Server muss laufen. Ergebnis: bilder/konfigurator/standort-symbol/<symbol>.jpg
"""
import json, os, sys, time

from PIL import Image

from bilder import ZIEL, aufnehmen, entwurf

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "listing-fotos"))
from auftraege_anlaesse import QUALITAET_ECHT  # noqa: E402
from generieren import modul  # noqa: E402

HIER = os.path.join(ZIEL, "symbole")
FORM = {
    "herz": "a small flat heart",
    "haus": "a small flat house silhouette with a pitched roof and a door opening cut out at the bottom",
    "pin": "a small flat map location pin: a round head with a round hole in it, tapering to a point at the bottom",
    # Ohne "narrow arms" wurde das X beim ersten Versuch ein dicker Klotz, der Pin zweilagig.
    "kreuz": "a small flat X-shaped cross with narrow arms",
}
# Naeher als das Listing-Motiv (zoom): in der Kachel soll das Symbol gross genug sein.
EINSTELLUNG = {"foto": "symbol", "zoom": "1.5", "grund": None}


def prompt(symbol):
    return (
        "Close-up macro product photograph of a personalized layered acrylic city map, seen at an angle: glossy white "
        "laser-cut acrylic streets stand 2 mm above a glossy black acrylic layer with fine engraved paths that appear as "
        "light grey lines, the river cut out down to deep dark blue mirror acrylic (blue, not white). In the center "
        f"{FORM[symbol]} cut from a single thin 2 mm sheet of glossy red mirror acrylic (one thin layer, not a thick "
        "block, not stacked) lies on top of the streets and marks the place, in sharp focus; keep exactly this shape. "
        f"Polished laser-cut edges, visible depth between the layers, shallow depth of field. {QUALITAET_ECHT}"
    )


def generieren(symbole):
    gen, up = modul("generate"), modul("upload_ref")
    config = gen.load_config()
    refs_datei = os.path.join(HIER, "refs.json")
    refs = json.load(open(refs_datei)) if os.path.exists(refs_datei) else {}
    for s in symbole:
        referenz = os.path.join(HIER, "referenzen", f"{s}.png")
        # Neu aufgenommen = neu hochladen; die alte Referenz-ID zeigt sonst das alte Bild.
        stand = str(os.path.getmtime(referenz))
        if refs.get(s, {}).get("stand") != stand:
            refs[s] = {"id": up.upload_reference_image(config, referenz), "stand": stand}
            json.dump(refs, open(refs_datei, "w"), indent=2)
        ziel = os.path.join(HIER, "fotos", f"{s}.jpg")
        os.makedirs(os.path.dirname(ziel), exist_ok=True)
        seed = int(os.environ.get("SEED", 4711))
        erg = gen.generate_and_download(config, prompt(s), ziel, aspect_ratio="1:1", resolution="1K", style="Stock Photo",
                                        ref_image_id=refs[s]["id"], ref_strength="HIGH", prompt_enhance="OFF", seed=seed)
        with open(os.path.join(HIER, "protokoll.jsonl"), "a") as f:
            f.write(json.dumps({"zeit": time.strftime("%Y-%m-%d %H:%M"), "symbol": s, "seed": seed, "ergebnis": erg,
                                "prompt": prompt(s)}, ensure_ascii=False) + "\n")
        kachel = os.path.join(ZIEL, "bilder", "konfigurator", "standort-symbol", f"{s}.jpg")
        os.makedirs(os.path.dirname(kachel), exist_ok=True)
        Image.open(ziel).convert("RGB").resize((1000, 1000), Image.LANCZOS).save(kachel, quality=92)


if __name__ == "__main__":
    schritte = [a for a in sys.argv[1:] if a in ("aufnehmen", "generieren")] or ["aufnehmen", "generieren"]
    symbole = [a for a in sys.argv[1:] if a in FORM] or list(FORM)
    if "aufnehmen" in schritte:
        os.makedirs(os.path.join(HIER, "referenzen"), exist_ok=True)
        for s in symbole:
            aufnehmen(entwurf(symbol=s), px=1600, **EINSTELLUNG).save(os.path.join(HIER, "referenzen", f"{s}.png"))
    if "generieren" in schritte:
        generieren(symbole)
