"""Builds WisePath logo assets from the source JPG (white background).

usage: python make_logo_assets.py <source.jpg> <web public dir> <mobile assets dir>
"""
import sys
from collections import deque
from pathlib import Path

from PIL import Image, ImageFilter

src, web_dir, mobile_dir = Path(sys.argv[1]), Path(sys.argv[2]), Path(sys.argv[3])
SCALE = 4

base = Image.open(src).convert("RGB")
W0, H0 = base.size
big = base.resize((W0 * SCALE, H0 * SCALE), Image.LANCZOS).filter(ImageFilter.UnsharpMask(radius=2, percent=60, threshold=2))
W, H = big.size
px = big.load()

# 1) background = near-white pixels connected to the border (keeps the white book pages inside)
def is_bg(c):
    return min(c) >= 228

bg = bytearray(W * H)
q = deque()
for x in range(W):
    for y in (0, H - 1):
        if is_bg(px[x, y]) and not bg[y * W + x]:
            bg[y * W + x] = 1
            q.append((x, y))
for y in range(H):
    for x in (0, W - 1):
        if is_bg(px[x, y]) and not bg[y * W + x]:
            bg[y * W + x] = 1
            q.append((x, y))
while q:
    x, y = q.popleft()
    for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
        if 0 <= nx < W and 0 <= ny < H:
            i = ny * W + nx
            if not bg[i] and is_bg(px[nx, ny]):
                bg[i] = 1
                q.append((nx, ny))

bg_img = Image.frombytes("L", (W, H), bytes(v * 255 for v in bg))
fringe_img = bg_img.filter(ImageFilter.MaxFilter(9))
fringe = fringe_img.load()

# 2) alpha: transparent background, "color to alpha" against white along the edge, opaque inside
out = Image.new("RGBA", (W, H))
opx = out.load()
for y in range(H):
    for x in range(W):
        r, g, b = px[x, y]
        if bg[y * W + x]:
            opx[x, y] = (255, 255, 255, 0)
        elif fringe[x, y]:
            a = max(255 - r, 255 - g, 255 - b) / 255
            if a <= 0.02:
                opx[x, y] = (255, 255, 255, 0)
            else:
                f = lambda c: max(0, min(255, round(255 - (255 - c) / a)))
                opx[x, y] = (f(r), f(g), f(b), round(a * 255))
        else:
            opx[x, y] = (r, g, b, 255)


def trim(img, pad=0):
    box = img.getbbox()
    img = img.crop(box)
    if pad:
        canvas = Image.new("RGBA", (img.width + 2 * pad, img.height + 2 * pad), (255, 255, 255, 0))
        canvas.paste(img, (pad, pad), img)
        img = canvas
    return img


full = trim(out, pad=8)
# The mark (graduation cap + book + path) sits above the WISEPATH text, which starts at ~row 184 of the 256px source.
mark = trim(out.crop((0, 0, W, round(H0 * 180 / 256) * SCALE)), pad=8)
# "WISEPATH" lettering only (rows ~184–232), for horizontal lockups next to the mark.
wordmark = trim(out.crop((0, round(H0 * 182 / 256) * SCALE, W, round(H0 * 234 / 256) * SCALE)), pad=4)


def fit(img, box_w, box_h):
    ratio = min(box_w / img.width, box_h / img.height)
    return img.resize((max(1, round(img.width * ratio)), max(1, round(img.height * ratio))), Image.LANCZOS)


def square(img, size, content_ratio, bg_color=None):
    canvas = Image.new("RGBA", (size, size), bg_color or (255, 255, 255, 0))
    inner = fit(img, round(size * content_ratio), round(size * content_ratio))
    canvas.paste(inner, ((size - inner.width) // 2, (size - inner.height) // 2), inner)
    return canvas


# ---------------------------------------------------------------- website
brand_web = web_dir / "brand"
brand_web.mkdir(parents=True, exist_ok=True)
fit(full, 800, 800).save(brand_web / "wisepath-logo.png", optimize=True)
fit(mark, 512, 512).save(brand_web / "wisepath-mark.png", optimize=True)
fit(wordmark, 600, 200).save(brand_web / "wisepath-wordmark.png", optimize=True)
square(mark, 64, 0.96).save(web_dir / "favicon.png", optimize=True)
square(mark, 180, 0.82, (255, 255, 255, 255)).convert("RGB").save(web_dir / "apple-touch-icon.png", optimize=True)
square(mark, 192, 0.84, (255, 255, 255, 255)).convert("RGB").save(web_dir / "icon-192.png", optimize=True)
square(mark, 512, 0.84, (255, 255, 255, 255)).convert("RGB").save(web_dir / "icon-512.png", optimize=True)

# ---------------------------------------------------------------- Android app
brand_mobile = mobile_dir / "brand"
brand_mobile.mkdir(parents=True, exist_ok=True)
fit(full, 800, 800).save(brand_mobile / "wisepath-logo.png", optimize=True)
fit(mark, 512, 512).save(brand_mobile / "wisepath-mark.png", optimize=True)
fit(wordmark, 600, 200).save(brand_mobile / "wisepath-wordmark.png", optimize=True)
# Launcher icon: white tile, mark centered.
square(mark, 1024, 0.80, (255, 255, 255, 255)).convert("RGB").save(mobile_dir / "icon.png", optimize=True)
# Adaptive icon foreground: transparent, mark inside the 66% safe zone (background color comes from app.config).
square(mark, 1024, 0.60).save(mobile_dir / "adaptive-icon.png", optimize=True)
# Splash: full logo on transparent background (splash background color comes from app.config).
square(full, 1024, 0.92).save(mobile_dir / "splash.png", optimize=True)

print("full", full.size, "mark", mark.size)
for p in sorted(list(brand_web.glob("*")) + list(web_dir.glob("*.png")) + list(brand_mobile.glob("*")) + list(mobile_dir.glob("*.png"))):
    print(p, Image.open(p).size, p.stat().st_size)
