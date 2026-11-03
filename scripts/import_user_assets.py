#!/usr/bin/env python3
"""Unpack a single user-uploaded asset bundle to public GitHub Pages assets."""
from pathlib import Path
from zipfile import ZipFile
import os

root = Path(__file__).resolve().parents[1]
zip_path = root / "cangio-assets-upload.zip"
target = root / "assets" / "user"

if not zip_path.is_file():
    raise SystemExit("Missing cangio-assets-upload.zip; upload it to repository root.")

allow = {
    "red-mangrove-tree.glb.gz", "wood_color.webp", "wood_normal.webp",
    "wood_rough.webp", "water_ripple_normal.webp", "manifest.json",
    "ATTRIBUTIONS.md",
    "dry_branches/dry_branches_medium_01.bin",
    "dry_branches/dry_branches_medium_01_1k.gltf",
    "dry_branches/textures/dry_branches_medium_01_arm_1k.jpg",
    "dry_branches/textures/dry_branches_medium_01_diff_1k.jpg",
    "dry_branches/textures/dry_branches_medium_01_nor_gl_1k.jpg",
}

with ZipFile(zip_path) as z:
    got = set()
    for info in z.infolist():
        if info.is_dir():
            continue
        name = info.filename.replace("\\", "/")
        if not name.startswith("assets/user/"):
            raise ValueError(f"Unexpected path: {name}")
        relative = name[len("assets/user/"):]
        if relative not in allow:
            raise ValueError(f"Unexpected file: {relative}")
        if info.file_size > 32 * 1024 * 1024:
            raise ValueError(f"File exceeds safe size: {relative}")
        out = target / relative
        out.parent.mkdir(parents=True, exist_ok=True)
        with z.open(info) as src, out.open("wb") as dst:
            while chunk := src.read(1024 * 1024):
                dst.write(chunk)
        got.add(relative)
    required = {"red-mangrove-tree.glb.gz", "wood_color.webp",
                "wood_normal.webp", "wood_rough.webp",
                "water_ripple_normal.webp", "ATTRIBUTIONS.md"}
    if required - got:
        raise ValueError(f"Missing required files: {required-got}")

print(f"Unpacked {len(got)} verified assets to {target.relative_to(root)}")
