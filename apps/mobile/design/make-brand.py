#!/usr/bin/env python3
"""
Quezby's logo, and every image made from it, in the Arena look
(docs/design/design-language.md).

    python3 apps/mobile/design/make-brand.py

The logo is a Q: a thick magenta ring whose tail is a gold lightning bolt —
the reflex — with two swipe-up chevrons in its eye, the move the whole feed is
made of. It is outlined, lipped and lit like every tile in the app, on the
arena's night. Colours come from src/ui/tokens.ts (generated from
design/palette.mjs) and fonts from assets/fonts, so nothing here holds its
own. Needs Pillow, NumPy and SciPy.

Writes:
  design/brand/quezby-icon-1024.png         App Store icon (no alpha)
  design/brand/quezby-icon-512.png          Google Play icon
  design/brand/quezby-logo-1024x512.png     mark, name and line, wide
  design/brand/quezby-feature-1024x500.png  Google Play feature graphic
  design/brand/quezby-mark.png              the mark alone, transparent
  ios/Quezby/Images.xcassets/AppIcon.appiconset/icon-1024.png
  android/app/src/main/res/mipmap-*/        legacy and adaptive launcher icons
  assets/brand/mark.png (@2x, @3x)          the BrandMark the app draws
  ios/Quezby/Images.xcassets/LaunchMark.imageset  the same, on the launch screen
"""
from __future__ import annotations

import math
import re
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont
from scipy import ndimage

ROOT = Path(__file__).resolve().parents[1]
BRAND = ROOT / "design" / "brand"
FONTS = ROOT / "assets" / "fonts"

# Drawn this many times larger, then scaled down: smooth edges everywhere.
SUPERSAMPLE = 4


def palette() -> dict[str, tuple[int, int, int]]:
    """The arena roles as RGB, read from the generated tokens."""
    text = (ROOT / "src" / "ui" / "tokens.ts").read_text()
    block = text[text.index("export const arena") :]
    block = block[: block.index("};")]
    return {
        key: tuple(int(value[i : i + 2], 16) for i in (1, 3, 5))
        for key, value in re.findall(r"(\w+): '(#[0-9a-f]{6})'", block)
    }


P = palette()
WHITE = (255, 255, 255)


def mix(a, b, t):
    return tuple(round(x + (y - x) * t) for x, y in zip(a, b))


# ------------------------------------------------------------------ masks

def blank(size):
    return Image.new("L", size, 0)


def as_bool(mask):
    return np.asarray(mask) > 127


def as_mask(array):
    return Image.fromarray((array * 255).astype(np.uint8))


def dilate(mask, radius):
    """Grows a shape by `radius` pixels, round at every corner."""
    return as_mask(ndimage.distance_transform_edt(~as_bool(mask)) <= radius)


def shifted(mask, dx, dy):
    out = blank(mask.size)
    out.paste(mask, (round(dx), round(dy)))
    return out


def extrude(mask, depth, steps=24):
    """The shape and every copy of it on the way down `depth` pixels: its lip."""
    base = as_bool(mask)
    out = base.copy()
    for i in range(1, steps + 1):
        dy = round(depth * i / steps)
        if dy:
            out[dy:, :] |= base[:-dy, :]
    return as_mask(out)


def union(*masks):
    out = np.zeros(masks[0].size[::-1], dtype=bool)
    for mask in masks:
        out |= as_bool(mask)
    return as_mask(out)


def minus(a, b):
    return as_mask(as_bool(a) & ~as_bool(b))


def both(a, b):
    return as_mask(as_bool(a) & as_bool(b))


def blur(mask, radius):
    return mask.filter(ImageFilter.GaussianBlur(radius))


# ------------------------------------------------------------------ fills

def ramp(t, stops):
    out = np.zeros(t.shape + (3,), dtype=np.float32)
    at = [stop[0] for stop in stops]
    for channel in range(3):
        out[..., channel] = np.interp(t, at, [stop[1][channel] for stop in stops])
    return Image.fromarray(out.round().astype(np.uint8), "RGB").convert("RGBA")


