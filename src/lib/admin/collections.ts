/**
 * What /admin can edit. A collection is one folder in src/content; each field is one key in the
 * YAML frontmatter that src/lib/content.ts reads. The admin form is drawn from these definitions,
 * so adding a field here is all it takes to make it editable.
 *
 * Shared by the server (saving, validation) and the browser (the form), so no server-only imports.
 */

type Base = { name: string; label: string; hint?: string };
export type Field =
  | (Base & { kind: "text"; multiline?: boolean; required?: boolean })
  | (Base & { kind: "date"; required?: boolean })
  | (Base & { kind: "select"; options: { value: string; label: string }[] })
  | (Base & { kind: "image" })
  /** A list of strings, e.g. tags or paragraphs. */
  | (Base & { kind: "list"; multiline?: boolean })
  /** A list of small objects, e.g. quotes or sections. `itemLabel` names the field that titles each item. */
  | (Base & { kind: "group"; fields: Field[]; itemLabel: string });

export type Data = Record<string, unknown>;

export type Collection = {
  name: string;
  label: string;
  /** Folder under src/content; uploaded images go to public/images/<folder>. */
  folder: string;
  extension: "mdx" | "md";
  /** Field shown as the entry's title (big input at the top of the form). */
  titleField: string;
  /** Suggested file name for a new entry. The file name is the slug. */
  suggestSlug: (data: Data) => string;
  slugHint?: string;
  /** Public page, for the "View live" link. */
  url?: (slug: string) => string;
  /** Whether the Markdown body under the frontmatter is shown on the site. */
  body: boolean;
  fields: Field[];
};

export const slugify = (value: string) =>
  value.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const text = (data: Data, key: string) => (typeof data[key] === "string" ? (data[key] as string) : "");

// Fields that several collections share.
const tags: Field = { kind: "list", name: "tags", label: "Tags" };
const cover: Field[] = [
  { kind: "image", name: "image", label: "Cover image" },
  { kind: "text", name: "imageAlt", label: "Cover image description", hint: "For readers who can't see the image." },
  { kind: "text", name: "imageCaption", label: "Caption" },
];
const sections: Field = {
  kind: "group",
  name: "sections",
  label: "Sections",
  itemLabel: "heading",
  fields: [
    { kind: "text", name: "heading", label: "Heading", required: true },
    { kind: "list", name: "paragraphs", label: "Paragraphs", multiline: true },
    { kind: "image", name: "image", label: "Image" },
    { kind: "text", name: "imageAlt", label: "Image description" },
  ],
};
const links = (name: string, label: string): Field => ({
  kind: "group",
  name,
  label,
  itemLabel: "label",
  fields: [
    { kind: "text", name: "label", label: "Label", required: true },
    { kind: "text", name: "href", label: "Link", hint: "/garden/a-note or https://…", required: true },
  ],
});
/** Never rewrite published text; add an entry here instead. The build checks these (see content.ts). */
const updates: Field = {
  kind: "group",
  name: "updates",
  label: "How this thinking has changed",
  hint: "Add an entry instead of rewriting published text.",
  itemLabel: "summary",
  fields: [
    { kind: "date", name: "date", label: "Date", required: true },
    {
      kind: "select",
      name: "type",
      label: "Type",
      options: [
        { value: "continued", label: "Continued: a new thought building on the original" },
        { value: "revised", label: "Revised: my view changed" },
        { value: "corrected", label: "Corrected: a factual error, and the fix" },
      ],
    },
    { kind: "text", name: "summary", label: "Summary", hint: "One line saying what changed.", required: true },
    { kind: "text", name: "note", label: "Note", hint: "Optional. Markdown is allowed.", multiline: true },
  ],
};

