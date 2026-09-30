import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Backlinks, Body, Cover, Meta } from "@/components/site/page";
import { JsonLd } from "@/components/site/json-ld";
import { Changelog, UpdatedStamp } from "@/components/site/changelog";
import { getProject, getProjects } from "@/lib/content";
import { breadcrumbJsonLd, pageMetadata, personId } from "@/lib/seo";
import { absoluteUrl } from "@/lib/site";

type Props = { params: Promise<{ slug: string }> };

export const dynamicParams = false;
export const generateStaticParams = () => getProjects().map((p) => ({ slug: p.slug }));

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = getProject((await params).slug);
  if (!p) return {};
  return pageMetadata({ title: `${p.title} — project`, description: `${p.summary} ${p.question}`, path: `/projects/${p.slug}`, type: "article", tags: p.tech.split(" · ") });
}

export default async function ProjectPage({ params }: Props) {
  const p = getProject((await params).slug);
  if (!p) notFound();
  const path = `/projects/${p.slug}`;
  return <main className="mx-auto max-w-4xl px-4 py-14 sm:px-6 sm:py-20">
    <JsonLd data={[
      { "@type": "CreativeWork", name: p.title, headline: p.title, description: p.summary, abstract: p.question, keywords: p.tech.split(" · ").join(", "), creativeWorkStatus: p.stage, ...(p.lastUpdated && { dateModified: p.lastUpdated }), url: absoluteUrl(path), author: { "@id": personId }, inLanguage: "en-GB" },
      breadcrumbJsonLd([{ name: "Projects", path: "/projects" }, { name: p.title, path }]),
    ]} />
    <nav aria-label="Breadcrumb"><Link href="/projects" className="font-mono text-xs text-primary">← project archive</Link></nav>
    <article className="mt-8">
      <Meta>{p.stage} · {p.tech}<UpdatedStamp date={p.lastUpdated} /></Meta>
      <h1 className="mt-4 font-display text-5xl font-extrabold sm:text-7xl">{p.title}</h1>
      <Cover image={p.image} imageAlt={p.imageAlt} imageCaption={p.imageCaption} priority />
      <p className="mt-6 max-w-2xl font-body text-xl italic text-muted-foreground">{p.question}</p>
      <div className="mt-12 grid gap-px overflow-hidden rounded-lg border border-border bg-border md:grid-cols-3">{[["WHAT IT IS", p.summary], ["WHY IT EXISTS", p.why], ["WHAT I WORKED ON", p.worked ?? p.tech]].filter((x): x is [string, string] => Boolean(x[1])).map((x) => <section className="bg-background p-5" key={x[0]}><Meta>{x[0]}</Meta><p className="mt-4 text-sm leading-6">{x[1]}</p></section>)}</div>
      {p.body && <div className="mt-12 grid gap-10 md:grid-cols-[1fr_2fr]"><Meta>FIELD NOTES</Meta><Body source={p.body} className="min-w-0" /></div>}
      <Changelog updates={p.updates} />
      <Backlinks links={[{ label: "Error messages are letters to strangers", href: "/garden/error-messages-are-letters" }, { label: "All projects", href: "/projects" }, { label: "About my work", href: "/about" }]} />
    </article>
  </main>;
}
