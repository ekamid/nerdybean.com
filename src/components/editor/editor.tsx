"use client";

import { useEffect, useRef, useState } from "react";
import { parse, stringify } from "yaml";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ChevronsUpDown, ClipboardCheck, ClipboardCopy, Eye, FileCode2, FileDown, FolderOpen, Heading2, ImageUp, Link2, List, ListOrdered, NotebookPen, PenLine, TextQuote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Meta } from "@/components/site/primitives";

type Kind = "note" | "book" | "project" | "travel";
type Mode = "write" | "preview" | "source";
type Draft = { kind: Kind; fields: Record<string, unknown>; body: string };
type Field = { key: string; label: string; placeholder?: string; multiline?: boolean };

const commonFields: Field[] = [
  { key: "status", label: "Status (draft or published)", placeholder: "draft" },
  { key: "title", label: "Title", placeholder: "Give this piece a name" },
  { key: "slug", label: "Slug", placeholder: "a-short-url-name" },
  { key: "excerpt", label: "Short description", placeholder: "One sentence for the archive and search", multiline: true },
  { key: "tags", label: "Tags", placeholder: "ideas, memory, coffee" },
  { key: "image", label: "Cover image path", placeholder: "/images/notes/your-photo.jpg" },
  { key: "imageAlt", label: "Image description", placeholder: "Describe the image for readers who can't see it" },
  { key: "imageCaption", label: "Caption", placeholder: "Where, when, or what this is" },
];
const specialFields: Record<Kind, Field[]> = {
  note: [
    { key: "category", label: "Category", placeholder: "Ideas" },
    { key: "date", label: "Date", placeholder: "27 Sep 2026" },
    { key: "read", label: "Reading time", placeholder: "3 min" },
    { key: "intro", label: "Opening thought", placeholder: "An opening sentence, if you want one", multiline: true },
    { key: "pullQuote", label: "A line to pull out", placeholder: "A thought worth keeping", multiline: true },
  ],
  book: [
    { key: "author", label: "Author", placeholder: "Author's name" },
    { key: "year", label: "Publication year", placeholder: "2024" },
    { key: "genre", label: "Genre", placeholder: "Fiction" },
    { key: "thought", label: "First thought", placeholder: "What this book felt like", multiline: true },
    { key: "stayed", label: "What stayed with me", placeholder: "The idea that stayed", multiline: true },
    { key: "margin", label: "In the margin", placeholder: "A small aside", multiline: true },
  ],
  project: [
    { key: "stage", label: "Stage", placeholder: "experiment" },
    { key: "tech", label: "Tools", placeholder: "React · Python" },
    { key: "summary", label: "Summary", placeholder: "What it is", multiline: true },
    { key: "question", label: "The question", placeholder: "What were you trying to find out?", multiline: true },
  ],
  travel: [
    { key: "place", label: "Place", placeholder: "Where did you go?" },
    { key: "detail", label: "When / details", placeholder: "September · rain · long walks" },
    { key: "coordinates", label: "Coordinates", placeholder: "51.4816° N, 3.1791° W" },
    { key: "thought", label: "First impression", placeholder: "What did this place leave with you?", multiline: true },
  ],
};

