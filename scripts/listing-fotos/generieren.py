#!/usr/bin/env python3
"""Listing-Fotos mit Leonardo Nano Banana 2 aus den 3D-Referenzen (1K, 1:1, je 0,04 $).

Aufruf: python3 scripts/listing-fotos/generieren.py [name ...]   (ohne Namen: alle noch fehlenden)
SEED=4712 python3 ... erzeugt eine Alternative mit anderem Seed.
Referenz HIGH, prompt_enhance OFF (die API verlangt das mit Referenzbild).
Prompts: auftraege.py und auftraege_anlaesse.py.
Hochgeladene Referenzen stehen in refs.json, jede Generierung in protokoll.jsonl.
"""
import importlib.util, json, os, sys, time

from auftraege_anlaesse import JOBS, ZUSATZ_REFS

SKILL = os.path.expanduser("~/.claude/skills/leonardo-nano-banana-2")
# Referenzen, Fotos, refs.json und protokoll.jsonl liegen im (nicht versionierten) Exportordner.
HIER = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "export", "produktfoto", "listing")


def modul(name):
    spec = importlib.util.spec_from_file_location(name, os.path.join(SKILL, name + ".py"))
    m = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(m)
    return m


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
