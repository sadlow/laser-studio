#!/usr/bin/env python3
"""Video-Ads fuer Amazon, 16:9 (Marcel 17.09.2026: "aus dem Close-Up ein 3D-Video mit Kameraflug").

Weg: Start- und Endbild aus dem 3D-Modell, beide mit Leonardo fotoreal, dazwischen rechnet Veo 3.1 die Bewegung.
- zoom:  Dollyzoom vom Herz zum ganzen Bild. Beide Bilder aus derselben Kamera, nur verschieden stark gezoomt – das
         Videomodell muss keine neue Ansicht erfinden, Karte und Schrift stimmen am Anfang und am Ende.
- bogen: Nahflug schraeg ueber dem Flat-Lay, ein Bogen um das Herz ("wirklich dicht dran ... 3D-Tiefe"). Das Herz
         bleibt in beiden Bildern Anker; ein Gleitflug vom Ufer zum Herz ueberlappte kaum und haette Stadt erfunden.

Schritte: aufnehmen (3D, kostenlos), standbilder (2 x 1K, je 0,04 $), hochskalieren (2 x Ultra, je 0,05 $),
video (Veo 3.1 Fast, 8 s, 1080p, ohne Ton, rund 1,20 $). Ergebnis: export/produktfoto/video/<clip>/<clip>.mp4
Aufruf: python3 scripts/listing-fotos/video.py <clip> [schritt ...]   (ohne Schritt: alle)
SEED=4713 fuer eine Alternative, ROLLE=ende rechnet nur ein Keyframe neu.
"""
import json, os, sys, time, urllib.request

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np  # noqa: E402
from PIL import Image  # noqa: E402

import aufnahmen  # noqa: E402
from generieren import modul  # noqa: E402
from video_prompts import BEWEGUNG, NEGATIV, STANDBILD  # noqa: E402
from weissgrund import weissgrund  # noqa: E402

CLIPS = {
    "koeln-herz-zu-rahmen": {"basis": "hero-koeln-schwarz", "art": "zoom"},
    "koeln-a3-herz-zu-rahmen": {"basis": "hero-koeln-schwarz-a3", "art": "zoom"},
    "koeln-flug-herz": {"basis": "hero-koeln-schwarz", "art": "bogen"},
}
QUER = {"seiten": "16:9", "breite": "1920", "hoehe": "1080"}
ZOOM_START, BOGEN_GRAD, BOGEN_ZOOM = 6, 25, 1.25


def pfad(clip, name):
    ordner = os.path.join(aufnahmen.STUDIO, "export", "produktfoto", "video", clip)
    os.makedirs(ordner, exist_ok=True)
    return os.path.join(ordner, name)


def protokoll(clip, eintrag):
    with open(pfad(clip, "protokoll.jsonl"), "a") as f:
        f.write(json.dumps({"zeit": time.strftime("%Y-%m-%d %H:%M"), **eintrag}, ensure_ascii=False) + "\n")


def letzte(clip, schritt, rolle):
    with open(pfad(clip, "protokoll.jsonl")) as f:
        return [e for e in map(json.loads, f) if e["schritt"] == schritt and e.get("rolle") == rolle][-1]


def rollen():
    return [r for r in ["start", "ende"] if os.environ.get("ROLLE") in (None, r)]


def api(config, methode, url, body=None):
    req = urllib.request.Request(url, data=json.dumps(body).encode() if body else None, method=methode)
    for k, v in {"Authorization": f"Bearer {config['api_key']}", "Content-Type": "application/json", "Accept": "application/json"}.items():
        req.add_header(k, v)
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode())


def keyframes_aufnehmen(clip):
    """Legt die Referenzen video-<clip>-start/-ende an. Beim Dollyzoom wird das Herz im Endbild gemessen: der Versatz
    verschiebt nach dem Zoom, und gemessen braucht es 3/4 von Zoom mal Abstand zur Mitte, sonst sitzt es zu tief."""
    c = CLIPS[clip]
    entwurf, _, _, _, grund, extra = aufnahmen.AUFNAHMEN[c["basis"]]
    ref = {r: f"video-{clip}-{r}" for r in ["start", "ende"]}
    if c["art"] == "zoom":
        aufnahmen.AUFNAHMEN[ref["ende"]] = (entwurf, "wand", 1.3, None, grund, dict(extra, **QUER))
        aufnahmen.aufnehmen(ref["ende"])
        a = np.asarray(Image.open(os.path.join(aufnahmen.ZIEL, ref["ende"] + ".png")).convert("RGB")).astype(int)
        ys, xs = np.nonzero((a[:, :, 0] > 150) & (a[:, :, 1] < 90) & (a[:, :, 2] < 90))
        u, v = xs.mean() / a.shape[1] - 0.5, ys.mean() / a.shape[0] - 0.5
        versatz = (round(-ZOOM_START * u * 0.75, 3), round(-ZOOM_START * v * 0.75, 3))
        aufnahmen.AUFNAHMEN[ref["start"]] = (entwurf, "wand", ZOOM_START, versatz, grund, dict(extra, **QUER))
        aufnahmen.aufnehmen(ref["start"])
    else:
        for r, grad in [("start", -BOGEN_GRAD), ("ende", BOGEN_GRAD)]:
            aufnahmen.AUFNAHMEN[ref[r]] = (entwurf, "symbol", BOGEN_ZOOM, None, None, dict(QUER, drehen=str(grad)))
            aufnahmen.aufnehmen(ref[r])


