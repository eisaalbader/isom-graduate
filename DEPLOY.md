# Publishing the planner

The planner is live at **https://isom-graduate.vercel.app**. It is published by
hand from the club's machine with the Vercel CLI. **A push to GitHub does not
publish anything**: the Vercel project is not connected to the repo.

## Where things are

- Vercel project **isom-graduate**, team **eisa** (`eisaalbader`)
- Production domain **isom-graduate.vercel.app**: the address the QR on all
  six sheets encodes
- Vercel Authentication and password protection are **off**, so the page is
  public
- Repo: https://github.com/eisaalbader/isom-graduate (private), cloned at
  `C:\Users\user\Desktop\isom-guide\isom-graduate` with `origin` set and
  `main` tracking it

Checked 29 Sep 2026: production is commit `8a92de5`, the redesigned planner,
deployed at 11:06 Kuwait time from GitHub (deployment
`dpl_CXCbQxSGz4YAYmNfJ6dm6MuKteHi`, made through the Vercel API from the pushed
commit). The live page, fetched back, is 828,322 bytes with MD5
`5e075f9c97119e837eed4d8cd7150bfd`, byte-identical to `public/index.html`
built on the club's machine and in the cloud. The link preview and icons
(`og.png`, `apple-touch-icon.png`, `favicon-32.png`) are served byte-identical
to the committed files.

On 24 Sep the CLI on the club's machine answered `Error: Not authorized`: its
sign-in had expired. Run `npx vercel login` (it opens a browser) before the
next CLI deploy. The Vercel GitHub app can read the repo, so a production
deployment can also be made straight from a commit on `main`, which is how
0e4ba57, 32437a4 and 8a92de5 went out.

## Publishing a change

1. Build and check in the order in `CLAUDE.md`: the guide first, its checks,
   then the planner and its tests. Nothing ships until they all pass.
2. Commit and push from the club's machine.
3. Deploy:

```powershell
cd C:\Users\user\Desktop\isom-guide\isom-graduate
npx vercel deploy --prod
```

If it asks you to sign in, it opens a browser. If it asks which project:
scope **eisa**, link to the existing project **isom-graduate**. `vercel.json`
serves `public/` as a static site, so there is no build step on Vercel and it
takes a few seconds. `deploy.ps1` runs the same command.

4. Check that the live page is the build you meant to ship. The two hashes
   must match:

```powershell
curl.exe -s https://isom-graduate.vercel.app -o live.html
certutil -hashfile live.html MD5
certutil -hashfile public\index.html MD5
```

Then scan the QR on page 1 to check it lands. The link preview is `public/og.png`,
drawn by `node app/icons.js` and committed; WhatsApp keeps an old preview for a
while, so a changed card may take a day to show there.

## If you change the URL

The QR is generated from one line. Edit `guide/data/courses.json` → `site.url`
and `guide/mkqr.py` → `URL`, then:

```powershell
npm install
npm run qr        # redraws the code and refuses to save one that will not scan
npm run sheets
npm run render
npm run verify
npm run planner
npm test
```

Run `qrcheck.py` on the new PDFs (command in `CLAUDE.md`), then publish as above.
