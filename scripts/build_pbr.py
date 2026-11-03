#!/usr/bin/env python3
"""Retrieve public CC0 PBR texture archives and publish browser-optimized maps."""
import hashlib
import io
import json
import time
import zipfile
from pathlib import Path
from urllib.request import Request, urlopen
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
DEST = ROOT / "assets" / "materials"
DEST.mkdir(parents=True, exist_ok=True)

SOURCES = {
    "ground": {
        "url": "https://www.texturecan.com/downloads/ground_0014/ground_0014_1k_9DGnxf.zip",
        "origin": "https://www.texturecan.com/details/182/",
        "files": {
            "color": "ground_0014_color_1k.jpg",
            "normal": "ground_0014_normal_opengl_1k.png",
            "rough": "ground_0014_roughness_1k.jpg"
        }
    },
    "rock": {
        "url": "https://www.texturecan.com/downloads/rock_0006/rock_0006_1k_FF7vrm.zip",
        "origin": "https://www.texturecan.com/details/247/",
        "files": {
            "color": "rock_0006_color_1k.jpg",
            "normal": "rock_0006_normal_opengl_1k.png",
            "rough": "rock_0006_roughness_1k.jpg"
        }
    },
    "bark": {
        "url": "https://ambientcg.com/get?file=Bark016_1K-PNG.zip",
        "origin": "https://ambientcg.com/view?id=Bark016",
        "files": {
            "color": "Bark016_1K-PNG_Color.png",
            "normal": "Bark016_1K-PNG_NormalGL.png",
            "rough": "Bark016_1K-PNG_Roughness.png"
        }
    },
    "wood": {
        "url": "https://www.texturecan.com/downloads/wood_0048/wood_0048_1k_2qPCQG.zip",
        "origin": "https://www.texturecan.com/details/467/",
        "files": {
            "color": "wood_0048_color_1k.jpg",
            "normal": "wood_0048_normal_opengl_1k.png",
            "rough": "wood_0048_roughness_1k.jpg"
        }
    }
}

def fetch(url):
    last_error = None
    for attempt in range(3):
        try:
            req = Request(url, headers={
                "User-Agent": "Mozilla/5.0 (compatible; VongXoCanGio/1.0; educational CC0 material importer)"
            })
            with urlopen(req, timeout=100) as response:
                data = response.read(90 * 1024 * 1024)
            if not data.startswith(b"PK"):
                raise ValueError("The server returned an HTML page, not a ZIP")
            return data
        except Exception as exc:
            last_error = exc
            time.sleep((attempt + 1) * 2)
    raise RuntimeError(f"Cannot retrieve {url}: {last_error}")

def archive_file(zf, name):
    names = zf.namelist()
    if name in names:
        return zf.read(name)
    expected = name.lower()
    for item in names:
        if item.lower().endswith("/" + expected) or item.lower() == expected:
            return zf.read(item)
    raise KeyError(f"{name} is absent; ZIP has: {names[:30]}")

results = {}
failures = {}
for key, info in SOURCES.items():
    try:
        payload = fetch(info["url"])
        entry = {"origin": info["origin"], "license": "CC0",
                 "archive_sha256": hashlib.sha256(payload).hexdigest(), "maps": {}}
        with zipfile.ZipFile(io.BytesIO(payload)) as zf:
            for channel, filename in info["files"].items():
                source = archive_file(zf, filename)
                with Image.open(io.BytesIO(source)) as image:
                    dimension = 768 if channel == "color" else 512
                    image = image.convert("RGB").resize((dimension, dimension), Image.Resampling.LANCZOS)
                    target = DEST / f"{key}_{channel}.webp"
                    image.save(target, "WEBP", quality=85 if channel != "rough" else 78, method=6)
                entry["maps"][channel] = {"file": target.name, "bytes": target.stat().st_size}
        results[key] = entry
        print(f"OK: {key} PBR maps", flush=True)
    except Exception as exc:
        failures[key] = str(exc)
        print(f"WARNING: {key}: {exc}", flush=True)

(DEST / "manifest.json").write_text(json.dumps({"sets": results, "failures": failures},
                                                  indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
if not results:
    raise SystemExit("No PBR archives were fetched; keeping previous assets unchanged.")
print("Generated", len(results), "material sets")
