"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AlignRight, CircleX, MoonStar, SunMedium } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { SearchItem } from "@/lib/content";
import { cn } from "@/lib/utils";
import { SearchPalette } from "./search-palette";

const links = [
  ["Garden", "/garden"],
  ["Projects", "/projects"],
  ["Travel", "/travel"],
  ["Books", "/books"],
  ["About", "/about"],
] as const;

export function SiteHeader({ searchItems }: { searchItems: SearchItem[] }) {
  const pathname = usePathname();
  const [menu, setMenu] = useState(false);
  const toggleTheme = () => {
    const next = !document.documentElement.classList.contains("dark");
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("ek-theme", next ? "dark" : "light");
    } catch {
      /* storage may be blocked */
    }
  };
  const isActive = (to: string) => pathname === to || pathname.startsWith(`${to}/`);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-[1200px] items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-3" aria-label="Ebrahim Khalil, home">
          <span className="font-mono text-[11px] tracking-[0.2em] text-primary" aria-hidden="true">
            EK
          </span>
          <span className="font-display text-sm font-bold">Ebrahim Khalil</span>
        </Link>
        <nav
          className="hidden items-center gap-5 font-mono text-[11px] text-muted-foreground lg:flex"
          aria-label="Main navigation"
        >
          {links.map(([label, to]) => (
            <Link
              key={to}
              href={to}
              aria-current={isActive(to) ? "page" : undefined}
              className={cn(
                "transition-colors hover:text-foreground",
                isActive(to) && "text-foreground",
              )}
            >
              {label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-1.5">
          <SearchPalette items={searchItems} />
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            aria-label="Toggle light or dark theme"
          >
            <SunMedium className="hidden dark:block" />
            <MoonStar className="dark:hidden" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMenu((value) => !value)}
            className="lg:hidden"
            aria-label="Toggle navigation"
            aria-expanded={menu}
            aria-controls="mobile-nav"
          >
            {menu ? <CircleX /> : <AlignRight />}
          </Button>
        </div>
      </div>
      {menu && (
        <nav
          id="mobile-nav"
          className="border-t border-border px-4 py-3 font-mono text-sm lg:hidden"
          aria-label="Mobile navigation"
        >
          <div className="mx-auto grid max-w-[1200px] grid-cols-2 gap-1">
            {links.map(([label, to]) => (
              <Link
                key={to}
                href={to}
                aria-current={isActive(to) ? "page" : undefined}
                onClick={() => setMenu(false)}
                className="rounded-md px-3 py-2 hover:bg-muted"
              >
                {label}
              </Link>
            ))}
          </div>
        </nav>
      )}
    </header>
  );
}
