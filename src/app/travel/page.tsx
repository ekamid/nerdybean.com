import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import mountain from "@/assets/mountain-ridge.jpg";
import { getTravels } from "@/lib/content";
import { EmptyShelf, Meta, pad, PageIntro } from "@/components/site/page";
import { JsonLd } from "@/components/site/json-ld";
import { breadcrumbJsonLd, pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Travel & mountains — Bangladesh, Wales, Scotland, Himalayas",
  description: "Ebrahim Khalil on Bangladesh, Wales, Scotland and the Himalayas: altitude, rain, long runs and the Ironman 70.3, and what each place taught him.",
  path: "/travel",
});

export default function TravelPage() {
  const travels = getTravels();
  return <main className="mx-auto max-w-[1200px] px-4 sm:px-6">
    <JsonLd data={breadcrumbJsonLd([{ name: "Travel", path: "/travel" }])} />
    <PageIntro eyebrow="TRAVEL / PLACES & ROUTES" title="Places that changed how I think."><p>Where I grew up, where I live now, and a few places I walked a long way to reach, with one lesson from each.</p></PageIntro>
    <figure className="relative mt-10 overflow-hidden rounded-lg"><Image src={mountain} alt="A hiker facing a cloud-wrapped Himalayan ridge" priority placeholder="blur" sizes="(min-width: 1200px) 1152px, 100vw" className="h-[65vh] min-h-[480px] w-full object-cover" /><figcaption className="absolute inset-x-0 bottom-0 bg-background/85 p-4 font-mono text-[10px] backdrop-blur-md">Himalayan ridge, early morning · the pace is slower than it looks</figcaption></figure>
    {travels.length === 0 && <EmptyShelf>No places published yet.</EmptyShelf>}
    <section className="py-12" aria-label="Places">{travels.map((t, i) => <article key={t.place} className="grid grid-cols-12 gap-5 border-t border-border py-8"><div className="col-span-12 md:col-span-2"><Meta>{pad(i + 1)} / {t.coordinates}</Meta></div><div className="col-span-12 md:col-span-4"><h2 className="font-display text-2xl font-bold">{t.place}</h2><p className="mt-2 font-mono text-xs text-muted-foreground">{t.detail}</p></div><blockquote className="col-span-12 text-lg italic text-muted-foreground md:col-span-6">“{t.thought}”</blockquote></article>)}</section>
    <section className="border-t border-border py-12"><Meta>ON FOOT, ON WHEELS, IN WATER</Meta><h2 className="mt-4 font-display text-3xl font-bold">Endurance, mostly as a way to think.</h2><p className="mt-3 max-w-[60ch] text-muted-foreground">Long runs along the coast, a triathlon that took most of a day, and mountain trails where the plan changed every hour. None of it is about speed.</p><div className="mt-6 grid gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-3">{[["RACE", "Ironman 70.3", "Swim 1.9 km, bike 90 km, run 21.1 km. Pacing mattered more than fitness."], ["ALTITUDE", "Himalayan trekking", "Rest days, slow switchbacks, and knowing when to turn back."], ["ROUTINE", "Running in Wales", "Rain on most days, so I stopped waiting for dry ones."]].map((x) => <div className="bg-background p-5" key={x[0]}><Meta>{x[0]}</Meta><h3 className="mt-4 font-display text-xl font-bold">{x[1]}</h3><p className="mt-2 text-sm text-muted-foreground">{x[2]}</p></div>)}</div><div className="mt-6 space-y-4"><Link href="/garden/pacing-is-honesty" className="surface block rounded-md p-5"><h3 className="font-display text-xl font-bold">Pacing is a form of honesty</h3><p className="mt-2 text-muted-foreground">What a 70.3 taught me about not starting too fast, in races and at work.</p></Link><Link href="/garden/small-steps-at-altitude" className="surface block rounded-md p-5"><h3 className="font-display text-xl font-bold">The arithmetic of small steps at altitude</h3><p className="mt-2 text-muted-foreground">Thin air, invisible progress, and why turning around is a skill.</p></Link></div></section>
  </main>;
}
