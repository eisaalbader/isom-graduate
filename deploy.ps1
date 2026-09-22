# Publishes the planner to https://isom-graduate.vercel.app
# The Vercel project and the domain already exist; this only sends the files.
# First run opens a browser to sign in. Answer "yes" to linking, scope "eisa",
# existing project "isom-graduate".
Set-Location $PSScriptRoot
npx --yes vercel deploy --prod
