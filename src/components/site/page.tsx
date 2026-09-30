import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Meta } from "./primitives";

export { Meta, Tags } from "./primitives";

export const pad = (n: number) => String(n).padStart(2, "0");

export function PageIntro({ eyebrow, title, children, aside }: { eyebrow: string; title: string; children: ReactNode; aside?: ReactNode }) {
  return <header className="grid grid-cols-12 gap-6 border-b border-border pb-10 pt-14 sm:pt-20">
    <div className="col-span-12 lg:col-span-8"><p className="mb-4 font-mono text-[11px] tracking-[0.24em] text-primary">{eyebrow}</p><h1 className="max-w-[18ch] text-balance font-display text-4xl font-extrabold leading-[1.02] sm:text-6xl">{title}</h1><div className="mt-6 max-w-[58ch] text-lg leading-relaxed text-muted-foreground">{children}</div></div>
    {aside && <aside className="col-span-12 self-end lg:col-span-4">{aside}</aside>}
  </header>;
}

export function SectionTitle({ children, link, label }: { children: ReactNode; link?: string; label?: string }) {
  return <div className="mb-6 flex items-baseline justify-between"><h2 className="font-display text-xl font-bold">{children}</h2>{link && <Link href={link} className="font-mono text-[11px] text-primary hover:underline">{label ?? "explore →"}</Link>}</div>;
}

export function EmptyShelf({ children }: { children: ReactNode }) {
  return <p className="surface mt-10 rounded-lg p-6 font-serif italic text-muted-foreground">{children}</p>;
}

export function SmartLink({ href, className, children }: { href: string; className?: string; children: ReactNode }) {
  if (href.startsWith("/")) return <Link href={href} className={className}>{children}</Link>;
  return <a href={href} className={className} target="_blank" rel="noopener noreferrer">{children}</a>;
}

export function Backlinks({ links }: { links: { label: string; href?: string }[] }) {
  const valid = links.filter((link): link is { label: string; href: string } => Boolean(link.href));
  if (!valid.length) return null;
  return <aside className="mt-12 border-t border-dashed border-border pt-6"><Meta>RELATED / READ NEXT</Meta><nav aria-label="Related" className="mt-4 flex flex-wrap gap-3">{valid.map((link) => <SmartLink key={link.href} href={link.href} className="font-mono text-xs text-primary hover:underline">↗ {link.label}</SmartLink>)}</nav></aside>;
}

export function Cover({ image, imageAlt, imageCaption, priority = false }: { image?: string | undefined; imageAlt?: string | undefined; imageCaption?: string | undefined; priority?: boolean }) {
  if (!image) return null;
  return <figure className="mt-8">
    <Image src={image} alt={imageAlt ?? ""} width={1600} height={912} priority={priority} sizes="(min-width: 896px) 832px, 100vw" className="aspect-[16/9] w-full rounded-lg border border-border object-cover" />
    {imageCaption && <figcaption className="mt-2 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{imageCaption}</figcaption>}
  </figure>;
}

/** Freeform MDX body (Markdown below the frontmatter). Rendered on the server; ships no JS. */
export function Body({ source, className = "mt-10" }: { source: string; className?: string }) {
  if (!source.trim()) return null;
  return <div className={`editor-prose ${className}`}><ReactMarkdown remarkPlugins={[remarkGfm]}>{source}</ReactMarkdown></div>;
}
