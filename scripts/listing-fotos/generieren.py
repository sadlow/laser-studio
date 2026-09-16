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
    "which a thin, delicate handwritten script title and two small uppercase text lines are laser-cut as open slots "
    "through the white layer: every letter is a narrow cut-out with crisp inner edges and a subtle inner shadow, "
    "revealing the black acrylic 2 mm below, clearly recessed like a stencil (not printed ink, not raised, not bold)"
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
        "Interior product photograph, straight-on frontal view at eye level: three identical layered acrylic city map "
        "artworks of exactly the same size stand side by side at the same distance from the camera on a light oak "
        "sideboard and lean against a warm white wall. The sideboard has a straight, perfectly horizontal top edge "
        "where it meets the wall, and all three frames stand on that same line. The left one is in a matte black solid "
        "wood frame, the middle one in a matte white solid wood frame, the right one in a natural oak frame. All three "
        "show the same design as in the reference: in the upper part a map with glossy white laser-cut streets on a "
        "black layer, a blue mirror river and a tiny red heart; below it a WHITE acrylic text panel with the thin "
        "script title 'Zuhause' and two small dark uppercase lines 'LENA & JONAS' and 'KÖLN 50°56'18\"N 6°57'39\"O'. "
        "Minimal styling, soft daylight from the left with soft natural shadows on the wall. The upper half of the "
        f"image stays an empty calm wall. {QUALITAET}"),
}


# Weisses Deck mit schwarzem Netz (Aufbau netz-schwarz), allgemein fuer alle Orte
SCHWARZ = (
    "a personalized 3D layered acrylic city map artwork: a glossy black laser-cut acrylic street network over a white "
    "acrylic base, a white acrylic top layer forming a slim border and the lower text panel into which a thin, "
    "delicate handwritten script title and two small uppercase lines are laser-cut flush, appearing as fine dark "
    "lines (not raised, not bold), water cut out revealing blue mirror acrylic, a tiny red mirror acrylic heart"
)

