import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Backlinks, Body, Cover, Meta, pad, Tags } from "@/components/site/page";
import { JsonLd } from "@/components/site/json-ld";
import { Changelog, UpdatedStamp } from "@/components/site/changelog";
import { getBook, getBooks } from "@/lib/content";
import { breadcrumbJsonLd, pageMetadata, personId, websiteId } from "@/lib/seo";
import { absoluteUrl } from "@/lib/site";

type Props = { params: Promise<{ slug: string }> };

export const dynamicParams = false;
export const generateStaticParams = () => getBooks().map((b) => ({ slug: b.slug }));

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const b = getBook((await params).slug);
  if (!b) return {};
  return pageMetadata({ title: `${b.title} by ${b.author} — reading notes`, description: `${b.thought} ${b.reflection}`.slice(0, 300), path: `/books/${b.slug}`, type: "article", tags: [b.author, b.genre, ...b.tags] });
}

export default async function BookPage({ params }: Props) {
  const b = getBook((await params).slug);
  if (!b) notFound();
  const path = `/books/${b.slug}`;
  return <main className="mx-auto max-w-3xl px-4 py-14 sm:px-6 sm:py-20">
    <JsonLd data={[
      {
        "@type": "Article",
        headline: `${b.title} by ${b.author} — reading notes`,
        description: b.thought,
        ...(b.lastUpdated && { dateModified: b.lastUpdated }),
        url: absoluteUrl(path),
        mainEntityOfPage: absoluteUrl(path),
        image: absoluteUrl(`${path}/opengraph-image`),
        keywords: [b.genre, ...b.tags].join(", "),
        author: { "@id": personId },
        publisher: { "@id": personId },
        isPartOf: { "@id": websiteId },
        inLanguage: "en-GB",
        about: { "@type": "Book", name: b.title, author: { "@type": "Person", name: b.author }, genre: b.genre, ...(b.year && { datePublished: String(b.year) }) },
      },
      breadcrumbJsonLd([{ name: "Books", path: "/books" }, { name: b.title, path }]),
    ]} />
    <nav aria-label="Breadcrumb"><Link href="/books" className="font-mono text-xs text-primary">← reading journal</Link></nav>
    <article className="mt-8">
      <Meta>{b.genre} · {b.year} · reading notes<UpdatedStamp date={b.lastUpdated} /></Meta>
      <h1 className="mt-4 text-balance font-display text-4xl font-extrabold leading-tight sm:text-6xl">{b.title}</h1>
      <Cover image={b.image} imageAlt={b.imageAlt} imageCaption={b.imageCaption} priority />
      <p className="mt-4 font-mono text-sm text-muted-foreground">{b.author}</p>
      {b.tags.length > 0 && <div className="mt-6"><Tags items={b.tags} /></div>}
      <div className="prose-garden mt-10 text-lg leading-8">
        <blockquote className="border-l-2 border-primary pl-5 font-serif text-2xl italic leading-10 text-foreground">{b.thought}</blockquote>
        <p className="mt-10 text-muted-foreground">{b.reflection}</p>
        {b.sections.map((section, index) => <section key={section.heading} className="mt-12"><div className="grid gap-3 sm:grid-cols-[5rem_1fr]"><Meta>{pad(index + 1)}</Meta><div><h2 className="font-display text-2xl font-bold">{section.heading}</h2><div className="mt-5 space-y-5 text-muted-foreground">{section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}</div></div></div></section>)}
        {b.quotes.length > 0 && <section className="mt-12"><h2 className="font-mono text-[10px] font-normal uppercase tracking-[0.14em] text-muted-foreground">QUOTES I KEPT</h2><div className="mt-6 space-y-8">{b.quotes.map((quote) => <figure key={quote.text} className="border-l-2 border-primary pl-5"><blockquote className="font-serif text-xl italic leading-8 text-foreground">“{quote.text}”</blockquote><figcaption className="mt-3 text-sm leading-6 text-muted-foreground">{quote.note}</figcaption></figure>)}</div></section>}
        <Body source={b.body} />
        {b.stayed && <div className="mt-12 border-t border-dashed border-border pt-6"><Meta>WHAT STAYED WITH ME</Meta><p className="mt-4 leading-8 text-foreground">{b.stayed}</p></div>}
        {b.margin && <div className="surface mt-8 rounded-md p-4"><Meta>IN THE MARGIN</Meta><p className="mt-3 font-serif text-sm italic leading-6 text-muted-foreground">{b.margin}</p></div>}
      </div>
      <Changelog updates={b.updates} />
      <Backlinks links={b.links} />
    </article>
  </main>;
}
