"""Generate the served creature WebP files from the PNG originals in assets-src/creatures.

Pixel dimensions are preserved exactly: PlacardCreature and the other creature modules
hard-code each image's natural width and height, so only the encoding changes.

Usage: python3 scripts/optimize-creatures.py   (needs Pillow)
"""

from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SOURCE_DIR = ROOT / "assets-src" / "creatures"
OUTPUT_DIR = ROOT / "public" / "creatures"

QUALITY = 85


def optimize_creatures() -> None:
    total_orig = 0
    total_webp = 0
    for png_file in sorted(SOURCE_DIR.rglob("*.png")):
        rel = png_file.relative_to(SOURCE_DIR)
        webp_file = (OUTPUT_DIR / rel).with_suffix(".webp")
        webp_file.parent.mkdir(parents=True, exist_ok=True)
        with Image.open(png_file) as img:
            img.save(webp_file, "WEBP", quality=QUALITY, method=6, alpha_quality=100)
        orig_size = png_file.stat().st_size
        webp_size = webp_file.stat().st_size
        total_orig += orig_size
        total_webp += webp_size
        print(f"{rel}: {orig_size // 1024}KB -> {webp_size // 1024}KB")
    if total_orig > 0:
        print(f"\nTotal: {total_orig // 1024}KB -> {total_webp // 1024}KB ({(1 - total_webp / total_orig) * 100:.1f}% reduction)")


if __name__ == "__main__":
    optimize_creatures()