# Weitere Anlaesse (Marcel 16.09.2026)
JOBS.update({
    "heroEtsy-heidelberg-hochzeit": ("heidelberg-hochzeit",
        f"Elegant wedding gift photograph: {SCHWARZ}, with the title 'Für immer' and the lines 'LAURA & DAVID' and "
        f"'HEIDELBERG 12.06.2026', {RAHMEN['weiss']}, stands on a gift table at a garden wedding reception covered with "
        "white linen: a bouquet of white peonies and eucalyptus, two champagne coupes, a few wrapped wedding gifts with "
        "satin ribbons and a blank greeting card. Soft golden evening light, warm fairy lights softly blurred in the "
        f"background. {QUALITAET}"),
    "lifestyle-starnberg-hausbau": ("starnberg-hausbau",
        f"Lifestyle photograph about a newly built family home: {WEISS}, with the title 'Unser Haus' and the line "
        f"'FAMILIE WAGNER', {RAHMEN['eiche']}, leans against the wall on a light kitchen island in a newly built modern "
        "house: rolled architectural blueprints tied with string, a new house key on a wooden keychain, a small potted "
        "herb plant and a bottle of sparkling wine with a ribbon; large windows with a green garden softly blurred in "
        f"the background. Bright natural light. The left part of the image stays calm and uncluttered. {QUALITAET}"),
    "desire-muenchen-geburt": ("muenchen-geburt",
        f"Tender birth gift photograph: {WEISS}, with the title 'Mia' and the lines 'GEBOREN AM 04.03.2026' and the "
        f"line 'MÜNCHEN 48°9'43\"N 11°35'10\"O', {RAHMEN['weiss']}, stands on a white nursery shelf and leans directly "
        "against the wall behind it (no stand, no easel back, no support panel), next to a folded knitted baby "
        "blanket in sage green, a small wooden toy, tiny knitted baby shoes and a soft plush bunny; soft pastel beige "
        f"and sage tones, gentle morning light. The right part of the image stays calm. {QUALITAET}"),
    "lifestyle-paris-antrag": ("paris-antrag",
        f"Romantic evening photograph about a marriage proposal: {WEISS}, with the title 'Paris' and the lines "
        f"'JULIA & TOM' and 'HIER HAT SIE JA GESAGT', {RAHMEN['schwarz']}, leans against the wall on a candlelit table "
        "for two: burning taper candles, a small bouquet of red roses, two glasses of red wine and a closed dark velvet "
        f"ring box; warm golden bokeh lights in the background. {QUALITAET}"),
    "desire-berlin-auswandern": ("berlin-auswandern",
        f"Bittersweet farewell photograph before moving abroad: {WEISS}, with the title 'Berlin' and the lines "
        f"'FÜR LUKAS' and 'HEIMAT IM GEPÄCK', {RAHMEN['ohne']}, leans against a light wall on a wooden floor next to an "
        "open vintage leather suitcase packed with folded clothes, a passport without visible writing, an analog camera "
        "and a paper coffee cup; warm afternoon sunlight through a window. The upper right part of the image stays "
        f"calm. {QUALITAET}"),
    "heroEtsy-dresden-weihnachten": ("dresden-weihnachten",
        f"Cozy Christmas photograph of a gift for the parents: {WEISS}, with the title 'Elternhaus' and the lines "
        f"'FÜR MAMA & PAPA' and the coordinates of Dresden, {RAHMEN['eiche']}, leans on a wooden sideboard beside a "
        "decorated Christmas tree with warm fairy lights, surrounded by presents wrapped in kraft paper with red and "
        f"dark green ribbons, pine branches and a few lit candles; warm evening glow. {QUALITAET}"),
    "lifestyle-sylt-urlaub": ("sylt-urlaub",
        f"Airy coastal lifestyle photograph of a favourite holiday island: {SCHWARZ}, with the title 'Sylt' and the "
        f"lines 'UNSER LIEBLINGSORT' and the coordinates of Westerland, {RAHMEN['weiss']}, leans against a whitewashed "
        "wooden wall on a shelf in a Nordic beach house: pieces of driftwood, a few sea shells, a small glass jar filled "
        "with sand, dune grass in a ceramic vase and natural linen; bright soft coastal daylight. The left part of the "
        f"image stays calm. {QUALITAET}"),
    "personalize-barcelona-hochzeitsreise": ("barcelona-flatlay",
        f"Top-down flat lay photograph of honeymoon memories: {WEISS}, with the title 'Barcelona' and the lines "
        f"'UNSERE HOCHZEITSREISE' and the coordinates of Barcelona, {RAHMEN['ohne']}, lies centered on a table with warm "
        "terracotta tiles with generous empty space around it; at the edges only a few props: a folding hand fan, two "
        "oranges with leaves, sunglasses and a small bunch of bougainvillea flowers. Warm Mediterranean sunlight with "
        f"soft shadows. {QUALITAET}"),
    "features-paris-herz": ("paris-herz",
        "Extreme close-up macro product photograph of a personalized layered acrylic city map of Paris: glossy white "
        "laser-cut acrylic streets stand above a glossy black acrylic layer with fine engraved paths, the Seine cut out "
        "reveals blue mirror acrylic reflecting the cut edges, a small glossy red mirror acrylic heart sits on top at "
        "the riverbank. Polished laser-cut edges glisten, visible depth between the layers, soft studio light, very "
        f"shallow depth of field. {QUALITAET_NAH}"),
    "features-starnberg-ufer": ("starnberg-ufer",
        "Macro product photograph of a layered acrylic city map at a lake shore: glossy white laser-cut acrylic streets "
        "and a glossy black acrylic layer end at the shoreline, the lake is cut out and reveals deep blue mirror acrylic "
        "below that reflects the black and white layer edges like calm water, showing the depth of the layers; no "
        f"objects in the water. Polished laser-cut edges, soft studio light, very shallow depth of field. {QUALITAET_NAH}"),
})

# Nahaufnahmen waren "so perfekt, dass es nach 3D-Render riecht" (Marcel 16.09.2026). Der
# Upscaler hilft nicht: Ultra nimmt keinen Prompt, der klassische nimmt ihn, zeigt aber
# keinen Staub. Die Unvollkommenheit muss in die Generierung.
QUALITAET_ECHT = (
    "Real macro photograph taken with a 100 mm macro lens in soft window light, not a 3D render, not CGI: true-to-life "
    "glossy acrylic and mirror acrylic with natural imperfections - a few tiny dust specks and one thin lint fiber on the "
    "glossy black surface, faint fingerprint smudges and hairline micro scratches visible in the reflections, laser-cut "
    "edges with a very fine, slightly irregular texture and a hint of matte burr, natural sensor grain and subtle lens "
    "vignetting. Keep the geometry exactly as in the reference image. No extra text, no logos, no people."
)


