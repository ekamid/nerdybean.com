import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EntryForm } from "@/components/admin/entry-form";
import { emptyEntry, getCollection } from "@/lib/admin/collections";
import { getEntry } from "@/lib/admin/entries";
import { requireAdmin } from "@/lib/admin/session";
import { storageMode } from "@/lib/admin/storage";

export const metadata: Metadata = { title: "Admin", robots: { index: false, follow: false } };

type Props = { params: Promise<{ collection: string; slug: string }>; searchParams: Promise<{ saved?: string }> };

/** /admin/<collection>/new starts a new entry; /admin/<collection>/<slug> edits one. */
export default async function EditEntryPage({ params, searchParams }: Props) {
  await requireAdmin();
  const { collection, slug } = await params;
  const { saved } = await searchParams;
  const c = getCollection(collection);
  if (!c) notFound();
  const isNew = slug === "new";
  const entry = isNew ? { slug: "", status: "draft" as const, data: emptyEntry(c), body: "" } : await getEntry(c, slug);
  if (!entry) notFound();
  // `key` resets the form after each save, so it shows exactly what was written.
  return <EntryForm key={saved ?? "start"} collection={c.name} isNew={isNew} entry={entry} justSaved={Boolean(saved)} storageMode={storageMode} />;
}
