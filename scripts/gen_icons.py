#!/usr/bin/env python3
"""Genereert PWA-iconen (dark bg + teal checkmark) zonder externe libs."""
import os
import struct
import zlib
import math

BG = (11, 17, 32)        # #0b1120
ACCENT = (45, 212, 191)  # #2dd4bf


def dist_point_seg(px, py, ax, ay, bx, by):
    dx, dy = bx - ax, by - ay
    if dx == 0 and dy == 0:
        return math.hypot(px - ax, py - ay)
    t = max(0.0, min(1.0, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)))
    return math.hypot(px - (ax + t * dx), py - (ay + t * dy))


def make_png(size, path):
    w = max(1.0, size * 0.085)  # streekdikte
    # genormaliseerde checkmark-punten -> pixels
    p = [(0.27, 0.53), (0.43, 0.69), (0.75, 0.33)]
    pts = [(x * size, y * size) for x, y in p]
    raw = bytearray()
    for y in range(size):
        raw.append(0)  # filter type 0 per rij
        for x in range(size):
            d1 = dist_point_seg(x + 0.5, y + 0.5, *pts[0], *pts[1])
            d2 = dist_point_seg(x + 0.5, y + 0.5, *pts[1], *pts[2])
            d = min(d1, d2)
            edge = d - w / 2.0
            if edge <= 0:
                col = ACCENT
            elif edge < 1.5:  # zachte rand (anti-alias)
                a = 1.0 - edge / 1.5
                col = tuple(int(ACCENT[i] * a + BG[i] * (1 - a)) for i in range(3))
            else:
                col = BG
            raw += bytes(col)

    comp = zlib.compress(bytes(raw), 9)

    def chunk(tag, data):
        return (struct.pack('>I', len(data)) + tag + data +
                struct.pack('>I', zlib.crc32(tag + data) & 0xFFFFFFFF))

    ihdr = struct.pack('>IIBBBBB', size, size, 8, 2, 0, 0, 0)  # 8-bit RGB
    png = b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', ihdr) + chunk(b'IDAT', comp) + chunk(b'IEND', b'')
    with open(path, 'wb') as f:
        f.write(png)
    print('geschreven:', path, f'({size}x{size})')


if __name__ == '__main__':
    out = os.path.join(os.path.dirname(__file__), '..', 'public', 'icons')
    os.makedirs(out, exist_ok=True)
    make_png(192, os.path.join(out, 'icon-192.png'))
    make_png(512, os.path.join(out, 'icon-512.png'))
