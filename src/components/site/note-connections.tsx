import Link from "next/link";
import { ArrowUpRight, Globe } from "lucide-react";
import type { NoteConnection } from "@/lib/link-previews";
import { kindSwatch, openLabel, previewMeta } from "./preview-kinds";
import { Meta } from "./primitives";

function Card({ connection: { preview, via } }: { connection: NoteConnection }) {
  const external = preview.type === "external";
  const title = external ? preview.title ?? preview.host : preview.title;
  const text = external ? preview.description : preview.excerpt;
  const body = <>
    <div className="flex items-center gap-1.5">
      {external ? <Globe className="size-3 shrink-0 text-muted-foreground" aria-hidden="true" /> : <span className="size-2 shrink-0 rounded-full" style={kindSwatch(preview.kind)} aria-hidden="true" />}
      <Meta>{previewMeta(preview)}</Meta>
      <ArrowUpRight className="ml-auto size-3.5 shrink-0 text-muted-foreground transition-colors group-hover:text-primary" aria-hidden="true" />
    </div>
    <p className="mt-2 font-display text-base font-bold leading-snug transition-colors group-hover:text-primary">{title}</p>
    {text && <p className="mt-1.5 line-clamp-2 text-[13px] leading-relaxed text-muted-foreground">{text}</p>}
    {via && <p className="mt-2 font-mono text-[10px] text-primary">shares {via.map((t) => `#${t}`).join(" · ")}</p>}
    {!external && preview.links && !via && <p className="mt-2 font-mono text-[10px] text-muted-foreground">links to {preview.links.out} · linked from {preview.links.in}</p>}
    <span className="sr-only">{openLabel(preview)}</span>
  </>;
  const className = "group surface block h-full rounded-md p-4 transition-colors hover:border-primary/40 focus-visible:outline-2 focus-visible:outline-ring";
  return external
    ? <a href={preview.href} target="_blank" rel="noopener noreferrer" className={className}>{body}</a>
    : <Link href={preview.href} className={className}>{body}</Link>;
}

function Group({ title, hint, items }: { title: string; hint: string; items: NoteConnection[] }) {
  if (!items.length) return null;
  return <section className="mt-8 first:mt-0">
    <div className="flex items-baseline justify-between gap-4"><h3 className="font-display text-sm font-bold">{title} <span className="font-mono text-[11px] font-normal text-muted-foreground">{items.length}</span></h3><span className="font-mono text-[10px] text-muted-foreground">{hint}</span></div>
    <ul className="mt-3 grid gap-3 sm:grid-cols-2">{items.map((c) => <li key={c.preview.href}><Card connection={c} /></li>)}</ul>
  </section>;
}

/** The footer of a note: everything it touches, grouped by how, with enough detail to choose a next read. */
export function NoteConnections({ linksTo, linkedFrom, sharesTopics }: { linksTo: NoteConnection[]; linkedFrom: NoteConnection[]; sharesTopics: NoteConnection[] }) {
  if (!linksTo.length && !linkedFrom.length && !sharesTopics.length) return null;
  return <aside aria-labelledby="connections-title" className="mt-12 border-t border-dashed border-border pt-6">
    <div className="flex items-baseline justify-between">
      <h2 id="connections-title"><Meta>CONNECTIONS / READ NEXT</Meta></h2>
      <Link href="/garden#map" className="font-mono text-[11px] text-primary hover:underline">see the map →</Link>
    </div>
    <div className="mt-5">
      <Group title="Links to" hint="written into this note" items={linksTo} />
      <Group title="Linked from" hint="pieces that point here" items={linkedFrom} />
      <Group title="Shares topics" hint="same tags, not linked yet" items={sharesTopics} />
    </div>
  </aside>;
}
