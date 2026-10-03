"use client";

import { createContext, useContext, useEffect, useRef, useState, useTransition, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import ReactMarkdown, { defaultUrlTransform } from "react-markdown";
import remarkGfm from "remark-gfm";
import { ArrowDown, ArrowLeft, ArrowUp, ExternalLink, Eye, Heading2, ImageUp, Link2, List, PenLine, Plus, TextQuote, Trash2, X } from "lucide-react";
import { deleteEntry, saveEntry } from "@/app/admin/actions";
import { StatusBadge } from "@/components/admin/status-badge";
import { Meta } from "@/components/site/primitives";
import { Button, buttonVariants } from "@/components/ui/button";
import { getCollection, type Data, type Field } from "@/lib/admin/collections";
import type { Entry } from "@/lib/admin/entries";

/**
 * The editing form. Everything is held in React state and sent to the `saveEntry` server action
 * in one go. A new image isn't uploaded straight away: it gets a placeholder value "upload:<id>"
 * and is previewed from the browser's memory; on save the file travels with the form, and the
 * server swaps the placeholder for the image's real path.
 */

type Uploads = { add: (file: File) => string | null; src: (value: string) => string };
const UploadsContext = createContext<Uploads>({ add: () => null, src: (v) => v });

const maxImageBytes = 4 * 1024 * 1024;
const imageAccept = "image/jpeg,image/png,image/webp,image/avif,image/gif";
const inputClass = "w-full rounded border border-input bg-background px-3 py-2 font-body text-sm outline-none placeholder:text-muted-foreground/60 focus:border-primary";
const asString = (value: unknown) => (typeof value === "string" ? value : "");
const move = <T,>(list: T[], from: number, to: number) => {
  const next = [...list];
  next.splice(to, 0, ...next.splice(from, 1));
  return next;
};
const replaceAt = <T,>(list: T[], index: number, value: T) => list.map((item, i) => (i === index ? value : item));
/** A new item in a group, with selects and dates already filled so the build's checks pass. */
const newItem = (fields: Field[]): Data =>
  Object.fromEntries(fields.flatMap((f) => (f.kind === "select" ? [[f.name, f.options[0]?.value]] : f.kind === "date" ? [[f.name, new Date().toISOString().slice(0, 10)]] : [])));

type Props = { collection: string; isNew: boolean; entry: Entry; justSaved: boolean; storageMode: "local" | "github" };

export function EntryForm({ collection, isNew, entry, justSaved, storageMode }: Props) {
  const c = getCollection(collection)!;
  const [data, setData] = useState<Data>(entry.data);
  const [body, setBody] = useState(entry.body);
  const [slug, setSlug] = useState(entry.slug);
  // For a new entry the file name follows the title until you type your own.
  const [slugTouched, setSlugTouched] = useState(!isNew);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const files = useRef(new Map<string, { file: File; url: string }>());
  const fileName = slugTouched ? slug : c.suggestSlug(data);

  const [uploads] = useState<Uploads>(() => ({
    add(file) {
      if (file.size > maxImageBytes) {
        setError(`${file.name} is larger than 4 MB. Export a smaller copy first.`);
        return null;
      }
      const id = `upload:${crypto.randomUUID()}`;
      files.current.set(id, { file, url: URL.createObjectURL(file) });
      return id;
    },
    src: (value) => files.current.get(value)?.url ?? value,
  }));

  // Warn before leaving the page with unsaved changes.
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const setField = (name: string, value: unknown) => {
    setData((previous) => ({ ...previous, [name]: value }));
    setDirty(true);
  };

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    const form = new FormData();
    form.set("collection", c.name);
    form.set("slug", fileName);
    form.set("isNew", String(isNew));
    form.set("status", submitter?.value === "published" ? "published" : "draft");
    const json = JSON.stringify(data);
    form.set("data", json);
    form.set("body", body);
    // Only send images that are still used somewhere.
    for (const [id, { file }] of files.current) if (json.includes(id) || body.includes(id)) form.set(id, file);
    setError("");
    startTransition(async () => {
      const result = await saveEntry(form); // on success the server redirects to the saved entry
      if (result?.error) setError(result.error);
    });
  }

  function remove() {
    if (!window.confirm(`Delete "${asString(data[c.titleField]) || entry.slug}"? This removes the file${storageMode === "github" ? " in a commit to master" : ""}.`)) return;
    startTransition(async () => {
      const result = await deleteEntry(c.name, entry.slug);
      if (result?.error) setError(result.error);
    });
  }

  const published = entry.status === "published";
  const liveUrl = !isNew && published && c.url?.(entry.slug);
  const actions = <div className="flex flex-wrap items-center gap-2">
    {published
      ? <><Button type="submit" value="published" disabled={pending}>Update</Button><Button type="submit" value="draft" variant="outline" disabled={pending}>Unpublish</Button></>
      : <><Button type="submit" value="draft" variant="outline" disabled={pending}>Save draft</Button><Button type="submit" value="published" disabled={pending}>Publish</Button></>}
    {pending ? <Meta>Saving…</Meta> : justSaved && !dirty && <Meta>Saved ✓</Meta>}
  </div>;

  return <UploadsContext.Provider value={uploads}>
    <main className="mx-auto max-w-[900px] px-4 pb-24 sm:px-6">
      <form onSubmit={save}>
        <div className="sticky top-14 z-30 -mx-4 flex flex-wrap items-center justify-between gap-3 border-b border-border bg-background/90 px-4 py-3 backdrop-blur-md sm:-mx-6 sm:px-6">
          <Link href="/admin" className="flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground hover:text-foreground"><ArrowLeft className="size-3.5" /> All content</Link>
          {actions}
        </div>

        <div className="pt-8 sm:pt-12">
          <div className="flex items-center gap-3"><Meta>ADMIN / {c.label} / {isNew ? "NEW" : "EDITING"}</Meta>{!isNew && <StatusBadge status={entry.status} />}{dirty && <Meta>· unsaved changes</Meta>}</div>
          <input
            aria-label={c.fields.find((f) => f.name === c.titleField)?.label}
            required
            value={asString(data[c.titleField])}
            onChange={(e) => setField(c.titleField, e.target.value)}
            placeholder={c.fields.find((f) => f.name === c.titleField)?.label}
            className="mt-4 w-full border-0 bg-transparent font-display text-3xl font-bold leading-tight outline-none placeholder:text-muted-foreground/50 sm:text-5xl"
          />
          <div className="mt-3 flex items-center gap-2 font-mono text-xs text-muted-foreground">
            <span>src/content/{c.folder}/</span>
            {isNew
              ? <input aria-label="File name" required pattern="[a-z0-9]+(-[a-z0-9]+)*" value={fileName} onChange={(e) => { setSlug(e.target.value); setSlugTouched(true); }} placeholder="file-name" className="min-w-0 flex-1 bg-transparent text-primary outline-none placeholder:text-muted-foreground/50" />
              : <span className="text-foreground">{entry.slug}</span>}
            <span>.{c.extension}</span>
          </div>
          {isNew && c.slugHint && <p className="mt-1 font-serif text-xs italic text-muted-foreground">{c.slugHint}</p>}
        </div>

        {justSaved && !dirty && <p role="status" className="mt-6 border-l-2 border-primary bg-primary/10 p-3 text-sm">
          Saved{storageMode === "github" ? ` and committed to master. ${published ? "The live site updates once Netlify finishes deploying." : "It's a draft, so it stays off the live site."}` : ` to src/content/${c.folder}/${entry.slug}.${c.extension}. Commit it with git to publish.`}
          {liveUrl && <> <a href={liveUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">View live <ExternalLink className="size-3" /></a></>}
        </p>}
        {error && <p role="alert" className="mt-6 border-l-2 border-destructive bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}

        <section className="mt-10 grid gap-x-6 gap-y-6 sm:grid-cols-2">
          {c.fields.filter((f) => f.name !== c.titleField).map((field) => <FieldRow key={field.name} field={field} value={data[field.name]} onChange={(v) => setField(field.name, v)} />)}
        </section>

        {c.body && <BodyEditor value={body} onChange={(v) => { setBody(v); setDirty(true); }} />}

        <div className="mt-12 flex flex-wrap items-center justify-between gap-4 border-t border-border pt-6">
          {actions}
          <div className="flex items-center gap-2">
            {liveUrl && <a href={liveUrl} target="_blank" rel="noopener noreferrer" className={buttonVariants({ variant: "ghost", size: "sm" })}><ExternalLink /> View live</a>}
            {!isNew && <Button type="button" variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={remove} disabled={pending}><Trash2 /> Delete</Button>}
          </div>
        </div>
      </form>
    </main>
  </UploadsContext.Provider>;
}

/** One field: its label and hint around the right input for its kind. Long fields span both columns. */
function FieldRow({ field, value, onChange }: { field: Field; value: unknown; onChange: (value: unknown) => void }) {
  const wide = field.kind === "group" || field.kind === "list" || field.kind === "image" || (field.kind === "text" && field.multiline);
  const required = (field.kind === "text" || field.kind === "date") && field.required;
  return <div className={wide ? "sm:col-span-2" : ""}>
    <span className="mb-1.5 block font-mono text-[11px] text-muted-foreground">{field.label}{required && <span className="text-primary"> *</span>}</span>
    <FieldInput field={field} value={value} onChange={onChange} />
    {field.hint && <p className="mt-1.5 font-serif text-xs italic text-muted-foreground">{field.hint}</p>}
  </div>;
}

function FieldInput({ field, value, onChange }: { field: Field; value: unknown; onChange: (value: unknown) => void }) {
  switch (field.kind) {
    case "text":
      return field.multiline
        ? <textarea aria-label={field.label} required={field.required} value={asString(value)} onChange={(e) => onChange(e.target.value)} rows={3} className={`${inputClass} resize-y leading-6`} />
        : <input aria-label={field.label} required={field.required} value={asString(value)} onChange={(e) => onChange(e.target.value)} className={inputClass} />;
    case "date":
      return <input type="date" aria-label={field.label} required={field.required} value={asString(value)} onChange={(e) => onChange(e.target.value)} className={inputClass} />;
    case "select":
      return <select aria-label={field.label} value={asString(value) || field.options[0]?.value} onChange={(e) => onChange(e.target.value)} className={inputClass}>
        {field.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>;
    case "image":
      return <ImageInput label={field.label} value={asString(value)} onChange={onChange} />;
    case "list": {
      const items = Array.isArray(value) ? (value as string[]) : [];
      return <div className="space-y-2">
        {items.map((item, i) => <div key={i} className="flex items-start gap-2">
          {field.multiline
            ? <textarea aria-label={`${field.label} ${i + 1}`} value={item} onChange={(e) => onChange(replaceAt(items, i, e.target.value))} rows={3} className={`${inputClass} resize-y leading-6`} />
            : <input aria-label={`${field.label} ${i + 1}`} value={item} onChange={(e) => onChange(replaceAt(items, i, e.target.value))} className={inputClass} />}
          <ItemTools index={i} count={items.length} onMove={(to) => onChange(move(items, i, to))} onRemove={() => onChange(items.filter((_, j) => j !== i))} />
        </div>)}
        <Button type="button" variant="ghost" size="sm" onClick={() => onChange([...items, ""])}><Plus /> Add</Button>
      </div>;
    }
    case "group": {
      const items = Array.isArray(value) ? (value as Data[]) : [];
      return <div className="space-y-3">
        {items.map((item, i) => <fieldset key={i} className="surface rounded-md p-4">
          <div className="flex items-center justify-between gap-3">
            <legend className="min-w-0 truncate"><Meta>{String(i + 1).padStart(2, "0")} · {asString(item[field.itemLabel]).slice(0, 60) || "new"}</Meta></legend>
            <ItemTools index={i} count={items.length} onMove={(to) => onChange(move(items, i, to))} onRemove={() => onChange(items.filter((_, j) => j !== i))} />
          </div>
          <div className="mt-3 grid gap-x-4 gap-y-4 sm:grid-cols-2">
            {field.fields.map((sub) => <FieldRow key={sub.name} field={sub} value={item[sub.name]} onChange={(v) => onChange(replaceAt(items, i, { ...item, [sub.name]: v }))} />)}
          </div>
        </fieldset>)}
        <Button type="button" variant="ghost" size="sm" onClick={() => onChange([...items, newItem(field.fields)])}><Plus /> Add</Button>
      </div>;
    }
  }
}

function ItemTools({ index, count, onMove, onRemove }: { index: number; count: number; onMove: (to: number) => void; onRemove: () => void }) {
  return <div className="flex shrink-0 items-center">
    <Button type="button" variant="ghost" size="icon" className="size-8" aria-label="Move up" disabled={index === 0} onClick={() => onMove(index - 1)}><ArrowUp /></Button>
    <Button type="button" variant="ghost" size="icon" className="size-8" aria-label="Move down" disabled={index === count - 1} onClick={() => onMove(index + 1)}><ArrowDown /></Button>
    <Button type="button" variant="ghost" size="icon" className="size-8" aria-label="Remove" onClick={onRemove}><X /></Button>
  </div>;
}

function ImageInput({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  const uploads = useContext(UploadsContext);
  return <div className="flex items-start gap-4">
    {value
      // A local preview (blob: URL) or a path that may not be deployed yet, so not next/image.
      // eslint-disable-next-line @next/next/no-img-element
      ? <img src={uploads.src(value)} alt="" className="h-24 w-36 shrink-0 rounded border border-border object-cover" />
      : <div className="grid h-24 w-36 shrink-0 place-items-center rounded border border-dashed border-border"><Meta>No image</Meta></div>}
    <div className="flex min-w-0 flex-col items-start gap-2">
      <label className={`${buttonVariants({ variant: "outline", size: "sm" })} focus-within:ring-1 focus-within:ring-ring`}>
        <ImageUp /> {value ? "Replace" : "Choose image"}
        <input type="file" accept={imageAccept} aria-label={label} className="sr-only" onChange={(e) => { const file = e.target.files?.[0]; const id = file && uploads.add(file); if (id) onChange(id); e.target.value = ""; }} />
      </label>
      {value && <Button type="button" variant="ghost" size="sm" onClick={() => onChange("")}>Remove</Button>}
      <span className="max-w-full truncate font-mono text-[10px] text-muted-foreground">{value.startsWith("upload:") ? "Uploads when you save" : value}</span>
    </div>
  </div>;
}

function BodyEditor({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const uploads = useContext(UploadsContext);
  const [preview, setPreview] = useState(false);
  const textarea = useRef<HTMLTextAreaElement>(null);
  const imagePicker = useRef<HTMLInputElement>(null);

  /** Wraps the selection (or a placeholder) in Markdown, e.g. **bold**. */
  const insert = (before: string, after = "", placeholder = "text") => {
    const element = textarea.current;
    if (!element) return;
    const { selectionStart: start, selectionEnd: end } = element;
    const selected = value.slice(start, end) || placeholder;
    onChange(value.slice(0, start) + before + selected + after + value.slice(end));
    requestAnimationFrame(() => { element.focus(); element.setSelectionRange(start + before.length, start + before.length + selected.length); });
  };

  return <section className="mt-12">
    <div className="flex items-center justify-between gap-3 border-b border-border pb-3">
      <div className="flex items-center gap-3"><Meta>Body</Meta><span className="font-serif text-xs italic text-muted-foreground">Markdown, shown below the details.</span></div>
      <div className="flex items-center gap-1" role="tablist" aria-label="Body view">
        <Button type="button" role="tab" aria-selected={!preview} variant={preview ? "ghost" : "secondary"} size="sm" onClick={() => setPreview(false)}><PenLine /> Write</Button>
        <Button type="button" role="tab" aria-selected={preview} variant={preview ? "secondary" : "ghost"} size="sm" onClick={() => setPreview(true)}><Eye /> Preview</Button>
      </div>
    </div>
    {preview
      ? <div className="editor-prose min-h-[40vh] py-8">
          {value.trim()
            ? <ReactMarkdown remarkPlugins={[remarkGfm]} urlTransform={(url) => (url.startsWith("upload:") ? uploads.src(url) : defaultUrlTransform(url))}>{value}</ReactMarkdown>
            : <p className="font-serif italic text-muted-foreground">Nothing written yet.</p>}
        </div>
      : <>
          <div className="mt-3 flex flex-wrap gap-1" aria-label="Formatting">
            <Tool label="Heading" onClick={() => insert("\n## ", "\n", "Heading")}><Heading2 /></Tool>
            <Tool label="Bold" onClick={() => insert("**", "**")}><b>B</b></Tool>
            <Tool label="Italic" onClick={() => insert("*", "*")}><i>I</i></Tool>
            <Tool label="Link" onClick={() => insert("[", "](https://)", "link text")}><Link2 /></Tool>
            <Tool label="Quote" onClick={() => insert("\n> ", "\n", "Quote")}><TextQuote /></Tool>
            <Tool label="List" onClick={() => insert("\n- ", "\n", "List item")}><List /></Tool>
            <Tool label="Image" onClick={() => imagePicker.current?.click()}><ImageUp /></Tool>
            <input ref={imagePicker} type="file" accept={imageAccept} className="hidden" onChange={(e) => { const file = e.target.files?.[0]; const id = file && uploads.add(file); if (id) insert("\n![", `](${id})\n`, "Describe the image"); e.target.value = ""; }} />
          </div>
          <textarea ref={textarea} aria-label="Body" value={value} onChange={(e) => onChange(e.target.value)} placeholder="Begin with a moment, a question, or whatever is on your mind…" spellCheck className="mt-3 min-h-[40vh] w-full resize-y rounded border border-input bg-background p-4 font-serif text-lg leading-8 outline-none placeholder:text-muted-foreground/50 focus:border-primary" />
        </>}
  </section>;
}

function Tool({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return <Button type="button" variant="ghost" size="icon" title={label} aria-label={label} onClick={onClick}>{children}</Button>;
}
