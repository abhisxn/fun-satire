import os
from pathlib import Path
from PIL import Image

AVATARS_DIR = Path(__file__).resolve().parent.parent / "public" / "avatars"
THUMBS_DIR = AVATARS_DIR / "thumbs"
THUMBS_DIR.mkdir(parents=True, exist_ok=True)

DIRS_TO_PROCESS = [
    AVATARS_DIR / "grin",
    AVATARS_DIR / "normal",
    AVATARS_DIR / "text_stickers",
]

def optimize_images():
    total_orig = 0
    total_webp = 0

    for d in DIRS_TO_PROCESS:
        if not d.exists():
            continue
        for png_file in sorted(d.glob("*.png")):
            webp_file = png_file.with_suffix(".webp")
            with Image.open(png_file) as img:
                # Save full-res optimized WebP
                img.save(webp_file, "WEBP", quality=88, method=6)

                # Generate thumbnail if it's grin or text_stickers (used in gallery)
                if d.name in ("grin", "text_stickers"):
                    thumb_file = THUMBS_DIR / f"{png_file.stem}.webp"
                    thumb = img.copy()
                    thumb.thumbnail((240, 240), Image.Resampling.LANCZOS)
                    thumb.save(thumb_file, "WEBP", quality=82, method=6)

            orig_size = png_file.stat().st_size
            webp_size = webp_file.stat().st_size
            total_orig += orig_size
            total_webp += webp_size
            print(f"Converted {png_file.name}: {orig_size // 1024}KB -> {webp_size // 1024}KB")

    if total_orig > 0:
        print(f"\nTotal: {total_orig // 1024}KB -> {total_webp // 1024}KB ({(1 - total_webp / total_orig) * 100:.1f}% reduction)")

if __name__ == "__main__":
    optimize_images()
