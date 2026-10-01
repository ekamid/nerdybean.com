import "server-only";

import { cache } from "react";
import { getBooks, getNotes, getProjects, getSearchItems, type Note } from "@/lib/content";

export type InternalPreview = {
  type: "internal";
  kind: "note" | "book" | "project" | "page" | "topic";
  href: string;
  title: string;
  meta: string;
  excerpt?: string;
  tags?: string[];
  /** For notes: how many pieces it links to and is linked from. */
  links?: { out: number; in: number };
};
export type ExternalPreview = { type: "external"; href: string; host: string; title?: string; description?: string; siteName?: string };
export type LinkPreview = InternalPreview | ExternalPreview;

/** Strip query, hash and trailing slash so `/garden/x/#y` and `/garden/x` share a preview. */
export const normalizePath = (href: string) => href.split(/[?#]/)[0]!.replace(/\/+$/, "") || "/";

const notePath = (n: Pick<Note, "slug">) => `/garden/${n.slug}`;

/** Who links to whom, by normalized path. Notes and books link out; anything can be linked to. */
const getLinkIndex = cache(() => {
  const outgoing = new Map<string, string[]>();
  for (const n of getNotes()) outgoing.set(notePath(n), n.backlinks.map((l) => l.href).filter((h): h is string => Boolean(h)));
  for (const b of getBooks()) outgoing.set(`/books/${b.slug}`, b.links.map((l) => l.href).filter((h): h is string => Boolean(h)));
  const incoming = new Map<string, string[]>();
  for (const [from, hrefs] of outgoing) for (const href of hrefs) {
    if (!href.startsWith("/")) continue;
    const to = normalizePath(href);
    if (to !== from) incoming.set(to, [...new Set([...(incoming.get(to) ?? []), from])]);
  }
  return { outgoing, incoming };
});

/** Every internal page a garden link can point at, keyed by normalized path (topics by full href). */
const getInternalPreviews = cache((): Map<string, InternalPreview> => {
  const { outgoing, incoming } = getLinkIndex();
  const map = new Map<string, InternalPreview>();
  const notes = getNotes();
  for (const n of notes) {
    const href = notePath(n);
    map.set(href, { type: "internal", kind: "note", href, title: n.title, meta: `${n.category} · ${n.date} · ${n.read}`, excerpt: n.excerpt, tags: n.tags, links: { out: outgoing.get(href)?.length ?? 0, in: incoming.get(href)?.length ?? 0 } });
  }
  for (const b of getBooks()) map.set(`/books/${b.slug}`, { type: "internal", kind: "book", href: `/books/${b.slug}`, title: b.title, meta: `Book · ${b.author}${b.year ? ` · ${b.year}` : ""}`, excerpt: b.thought, tags: b.tags });
  for (const p of getProjects()) map.set(`/projects/${p.slug}`, { type: "internal", kind: "project", href: `/projects/${p.slug}`, title: p.title, meta: `Project · ${p.stage}`, excerpt: p.summary, tags: p.tech ? p.tech.split(" · ") : [] });
  for (const item of getSearchItems()) {
    const href = normalizePath(item.href);
    if (!map.has(href) && item.group === "Pages") map.set(href, { type: "internal", kind: "page", href, title: item.title, meta: "Page", excerpt: item.description });
  }
  map.set("/garden", { type: "internal", kind: "page", href: "/garden", title: "Garden", meta: `Page · ${notes.length} notes`, excerpt: "Short essays that link to each other." });
  const tags = new Map<string, string[]>();
  for (const n of notes) for (const tag of n.tags) tags.set(tag, [...(tags.get(tag) ?? []), n.title]);
  for (const [tag, titles] of tags) {
    const href = `/garden?tag=${encodeURIComponent(tag)}`;
    map.set(href, { type: "internal", kind: "topic", href, title: `#${tag}`, meta: `Topic · ${titles.length} note${titles.length === 1 ? "" : "s"}`, excerpt: titles.join(" · ") });
  }
  return map;
});

const decode = (s: string) => s
  .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, "\"").replace(/&#0?39;|&apos;/g, "'")
  .replace(/&#(\d+);/g, (_, n: string) => String.fromCodePoint(Number(n))).replace(/\s+/g, " ").trim();

/** `<meta property|name="key" content="…">` in either attribute order. */
const metaTag = (html: string, key: string) => {
  const k = key.replace(/[.:]/g, "\\$&");
  const m = html.match(new RegExp(`<meta[^>]+(?:property|name)=["']${k}["'][^>]*content=["']([^"']*)["']`, "i"))
    ?? html.match(new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]*(?:property|name)=["']${k}["']`, "i"));
  return m?.[1] ? decode(m[1]) : undefined;
};

/**
 * Title, description and site name for an outside link, read from its HTML at build time. Any
 * failure (offline build, slow site, non-HTML) falls back to just the host, never breaks the page.
 */
const getExternalPreview = cache(async (href: string): Promise<ExternalPreview> => {
  let host = href;
  try { host = new URL(href).hostname.replace(/^www\./, ""); } catch { /* keep raw href */ }
  const base: ExternalPreview = { type: "external", href, host };
  try {
    const res = await fetch(href, { signal: AbortSignal.timeout(4000), headers: { accept: "text/html", "user-agent": "Mozilla/5.0 (compatible; link-preview)" }, next: { revalidate: 60 * 60 * 24 } });
    if (!res.ok || !res.headers.get("content-type")?.includes("text/html")) return base;
    const html = (await res.text()).slice(0, 200_000);
    const title = metaTag(html, "og:title") ?? metaTag(html, "twitter:title") ?? (html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1] ? decode(html.match(/<title[^>]*>([^<]*)<\/title>/i)![1]!) : undefined);
    const description = metaTag(html, "og:description") ?? metaTag(html, "description") ?? metaTag(html, "twitter:description");
    const siteName = metaTag(html, "og:site_name");
    return { ...base, ...(title && { title }), ...(description && { description }), ...(siteName && { siteName }) };
  } catch {
    return base;
  }
});

/** Previews for the given hrefs, keyed by the href exactly as written. Unknown internal links are skipped. */
export async function getLinkPreviews(hrefs: Iterable<string>): Promise<Record<string, LinkPreview>> {
  const internal = getInternalPreviews();
  const entries = await Promise.all([...new Set(hrefs)].map(async (href): Promise<[string, LinkPreview] | null> => {
    if (/^https?:\/\//i.test(href)) return [href, await getExternalPreview(href)];
    if (!href.startsWith("/")) return null;
    const hit = internal.get(href) ?? internal.get(normalizePath(href));
    return hit ? [href, hit] : null;
  }));
  return Object.fromEntries(entries.filter((e): e is [string, LinkPreview] => e !== null));
}

/** Link targets written in a Markdown body: `[text](href)`, `<https://…>` and bare URLs. */
export function markdownHrefs(source: string): string[] {
  const hrefs = [...source.matchAll(/\]\(\s*<?([^)\s>]+)>?(?:\s+"[^"]*")?\s*\)/g)].map((m) => m[1]!);
  const bare = [...source.matchAll(/https?:\/\/[^\s<>()\]]+[^\s<>()\].,;:!?'"]/g)].map((m) => m[0]);
  return [...hrefs, ...bare];
}

export type NoteConnection = { preview: LinkPreview; via?: string[] };

/**
 * A note's neighbourhood for its footer: what it links to (as written, so outside links count),
 * what links back to it, and other notes that share its topics but aren't linked either way.
 */
export async function getNoteConnections(note: Note) {
  const self = notePath(note);
  const { incoming } = getLinkIndex();
  const outHrefs = note.backlinks.map((l) => l.href).filter((h): h is string => Boolean(h));
  const inHrefs = (incoming.get(self) ?? []).filter((h) => !outHrefs.some((o) => normalizePath(o) === h));
  const linked = new Set([...outHrefs.map((h) => (h.startsWith("/") ? normalizePath(h) : h)), ...inHrefs]);
  const related = getNotes()
    .filter((n) => notePath(n) !== self && !linked.has(notePath(n)))
    .map((n) => ({ href: notePath(n), shared: n.tags.filter((t) => note.tags.includes(t)) }))
    .filter((r) => r.shared.length)
    .sort((a, b) => b.shared.length - a.shared.length)
    .slice(0, 4);
  const previews = await getLinkPreviews([...outHrefs, ...inHrefs, ...related.map((r) => r.href)]);
  const pick = (href: string) => previews[href];
  return {
    // Internal links that don't resolve (a draft, a typo) are dropped rather than sent to a 404.
    linksTo: outHrefs.flatMap((href): NoteConnection[] => (pick(href) ? [{ preview: pick(href)! }] : [])),
    linkedFrom: inHrefs.flatMap((href): NoteConnection[] => (pick(href) ? [{ preview: pick(href)! }] : [])),
    sharesTopics: related.flatMap((r): NoteConnection[] => (pick(r.href) ? [{ preview: pick(r.href)!, via: r.shared }] : [])),
  };
}
