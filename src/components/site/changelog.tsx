import { formatIsoDate, type Update, type UpdateKind } from "@/lib/content";
import { Body, Meta } from "./page";

const labels: Record<UpdateKind, { label: string; hint: string }> = {
  revised: { label: "Revised", hint: "My view changed" },
  continued: { label: "Continued", hint: "A further thought on the same topic" },
  corrected: { label: "Corrected", hint: "Fixes a factual error in the original" },
};

/** "Updated 1 Oct 2026" for the meta line; renders nothing when there are no updates. */
export function UpdatedStamp({ date }: { date?: string | undefined }) {
  if (!date) return null;
  return <> · <a href="#changelog" className="hover:text-foreground">updated <time dateTime={date}>{formatIsoDate(date)}</time></a></>;
}

/**
 * Append-only log of how a piece changed after it was published. The original text above it
 * is left as written; each entry records when and how the thinking moved on.
 */
export function Changelog({ updates, published }: { updates: Update[]; published?: { iso: string; label: string } }) {
  if (!updates.length) return null;
  return <section id="changelog" aria-labelledby="changelog-title" className="mt-14 border-t border-dashed border-border pt-8">
    <Meta>CHANGE LOG / {updates.length} {updates.length === 1 ? "UPDATE" : "UPDATES"}</Meta>
    <h2 id="changelog-title" className="mt-3 font-display text-2xl font-bold">How this thinking has changed</h2>
    <p className="mt-2 text-sm text-muted-foreground">The text above is unchanged since it was first published. Later thoughts are added here, newest first.</p>
    <ol className="mt-8 space-y-8 border-l border-border pl-6">
      {updates.map((u) => <li key={u.date} id={`update-${u.date}`} className="relative scroll-mt-24">
        <span className="absolute -left-[29px] top-1.5 size-2.5 rounded-full border-2 border-background bg-primary" aria-hidden="true" />
        <div className="flex flex-wrap items-center gap-2 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
          <time dateTime={u.date}>{formatIsoDate(u.date)}</time>
          <span aria-hidden="true">·</span>
          <span className="rounded-full border border-primary/40 px-2 py-0.5 text-primary" title={labels[u.type].hint}>{labels[u.type].label}</span>
          <a href={`#update-${u.date}`} className="hover:text-foreground" aria-label={`Link to the ${formatIsoDate(u.date)} update`}>#</a>
        </div>
        <h3 className="mt-2 font-display text-lg font-semibold">{u.summary}</h3>
        {u.note && <Body source={u.note} className="mt-3 text-muted-foreground" />}
      </li>)}
      {published && <li className="relative">
        <span className="absolute -left-[29px] top-1.5 size-2.5 rounded-full border-2 border-background bg-muted-foreground/40" aria-hidden="true" />
        <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground"><time dateTime={published.iso}>{published.label}</time> · First published</div>
      </li>}
    </ol>
  </section>;
}