def echt(prompt):
    """Nahaufnahme ohne Render-Glanz: Studiolicht und Makellosigkeit raus, echte Spuren rein."""
    return prompt.replace("soft studio light, ", "").replace(QUALITAET_NAH, QUALITAET_ECHT)


for _name in ["06-features-koeln-herz", "06-features-mallorca-lagen", "06-features-koeln-schrift", "features-paris-herz", "features-starnberg-ufer"]:
    JOBS[_name + "-echt"] = (JOBS[_name][0], echt(JOBS[_name][1]))

# Paris: ohne Hinweis wurden die gravierten Wege rot – die Gravur ist immer hellgrau.
JOBS["features-paris-herz-echt"] = (JOBS["features-paris-herz-echt"][0], JOBS["features-paris-herz-echt"][1].replace(
    "fine engraved paths,", "fine engraved paths that appear as light grey lines (never red),"))


# Zweite Referenz je Foto (Marcel 16.09.2026: "die Schriftzuege sind nicht mehr eingelassen,
# sondern schwarz aufgedruckt"). In der kleinen Produktansicht sieht man die Tiefe der
# 0,5-mm-Schlitze nicht; eine Nahaufnahme derselben Schrift zeigt sie. Der Skill kann nur
# eine Referenz, die API bis zu sechs.
ZUSATZ_REFS = {"lifestyle-paris-antrag": [("paris-schrift", "MID")]}


def generieren_mit_refs(gen, config, prompt, ziel, refs, seed):
    """Wie generate_image des Skills, aber mit mehreren Referenzbildern [(id, staerke), ...]."""
    import urllib.request
    breite, hoehe = gen.get_dimensions(config, "1:1", "1K")
    params = {"width": breite, "height": hoehe, "prompt": prompt, "quantity": 1, "prompt_enhance": "OFF",
              "style_ids": [gen.get_style_id(config, "Stock Photo")], "seed": seed,
              "guidances": {"image_reference": [{"image": {"id": i, "type": "UPLOADED"}, "strength": st} for i, st in refs]}}
    body = {"model": config["model"], "parameters": params, "public": config["defaults"]["public"]}
    req = urllib.request.Request(f"{config['api_base_v2']}/generations", data=json.dumps(body).encode(), method="POST")
    for k, v in {"Authorization": f"Bearer {config['api_key']}", "Content-Type": "application/json", "Accept": "application/json"}.items():
        req.add_header(k, v)
    with urllib.request.urlopen(req) as resp:
        antwort = json.loads(resp.read().decode())["generate"]
    print(f"Generation {antwort['generationId']} | Referenzen: {len(refs)} | Kosten: {antwort.get('cost')}")
    bilder = gen.poll_generation(config, antwort["generationId"])
    if not bilder:
        return None
    gen.download_image(bilder[0]["url"], ziel)
    return [{"id": bilder[0]["id"], "url": bilder[0]["url"], "path": ziel}]


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
        zusatz = ZUSATZ_REFS.get(name, [])
        for z, _ in zusatz:
            if z not in refs:
                refs[z] = up.upload_reference_image(config, os.path.join(HIER, "referenzen", z + ".png"))
                json.dump(refs, open(refs_datei, "w"), indent=2)
        if zusatz:
            erg = generieren_mit_refs(gen, config, prompt, ziel, [(refs[ref], "HIGH")] + [(refs[z], st) for z, st in zusatz],
                                      int(os.environ.get("SEED", 4711)))
        else:
            erg = gen.generate_and_download(config, prompt, ziel, aspect_ratio="1:1", resolution="1K", style="Stock Photo",
                                            ref_image_id=refs[ref], ref_strength="HIGH", prompt_enhance="OFF",
                                            seed=int(os.environ.get("SEED", 4711)))
        with open(os.path.join(HIER, "protokoll.jsonl"), "a") as f:
            f.write(json.dumps({"zeit": time.strftime("%Y-%m-%d %H:%M"), "name": name, "referenz": ref,
                                "ref_id": refs[ref], "ergebnis": erg, "prompt": prompt}, ensure_ascii=False) + "\n")
