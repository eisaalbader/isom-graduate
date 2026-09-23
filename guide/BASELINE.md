# ISOM دليل الطالب — design baseline

The MIS map (page 4) is the approved reference. Every rule below was settled during its
review and applies to **every** page after it. When something here conflicts with a new
idea, this file wins unless the club says otherwise.

## Page
- A2 landscape, 594 × 420 mm. Scales exactly to A3 (70.7%) and A4 (50%).
- Ground `#F5F5F5`. Padding 14 mm.
- Club logo top-left, Kuwait University logo top-right, equal optical weight, big enough
  to identify at a glance. No text abbreviations (no "MIS", no "OM") in the header.
- Title block is centred on **the course columns**, not on the page — so the title, the
  first course, the spine and the capstone share one vertical axis.
  Verify with `node align-check.js`; max spread must stay under ~0.5 px.

## Cover
- The cover sits in the **same palette as the maps** — `#F5F5F5` ground, maroon ink, the card
  colours. No page in the booklet is the odd one out.
- The club mark is the largest thing on the sheet, at roughly 2.5× its size in a page header.
  The guide is the club's work and the cover should say so before anything else does.
- The artwork is **generated from `courses.json`**, not drawn: every dot a course, every curve
  a prerequisite. Edit the data next year and the cover redraws itself, counts included.

## Colour
- Brand maroon `#660000`. Required courses use it — the spine *is* the brand colour.
- One colour per kind of course, nameable out loud:
  red = required · green = path 1 · blue = path 2 · yellow = pick one · green-grey = take both.
- Semester tint is a **translucent maroon wash** that deepens down the page, never a solid
  swatch. Cards and watermarks sit in the same wash so the whole page is one colour system.
- Background gears and ghosted club marks are maroon-tinted and `mix-blend-mode: multiply`.
  They must blend into the wash, never sit on top of it.

## Type
- English: Aleo (names), Barlow Condensed Bold Italic (display), DM Sans (labels, numbers).
- Arabic: Cairo (headings), Tajawal (body).
- **Arabic and English are set at the same point size.** Always.
- English name on top, Arabic underneath. Never side by side except on cards wider than
  about half the sheet.

## Course card
- Solid colour bar across the top: 7-digit portal number left, credits right.
- Body: English name, then Arabic name. Nothing else unless it is a real caveat.
- No "needs X" prerequisite text — that belongs in the interactive version.
- Card background is translucent so it picks up the semester wash beneath it.

## The map
- **Every page counts in Levels.** Not semesters, not steps, not years — Level 1, 2, 3 …
  on every sheet, so a reader who learns one page can read them all. Where the university's
  own plan uses semester numbers, say so in the caption under the map rather than printing
  two different systems.
- **A major page opens with a "Before" band**: the general courses that actually unlock the
  first course of the major, drawn as visiting cards — same shape, lighter, dashed border,
  the club mark and the page they come from — with real lines down into the first major
  course. It answers the first question a student has: what do I take before I can start?
- The General page carries the **same signpost pointing the other way**: the three courses
  that are the doorway into a major wear the club mark and say which major they open and on
  which page. A student meets the same badge whichever page they pick up first.
- A course drawn on a major map that is really a **college** course wears an amber flag
  saying so, in both languages, on the card itself — not in a rail panel. MIS 1013130 and
  1013240, OSCM 1013205 and 1013210. Without it the map implies eleven major courses when
  the college only counts nine, and the 27 credits will not add up for the reader.
- Level bands run top to bottom, each a full-width stripe with a marker in the rail.
- Semester labels read straight on. **No rotated or vertical text anywhere.**
- Everything sits on one CSS grid, so the rail marker and its courses can never drift apart.
- Choice groups get a heavy outline in the group's colour, a light fill, and real space
  between the outline and the cards inside. The box must obviously *contain* its courses.
- Where a group leads onward, every course in it feeds one collector line, and the run
  continues from the **middle** course. Never imply only one course leads out.
- Mutually exclusive choices get an explicit OR block on the line between them.

## Wires
- Computed from the rendered DOM. Never hand-placed.
- Edges sharing a source are merged onto one bus with junction dots.
- **A wire never crosses text.** The router treats labels as obstacles: it drops the bus
  below them, steps around them, or — when the label sits squarely on the line — stops at
  its top edge and resumes at its bottom, making the label a station on the wire.
- **A line into a path runs along the top edge of the path box, never inside it.** The club,
  23 Sep 2026: "put the lines on the edge of the color box". The box overhangs its cards by
  2.1mm at the top (4.5mm at the sides) and the path header carries 1.7mm of top padding, so
  there is room above the box for the line; the router sets it 4px above the box's edge.
- **Every wire ends in an arrowhead.** The arrowheads are `<path>`s inside `<defs><marker>`,
  so the stroke rule must be `.wires > path`, never `.wires path` — the blanket selector
  paints them `fill:none` and all the arrows vanish without any error. `verify.js` guards it.
- **Two buses never share a line.** Collinear buses read as one long bar joining courses
  that have nothing to do with each other; the router steps a clashing bus down 4.2px.
- **Redundant arrows are removed.** If A already reaches B the long way round, the direct
  arrow says nothing new — `generalWires()` runs a transitive reduction.
- When a prerequisite is shared by a whole row, and drawing it would mean a dozen lines
  crossing the row above, say it in words in a **start strip** instead. Words beat spaghetti.
- **Every prerequisite gets a line. No exceptions, and never a number in a little box.**
  The club was explicit, 20 Sep 2026: "there should be lines on everything so they can
  understand." If a line would be unreadable, the fix is to move the course down a level or
  add a level — not to replace the line with a label.