def linear(size, stops, angle=90):
    """A linear gradient across `size`; 90° runs top to bottom."""
    w, h = size
    ys, xs = np.mgrid[0:h, 0:w].astype(np.float32)
    a = math.radians(angle)
    dx, dy = math.cos(a), math.sin(a)
    half = abs(w / 2 * dx) + abs(h / 2 * dy)
    t = ((xs - w / 2) * dx + (ys - h / 2) * dy + half) / (2 * half)
    return ramp(np.clip(t, 0, 1), stops)


def radial(size, center, radius, stops):
    w, h = size
    ys, xs = np.mgrid[0:h, 0:w].astype(np.float32)
    t = np.hypot(xs - center[0], ys - center[1]) / radius
    return ramp(np.clip(t, 0, 1), stops)


def paint(canvas, mask, fill, alpha=1.0):
    """Lays `fill` (a colour or an image) onto `canvas` through `mask`."""
    layer = Image.new("RGBA", canvas.size, fill + (255,)) if isinstance(fill, tuple) else fill.copy()
    a = np.asarray(mask).astype(np.float32) * alpha
    layer.putalpha(Image.fromarray(a.clip(0, 255).astype(np.uint8)))
    canvas.alpha_composite(layer)


# ------------------------------------------------------------------ shapes

class Frame:
    """Unit coordinates over a square of `unit` pixels, placed at `origin`."""

    def __init__(self, size, unit, origin=(0, 0)):
        self.size, self.unit, self.origin = size, unit, origin

    def x(self, v):
        return self.origin[0] + v * self.unit

    def y(self, v):
        return self.origin[1] + v * self.unit

    def pt(self, x, y):
        return (self.x(x), self.y(y))

    def px(self, v):
        return v * self.unit


def disc(frame, cx, cy, r):
    mask = blank(frame.size)
    ImageDraw.Draw(mask).ellipse([frame.x(cx - r), frame.y(cy - r), frame.x(cx + r), frame.y(cy + r)], fill=255)
    return mask


def polygon(frame, points):
    mask = blank(frame.size)
    ImageDraw.Draw(mask).polygon([frame.pt(x, y) for x, y in points], fill=255)
    return mask


def rounded_rect(frame, box, radius):
    mask = blank(frame.size)
    x0, y0, x1, y1 = box
    ImageDraw.Draw(mask).rounded_rectangle(
        [frame.x(x0), frame.y(y0), frame.x(x1), frame.y(y1)], radius=frame.px(radius), fill=255
    )
    return mask


def chevron(frame, cx, cy, width, height, stroke):
    mask = blank(frame.size)
    draw = ImageDraw.Draw(mask)
    points = [frame.pt(cx - width / 2, cy + height / 2), frame.pt(cx, cy - height / 2), frame.pt(cx + width / 2, cy + height / 2)]
    w = round(frame.px(stroke))
    draw.line(points, fill=255, width=w, joint="curve")
    for x, y in points:
        draw.ellipse([x - w / 2, y - w / 2, x + w / 2, y + w / 2], fill=255)
    return mask


def sparkle(frame, cx, cy, r):
    points = []
    for i in range(8):
        a = math.pi / 4 * i - math.pi / 2
        rr = r if i % 2 == 0 else r * 0.18
        points.append((cx + rr * math.cos(a), cy + rr * math.sin(a)))
    return polygon(frame, points)


def rotated(points, cx, cy, scale, degrees):
    a = math.radians(degrees)
    ca, sa = math.cos(a), math.sin(a)
    return [(cx + ((x - 0.5) * ca - (y - 0.5) * sa) * scale, cy + ((x - 0.5) * sa + (y - 0.5) * ca) * scale) for x, y in points]


# A bolt pointing down in a unit box: broad on top, a sharp tip below.
BOLT = [(0.34, 0.0), (0.76, 0.0), (0.56, 0.38), (0.84, 0.38), (0.26, 1.0), (0.43, 0.53), (0.16, 0.53)]

