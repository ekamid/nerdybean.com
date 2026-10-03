"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";

const steps = [
  { label: "Dose", detail: "15 g of coffee", ms: 2200 },
  { label: "Grind", detail: "fine-to-coarse, like table salt", ms: 2600 },
  { label: "Bloom", detail: "45 g of water at 90–92°C, wait 45 s", ms: 5000 },
  { label: "Pour", detail: "top up to 250 g", ms: 3000 },
  { label: "Stir", detail: "a few gentle turns", ms: 2000 },
  { label: "Press", detail: "slow and steady", ms: 3600 },
] as const;

const total = steps.reduce((sum, s) => sum + s.ms, 0);
const clamp = (n: number) => Math.min(1, Math.max(0, n));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const ease = (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);

// Geometry (viewBox 0 40 240 280).
const chamber = { x: 86, w: 68, top: 110, bottom: 240 };
const fullWater = chamber.bottom - 118; // water surface at 250 g
const bedHeight = 16;
const outlet = 104; // where grounds leave the hand grinder
// Beans settle in the grinder hopper: bottom row first, ground in the same order.
const beans = [111, 117, 123, 129, 112, 118, 124, 130].map((x, i) => ({ x, y: i < 4 ? 74 : 68, delay: i / 10 }));

function phaseAt(elapsed: number) {
  let start = 0;
  for (const [i, { ms }] of steps.entries()) {
    if (elapsed < start + ms) return { index: i, t: (elapsed - start) / ms };
    start += ms;
  }
  return { index: steps.length, t: 1 };
}

