"use server";

import { randomBytes } from "node:crypto";
import { redirect } from "next/navigation";
import { findMissing, getCollection, slugPattern, type Data } from "@/lib/admin/collections";
import { entryPath, getEntry, serializeEntry, type Status } from "@/lib/admin/entries";
import { currentAdmin } from "@/lib/admin/session";
import { commit, type FileChange } from "@/lib/admin/storage";
import { checkEntry } from "@/lib/content";

/**
 * Server actions: functions the admin form calls directly. They run on the server, so every one
 * checks the session first; anyone can send a request to them.
 */

type Result = { error: string };

const maxImageBytes = 4 * 1024 * 1024;
// No SVG: an SVG can carry scripts.
const imageTypes: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/avif": "avif", "image/gif": "gif" };

/** Swaps each "upload:<id>" placeholder the form used for a new image (in fields or body) for its public path. */
function withUploads(value: unknown, paths: Map<string, string>): unknown {
  if (typeof value === "string") return value.replace(/upload:[\w-]+/g, (id) => paths.get(id) ?? id);
  if (Array.isArray(value)) return value.map((v) => withUploads(v, paths));
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, withUploads(v, paths)]));
  return value;
}

export async function saveEntry(form: FormData): Promise<Result> {
  if (!(await currentAdmin())) return { error: "You've been signed out. Sign in again, then save." };
  const c = getCollection(String(form.get("collection")));
  if (!c) return { error: "Unknown collection." };
  const slug = String(form.get("slug") ?? "");
  const isNew = form.get("isNew") === "true";
  const status: Status = form.get("status") === "published" ? "published" : "draft";
  if (!slugPattern.test(slug) || slug === "new") return { error: "File name: use lowercase letters, numbers and single hyphens." };
  if (isNew && (await getEntry(c, slug))) return { error: `There's already an entry with the file name "${slug}".` };

  // New images get a unique file name, so replacing an image never shows an old cached copy.
  const changes: FileChange[] = [];
  const paths = new Map<string, string>();
  for (const [key, file] of form.entries()) {
    if (!key.startsWith("upload:") || !(file instanceof File)) continue;
    const extension = imageTypes[file.type];
    if (!extension) return { error: `${file.name}: use a JPG, PNG, WebP, AVIF or GIF image.` };
    if (file.size > maxImageBytes) return { error: `${file.name} is larger than 4 MB.` };
    const name = `${slug}-${randomBytes(4).toString("hex")}.${extension}`;
    changes.push({ path: `public/images/${c.folder}/${name}`, content: Buffer.from(await file.arrayBuffer()) });
    paths.set(key, `/images/${c.folder}/${name}`);
  }

  let data: Data;
  try {
    data = withUploads(JSON.parse(String(form.get("data"))), paths) as Data;
  } catch {
    return { error: "Couldn't read the form. Reload the page and try again." };
  }
  const body = c.body ? (withUploads(String(form.get("body") ?? ""), paths) as string) : "";

  const missing = findMissing(c.fields, data);
  if (missing) return { error: `${missing} is required.` };
  const file = entryPath(c, slug);
  try {
    checkEntry(file, data); // the same checks the build runs, so a save can't break the deploy
  } catch (error) {
    return { error: (error as Error).message };
  }

  changes.unshift({ path: file, content: Buffer.from(serializeEntry(c, status, data, body)) });
  const title = String(data[c.titleField] || slug);
  try {
    await commit(changes, `content: ${status === "published" ? "publish" : "save draft of"} ${c.label.toLowerCase()} "${title}"`);
  } catch (error) {
    return { error: `Couldn't save. ${(error as Error).message}` };
  }
  // A fresh load shows the saved file, with uploaded images at their real paths.
  redirect(`/admin/${c.name}/${slug}?saved=${Date.now()}`);
}

export async function deleteEntry(collection: string, slug: string): Promise<Result> {
  if (!(await currentAdmin())) return { error: "You've been signed out. Sign in again first." };
  const c = getCollection(collection);
  const entry = c && (await getEntry(c, slug));
  if (!c || !entry) return { error: "That entry doesn't exist." };
  try {
    await commit([{ path: entryPath(c, slug) }], `content: delete ${c.label.toLowerCase()} "${String(entry.data[c.titleField] || slug)}"`);
  } catch (error) {
    return { error: `Couldn't delete. ${(error as Error).message}` };
  }
  redirect("/admin");
}