# The mark, in units of the square it is drawn in.
Q = dict(
    cx=0.46, cy=0.44, outer=0.30, inner=0.162,
    bolt=0.31, bolt_turn=-60, tail_angle=42, tail_at=1.0,
    chevron=(0.13, 0.058, 0.036), chevron_gap=0.064,
    depth=0.034, line=0.02,
)


# ------------------------------------------------------------------ the mark

def mark_shapes(frame):
    cx, cy = Q["cx"], Q["cy"]
    ring = minus(disc(frame, cx, cy, Q["outer"]), disc(frame, cx, cy, Q["inner"]))
    angle = math.radians(Q["tail_angle"])
    reach = Q["tail_at"] * Q["outer"]
    bolt = polygon(frame, rotated(BOLT, cx + reach * math.cos(angle), cy + reach * math.sin(angle), Q["bolt"], Q["bolt_turn"]))
    width, height, stroke = Q["chevron"]
    gap = Q["chevron_gap"]
    lower = chevron(frame, cx, cy + gap / 2 + 0.005, width, height, stroke)
    upper = chevron(frame, cx, cy - gap / 2 + 0.005, width, height, stroke)
    return ring, bolt, lower, upper


def draw_mark(canvas, frame, shadow=True):
    """The Q, its bolt and its chevrons, with outline, lip, gloss and shadow."""
    ring, bolt, lower, upper = mark_shapes(frame)
    depth, line = frame.px(Q["depth"]), frame.px(Q["line"])
    ring_body, bolt_body = extrude(ring, depth), extrude(bolt, depth * 0.9)
    outline = dilate(union(ring_body, bolt_body), line)

    if shadow:
        paint(canvas, blur(shifted(outline, 0, frame.px(0.025)), frame.px(0.02)), P["nightDeep"], 0.75)
    paint(canvas, outline, P["outline"])

    # The ring: a magenta face running into violet, its lip, a gloss, a rim light.
    size = canvas.size
    paint(canvas, ring_body, linear(size, [(0, P["primaryLip"]), (1, mix(P["primaryLip"], P["outline"], 0.45))]))
    paint(canvas, ring, linear(size, [(0.0, P["primaryHi"]), (0.45, P["primary"]), (1.0, P["secondary"])], 70))
    cx, cy, outer = Q["cx"], Q["cy"], Q["outer"]
    gloss = blank(size)
    ImageDraw.Draw(gloss).ellipse([frame.x(cx - outer * 1.05), frame.y(cy - outer * 1.25), frame.x(cx + outer * 0.95), frame.y(cy + outer * 0.02)], fill=255)
    paint(canvas, both(ring, blur(gloss, frame.px(0.012))), WHITE, 0.22)
    paint(canvas, both(minus(ring, shifted(ring, frame.px(0.012), frame.px(0.016))), gloss), WHITE, 0.55)

    # The bolt, over the ring.
    paint(canvas, dilate(bolt_body, line), P["outline"])
    paint(canvas, bolt_body, P["goldLip"])
    paint(canvas, bolt, linear(size, [(0.0, P["goldHi"]), (0.55, P["gold"]), (1.0, mix(P["gold"], P["goldLip"], 0.35))]))
    paint(canvas, minus(bolt, shifted(bolt, frame.px(0.01), frame.px(0.012))), WHITE, 0.6)

    # Swipe up: a white chevron and its pink echo, glowing in the eye of the Q.
    paint(canvas, blur(union(lower, upper), frame.px(0.02)), WHITE, 0.35)
    paint(canvas, dilate(lower, frame.px(0.009)), P["outline"], 0.9)
    paint(canvas, dilate(upper, frame.px(0.009)), P["outline"], 0.5)
    paint(canvas, lower, WHITE)
    paint(canvas, upper, mix(WHITE, P["primaryHi"], 0.55))