export const collections: Collection[] = [
  {
    name: "notes",
    label: "Notes",
    folder: "notes",
    extension: "mdx",
    titleField: "title",
    suggestSlug: (d) => slugify(text(d, "title")),
    url: (slug) => `/garden/${slug}`,
    body: true,
    fields: [
      { kind: "text", name: "title", label: "Title", required: true },
      { kind: "date", name: "date", label: "Published on", required: true },
      { kind: "text", name: "category", label: "Category", hint: "e.g. Running, Coffee, Learning", required: true },
      { kind: "text", name: "read", label: "Reading time", hint: "e.g. 5 min", required: true },
      { kind: "text", name: "excerpt", label: "Excerpt", hint: "One or two sentences for lists and search.", multiline: true, required: true },
      tags,
      ...cover,
      { kind: "text", name: "intro", label: "Intro", multiline: true },
      sections,
      { kind: "text", name: "pullQuote", label: "The short version", multiline: true },
      links("backlinks", "Related / read next"),
      updates,
    ],
  },
  {
    name: "books",
    label: "Books",
    folder: "books",
    extension: "mdx",
    titleField: "title",
    suggestSlug: (d) => slugify(text(d, "title")),
    url: (slug) => `/books/${slug}`,
    body: true,
    fields: [
      { kind: "text", name: "title", label: "Title", required: true },
      { kind: "text", name: "author", label: "Author", required: true },
      { kind: "text", name: "year", label: "Year", required: true },
      { kind: "text", name: "genre", label: "Genre", required: true },
      { kind: "text", name: "thought", label: "One-line thought", multiline: true, required: true },
      { kind: "text", name: "reflection", label: "Reflection", multiline: true },
      { kind: "text", name: "stayed", label: "What stayed with me", multiline: true },
      { kind: "text", name: "margin", label: "In the margin", multiline: true },
      {
        kind: "group",
        name: "quotes",
        label: "Quotes",
        itemLabel: "text",
        fields: [
          { kind: "text", name: "text", label: "Quote", multiline: true, required: true },
          { kind: "text", name: "note", label: "My note", multiline: true },
        ],
      },
      sections,
      links("links", "Links"),
      tags,
      ...cover,
      updates,
    ],
  },
  {
    name: "projects",
    label: "Projects",
    folder: "projects",
    extension: "mdx",
    titleField: "title",
    suggestSlug: (d) => slugify(text(d, "title")),
    url: (slug) => `/projects/${slug}`,
    body: true,
    fields: [
      { kind: "text", name: "title", label: "Title", required: true },
      { kind: "text", name: "stage", label: "Stage", hint: "e.g. built, experiment", required: true },
      { kind: "text", name: "tech", label: "Tech", hint: "Separated by · e.g. location · memory", required: true },
      { kind: "text", name: "summary", label: "What it is", multiline: true, required: true },
      { kind: "text", name: "question", label: "The question", required: true },
      { kind: "text", name: "why", label: "Why it exists", multiline: true },
      { kind: "text", name: "worked", label: "What I worked on", multiline: true },
      ...cover,
      updates,
    ],
  },
  {
    name: "travels",
    label: "Travel",
    folder: "travels",
    extension: "mdx",
    titleField: "place",
    suggestSlug: (d) => slugify(text(d, "place")),
    slugHint: "Places are listed in file name order, so start with a number, e.g. 05-japan.",
    url: () => "/travel",
    body: false,
    fields: [
      { kind: "text", name: "place", label: "Place", required: true },
      { kind: "text", name: "detail", label: "Detail", hint: "e.g. Cardiff · coastal paths · rain", required: true },
      { kind: "text", name: "coordinates", label: "Coordinates", hint: "e.g. 51.4816° N, 3.1791° W", required: true },
      { kind: "text", name: "thought", label: "Thought", multiline: true, required: true },
    ],
  },
  {
    name: "coffee",
    label: "Coffee log",
    folder: "coffee",
    extension: "md",
    titleField: "title",
    suggestSlug: (d) => [text(d, "date"), slugify(text(d, "title"))].filter(Boolean).join("-"),
    url: () => "/coffee",
    body: true,
    fields: [
      { kind: "text", name: "title", label: "What changed or what I noticed", required: true },
      { kind: "date", name: "date", label: "Date", required: true },
      { kind: "text", name: "method", label: "Method", hint: "e.g. AeroPress", required: true },
      { kind: "text", name: "beans", label: "Beans", hint: "Roaster, origin, process (optional)" },
    ],
  },
];

export const getCollection = (name: string) => collections.find((c) => c.name === name);

export const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Starting values for a new entry. */
export const emptyEntry = (c: Collection): Data => {
  const today = new Date().toISOString().slice(0, 10);
  return Object.fromEntries(c.fields.filter((f) => f.kind === "date").map((f) => [f.name, today]));
};

/** The first required field left empty, as a readable path like "Sections 2 › Heading". */
export function findMissing(fields: Field[], data: Data, prefix = ""): string | undefined {
  for (const field of fields) {
    const value = data[field.name];
    if ((field.kind === "text" || field.kind === "date") && field.required && !(typeof value === "string" && value.trim())) return `${prefix}${field.label}`;
    if (field.kind === "group" && Array.isArray(value)) {
      for (const [i, item] of value.entries()) {
        const missing = findMissing(field.fields, item as Data, `${prefix}${field.label} ${i + 1} › `);
        if (missing) return missing;
      }
    }
  }
  return undefined;
}
