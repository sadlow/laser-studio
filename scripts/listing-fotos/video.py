#!/usr/bin/env python3
"""Video-Ad fuer Amazon, 16:9 (Marcel 17.09.2026: "aus dem Close-Up ein 3D-Video mit Kameraflug").

Weg: Start- und Endbild aus dem 3D-Modell, beide mit Leonardo fotoreal, dazwischen rechnet Veo 3.1 die Bewegung.
Beide Bilder stammen aus derselben Kamera, nur verschieden stark gezoomt: Das Videomodell muss dann keine neue
Ansicht erfinden, Karte und Schrift stimmen am Anfang und am Ende.

Schritte: aufnehmen (3D, kostenlos), standbilder (2 x 1K, je 0,04 $), hochskalieren (2 x Ultra, je 0,05 $),
video (Veo 3.1 Fast, 8 s, 1080p, ohne Ton). Ergebnis: export/produktfoto/video/<clip>/<clip>.mp4
Aufruf: python3 scripts/listing-fotos/video.py [schritt ...]   (ohne: alle)   SEED=4713 fuer eine Alternative
"""
import json, os, sys, time, urllib.request

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from PIL import Image  # noqa: E402

import aufnahmen  # noqa: E402
from auftraege_anlaesse import JOBS  # noqa: E402
from generieren import modul  # noqa: E402
from weissgrund import weissgrund  # noqa: E402

CLIP = "koeln-herz-zu-rahmen"
HIER = os.path.join(aufnahmen.STUDIO, "export", "produktfoto", "video", CLIP)
HERO, _, _, _, GRUND, HERO_EXTRA = aufnahmen.AUFNAHMEN["hero-koeln-schwarz"]
QUER = dict(HERO_EXTRA, seiten="16:9", breite="1920", hoehe="1080")
# Das Herz liegt im Endbild bei y 359 von 1080. Der Versatz verschiebt das Bild nach dem Zoom; gemessen braucht es 3/4
# von Zoom mal Abstand zur Mitte, sonst sitzt das Herz in der Nahaufnahme zu tief.
ZOOM_START = 6
KEYFRAMES = {
    "ende": ("video-koeln-ende", 1.3, None),
    "start": ("video-koeln-start", ZOOM_START, (0, round(ZOOM_START * (540 - 359) / 1080 * 0.75, 3))),
}
MATERIAL = (
    "The raised white acrylic streets have softly lit top faces and slightly shaded, faintly translucent cut edges and "
    "cast soft shadows onto the glossy black acrylic layer, which mirrors the softboxes as broad soft light gradients; "
    "the blue mirror acrylic river reflects a softbox as a bright band; the red mirror acrylic heart has a crisp glossy "
    "glint. Subtle natural sensor grain, natural colors. A clean, flawless new product: no dust, no hairs, no fingerprints."
)
PROMPTS = {
    # Im Querformat fuellte Leonardo den freien Platz mit Softboxen und Stativen: Licht von ausserhalb, nichts im Bild.
    "ende": JOBS["01-hero-koeln-schwarz-echt"][1].replace("Real product photograph on", "Real wide 16:9 product photograph on")
    .replace("under large studio softboxes", "lit by large softboxes outside the frame")
    + " The framed artwork stands exactly where it is in the reference, with calm white space on both sides. Nothing "
    "else in the picture: no visible softboxes, lamps, stands or studio equipment; the seamless white background fills "
    "the whole image.",
    "start": (
        "Real macro product photograph, wide 16:9, taken with a 100 mm macro lens under large studio softboxes, not a 3D "
        "render, not CGI: a close-up of a personalized layered acrylic city map of Köln exactly as in the reference, glossy "
        "white laser-cut acrylic streets raised above a glossy black acrylic layer with fine light engraved paths, the Rhine "
        f"cut out revealing blue mirror acrylic, a glossy red mirror acrylic heart marking a place next to the river. {MATERIAL} "
        "Very gentle depth of field. Keep the geometry exactly as in the reference image. No extra text, no logos, no people."
    ),
}
VIDEO_PROMPT = (
    "One continuous, slow and smooth cinematic camera pull-back: it starts in a macro close-up of the glossy red mirror "
    "acrylic heart beside the blue mirror acrylic river on a layered acrylic city map and glides steadily backwards until "
    "the whole artwork in its matte black wooden frame stands revealed on a seamless white studio background. As the "
    "camera moves, the softbox reflections glide gently across the mirror acrylic and the glossy surfaces. The artwork "
    "is a rigid physical object: streets, river, heart and lettering keep their exact shape. Premium product commercial, "
    "soft studio light, no people, no hands, no text overlays, no extra objects."
)
NEGATIV = "morphing, warping, melting or moving streets, flickering, distorted or changing lettering, extra hearts, hands, people, text overlay, logo, camera shake"


def pfad(name):
    os.makedirs(HIER, exist_ok=True)
    return os.path.join(HIER, name)