def arena(size, focus, reach):
    """The night behind everything: a magenta glow at `focus`, spotlight rays."""
    canvas = radial(size, focus, reach, [(0.0, mix(P["glow"], P["night"], 0.25)), (0.42, P["night"]), (1.0, P["nightDeep"])])
    rays = blank(size)
    draw = ImageDraw.Draw(rays)
    far = 2 * max(size)
    for i in range(14):
        a0 = 2 * math.pi * i / 14
        a1 = a0 + math.pi / 14
        draw.polygon([focus, (focus[0] + far * math.cos(a0), focus[1] + far * math.sin(a0)), (focus[0] + far * math.cos(a1), focus[1] + far * math.sin(a1))], fill=255)
    fade = radial(size, focus, reach * 0.79, [(0, WHITE), (1, (0, 0, 0))]).convert("L")
    rays = Image.fromarray((np.asarray(rays, dtype=np.float32) * np.asarray(fade, dtype=np.float32) / 255).astype(np.uint8))
    paint(canvas, rays, WHITE, 0.07)
    return canvas


def sparkles(canvas, frame, spots):
    for x, y, r, colour, alpha in spots:
        star = sparkle(frame, x, y, r)
        paint(canvas, blur(star, frame.px(r * 0.35)), colour, alpha * 0.6)
        paint(canvas, star, colour, alpha)


ICON_SPARKLES = [
    (0.17, 0.2, 0.045, P["goldHi"], 0.95),
    (0.84, 0.16, 0.03, WHITE, 0.85),
    (0.87, 0.52, 0.022, P["goldHi"], 0.8),
    (0.12, 0.62, 0.02, WHITE, 0.6),
]


def icon(size):
    """The app icon: the mark on the arena, full bleed, no transparency."""
    s = size * SUPERSAMPLE
    frame = Frame((s, s), s)
    canvas = arena((s, s), frame.pt(0.5, 0.36), frame.px(0.95))
    sparkles(canvas, frame, ICON_SPARKLES)
    draw_mark(canvas, frame)
    return canvas.resize((size, size), Image.LANCZOS).convert("RGB")


def mark_alone(size):
    s = size * SUPERSAMPLE
    canvas = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    draw_mark(canvas, Frame((s, s), s))
    return canvas.resize((size, size), Image.LANCZOS)


# ------------------------------------------------------------------ words

def text_mask(size, text, font, origin):
    mask = blank(size)
    ImageDraw.Draw(mask).text(origin, text, font=font, fill=255, anchor="ls")
    return mask


def fitted(weight, text, width, largest):
    """The largest em (in frame units) up to `largest` at which `text` spans `width`."""
    probe = ImageFont.truetype(str(FONTS / weight), 1000)
    return min(largest, width / (probe.getlength(text) / 1000))


def wordmark(canvas, frame, text, x, baseline, em):
    """"Quezby" as the game sets a title: white face, dark outline, violet lip."""
    font = ImageFont.truetype(str(FONTS / "Rubik-Black.ttf"), round(frame.px(em)))
    face = text_mask(canvas.size, text, font, frame.pt(x, baseline))
    body = extrude(face, frame.px(em * 0.075))
    outline = dilate(body, frame.px(em * 0.07))
    paint(canvas, blur(shifted(outline, 0, frame.px(em * 0.05)), frame.px(em * 0.05)), P["nightDeep"], 0.8)
    paint(canvas, outline, P["outline"])
    paint(canvas, body, P["secondaryLip"])
    paint(canvas, face, linear(canvas.size, [(0.0, WHITE), (0.62, WHITE), (1.0, mix(WHITE, P["secondaryText"], 0.8))]))


def line_of_text(canvas, frame, text, x, baseline, em, colour, weight="Nunito-Black.ttf"):
    font = ImageFont.truetype(str(FONTS / weight), round(frame.px(em)))
    face = text_mask(canvas.size, text, font, frame.pt(x, baseline))
    paint(canvas, dilate(face, frame.px(em * 0.1)), P["outline"], 0.85)
    paint(canvas, face, colour)


