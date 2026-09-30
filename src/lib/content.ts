import "server-only";

import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { cache } from "react";
import { parse } from "yaml";

export type Cover = { image?: string; imageAlt?: string; imageCaption?: string };

/** Publication state. Anything not explicitly `published` is treated as a draft and never rendered. */
export type Status = "draft" | "published";

/**
 * One entry in a piece's change log. The original text is never rewritten; later thinking is
 * appended here instead.
 * - `revised`: my view changed; the entry says what I think now.
 * - `continued`: a new thought on the same topic that builds on the original.
 * - `corrected`: a factual error in the original, and the correct version.
 */
export type UpdateKind = "revised" | "continued" | "corrected";
export type Update = { date: string; type: UpdateKind; summary: string; note: string };
type Publishable = { status: Status; updates: Update[]; /** ISO date of the newest update, if any. */ lastUpdated?: string };
export type Link = { label: string; href: string };
export type NoteSection = { heading: string; paragraphs: string[]; image?: string; imageAlt?: string };
export type Note = Cover & Publishable & {
  slug: string;
  title: string;
  category: string;
  date: string;
  read: string;
  excerpt: string;
  tags: string[];
  intro: string;
  sections: NoteSection[];
  pullQuote: string;
  backlinks: Link[];
  body: string;
  /** ISO date (YYYY-MM-DD) derived from `date`. */
  isoDate: string;
};
export type Project = Cover & Publishable & {
  slug: string;
  title: string;
  /** Project stage, e.g. "built", "experiment". */
  stage: string;
  tech: string;
  summary: string;
  question: string;
  why?: string;
  worked?: string;
  body: string;
};
export type BookQuote = { text: string; note: string };
export type Book = Cover & Publishable & {
  slug: string;
  title: string;
  author: string;
  year: string;
  genre: string;
  thought: string;
  reflection: string;
  stayed: string;
  margin: string;
  quotes: BookQuote[];
  sections: NoteSection[];
  links: Link[];
  tags: string[];
  body: string;
};
export type Travel = Cover & Publishable & {
  place: string;
  detail: string;
  coordinates: string;
  thought: string;
  body: string;
};

export type SearchItem = {
  title: string;
  description: string;
  href: string;
  group: "Notes" | "Projects" | "Books" | "Travel" | "Pages";
  tags: string[];
};

const contentRoot = path.join(process.cwd(), "src", "content");
const frontmatterPattern = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/;

type Raw = Record<string, unknown> & { body: string; file: string };

function readCollection(folder: string): Raw[] {
  const dir = path.join(contentRoot, folder);
  return readdirSync(dir)
    .filter((file) => file.endsWith(".mdx") || file.endsWith(".md"))
    .sort()
    .map((file) => {
      const source = readFileSync(path.join(dir, file), "utf8");
      const match = source.match(frontmatterPattern);
      if (!match) throw new Error(`${folder}/${file} is missing YAML frontmatter.`);
      const data = (parse(match[1] ?? "") ?? {}) as Record<string, unknown>;
      return { ...data, body: (match[2] ?? "").trim(), file: `${folder}/${file}` };
    });
}

/** Parse dates like "9 Mar 2026" into a Date (UTC, 08:00 to stay on the right day in every zone). */
export function toDate(value: string): Date {
  const parsed = new Date(`${value} 08:00 UTC`);
  return Number.isNaN(parsed.getTime()) ? new Date(value) : parsed;
}

const isoPattern = /^\d{4}-\d{2}-\d{2}$/;
const updateKinds: readonly UpdateKind[] = ["revised", "continued", "corrected"];

/** Format an ISO date (YYYY-MM-DD) the same way publish dates are written, e.g. "1 Oct 2026". */
const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export const formatIsoDate = (iso: string) => {
  const [year, month, day] = iso.split("-").map(Number);
  return `${day} ${months[(month ?? 1) - 1]} ${year}`;
};

/**
 * Validates status and change log so mistakes fail the build instead of publishing wrong history:
 * dates must be real ISO dates, not in the future, not before the piece was published, and unique
 * per day; every entry needs a known type and a summary. Entries are returned newest first.
 */
