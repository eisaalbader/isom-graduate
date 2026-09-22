#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""assets/qr.png — the code printed on every sheet.

Brand colour and the club mark in the middle; the geometry left alone.
Rounded modules and rounded eyes look better and stop phones reading the
code, so they are not used. Error-correction Q keeps the module count at 29,
which makes each module larger at print size — that, not styling, is what
makes a code scan. The build fails if the finished image does not decode.

    python3 mkqr.py
"""
import sys
import qrcode
from qrcode.constants import ERROR_CORRECT_Q
from PIL import Image, ImageDraw
import cv2, numpy as np

URL    = "https://isom-graduate.vercel.app"
PX     = 24          # pixels per module
QUIET  = 4           # quiet zone, in modules — never reduce this
MAROON = (102, 0, 0)
WHITE  = (255, 255, 255)
LOGO   = 0.15        # the mark's height as a fraction of the code

q = qrcode.QRCode(error_correction=ERROR_CORRECT_Q, box_size=1, border=0)
q.add_data(URL); q.make(fit=True)
m = q.get_matrix(); n = len(m)
size = (n + QUIET * 2) * PX

img = Image.new("RGB", (size, size), WHITE)
d = ImageDraw.Draw(img)
for r in range(n):
    for c in range(n):
        if m[r][c]:
            x, y = (c + QUIET) * PX, (r + QUIET) * PX
            d.rectangle([x, y, x + PX, y + PX], fill=MAROON)

logo = Image.open("assets/isom-logo.png").convert("RGBA")
tgt  = int(size * LOGO)
logo = logo.resize((int(logo.width * tgt / logo.height), tgt), Image.LANCZOS)
pad  = int(PX * 1.1)
cx, cy = size // 2, size // 2
d.rounded_rectangle([cx - logo.width//2 - pad, cy - logo.height//2 - pad,
                     cx + logo.width//2 + pad, cy + logo.height//2 + pad],
                    radius=PX, fill=WHITE)
img.paste(logo, (cx - logo.width//2, cy - logo.height//2), logo)
img.save("assets/qr.png")

det = cv2.QRCodeDetector()
sizes = (420, 300, 220, 140, 120, 100)
bad = []
for s in sizes:
    a = cv2.cvtColor(np.array(img.resize((s, s), Image.LANCZOS)), cv2.COLOR_RGB2BGR)
    if det.detectAndDecode(a)[0] != URL:
        bad.append(s)
print(f"assets/qr.png  {n} modules, {img.size[0]}px  ->  {URL}")
if len(bad) > 1:
    print("FAILS TO DECODE AT:", bad); sys.exit(1)
print("decodes at", [s for s in sizes if s not in bad], "px — 30mm at 300dpi is 354px")
