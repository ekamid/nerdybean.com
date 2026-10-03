/**
 * A gooseneck kettle that tilts in, pours and tips back, drawn into the AeroPress brewer's SVG.
 *
 * The stream is simulated rather than drawn: every point along it is water that left the spout at
 * some earlier moment and has been falling since (projectile motion from the spout, at the
 * kettle's tilt at that moment). So the stream bends when the kettle tilts back, its tail falls
 * away after the pour stops, and it thins as it speeds up (the same water through a faster, so
 * narrower, column). Everything is a pure function of `elapsed`, so it scrubs and replays exactly.
 */

const clamp = (n: number) => Math.min(1, Math.max(0, n));
const ease = (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);

// Kettle geometry, in its own coordinates around the pivot it tilts on.
const pivot = { x: 190, y: 89 };
const spoutTip = { x: -56, y: -26 };
const spoutDir = { x: -10 / Math.hypot(10, 5), y: 5 / Math.hypot(10, 5) };
const pourTilt = -24; // degrees; negative tips the spout down
const tiltMs = 260; // time to tip in or out of a pour

// Physics, in SVG units: the brewer is ~13 cm tall over ~130 units, so 1 unit ≈ 1 mm.
const gravity = 980; // mm/s²
const exitSpeed = 45; // mm/s out of the spout at full tilt: a slow, controlled gooseneck pour
const spoutWidth = 2.6; // stream width at the spout

type Point = { x: number; y: number };
const rotate = ({ x, y }: Point, degrees: number) => {
  const a = (degrees * Math.PI) / 180;
  return { x: x * Math.cos(a) - y * Math.sin(a), y: x * Math.sin(a) + y * Math.cos(a) };
};
const f = (n: number) => n.toFixed(2);

type Props = {
  /** Milliseconds since the brew started. */
  elapsed: number;
  /** When water flows, as [start, end] in ms. The kettle tips in just before each and back after. */
  pours: [number, number][];
  /** Where the stream lands: the water surface, or the coffee bed before there's any water. */
  surface: number;
  /** Clip path for the chamber, so ripples stay inside it. */
  chamberClip: string;
  id: string;
};