const today = () => new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(new Date());
const starterBodies: Record<Kind, string> = {
  note: "## The beginning\n\nStart anywhere. This is where the thought begins.\n\n## Another thread\n\nFollow it wherever it goes.\n",
  book: "## What I noticed\n\nWhat did this book make you think about?\n\n> A line from the book that stayed with you.\n\nAnd why did it stay?\n\n## After the last page\n\nWhat feels different now?\n",
  project: "## Where it began\n\nWhat were you curious about?\n\n## The awkward middle\n\nWhat changed as you built it?\n\n## What I learned\n\nThe parts worth remembering.\n",
  travel: "## Arriving\n\nStart with a moment, not a guidebook.\n\n## The part I keep remembering\n\nA small detail from the journey.\n\n## On the way back\n\nWhat came home with you?\n",
};
const makeTemplate = (kind: Kind): Draft => ({ kind, fields: { status: "draft", ...(kind === "note" ? { date: today(), category: "Ideas", read: "3 min", tags: [], sections: [], backlinks: [] } : kind === "book" ? { year: "", genre: "", tags: [], reflection: "", quotes: [], sections: [], links: [] } : {}) }, body: starterBodies[kind] });
const storageKey = "ek-editor-document-v2";
const slugify = (value: string) => value.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const asText = (value: unknown) => typeof value === "string" || typeof value === "number" ? String(value) : "";
const serialize = (doc: Draft) => {
  const { fields, body } = doc;
  const metadata = Object.fromEntries(Object.entries(fields).filter(([, value]) => value !== "" && value !== undefined));
  metadata["kind"] = doc.kind;
  if (doc.kind === "travel") {
    // Travel entries use place rather than title in the existing archive.
    delete metadata["title"];
  } else if (!metadata["slug"]) {
    metadata["slug"] = slugify(asText(metadata["title"])) || "untitled";
  }
  if (typeof metadata["tags"] === "string") metadata["tags"] = metadata["tags"].split(",").map((tag) => tag.trim()).filter(Boolean);
  return `---\n${stringify(metadata, { lineWidth: 0 }).trimEnd()}\n---\n\n${body.trimEnd()}\n`;
};
const parseSource = (source: string): Draft => {
  const match = source.replace(/\r\n/g, "\n").match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) throw new Error("The file needs a --- line above and below its details.");
  const fields = parse(match[1] ?? "");
  if (!fields || typeof fields !== "object" || Array.isArray(fields)) throw new Error("The details at the top need to be a list of names and values.");
  const declared = fields["kind"];
  const kind: Kind = declared === "note" || declared === "book" || declared === "project" || declared === "travel" ? declared : fields["place"] ? "travel" : fields["author"] || fields["genre"] || fields["quotes"] ? "book" : fields["stage"] || fields["tech"] ? "project" : "note";
  return { kind, fields: fields as Record<string, unknown>, body: match[2]?.trimStart() ?? "" };
};

