# assets-src

Full-size originals that are **not** served. Keeping them outside `public/` stops Vite from copying them into `dist`.

- `avatars/{grin,normal,text_stickers}/*.png`: sources for `python3 scripts/optimize-stickers.py`, which writes the served WebP files and thumbnails into `public/avatars/`.
- `stickers/`: full-size police/RAF sticker art that the security creature images in `public/creatures/security/` were made from.
- `audio/music-bed.mp3`: alternate sound bed that nothing loads (the default is `public/audio/azaadi.mp3`).
- `creatures/eye.png`: unused raster eye (the app uses `public/creatures/eye.svg`).
