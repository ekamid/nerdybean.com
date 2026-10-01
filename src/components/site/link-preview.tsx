"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState, useSyncExternalStore, type ComponentProps, type FocusEvent, type KeyboardEvent, type MouseEvent, type PointerEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { ArrowRight, ArrowUpRight, Globe, X } from "lucide-react";
import type { LinkPreview } from "@/lib/link-previews";
import { kindSwatch, openLabel, previewMeta } from "./preview-kinds";
import { Meta } from "./primitives";

const noop = () => () => {};
const useMounted = () => useSyncExternalStore(noop, () => true, () => false);
const CARD_W = 320;

/** The body of a preview: garden-style details for our own pages, page metadata for outside ones. */
export function PreviewBody({ preview }: { preview: LinkPreview }) {
  if (preview.type === "external") return <div>
    <div className="flex items-center gap-1.5"><Globe className="size-3 text-muted-foreground" aria-hidden="true" /><Meta>{previewMeta(preview)}</Meta></div>
    <p className="mt-2 font-display text-base font-bold leading-snug">{preview.title ?? preview.host}</p>
    {preview.description && <p className="mt-1.5 line-clamp-3 text-[13px] leading-relaxed text-muted-foreground">{preview.description}</p>}
    <p className="mt-2 truncate font-mono text-[10px] text-muted-foreground/80">{preview.href.replace(/^https?:\/\//, "")}</p>
  </div>;
  return <div>
    <div className="flex items-center gap-1.5"><span className="size-2 shrink-0 rounded-full" style={kindSwatch(preview.kind)} aria-hidden="true" /><Meta>{previewMeta(preview)}</Meta></div>
    <p className="mt-2 font-display text-base font-bold leading-snug">{preview.title}</p>
    {preview.excerpt && <p className="mt-1.5 line-clamp-3 text-[13px] leading-relaxed text-muted-foreground">{preview.excerpt}</p>}
    {(preview.tags?.length || preview.links) && <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[10px] text-muted-foreground">
      {preview.links && <span className="text-primary">links to {preview.links.out} · linked from {preview.links.in}</span>}
      {preview.tags?.slice(0, 4).map((t) => <span key={t}>#{t}</span>)}
    </div>}
  </div>;
}

type Props = Omit<ComponentProps<"a">, "href"> & { href: string; preview?: LinkPreview | undefined; scroll?: boolean; children: ReactNode };

/**
 * A link that previews where it goes: hovering (or keyboard focus) shows a floating card; on touch
 * screens the first tap opens a sheet from the bottom with the details and an explicit open button.
 * Without a preview it is a plain link. Outside links open in a new tab.
 */
export function PreviewLink({ href, preview, scroll, children, ...rest }: Props) {
  const ref = useRef<HTMLAnchorElement>(null);
  const [mode, setMode] = useState<"float" | "sheet" | null>(null);
  const [pos, setPos] = useState<{ left: number; top?: number; bottom?: number }>({ left: 0 });
  const timer = useRef<number | null>(null);
  const pointer = useRef<string>("mouse");
  const id = useId();
  const mounted = useMounted();
  const external = /^https?:\/\//i.test(href);

  const clear = () => { if (timer.current !== null) { clearTimeout(timer.current); timer.current = null; } };
  const place = () => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    const left = Math.min(Math.max(8, r.left), window.innerWidth - CARD_W - 8);
    setPos(window.innerHeight - r.bottom > 260 ? { left, top: r.bottom + 8 } : { left, bottom: window.innerHeight - r.top + 8 });
  };
  const showSoon = () => { clear(); timer.current = window.setTimeout(() => { place(); setMode("float"); }, 220); };
  const hideSoon = () => { clear(); timer.current = window.setTimeout(() => setMode((m) => (m === "float" ? null : m)), 140); };
  const close = () => { clear(); setMode(null); };

  useEffect(() => clear, []);
  useEffect(() => {
    if (!mode) return;
    const onKey = (e: globalThis.KeyboardEvent) => { if (e.key === "Escape") setMode(null); };
    // A floating card is pinned to where the link was; once the page moves, drop it.
    const onScroll = () => setMode((m) => (m === "float" ? null : m));
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => { document.removeEventListener("keydown", onKey); window.removeEventListener("scroll", onScroll); };
  }, [mode]);

  const handlers = preview ? {
    onPointerDown: (e: PointerEvent<HTMLAnchorElement>) => { pointer.current = e.pointerType; },
    onPointerEnter: (e: PointerEvent<HTMLAnchorElement>) => { if (e.pointerType === "mouse") showSoon(); },
    onPointerLeave: (e: PointerEvent<HTMLAnchorElement>) => { if (e.pointerType === "mouse") hideSoon(); },
    onKeyDown: (e: KeyboardEvent<HTMLAnchorElement>) => { pointer.current = "keyboard"; rest.onKeyDown?.(e); },
    onFocus: (e: FocusEvent<HTMLAnchorElement>) => { if (e.currentTarget.matches(":focus-visible")) { place(); setMode("float"); } },
    onBlur: () => hideSoon(),
    onClick: (e: MouseEvent<HTMLAnchorElement>) => {
      // On touch, the first tap shows the details; the sheet's button does the navigating.
      if ((pointer.current === "touch" || pointer.current === "pen") && !(e.metaKey || e.ctrlKey || e.shiftKey || e.altKey)) {
        e.preventDefault();
        clear();
        setMode("sheet");
        return;
      }
      setMode(null);
      rest.onClick?.(e);
    },
    "aria-describedby": mode === "float" ? id : undefined,
  } : {};

  const link = external
    ? <a ref={ref} href={href} target="_blank" rel="noopener noreferrer" {...rest} {...handlers}>{children}</a>
    : <Link ref={ref} href={href} {...(scroll !== undefined && { scroll })} {...rest} {...handlers}>{children}</Link>;
  if (!preview || !mounted) return link;

  const action = external
    ? <a href={href} target="_blank" rel="noopener noreferrer" onClick={close} className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 font-mono text-[11px] text-primary-foreground">{openLabel(preview)}<ArrowUpRight className="size-3" aria-hidden="true" /></a>
    : <Link href={href} onClick={close} className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 font-mono text-[11px] text-primary-foreground">{openLabel(preview)}<ArrowRight className="size-3" aria-hidden="true" /></Link>;

  return <>
    {link}
    {mode === "float" && createPortal(
      <div
        id={id}
        role="tooltip"
        onPointerEnter={clear}
        onPointerLeave={hideSoon}
        style={{ left: pos.left, top: pos.top, bottom: pos.bottom, width: CARD_W }}
        className="fixed z-50 rounded-lg border border-border bg-background p-4 text-left shadow-xl motion-safe:animate-[preview-in_.16s_ease-out]"
      >
        <PreviewBody preview={preview} />
      </div>,
      document.body,
    )}
    {mode === "sheet" && createPortal(<>
      <div aria-hidden="true" onClick={close} className="fixed inset-0 z-50 bg-background/40 backdrop-blur-[2px]" />
      <div role="dialog" aria-modal="true" aria-label={preview.type === "external" ? preview.title ?? preview.host : preview.title} className="fixed inset-x-0 bottom-0 z-50 rounded-t-xl border-t border-border bg-background px-5 pt-3 pb-[max(1.25rem,env(safe-area-inset-bottom))] text-left shadow-2xl motion-safe:animate-[sheet-in_.28s_cubic-bezier(.32,.72,0,1)]">
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-border" aria-hidden="true" />
        <PreviewBody preview={preview} />
        <div className="mt-4 flex items-center justify-between">
          {action}
          <button type="button" onClick={close} aria-label="Close preview" className="grid size-9 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"><X className="size-4" /></button>
        </div>
      </div>
    </>, document.body)}
  </>;
}
