# Task: Add a GitHub-backed CMS to this website

## Goal

Set up a Git-based CMS (Keystatic) so that I can:

- Log in with GitHub at `/keystatic`. Only I, the repo owner, can access the CMS. Anyone else must be blocked from viewing or editing anything.
- Write and edit content in a visual editor
- Upload images that are stored in this repo
- Save, draft, and publish, with every change committed to GitHub automatically
- Have the live site update automatically: the site is hosted on Netlify and auto-deploys on every push to the `master` branch

## Instructions

- First, study this codebase: its structure, routing, components, styling, naming, and conventions.
- Follow the existing patterns of the website exactly. The CMS should feel native to the project, not bolted on.
- Work out which content on the site should be CMS-managed and model the collections around it.
- Drafts must not appear on the live site.
- Do all of the implementation yourself, end to end. Don't explain how to do it; just do it.
- Keep it simple. No unnecessary libraries or abstractions.
- Only stop and ask me if something truly requires my input, such as GitHub App creation, secrets, or my domain.
- Never commit secrets. Any env vars needed in production go in Netlify, not Vercel.
- Make sure everything works on Netlify's Next.js runtime.

## Done when

- `/keystatic` works locally and in production with GitHub login, and only my GitHub account can access it
- Publishing content commits to `master` (including uploaded images), triggering a Netlify deploy
- Published content renders on the site in the existing design
- Drafts are hidden in production
- `npm run build` passes
