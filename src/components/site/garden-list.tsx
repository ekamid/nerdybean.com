"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Meta, Tags } from "./primitives";

export type GardenNote = { slug: string; title: string; category: string; date: string; isoDate: string; read: string; excerpt: string; tags: string[] };

function FilteredList({ notes }: { notes: GardenNote[] }) {
  return <List notes={notes} active={useSearchParams().get("tag") ?? "all"} />;
}

function List({ notes, active }: { notes: GardenNote[]; active: string }) {
  const tags = ["all", ...new Set(notes.flatMap((n) => n.tags))];
  const shown = active === "all" ? notes : notes.filter((n) => n.tags.includes(active));
  return <div className="grid grid-cols-12 gap-8 py-10">
    <aside className="col-span-12 lg:col-span-3"><Meta>FILTER BY TOPIC</Meta><nav aria-label="Filter notes by tag" className="mt-4 flex flex-wrap gap-2 lg:flex-col lg:items-start">{tags.map((t) => <Link key={t} href={t === "all" ? "/garden" : `/garden?tag=${encodeURIComponent(t)}`} scroll={false} aria-current={active === t ? "true" : undefined} className={`font-mono text-xs transition-colors ${active === t ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}>{active === t ? "● " : "○ "}{t}</Link>)}</nav></aside>
    <section className="col-span-12 space-y-3 lg:col-span-9" aria-live="polite">
      {shown.length === 0 && (active === "all" ? <p className="text-muted-foreground">No essays published yet. The first ones are being written.</p> : <p className="text-muted-foreground">Nothing tagged “{active}” yet. <Link href="/garden" className="text-primary hover:underline">Show everything</Link>.</p>)}
      {shown.map((n) => <article key={n.slug} className="surface rounded-md p-5"><Meta>{n.category} · <time dateTime={n.isoDate}>{n.date}</time> · {n.read}</Meta><h2 className="mt-2 font-display text-xl font-bold"><Link href={`/garden/${n.slug}`} className="hover:text-primary">{n.title}</Link></h2><p className="mt-2 text-sm text-muted-foreground">{n.excerpt}</p><div className="mt-4"><Tags items={n.tags} /></div></article>)}
    </section>
  </div>;
}

export function GardenList({ notes, filtered = false }: { notes: GardenNote[]; filtered?: boolean }) {
  return filtered ? <FilteredList notes={notes} /> : <List notes={notes} active="all" />;
}
