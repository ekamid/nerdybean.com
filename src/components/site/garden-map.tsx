"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type KeyboardEvent, type MouseEvent, type PointerEvent } from "react";
import { createPortal } from "react-dom";
import { ArrowRight, ArrowUpRight, LocateFixed, Maximize2, Minimize2, Minus, Plus, Scan, Search, Shuffle, X } from "lucide-react";
import { tick, type SimNode } from "@/lib/garden-layout";
import type { GardenNode, GardenNodeKind, PlacedGardenGraph } from "@/lib/garden-graph";
import { Meta } from "./primitives";

const kinds: Record<GardenNodeKind, { label: string; fill: string; stroke?: string }> = {
  note: { label: "Notes", fill: "var(--primary)" },
  book: { label: "Books", fill: "var(--chart-1)" },
  project: { label: "Projects", fill: "var(--chart-3)" },
  page: { label: "Pages", fill: "var(--muted-foreground)" },
  tag: { label: "Topics", fill: "var(--card)", stroke: "var(--muted-foreground)" },
};
const kindOrder = Object.keys(kinds) as GardenNodeKind[];
const openLabel: Record<GardenNodeKind, string> = { note: "Read the note", book: "See the book", project: "See the project", page: "Open the page", tag: "Browse the topic" };

type Point = { x: number; y: number };
/** Camera: screen = world × k + (x, y), in the SVG's viewBox units. */
type Camera = { x: number; y: number; k: number };
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 5;
const LABEL_PX = 12;
const identity: Camera = { x: 0, y: 0, k: 1 };
const clampZoom = (k: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, k));

const snapshot = (nodes: Pick<SimNode, "id" | "x" | "y">[]) => Object.fromEntries(nodes.map((n) => [n.id, { x: n.x, y: n.y }])) as Record<string, Point>;
const shorten = (text: string, max: number) => (text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text);
const reducedMotion = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const swatch = (k: GardenNodeKind) => ({ background: kinds[k].fill, boxShadow: kinds[k].stroke ? `inset 0 0 0 1px ${kinds[k].stroke}` : undefined });