export function Editor() {
  const [doc, setDoc] = useState<Draft>(() => makeTemplate("note"));
  const [mode, setMode] = useState<Mode>("write");
  const [source, setSource] = useState("");
  const [error, setError] = useState("");
  const [savedSnapshot, setSavedSnapshot] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(true);
  const [copied, setCopied] = useState(false);
  const textarea = useRef<HTMLTextAreaElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  // Restoring the draft from localStorage must wait until after hydration.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const value = JSON.parse(stored) as Draft;
        if (value.fields && typeof value.body === "string" && ["note", "book", "project", "travel"].includes(value.kind)) setDoc(value);
      } else {
        const old = localStorage.getItem("ek-editor-draft");
        if (old) setDoc(parseSource(old));
      }
    } catch { /* An invalid old draft should not block writing. */ }
    setLoaded(true);
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!loaded) return;
    const snapshot = JSON.stringify(doc);
    const timer = window.setTimeout(() => { try { localStorage.setItem(storageKey, snapshot); setSavedSnapshot(snapshot); } catch { /* storage full or blocked */ } }, 450);
    return () => window.clearTimeout(timer);
  }, [doc, loaded]);
  const saved = savedSnapshot === JSON.stringify(doc);

  const update = (key: string, value: string) => setDoc((previous) => ({ ...previous, fields: { ...previous.fields, [key]: value } }));
  const switchMode = (next: Mode) => {
    if (mode === "source" && next !== "source") {
      try { setDoc(parseSource(source)); setError(""); } catch (issue) { setError((issue as Error).message); return; }
    }
    if (next === "source" && mode !== "source") setSource(serialize(doc));
    setMode(next);
  };
  const current = mode === "source" ? source : serialize(doc);
  const title = asText(doc.fields["title"]) || asText(doc.fields["place"]);
  let downloadDoc = doc;
  if (mode === "source") { try { downloadDoc = parseSource(source); } catch { /* Download reports invalid source below. */ } }
  const downloadTitle = asText(downloadDoc.fields["title"]) || asText(downloadDoc.fields["place"]);
  const fileName = `${slugify(asText(downloadDoc.fields["slug"]) || downloadTitle) || "untitled"}.mdx`;
  const download = () => {
    if (mode === "source") {
      try { parseSource(source); setError(""); } catch (issue) { setError((issue as Error).message); return; }
    }
    const url = URL.createObjectURL(new Blob([current], { type: "text/markdown;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url; link.download = fileName; link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const openFile = async (file?: File) => {
    if (!file) return;
    try { const parsed = parseSource(await file.text()); setDoc(parsed); setMode("write"); setError(""); }
    catch (issue) { setError((issue as Error).message); }
    if (fileInput.current) fileInput.current.value = "";
  };
  const insert = (before: string, after = "", placeholder = "text") => {
    const element = textarea.current;
    if (!element) { switchMode("write"); return; }
    const start = element.selectionStart, end = element.selectionEnd;
    const selected = doc.body.slice(start, end) || placeholder;
    const replacement = before + selected + after;
    setDoc((previous) => ({ ...previous, body: previous.body.slice(0, start) + replacement + previous.body.slice(end) }));
    requestAnimationFrame(() => { element.focus(); element.setSelectionRange(start + before.length, start + before.length + selected.length); });
  };
  const loadTemplate = (kind: Kind) => {
    if (doc.body.trim() && !window.confirm("Start a new piece? Your current draft will be replaced.")) return;
    setDoc(makeTemplate(kind)); setMode("write"); setError("");
  };

  return <main className="mx-auto max-w-[1320px] px-4 pb-20 pt-8 sm:px-6 sm:pt-12">
    <div className="flex flex-wrap items-end justify-between gap-5 border-b border-border pb-6">
      <div><Meta>THE WRITING DESK / {doc.kind.toUpperCase()}</Meta><h1 className="mt-3 font-display text-3xl font-bold sm:text-4xl">A place to put words.</h1><p className="mt-2 font-serif text-sm italic text-muted-foreground">{saved ? "Draft saved in this browser" : "Writing…"}</p></div>
      <div className="flex flex-wrap items-center gap-2">
        <input ref={fileInput} type="file" accept=".mdx,.md" className="hidden" aria-label="Open MDX file" onChange={(event) => void openFile(event.target.files?.[0])} />
        <Button variant="outline" onClick={() => fileInput.current?.click()}><FolderOpen /> Open file</Button>
        <Button variant="outline" onClick={async () => { try { await navigator.clipboard.writeText(current); setCopied(true); window.setTimeout(() => setCopied(false), 1600); } catch { setError("Couldn't copy to the clipboard. Select the MDX tab and copy manually."); } }} aria-label="Copy MDX">{copied ? <ClipboardCheck /> : <ClipboardCopy />} {copied ? "Copied" : "Copy"}</Button>
        <Button onClick={download}><FileDown /> Download .mdx</Button>
      </div>
    </div>
    {error && <div role="alert" className="mt-4 border-l-2 border-destructive bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}
    <div className="mt-6 flex flex-wrap items-center gap-2 border-b border-border pb-5">
      <Meta>START WITH A TEMPLATE</Meta>
      <div className="flex flex-wrap gap-1 sm:ml-4">
          {(["note", "book", "project", "travel"] as const).map((kind) => <Button key={kind} variant={doc.kind === kind ? "secondary" : "ghost"} className="justify-start capitalize" onClick={() => loadTemplate(kind)}><NotebookPen /> {kind}</Button>)}
      </div>
    </div>
    <div className="mt-8 grid gap-8 lg:grid-cols-[250px_minmax(0,1fr)] xl:grid-cols-[280px_minmax(0,1fr)]">
      <aside className="order-2 border-t border-border pt-5 lg:order-1 lg:border-r lg:border-t-0 lg:pr-6 lg:pt-0">
        <Button variant="ghost" className="w-full justify-between px-0 font-display font-semibold" onClick={() => setDetailsOpen(!detailsOpen)} aria-expanded={detailsOpen}>Details <ChevronsUpDown className={detailsOpen ? "rotate-180" : ""} /></Button>
        {detailsOpen && <div className="mt-3 space-y-5">
          <p className="font-serif text-sm italic leading-6 text-muted-foreground">These help the piece find its place. Leave anything you don&apos;t need blank.</p>
          {[...commonFields, ...specialFields[doc.kind]].filter((field) => doc.kind !== "travel" || !["title", "excerpt", "tags", "slug"].includes(field.key)).map((field) => <label key={field.key} className="block">
            <span className="mb-1.5 block font-mono text-[11px] text-muted-foreground">{field.label}</span>
            {field.multiline ? <textarea value={asText(doc.fields[field.key])} onChange={(event) => update(field.key, event.target.value)} placeholder={field.placeholder} rows={3} className="w-full resize-y rounded border border-input bg-background px-3 py-2 font-body text-sm leading-6 outline-none placeholder:text-muted-foreground/60 focus:border-primary" /> : <input value={field.key === "tags" && Array.isArray(doc.fields["tags"]) ? doc.fields["tags"].join(", ") : asText(doc.fields[field.key])} onChange={(event) => update(field.key, event.target.value)} placeholder={field.placeholder} className="w-full rounded border border-input bg-background px-3 py-2 font-body text-sm outline-none placeholder:text-muted-foreground/60 focus:border-primary" />}
          </label>)}
        </div>}
      </aside>
      <section className="order-1 min-w-0 lg:order-2">
        <div className="flex items-center justify-between gap-3 border-b border-border pb-3">
          <div className="flex items-center gap-1" role="tablist" aria-label="Writing view">
            {([ ["write", PenLine, "Write"], ["preview", Eye, "Preview"], ["source", FileCode2, "MDX" ]] as const).map(([value, Icon, label]) => <Button key={value} role="tab" aria-selected={mode === value} variant={mode === value ? "secondary" : "ghost"} size="sm" onClick={() => switchMode(value)}><Icon /> {label}</Button>)}
          </div>
          <span className="hidden font-mono text-[10px] text-muted-foreground sm:block">{doc.body.trim().split(/\s+/).filter(Boolean).length} words</span>
        </div>
        {mode === "write" && <div className="mx-auto max-w-[740px] pt-8 sm:pt-12">
          <input aria-label={doc.kind === "travel" ? "Place" : "Title"} value={asText(doc.kind === "travel" ? doc.fields["place"] : doc.fields["title"])} onChange={(event) => update(doc.kind === "travel" ? "place" : "title", event.target.value)} placeholder={doc.kind === "travel" ? "Where did you go?" : "Your title goes here"} className="w-full border-0 bg-transparent font-display text-3xl font-bold leading-tight outline-none placeholder:text-muted-foreground/50 sm:text-5xl" />
          {doc.kind !== "travel" && <div className="mt-3 flex items-center gap-2 font-mono text-xs text-muted-foreground"><span>/ {doc.kind === "note" ? "garden" : `${doc.kind}s`} /</span><input aria-label="Slug" value={asText(doc.fields["slug"])} onChange={(event) => update("slug", event.target.value)} placeholder={slugify(title) || "your-slug"} className="min-w-0 flex-1 bg-transparent text-primary outline-none placeholder:text-muted-foreground/50" /></div>}
          <div className="mt-9 flex flex-wrap gap-1 border-y border-border py-2" aria-label="Formatting tools">
            <Button variant="ghost" size="icon" title="Heading" aria-label="Insert heading" onClick={() => insert("\n## ", "\n", "Heading")}><Heading2 /></Button>
            <Button variant="ghost" size="icon" title="Bold" aria-label="Insert bold" onClick={() => insert("**", "**")}>B</Button>
            <Button variant="ghost" size="icon" title="Italic" aria-label="Insert italic" onClick={() => insert("*", "*")}><i>I</i></Button>
            <Button variant="ghost" size="icon" title="Link" aria-label="Insert link" onClick={() => insert("[", "](https://example.com)", "link text")}><Link2 /></Button>
            <Button variant="ghost" size="icon" title="Image" aria-label="Insert image" onClick={() => insert("![", "](/images/your-photo.jpg)", "Describe the image")}><ImageUp /></Button>
            <Button variant="ghost" size="icon" title="Quote" aria-label="Insert quote" onClick={() => insert("\n> ", "\n", "Quote") }><TextQuote /></Button>
            <Button variant="ghost" size="icon" title="List" aria-label="Insert list" onClick={() => insert("\n- ", "\n", "List item")}><List /></Button>
            <Button variant="ghost" size="icon" title="Numbered list" aria-label="Insert numbered list" onClick={() => insert("\n1. ", "\n", "List item")}><ListOrdered /></Button>
          </div>
          <textarea ref={textarea} aria-label="Article body" value={doc.body} onChange={(event) => setDoc((previous) => ({ ...previous, body: event.target.value }))} placeholder="Begin with a moment, a question, or whatever is on your mind…" spellCheck className="mt-6 min-h-[65vh] w-full resize-y border-0 bg-transparent pb-12 font-serif text-lg leading-9 text-foreground outline-none placeholder:text-muted-foreground/50 sm:text-xl" />
        </div>}
        {mode === "preview" && <article className="editor-prose mx-auto max-w-[740px] py-10">
          <Meta>{asText(doc.fields["category"] || doc.fields["genre"] || doc.fields["stage"] || doc.fields["detail"])} {asText(doc.fields["date"] || doc.fields["year"])}</Meta>
          <h2 className="mt-4 font-display text-4xl font-bold leading-tight sm:text-5xl">{title || "Untitled"}</h2>
          {asText(doc.fields["author"]) && <p className="mt-3 font-mono text-sm text-muted-foreground">{asText(doc.fields["author"])}</p>}
          {asText(doc.fields["image"]) && <figure className="mt-8">{/* Arbitrary draft URL, so next/image optimisation does not apply. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={asText(doc.fields["image"])} alt={asText(doc.fields["imageAlt"])} className="w-full rounded border border-border" /><figcaption className="mt-2 font-mono text-xs text-muted-foreground">{asText(doc.fields["imageCaption"])}</figcaption></figure>}
          {asText(doc.fields["intro"] || doc.fields["thought"] || doc.fields["question"]) && <p className="mt-8 font-serif text-xl italic leading-8">{asText(doc.fields["intro"] || doc.fields["thought"] || doc.fields["question"])}</p>}
          {asText(doc.fields["pullQuote"]) && <blockquote>{asText(doc.fields["pullQuote"])}</blockquote>}
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{doc.body}</ReactMarkdown>
          {Array.isArray(doc.fields["sections"]) && doc.fields["sections"].map((section, index) => { const item = section as { heading?: string; paragraphs?: string[] }; return <section key={index}><h3>{item.heading}</h3>{item.paragraphs?.map((paragraph, i) => <p key={i}>{paragraph}</p>)}</section>; })}
          {Array.isArray(doc.fields["quotes"]) && doc.fields["quotes"].map((quote, index) => { const item = quote as { text?: string; note?: string }; return <blockquote key={index}>{item.text}<small className="block not-italic">{item.note}</small></blockquote>; })}
        </article>}
        {mode === "source" && <div className="pt-6"><p className="mb-4 font-serif text-sm italic text-muted-foreground">The full file. You can edit anything here, including extra details not shown in the form.</p><textarea aria-label="MDX source" value={source} onChange={(event) => { setSource(event.target.value); setError(""); }} spellCheck={false} className="min-h-[75vh] w-full resize-y rounded border border-input bg-card p-4 font-mono text-xs leading-6 outline-none focus:border-primary sm:text-sm" /></div>}
        <div className="mt-6 border-t border-border pt-4 font-mono text-[11px] text-muted-foreground">{fileName} · Saved here while you write. Download to keep a copy.</div>
      </section>
    </div>
  </main>;
}
