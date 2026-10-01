import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Body, Cover, Meta, pad, Tags } from "@/components/site/page";
import { NoteConnections } from "@/components/site/note-connections";
import { JsonLd } from "@/components/site/json-ld";
import { Changelog, UpdatedStamp } from "@/components/site/changelog";
import { getNote, getNotes } from "@/lib/content";
import { getLinkPreviews, getNoteConnections, markdownHrefs } from "@/lib/link-previews";
import { breadcrumbJsonLd, pageMetadata, personId, websiteId } from "@/lib/seo";
import { absoluteUrl } from "@/lib/site";

type Props = { params: Promise<{ slug: string }> };

export const dynamicParams = false;
export const generateStaticParams = () => getNotes().map((n) => ({ slug: n.slug }));

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const note = getNote((await params).slug);
  if (!note) return {};
  return pageMetadata({ title: note.title, description: note.excerpt, path: `/garden/${note.slug}`, type: "article", publishedTime: note.isoDate, tags: note.tags });
}

export default async function NotePage({ params }: Props) {
  const n = getNote((await params).slug);
  if (!n) notFound();
  const path = `/garden/${n.slug}`;
  const [previews, connections] = await Promise.all([
    getLinkPreviews([...markdownHrefs(n.body), ...n.tags.map((t) => `/garden?tag=${encodeURIComponent(t)}`)]),
    getNoteConnections(n),
  ]);
  return <main className="mx-auto max-w-3xl px-4 py-14 sm:px-6 sm:py-20">
    <JsonLd data={[
      {
        "@type": "BlogPosting",
        headline: n.title,
        description: n.excerpt,
        datePublished: n.isoDate,
        dateModified: n.lastUpdated ?? n.isoDate,
        articleSection: n.category,
        keywords: n.tags.join(", "),
        url: absoluteUrl(path),
        mainEntityOfPage: absoluteUrl(path),
        image: n.image ? absoluteUrl(n.image) : absoluteUrl(`${path}/opengraph-image`),
        author: { "@id": personId },
        publisher: { "@id": personId },
        isPartOf: { "@id": websiteId },
        inLanguage: "en-GB",
      },
      breadcrumbJsonLd([{ name: "Garden", path: "/garden" }, { name: n.title, path }]),
    ]} />
    <nav aria-label="Breadcrumb"><Link href="/garden" className="font-mono text-xs text-primary">← garden</Link></nav>
    <article className="mt-8">
      <Meta>{n.category} · <time dateTime={n.isoDate}>{n.date}</time> · {n.read}<UpdatedStamp date={n.lastUpdated} /></Meta>
      <h1 className="mt-4 text-balance font-display text-4xl font-extrabold leading-tight sm:text-6xl">{n.title}</h1>
      <div className="mt-6"><Tags items={n.tags} previews={previews} /></div>
      <Cover image={n.image} imageAlt={n.imageAlt} imageCaption={n.imageCaption} priority />
      <div className="prose-garden mt-10 text-lg leading-8">
        {n.intro && <p className="font-serif text-xl leading-9 text-foreground sm:text-2xl sm:leading-10">{n.intro}</p>}
        {n.pullQuote && <div className="my-10 border-y border-dashed border-border py-8"><Meta>THE SHORT VERSION</Meta><blockquote className="mt-4 border-l-2 border-primary pl-5 font-serif text-xl italic leading-8 text-foreground">{n.pullQuote}</blockquote></div>}
        {n.sections.map((section, index) => <section key={section.heading} className="mt-10"><div className="grid gap-3 sm:grid-cols-[5rem_1fr]"><Meta>{pad(index + 1)}</Meta><div><h2 className="font-display text-2xl font-bold">{section.heading}</h2><div className="mt-5 space-y-5 text-muted-foreground">{section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}</div>{section.image && <Image src={section.image} alt={section.imageAlt ?? ""} width={1600} height={912} sizes="(min-width: 896px) 700px, 100vw" className="mt-6 h-auto w-full rounded-lg border border-border" />}</div></div></section>)}
        <Body source={n.body} previews={previews} />
      </div>
      <Changelog updates={n.updates} published={{ iso: n.isoDate, label: n.date }} />
      <NoteConnections {...connections} />
    </article>
  </main>;
}
