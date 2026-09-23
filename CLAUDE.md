# Working on the ISOM student guide

Read this before changing anything. It is the standing agreement with the club,
written down as each decision was made. `guide/BASELINE.md` holds the design
contract in detail; this file says how the pieces fit, how to change them, and
what must never be quietly undone.

---

## What this is

The ISOM Club's student guide for Kuwait University's College of Business
Administration, rebuilt from the club's 2020/2021 Canva sheet, plus a web
planner built on top of it.

| | |
|---|---|
| `guide/` | seven printed sheets, A2 landscape (594 × 420 mm) |
| `app/` + `public/` | **متى أتخرج؟ — When do I graduate**, live at https://isom-graduate.vercel.app |

**The planner does not redraw the maps.** `app/build-app.js` lifts the page
markup, the stylesheet, the connector router and the font files out of `guide/`
at build time and scopes the stylesheet to `.stage`. So the map on a phone *is*
the map on the sheet. Change a prerequisite line in `guide/data/courses.json`
and it moves in both. Never hand-copy a course into the app.

The sheets, in order: cover · 01 MIS · 02 OSCM · 03 General courses ·
04 Electives · 05 Changing your major · 06 Important numbers.

---

## Changing something

Everything the pages print lives in **`guide/data/courses.json`**. Nothing is
hard-coded in the layout. Build order matters — the planner is built from the
guide's rendered pages, so the guide goes first.

```bash
npm install                    # once
npm run setup                  # once — downloads the Chromium that renders the PDFs
cd guide && node build.js      # data -> dist/*.html
cd guide && node covers.js     # the cover, drawn from the same data
cd guide && node render.js mis # one page -> dist/mis.pdf + .png
                               #   pages: cover-b mis oscm general electives transfer numbers
cd guide && node verify.js     # every check below, all six sheets
cd guide && node align-check.js
cd guide && python3 mkqr.py    # only if the site URL changes
cd guide && python3 qrcheck.py # decodes the QR back off the finished PDFs
python3 app/sync-pre.py        # after changing a line on the MIS map
cd app  && node build-app.js   # -> public/index.html
node app/test.js app/rules.js app/rules2.js   # 22 checks on the planner
```

Then the booklet:

```bash
cd guide && pdfunite dist/cover-b.pdf dist/mis.pdf dist/oscm.pdf dist/general.pdf \
  dist/electives.pdf dist/transfer.pdf dist/numbers.pdf dist/ISOM-student-guide-2026-2027.pdf
cd guide && python3 phone.py   # the phone/iPad copy: pages flattened, QR kept sharp, links kept
```

The print booklet is vector, about 6 MB. The phone copy is about 1.6 MB. It
lays the QR back on top as the original image, so the code scans at any zoom,
and tapping it opens the site.

Publishing: `DEPLOY.md`. The Vercel project and the domain already exist.

The repo lives at **https://github.com/eisaalbader/isom-graduate** (private) and
on the club's machine at `C:\Users\user\Desktop\isom-guide\isom-graduate`,
with `origin` set and `main` tracking it. Push from there: a cloud session can
clone it but not push to it (checked 23 Sep).

### A page ships only when all of these pass

`verify.js` fails the build on any of: a course number that does not match the
data file · printed credits that disagree with it · anything spilling off the
sheet · text clipped by its own box · two blocks overlapping · a wire crossing
text · **two wires crossing each other** · an unpainted arrowhead · card text
under 4.5:1 contrast. `align-check.js` holds the title's centre line over the
course columns to 0.02 px. `qrcheck.py` rasterises each finished **PDF** at A2,
A3 and A4 and decodes the code out of the printed page.

### The same commit must build the same sheets anywhere

The sheets are rendered by a real browser, and Chromium builds disagree with
each other by a pixel or two on accumulated text height. That is enough to make
a map clear its caption on one machine and land on it on another. Two rules keep
one commit meaning one guide:

- **Never hard-code a browser path.** The render and verify scripts read
  `CHROMIUM_PATH`, fall back to a pinned sandbox build if it happens to be
  there, and otherwise let Playwright use whatever `npm run setup` installed.
- **Line endings stay LF everywhere** (`.gitattributes`). The planner inlines
  the guide's CSS and markup, so a line ending is a byte in the shipped page; a
  CRLF checkout would publish a different site from the same commit.

Where a layout is tight, give it slack rather than tuning it to the machine you
are on. Checked 23 Sep on Windows (Chromium 1243) and Linux (1194): all six
sheets pass, the three maps share one centre line, and `public/index.html` comes
out byte-identical on both — and out of a clean clone.

**When you add a new component, add its class to `verify.js`'s selector lists**
— the overflow list may hold containers, the overlap list must hold leaves only.
A page that passes because nothing on it is selected has not been checked.

---

## The rules the club settled, and why

These came out of review. They are not preferences to re-litigate.

**Verification is the point of this guide.** Every course number and name was
looked up individually in the Kuwait University registration portal. That is the
value over the old sheet, which had wrong numbers. If you add or change a
course, verify it the same way and write what you did in
`guide/verification-log.md`. Where the portal and the department's chart
disagree, the chart wins and the portal's title prints as a small grey note.

