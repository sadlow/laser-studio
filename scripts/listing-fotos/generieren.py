#!/usr/bin/env python3
"""Listing-Fotos mit Leonardo Nano Banana 2 aus den 3D-Referenzen (1K, 1:1, je 0,04 $).

Aufruf: python3 scripts/listing-fotos/generieren.py [name ...]   (ohne Namen: alle noch fehlenden)
SEED=4712 python3 ... erzeugt eine Alternative mit anderem Seed.
Referenz HIGH, prompt_enhance OFF (die API verlangt das mit Referenzbild).
Hochgeladene Referenzen stehen in refs.json, jede Generierung in protokoll.jsonl.
"""
import importlib.util, json, os, sys, time

SKILL = os.path.expanduser("~/.claude/skills/leonardo-nano-banana-2")
# Referenzen, Fotos, refs.json und protokoll.jsonl liegen im (nicht versionierten) Exportordner.
HIER = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "export", "produktfoto", "listing")


def modul(name):
    spec = importlib.util.spec_from_file_location(name, os.path.join(SKILL, name + ".py"))
    m = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(m)
    return m


QUALITAET = (
    "Photorealistic high-end product photography with true-to-life materials: crisp polished laser-cut acrylic "
    "edges catching the light, real depth between the stacked layers, flawless clean craftsmanship. Keep the "
    "artwork exactly as in the reference image: same map layout, same heart position, same frame, same lettering. "
    "No extra text, no logos or brand names anywhere, no people."
)
QUALITAET_NAH = (
    "Photorealistic macro product photography, true-to-life glossy acrylic and mirror acrylic, flawless clean "
    "craftsmanship. Keep the geometry exactly as in the reference image. No extra text, no logos, no people."
)
WEISS = (
    "a personalized 3D layered acrylic city map artwork: a raised network of glossy white laser-cut acrylic streets "
    "on a glossy black acrylic layer with fine light engraved paths, rivers and lakes cut out to reveal blue mirror "
    "acrylic below, a tiny glossy red mirror acrylic heart marking a place, and a white acrylic lower panel into "
    "which a thin, delicate handwritten script title and two small uppercase text lines are laser-cut flush, "
    "appearing as fine dark lines (not raised, not bold, no printed ink)"
)
NEWYORK = (
    "a personalized 3D layered acrylic city map artwork: a glossy black laser-cut acrylic street network over a white "
    "acrylic base, a white acrylic top layer forming a slim border and the lower panel into which the thin, delicate "
    "handwritten script title 'New York' and the small uppercase lines 'SOPHIE & BEN' and 'HIER FING ALLES AN' are "
    "laser-cut flush, appearing as fine dark lines (not raised, not bold), the Hudson river cut out revealing blue "
    "mirror acrylic, a tiny red mirror acrylic heart"
)
RAHMEN = {
    "eiche": "in a natural oak solid wood frame with visible grain",
    "schwarz": "in a matte black solid wood frame",
    "weiss": "in a matte white solid wood frame",
    "ohne": "without a frame, the polished edges of the acrylic layers visible",
}

