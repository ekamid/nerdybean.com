import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AeropressBrew } from "@/components/site/aeropress-brew";
import Link from "next/link";
import { Body, Meta, SectionTitle } from "@/components/site/page";
import { JsonLd } from "@/components/site/json-ld";
import { getCoffeeLogs, getNotes } from "@/lib/content";
import { breadcrumbJsonLd, pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Coffee Lab — brew methods, recipes & questions",
  description: "Ebrahim Khalil’s coffee lab: brew methods and recipes, starting with a 15 g / 250 g AeroPress at 90–92°C, plus an open question about AI and coffee farming.",
  path: "/coffee",
});

// One entry per brew method. Add a new method here and it shows up in the category nav.
const methods: { id: string; name: string; tagline: string; specs: [string, string][]; demo: ReactNode }[] = [
  {
    id: "aeropress",
    name: "AeroPress",
    tagline: "My daily cup. 15 g in, 250 g out.",
    specs: [["Dose", "15 g"], ["Water", "250 g"], ["Ratio", "1:~17"], ["Temp", "90–92°C"], ["Grind", "fine-to-coarse"]],
    demo: <AeropressBrew />,
  },
];

export default function CoffeePage() {
  const logs = getCoffeeLogs();
  const writing = getNotes().filter((n) => n.category === "Coffee" || n.tags.some((t) => t.toLowerCase() === "coffee"));
  return <main className="mx-auto max-w-[1200px] px-4 sm:px-6">
    <JsonLd data={breadcrumbJsonLd([{ name: "Coffee Lab", path: "/coffee" }])} />
    <section className="grid grid-cols-12 items-end gap-8 border-b border-border pb-12 pt-14 sm:pt-20">
      <div className="col-span-12 rise-in lg:col-span-8">
        <h1 className="text-balance font-display text-[clamp(2.4rem,6vw,4.25rem)] font-extrabold leading-[.95] tracking-tight">
          From the cup <span className="text-primary">back to the farm —</span>
        </h1>
        <p className="mt-7 max-w-[48ch] text-[17px] leading-relaxed text-muted-foreground">
          brewing at home with beans from local roasters, and wondering how the knowledge behind a
          great cup could reach the farms that need it most.
        </p>
      </div>
    </section>

    <section className="rise-in py-12 [animation-delay:120ms]">
      <Meta>BREW METHODS</Meta>
      <nav aria-label="Brew methods" className="mt-4 flex flex-wrap gap-2 font-mono text-[11px]">
        {methods.map((m) => (
          <a key={m.id} href={`#${m.id}`} className="rounded-full border border-primary bg-primary/10 px-3 py-1 text-primary">
            {m.name}
          </a>
        ))}
        <span className="rounded-full border border-dashed border-border px-3 py-1 text-muted-foreground">more brewing…</span>
      </nav>
      {methods.map((m) => (
        <article key={m.id} id={m.id} className="mt-10 scroll-mt-24">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <h2 className="font-display text-3xl font-bold">{m.name}</h2>
              <p className="mt-2 text-muted-foreground">{m.tagline}</p>
            </div>
            <dl className="flex flex-wrap gap-x-6 gap-y-2 font-mono text-xs">
              {m.specs.map(([label, value]) => (
                <div key={label}>
                  <dt className="text-[10px] uppercase tracking-[0.15em] text-primary">{label}</dt>
                  <dd className="mt-1">{value}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div className="mt-8">{m.demo}</div>
        </article>
      ))}
    </section>

    <section className="border-t border-border py-12">
      <Meta>COFFEE LOG</Meta>
      <h2 className="mt-3 font-display text-3xl font-bold">Notes, newest first.</h2>
      {logs.length === 0 ? (
        <p className="mt-6 text-muted-foreground">No entries yet.</p>
      ) : (
        <ol className="mt-8 border-l border-border">
          {logs.map((l, i) => (
            <li key={`${l.isoDate}-${l.title}`} className="relative pb-10 pl-8 last:pb-0">
              <span className={`absolute -left-[5px] top-1.5 size-2.5 rounded-full ${i === 0 ? "bg-primary" : "border border-border bg-background"}`} aria-hidden="true" />
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11px] text-muted-foreground">
                <time dateTime={l.isoDate}>{l.date}</time>
                <span aria-hidden="true">·</span>
                <span>{l.method}</span>
                {l.beans && <><span aria-hidden="true">·</span><span>{l.beans}</span></>}
                {i === 0 && <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] uppercase tracking-[0.15em] text-primary">latest</span>}
              </div>
              <h3 className="mt-2 font-display text-xl font-bold">{l.title}</h3>
              <Body source={l.body} className="mt-2 max-w-[62ch] [&_p]:text-[15px] [&_p]:leading-relaxed [&_p]:text-muted-foreground" />
            </li>
          ))}
        </ol>
      )}
    </section>

    <section className="grid grid-cols-12 gap-8 border-t border-border py-12">
      <div className="col-span-12 md:col-span-5">
        <Meta>CURRENT QUESTION</Meta>
        <h2 className="mt-3 text-balance font-display text-2xl font-bold leading-snug">
          Can AI carry expert coffee knowledge from places like Brazil, Ethiopia, Indonesia and
          Colombia to the regions still learning?
        </h2>
      </div>
      <div className="col-span-12 md:col-span-7">
        <p className="leading-7 text-muted-foreground">
          The great coffee regions hold generations of know-how, most of it passed farmer to farmer
          and rarely written down. Newer growing regions start without it. I want to know whether
          AI can close that gap across the whole chain, not just in the cup. No answer yet; the
          notes will go into the garden as they grow.
        </p>
      </div>
    </section>

    <section className="border-t border-border py-12">
      <SectionTitle link="/garden" label="every note →">Coffee in the garden</SectionTitle>
      {writing.length === 0 ? (
        <p className="surface rounded-lg p-6 text-muted-foreground">
          Nothing written about coffee yet. When I do, it’ll grow here.
        </p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {writing.map((n) => (
            <Link key={n.slug} href={`/garden/${n.slug}`} className="surface group rounded-lg p-5">
              <Meta><time dateTime={n.isoDate}>{n.date}</time> · {n.read}</Meta>
              <h3 className="mt-2 font-display text-lg font-semibold transition-colors group-hover:text-primary">{n.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{n.excerpt}</p>
            </Link>
          ))}
        </div>
      )}
    </section>
  </main>;
}