**Never sign in to the KU portal on the club's behalf.** When the session
expires, say so and wait. This held all the way through and it keeps holding.

**Credits are the one unsourced figure.** The portal publishes no credit-hour
field anywhere. 130, and the 61/36/27/6 split, come from the college's own plan.
That is why the planner counts **courses** (45 of them, both majors), never
credits. Do not build arithmetic on credits.

**No line may cross another line.** Pass/fail, machine-checked. Colour coding is
not a substitute — the club's word for the alternative, twice, was "spaghetti".
If a line would be unreadable, move the course down a level or add a level.
Never delete the line.

**Every prerequisite gets a line, never a number in a little box.** Stated
explicitly, 20 Sep 2026: *"there should be lines on everything so they can
understand."*

**Levels everywhere.** Not semesters, not steps, not years. Level 1, 2, 3 … on
every sheet, so a reader who learns one page can read them all.

**The audience is a first-year student whose English is shaky.** The club's own
description of the reader, repeatedly: *"they have the brain of a 10-year-old."*
Plain words — "What you must do", not "Requirements". Every instruction in both
languages, at the same point size, English on top and Arabic under it.

**Figures are in Latin digits in both languages** — grade averages, credit
counts, percentages, course numbers, department and major codes. They are what a
student types. Arabic-Indic digits are for counting words only ("٧ مقرراً").
Never put a spaced separator between two Latin runs inside Arabic ("2023 / 2024"
reverses); never use U+066B with Arabic-Indic digits.

**One long official name per thing, everywhere.** A major, a course, a
department — the same name on every sheet. Settled 21 Sep: الإدارة and
إدارة الأعمال are the same major, printed as the long form.

**The club's mark is the only logo in the app.** No university crest there. On
the sheets both appear, at equal optical weight.

**The club decides what gets flagged, not us.** 0460113 and 0494105 return
nothing in the portal; the club chose to print them like any other course. The
finding stays in the verification log, off the page. If you disagree, say so
once and then do what the club asked.

**The MIS paths open after 1013331 + 1013337.** Settled 23 Sep 2026, against the
registration system, which asks for less: 1013340 needs 1013331, 1013350 needs
1013230 + 1013240, 1013434 needs 1013331. One line from 1013331 + 1013337 feeds
both paths and 1013434 (434 has to share it, or the lines cross), and it runs
along the top edge of the green and blue boxes, never inside them. The planner
enforces the same. So the MIS sheet does not carry the "prerequisites come from
the registration system" note; OSCM and General still do. The finding is in
the log, section T.

---

## The planner

Six steps: pick a major → tick the 25 general courses → tick your major →
tick your electives → set your pace → see the plan. Steps 2–4 are the real
printed sheets, tappable.

It does not divide. It runs the remaining courses through the prerequisite
lines printed on the sheets and gives a term-by-term plan. Courses it had to
choose for the student are tagged **SUGGESTED · مقترح**.

**It enforces what the sheets print.** PICK 1 / PICK 2 / PICK 3 lock the rest of
the group once filled; choosing one MIS path closes the other; TAKE BOTH never
locks. A course printed in two elective groups counts once — the other group
stays open, as the electives page's own footnote says.

Pace: 6 courses a semester at most, summer 1–3 or 0 to skip.

`app/src/plan.json` is the degree model, generated from `courses.json`. If the
degree structure changes, regenerate it — do not hand-edit both. There is no
full generator in the repo: when a line on the MIS map changes,
`python3 app/sync-pre.py` copies the map's prerequisites into it and prints
what it changed.

---

## Still open with the department

Carried in `guide/verification-log.md`, unresolved:

- **0460113** (الأرض المتغيرة) and **0494105** (صيانة البيئة) return no rows in
  the portal. Printed anyway, at the club's instruction.
- **1013340** is printed needing 1013331 + 1013337 on the MIS page and needing
  nothing on the OSCM page. 1013331 is MIS-only, so an OSCM student offered it
  could never register. The planner follows whichever page the student is
  reading.
- **1013485** Transportation Management is not listed in the portal.
- Energy & Petroleum: the sheet says 1013450, the portal says 1013455.
- **1013472** lists the retired 1013433 as its prerequisite.
- **1013321** has no title in the portal; **1013441**'s English title is
  corrupted there; **1013415**'s Arabic field holds English.
- Whether one course can satisfy two elective groups.

Open in the guide itself:

- The yellow PICK 1 row on MIS has no lines. Its four prerequisites are in
  `courses.json` and the planner uses them (1013240 → 1013351, 1013230 +
  1013240 → 1013451, 1013331 + 1013337 → 1013480 and 1013492), but none has been
  read off the portal's Details screen. The club kept this layout on 23 Sep.

---

## How the club likes to work

Short, direct answers. Show the thing, don't describe it. When something was
changed that was not asked for, say so and say why. When a check fails, say
which one and what it means, not "fixed". Drafts get sent as files, not
described. The club reviews on a phone as often as at a desk.
