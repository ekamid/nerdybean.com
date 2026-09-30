import type { Metadata } from "next";
import { Meta, PageIntro } from "@/components/site/page";
import { JsonLd } from "@/components/site/json-ld";
import { breadcrumbJsonLd, pageMetadata, personId } from "@/lib/seo";
import { absoluteUrl } from "@/lib/site";

export const metadata: Metadata = pageMetadata({
  title: "About Ebrahim Khalil — software developer & MSc AI student in Cardiff",
  description: "Ebrahim Khalil is a software developer with 3+ years building web and mobile apps, now studying for an MSc in Artificial Intelligence in Cardiff, Wales.",
  path: "/about",
  type: "profile",
});

const interests = ["artificial intelligence", "machine learning", "software engineering", "mobile applications", "web applications", "backend systems", "APIs", "developer tooling", "automation", "human–computer interaction"];

export default function AboutPage() {
  return <main className="mx-auto max-w-[1200px] px-4 sm:px-6">
    <JsonLd data={[{ "@type": "ProfilePage", url: absoluteUrl("/about"), mainEntity: { "@id": personId } }, breadcrumbJsonLd([{ name: "About", path: "/about" }])]} />
    <PageIntro eyebrow="ABOUT / THE LONGER VERSION" title="Developer, student, slow runner."><p>I’m Ebrahim Khalil. I build software, I’m studying artificial intelligence in Cardiff, and I spend my free time on long runs, mountain trails and books.</p></PageIntro>
    <div className="grid grid-cols-12 gap-8 py-12">
      <aside className="col-span-12 lg:col-span-3"><div className="surface sticky top-24 rounded-lg p-5"><Meta>COORDINATES</Meta><p className="mt-3 font-mono text-xs">51.4816° N<br />3.1791° W</p><div className="mt-6 border-t border-dashed border-border pt-4"><Meta>STATUS</Meta><p className="mt-2 text-sm">studying AI, open to interesting problems, usually training for something</p></div></div></aside>
      <article className="col-span-12 space-y-12 text-lg leading-8 lg:col-span-9">
        <section><Meta>BACKGROUND</Meta><h2 className="mt-3 font-display text-3xl font-bold">From shipping apps to studying AI</h2><p className="mt-4">My first degree was in Computer Science and Engineering. After that I spent more than three years building web and mobile applications: backend integrations, performance work, reliability, user experience, and supporting the people who used what we shipped, often with distributed, remote teams.</p><p className="mt-4">That work left me with a question I wanted to study properly: how do we build intelligent systems people can actually trust? That’s why I moved to Wales for an MSc in Artificial Intelligence.</p></section>
        <section><Meta>ENGINEERING</Meta><h2 className="mt-3 font-display text-3xl font-bold">What I care about in software</h2><p className="mt-4">Systems that fail gracefully, interfaces that respect people’s time, and AI that’s honest about what it doesn’t know. I like the unglamorous parts: error states, offline behaviour, and working out why something broke.</p><ul className="mt-6 flex flex-wrap gap-2" aria-label="Interests">{interests.map((i) => <li className="rounded-full border border-border px-3 py-1 font-mono text-xs text-muted-foreground" key={i}>{i}</li>)}</ul></section>
        <section><Meta>BEYOND CODE</Meta><h2 className="mt-3 font-display text-3xl font-bold">Away from the keyboard</h2><p className="mt-4">I’ve finished an Ironman 70.3 and trekked in the Himalayas, and most weeks I run along the Welsh coast in whatever weather turns up. I read slowly and mostly literary fiction, and I brew coffee as if it were a lab experiment.</p><p className="mt-4">None of that is separate from the engineering. Pacing, patience and knowing when to turn back are as useful at a desk as on a mountain.</p></section>
        <section className="surface rounded-lg p-6"><Meta>HOW I TRY TO WORK</Meta><blockquote className="mt-5 font-display text-2xl font-bold leading-snug">Start before conditions are perfect, pace yourself for the whole distance, and be honest about how sure you are.</blockquote><p className="mt-4 text-sm text-muted-foreground">I don’t always manage it. Writing this garden is how I keep track.</p></section>
      </article>
    </div>
  </main>;
}