def protokoll(eintrag):
    with open(pfad("protokoll.jsonl"), "a") as f:
        f.write(json.dumps({"zeit": time.strftime("%Y-%m-%d %H:%M"), **eintrag}, ensure_ascii=False) + "\n")


def letzte(schritt, rolle):
    with open(pfad("protokoll.jsonl")) as f:
        return [e for e in map(json.loads, f) if e["schritt"] == schritt and e.get("rolle") == rolle][-1]


def api(config, methode, url, body=None):
    req = urllib.request.Request(url, data=json.dumps(body).encode() if body else None, method=methode)
    for k, v in {"Authorization": f"Bearer {config['api_key']}", "Content-Type": "application/json", "Accept": "application/json"}.items():
        req.add_header(k, v)
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode())


def rollen():
    """ROLLE=ende rechnet nur ein Bild neu."""
    return [r for r in KEYFRAMES if os.environ.get("ROLLE") in (None, r)]


def schritt(name):
    gen = modul("generate")
    config = gen.load_config()
    if name == "aufnehmen":
        for rolle, (ref, zoom, versatz) in KEYFRAMES.items():
            aufnahmen.AUFNAHMEN[ref] = (HERO, "wand", zoom, versatz, GRUND, QUER)
            aufnahmen.aufnehmen(ref)
    elif name == "standbilder":
        up = modul("upload_ref")
        for rolle in rollen():
            ref_id = up.upload_reference_image(config, os.path.join(aufnahmen.ZIEL, KEYFRAMES[rolle][0] + ".png"))
            seed = int(os.environ.get("SEED", 4712))
            erg = gen.generate_and_download(config, PROMPTS[rolle], pfad(f"{rolle}.jpg"), aspect_ratio="16:9", resolution="1K",
                                            style="Stock Photo", ref_image_id=ref_id, ref_strength="HIGH", prompt_enhance="OFF", seed=seed)
            protokoll({"schritt": name, "rolle": rolle, "referenz": ref_id, "seed": seed, "ergebnis": erg, "prompt": PROMPTS[rolle]})
    elif name == "hochskalieren":
        up = modul("upscale")
        for rolle in rollen():
            bild_id = letzte("standbilder", rolle)["ergebnis"][0]["id"]
            erg = up.upscale_and_download(config, bild_id, pfad(f"{rolle}-hoch.jpg"), mode="ultra", style="REALISTIC",
                                          creativity_strength=4, upscale_multiplier=2.0, detail_contrast=5, similarity=7)
            bild = pfad(f"{rolle}-hoch.jpg")
            if rolle == "ende":
                weissgrund(bild, bild)
            Image.open(bild).convert("RGB").resize((1920, 1080), Image.LANCZOS).save(pfad(f"{rolle}-1080.png"))
            protokoll({"schritt": name, "rolle": rolle, "bild": bild_id, "ergebnis": erg})
    elif name == "video":
        up = modul("upload_ref")
        ids = {rolle: up.upload_reference_image(config, pfad(f"{rolle}-1080.png")) for rolle in KEYFRAMES}
        body = {"model": os.environ.get("MODELL", "veo-3.1-fast-generate-001"), "public": False, "parameters": {
            "prompt": VIDEO_PROMPT, "negative_prompt": NEGATIV, "duration": 8, "motion_has_audio": False, "quantity": 1,
            "width": 1920, "height": 1080, "seed": int(os.environ.get("SEED", 4712)),
            "guidances": {"start_frame": [{"image": {"id": ids["start"], "type": "UPLOADED"}}],
                          "end_frame": [{"image": {"id": ids["ende"], "type": "UPLOADED"}}]}}}
        roh = api(config, "POST", f"{config['api_base_v2']}/generations", body)
        protokoll({"schritt": name, "rolle": "auftrag", "antwort": roh, "body": body})
        antwort = roh.get("generate") or roh.get("sdGenerationJob") or roh
        print("Video", antwort.get("generationId"), "Kosten:", antwort.get("cost"))
        for _ in range(120):
            time.sleep(10)
            g = api(config, "GET", f"{config['api_base_v1']}/generations/{antwort['generationId']}")["generations_by_pk"]
            print("  Status:", g["status"], flush=True)
            if g["status"] in ("COMPLETE", "FAILED"):
                break
        protokoll({"schritt": name, "rolle": "ergebnis", "generation": g})
        urls = [v for bild in g.get("generated_images", []) for v in bild.values() if isinstance(v, str) and ".mp4" in v]
        if not urls:
            sys.exit("Kein Video im Ergebnis – siehe protokoll.jsonl")
        gen.download_image(urls[0], pfad(CLIP + ".mp4"))


if __name__ == "__main__":
    for n in sys.argv[1:] or ["aufnehmen", "standbilder", "hochskalieren", "video"]:
        print("Schritt", n, flush=True)
        schritt(n)
