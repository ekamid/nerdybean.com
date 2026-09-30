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

Add an `.mdx` file to one of:

- `src/content/notes` → `/garden/<slug>`
- `src/content/books` → `/books/<slug>`
- `src/content/projects` → `/projects/<slug>`
- `src/content/travels` → listed on `/travel`

Metadata goes in the YAML frontmatter; any Markdown below the frontmatter is rendered as the body.
The `/editor` page (not indexed) helps draft and download these files.

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
