import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import mountain from "@/assets/abc.jpg";
import { getTravels } from "@/lib/content";
import { EmptyShelf, Meta, pad, PageIntro } from "@/components/site/page";
import { JsonLd } from "@/components/site/json-ld";
import { breadcrumbJsonLd, pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Travel & mountains — Bangladesh, Wales, Scotland, Himalayas",
  description:
    "Ebrahim Khalil on Bangladesh, Wales, Scotland and the Himalayas: altitude, rain, long runs and the Ironman 70.3, and what each place taught him.",
  path: "/travel",
});

export default function TravelPage() {
  const travels = getTravels();
  return (
    <main className="mx-auto max-w-[1200px] px-4 sm:px-6">
      <JsonLd data={breadcrumbJsonLd([{ name: "Travel", path: "/travel" }])} />
      <PageIntro eyebrow="TRAVEL / PLACES & ROUTES" title="Places that changed how I think.">
        <p>
          Where I grew up, where I live now, and a few places I walked a long way to reach, with one
          lesson from each.
        </p>
      </PageIntro>
      <figure className="relative mt-10 overflow-hidden rounded-lg">
        <Image
          src={mountain}
          alt="A hiker facing a cloud-wrapped Himalayan ridge"
          priority
          placeholder="blur"
          sizes="(min-width: 1200px) 1152px, 100vw"
          className="h-[65vh] min-h-[480px] w-full object-cover"
        />
        <figcaption className="absolute inset-x-0 bottom-0 bg-background/85 p-4 font-mono text-[10px] backdrop-blur-md">
          Annapurna Base Capmp, Nepal. 4,130m / 13,550ft. February 2025
        </figcaption>
      </figure>
      {travels.length === 0 && <EmptyShelf>No places published yet.</EmptyShelf>}
      <section className="py-12" aria-label="Places">
        {travels.map((t, i) => (
          <article key={t.place} className="grid grid-cols-12 gap-5 border-t border-border py-8">
            <div className="col-span-12 md:col-span-2">
              <Meta>
                {pad(i + 1)} / {t.coordinates}
              </Meta>
            </div>
            <div className="col-span-12 md:col-span-4">
              <h2 className="font-display text-2xl font-bold">{t.place}</h2>
              <p className="mt-2 font-mono text-xs text-muted-foreground">{t.detail}</p>
            </div>
            <blockquote className="col-span-12 text-lg italic text-muted-foreground md:col-span-6">
              “{t.thought}”
            </blockquote>
          </article>
        ))}
      </section>
    </main>
  );
}