def wide(width, height):
    """The mark on the left; the name and the line beside it."""
    w, h = width * SUPERSAMPLE, height * SUPERSAMPLE
    unit = h * 0.92
    mark_x = w * 0.05
    frame = Frame((w, h), unit, (mark_x, (h - unit) / 2))
    canvas = arena((w, h), frame.pt(0.5, 0.42), h * 1.25)

    page = Frame((w, h), h)  # height units from the top-left, for words and stars
    sparkles(canvas, page, [
        (0.12, 0.16, 0.05, P["goldHi"], 0.9),
        (1.92, 0.14, 0.035, WHITE, 0.8),
        (1.2, 0.86, 0.03, P["goldHi"], 0.7),
        (1.86, 0.8, 0.025, WHITE, 0.6),
        (0.98, 0.1, 0.022, WHITE, 0.55),
    ])

    draw_mark(canvas, frame)

    words_x = (mark_x + unit * 0.86) / h
    room = w / h - words_x - 0.08
    name_em = fitted("Rubik-Black.ttf", "Quezby", room, 0.3)
    wordmark(canvas, page, "Quezby", words_x, 0.555, name_em)
    first, second = "Kaydırma alışkanlığın,", "rekabete dönüştü."
    line_em = fitted("Nunito-Black.ttf", first, room - 0.02, 0.08)
    line_of_text(canvas, page, first, words_x + 0.012, 0.7, line_em, P["inkMuted"])
    line_of_text(canvas, page, second, words_x + 0.012, 0.7 + line_em * 1.3, line_em, P["gold"])
    return canvas.resize((width, height), Image.LANCZOS).convert("RGB")


# ------------------------------------------------------------------ app icons

def rounded(image, ratio):
    size = image.size[0]
    mask = Image.new("L", (size, size), 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, size - 1, size - 1], radius=round(size * ratio), fill=255)
    out = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    out.paste(image, (0, 0), mask)
    return out


def circled(image):
    size = image.size[0]
    mask = Image.new("L", (size, size), 0)
    ImageDraw.Draw(mask).ellipse([0, 0, size - 1, size - 1], fill=255)
    out = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    out.paste(image, (0, 0), mask)
    return out


# Android's adaptive icon: 108 dp layers, of which only a 66 dp circle in the
# middle is shown under every launcher's mask.
SAFE_RADIUS = 32 / 108


def adaptive_frame(s):
    """The mark's square in a layer: the mark centred, as large as it can be
    with every point of it inside the safe circle."""
    probe = 1000
    canvas = Image.new("RGBA", (probe, probe), (0, 0, 0, 0))
    draw_mark(canvas, Frame((probe, probe), probe), shadow=False)
    ys, xs = np.nonzero(np.asarray(canvas)[..., 3] > 128)
    cx, cy = (xs.min() + xs.max()) / 2 / probe, (ys.min() + ys.max()) / 2 / probe
    reach = np.hypot(xs / probe - cx, ys / probe - cy).max()
    unit = s * SAFE_RADIUS / reach
    return Frame((s, s), unit, (s / 2 - cx * unit, s / 2 - cy * unit))


def adaptive_foreground(size):
    s = size * SUPERSAMPLE
    canvas = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    draw_mark(canvas, adaptive_frame(s))
    return canvas.resize((size, size), Image.LANCZOS)


def adaptive_background(size):
    s = size * SUPERSAMPLE
    frame = Frame((s, s), s)
    canvas = arena((s, s), frame.pt(0.5, 0.42), frame.px(0.8))
    sparkles(canvas, frame, [(0.27, 0.27, 0.03, P["goldHi"], 0.9), (0.76, 0.26, 0.02, WHITE, 0.8)])
    return canvas.resize((size, size), Image.LANCZOS).convert("RGB")


def adaptive_monochrome(size):
    """Android 13's themed icon: the silhouette, chevrons cut out."""
    s = size * SUPERSAMPLE
    frame = adaptive_frame(s)
    ring, bolt, lower, upper = mark_shapes(frame)
    # the ring stops short of the bolt, so the bolt still reads in one colour
    shape = union(minus(ring, dilate(bolt, frame.px(0.018))), bolt, lower, upper)
    out = Image.new("RGBA", (s, s), WHITE + (0,))
    out.putalpha(shape)
    return out.resize((size, size), Image.LANCZOS)


