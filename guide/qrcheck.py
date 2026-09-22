#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Does the code scan off the finished sheet?

Not off the PNG preview and not off the source image — off the PDF, rasterised
at the resolution it will actually be printed at, A2 and both reprints. A QR
that decodes in the design tool and not on the wall is the whole failure mode.

    python3 qrcheck.py
"""
import json, os, subprocess, sys
import cv2, numpy as np
from PIL import Image

URL   = json.load(open('data/courses.json'))['site']['url']
PAGES = ['mis', 'oscm', 'general', 'electives', 'transfer', 'numbers']
SIZES = [(300, 'A2'), (212, 'A3'), (150, 'A4')]
det   = cv2.QRCodeDetector()
os.makedirs('dist/print', exist_ok=True)

bad = []
for page in PAGES:
    row = []
    for dpi, label in SIZES:
        tag = f'{page}{dpi}'
        subprocess.run(['pdftoppm', '-r', str(dpi), '-png', '-f', '1', '-l', '1',
                        f'dist/{page}.pdf', f'dist/print/{tag}'], check=True)
        f = [x for x in os.listdir('dist/print') if x.startswith(tag + '-')][0]
        im = Image.open('dist/print/' + f).convert('RGB')
        W, H = im.size
        x0, x1 = int(W * 14/594), int(W * 43/594)          # 14mm margin, 28mm code
        y0, y1 = int(H * 0.855), int(H * 0.985)
        ok = False
        for pad in (0, 6, 12):
            a = cv2.cvtColor(np.array(im.crop((max(0, x0-pad), y0, x1+pad, y1))), cv2.COLOR_RGB2BGR)
            if det.detectAndDecode(a)[0] == URL:
                ok = True; break
        row.append(f'{label}:{"ok" if ok else "FAIL"}')
        if not ok: bad.append(f'{page} at {label}')
    print(f'  {page:<10} {"  ".join(row)}')
print(f'\n{URL}')
if bad:
    print('THE CODE DOES NOT SCAN:', ', '.join(bad)); sys.exit(1)
print('scans on every sheet, at every print size')
