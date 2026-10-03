import type { Metadata } from "next";
import Link from "next/link";
import { Meta } from "@/components/site/page";
import { JsonLd } from "@/components/site/json-ld";
import { breadcrumbJsonLd, pageMetadata, personId } from "@/lib/seo";
import { absoluteUrl } from "@/lib/site";

export const metadata: Metadata = pageMetadata({
  title: "About Ebrahim Khalil — software developer & MSc AI student in Cardiff",
  description: "Ebrahim Khalil is a software developer with 3+ years building web and mobile apps, now studying for an MSc in Artificial Intelligence in Cardiff, Wales.",
  path: "/about",
  type: "profile",
});

const pieces = [
  { href: "/garden", label: "Garden", note: "where I think out loud" },
  { href: "/projects", label: "Projects", note: "what I’ve built, and what I’ve broken" },
  { href: "/books", label: "Books", note: "what I’m reading, and what stayed with me" },
  { href: "/coffee", label: "Coffee", note: "how I brew, and where coffee comes from" },
  { href: "/travel", label: "Travel", note: "places I’ve wandered, on foot when I can" },
];

export default function AboutPage() {
  return <main className="mx-auto max-w-[1200px] px-4 sm:px-6">
    <JsonLd data={[{ "@type": "ProfilePage", url: absoluteUrl("/about"), mainEntity: { "@id": personId } }, breadcrumbJsonLd([{ name: "About", path: "/about" }])]} />
    <section className="grid grid-cols-12 items-end gap-8 border-b border-border pb-12 pt-14 sm:pt-20">
      <div className="col-span-12 rise-in lg:col-span-8">
        <h1 className="text-balance font-display text-[clamp(2.4rem,6vw,4.25rem)] font-extrabold leading-[.95] tracking-tight">
          About me? <span className="text-primary">Still working on it.</span>
        </h1>
        <p className="mt-7 max-w-[48ch] text-[17px] leading-relaxed text-muted-foreground">
          I’m Ebrahim. I’m not nerdy enough to have figured myself out yet, so there isn’t much to
          say here. Whatever I learn along the way ends up somewhere on this site.
        </p>
      </div>
      <div className="col-span-12 rise-in lg:col-span-4 [animation-delay:120ms]">
        <div className="surface rounded-lg p-5 font-mono text-xs">
          <Meta>LATELY</Meta>
          <ul className="mt-3 space-y-2">
            {["Thinking about what’s next", "Figuring things out", "Wondering about most things"].map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
        </div>
      </div>
    </section>
    <section className="py-12">
      <Meta>FIND ME IN PIECES</Meta>
      <ul className="mt-6 divide-y divide-border border-y border-border">
        {pieces.map((p) => (
          <li key={p.href}>
            <Link href={p.href} className="group flex items-baseline justify-between gap-6 py-5">
              <span className="font-display text-2xl font-bold transition-colors group-hover:text-primary">{p.label}</span>
              <span className="flex items-baseline gap-3 text-right font-mono text-xs text-muted-foreground">
                {p.note}
                <span className="text-primary transition-transform group-hover:translate-x-1" aria-hidden="true">→</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  </main>;
}
