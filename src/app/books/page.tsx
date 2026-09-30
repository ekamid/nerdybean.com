import type { Metadata } from "next";
import Link from "next/link";
import { getBooks } from "@/lib/content";
import { EmptyShelf, Meta, pad, PageIntro } from "@/components/site/page";
import { JsonLd } from "@/components/site/json-ld";
import { breadcrumbJsonLd, itemListJsonLd, pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Reading journal — books on memory, walking and home",
  description: "Reflections by Ebrahim Khalil on Ishiguro, Calvino, Macfarlane, Murakami and Tagore: the lines worth keeping, and what each book changed.",
  path: "/books",
});

export default function BooksPage() {
  const books = getBooks();
  return <main className="mx-auto max-w-[1200px] px-4 sm:px-6">
    <JsonLd data={[itemListJsonLd("Reading journal", "/books", books.map((b) => ({ name: `${b.title} by ${b.author}`, path: `/books/${b.slug}` }))), breadcrumbJsonLd([{ name: "Books", path: "/books" }])]} />
    <PageIntro eyebrow="READING JOURNAL / NOTES IN THE MARGIN" title="Books I’m still thinking about."><p>No star ratings. For each book: what it is about, the lines I copied out, and what it changed in how I work or live.</p></PageIntro>
    {books.length === 0 && <EmptyShelf>No reading notes published yet. The first ones are being written.</EmptyShelf>}
    <section className="py-10">{books.map((b, i) => <article key={b.slug} className="grid grid-cols-12 gap-5 border-t border-border py-10"><div className="col-span-12 md:col-span-3"><Meta>BOOK / {pad(i + 1)} · {b.year}</Meta><h2 className="mt-4 font-display text-2xl font-bold"><Link href={`/books/${b.slug}`} className="hover:text-primary">{b.title}</Link></h2><p className="mt-2 font-mono text-xs text-muted-foreground">{b.author}</p></div><div className="col-span-12 md:col-span-6"><blockquote className="border-l-2 border-primary pl-5 font-serif text-xl italic leading-8">{b.thought}</blockquote><p className="mt-6 leading-7 text-muted-foreground">{b.reflection}</p><Link href={`/books/${b.slug}`} className="mt-6 inline-block font-mono text-[11px] text-primary hover:underline">read the full reflection<span className="sr-only"> for {b.title}</span> →</Link></div><aside className="col-span-12 md:col-span-3"><div className="surface rounded-md p-4"><Meta>IN THE MARGIN</Meta><p className="mt-3 font-serif text-sm italic leading-6 text-muted-foreground">{b.margin}</p></div></aside></article>)}</section>
  </main>;
}
