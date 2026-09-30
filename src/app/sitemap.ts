import type { MetadataRoute } from "next";
import { getBooks, getNotes, getProjects } from "@/lib/content";
import { absoluteUrl } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const notes = getNotes();
  const latest = notes.length ? new Date(notes.map((n) => n.lastUpdated ?? n.isoDate).sort().at(-1)!) : undefined;
  const pages: MetadataRoute.Sitemap = [
    { url: absoluteUrl("/"), ...(latest && { lastModified: latest }), changeFrequency: "weekly", priority: 1 },
    { url: absoluteUrl("/garden"), ...(latest && { lastModified: latest }), changeFrequency: "weekly", priority: 0.9 },
    { url: absoluteUrl("/projects"), changeFrequency: "monthly", priority: 0.8 },
    { url: absoluteUrl("/books"), changeFrequency: "monthly", priority: 0.7 },
    { url: absoluteUrl("/travel"), changeFrequency: "monthly", priority: 0.7 },
    { url: absoluteUrl("/coffee"), changeFrequency: "monthly", priority: 0.5 },
    { url: absoluteUrl("/about"), changeFrequency: "yearly", priority: 0.8 },
  ];
  return [
    ...pages,
    ...notes.map((n) => ({
      url: absoluteUrl(`/garden/${n.slug}`),
      lastModified: new Date(n.lastUpdated ?? n.isoDate),
      changeFrequency: "monthly" as const,
      priority: 0.8,
      ...(n.image && { images: [absoluteUrl(n.image)] }),
    })),
    ...getProjects().map((p) => ({ url: absoluteUrl(`/projects/${p.slug}`), ...(p.lastUpdated && { lastModified: new Date(p.lastUpdated) }), changeFrequency: "monthly" as const, priority: 0.6 })),
    ...getBooks().map((b) => ({ url: absoluteUrl(`/books/${b.slug}`), ...(b.lastUpdated && { lastModified: new Date(b.lastUpdated) }), changeFrequency: "yearly" as const, priority: 0.6 })),
  ];
}
