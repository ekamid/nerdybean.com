import type { Metadata } from "next";
import Link from "next/link";
import { getProjects } from "@/lib/content";
import { EmptyShelf, Meta, pad, PageIntro } from "@/components/site/page";
import { JsonLd } from "@/components/site/json-ld";
import { breadcrumbJsonLd, itemListJsonLd, pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Projects & experiments",
  description: "Mobile apps, location experiments and applied AI by Ebrahim Khalil: HandyX, Bookish Nearby, Echo and an AI assistant for coffee farmers, each with notes on what I learned.",
  path: "/projects",
});

export default function ProjectsPage() {
  const projects = getProjects();
  return <main className="mx-auto max-w-[1200px] px-4 sm:px-6">
    <JsonLd data={[itemListJsonLd("Projects & experiments", "/projects", projects.map((p) => ({ name: p.title, path: `/projects/${p.slug}` }))), breadcrumbJsonLd([{ name: "Projects", path: "/projects" }])]} />
    <PageIntro eyebrow="PROJECTS / BUILD NOTES" title="Each one started with a question."><p>Products I shipped, a university project, and experiments still in progress. Each write-up covers why it exists, what was hard, and what I learned.</p></PageIntro>
    {projects.length === 0 && <EmptyShelf>No projects published yet. Write-ups are on their way.</EmptyShelf>}
    <section className="grid gap-5 py-10 md:grid-cols-2">{projects.map((p, i) => <Link key={p.slug} href={`/projects/${p.slug}`} className="surface group rounded-lg p-6"><div className="flex justify-between"><Meta>{pad(i + 1)} · {p.stage}</Meta><span className="font-mono text-xs text-primary" aria-hidden="true">↗</span></div><h2 className="mt-8 font-display text-3xl font-bold group-hover:text-primary">{p.title}</h2><p className="mt-3 text-muted-foreground">{p.summary}</p><p className="mt-6 border-l border-primary pl-3 font-body italic">{p.question}</p><div className="mt-6 font-mono text-[10px] text-muted-foreground">{p.tech}</div></Link>)}</section>
    <section className="border-t border-border py-12"><Meta>NEXT ON THE BENCH</Meta><h2 className="mt-3 font-display text-2xl font-bold">Smaller experiments from my MSc</h2><p className="mt-3 max-w-2xl text-muted-foreground">Coursework prototypes, evaluation notebooks and small tools I build to understand an idea properly. The ones worth explaining will get their own write-up here.</p></section>
  </main>;
}
