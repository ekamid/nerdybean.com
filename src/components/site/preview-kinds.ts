import type { InternalPreview, LinkPreview } from "@/lib/link-previews";

/** Colours match the garden map, so a note looks the same in a preview, a card and on the map. */
export const previewKinds: Record<InternalPreview["kind"], { label: string; fill: string; stroke?: string; open: string }> = {
  note: { label: "Note", fill: "var(--primary)", open: "Read the note" },
  book: { label: "Book", fill: "var(--chart-1)", open: "See the book" },
  project: { label: "Project", fill: "var(--chart-3)", open: "See the project" },
  page: { label: "Page", fill: "var(--muted-foreground)", open: "Open the page" },
  topic: { label: "Topic", fill: "var(--card)", stroke: "var(--muted-foreground)", open: "Browse the topic" },
};
export const kindSwatch = (kind: InternalPreview["kind"]) => ({ background: previewKinds[kind].fill, boxShadow: previewKinds[kind].stroke ? `inset 0 0 0 1px ${previewKinds[kind].stroke}` : undefined });
export const openLabel = (p: LinkPreview) => (p.type === "external" ? `Open ${p.host}` : previewKinds[p.kind].open);
/** One line of context: kind and date for pieces, the host for outside links. */
export const previewMeta = (p: LinkPreview) => p.type === "external"
  ? (p.siteName && p.siteName.toLowerCase() !== p.host ? `${p.siteName} · ${p.host}` : p.host)
  : p.kind === "topic" || p.kind === "page" ? p.meta : `${previewKinds[p.kind].label} · ${p.meta}`;