JOBS = {
    "01-hero-koeln-eiche": ("hero-koeln-eiche",
        f"Studio packshot on a seamless pure white background: {WEISS}, with the title 'Zuhause' and the lines "
        f"'LENA & JONAS' and the coordinates of Köln, {RAHMEN['eiche']}, leaning slightly back, soft natural contact "
        f"shadow, evenly lit, no props, e-commerce main image. {QUALITAET}"),
    "01-hero-koeln-ohne": ("hero-koeln-ohne",
        f"Studio packshot on a seamless pure white background: {WEISS}, with the title 'Zuhause' and the lines "
        f"'LENA & JONAS' and the coordinates of Köln, {RAHMEN['ohne']}. It stands upright on its own bottom edge and "
        "leans slightly back against a white wall that blends seamlessly into the white background: no stand, no "
        f"base, no holder, no easel. Soft natural contact shadow, evenly lit, no props, e-commerce main image. {QUALITAET}"),
    "02-heroetsy-koeln-einweihung": ("heroetsy-koeln",
        f"Warm lifestyle photograph of a housewarming gift: {WEISS}, with the title 'Zuhause', {RAHMEN['eiche']}, "
        "stands on a light oak sideboard against a warm white wall in a bright, freshly moved-into apartment. Around "
        "it: a small gift box wrapped in cream paper with a linen ribbon, a bottle of sparkling wine with two glasses, "
        "a set of new house keys on a leather keyring and a young olive tree in a ceramic pot; two cardboard moving "
        f"boxes softly blurred in the background. Soft natural daylight from the left, joyful new-home atmosphere. {QUALITAET}"),
    "03-lifestyle-mallorca-lieblingsort": ("lifestyle-mallorca",
        f"Sunny Mediterranean lifestyle photograph: {WEISS}, with the title 'Mallorca', the line 'ANNA & MAX' and the "
        "German coordinates line 'PALMA 39°34'14\"N 2°38'49\"O' (ending with the letter O, not E), "
        f"{RAHMEN['ohne']}, leans "
        "against a sun-warmed pale limestone wall on a rustic light wooden table on a terrace. Beside it: a bowl of "
        "fresh lemons, a woven straw hat, a few seashells and sunglasses, soft dappled shadows of olive leaves. Warm "
        "late-afternoon light, the feeling of a favourite holiday place. The upper left of the image stays a calm, "
        f"empty wall surface. {QUALITAET}"),
    "04-personalize-newyork-kennenlernen": ("personalize-newyork",
        f"Top-down flat lay photograph: {NEWYORK}, {RAHMEN['schwarz']}, lies centered on a light natural oak table "
        "with generous empty space around it. Only at the very edges a few subtle props: a sprig of eucalyptus, a "
        "folded blank greeting card, a cup of coffee and a roll of kraft gift paper with twine. Soft even daylight, "
        f"crisp and clean, a romantic gift for a couple. {QUALITAET}"),
    "05-desire-hamburg-heimat": ("desire-hamburg",
        f"Emotional lifestyle photograph about taking home with you when moving out: {WEISS}, with the title "
        f"'Heimat', {RAHMEN['weiss']}, leans on a wooden desk next to an open cardboard moving box with a knitted "
        "sweater, a few books, a steaming mug and a handwritten envelope. Soft nordic morning light, warm nostalgic "
        f"mood. The upper part of the image stays calm and uncluttered. {QUALITAET}"),
    "06-features-koeln-herz": ("features-koeln",
        "Extreme close-up macro product photograph of a personalized layered acrylic city map: glossy white "
        "laser-cut acrylic streets stand 2 mm above a glossy black acrylic layer with fine engraved paths, the Rhine "
        "river cut out reveals blue mirror acrylic that reflects the cut edges, a small glossy red mirror acrylic heart "
        "sits on top. Polished laser-cut edges glisten, visible depth between the layers, soft studio light, very "
        f"shallow depth of field with the heart in sharp focus. {QUALITAET_NAH}"),
    "06-features-mallorca-lagen": ("features-rand-mallorca",
        "Macro product photograph of the edge of a layered acrylic city map artwork lying on a light oak table: the "
        "cut side shows the stacked layers, glossy white acrylic on glossy black acrylic on blue mirror acrylic, with "
        "polished laser-cut edges; raised white acrylic streets on the surface. Soft daylight, very shallow depth of "
        f"field, premium craftsmanship. {QUALITAET_NAH}"),
    "06-features-koeln-schrift": ("titel-koeln",
        "Close-up macro photograph of the lower text panel of a layered acrylic city map artwork: the handwritten "
        "script word 'Zuhause', the uppercase line 'LENA & JONAS' and a line of coordinates are precisely laser-cut "
        "through glossy white acrylic, revealing a glossy black layer beneath, with delicate stencil bridges and "
        f"crisp polished edges. Soft raking light, shallow depth of field. {QUALITAET_NAH}"),
    "07-frames-drei-rahmen": ("frames-drei",
        "Interior product photograph of three layered acrylic city map artworks side by side, leaning against a warm "
        "white wall on a light oak sideboard: the left one in a matte black solid wood frame, the middle one in a "
        "matte white solid wood frame, the right one in a natural oak frame. All three show the same design as in "
        "the reference: in the upper part a map with glossy white laser-cut streets on a black layer, a blue mirror "
        "river and a tiny red heart; below it a WHITE acrylic text panel (not black) with the thin script title "
        "'Zuhause' and two small dark uppercase lines. Minimal "
        f"styling, soft daylight. The upper half of the image stays an empty calm wall. {QUALITAET}"),
}

if __name__ == "__main__":
    gen, up = modul("generate"), modul("upload_ref")
    config = gen.load_config()
    refs_datei = os.path.join(HIER, "refs.json")
    refs = json.load(open(refs_datei)) if os.path.exists(refs_datei) else {}
    namen = sys.argv[1:] or [n for n in JOBS if not os.path.exists(os.path.join(HIER, "fotos", n + ".jpg"))]
    for name in namen:
        ref, prompt = JOBS[name]
        if ref not in refs:
            refs[ref] = up.upload_reference_image(config, os.path.join(HIER, "referenzen", ref + ".png"))
            json.dump(refs, open(refs_datei, "w"), indent=2)
        ziel = os.path.join(HIER, "fotos", name + ".jpg")
        erg = gen.generate_and_download(config, prompt, ziel, aspect_ratio="1:1", resolution="1K", style="Stock Photo",
                                        ref_image_id=refs[ref], ref_strength="HIGH", prompt_enhance="OFF",
                                        seed=int(os.environ.get("SEED", 4711)))
        with open(os.path.join(HIER, "protokoll.jsonl"), "a") as f:
            f.write(json.dumps({"zeit": time.strftime("%Y-%m-%d %H:%M"), "name": name, "referenz": ref,
                                "ref_id": refs[ref], "ergebnis": erg, "prompt": prompt}, ensure_ascii=False) + "\n")
