"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { LinkPreview } from "@/lib/link-previews";
import { PreviewLink } from "./link-preview";
import { Meta, Tags } from "./primitives";

type Previews = Record<string, LinkPreview>;
const tagHref = (t: string) => (t === "all" ? "/garden" : `/garden?tag=${encodeURIComponent(t)}`);

export type GardenNote = { slug: string; title: string; category: string; date: string; isoDate: string; read: string; excerpt: string; tags: string[] };

function FilteredList({ notes, previews }: { notes: GardenNote[]; previews: Previews }) {
  return <List notes={notes} previews={previews} active={useSearchParams().get("tag") ?? "all"} />;
}

function List({ notes, previews, active }: { notes: GardenNote[]; previews: Previews; active: string }) {
  const tags = ["all", ...new Set(notes.flatMap((n) => n.tags))];
  const shown = active === "all" ? notes : notes.filter((n) => n.tags.includes(active));
  return <div className="grid grid-cols-12 gap-8 py-10">
    <aside className="col-span-12 lg:col-span-3"><Meta>FILTER BY TOPIC</Meta><nav aria-label="Filter notes by tag" className="mt-4 flex flex-wrap gap-2 lg:flex-col lg:items-start">{tags.map((t) => <PreviewLink key={t} href={tagHref(t)} preview={previews[tagHref(t)]} scroll={false} aria-current={active === t ? "true" : undefined} className={`font-mono text-xs transition-colors ${active === t ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}>{active === t ? "● " : "○ "}{t}</PreviewLink>)}</nav></aside>
    <section className="col-span-12 space-y-3 lg:col-span-9" aria-live="polite">
      {shown.length === 0 && (active === "all" ? <p className="text-muted-foreground">No essays published yet. The first ones are being written.</p> : <p className="text-muted-foreground">Nothing tagged “{active}” yet. <Link href="/garden" className="text-primary hover:underline">Show everything</Link>.</p>)}
      {shown.map((n) => <article key={n.slug} className="surface rounded-md p-5"><Meta>{n.category} · <time dateTime={n.isoDate}>{n.date}</time> · {n.read}</Meta><h2 className="mt-2 font-display text-xl font-bold"><PreviewLink href={`/garden/${n.slug}`} preview={previews[`/garden/${n.slug}`]} className="hover:text-primary">{n.title}</PreviewLink></h2><p className="mt-2 text-sm text-muted-foreground">{n.excerpt}</p><div className="mt-4"><Tags items={n.tags} previews={previews} /></div></article>)}
    </section>
  </div>;
}

export function GardenList({ notes, previews = {}, filtered = false }: { notes: GardenNote[]; previews?: Previews; filtered?: boolean }) {
  return filtered ? <FilteredList notes={notes} previews={previews} /> : <List notes={notes} previews={previews} active="all" />;
}
