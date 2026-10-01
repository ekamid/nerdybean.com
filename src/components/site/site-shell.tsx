import type { ReactNode } from "react";
import { getSearchItems } from "@/lib/content";
import { site } from "@/lib/site";
import { SiteHeader } from "./site-header";

export function SiteShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground font-body antialiased selection:bg-primary/20">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-3 focus:py-2 focus:text-primary-foreground"
      >
        Skip to content
      </a>
      <SiteHeader searchItems={getSearchItems()} />
      <div id="main">{children}</div>
      <footer className="mt-12 border-t border-border">
        <div className="mx-auto flex max-w-[1200px] flex-col gap-4 px-6 py-10 md:flex-row md:items-center md:justify-between">
          <span className="font-mono text-[11px] text-muted-foreground">
            © {new Date().getFullYear()} Ebrahim Khalil
          </span>
          <div className="flex items-center gap-4 font-mono text-[11px] text-muted-foreground">
            <a
              href={site.social.linkedin}
              target="_blank"
              rel="me noopener noreferrer"
              className="hover:text-foreground"
            >
              LinkedIn
            </a>
            <a href="/rss.xml" className="hover:text-foreground">
              RSS
            </a>
            <a href="/sitemap.xml" className="hover:text-foreground">
              Sitemap
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