/** What we know about one node, with ways onward: open it, centre it, or hop to a neighbour. */
function NodeDetails({ node, linked, depth, onDepth, onCentre, onChoose }: {
  node: GardenNode;
  linked: GardenNode[];
  depth: 1 | 2;
  onDepth: (d: 1 | 2) => void;
  onCentre: (id: string) => void;
  onChoose: (id: string) => void;
}) {
  return <div>
    <Meta>{node.meta}</Meta>
    <h2 className="mt-2 font-display text-lg font-bold leading-snug">{node.label}</h2>
    <div className="mt-3 flex flex-wrap items-center gap-3">
      <Link href={node.href} className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 font-mono text-[11px] text-primary-foreground transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
        {openLabel[node.kind]}<ArrowRight className="size-3" aria-hidden="true" />
      </Link>
      <button type="button" onClick={() => onCentre(node.id)} className="flex items-center gap-1 font-mono text-[11px] text-muted-foreground hover:text-foreground"><LocateFixed className="size-3" aria-hidden="true" />centre</button>
    </div>
    <div className="mt-5 flex items-center justify-between">
      <Meta>{linked.length} connection{linked.length === 1 ? "" : "s"}</Meta>
      <div className="flex rounded-full border border-border p-0.5 font-mono text-[10px]" role="group" aria-label="How far to trace">
        {([1, 2] as const).map((d) => <button key={d} type="button" aria-pressed={depth === d} onClick={() => onDepth(d)} className={`rounded-full px-2 py-0.5 ${depth === d ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>{d} step{d === 1 ? "" : "s"}</button>)}
      </div>
    </div>
    <ul className="mt-3 space-y-1">
      {linked.map((n) => <li key={n.id} className="group flex items-start gap-2 rounded px-1 py-1 text-[13px] hover:bg-muted/60">
        <span className="mt-1.5 size-2 shrink-0 rounded-full" style={swatch(n.kind)} aria-hidden="true" />
        <button type="button" className="flex-1 text-left text-muted-foreground hover:text-foreground" onClick={() => onChoose(n.id)} title="Show on the map">{n.label}</button>
        <Link href={n.href} aria-label={`${openLabel[n.kind]}: ${n.label}`} title={openLabel[n.kind]} className="mt-0.5 shrink-0 text-muted-foreground/60 transition-colors hover:text-primary group-hover:text-muted-foreground">
          <ArrowUpRight className="size-3.5" aria-hidden="true" />
        </Link>
      </li>)}
    </ul>
  </div>;
}

const noop = () => () => {};
/** True once hydrated on the client; portals need `document`. */
const useMounted = () => useSyncExternalStore(noop, () => true, () => false);
/** Matches Tailwind's `lg` breakpoint, where /garden has room for the sidebar. */
const useWide = () => useSyncExternalStore(
  (cb) => { const mq = window.matchMedia("(min-width: 1024px)"); mq.addEventListener("change", cb); return () => mq.removeEventListener("change", cb); },
  () => window.matchMedia("(min-width: 1024px)").matches,
  () => true,
);

type Box = { x1: number; y1: number; x2: number; y2: number };
const overlaps = (a: Box, b: Box) => a.x1 < b.x2 && b.x1 < a.x2 && a.y1 < b.y2 && b.y1 < a.y2;

/**
 * Greedy label placement: in priority order, put each label on whichever side of its dot is free of
 * other labels and dots. Labels that fit nowhere are skipped (they still appear on hover). With
 * `pinFirst`, the first candidate (the hovered node) is always placed, in full. Returns node id → text
 * for that node and whether it sits left of the dot.
 */
function placeLabels(candidates: GardenNode[], all: GardenNode[], positions: Record<string, Point>, width: number, fontSize: number, maxChars: number, pinFirst: boolean) {
  const dots: Box[] = all.flatMap((n) => { const p = positions[n.id]; return p ? [{ x1: p.x - n.r, y1: p.y - n.r, x2: p.x + n.r, y2: p.y + n.r }] : []; });
  const placed: Box[] = [];
  const gap = fontSize * 0.4;
  const result = new Map<string, { text: string; flip: boolean }>();
  candidates.forEach((node, i) => {
    const p = positions[node.id];
    if (!p) return;
    const pinned = pinFirst && i === 0;
    const text = pinned ? node.label : shorten(node.label, maxChars);
    const w = text.length * fontSize * 0.56;
    const preferLeft = p.x > width * 0.62;
    for (const flip of [preferLeft, !preferLeft]) {
      const x1 = flip ? p.x - node.r - gap - w : p.x + node.r + gap;
      const box = { x1, y1: p.y - fontSize * 0.45, x2: x1 + w, y2: p.y + fontSize * 0.55 };
      const self = { x1: p.x - node.r, y1: p.y - node.r, x2: p.x + node.r, y2: p.y + node.r };
      const free = box.x1 >= 0 && box.x2 <= width && !placed.some((b) => overlaps(b, box)) && !dots.some((d) => !overlaps(d, self) && overlaps(d, box));
      if (free || (pinned && flip !== preferLeft)) {
        placed.push(box);
        result.set(node.id, { text, flip: free ? flip : preferLeft });
        return;
      }
    }
  });
  return result;
}

/**
 * Interactive map of how the garden links together. Positions arrive pre-computed from the server;
 * the client adds tracing (hover/focus lights up a node's neighbours), a pannable/zoomable camera,
 * pinning, and dragging nodes while the layout re-settles around them. The full variant adds a
 * toolbar and sidebar with search, filtering by kind and fullscreen. Clicking a node shows its
 * details in the sidebar on wide screens, and in a drawer sliding in from the right otherwise
 * (always, for the compact variant).
 */
export function GardenMap({ graph, variant = "full" }: { graph: PlacedGardenGraph; variant?: "full" | "compact" }) {
  const full = variant === "full";
  const router = useRouter();
  const frameRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const worldRef = useRef<SVGGElement>(null);
  const sim = useRef<SimNode[]>(graph.nodes.map(({ id, x, y, r }) => ({ id, x, y, r, vx: 0, vy: 0 })));
  const [positions, setPositions] = useState(() => snapshot(graph.nodes));
  const [hovered, setHovered] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [hidden, setHidden] = useState<Set<GardenNodeKind>>(() => new Set());
  const [depth, setDepth] = useState<1 | 2>(1);
  const [query, setQuery] = useState("");
  const [camera, setCamera] = useState<Camera>(identity);
  const [pixelRatio, setPixelRatio] = useState(1);
  const [fullscreenHost, setFullscreenHost] = useState<HTMLElement | null>(null);
  const fullscreen = fullscreenHost !== null;
  const [panning, setPanning] = useState(false);
  const [hint, setHint] = useState(false);
  const cam = useRef<Camera>(identity);
  const drag = useRef<{ id: string; start: Point; moved: boolean } | null>(null);
  const pointers = useRef(new Map<number, Point>());
  const gesture = useRef<{ start: Point; camera: Camera; moved: boolean; pinch?: { dist: number; mid: Point } } | null>(null);
  const suppressClick = useRef(false);
  const frame = useRef<number | null>(null);
  const flight = useRef<number | null>(null);
  const hintTimer = useRef<number | null>(null);
  const alpha = useRef(0);
  const drawerRef = useRef<HTMLDivElement>(null);
  const mounted = useMounted();
  const wide = useWide();

  const byId = useMemo(() => new Map(graph.nodes.map((n) => [n.id, n])), [graph.nodes]);
  const neighbours = useMemo(() => {
    const map = new Map<string, Set<string>>(graph.nodes.map((n) => [n.id, new Set()]));
    for (const e of graph.edges) { map.get(e.source)?.add(e.target); map.get(e.target)?.add(e.source); }
    return map;
  }, [graph]);

  const visible = graph.nodes.filter((n) => !hidden.has(n.kind));
  const visibleIds = new Set(visible.map((n) => n.id));
  const edges = graph.edges.filter((e) => visibleIds.has(e.source) && visibleIds.has(e.target));
  const activeId = hovered ?? selected;
  const active = activeId && visibleIds.has(activeId) ? activeId : null;
  // Nodes within `depth` hops of the active one; the second ring is drawn a little fainter.
  const ring = new Map<string, number>();
  if (active) {
    ring.set(active, 0);
    let frontier = [active];
    for (let d = 1; d <= depth; d++) {
      const next: string[] = [];
      for (const id of frontier) for (const n of neighbours.get(id) ?? []) if (visibleIds.has(n) && !ring.has(n)) { ring.set(n, d); next.push(n); }
      frontier = next;
    }
  }
  const lit = active ? ring : null;
  const noteCount = graph.nodes.filter((n) => n.kind === "note").length;

  // The drawer follows the pinned node, not the hovered one. It keeps showing the last node while
  // it slides closed, so the content doesn't vanish mid-animation.
  const useDrawer = !full || !wide;
  const drawerOpen = useDrawer && selected !== null && visibleIds.has(selected);
  const [drawerId, setDrawerId] = useState<string | null>(null);
  if (drawerOpen && selected !== drawerId) setDrawerId(selected);
  const closeDrawer = () => { setSelected(null); frameRef.current?.focus({ preventScroll: true }); };

  const applyCamera = (next: Camera) => { cam.current = next; setCamera(next); };

  useEffect(() => () => {
    for (const id of [frame.current, flight.current]) if (id !== null) cancelAnimationFrame(id);
    if (hintTimer.current !== null) clearTimeout(hintTimer.current);
  }, []);

  // Labels and hit areas are sized in screen pixels, so track how big one viewBox unit is on screen.
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const observer = new ResizeObserver(() => setPixelRatio(svg.clientWidth / graph.width || 1));
    observer.observe(svg);
    return () => observer.disconnect();
  }, [graph.width]);

  useEffect(() => {
    if (!drawerOpen) return;
    drawerRef.current?.focus({ preventScroll: true });
    const onKey = (e: globalThis.KeyboardEvent) => { if (e.key === "Escape") { setSelected(null); frameRef.current?.focus({ preventScroll: true }); } };
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = overflow; document.removeEventListener("keydown", onKey); };
  }, [drawerOpen]);

  useEffect(() => {
    const onChange = () => setFullscreenHost(document.fullscreenElement === frameRef.current ? frameRef.current : null);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  /** Ease the camera to `to`; jumps straight there when reduced motion is preferred. */
  const flyTo = (to: Camera, ms = 380) => {
    if (flight.current !== null) cancelAnimationFrame(flight.current);
    if (reducedMotion()) { applyCamera(to); return; }
    const from = cam.current;
    let start: number | null = null;
    const step = (now: number) => {
      start ??= now;
      const t = Math.min(1, (now - start) / ms);
      const e = 1 - Math.pow(1 - t, 3);
      applyCamera({ x: from.x + (to.x - from.x) * e, y: from.y + (to.y - from.y) * e, k: from.k + (to.k - from.k) * e });
      flight.current = t < 1 ? requestAnimationFrame(step) : null;
    };
    flight.current = requestAnimationFrame(step);
  };

  /** Zoom by `factor`, keeping the viewBox point `at` fixed on screen. */
  const zoomedAt = (c: Camera, factor: number, at: Point): Camera => {
    const k = clampZoom(c.k * factor);
    return { k, x: at.x - ((at.x - c.x) / c.k) * k, y: at.y - ((at.y - c.y) / c.k) * k };
  };
  const center = { x: graph.width / 2, y: graph.height / 2 };
  const zoomBy = (factor: number) => flyTo(zoomedAt(cam.current, factor, center), 220);

  const centreOn = (id: string, k = Math.max(cam.current.k, 1.6)) => {
    const p = positions[id];
    if (p) flyTo({ k, x: center.x - p.x * k, y: center.y - p.y * k });
  };

  const fit = () => {
    const pts = visible.flatMap((n) => (positions[n.id] ? [{ ...positions[n.id]!, r: n.r }] : []));
    if (!pts.length) return flyTo(identity);
    const pad = 40;
    const x1 = Math.min(...pts.map((p) => p.x - p.r)), x2 = Math.max(...pts.map((p) => p.x + p.r));
    const y1 = Math.min(...pts.map((p) => p.y - p.r)), y2 = Math.max(...pts.map((p) => p.y + p.r));
    const k = clampZoom(Math.min(graph.width / (x2 - x1 + pad * 2), graph.height / (y2 - y1 + pad * 2), 2));
    flyTo({ k, x: center.x - ((x1 + x2) / 2) * k, y: center.y - ((y1 + y2) / 2) * k });
  };

  // ⌘/Ctrl + wheel (and trackpad pinch, which arrives as ctrl+wheel) zooms; a plain wheel keeps
  // scrolling the page unless the map is fullscreen. Needs a non-passive listener to preventDefault.
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const onWheel = (e: WheelEvent) => {
      if (!(e.ctrlKey || e.metaKey || document.fullscreenElement)) {
        setHint(true);
        if (hintTimer.current !== null) clearTimeout(hintTimer.current);
        hintTimer.current = window.setTimeout(() => setHint(false), 1400);
        return;
      }
      e.preventDefault();
      if (flight.current !== null) { cancelAnimationFrame(flight.current); flight.current = null; }
      const matrix = svg.getScreenCTM();
      if (!matrix) return;
      const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(matrix.inverse());
      const delta = Math.max(-50, Math.min(50, e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY));
      applyCamera(zoomedAt(cam.current, Math.exp(-delta * 0.01), { x: p.x, y: p.y }));
    };
    svg.addEventListener("wheel", onWheel, { passive: false });
    return () => svg.removeEventListener("wheel", onWheel);
  }, []);

  /** Wake the simulation so the rest of the graph eases around a dragged node, then cool off. */
  const kick = (strength = 0.35) => {
    alpha.current = Math.max(alpha.current, strength);
    if (frame.current !== null) return;
    const step = () => {
      const nodes = sim.current.filter((n) => visibleIds.has(n.id));
      tick(nodes, edges, { width: graph.width, height: graph.height, pad: 24 }, alpha.current);
      alpha.current *= 0.95;
      setPositions(snapshot(sim.current));
      frame.current = alpha.current > 0.01 ? requestAnimationFrame(step) : null;
    };
    frame.current = requestAnimationFrame(step);
  };
  /** Nudge every node a little and let the layout find a fresh resting shape. */
  const shake = () => {
    sim.current.forEach((n, i) => { n.vx += Math.cos(i * 2.4) * 30; n.vy += Math.sin(i * 2.4) * 30; });
    kick(0.9);
  };

  const toPoint = (el: SVGGraphicsElement | null, e: PointerEvent): Point => {
    const matrix = el?.getScreenCTM();
    if (!matrix) return { x: 0, y: 0 };
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(matrix.inverse());
    return { x: p.x, y: p.y };
  };

  // Dragging a node.
  const onNodeDown = (id: string) => (e: PointerEvent<Element>) => {
    e.stopPropagation();
    if (e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { id, start: toPoint(worldRef.current, e), moved: false };
  };
  const onNodeMove = (e: PointerEvent<Element>) => {
    const d = drag.current;
    if (!d) return;
    e.stopPropagation();
    const p = toPoint(worldRef.current, e);
    if (!d.moved && Math.hypot(p.x - d.start.x, p.y - d.start.y) * cam.current.k * pixelRatio < 4) return;
    d.moved = true;
    const node = sim.current.find((n) => n.id === d.id);
    if (!node) return;
    Object.assign(node, { x: p.x, y: p.y, fixed: true });
    kick();
  };
  const onNodeUp = () => {
    const d = drag.current;
    if (!d) return;
    const node = sim.current.find((n) => n.id === d.id);
    if (node) node.fixed = false;
    suppressClick.current = d.moved;
    drag.current = null;
  };

  // Panning with one pointer on the background, pinch-zooming with two.
  const startGesture = () => {
    const pts = [...pointers.current.values()];
    const [a, b] = pts;
    if (!a) { gesture.current = null; return; }
    const moved = gesture.current?.moved ?? false;
    gesture.current = b
      ? { start: a, camera: cam.current, moved: true, pinch: { dist: Math.hypot(b.x - a.x, b.y - a.y) || 1, mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 } } }
      : { start: a, camera: cam.current, moved };
  };
  const onBackgroundDown = (e: PointerEvent<SVGSVGElement>) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    if (flight.current !== null) { cancelAnimationFrame(flight.current); flight.current = null; }
    e.currentTarget.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, toPoint(svgRef.current, e));
    startGesture();
  };
  const onBackgroundMove = (e: PointerEvent<SVGSVGElement>) => {
    const g = gesture.current;
    if (!g || !pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, toPoint(svgRef.current, e));
    const [a, b] = [...pointers.current.values()];
    if (g.pinch && a && b) {
      const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      const k = clampZoom(g.camera.k * (Math.hypot(b.x - a.x, b.y - a.y) / g.pinch.dist));
      const wx = (g.pinch.mid.x - g.camera.x) / g.camera.k;
      const wy = (g.pinch.mid.y - g.camera.y) / g.camera.k;
      applyCamera({ k, x: mid.x - wx * k, y: mid.y - wy * k });
      return;
    }
    if (!a) return;
    const dx = a.x - g.start.x;
    const dy = a.y - g.start.y;
    if (!g.moved && Math.hypot(dx, dy) * pixelRatio < 3) return;
    if (!g.moved) setPanning(true);
    g.moved = true;
    applyCamera({ k: g.camera.k, x: g.camera.x + dx, y: g.camera.y + dy });
  };
  const onBackgroundUp = (e: PointerEvent<SVGSVGElement>) => {
    if (!pointers.current.delete(e.pointerId)) return;
    if (pointers.current.size) { startGesture(); return; }
    // A plain click on empty space un-pins the current node.
    if (gesture.current && !gesture.current.moved && e.type === "pointerup") setSelected(null);
    gesture.current = null;
    setPanning(false);
  };

  const onClick = (node: GardenNode) => (e: MouseEvent<Element>) => {
    // Let modified clicks (new tab, etc.) through to the browser untouched.
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    if (suppressClick.current) { suppressClick.current = false; return; }
    if (selected === node.id) router.push(node.href);
    else setSelected(node.id);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.target instanceof HTMLInputElement || e.metaKey || e.ctrlKey || e.altKey) return;
    const pan = 60;
    const moves: Record<string, Point> = { ArrowLeft: { x: pan, y: 0 }, ArrowRight: { x: -pan, y: 0 }, ArrowUp: { x: 0, y: pan }, ArrowDown: { x: 0, y: -pan } };
    if (e.key === "+" || e.key === "=") zoomBy(1.3);
    else if (e.key === "-" || e.key === "_") zoomBy(1 / 1.3);
    else if (e.key === "0") fit();
    else if (e.key === "Escape") { setSelected(null); setHovered(null); }
    else if (moves[e.key] && e.target === e.currentTarget) flyTo({ ...cam.current, x: cam.current.x + moves[e.key]!.x, y: cam.current.y + moves[e.key]!.y }, 160);
    else return;
    e.preventDefault();
  };

  const toggleKind = (kind: GardenNodeKind) => {
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(kind)) next.delete(kind);
      else next.add(kind);
      return next;
    });
  };

  const toggleFullscreen = () => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void frameRef.current?.requestFullscreen?.();
  };

  const choose = (id: string) => { setSelected(id); setQuery(""); centreOn(id); };

  if (!noteCount) {
    return <p className="rounded-md p-6 font-serif italic text-muted-foreground dot-field">The map grows as notes are published. Nothing has taken root yet.</p>;
  }

  // World units per screen pixel at the current zoom; keeps text and hit areas a constant size.
  const unit = 1 / (camera.k * pixelRatio);
  const fontSize = (full ? LABEL_PX : 11) * unit;
  const zoomedIn = camera.k * pixelRatio >= 1.5;
  const byDegree = (a: GardenNode, b: GardenNode) => b.degree - a.degree;
  const candidates = active
    ? [byId.get(active)!, ...visible.filter((n) => n.id !== active && ring.has(n.id)).sort((a, b) => ring.get(a.id)! - ring.get(b.id)! || byDegree(a, b))]
    : full ? visible.filter((n) => zoomedIn || n.kind === "note").sort(byDegree) : zoomedIn ? [...visible].sort(byDegree) : [];
  const labels = placeLabels(candidates, visible, positions, graph.width, fontSize, active || zoomedIn ? 36 : 30, active !== null);

  const map = (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${graph.width} ${graph.height}`}
      className={`block w-full select-none ${fullscreen ? "h-full" : "h-auto"} ${panning ? "cursor-grabbing" : "cursor-grab"}`}
      style={{ touchAction: fullscreen ? "none" : "pan-y" }}
      role="group"
      aria-label={`Map of ${noteCount} linked notes`}
      onPointerLeave={() => { if (!drag.current) setHovered(null); }}
      onPointerDown={onBackgroundDown}
      onPointerMove={onBackgroundMove}
      onPointerUp={onBackgroundUp}
      onPointerCancel={onBackgroundUp}
      onDoubleClick={(e) => { if (e.target === e.currentTarget) fit(); }}
    >
      <g ref={worldRef} transform={`translate(${camera.x} ${camera.y}) scale(${camera.k})`}>
        <g aria-hidden="true">
          {edges.map((e) => {
            const a = positions[e.source];
            const b = positions[e.target];
            if (!a || !b) return null;
            const ringA = ring.get(e.source);
            const ringB = ring.get(e.target);
            const on = lit !== null && ringA !== undefined && ringB !== undefined && Math.min(ringA, ringB) < depth;
            const near = on && Math.min(ringA!, ringB!) === 0;
            return <line
              key={`${e.source}|${e.target}`}
              x1={a.x} y1={a.y} x2={b.x} y2={b.y}
              stroke={on ? "var(--primary)" : "var(--foreground)"}
              strokeWidth={near ? 1.8 : on ? 1.2 : e.kind === "link" ? 1 : 0.8}
              strokeDasharray={e.kind === "tag" ? "3 4" : undefined}
              strokeOpacity={near ? 0.85 : on ? 0.45 : lit ? 0.05 : e.kind === "link" ? 0.22 : 0.13}
              vectorEffect="non-scaling-stroke"
              style={{ transition: "stroke-opacity .2s, stroke .2s" }}
            />;
          })}
        </g>
        {visible.map((node) => {
          const p = positions[node.id];
          if (!p) return null;
          const style = kinds[node.kind];
          const level = ring.get(node.id);
          const opacity = !lit ? 1 : level === undefined ? 0.15 : level <= 1 ? 1 : 0.6;
          const isActive = node.id === active;
          const label = labels.get(node.id);
          const flip = label?.flip ?? false;
          const gap = fontSize * 0.4;
          return <a
            key={node.id}
            href={node.href}
            aria-label={`${node.label} (${node.meta}), ${node.degree} connection${node.degree === 1 ? "" : "s"}`}
            className="cursor-grab outline-none active:cursor-grabbing"
            style={{ opacity, transition: "opacity .2s", touchAction: "none" }}
            onPointerEnter={() => { if (!drag.current && !gesture.current) setHovered(node.id); }}
            onPointerLeave={() => { if (!drag.current) setHovered(null); }}
            onFocus={(e) => { if (e.currentTarget.matches(":focus-visible")) setHovered(node.id); }}
            onBlur={() => setHovered(null)}
            onPointerDown={onNodeDown(node.id)}
            onPointerMove={onNodeMove}
            onPointerUp={onNodeUp}
            onPointerCancel={onNodeUp}
            onClick={onClick(node)}
          >
            <circle cx={p.x} cy={p.y} r={Math.max(node.r + 4, 14 * unit)} fill="transparent" />
            {(isActive || node.id === selected) && <circle cx={p.x} cy={p.y} r={node.r + 4} fill="none" stroke="var(--primary)" strokeWidth={1.2} strokeOpacity={0.6} vectorEffect="non-scaling-stroke" />}
            <circle cx={p.x} cy={p.y} r={node.r} fill={style.fill} stroke={style.stroke ?? "var(--background)"} strokeWidth={style.stroke ? 1.2 : 1.5} vectorEffect="non-scaling-stroke" />
            {label && <text
              x={flip ? p.x - node.r - gap : p.x + node.r + gap}
              y={p.y + fontSize * 0.35}
              textAnchor={flip ? "end" : "start"}
              fontSize={node.kind === "note" || isActive ? fontSize : fontSize * 0.92}
              fontWeight={isActive ? 600 : 400}
              fill={node.kind === "tag" ? "var(--muted-foreground)" : "var(--foreground)"}
              stroke="var(--background)"
              strokeWidth={3 * unit}
              paintOrder="stroke"
              className={`pointer-events-none ${node.kind === "tag" ? "font-mono" : "font-display"}`}
            >{label.text}</text>}
          </a>;
        })}
      </g>
    </svg>
  );

  const linkedTo = (id: string) => [...(neighbours.get(id) ?? [])].map((n) => byId.get(n)!).sort((a, b) => kindOrder.indexOf(a.kind) - kindOrder.indexOf(b.kind));

  const details = (node: GardenNode) => <NodeDetails node={node} linked={linkedTo(node.id)} depth={depth} onDepth={setDepth} onCentre={centreOn} onChoose={choose} />;

  const drawerNode = drawerId ? byId.get(drawerId) : undefined;
  // Portalled out of the map: its `surface` ancestors use backdrop-filter, which would trap a fixed
  // element. In fullscreen it has to live inside the fullscreen element to be seen at all.
  const drawer = mounted && createPortal(<>
    <div aria-hidden="true" onClick={closeDrawer} className={`fixed inset-0 z-50 bg-background/40 backdrop-blur-[2px] transition-opacity duration-300 ${drawerOpen ? "opacity-100" : "pointer-events-none opacity-0"}`} />
    <div
      ref={drawerRef}
      role="dialog"
      aria-modal="true"
      aria-label={drawerNode ? drawerNode.label : "Map details"}
      tabIndex={-1}
      inert={!drawerOpen}
      className={`fixed inset-y-0 right-0 z-50 flex w-[min(24rem,88vw)] flex-col border-l border-border bg-background shadow-2xl outline-none transition-transform duration-300 ease-[cubic-bezier(.32,.72,0,1)] motion-reduce:transition-none ${drawerOpen ? "translate-x-0" : "translate-x-full"}`}
    >
      <div className="flex items-center justify-between border-b border-dashed border-border px-5 py-3">
        <Meta>GARDEN MAP</Meta>
        <button type="button" onClick={closeDrawer} aria-label="Close details" className="grid size-8 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"><X className="size-4" /></button>
      </div>
      <div className="flex-1 overflow-y-auto overscroll-contain p-5">{drawerNode && details(drawerNode)}</div>
    </div>
  </>, fullscreenHost ?? document.body);

  const zoomHint = <div aria-hidden="true" className={`pointer-events-none absolute inset-x-0 bottom-3 flex justify-center transition-opacity duration-300 ${hint ? "opacity-100" : "opacity-0"}`}>
    <span className="surface rounded-full px-3 py-1 font-mono text-[11px] text-foreground">hold ⌘ / ctrl and scroll to zoom</span>
  </div>;

  // Compact keeps its plain look (no toolbar or sidebar) but shares every interaction of the full map.
  if (!full) return <div
    ref={frameRef}
    tabIndex={0}
    onKeyDown={onKeyDown}
    aria-label="Garden map. Drag to pan, plus and minus to zoom, 0 or double-click to fit, Tab through nodes."
    className="relative overflow-hidden rounded-md dot-field outline-none focus-visible:ring-2 focus-visible:ring-ring"
  >
    {map}
    {zoomHint}
    {drawer}
  </div>;

  // On narrow screens the drawer shows the pinned node, so the sidebar keeps its overview.
  const focus = active && wide ? byId.get(active) : undefined;
  const q = query.trim().toLowerCase();
  const matches = q ? visible.filter((n) => n.label.toLowerCase().includes(q) || n.meta.toLowerCase().includes(q)).slice(0, 6) : [];
  const control = "grid size-8 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring";

  return <div className="grid grid-cols-12 gap-5">
    <div
      ref={frameRef}
      tabIndex={0}
      onKeyDown={onKeyDown}
      aria-label="Garden map. Drag to pan, plus and minus to zoom, 0 to fit, arrow keys to move, Tab through nodes."
      className="surface relative col-span-12 overflow-hidden rounded-lg dot-field outline-none focus-visible:ring-2 focus-visible:ring-ring lg:col-span-9 [&:fullscreen]:flex [&:fullscreen]:items-center [&:fullscreen]:rounded-none [&:fullscreen]:bg-background"
    >
      {map}
      <div className="surface absolute right-3 top-3 flex flex-col gap-0.5 rounded-lg p-1">
        <button type="button" className={control} onClick={() => zoomBy(1.3)} aria-label="Zoom in" title="Zoom in (+)"><Plus className="size-4" /></button>
        <button type="button" className={control} onClick={() => zoomBy(1 / 1.3)} aria-label="Zoom out" title="Zoom out (−)"><Minus className="size-4" /></button>
        <button type="button" className={control} onClick={fit} aria-label="Fit to view" title="Fit to view (0)"><Scan className="size-4" /></button>
        <button type="button" className={control} onClick={shake} aria-label="Shake the layout" title="Shake the layout"><Shuffle className="size-4" /></button>
        <button type="button" className={control} onClick={toggleFullscreen} aria-label={fullscreen ? "Exit fullscreen" : "Fullscreen"} title={fullscreen ? "Exit fullscreen" : "Fullscreen"}>{fullscreen ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}</button>
      </div>
      <span className="pointer-events-none absolute bottom-3 left-3 font-mono text-[10px] text-muted-foreground">{Math.round(camera.k * 100)}%</span>
      {zoomHint}
      {drawer}
    </div>
    <aside className="surface col-span-12 flex flex-col gap-5 rounded-lg p-5 lg:col-span-3" aria-live="polite">
      <div className="relative">
        <label className="flex items-center gap-2 rounded-md border border-border px-2.5 py-1.5 focus-within:border-primary/50">
          <Search className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
          <span className="sr-only">Find on the map</span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && matches[0]) choose(matches[0].id); if (e.key === "Escape") setQuery(""); }}
            placeholder="Find on the map…"
            className="w-full bg-transparent font-mono text-xs outline-none placeholder:text-muted-foreground/70"
          />
        </label>
        {q && <ul className="surface absolute inset-x-0 top-full z-10 mt-1 rounded-md p-1 shadow-lg">
          {matches.length ? matches.map((n) => <li key={n.id}>
            <button type="button" onClick={() => choose(n.id)} className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-[13px] hover:bg-muted">
              <span className="size-2 shrink-0 rounded-full" style={swatch(n.kind)} aria-hidden="true" />
              <span className="truncate">{n.label}</span>
            </button>
          </li>) : <li className="px-2 py-1.5 text-[13px] text-muted-foreground">Nothing matches “{query.trim()}”.</li>}
        </ul>}
      </div>
      {focus ? details(focus) : <div>
        <Meta>HOW TO READ IT</Meta>
        <p className="mt-3 text-[13px] leading-relaxed text-muted-foreground">Every dot is a note, book, project or topic. Lines are links written into the notes; dashed lines are shared topics.</p>
        <ul className="mt-3 space-y-1 font-mono text-[11px] text-muted-foreground">
          <li><span className="text-foreground">hover</span> trace links</li>
          <li><span className="text-foreground">click</span> show details, then open</li>
          <li><span className="text-foreground">drag dot</span> rearrange</li>
          <li><span className="text-foreground">drag space</span> pan</li>
          <li><span className="text-foreground">⌘/ctrl + scroll, pinch</span> zoom</li>
        </ul>
        <p className="mt-3 font-mono text-[11px] text-primary">{noteCount} notes · {graph.edges.filter((e) => e.kind === "link").length} links</p>
      </div>}
      <div className="mt-auto border-t border-dashed border-border pt-4">
        <Meta>SHOW</Meta>
        <div className="mt-3 flex flex-wrap gap-2">
          {kindOrder.filter((k) => k !== "note" && graph.nodes.some((n) => n.kind === k)).map((k) => <button
            key={k}
            type="button"
            aria-pressed={!hidden.has(k)}
            onClick={() => toggleKind(k)}
            className={`flex items-center gap-1.5 rounded-full border px-2 py-0.5 font-mono text-[10px] transition-colors ${hidden.has(k) ? "border-border text-muted-foreground/60" : "border-primary/40 text-foreground"}`}
          >
            <span className="size-2 rounded-full" style={swatch(k)} aria-hidden="true" />
            {kinds[k].label.toLowerCase()}
          </button>)}
        </div>
      </div>
    </aside>
  </div>;
}