function publishable(raw: Raw, publishedIso?: string): Publishable {
  const fail = (message: string): never => { throw new Error(`${raw.file}: ${message}`); };
  const status = raw["status"] ?? "draft";
  if (status !== "draft" && status !== "published") fail(`status must be "draft" or "published", got "${String(status)}".`);

  const list = raw["updates"] ?? [];
  if (!Array.isArray(list)) fail("updates must be a list.");
  const today = new Date().toISOString().slice(0, 10);
  const updates = (list as Record<string, unknown>[]).map((entry, i) => {
    const where = `updates[${i}]`;
    const date = entry["date"] instanceof Date ? entry["date"].toISOString().slice(0, 10) : String(entry["date"] ?? "");
    if (!isoPattern.test(date) || Number.isNaN(Date.parse(`${date}T00:00:00Z`)) || new Date(`${date}T00:00:00Z`).toISOString().slice(0, 10) !== date) fail(`${where}.date must be a real date written as YYYY-MM-DD, got "${date}".`);
    if (date > today) fail(`${where}.date ${date} is in the future.`);
    if (publishedIso && date < publishedIso) fail(`${where}.date ${date} is before the piece was published (${publishedIso}).`);
    const type = entry["type"];
    if (!updateKinds.includes(type as UpdateKind)) fail(`${where}.type must be one of ${updateKinds.join(", ")}, got "${String(type)}".`);
    const summary = typeof entry["summary"] === "string" ? entry["summary"].trim() : "";
    if (!summary) fail(`${where}.summary is required.`);
    const note = typeof entry["note"] === "string" ? entry["note"].trim() : "";
    return { date, type: type as UpdateKind, summary, note };
  });
  const dates = updates.map((u) => u.date);
  const duplicate = dates.find((d, i) => dates.indexOf(d) !== i);
  if (duplicate) fail(`two updates share the date ${duplicate}; combine them into one entry.`);
  updates.sort((a, b) => (a.date < b.date ? 1 : -1));
  return { status: status as Status, updates, ...(updates[0] && { lastUpdated: updates[0].date }) };
}

/** Drafts are hidden everywhere. Set SHOW_DRAFTS=true locally to preview them. */
const visible = <T extends { status: Status }>(items: T[]) =>
  process.env.SHOW_DRAFTS === "true" ? items : items.filter((item) => item.status === "published");

const allNotes = cache((): Note[] =>
  readCollection("notes")
    .map((raw) => {
      const n = raw as unknown as Partial<Note> & { date: string };
      const isoDate = toDate(n.date).toISOString().slice(0, 10);
      return { ...n, tags: n.tags ?? [], sections: n.sections ?? [], backlinks: n.backlinks ?? [], isoDate, ...publishable(raw, isoDate) } as Note;
    })
    .sort((a, b) => (a.isoDate < b.isoDate ? 1 : -1)),
);
const allProjects = cache((): Project[] => readCollection("projects").map((raw) => ({ ...(raw as unknown as Project), ...publishable(raw) })));
const allBooks = cache((): Book[] =>
  readCollection("books").map((raw) => {
    const b = raw as unknown as Partial<Book>;
    return { ...b, tags: b.tags ?? [], sections: b.sections ?? [], quotes: b.quotes ?? [], links: b.links ?? [], ...publishable(raw) } as Book;
  }),
);
const allTravels = cache((): Travel[] => readCollection("travels").map((raw) => ({ ...(raw as unknown as Travel), ...publishable(raw) })));

export const getNotes = cache(() => visible(allNotes()));
export const getProjects = cache(() => visible(allProjects()));
export const getBooks = cache(() => visible(allBooks()));
export const getTravels = cache(() => visible(allTravels()));

export const getNote = (slug: string) => getNotes().find((n) => n.slug === slug);
export const getProject = (slug: string) => getProjects().find((p) => p.slug === slug);
export const getBook = (slug: string) => getBooks().find((b) => b.slug === slug);

export const getSearchItems = cache((): SearchItem[] => [
  ...getNotes().map((n) => ({ title: n.title, description: n.excerpt, href: `/garden/${n.slug}`, group: "Notes" as const, tags: n.tags })),
  ...getProjects().map((p) => ({ title: p.title, description: p.summary, href: `/projects/${p.slug}`, group: "Projects" as const, tags: p.tech.split(" · ") })),
  ...getBooks().map((b) => ({ title: b.title, description: b.thought, href: `/books/${b.slug}`, group: "Books" as const, tags: [b.author] })),
  ...getTravels().map((t) => ({ title: t.place, description: t.thought, href: "/travel", group: "Travel" as const, tags: [t.detail] })),
  { title: "About Ebrahim", description: "Software developer, MSc AI student, slow runner.", href: "/about", group: "Pages", tags: ["biography", "cv"] },
  { title: "Coffee Lab", description: "Brew log: recipes, ratios and the current experiment.", href: "/coffee", group: "Pages", tags: ["coffee", "brewing"] },
  { title: "Travel & mountains", description: "Bangladesh, Wales, Scotland, the Himalayas, and the Ironman 70.3.", href: "/travel", group: "Pages", tags: ["travel", "running", "triathlon"] },
]);
