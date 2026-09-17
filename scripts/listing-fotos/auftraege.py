"""Prompts der Listing-Fotos, Teil 1: Bausteine und das erste Set (Hauptbilder, Lifestyle, Features, Rahmen).

JOBS: Fotoname -> (Referenzbild unter referenzen/, Prompt). Weitere Anlaesse, die
Nahaufnahmen ohne Render-Glanz und Zusatzreferenzen stehen in auftraege_anlaesse.py.
"""

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
# Stencil-Stege im Prompt halfen hier nicht: in der kleinen Produktansicht sind sie unter
# einem Pixel breit, Paris wirkte damit sogar wieder aufgedruckt. Die echte Schrift setzt
# schrift_einsetzen.py ein.
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
    # Amazon-Hauptbild (Marcel 17.09.2026): Tiefe der Lagen und beide Spiegelacryle sichtbar, Schrift lesbar
    "01-hero-koeln-schwarz": ("hero-koeln-schwarz",
        f"Studio packshot on a seamless pure white background: {WEISS}, with the title 'Zuhause' and the lines "
        f"'LENA & JONAS' and the coordinates of Köln, {RAHMEN['schwarz']}, leaning slightly back and seen at the same "
        "gentle angle as in the reference. The depth of the stacked layers is clearly visible: the raised white streets "
        "cast fine soft shadows onto the black layer, and the artwork sits recessed behind the frame lip. The blue mirror "
        "acrylic in the cut-out river is a real mirror: a large soft studio softbox is reflected in it as a bright diagonal "
        "gradient band across part of the deep blue water. The red mirror acrylic heart reflects the light like a mirror, "
        "with a bright white specular glint on one of its lobes. A faint soft diagonal sheen of light glides across the "
        "glossy white acrylic next to the lettering, and the glossy black layer faintly mirrors the white streets. The "
        f"lettering stays sharp and legible. Soft natural contact shadow, no props, e-commerce main image. {QUALITAET}"),
    # Realistischer (Marcel 17.09.2026). Das fertige Foto als Vorlage kam mit HIGH und MID fast unveraendert zurueck;
    # darum wieder vom 3D-Bild, mit dem, was ein echtes Produktfoto vom Rendering unterscheidet. Kein Staub: Hauptbild.
    "01-hero-koeln-schwarz-echt": ("hero-koeln-schwarz",
        f"Real product photograph on a seamless pure white background, shot on a full-frame camera with a 90 mm lens at "
        f"f/8 under large studio softboxes, not a 3D render, not CGI: {WEISS}, with the title 'Zuhause' and the lines "
        f"'LENA & JONAS' and the coordinates of Köln, {RAHMEN['schwarz']}, leaning slightly back and seen at the same "
        "gentle angle as in the reference. What makes it a real photograph: the glossy black acrylic layer mirrors the "
        "softboxes as broad, soft light gradients; the raised white acrylic streets have softly lit top faces and slightly "
        "shaded, faintly translucent cut edges and cast soft shadows onto the black layer; the blue mirror acrylic river "
        "reflects a softbox as a bright band; the red mirror acrylic heart has a crisp glossy glint; the matte black frame "
        "shows a fine wood grain and soft highlights along its edges; very gentle natural depth of field and subtle sensor "
        "grain; natural colors and contrast. A clean, flawless new product: no dust, no hairs, no fingerprints. The "
        f"lettering stays sharp and legible. Soft natural contact shadow, no props, e-commerce main image. {QUALITAET}"),
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
        "river cut out reveals deep blue mirror acrylic (blue, not white) that reflects the cut edges, a small glossy "
        "red mirror acrylic heart sits on top. Polished laser-cut edges glisten, visible depth between the layers, soft "
        f"studio light, very shallow depth of field with the heart in sharp focus. {QUALITAET_NAH}"),
    "06-features-mallorca-lagen": ("features-rand-mallorca",
        "Macro product photograph of the edge of a layered acrylic city map artwork lying on a light oak table: the "
        "cut side shows the stacked layers, glossy white acrylic on glossy black acrylic on blue mirror acrylic, with "
        "polished laser-cut edges; raised white acrylic streets on the surface. Soft daylight, very shallow depth of "
        f"field, premium craftsmanship. {QUALITAET_NAH}"),
    # Das angeschnittene Herz am oberen Rand wurde ohne Beschreibung zu einem roten Stempel.
    "06-features-koeln-schrift": ("titel-koeln",
        "Close-up macro photograph of the lower text panel of a layered acrylic city map artwork: the handwritten "
        "script word 'Zuhause', the uppercase line 'LENA & JONAS' and a line of coordinates are precisely laser-cut "
        "through glossy white acrylic, revealing a glossy black layer beneath; letters with closed shapes (a, o, e, O, A, "
        "0, 5, 6, 8, &) keep small stencil bridges that hold their inner parts, visible as tiny gaps in the cut lines. "
        "Above the panel the Rhine river is cut out down to deep blue mirror acrylic (blue, not white). At the top edge "
        "of the image a small flat heart cut from 2 mm red mirror acrylic lies on the map, mostly cut off by the image "
        f"edge (a flat heart shape, not a pin, not a stamp). Soft raking light, shallow depth of field. {QUALITAET_NAH}"),
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

# Hauptbild auch in A3 und mit vielen geschnittenen Strassen (Marcel 17.09.2026): gleicher Prompt, andere Referenz
for _v in ["a3", "viel"]:
    JOBS[f"01-hero-koeln-schwarz-{_v}-echt"] = (f"hero-koeln-schwarz-{_v}", JOBS["01-hero-koeln-schwarz-echt"][1])
