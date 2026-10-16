import os
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
# Full-size PNG originals live outside public/ so Vite does not ship them; only the
# generated WebP files and thumbnails below are served.
SOURCE_DIR = ROOT / "assets-src" / "avatars"
AVATARS_DIR = ROOT / "public" / "avatars"
THUMBS_DIR = AVATARS_DIR / "thumbs"
THUMBS_DIR.mkdir(parents=True, exist_ok=True)

DIRS_TO_PROCESS = [
    "grin",
    "normal",
    "text_stickers",
]

def optimize_images():
    total_orig = 0
    total_webp = 0

    for name in DIRS_TO_PROCESS:
        d = SOURCE_DIR / name
        if not d.exists():
            continue
        out_dir = AVATARS_DIR / name
        out_dir.mkdir(parents=True, exist_ok=True)
        for png_file in sorted(d.glob("*.png")):
            webp_file = out_dir / f"{png_file.stem}.webp"
            with Image.open(png_file) as img:
                # Save full-res optimized WebP
                img.save(webp_file, "WEBP", quality=88, method=6)

                # Generate thumbnail if it's grin or text_stickers (used in gallery)
                if name in ("grin", "text_stickers"):
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
