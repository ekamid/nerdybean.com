import Link from "next/link";
import type { ReactNode } from "react";

export function Meta({ children }: { children: ReactNode }) { return <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{children}</div>; }

export function Tags({ items }: { items: string[] }) {
  return <ul className="flex flex-wrap gap-2" aria-label="Tags">{items.map((item) => <li key={item}><Link href={`/garden?tag=${encodeURIComponent(item)}`} className="block rounded-full border border-border px-2 py-0.5 font-mono text-[10px] text-muted-foreground hover:border-primary/40 hover:text-foreground">{item}</Link></li>)}</ul>;
}
