#!/usr/bin/env python3
"""The phone and iPad copy of the booklet.

The print booklet is vector and heavy: every sheet carries its own fonts and
images. This flattens each page to one JPEG, so the file is about a quarter
of the size and opens fast, then lays the QR code back on top as the original
lossless image, so the code stays sharp at any zoom, and copies the
tap-to-open links across, so tapping the code opens the site.

    cd guide && python3 phone.py        # after the booklet is built

Needs PyMuPDF and Pillow (pip install pymupdf pillow). pikepdf, if present,
linearises the file so it starts showing before it has fully downloaded.
"""
import io
import os
import pymupdf
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, 'dist', 'ISOM-student-guide-2026-2027.pdf')
OUT = os.path.join(HERE, 'dist', 'ISOM-student-guide-2026-2027-phone.pdf')
QR = os.path.join(HERE, 'assets', 'qr.png')
WIDTH, QUALITY = 2400, 55          # px across an A2 page; JPEG quality

qr_bytes = open(QR, 'rb').read()
qr_size = Image.open(QR).size

src = pymupdf.open(SRC)
out = pymupdf.open()
qr_xref, qr_pages = 0, 0
for pg in src:
    z = WIDTH / pg.rect.width
    pix = pg.get_pixmap(matrix=pymupdf.Matrix(z, z), alpha=False)
    buf = io.BytesIO()
    Image.frombytes('RGB', (pix.width, pix.height), pix.samples).save(
        buf, 'JPEG', quality=QUALITY, optimize=True, progressive=True, subsampling=2)
    page = out.new_page(width=pg.rect.width, height=pg.rect.height)
    page.insert_image(page.rect, stream=buf.getvalue())

    # the QR, exactly where the sheet put it, as the original image
    for img in pg.get_images(full=True):
        if (img[2], img[3]) == qr_size:
            for r in pg.get_image_rects(img[0]):
                if qr_xref:
                    page.insert_image(r, xref=qr_xref)
                else:
                    qr_xref = page.insert_image(r, stream=qr_bytes)
                qr_pages += 1

    for ln in pg.get_links():
        if ln.get('kind') == pymupdf.LINK_URI:
            page.insert_link({'kind': pymupdf.LINK_URI, 'from': ln['from'], 'uri': ln['uri']})

out.set_metadata({'title': 'ISOM Student Guide 2026/2027 (phone)',
                  'author': 'ISOM Club, Kuwait University'})
out.save(OUT, garbage=4, deflate=True)

try:
    import pikepdf
    with pikepdf.open(OUT, allow_overwriting_input=True) as p:
        p.save(OUT, linearize=True)
except ImportError:
    pass

print('wrote %s: %d pages, QR on %d, %.1f MB' % (os.path.relpath(OUT, HERE), out.page_count, qr_pages,
                                                  os.path.getsize(OUT) / 1e6))