def schritt(clip, name):
    art = CLIPS[clip]["art"]
    gen = modul("generate")
    config = gen.load_config()
    seed = int(os.environ.get("SEED", 4712))
    if name == "aufnehmen":
        keyframes_aufnehmen(clip)
    elif name == "standbilder":
        up = modul("upload_ref")
        for rolle in rollen():
            ref_id = up.upload_reference_image(config, os.path.join(aufnahmen.ZIEL, f"video-{clip}-{rolle}.png"))
            prompt = STANDBILD[art][rolle]
            erg = gen.generate_and_download(config, prompt, pfad(clip, f"{rolle}.jpg"), aspect_ratio="16:9", resolution="1K",
                                            style="Stock Photo", ref_image_id=ref_id, ref_strength="HIGH", prompt_enhance="OFF", seed=seed)
            protokoll(clip, {"schritt": name, "rolle": rolle, "referenz": ref_id, "seed": seed, "ergebnis": erg, "prompt": prompt})
    elif name == "hochskalieren":
        up = modul("upscale")
        for rolle in rollen():
            bild_id = letzte(clip, "standbilder", rolle)["ergebnis"][0]["id"]
            bild = pfad(clip, f"{rolle}-hoch.jpg")
            erg = up.upscale_and_download(config, bild_id, bild, mode="ultra", style="REALISTIC",
                                          creativity_strength=4, upscale_multiplier=2.0, detail_contrast=5, similarity=7)
            if art == "zoom" and rolle == "ende":
                weissgrund(bild, bild)
            Image.open(bild).convert("RGB").resize((1920, 1080), Image.LANCZOS).save(pfad(clip, f"{rolle}-1080.png"))
            protokoll(clip, {"schritt": name, "rolle": rolle, "bild": bild_id, "ergebnis": erg})
    elif name == "video":
        up = modul("upload_ref")
        ids = {rolle: up.upload_reference_image(config, pfad(clip, f"{rolle}-1080.png")) for rolle in ["start", "ende"]}
        body = {"model": os.environ.get("MODELL", "veo-3.1-fast-generate-001"), "public": False, "parameters": {
            "prompt": BEWEGUNG[art], "negative_prompt": NEGATIV, "duration": 8, "motion_has_audio": False, "quantity": 1,
            "width": 1920, "height": 1080, "seed": seed,
            "guidances": {"start_frame": [{"image": {"id": ids["start"], "type": "UPLOADED"}}],
                          "end_frame": [{"image": {"id": ids["ende"], "type": "UPLOADED"}}]}}}
        roh = api(config, "POST", f"{config['api_base_v2']}/generations", body)
        protokoll(clip, {"schritt": name, "rolle": "auftrag", "antwort": roh, "body": body})
        antwort = roh.get("generate") or roh.get("sdGenerationJob") or roh
        print("Video", antwort.get("generationId"), "Kosten:", antwort.get("cost"))
        for _ in range(120):
            time.sleep(10)
            g = api(config, "GET", f"{config['api_base_v1']}/generations/{antwort['generationId']}")["generations_by_pk"]
            print("  Status:", g["status"], flush=True)
            if g["status"] in ("COMPLETE", "FAILED"):
                break
        protokoll(clip, {"schritt": name, "rolle": "ergebnis", "generation": g})
        urls = [v for bild in g.get("generated_images", []) for v in bild.values() if isinstance(v, str) and ".mp4" in v]
        if not urls:
            sys.exit("Kein Video im Ergebnis – siehe protokoll.jsonl")
        gen.download_image(urls[0], pfad(clip, clip + ".mp4"))


if __name__ == "__main__":
    if len(sys.argv) < 2 or sys.argv[1] not in CLIPS:
        sys.exit("Clip fehlt: " + ", ".join(CLIPS))
    for n in sys.argv[2:] or ["aufnehmen", "standbilder", "hochskalieren", "video"]:
        print(sys.argv[1], "Schritt", n, flush=True)
        schritt(sys.argv[1], n)
