import type { Metadata } from "next";
import { Suspense } from "react";
import { getNotes } from "@/lib/content";
import { PageIntro } from "@/components/site/page";
import { JsonLd } from "@/components/site/json-ld";
import { GardenList, type GardenNote } from "@/components/site/garden-list";
import { breadcrumbJsonLd, itemListJsonLd, pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Garden — essays on AI, software, running and travel",
  description: "Linked essays by Ebrahim Khalil on AI and calibration, writing better software, endurance running, altitude, coffee, and living between Bangladesh and Wales.",
  path: "/garden",
});

export default function GardenPage() {
  const notes: GardenNote[] = getNotes().map(({ slug, title, category, date, isoDate, read, excerpt, tags }) => ({ slug, title, category, date, isoDate, read, excerpt, tags }));
  return <main className="mx-auto max-w-[1200px] px-4 sm:px-6">
    <JsonLd data={[itemListJsonLd("Garden", "/garden", notes.map((n) => ({ name: n.title, path: `/garden/${n.slug}` }))), breadcrumbJsonLd([{ name: "Garden", path: "/garden" }])]} />
    <PageIntro eyebrow="GARDEN / ESSAYS & NOTES" title="Ideas I keep coming back to."><p>Short essays that link to each other. Pick a tag to follow one topic, or start anywhere and follow the links.</p></PageIntro>
    {/* Static HTML contains every note; the tag filter hydrates from ?tag= on the client. */}
    <Suspense fallback={<GardenList notes={notes} />}><GardenList notes={notes} filtered /></Suspense>
  </main>;
}
