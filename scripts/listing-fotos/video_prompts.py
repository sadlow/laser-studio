"""Prompts fuer die Video-Ads (video.py): Standbilder je Keyframe und die Kamerabewegung fuer Veo 3.1."""
from auftraege_anlaesse import JOBS

MATERIAL = (
    "The raised white acrylic streets have softly lit top faces and slightly shaded, faintly translucent cut edges and "
    "cast soft shadows onto the glossy black acrylic layer, which mirrors the softboxes as broad soft light gradients; "
    "the blue mirror acrylic river reflects a softbox as a bright band; the red mirror acrylic heart has a crisp glossy "
    "glint. Subtle natural sensor grain, natural colors. A clean, flawless new product: no dust, no hairs, no fingerprints."
)
MAKRO = (
    "Real macro product photograph, wide 16:9, taken with a 100 mm macro lens under large studio softboxes, not a 3D "
    "render, not CGI: a close-up of a personalized layered acrylic city map of Köln exactly as in the reference, glossy "
    "white laser-cut acrylic streets raised above a glossy black acrylic layer with fine light engraved paths, the Rhine "
    f"cut out revealing blue mirror acrylic, a glossy red mirror acrylic heart marking a place next to the river. {MATERIAL} "
)
# Im Querformat fuellte Leonardo den freien Platz mit Softboxen und Stativen: Licht von ausserhalb, nichts im Bild.
PACKSHOT = (
    JOBS["01-hero-koeln-schwarz-echt"][1].replace("Real product photograph on", "Real wide 16:9 product photograph on")
    .replace("under large studio softboxes", "lit by large softboxes outside the frame")
    + " The framed artwork stands exactly where it is in the reference, with calm white space on both sides. Nothing "
    "else in the picture: no visible softboxes, lamps, stands or studio equipment; the seamless white background fills "
    "the whole image."
    # A3 im Querformat: die Gravur wurde unter einem Pixel schmal, Leonardo machte glattes Schwarz daraus (Marcel 17.09.2026)
    + " Even in this full view the fine light grey engraved paths stay visible as delicate hairlines on the black layer "
    "between the raised white streets."
)
GRAVUR_BLEIBT = "The fine light grey engraved paths on the black layer stay visible throughout the whole move."
STARR = "The artwork is a rigid physical object: streets, river, heart and lettering keep their exact shape."
ENDE = "Premium product commercial, soft studio light, no people, no hands, no text overlays, no extra objects."

STANDBILD = {
    "zoom": {"start": MAKRO + "Very gentle depth of field. Keep the geometry exactly as in the reference image. No extra text, no logos, no people.",
             "ende": PACKSHOT},
    "bogen": {r: MAKRO.replace("a close-up of", "a very close, low oblique view over")
              + "The map lies flat; the thick heart and the raised streets clearly stand above the layers below. Shallow "
              "depth of field. Keep the geometry exactly as in the reference image. No extra text, no logos, no people."
              for r in ["start", "ende"]},
}
BEWEGUNG = {
    "zoom": (
        "One continuous, slow and smooth cinematic camera pull-back: it starts in a macro close-up of the glossy red mirror "
        "acrylic heart beside the blue mirror acrylic river on a layered acrylic city map and glides steadily backwards "
        "until the whole artwork in its matte black wooden frame stands revealed on a seamless white studio background. "
        f"As the camera moves, the softbox reflections glide gently across the mirror acrylic and the glossy surfaces. {STARR} "
        f"{GRAVUR_BLEIBT} {ENDE}"
    ),
    "bogen": (
        "One continuous, slow and smooth cinematic camera arc very close over a layered acrylic city map lying flat: at a "
        "low oblique angle the camera circles gently around the thick glossy red mirror acrylic heart, revealing the real "
        "depth between the raised white acrylic streets, the black layer and the blue mirror acrylic river below, with "
        f"clear parallax between the layers and softbox reflections gliding across the glossy surfaces. {STARR} Shallow depth "
        f"of field. {ENDE}"
    ),
}
NEGATIV = ("morphing, warping, melting or moving streets, flickering, distorted or changing lettering, extra hearts, hands, "
           "people, text overlay, logo, camera shake")