export function GooseneckPour({ elapsed, pours, surface, chamberClip, id }: Props) {
  const first = pours[0]?.[0] ?? 0;
  const last = pours.at(-1)?.[1] ?? 0;
  // Slide in from the right before the first pour, out again after the last.
  const arrive = ease(clamp((elapsed - (first - tiltMs - 450)) / 400));
  const leave = ease(clamp((elapsed - (last + tiltMs + 150)) / 450));
  const present = arrive * (1 - leave);
  if (present <= 0) return null;
  const shift = 90 * (1 - arrive) + 90 * leave;

  const tiltAt = (time: number) => {
    for (const [start, end] of pours) {
      if (time > start - tiltMs && time < end + tiltMs) return pourTilt * ease(clamp(Math.min(time - (start - tiltMs), end + tiltMs - time) / tiltMs));
    }
    return 0;
  };
  const tilt = tiltAt(elapsed);
  const tipAt = (degrees: number) => {
    const p = rotate(spoutTip, degrees);
    return { x: pivot.x + shift + p.x, y: pivot.y + p.y };
  };

  // Sample the water in the air: newest (at the spout) to oldest (furthest along), until it lands.
  type Sample = Point & { w: number; nx: number; ny: number };
  const streams: Sample[][] = [];
  const landings: Point[] = [];
  for (const [start, end] of pours) {
    const newest = Math.min(end, elapsed);
    const oldest = Math.max(start, elapsed - 1200);
    if (newest <= oldest) continue;
    const centre: Sample[] = [];
    let previous: Point | null = null;
    for (let i = 0; i <= 32; i++) {
      const born = newest - ((newest - oldest) * i) / 32;
      const age = (elapsed - born) / 1000;
      const bornTilt = tiltAt(born);
      const flow = bornTilt / pourTilt; // more tilt, faster flow
      const origin = tipAt(bornTilt);
      const dir = rotate(spoutDir, bornTilt);
      const vx = dir.x * exitSpeed * flow;
      const vy = dir.y * exitSpeed * flow + gravity * age;
      let point = { x: origin.x + vx * age, y: origin.y + dir.y * exitSpeed * flow * age + 0.5 * gravity * age * age };
      const landed = point.y >= surface;
      if (landed && previous) {
        const k = (surface - previous.y) / (point.y - previous.y);
        point = { x: previous.x + (point.x - previous.x) * k, y: surface };
      }
      const speed = Math.hypot(vx, vy);
      // Same flow through a faster column means a thinner one: width ∝ 1/√speed.
      const w = spoutWidth * Math.sqrt(exitSpeed / Math.max(speed, exitSpeed));
      // A slight, travelling wobble that grows as the stream falls.
      const wobble = 0.5 * Math.sin(age * 40 - elapsed / 45) * clamp(age / 0.35) ** 2;
      const nx = -vy / speed;
      const ny = vx / speed;
      centre.push({ x: point.x + nx * wobble, y: point.y + ny * wobble, w, nx, ny });
      previous = point;
      if (landed) {
        landings.push({ x: point.x, y: surface });
        break;
      }
    }
    if (centre.length > 1) streams.push(centre);
  }

  const tip = tipAt(tilt);
  const impact = landings[0];
  const side = (samples: Sample[], k: number) => samples.map((c) => `${f(c.x + c.nx * c.w * k)} ${f(c.y + c.ny * c.w * k)}`);

  return <>
    <defs>
      <linearGradient id={`${id}-steel`} x1="0" x2="1" y1="0" y2="0">
        <stop offset="0" stopColor="currentColor" stopOpacity=".05" />
        <stop offset=".28" stopColor="currentColor" stopOpacity=".24" />
        <stop offset=".5" stopColor="currentColor" stopOpacity=".06" />
        <stop offset=".85" stopColor="currentColor" stopOpacity=".16" />
      </linearGradient>
      <filter id={`${id}-steam`} x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="1.4" />
      </filter>
    </defs>

    {/* Water in the air */}
    {streams.map((samples, i) => {
      const [newest, oldest] = [samples[0]!, samples.at(-1)!];
      return <g key={i} fill="var(--brew-water)" opacity=".9">
        <path d={`M${side(samples, 0.5).join(" L")} L${side(samples, -0.5).reverse().join(" L")} Z`} />
        {/* Rounded ends: where water is still leaving the spout, and the falling front or tail */}
        <circle cx={f(newest.x)} cy={f(newest.y)} r={f(newest.w / 2)} />
        <circle cx={f(oldest.x)} cy={f(oldest.y)} r={f(oldest.w / 2)} />
        {/* A glint of light down one side */}
        <polyline points={side(samples, 0.22).join(" ")} fill="none" stroke="#fff" strokeOpacity=".45" strokeWidth=".45" strokeLinecap="round" />
      </g>;
    })}

    {/* Where it lands: rings spreading on the surface, and a few small splashes */}
    {impact && <g clipPath={`url(#${chamberClip})`}>
      {[0, 1, 2].map((i) => {
        const phase = (elapsed / 520 + i / 3) % 1;
        return <ellipse key={i} cx={f(impact.x)} cy={f(impact.y + 0.6)} rx={f(2 + 15 * phase)} ry={f(0.8 + 2.4 * phase)} fill="none" stroke="var(--brew-water)" strokeOpacity={f((1 - phase) * 0.7)} strokeWidth=".7" />;
      })}
      {[0, 1, 2, 3].map((i) => {
        const t = (((elapsed / 300 + i / 4) % 1) * 0.16);
        const side = i % 2 ? 1 : -1;
        const y = impact.y - (55 + i * 6) * t + 0.5 * gravity * t * t;
        return y < impact.y && <circle key={i} cx={f(impact.x + side * (14 + i * 5) * t)} cy={f(y)} r=".7" fill="var(--brew-water)" />;
      })}
    </g>}

    {/* Steam from the spout: the water is at 90–92°C */}
    <g filter={`url(#${id}-steam)`} opacity={present}>
      {[0, 1, 2].map((i) => {
        const phase = (elapsed / 1700 + i / 3) % 1;
        const base = { x: tip.x - 1 + i, y: tip.y - 2 - phase * 14 };
        const sway = (k: number) => 3 * Math.sin(k * 2.2 + elapsed / 500 + i * 2);
        return <path key={i} d={`M${f(base.x)} ${f(base.y)} Q${f(base.x + sway(1))} ${f(base.y - 9)} ${f(base.x + sway(2))} ${f(base.y - 18)}`} fill="none" stroke="currentColor" strokeOpacity={f(0.3 * Math.sin(Math.PI * phase))} strokeWidth="1.6" strokeLinecap="round" />;
      })}
    </g>

    {/* The kettle */}
    <g opacity={present} transform={`translate(${f(pivot.x + shift)} ${pivot.y}) rotate(${f(tilt)})`}>
      {/* Gooseneck: an outline with a hollow middle reads as a thin tube */}
      <path d="M-20 11 C-33 11 -36 -4 -38 -16 C-40 -28 -46 -31 -56 -26" fill="none" stroke="currentColor" strokeOpacity=".55" strokeWidth="4.2" strokeLinecap="round" />
      <path d="M-20 11 C-33 11 -36 -4 -38 -16 C-40 -28 -46 -31 -56 -26" fill="none" stroke="var(--card)" strokeWidth="2" strokeLinecap="round" />
      <path d="M-22 18 L22 18 Q24 18 23.5 15 L19 -12 Q18.5 -15 15 -15 L-15 -15 Q-18.5 -15 -19 -12 L-23.5 15 Q-24 18 -22 18 Z" fill="var(--card)" />
      <path d="M-22 18 L22 18 Q24 18 23.5 15 L19 -12 Q18.5 -15 15 -15 L-15 -15 Q-18.5 -15 -19 -12 L-23.5 15 Q-24 18 -22 18 Z" fill={`url(#${id}-steel)`} stroke="currentColor" strokeOpacity=".5" strokeWidth="1.5" strokeLinejoin="round" />
      <line x1="-23" y1="18" x2="23" y2="18" stroke="currentColor" strokeOpacity=".6" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M18 -11 C31 -14 35 -6 34 2 C33 11 28 14 21 14" fill="none" stroke="currentColor" strokeOpacity=".6" strokeWidth="3.4" strokeLinecap="round" />
      <rect x="-15" y="-19" width="30" height="4" rx="2" fill="currentColor" opacity=".4" />
      <rect x="-3" y="-25" width="6" height="6" rx="1.5" fill="var(--brew-bean)" />
      {/* Thermometer dial, sitting at 92° */}
      <circle cx="0" cy="2" r="5" fill="var(--card)" stroke="currentColor" strokeOpacity=".4" />
      <line x1="0" y1="2" x2="3" y2="-1.5" stroke="var(--brew-bean)" strokeWidth="1" strokeLinecap="round" />
      <circle cx={spoutTip.x} cy={spoutTip.y} r="1.4" fill="currentColor" opacity=".55" />
    </g>
  </>;
}
