#!/usr/bin/env python3
"""The copy of the booklet students get on their phones and iPads.

Built from the screen renders (`node screen.js`). Every page keeps its vector
text and lines, laid out exactly as in the print booklet, so it stays sharp at
any zoom; it just leaves out the parts that make a phone slow to draw a page
(see screen.js). Then, in one file:

- every picture that repeats from page to page (the crest, the logos, the
  QR, the watermarks) is stored once instead of once per page;
- the cover's colour wash, a soft gradient photographed by screen.js, is
  stored as a full-colour JPEG, the one lossy step, on the one picture where
  it cannot show;
- every other picture is repacked losslessly (PNG row filters) and checked
  pixel for pixel against what it was. The QR comes out exactly as it went in,
  and its tap-to-open link comes through from the sheets unchanged;
- the file is linearised, so it starts showing before it has fully
  downloaded.

    cd guide && node screen.js && python3 phone.py

Needs PyMuPDF, pikepdf and Pillow (pip install pymupdf pikepdf pillow).
"""
import io
import os
import struct

import pikepdf
import pymupdf
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
PAGES = ['cover-b', 'mis', 'oscm', 'general', 'electives', 'transfer', 'numbers']
OUT = os.path.join(HERE, 'dist', 'ISOM-student-guide-2026-2027-phone.pdf')

out = pymupdf.open()
for name in PAGES:
    out.insert_pdf(pymupdf.open(os.path.join(HERE, 'dist', 'screen', name + '.pdf')))
out.set_metadata({'title': 'ISOM Student Guide 2026/2027',
                  'author': 'ISOM Club, Kuwait University',
                  'subject': 'Phone and iPad edition'})
out.save(OUT, garbage=4, deflate=True, clean=True)      # garbage=4: identical objects stored once
pages = out.page_count
out.close()


def components(img):
    cs = img.get('/ColorSpace')
    if cs == '/DeviceGray':
        return 1
    if cs == '/DeviceRGB':
        return 3
    if isinstance(cs, pikepdf.Array) and cs[0] == '/ICCBased':
        return int(cs[1].get('/N'))
    return 0


def png_rows(raw, w, h, n):
    """The same pixels as a zlib stream of PNG-filtered rows (PDF /Predictor 15)."""
    buf = io.BytesIO()
    Image.frombytes('L' if n == 1 else 'RGB', (w, h), raw).save(buf, 'PNG', optimize=True)
    png, pos, idat = buf.getvalue(), 8, b''
    while pos < len(png):
        size, kind = struct.unpack('>I4s', png[pos:pos + 8])
        if kind == b'IDAT':
            idat += png[pos + 8:pos + 8 + size]
        pos += 12 + size
    return idat


def pictures(res, seen):
    """Every picture a page draws, including inside its groups."""
    for x in (res.get('/XObject') or {}).values() if res is not None else ():
        if x.objgen in seen:
            continue
        seen.add(x.objgen)
        if x.get('/Subtype') == '/Image':
            yield x
        elif x.get('/Subtype') == '/Form':
            yield from pictures(x.get('/Resources'), seen)


wash = repacked = saved = 0
with pikepdf.open(OUT, allow_overwriting_input=True) as pdf:
    # the cover's wash: the one opaque colour picture on the cover shaped like the page
    box = pdf.pages[0].MediaBox
    page_ratio = float(box[2] - box[0]) / float(box[3] - box[1])
    wash_ids = {img.objgen for img in pictures(pdf.pages[0].Resources, set())
                if components(img) == 3 and '/SMask' not in img
                and abs(int(img.Width) / int(img.Height) - page_ratio) < 0.01}
    for img in pdf.objects:
        if not (isinstance(img, pikepdf.Stream) and img.get('/Subtype') == '/Image'):
            continue
        if img.get('/Filter') != '/FlateDecode' or '/DecodeParms' in img or img.get('/BitsPerComponent') != 8:
            continue
        n, w, h = components(img), int(img.Width), int(img.Height)
        if n not in (1, 3):
            continue
        raw, before = img.read_bytes(), len(img.read_raw_bytes())
        if img.objgen in wash_ids:
            buf = io.BytesIO()
            Image.frombytes('RGB', (w, h), raw).save(buf, 'JPEG', quality=92, subsampling=0, optimize=True)
            img.write(buf.getvalue(), filter=pikepdf.Name.DCTDecode)
            wash += 1
            saved += before - len(buf.getvalue())
            continue
        packed = png_rows(raw, w, h, n)
        if len(packed) >= before:
            continue
        img.write(packed, filter=pikepdf.Name.FlateDecode,
                  decode_parms=pikepdf.Dictionary(Predictor=15, Colors=n, BitsPerComponent=8, Columns=w))
        if img.read_bytes() != raw:                      # lossless, or it does not ship
            raise SystemExit('repacking changed the pixels of a %dx%d picture' % (w, h))
        repacked += 1
        saved += before - len(packed)
    if wash != 1:
        raise SystemExit('expected exactly one cover wash to store as JPEG, found %d' % wash)
    pdf.save(OUT, linearize=True)

print('wrote %s: %d pages, %.2f MB  (wash as JPEG, %d pictures repacked losslessly, %.0f KB saved)'
      % (os.path.relpath(OUT, HERE), pages, os.path.getsize(OUT) / 1e6, repacked, saved / 1024))
