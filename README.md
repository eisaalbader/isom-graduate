# ISOM Student Guide 2026 / 2027

The club's student guide, rebuilt from the 2020/2021 Canva sheet, and the
graduation planner built on top of it.

Two things live here, and they share one source of truth:

| | |
|---|---|
| `guide/` | the seven printed sheets, A2 landscape |
| `app/` + `public/` | **متى أتخرج؟ — When do I graduate**, the web planner, live at https://isom-graduate.vercel.app |

The planner does not redraw the maps. It lifts the markup, the stylesheet, the
wire router and the font files straight out of `guide/` at build time, so the
map on a phone is the map on the sheet. Fix a prerequisite line in
`guide/data/courses.json` and it moves in both.

## The sheets

| Page | | |
|---|---|---|
| cover | | generated from the course graph — every dot a course, every curve a prerequisite |
| 01 | Management Information Systems | نظم المعلومات الإدارية |
| 02 | Operations and Supply Chain Management | إدارة العمليات وسلسلة الإمدادات |
| 03 | General courses | المقررات العامة |
| 04 | Elective courses | المقررات الاختيارية |
| 05 | Changing your major | شروط التحويل |
| 06 | Important numbers | أرقام مهمة |

Finished PDFs are in `pdf/`. `pdf/ISOM-student-guide-2026-2027.pdf` is all
seven in order, for print. `pdf/ISOM-student-guide-2026-2027-phone.pdf` is the
same booklet made light for a phone or iPad (`cd guide && python3 phone.py`);
its QR still scans and tapping it opens the site.

## Everything is checked

`guide/verification-log.md` records what was checked against the Kuwait
University registration portal, course by course, and what could not be. The
short version: every course number and name on every sheet was looked up
individually. Credit hours are the one figure the portal does not publish, so
the planner counts **courses**, not credits.

Known open questions for the department are listed at the end of that log —
among them two elective numbers that return nothing in the portal, and one
course whose prerequisite is printed differently on two pages.

## Building

```bash
npm install
npm run qr        # assets/qr.png — refuses to save a code that will not scan
npm run sheets    # dist/*.html
npm run render    # dist/*.pdf + *.png   (needs Playwright's Chromium)
npm run verify    # the checks below, plus the title centre line
npm run planner   # public/index.html
npm test          # the planner's scheduler and pick rules
```

`npm run verify` fails the build on any of: a course number that does not match
the data file, printed credits that disagree with it, anything spilling off the
sheet, text clipped by its own box, two blocks overlapping, a wire crossing
text, **two wires crossing each other**, an unpainted arrowhead, or card text
under 4.5:1 contrast.

`guide/BASELINE.md` is the design contract. It was written down as the club
settled each decision during review, and it wins over any new idea unless the
club says otherwise.

## Publishing

Live at https://isom-graduate.vercel.app, published by hand from the club's
machine. A push to GitHub does not publish it. How to publish a change:
`DEPLOY.md`.