ADAPTIVE_XML = """<?xml version="1.0" encoding="utf-8"?>
<!-- Written by apps/mobile/design/make-brand.py. -->
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@mipmap/ic_launcher_background" />
    <foreground android:drawable="@mipmap/ic_launcher_foreground" />
    <monochrome android:drawable="@mipmap/ic_launcher_monochrome" />
</adaptive-icon>
"""


LAUNCH_JSON = """{
  "images" : [
    { "filename" : "launch-mark.png", "idiom" : "universal", "scale" : "1x" },
    { "filename" : "launch-mark@2x.png", "idiom" : "universal", "scale" : "2x" },
    { "filename" : "launch-mark@3x.png", "idiom" : "universal", "scale" : "3x" }
  ],
  "info" : { "author" : "xcode", "version" : 1 }
}
"""


def in_app_mark(size):
    """BrandMark: the icon as an Arena tile — rounded, outlined, on its lip."""
    s = size * SUPERSAMPLE
    canvas = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    frame = Frame((s, s), s)
    side, lip, line = 0.86, 0.05, 0.03
    box = ((1 - side) / 2, 0.03, (1 + side) / 2, 0.03 + side)
    tile = rounded_rect(frame, box, side * 0.225)
    body = extrude(tile, frame.px(lip))
    paint(canvas, dilate(body, frame.px(line)), P["outline"])
    paint(canvas, body, P["tileLip"])
    layer = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    layer.paste(icon(round(frame.px(side))).convert("RGBA"), (round(frame.x(box[0])), round(frame.y(box[1]))))
    paint(canvas, tile, layer)
    return canvas.resize((size, size), Image.LANCZOS)


def main() -> None:
    BRAND.mkdir(exist_ok=True)
    big = icon(1024)
    big.save(BRAND / "quezby-icon-1024.png")
    big.resize((512, 512), Image.LANCZOS).save(BRAND / "quezby-icon-512.png")
    wide(1024, 512).save(BRAND / "quezby-logo-1024x512.png")
    wide(1024, 500).save(BRAND / "quezby-feature-1024x500.png")
    mark_alone(1024).save(BRAND / "quezby-mark.png")

    ios = ROOT / "ios" / "Quezby" / "Images.xcassets" / "AppIcon.appiconset"
    big.save(ios / "icon-1024.png")

    res = ROOT / "android" / "app" / "src" / "main" / "res"
    legacy = {"mdpi": 48, "hdpi": 72, "xhdpi": 96, "xxhdpi": 144, "xxxhdpi": 192}
    for density, px in legacy.items():
        folder = res / f"mipmap-{density}"
        scaled = big.resize((px, px), Image.LANCZOS)
        rounded(scaled, 0.22).save(folder / "ic_launcher.png")
        circled(scaled).save(folder / "ic_launcher_round.png")
        layer = px * 108 // 48
        adaptive_foreground(layer).save(folder / "ic_launcher_foreground.png")
        adaptive_background(layer).save(folder / "ic_launcher_background.png")
        adaptive_monochrome(layer).save(folder / "ic_launcher_monochrome.png")
    anydpi = res / "mipmap-anydpi-v26"
    anydpi.mkdir(exist_ok=True)
    (anydpi / "ic_launcher.xml").write_text(ADAPTIVE_XML)
    (anydpi / "ic_launcher_round.xml").write_text(ADAPTIVE_XML)

    # BrandMark in the app, and the same tile on iOS's launch screen so the
    # first frame the app draws does not jump.
    marks = ROOT / "assets" / "brand"
    marks.mkdir(exist_ok=True)
    launch = ROOT / "ios" / "Quezby" / "Images.xcassets" / "LaunchMark.imageset"
    launch.mkdir(exist_ok=True)
    for scale, suffix in ((1, ""), (2, "@2x"), (3, "@3x")):
        tile = in_app_mark(96 * scale)
        tile.save(marks / f"mark{suffix}.png")
        tile.save(launch / f"launch-mark{suffix}.png")
    (launch / "Contents.json").write_text(LAUNCH_JSON)

    print("brand images written")


if __name__ == "__main__":
    main()
