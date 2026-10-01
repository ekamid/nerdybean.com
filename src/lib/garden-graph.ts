import "server-only";

import { cache } from "react";
import { getBooks, getNotes, getProjects, type Link } from "@/lib/content";
import { settle, type Bounds, type SimEdge } from "@/lib/garden-layout";

export type GardenNodeKind = "note" | "book" | "project" | "page" | "tag";
export type GardenNode = { id: string; label: string; href: string; kind: GardenNodeKind; meta: string; degree: number; r: number };
export type GardenEdge = SimEdge & { kind: "link" | "tag" };
export type GardenGraph = { nodes: GardenNode[]; edges: GardenEdge[] };
export type PlacedGardenGraph = { nodes: (GardenNode & { x: number; y: number })[]; edges: GardenEdge[]; width: number; height: number };

/** Standalone pages a note can point at. Anything else that doesn't resolve is left off the map. */
const pages: Record<string, string> = { "/about": "About", "/coffee": "Coffee Lab", "/travel": "Travel & mountains" };

/**
 * Builds the garden's link graph from real content: note backlinks, book links, and topic tags
 * shared by two or more pieces. Only published targets become nodes, so the map never links to a
 * draft or a 404.
 */
export const getGardenGraph = cache((): GardenGraph => {
  const nodes = new Map<string, Omit<GardenNode, "degree" | "r">>();
  const notes = getNotes();
  const books = getBooks();
  for (const n of notes) nodes.set(`/garden/${n.slug}`, { id: `/garden/${n.slug}`, label: n.title, href: `/garden/${n.slug}`, kind: "note", meta: `${n.category} · ${n.date}` });
  for (const b of books) nodes.set(`/books/${b.slug}`, { id: `/books/${b.slug}`, label: b.title, href: `/books/${b.slug}`, kind: "book", meta: `Book · ${b.author}` });
  const projects = new Map(getProjects().map((p) => [`/projects/${p.slug}`, p]));

  /** Resolve a link target to a node, creating project/page nodes the first time they're referenced. */
  const resolve = (href: string) => {
    const path = href.split(/[?#]/)[0]!.replace(/\/+$/, "") || "/";
    if (nodes.has(path)) return path;
    const project = projects.get(path);
    if (project) nodes.set(path, { id: path, label: project.title, href: path, kind: "project", meta: `Project · ${project.stage}` });
    else if (pages[path]) nodes.set(path, { id: path, label: pages[path], href: path, kind: "page", meta: "Page" });
    else return null;
    return path;
  };

  const edges = new Map<string, GardenEdge>();
  const connect = (a: string, b: string, kind: GardenEdge["kind"]) => {
    if (a === b) return;
    const key = a < b ? `${a}|${b}` : `${b}|${a}`;
    // A direct reference outranks a shared tag, and a link written from both sides is stronger still.
    const existing = edges.get(key);
    if (existing?.kind === "link" && kind === "link") existing.weight = 1.5;
    else if (!existing || kind === "link") edges.set(key, { source: a, target: b, kind, weight: kind === "link" ? 1 : 0.45 });
  };
  const linkFrom = (from: string, links: Link[]) => {
    for (const link of links) {
      if (!link.href?.startsWith("/")) continue;
      const to = resolve(link.href);
      if (to) connect(from, to, "link");
    }
  };
  for (const n of notes) linkFrom(`/garden/${n.slug}`, n.backlinks);
  for (const b of books) linkFrom(`/books/${b.slug}`, b.links);

  // Topic tags become hubs, but only when they actually join two notes together.
  const tagged = new Map<string, string[]>();
  for (const n of notes) for (const tag of n.tags) tagged.set(tag, [...(tagged.get(tag) ?? []), `/garden/${n.slug}`]);
  for (const [tag, members] of tagged) {
    if (members.length < 2) continue;
    const id = `#${tag}`;
    nodes.set(id, { id, label: `#${tag}`, href: `/garden?tag=${encodeURIComponent(tag)}`, kind: "tag", meta: `Topic · ${members.length} notes` });
    for (const member of members) connect(member, id, "tag");
  }

  const degree = new Map<string, number>();
  for (const e of edges.values()) for (const id of [e.source, e.target]) degree.set(id, (degree.get(id) ?? 0) + 1);
  return {
    // Books with no surviving connections would float alone; leave them out.
    nodes: [...nodes.values()]
      .filter((node) => node.kind === "note" || degree.has(node.id))
      .map((node) => {
        const d = degree.get(node.id) ?? 0;
        const base = node.kind === "note" ? 6 : node.kind === "tag" ? 3.5 : 4.5;
        return { ...node, degree: d, r: Math.min(base + d * 0.7, base + 5) };
      }),
    edges: [...edges.values()],
  };
});

/** The graph with positions pre-computed for a frame of the given size. */
export function placeGardenGraph(width: number, height: number, pad = 24): PlacedGardenGraph {
  const { nodes, edges } = getGardenGraph();
  const bounds: Bounds = { width, height, pad };
  return { nodes: settle(nodes, edges, bounds), edges, width, height };
}
