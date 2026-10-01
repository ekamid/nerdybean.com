/**
 * Tiny, dependency-free force layout for the garden map. Deterministic (no randomness), so the
 * server can pre-compute positions and the client hydrates without a mismatch, then reuses the
 * same `tick` to keep the graph alive while a node is dragged.
 */

export type SimNode = { id: string; x: number; y: number; vx: number; vy: number; r: number; fixed?: boolean };
export type SimEdge = { source: string; target: string; weight: number };
export type Bounds = { width: number; height: number; pad: number };

const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

/** Spread nodes on a sunflower spiral so the simulation starts untangled and identical every run. */
export function seed<T extends { id: string; r: number }>(items: T[], { width, height }: Bounds): (T & SimNode)[] {
  const step = Math.min(width, height) / (2.4 * Math.sqrt(items.length + 1));
  return items.map((item, i) => {
    const radius = step * Math.sqrt(i + 0.5);
    const angle = i * GOLDEN_ANGLE;
    return { ...item, x: width / 2 + radius * Math.cos(angle) * (width / height), y: height / 2 + radius * Math.sin(angle), vx: 0, vy: 0 };
  });
}

/**
 * Advance the simulation one step. `alpha` (0–1) scales every force and cools towards 0.
 * Forces are measured in a square space (x divided by the aspect ratio) so the graph fills wide
 * frames instead of bunching into a circle in the middle; only collisions use true distances.
 */
export function tick(nodes: SimNode[], edges: SimEdge[], { width, height, pad }: Bounds, alpha: number) {
  const n = nodes.length;
  if (!n) return;
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const k = width / height;
  const spacing = height / Math.sqrt(n);
  const charge = spacing * spacing * 0.6;
  const linkLength = spacing * 0.8;

  // Every pair pushes apart (inverse square), and overlapping circles are separated outright.
  for (let i = 0; i < n; i++) {
    const a = nodes[i]!;
    for (let j = i + 1; j < n; j++) {
      const b = nodes[j]!;
      let rx = b.x - a.x;
      let dy = b.y - a.y;
      if (rx === 0 && dy === 0) { rx = 0.01 * (j - i); dy = 0.01; }
      const dx = rx / k;
      const d2 = dx * dx + dy * dy;
      const d = Math.sqrt(d2);
      const push = (charge * alpha) / Math.max(d2, 1);
      let fx = (dx / d) * push * k;
      let fy = (dy / d) * push;
      const real = Math.sqrt(rx * rx + dy * dy);
      const minGap = a.r + b.r + 10;
      if (real < minGap) {
        const overlap = (minGap - real) / 2;
        fx += (rx / real) * overlap;
        fy += (dy / real) * overlap;
      }
      a.vx -= fx; a.vy -= fy;
      b.vx += fx; b.vy += fy;
    }
  }

  // Links behave like springs; heavier links (direct references) pull harder than shared tags.
  for (const edge of edges) {
    const a = byId.get(edge.source);
    const b = byId.get(edge.target);
    if (!a || !b) continue;
    const dx = (b.x - a.x) / k;
    const dy = b.y - a.y;
    const d = Math.sqrt(dx * dx + dy * dy) || 1;
    const pull = ((d - linkLength) / d) * 0.06 * edge.weight * alpha;
    a.vx += dx * pull * k; a.vy += dy * pull;
    b.vx -= dx * pull * k; b.vy -= dy * pull;
  }

  // Gentle gravity keeps loose components on screen.
  const g = 0.008 * alpha;
  for (const node of nodes) {
    if (node.fixed) { node.vx = node.vy = 0; continue; }
    node.vx += (width / 2 - node.x) * g;
    node.vy += (height / 2 - node.y) * g;
    node.vx *= 0.55;
    node.vy *= 0.55;
    node.x = Math.min(width - pad - node.r, Math.max(pad + node.r, node.x + node.vx));
    node.y = Math.min(height - pad - node.r, Math.max(pad + node.r, node.y + node.vy));
  }
}

/** Run the simulation to rest. Used on the server so the first paint is already laid out. */
export function settle<T extends { id: string; r: number }>(items: T[], edges: SimEdge[], bounds: Bounds, iterations = 320) {
  const nodes = seed(items, bounds);
  for (let i = 0; i < iterations; i++) tick(nodes, edges, bounds, 1 - i / iterations);
  return items.map((item, i) => ({ ...item, x: Math.round(nodes[i]!.x * 10) / 10, y: Math.round(nodes[i]!.y * 10) / 10 }));
}
