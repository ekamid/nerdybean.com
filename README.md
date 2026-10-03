# Ebrahim Khalil — Digital Garden

Personal site of Ebrahim Khalil: notes, projects, travel, books, and coffee experiments.

## Stack

- [Next.js 16](https://nextjs.org) (App Router, React Server Components, static generation)
- React 19, TypeScript
- Tailwind CSS 4
- Content as MDX frontmatter files in `src/content`

## Development

Requires Node.js 20.9+.

```sh
npm install
cp .env.example .env.local   # set NEXT_PUBLIC_SITE_URL
npm run dev
```

| Script              | What it does                    |
| ------------------- | ------------------------------- |
| `npm run dev`       | Start the dev server            |
| `npm run build`     | Production build (static pages) |
| `npm start`         | Serve the production build      |
| `npm run lint`      | ESLint                          |
| `npm run typecheck` | TypeScript check                |

## Content

### Admin

Write, edit and publish at `/admin`. Sign in with GitHub; only the `ekamid` account gets in.

- **Locally** (`npm run dev`), saving writes the file straight into `src/content` (and images into
  `public/images`). Review and commit with git as usual.
- **In production**, saving makes one commit on `master` with the entry and its images, through the
  GitHub API. Netlify sees the push and redeploys, so changes are live in a minute or two.
- **Save draft** keeps an entry off the live site; **Publish** sets `status: published`.

How it fits together:

| File | Job |
| --- | --- |
| `src/lib/admin/collections.ts` | What can be edited: one entry per content folder, one field per frontmatter key. The form is drawn from this. Add a field here to make it editable. |
| `src/lib/admin/session.ts` | GitHub sign-in check and the signed session cookie |
| `src/app/admin/login`, `callback`, `logout` | The GitHub OAuth sign-in steps |
| `src/lib/admin/storage.ts` | Reading and saving files: local disk in development, GitHub commits in production |
| `src/lib/admin/entries.ts` | Turning files into form data and back (YAML frontmatter + Markdown body) |
| `src/app/admin/actions.ts` | Save and delete. Runs the same checks as the build, so a save can't break a deploy. |
| `src/components/admin/entry-form.tsx` | The editing form |

One-time setup:

1. Create two GitHub OAuth Apps (GitHub → Settings → Developer settings → OAuth Apps):
   one with callback `http://localhost:3000/admin/callback`, one with
   `https://<your-domain>/admin/callback`.
2. Create a fine-grained personal access token (Settings → Developer settings → Personal access
   tokens → Fine-grained) with access to only this repo and **Contents: Read and write**.
3. Locally, put the dev OAuth App's ID and secret plus an `ADMIN_SESSION_SECRET` in `.env.local`.
4. In Netlify (Site configuration → Environment variables), set the production OAuth App's
   `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET`, a different `ADMIN_SESSION_SECRET`, and
   `GITHUB_CONTENT_TOKEN`. Redeploy.

### Files

Entries can also be written by hand. Add an `.mdx` file to one of:

- `src/content/notes` → `/garden/<slug>`
- `src/content/books` → `/books/<slug>`
- `src/content/projects` → `/projects/<slug>`
- `src/content/travels` → listed on `/travel` (in file name order)
- `src/content/coffee` → listed on `/coffee` (`.md`)

The file name is the slug. Dates are written as `YYYY-MM-DD`.

Metadata goes in the YAML frontmatter; any Markdown below the frontmatter is rendered as the body.

### Draft / published

Every file has a `status`:

```yaml
status: draft      # hidden everywhere: pages 404, not in lists, search, sitemap or RSS
status: published  # live
```

A missing or unknown `status` counts as `draft` (unknown values fail the build).
To preview drafts locally: `SHOW_DRAFTS=true npm run dev`.

Projects use `stage:` (e.g. `built`, `experiment`) for the project's own stage.

### Change log (notes, books, projects)

Don't rewrite published text. When your thinking changes or continues, append an entry:

```yaml
updates:
  - date: 2026-10-14        # YYYY-MM-DD, the day you wrote the update
    type: revised           # revised | continued | corrected
    summary: One line saying what changed
    note: >-
      Optional longer explanation. Markdown is allowed.
```

| type        | use it when                                             |
| ----------- | ------------------------------------------------------- |
| `revised`   | your view changed; say what you think now                |
| `continued` | a new thought on the same topic, building on the original |
| `corrected` | the original had a factual error; give the correct fact   |

Entries show newest first under "How this thinking has changed", with an "updated" date
in the page header. The newest entry also becomes `dateModified` in structured data and
`lastmod` in the sitemap.

To keep the history accurate, the build fails if an entry has an invalid or future date, a date
before the note's publish date, two entries on the same day, an unknown `type`, or no `summary`.

## SEO

- Per-page metadata, canonical URLs, Open Graph and Twitter cards (Next.js Metadata API)
- Generated Open Graph images per page (`opengraph-image.tsx`)
- JSON-LD: `Person`, `WebSite`, `BlogPosting`, `Article` (books), `CreativeWork` (projects), `BreadcrumbList`
- `/sitemap.xml`, `/robots.txt`, `/rss.xml`, `/manifest.webmanifest` generated from content
