"""Prompts der Listing-Fotos, Teil 2: weitere Anlaesse, Nahaufnahmen ohne Render-Glanz, Zusatzreferenzen.

Erweitert JOBS aus auftraege.py; generieren.py importiert von hier.
"""
from auftraege import JOBS, QUALITAET, QUALITAET_NAH, RAHMEN, WEISS

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
# keinen Staub. Die Unvollkommenheit muss in die Generierung – aber sparsam: mit Fussel
# und Fingerabdruecken im Prompt lag ein weisses Haar auf der Gravur ("unappetitlich").
QUALITAET_ECHT = (
    "Real macro photograph taken with a 100 mm macro lens in soft window light, not a 3D render, not CGI: true-to-life "
    "glossy acrylic and mirror acrylic. Only a very subtle, realistic surface character: a few barely visible fine dust "
    "specks, laser-cut edges with a very fine, slightly irregular texture and a hint of matte burr, natural sensor "
    "grain. A clean, well-kept product: no hairs, no fibers, no lint, no fingerprints, no smudges, no visible scratches. "
    "Keep the geometry exactly as in the reference image. No extra text, no logos, no people."
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
