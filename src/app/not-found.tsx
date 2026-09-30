import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return (
    <main className="flex min-h-[70vh] items-center justify-center px-4">
      <div className="max-w-md text-center">
        <p className="font-mono text-[11px] tracking-[0.24em] text-primary">404 / OFF THE TRAIL</p>
        <h1 className="mt-4 font-display text-4xl font-extrabold">Page not found</h1>
        <p className="mt-3 text-muted-foreground">
          The page you’re looking for doesn’t exist, has been moved, or is still growing.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3 font-mono text-xs">
          <Link href="/" className="rounded-md bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90">Go home</Link>
          <Link href="/garden" className="rounded-md border border-input px-4 py-2 hover:bg-accent">Browse the garden</Link>
        </div>
      </div>
    </main>
  );
}
