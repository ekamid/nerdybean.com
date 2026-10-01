import type { ReactNode } from "react";
import type { LinkPreview } from "@/lib/link-previews";
import { PreviewLink } from "./link-preview";

export function Meta({ children }: { children: ReactNode }) { return <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{children}</div>; }

/** Topic chips; with `previews`, hovering (or tapping on touch) one shows what the topic holds. */
export function Tags({ items, previews }: { items: string[]; previews?: Record<string, LinkPreview> }) {
  const href = (item: string) => `/garden?tag=${encodeURIComponent(item)}`;
  return <ul className="flex flex-wrap gap-2" aria-label="Tags">{items.map((item) => <li key={item}><PreviewLink href={href(item)} preview={previews?.[href(item)]} className="block rounded-full border border-border px-2 py-0.5 font-mono text-[10px] text-muted-foreground hover:border-primary/40 hover:text-foreground">{item}</PreviewLink></li>)}</ul>;
}
