"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Compass, Hammer, LibraryBig, ScanSearch, Signpost, Sprout } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import type { SearchItem } from "@/lib/content";

const icons = { Notes: Sprout, Projects: Hammer, Books: LibraryBig, Travel: Compass, Pages: Signpost };

export function SearchPalette({ items }: { items: SearchItem[] }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault(); setOpen((value) => !value);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  const go = (item: SearchItem) => { setOpen(false); router.push(item.href); };
  const groups = [...new Set(items.map((item) => item.group))];
  return <>
    <Button variant="outline" size="sm" onClick={() => setOpen(true)} aria-label="Search the garden" className="font-mono text-[11px] text-muted-foreground shadow-none">
      <ScanSearch aria-hidden="true" /><span className="hidden sm:inline">Search</span><kbd className="rounded bg-muted px-1.5 py-0.5 text-[10px]">⌘K</kbd>
    </Button>
    <CommandDialog open={open} onOpenChange={setOpen} title="Search the garden" description="Search notes, places, projects, and books">
      <CommandInput placeholder="Search notes, places, projects, books…" />
      <CommandList className="max-h-[420px]">
        <CommandEmpty>No matches. Try a topic like “running” or “ai”.</CommandEmpty>
        {groups.map((group) => <CommandGroup heading={group} key={group}>
          {items.filter((item) => item.group === group).map((item) => {
            const Icon = icons[item.group] ?? Signpost;
            return <CommandItem key={`${group}-${item.title}`} value={`${item.title} ${item.tags.join(" ")}`} onSelect={() => go(item)}>
              <Icon /><div><div>{item.title}</div><div className="line-clamp-1 font-body text-xs text-muted-foreground">{item.description}</div></div>
            </CommandItem>;
          })}
        </CommandGroup>)}
      </CommandList>
    </CommandDialog>
  </>;
}