export function AeropressBrew() {
  const id = useId();
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const started = useRef(false);

  const play = useCallback(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setElapsed(total);
      return;
    }
    setElapsed(0);
    setRunning(true);
  }, []);

  // Start once the brewer scrolls into view.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting && !started.current) {
        started.current = true;
        play();
      }
    }, { threshold: 0.4 });
    io.observe(el);
    return () => io.disconnect();
  }, [play]);

  useEffect(() => {
    if (!running) return;
    let frame = 0;
    const origin = performance.now();
    const tick = (now: number) => {
      const next = Math.min(total, now - origin);
      setElapsed(next);
      if (next < total) frame = requestAnimationFrame(tick);
      else setRunning(false);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [running]);

  const { index, t } = phaseAt(elapsed);
  const done = index >= steps.length;
  const at = (i: number) => (index > i ? 1 : index === i ? t : 0);

  const dose = at(0);
  const grind = at(1);
  const bloom = at(2);
  const pour = at(3);
  const stir = at(4);
  const press = ease(at(5));

  const coffee = 15 * dose;
  const water = index < 2 ? 0 : index === 2 ? 45 * clamp((bloom - 0.1) / 0.3) : 45 + 205 * ease(clamp(pour / 0.85));
  const bloomSeconds = index === 2 ? Math.round(45 * bloom) : index > 2 ? 45 : 0;
  const pouring = (index === 2 && bloom > 0.1 && bloom < 0.4) || (index === 3 && pour < 0.85);
  // The grinder lifts away once grinding is done, before the first pour.
  const grinderAway = index >= 2 ? clamp(bloom / 0.1) + (index > 2 ? 1 : 0) : 0;
  const crank = grind * 6 * Math.PI * 2;

  const grounds = bedHeight * grind * (1 - 0.4 * press);
  const surface = chamber.bottom - (water > 0 ? 6 + (water / 250) * (chamber.bottom - 6 - fullWater) : 0);
  const plunger = lerp(fullWater - 6, chamber.bottom - grounds, press);
  const liquidTop = index >= 5 ? Math.max(surface, plunger) : surface;
  const cupFill = index >= 5 ? press : 0;
  const paddle = 120 + 18 * Math.sin(stir * 4 * Math.PI * 2);

  const readout = index === 0 ? `${coffee.toFixed(1)} g` : index === 1 ? "15.0 g" : `${Math.round(water)} g`;

  return (
    <div ref={ref} className="grid grid-cols-12 items-center gap-8">
      <div className="surface relative col-span-12 rounded-lg p-6 md:col-span-6">
        <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
          <span>scale <span className="ml-1 text-sm normal-case tracking-normal text-foreground tabular-nums">{readout}</span></span>
          <span>bloom <span className="ml-1 text-sm normal-case tracking-normal text-foreground tabular-nums">0:{String(bloomSeconds).padStart(2, "0")}</span></span>
        </div>
        <svg viewBox="0 40 240 280" className="mx-auto mt-4 w-full max-w-[280px]" role="img" aria-label="An AeroPress brewing: 15 g of freshly ground coffee, a 45 g bloom for 45 seconds, topped up to 250 g of water, stirred, then pressed into a cup.">
          <defs>
            <clipPath id={`${id}-chamber`}>
              <rect x={chamber.x} y={chamber.top} width={chamber.w} height={chamber.bottom - chamber.top} />
            </clipPath>
            <clipPath id={`${id}-cup`}>
              <path d="M78 262 h84 l-8 46 h-68 z" />
            </clipPath>
          </defs>

          {/* Kettle stream */}
          <line x1="120" y1="40" x2="120" y2={liquidTop - 2} stroke="var(--brew-water)" strokeWidth="3" strokeLinecap="round" strokeDasharray="6 4" strokeDashoffset={-elapsed / 20} opacity={pouring ? 0.9 : 0} style={{ transition: "opacity .25s" }} />

          {/* Liquid, grounds and beans inside the chamber */}
          <g clipPath={`url(#${id}-chamber)`}>
            {water > 0 && <rect x={chamber.x} y={liquidTop} width={chamber.w} height={chamber.bottom - liquidTop} fill="var(--brew-liquid)" />}
            <rect x={chamber.x} y={chamber.bottom - grounds} width={chamber.w} height={grounds} fill="var(--brew-grounds)" />
            {index === 2 && [0, 1, 2, 3, 4].map((i) => {
              const cycle = ((elapsed / 900 + i / 5) % 1);
              return <circle key={i} cx={94 + i * 13} cy={lerp(chamber.bottom - grounds, surface, cycle)} r={1.6} fill="var(--brew-water)" opacity={(1 - cycle) * clamp((bloom - 0.3) * 4)} />;
            })}
          </g>
          {/* Hand grinder: beans fill the hopper, the crank turns, grounds fall into the chamber */}
          {grinderAway < 1 && (
            <g opacity={1 - clamp(grinderAway)} transform={`translate(${index === 1 ? Math.sin(elapsed / 30) * 0.6 : 0} ${-30 * ease(clamp(grinderAway))})`}>
              {beans.map((b, i) => {
                const fall = ease(clamp((dose - b.delay) / 0.5));
                const gone = clamp((grind - i / beans.length) * beans.length);
                if (fall === 0 || gone >= 1) return null;
                const y = lerp(30, b.y, fall) + gone * 6;
                return <ellipse key={i} cx={b.x} cy={y} rx={3.5 * (1 - gone)} ry={2.5 * (1 - gone)} fill="var(--brew-bean)" transform={`rotate(${i * 37} ${b.x} ${y})`} />;
              })}
              <path d="M100 52 L140 52 L132 78 L108 78 Z" fill="none" stroke="currentColor" strokeOpacity=".45" strokeWidth="1.5" strokeLinejoin="round" />
              <rect x="108" y="78" width="24" height="20" rx="2" fill="currentColor" fillOpacity=".12" stroke="currentColor" strokeOpacity=".45" strokeWidth="1.5" />
              <rect x="114" y="98" width="12" height="6" rx="1" fill="currentColor" opacity=".45" />
              <rect x="118" y="44" width="4" height="8" fill="currentColor" opacity=".55" />
              <line x1="120" y1="46" x2={120 + 24 * Math.cos(crank)} y2={46 + 3 * Math.sin(crank)} stroke="currentColor" strokeOpacity=".7" strokeWidth="2" strokeLinecap="round" />
              <circle cx={120 + 24 * Math.cos(crank)} cy={46 + 3 * Math.sin(crank)} r="3.5" fill="var(--brew-bean)" />
              {index === 1 && [0, 1, 2, 3, 4, 5].map((i) => {
                const cycle = (elapsed / 400 + i / 6) % 1;
                return <circle key={i} cx={117 + ((i * 7) % 6)} cy={lerp(outlet, chamber.bottom - grounds, cycle)} r={1.2} fill="var(--brew-grounds)" />;
              })}
            </g>
          )}

          {/* Plunger */}
          {/* Stirring paddle and swirl */}
          <g opacity={index === 4 && stir < 0.95 ? 1 : 0} style={{ transition: "opacity .25s" }}>
            <g clipPath={`url(#${id}-chamber)`}>
              {[0, 1].map((i) => (
                <ellipse key={i} cx="120" cy={surface + 28 + i * 34} rx={24 - i * 6} ry="4" fill="none" stroke="var(--brew-water)" strokeOpacity=".5" strokeDasharray="10 8" strokeDashoffset={(i ? 1 : -1) * elapsed / 15} />
              ))}
            </g>
            <line x1={paddle} y1={surface - 30} x2={paddle} y2={chamber.bottom - grounds - 14} stroke="currentColor" strokeOpacity=".7" strokeWidth="3" strokeLinecap="round" />
            <rect x={paddle - 6} y={chamber.bottom - grounds - 26} width="12" height="14" rx="2" fill="currentColor" opacity=".55" />
          </g>

          <g opacity={index >= 5 ? 1 : 0} style={{ transition: "opacity .3s" }}>
            <rect x={chamber.x + 5} y={plunger - 120} width={chamber.w - 10} height={120} rx="3" fill="var(--card)" stroke="currentColor" strokeOpacity=".45" />
            <rect x={chamber.x + 3} y={plunger - 6} width={chamber.w - 6} height={6} rx="2" fill="currentColor" opacity=".55" />
            <rect x={chamber.x - 8} y={plunger - 124} width={chamber.w + 16} height={6} rx="3" fill="currentColor" opacity=".55" />
          </g>

          {/* Chamber outline, filter cap and markings */}
          <rect x={chamber.x} y={chamber.top} width={chamber.w} height={chamber.bottom - chamber.top} rx="2" fill="none" stroke="currentColor" strokeOpacity=".45" strokeWidth="1.5" />
          <rect x={chamber.x - 6} y={chamber.top - 4} width={chamber.w + 12} height={4} rx="2" fill="currentColor" opacity=".35" />
          <rect x={chamber.x - 4} y={chamber.bottom} width={chamber.w + 8} height={7} rx="2" fill="currentColor" opacity=".55" />
          {[1, 2, 3, 4].map((m) => <line key={m} x1={chamber.x + chamber.w - 10} x2={chamber.x + chamber.w} y1={chamber.bottom - m * 28} y2={chamber.bottom - m * 28} stroke="currentColor" strokeOpacity=".25" />)}

          {/* Drips */}
          {index === 5 && press < 0.98 && [0, 1, 2].map((i) => {
            const cycle = ((elapsed / 450 + i / 3) % 1);
            return <circle key={i} cx={120} cy={lerp(250, 306 - 40 * cupFill, cycle)} r={2} fill="var(--brew-liquid)" opacity={1 - cycle * 0.6} />;
          })}

          {/* Cup */}
          <g clipPath={`url(#${id}-cup)`}>
            <rect x="70" y={308 - 46 * cupFill} width="100" height={46 * cupFill} fill="var(--brew-liquid)" />
          </g>
          <path d="M78 262 h84 l-8 46 h-68 z" fill="none" stroke="currentColor" strokeOpacity=".45" strokeWidth="1.5" strokeLinejoin="round" />
          <path d="M160 272 q14 0 12 12 q-2 10 -14 10" fill="none" stroke="currentColor" strokeOpacity=".45" strokeWidth="1.5" />
        </svg>
        <button type="button" onClick={play} disabled={running} className="mt-4 w-full rounded-md border border-border py-2 font-mono text-[11px] uppercase tracking-[0.15em] text-primary transition-colors hover:bg-primary/10 disabled:opacity-40">
          {running ? "brewing…" : done ? "brew again" : "start brewing"}
        </button>
      </div>

      <ol className="col-span-12 space-y-1 md:col-span-6">
        {steps.map((s, i) => {
          const state = done || i < index ? "done" : i === index && (running || elapsed > 0) ? "active" : "idle";
          return (
            <li key={s.label} className={`flex items-baseline gap-5 rounded-md px-4 py-3 transition-colors ${state === "active" ? "bg-primary/10" : ""}`}>
              <span className={`w-6 font-mono text-[11px] tabular-nums ${state === "idle" ? "text-muted-foreground" : "text-primary"}`}>{String(i + 1).padStart(2, "0")}</span>
              <span className="flex-1">
                <span className={`block font-display text-xl font-bold ${state === "idle" ? "text-muted-foreground" : ""}`}>{s.label}</span>
                <span className="font-mono text-xs text-muted-foreground">{s.detail}</span>
              </span>
              <span className="font-mono text-xs text-primary" aria-hidden="true">{state === "done" ? "✓" : ""}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
