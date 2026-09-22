# Publishing the planner

Everything is done except the last step, which needs a machine that can reach
Vercel. The cloud session this was built in cannot: `api.vercel.com` is blocked
by its egress policy, and the GitHub token it was given is scoped to repositories
that were not configured, so it could neither push nor deploy.

What **is** already done, on your Vercel account (team `eisaalbader`):

- the project **isom-graduate** exists
- its production domain **isom-graduate.vercel.app** is reserved and verified
- Vercel Authentication is **off**, so the page is public the moment it is live
- that exact URL is what the QR code on all six sheets points to

So the URL on the printed guide is already correct. It just needs content.

## The one command

```powershell
cd C:\Users\user\Desktop\isom-guide\isom-graduate
npx vercel deploy --prod
```

The first run asks you to sign in (it opens a browser) and then asks which
project — pick **isom-graduate**, or answer the linking questions with:

- Set up and deploy? **yes**
- Which scope? **eisa**
- Link to existing project? **yes** → `isom-graduate`

`vercel.json` already tells it to serve `public/` as a static site, so there is
no build step and it takes a few seconds. When it finishes, open
<https://isom-graduate.vercel.app> and scan the QR on page 1 to check it lands.

## Putting it on GitHub

```powershell
cd C:\Users\user\Desktop\isom-guide\isom-graduate
git init
git add -A
git commit -m "ISOM student guide 2026/2027 and the graduation planner"
gh repo create isom-graduate --private --source=. --push
```

(or make the repo on github.com and `git remote add origin ... ; git push -u origin main`)

Connecting that repo to the Vercel project afterwards means every future push
redeploys on its own.

## If you change the URL

The QR is generated from one line. Edit `guide/data/courses.json` → `site.url`
and `guide/mkqr.py` → `URL`, then:

```powershell
npm install
npm run qr        # redraws the code and refuses to save one that will not scan
npm run sheets
npm run render
npm run verify
```
