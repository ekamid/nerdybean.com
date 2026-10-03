import type { Metadata } from "next";
import Link from "next/link";
import { LogIn, LogOut, Plus } from "lucide-react";
import { EmptyShelf, Meta, PageIntro } from "@/components/site/page";
import { StatusBadge } from "@/components/admin/status-badge";
import { buttonVariants } from "@/components/ui/button";
import { collections } from "@/lib/admin/collections";
import { listEntries } from "@/lib/admin/entries";
import { currentAdmin } from "@/lib/admin/session";
import { storageMode } from "@/lib/admin/storage";
import { formatIsoDate } from "@/lib/content";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Admin",
  description: "Write, edit and publish the garden.",
  path: "/admin",
  noIndex: true,
});

export default async function AdminPage() {
  const login = await currentAdmin();
  if (!login) {
    return <main className="mx-auto max-w-[1200px] px-4 sm:px-6">
      <PageIntro eyebrow="ADMIN / PRIVATE" title="The potting shed."><p>Where the garden gets written. Only the owner of this site can come in.</p></PageIntro>
      <div className="py-10">
        {/* A plain link: /admin/login is a route handler that redirects to GitHub, not a page. */}
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a href="/admin/login" className={buttonVariants()}><LogIn /> Sign in with GitHub</a></div>
    </main>;
  }

  const shelves = await Promise.all(collections.map(async (c) => ({ c, entries: await listEntries(c) })));
  return <main className="mx-auto max-w-[1200px] px-4 pb-20 sm:px-6">
    <PageIntro
      eyebrow={`ADMIN / SIGNED IN AS @${login.toUpperCase()}`}
      title="The potting shed."
      aside={<form action="/admin/logout" method="post" className="lg:text-right"><button className={buttonVariants({ variant: "outline", size: "sm" })}><LogOut /> Sign out</button></form>}
    >
      <p>{storageMode === "github"
        ? "Saving commits to GitHub; the site redeploys in a minute or two. Drafts never appear on the live site."
        : "Development: saving writes files in src/content on this computer. Commit them with git to publish."}</p>
    </PageIntro>
    {shelves.map(({ c, entries }) => <section key={c.name} className="border-b border-border py-10">
      <div className="mb-4 flex items-baseline justify-between gap-4">
        <h2 className="font-display text-xl font-bold">{c.label} <span className="font-mono text-xs font-normal text-muted-foreground">{entries.length}</span></h2>
        <Link href={`/admin/${c.name}/new`} className={buttonVariants({ variant: "outline", size: "sm" })}><Plus /> New</Link>
      </div>
      {entries.length === 0 && <EmptyShelf>Nothing here yet.</EmptyShelf>}
      <ul>{entries.map((e) => {
        const date = typeof e.data["date"] === "string" ? formatIsoDate(e.data["date"]) : null;
        return <li key={e.slug} className="border-t border-border first:border-t-0">
          <Link href={`/admin/${c.name}/${e.slug}`} className="group flex items-baseline justify-between gap-4 py-3">
            <span className="min-w-0 truncate font-display font-semibold group-hover:text-primary">{String(e.data[c.titleField] || e.slug)}</span>
            <span className="flex shrink-0 items-center gap-3"><Meta>{date ?? e.slug}</Meta><StatusBadge status={e.status} /></span>
          </Link>
        </li>;
      })}</ul>
    </section>)}
  </main>;
}
