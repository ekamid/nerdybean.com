import "server-only";

import { parse, Scalar, stringify } from "yaml";
import type { Collection, Data } from "./collections";
import { listFiles, readFile } from "./storage";

export type Status = "draft" | "published";
export type Entry = { slug: string; status: Status; data: Data; body: string };

const frontmatterPattern = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/;

/** The file name is the slug, e.g. src/content/notes/pacing-is-honesty.mdx. */
export const entryPath = (c: Collection, slug: string) => `src/content/${c.folder}/${slug}.${c.extension}`;

export function parseEntry(slug: string, source: string): Entry {
  const match = source.match(frontmatterPattern);
  const { status, ...data } = (parse(match?.[1] ?? "") ?? {}) as Data;
  return { slug, status: status === "published" ? "published" : "draft", data, body: (match?.[2] ?? "").trim() };
}

/** Long text is written as a folded block (`>-`) like the hand-written files; text with line breaks keeps them (`|-`). */
function textStyle(value: string) {
  if (!value.includes("\n") && value.length <= 60) return value;
  const scalar = new Scalar(value);
  scalar.type = value.includes("\n") ? Scalar.BLOCK_LITERAL : Scalar.BLOCK_FOLDED;
  return scalar;
}

/** Drops empty strings, lists and objects so files only hold what was filled in. */
function clean(value: unknown): unknown {
  if (Array.isArray(value)) {
    const items = value.map(clean).filter((v) => v !== undefined);
    return items.length ? items : undefined;
  }
  if (value && typeof value === "object") {
    const entries = Object.entries(value).map(([k, v]) => [k, clean(v)] as const).filter(([, v]) => v !== undefined);
    return entries.length ? Object.fromEntries(entries) : undefined;
  }
  if (typeof value === "string") return value.trim() ? textStyle(value.trim()) : undefined;
  return value === null ? undefined : value;
}

/** Back to the file format: YAML frontmatter (status first, then fields in form order), then the body. */
export function serializeEntry(c: Collection, status: Status, data: Data, body: string) {
  const ordered: Data = { status };
  for (const field of c.fields) ordered[field.name] = data[field.name];
  for (const [key, value] of Object.entries(data)) if (!(key in ordered)) ordered[key] = value; // keep keys the form doesn't know about
  const frontmatter = stringify(clean(ordered), { lineWidth: 80 }).trimEnd();
  return `---\n${frontmatter}\n---\n${body.trim() ? `\n${body.trim()}\n` : ""}`;
}

export async function getEntry(c: Collection, slug: string) {
  const source = await readFile(entryPath(c, slug));
  return source === null ? null : parseEntry(slug, source);
}

/** Every entry in a collection, drafts included: newest first when entries have a date, otherwise by file name. */
export async function listEntries(c: Collection) {
  const files = (await listFiles(`src/content/${c.folder}`)).filter((f) => f.endsWith(`.${c.extension}`));
  const entries = await Promise.all(files.map((f) => getEntry(c, f.slice(0, -(c.extension.length + 1)))));
  const date = (e: Entry) => String(e.data["date"] ?? "");
  return entries
    .filter((e): e is Entry => e !== null)
    .sort((a, b) => date(b).localeCompare(date(a)) || a.slug.localeCompare(b.slug));
}
