"""Downscale and compress report images into docs/report/.tmp/ and write a size manifest.

Screenshots become JPEG (smaller upload to Google Drive); diagrams stay PNG for crisp text.
Usage: python3 docs/report/prepare_images.py
"""
import json
from pathlib import Path

from PIL import Image

HERE = Path(__file__).resolve().parent
OUT = HERE / ".tmp"
OUT.mkdir(exist_ok=True)
MAX_W = 1600

manifest = {}
sources = sorted((HERE / "screenshots").glob("*.png")) + sorted((HERE / "images").glob("*.png"))
for src in sources:
    img = Image.open(src)
    if img.width > MAX_W:
        img = img.resize((MAX_W, round(img.height * MAX_W / img.width)), Image.LANCZOS)
    is_diagram = src.parent.name == "images"
    if is_diagram:
        dest = OUT / src.name
        img.save(dest, optimize=True)
        kind = "png"
    else:
        dest = OUT / (src.stem + ".jpg")
        img.convert("RGB").save(dest, quality=84, optimize=True, progressive=True)
        kind = "jpg"
    manifest[src.stem] = {"file": dest.name, "type": kind, "width": img.width, "height": img.height}
    print(f"  {src.stem:28s} {img.width}x{img.height} {dest.stat().st_size // 1024} KB")

(OUT / "manifest.json").write_text(json.dumps(manifest, indent=2))
print(f"{len(manifest)} images, {sum((OUT / m['file']).stat().st_size for m in manifest.values()) // 1024} KB total")
