import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { getNotes, getProjects } from "@/lib/content";
import { placeGardenGraph } from "@/lib/garden-graph";
import { GardenMap } from "@/components/site/garden-map";
import { Meta, SectionTitle, Tags } from "@/components/site/page";
import { pageMetadata } from "@/lib/seo";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  ...pageMetadata({
    title: site.title,
    description: site.description,
    path: "/",
  }),
  title: { absolute: site.title },
};

export default function Home() {
  const notes = getNotes();
  const projects = getProjects();
  const featured = notes[0];
  const graph = placeGardenGraph(400, 300, 16);
  return (
    <main className="mx-auto max-w-[1200px] px-4 sm:px-6">
      <section className="grid grid-cols-12 items-end gap-8 pb-12 pt-14 sm:pt-20">
        <div className="col-span-12 rise-in lg:col-span-7">
          <p className="mb-5 font-mono text-[11px] tracking-[0.25em] text-primary">
            Finished work belongs here, so do the failures
          </p>
          <h1 className="text-balance font-display text-[clamp(2.6rem,6vw,5rem)] font-extrabold leading-[.95]">
            Learning in public, one note at a time.
          </h1>
          <p className="mt-6 max-w-[46ch] text-[17px] leading-relaxed text-muted-foreground">
            I’m Ebrahim, a software developer studying for an MSc in Artificial Intelligence in
            Wales. This is where I keep what I’m learning: about machines, about people, and about
            how far my legs will carry me.
          </p>
        </div>
        <div className="col-span-12 rise-in lg:col-span-5 [animation-delay:120ms]">
          <div className="surface rounded-lg p-5">
            <div className="mb-4 flex justify-between">
              <Meta>RIGHT NOW</Meta>
              <span className="font-mono text-[10px] text-primary">updated as it changes</span>
            </div>
            <ul className="space-y-2.5 font-mono text-xs">
              {[
                "Living in Cardiff, Wales",
                "MSc Artificial Intelligence student",
                "3+ years shipping web & mobile apps",
                "Training for long, slow distances",
                "Reading, one chapter at a time",
              ].map((x) => (
                <li className="flex items-center gap-2.5" key={x}>
                  <span className="size-1.5 rounded-full bg-primary" aria-hidden="true" />
                  {x}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
      {featured && (
        <section className="border-t border-border py-10">
          <SectionTitle link="/garden" label="every note →">
            Latest from the garden
          </SectionTitle>
          <div className="grid grid-cols-12 gap-5">
            <article className="surface relative col-span-12 rounded-lg p-6 md:col-span-7">
              <Meta>
                {featured.category} · <time dateTime={featured.isoDate}>{featured.date}</time> ·{" "}
                {featured.read}
              </Meta>
              <h3 className="mt-4 font-display text-2xl font-bold">
                <Link href={`/garden/${featured.slug}`} className="hover:text-primary">
                  {featured.title}
                </Link>
              </h3>
              <p className="mt-3 max-w-[52ch] text-[15px] leading-relaxed text-muted-foreground">
                {featured.excerpt}
              </p>
              <div className="mt-4">
                <Tags items={featured.tags} />
              </div>
            </article>
            <div className="col-span-12 flex flex-col gap-4 md:col-span-5">
              {notes.slice(1, 3).map((n) => (
                <Link
                  href={`/garden/${n.slug}`}
                  key={n.slug}
                  className="surface flex-1 rounded-lg p-5"
                >
                  <Meta>
                    {n.category} · {n.date}
                  </Meta>
                  <h3 className="mt-2 font-display text-lg font-semibold">{n.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{n.excerpt}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
      <section className="grid grid-cols-12 gap-8 border-t border-border py-10">
        <div className="col-span-12 md:col-span-7">
          <SectionTitle link="/projects" label="all projects →">
            Things I’ve built
          </SectionTitle>
          {projects.length === 0 && (
            <p className="surface rounded-md p-4 text-sm text-muted-foreground">
              Project write-ups are coming soon.
            </p>
          )}
          <div className="space-y-3">
            {projects.slice(0, 3).map((p) => (
              <Link
                href={`/projects/${p.slug}`}
                key={p.slug}
                className="surface block rounded-md p-4 transition-colors hover:border-primary/40"
              >
                <div className="flex flex-col justify-between gap-1 sm:flex-row">
                  <span className="font-display font-semibold">{p.title}</span>
                  <span className="font-mono text-[10px] text-muted-foreground">{p.tech}</span>
                </div>
                <p className="mt-1.5 text-[13px] text-muted-foreground">{p.summary}</p>
              </Link>
            ))}
          </div>
        </div>
        <div className="col-span-12 md:col-span-5">
          <div className="surface rounded-lg p-5">
            <div className="mb-2 flex justify-between">
              <Meta>HOW IT CONNECTS</Meta>
              <span className="font-mono text-[10px] text-primary">linked notes</span>
            </div>
            <GardenMap graph={graph} variant="compact" />
            <p className="mt-3 text-[13px] text-muted-foreground">
              Every note points to others. Hover a dot to trace its links, click a dot for its details, drag to rearrange or pan, ⌘/ctrl + scroll to zoom, or{" "}
              <Link href="/garden#map" className="text-primary hover:underline">
                open the full map
              </Link>
              .
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
