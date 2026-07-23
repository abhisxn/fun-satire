"""Deterministic grain texture generator."""

import os
import struct
import zlib


def mulberry32(seed: int):
    state = [seed & 0xFFFFFFFF]

    def next_int() -> int:
        state[0] = (state[0] + 0x6D2B79F5) & 0xFFFFFFFF
        x = state[0]
        x = ((x ^ (x >> 15)) * (x | 1)) & 0xFFFFFFFF
        x ^= (x + ((x ^ (x >> 7)) * (x | 61))) & 0xFFFFFFFF
        return ((x ^ (x >> 14)) & 0xFFFFFFFF)

    return next_int


def make_tile(width: int = 192, height: int = 192, seed: int = 0xF5A75C):
    rng = mulberry32(seed)
    grid_x = 4
    grid_y = 4
    lattice = [[rng() for _ in range(grid_x + 1)] for _ in range(grid_y + 1)]

    rows: list[bytes] = []
    for y in range(height):
        row = bytearray(b"\x00")  # PNG filter byte = None
        for x in range(width):
            fx = x / width * grid_x
            fy = y / height * grid_y
            x0 = int(fx)
            y0 = int(fy)
            x1 = min(x0 + 1, grid_x)
            y1 = min(y0 + 1, grid_y)
            tx = fx - x0
            ty = fy - y0
            sx = tx * tx * (3 - 2 * tx)
            sy = ty * ty * (3 - 2 * ty)
            a = lattice[y0][x0]
            b = lattice[y0][x1]
            c = lattice[y1][x0]
            d = lattice[y1][x1]
            top = a + sx * (b - a)
            bot = c + sx * (d - c)
            v = top + sy * (bot - top)
            mid = 0x80000000
            span = 0x40000000
            offset = (v - mid) / span
            base = 132
            amplitude = 18
            value = int(base + offset * amplitude)
            value = max(96, min(168, value))
            row.extend((value, value, value, 255))
        rows.append(bytes(row))
    raw = b"".join(rows)
    return raw


def write_png(path: str, width: int, height: int, raw_rows: bytes) -> None:
    def chunk(tag: bytes, data: bytes) -> bytes:
        return struct.pack(">I", len(data)) + tag + data + struct.pack(
            ">I", zlib.crc32(tag + data) & 0xFFFFFFFF
        )

    signature = b"\x89PNG\r\n\x1a\n"
    ihdr = struct.pack(">IIBBBBB", width, height, 8, 6, 0, 0, 0)
    idat = zlib.compress(raw_rows, 9)
    with open(path, "wb") as f:
        f.write(signature)
        f.write(chunk(b"IHDR", ihdr))
        f.write(chunk(b"IDAT", idat))
        f.write(chunk(b"IEND", b""))


def main() -> None:
    repo_root = os.path.normpath(
        os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
    )
    out = os.path.join(repo_root, "public", "textures", "grain.png")
    os.makedirs(os.path.dirname(out), exist_ok=True)
    raw = make_tile()
    write_png(out, 192, 192, raw)
    size = os.path.getsize(out)
    print(f"wrote {out} ({size} bytes)")


if __name__ == "__main__":
    main()
