#!/usr/bin/env python3
"""
App icons from the brand mark — magenta into violet, a round Q, the swipe.

    python3 apps/mobile/design/make-icons.py

Writes the iOS single-size icon and every Android launcher density. Colours
are the `brandFrom` / `brandTo` tokens (see design/palette.mjs). Needs Pillow.
"""
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
FONT = ROOT / "design" / "fonts" / "Quicksand-Bold.ttf"
BRAND_FROM = (0xC9, 0x1B, 0x86)
BRAND_TO = (0x69, 0x3A, 0xD4)
WHITE = (255, 255, 255)

SIZE = 1024


def gradient(size: int) -> Image.Image:
    image = Image.new("RGB", (size, size))
    pixels = image.load()
    for y in range(size):
        for x in range(size):
            t = (x + y) / (2 * (size - 1))
            pixels[x, y] = tuple(
                round(a + (b - a) * t) for a, b in zip(BRAND_FROM, BRAND_TO)
            )
    return image


def mark(size: int = SIZE) -> Image.Image:
    image = gradient(size)
    draw = ImageDraw.Draw(image)
    font = ImageFont.truetype(str(FONT), int(size * 0.58))
    draw.text((size * 0.44, size * 0.5), "Q", font=font, fill=WHITE, anchor="mm")

    stroke = int(size * 0.055)
    x, top, bottom, wing = size * 0.765, size * 0.2, size * 0.42, size * 0.085
    draw.line([(x, bottom), (x, top)], fill=WHITE, width=stroke)
    draw.line([(x - wing, top + wing), (x, top), (x + wing, top + wing)], fill=WHITE, width=stroke, joint="curve")
    for cx, cy in [(x, bottom), (x, top), (x - wing, top + wing), (x + wing, top + wing)]:
        r = stroke / 2
        draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=WHITE)
    return image


def rounded(image: Image.Image, radius_ratio: float) -> Image.Image:
    size = image.size[0]
    mask = Image.new("L", (size, size), 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, size - 1, size - 1], radius=int(size * radius_ratio), fill=255)
    out = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    out.paste(image, (0, 0), mask)
    return out


def circle(image: Image.Image) -> Image.Image:
    size = image.size[0]
    mask = Image.new("L", (size, size), 0)
    ImageDraw.Draw(mask).ellipse([0, 0, size - 1, size - 1], fill=255)
    out = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    out.paste(image, (0, 0), mask)
    return out


def main() -> None:
    base = mark()

    ios = ROOT / "ios" / "Quezby" / "Images.xcassets" / "AppIcon.appiconset"
    base.save(ios / "icon-1024.png")
    (ios / "Contents.json").write_text(
        '{\n  "images" : [\n    {\n      "filename" : "icon-1024.png",\n'
        '      "idiom" : "universal",\n      "platform" : "ios",\n'
        '      "size" : "1024x1024"\n    }\n  ],\n'
        '  "info" : {\n    "author" : "xcode",\n    "version" : 1\n  }\n}\n'
    )

    densities = {"mdpi": 48, "hdpi": 72, "xhdpi": 96, "xxhdpi": 144, "xxxhdpi": 192}
    res = ROOT / "android" / "app" / "src" / "main" / "res"
    for density, px in densities.items():
        scaled = base.resize((px, px), Image.LANCZOS)
        rounded(scaled, 0.22).save(res / f"mipmap-{density}" / "ic_launcher.png")
        circle(scaled).save(res / f"mipmap-{density}" / "ic_launcher_round.png")

    print("icons written")


if __name__ == "__main__":
    main()
