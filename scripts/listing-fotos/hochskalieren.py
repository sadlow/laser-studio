#!/usr/bin/env python3
"""Nahaufnahmen hochskalieren und dabei glaubwuerdiger machen (Leonardo Universal Upscaler, Ultra).

Aufruf: python3 scripts/listing-fotos/hochskalieren.py <foto-name> [kreativitaet] [aehnlichkeit] [ultra|klassisch]
Ultra nimmt keinen Prompt an ("Prompt is not supported with ultraUpscaleStyle") und laeuft
darum ohne; der klassische Upscaler (Stil CINEMATIC) bekommt einen.
Marcel 16.09.2026: "bei den Close-ups sieht es fast ein bisschen zu perfekt aus ... etwas
dust & grunge ... sonst riecht es nach 3D-Render". Der klassische Upscaler zeigte trotz
Prompt keinen Staub; die Spuren entstehen darum in der Generierung (QUALITAET_ECHT in
auftraege_anlaesse.py). Der Skill selbst bleibt unveraendert.
"""
import importlib.util, json, os, sys, time, urllib.error, urllib.request

SKILL = os.path.expanduser("~/.claude/skills/leonardo-nano-banana-2")
HIER = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "export", "produktfoto", "listing")

# Sparsam: Fussel und Fingerabdruecke wirkten "unappetitlich" (Marcel 16.09.2026).
STAUB = (
    "real macro product photograph, not a 3D render: a few barely visible fine dust specks on the glossy acrylic, "
    "laser-cut edges with a slightly irregular fine texture and minimal burr, natural sensor grain; a clean product "
    "without hairs, fibers or fingerprints"
)


def modul(name):
    spec = importlib.util.spec_from_file_location(name, os.path.join(SKILL, name + ".py"))
    m = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(m)
    return m


def bild_id(name):
    """Leonardo-ID der letzten Generierung dieses Fotos aus dem Protokoll."""
    treffer = None
    with open(os.path.join(HIER, "protokoll.jsonl")) as f:
        for zeile in f:
            eintrag = json.loads(zeile)
            if eintrag["name"] == name and eintrag.get("ergebnis"):
                treffer = eintrag["ergebnis"][0]["id"]
    if not treffer:
        sys.exit(f"Kein generiertes Bild '{name}' im Protokoll.")
    return treffer


def anfrage(config, body):
    req = urllib.request.Request(f"{config['api_base_v1']}/variations/universal-upscaler", data=json.dumps(body).encode(), method="POST")
    req.add_header("Authorization", f"Bearer {config['api_key']}")
    req.add_header("Content-Type", "application/json")
    req.add_header("Accept", "application/json")
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode())


if __name__ == "__main__":
    name = sys.argv[1]
    kreativ = int(sys.argv[2]) if len(sys.argv) > 2 else 6
    aehnlich = int(sys.argv[3]) if len(sys.argv) > 3 else 6
    modus = sys.argv[4] if len(sys.argv) > 4 else "klassisch"
    up = modul("upscale")
    config = up.load_config()
    body = {"generatedImageId": bild_id(name), "creativityStrength": kreativ, "upscaleMultiplier": 2.0}
    if modus == "ultra":
        body.update({"ultraUpscaleStyle": "REALISTIC", "detailContrast": 5, "similarity": aehnlich})
    else:
        body.update({"upscalerStyle": "CINEMATIC", "prompt": STAUB})
    try:
        antwort = anfrage(config, body)
        mit_prompt = "prompt" in body
    except urllib.error.HTTPError as e:
        if "prompt" not in body:
            raise
        print(f"Mit Prompt abgelehnt ({e.code}: {e.read().decode()[:200]}) – ohne Prompt")
        body.pop("prompt")
        antwort = anfrage(config, body)
        mit_prompt = False
    job = antwort.get("universalUpscaler") or antwort.get("sdUniversalUpscalerJob", {})
    print(f"Upscale {job.get('id')} | Prompt: {mit_prompt} | Kosten: {job.get('cost')}")
    ergebnis = up.poll_variation(config, job["id"])
    if not ergebnis:
        sys.exit("Upscale fehlgeschlagen.")
    ziel = os.path.join(HIER, "fotos", "hochskaliert", f"{name}-{modus}-k{kreativ}" + (f"-a{aehnlich}" if modus == "ultra" else "") + ".jpg")
    os.makedirs(os.path.dirname(ziel), exist_ok=True)
    up.download_image(ergebnis["url"], ziel)
    with open(os.path.join(HIER, "protokoll.jsonl"), "a") as f:
        f.write(json.dumps({"zeit": time.strftime("%Y-%m-%d %H:%M"), "name": name, "upscale": job.get("id"), "prompt": mit_prompt, "modus": modus,
                            "kreativitaet": kreativ, "aehnlichkeit": aehnlich, "kosten": job.get("cost"), "datei": ziel},
                           ensure_ascii=False) + "\n")