- **A line wears the colour of the course it starts from.** That is what makes a long line
  followable: you can see at a glance which column it left. Where several courses merge onto
  one line, each source leaves in its own colour and the shared run is neutral maroon,
  which reads as "these together open this".
- **Levels are true prerequisite depth.** A course sits exactly one level below the last
  course it needs, so every line drops one level and none skips. A level holding a single
  course is fine — give its empty half a plain note rather than a decorated box.

## Tree layout — the rule that beats everything else
Courses are ordered **by the dependency tree, not by subject**. Each course is placed
directly under the course it comes from, and courses sharing a parent sit side by side
beneath it. Grouping by subject instead looks tidy and forces long horizontal runs across
the sheet; the club's word for the result, twice, was "spaghetti".

- **No line may cross another line.** This is not a preference, it is a pass/fail check —
  `verify.js` samples every rendered path against every other and fails the page on a real
  crossing. Two runs leaving the *same* course may meet; that is a junction.
- A course that feeds more than one group sends each group out of a **different point along
  its bottom edge**, and **the exit must match the direction of travel** — the run heading
  right leaves from the right of the card, the one heading left from the left. Assign those
  lanes in any other order and the two runs swap sides and cross directly under the card.
- **Two groups leaving the same pair of courses share one collector.** Two separate
  collectors from the same sources cannot be routed without crossing.
- Which run is drawn nearer the cards is decided per gap, by a two-sided test. For an upper
  run U and a lower run L, both must hold: L's horizontal must not pass under where U drops
  into its cards, and U's horizontal must not pass over where L climbs out of its cards.
  Checking only one side of that gets it wrong about half the time.
- When no order satisfies the test, the layout is at fault, not the router: move the card
  next to the course it comes from. That is what put OSCM's 1013316 beside 1013210.
- If a placement still forces a crossing, move the course a column sideways or a level down,
  or add a level. Never "solve" it by deleting the line.
- Subject colour stays on the card, and the key explains it. Colour tells you who teaches
  the course; the lines tell you the order. The club was blunt about the priority: colours
  do not help a reader who just wants to be told go here, then here.
- **Every level is one card tall.**
- A level that genuinely holds only a few courses gets a quiet note in the empty half, so the
  space reads as designed rather than unfinished.
- A key swatch is a plain colour square unless the chip word carries information the text
  does not. A fixed-width chip with a long word inside spills out of its own box.

## Names
- A course name never breaks before its number: "Business Statistics (1)" wraps after
  "Business", never leaving "(1)" stranded on its own line. Use a non-breaking space before
  any "(1)", "(2)", "Module 1" and the like, in both languages.

## Language
- Plain words. The audience is a first-year student whose English is shaky.
- "What you must do", not "Requirements". "What the colours mean", not "Legend".
- Every instruction appears in both languages.

## Data
- Only what the university publishes. No references to older editions of this guide.
- Where the department's chart and the registration portal disagree, the chart wins and the
  portal's title prints as a small grey note on the card.
- All course data lives in `data/courses.json`. Nothing is hard-coded in the layout.

## Page furniture
- A **gate strip** (`.gatebox`) states a prerequisite that a whole level shares, with the
  codes set large, and is an obstacle to the router like any label.
- A **next-step strip** (`.nextstep`) at the foot of a map says where the reader goes next.
- Any page that puts captions under the map uses `.canvas--stack`, so the grid shrinks to
  make room instead of pushing the captions out over the footer.

## Build
`node build.js && node render.js <page>` · `node measure.js <page>` for fit ·
`node align-check.js` for the centre line · `node verify.js` for everything else.

`verify.js` checks, per page: codes match `courses.json` exactly · printed credits match
the data file · nothing spills off the sheet · no text is clipped by its own box · no wire
crosses text · **no two lines cross each other** · **no two blocks sit on top of each
other** · **arrowheads are actually painted** · all card text clears 4.5:1.
A page ships only when all three scripts pass.

## Figures and Arabic
- **Every figure is set in Latin digits, in both languages** — grade averages, credit
  counts, percentages, course numbers, department and major codes. They are the digits
  the registration system shows and the ones a student types, and the original 2020/2021
  sheet did the same inside its Arabic. Arabic-Indic digits are for counting words only
  ("٧ مقرراً", "١٣٠ وحدة للتخرج").
- Never put a spaced separator between two Latin runs inside Arabic: "2023 / 2024"
  reverses to "2024 / 2023" under the bidirectional algorithm. Write "2023/2024".
- Never use the Arabic decimal separator U+066B with Arabic-Indic digits: "٢٫٦٧" splits
  into two runs and renders as "٦٧٫٢".
- Prefer ending an Arabic sentence on a word rather than on a Latin number, so the full
  stop does not strand itself beside the figure.
- **Cairo needs about 1.7 line-height** at display sizes and 1.5 at body sizes. Below that
  it overflows its own line box and an `overflow:hidden` parent silently shaves the
  descenders. `verify.js` catches this only for selectors it is told about — add every new
  text class to its clipping list.

## Policy pages
- A rule page states the rule in the university's own words, then gives the number.
  Where the official rule prints a retired course number, the page prints the **live**
  number and carries the retired one in an amber correction note on the card. A student
  types what the page shows.
- Where a rule names a course the catalogue cannot resolve, print it as the rule words it
  and say in the footer who to ask. Do not guess a 7-digit number.
- Each condition is one row: the figure from the rule on the left, the rule in both
  languages on the right, so the page can be ticked down line by line.
- Numbers the club supplies that the portal cannot confirm are printed as given, and the
  fact that they are unconfirmed is recorded in the verification log, not on the page.

## verify.js selector lists
- The overflow list may contain containers; the **overlap list must hold leaves only**, or
  a box that contains another listed box reads as a permanent overlap.
- A new page is not verified until its components are named in those lists. A page that
  passes only because nothing on it is selected has not been checked.
