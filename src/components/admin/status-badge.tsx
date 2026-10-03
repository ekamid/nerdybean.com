export function StatusBadge({ status }: { status: "draft" | "published" }) {
  return <span className={`rounded-sm border px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.14em] ${status === "published" ? "border-primary/40 text-primary" : "border-border text-muted-foreground"}`}>{status}</span>;
}
