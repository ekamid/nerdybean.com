import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import mountain from "@/assets/mountain-ridge.jpg";
import { getNotes, getProjects } from "@/lib/content";
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

function GardenMap() {
  const nodes = [[50, 50], [22, 30], [72, 26], [78, 68], [28, 74], [14, 52], [60, 82], [86, 44], [40, 16]] as const;
  return <Link href="/garden" className="group block" aria-label="Explore the interconnected garden"><div className="relative aspect-square max-h-72 overflow-hidden rounded-md dot-field"><svg className="absolute inset-0 h-full w-full text-primary/25" viewBox="0 0 100 100" aria-hidden="true"><path d="M50 50 22 30M50 50 72 26M50 50 78 68M50 50 28 74M22 30 40 16M22 30 14 52M78 68 60 82M72 26 86 44" fill="none" stroke="currentColor" strokeWidth=".5" strokeDasharray="2 2" /></svg>{nodes.map(([x, y], i) => <span key={i} className="absolute rounded-full bg-primary transition-transform group-hover:scale-125" style={{ left: `${x}%`, top: `${y}%`, width: i === 0 ? 12 : 7, height: i === 0 ? 12 : 7, transform: "translate(-50%,-50%)" }} />)}</div></Link>;
}

export default function Home() {
  const notes = getNotes();
  const projects = getProjects();
  const featured = notes[0];
  return <main className="mx-auto max-w-[1200px] px-4 sm:px-6">
    <section className="grid grid-cols-12 items-end gap-8 pb-12 pt-14 sm:pt-20">
      <div className="col-span-12 rise-in lg:col-span-7"><p className="mb-5 font-mono text-[11px] tracking-[0.25em] text-primary">NOTES FROM CARDIFF, WRITTEN IN PUBLIC</p><h1 className="text-balance font-display text-[clamp(2.6rem,6vw,5rem)] font-extrabold leading-[.95]">Building software.<br />Walking uphill.</h1><p className="mt-6 max-w-[46ch] text-[17px] leading-relaxed text-muted-foreground">I’m Ebrahim, a software developer studying for an MSc in Artificial Intelligence in Wales. This is where I keep what I’m learning: about machines, about people, and about how far my legs will carry me.</p></div>
      <div className="col-span-12 rise-in lg:col-span-5 [animation-delay:120ms]"><div className="surface rounded-lg p-5"><div className="mb-4 flex justify-between"><Meta>RIGHT NOW</Meta><span className="font-mono text-[10px] text-primary">updated as it changes</span></div><ul className="space-y-2.5 font-mono text-xs">{["Living in Cardiff, Wales", "MSc Artificial Intelligence student", "3+ years shipping web & mobile apps", "Training for long, slow distances", "Reading, one chapter at a time"].map((x) => <li className="flex items-center gap-2.5" key={x}><span className="size-1.5 rounded-full bg-primary" aria-hidden="true" />{x}</li>)}</ul></div></div>
    </section>
    {featured && <section className="border-t border-border py-10"><SectionTitle link="/garden" label="every note →">Latest from the garden</SectionTitle><div className="grid grid-cols-12 gap-5">
      <article className="surface relative col-span-12 rounded-lg p-6 md:col-span-7"><Meta>{featured.category} · <time dateTime={featured.isoDate}>{featured.date}</time> · {featured.read}</Meta><h3 className="mt-4 font-display text-2xl font-bold"><Link href={`/garden/${featured.slug}`} className="hover:text-primary">{featured.title}</Link></h3><p className="mt-3 max-w-[52ch] text-[15px] leading-relaxed text-muted-foreground">{featured.excerpt}</p><div className="mt-4"><Tags items={featured.tags} /></div></article>
      <div className="col-span-12 flex flex-col gap-4 md:col-span-5">{notes.slice(1, 3).map((n) => <Link href={`/garden/${n.slug}`} key={n.slug} className="surface flex-1 rounded-lg p-5"><Meta>{n.category} · {n.date}</Meta><h3 className="mt-2 font-display text-lg font-semibold">{n.title}</h3><p className="mt-2 text-sm text-muted-foreground">{n.excerpt}</p></Link>)}</div>
    </div></section>}
    <section className="grid grid-cols-12 gap-8 border-t border-border py-10"><div className="col-span-12 md:col-span-7"><SectionTitle link="/projects" label="all projects →">Things I’ve built</SectionTitle>{projects.length === 0 && <p className="surface rounded-md p-4 text-sm text-muted-foreground">Project write-ups are coming soon.</p>}<div className="space-y-3">{projects.slice(0, 3).map((p) => <Link href={`/projects/${p.slug}`} key={p.slug} className="surface block rounded-md p-4 transition-colors hover:border-primary/40"><div className="flex flex-col justify-between gap-1 sm:flex-row"><span className="font-display font-semibold">{p.title}</span><span className="font-mono text-[10px] text-muted-foreground">{p.tech}</span></div><p className="mt-1.5 text-[13px] text-muted-foreground">{p.summary}</p></Link>)}</div></div><div className="col-span-12 md:col-span-5"><div className="surface rounded-lg p-5"><div className="mb-2 flex justify-between"><Meta>HOW IT CONNECTS</Meta><span className="font-mono text-[10px] text-primary">linked notes</span></div><GardenMap /><p className="mt-3 text-[13px] text-muted-foreground">Calibration links to pacing, pacing to altitude, altitude to patience. Every note points to others, so pick one and follow the links.</p></div></div></section>
    <section className="grid grid-cols-12 items-center gap-8 border-t border-border py-10"><div className="col-span-12 md:col-span-5"><Link href="/travel" className="block overflow-hidden rounded-lg" aria-label="Travel journal"><Image src={mountain} alt="A lone hiker walking along a misty mountain ridge" placeholder="blur" sizes="(min-width: 768px) 460px, 100vw" className="aspect-[4/5] w-full object-cover transition-transform duration-700 hover:scale-[1.02]" /></Link></div><div className="col-span-12 md:col-span-7"><Meta>TRAVEL · MOUNTAINS</Meta><h2 className="mt-4 text-balance font-display text-3xl font-bold">The places that changed how I think.</h2><p className="mt-4 max-w-[50ch] leading-relaxed text-muted-foreground">From Bangladesh to Wales, with Scottish moorland and Himalayan switchbacks in between. Fewer itineraries, more of what each place taught me.</p><div className="mt-6 grid grid-cols-1 gap-3 font-mono text-[11px] sm:grid-cols-3">{[["FURTHEST", "Ironman 70.3", "1.9 · 90 · 21.1 km"], ["HIGHEST", "Himalayan trails", "slowly, on purpose"], ["BASE CAMP", "Cardiff", "51.48° N, 3.18° W"]].map((x) => <div className="surface rounded-md p-3" key={x[0]}><span className="text-muted-foreground">{x[0]}</span><div className="mt-1">{x[1]}</div><div className="mt-1 text-primary">{x[2]}</div></div>)}</div></div></section>
  </main>;
}
