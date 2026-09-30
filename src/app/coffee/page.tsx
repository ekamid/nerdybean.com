import type { Metadata } from "next";
import { Meta, PageIntro } from "@/components/site/page";
import { JsonLd } from "@/components/site/json-ld";
import { breadcrumbJsonLd, pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Coffee Lab — brew log, ratios & recipes",
  description: "Ebrahim Khalil’s coffee brew log: V60, AeroPress, French press and moka pot recipes with dose, water, ratio and tasting notes, plus the experiment currently running.",
  path: "/coffee",
});

const headers = ["Coffee", "Dose", "Water", "Ratio", "Method", "Result"];
const brews = [["Kenya AA, washed", "15g", "250g", "1:16.7", "V60 · 93°C", "blackcurrant, bright; grind one step finer next time"], ["Ethiopia Guji, natural", "18g", "300g", "1:16.7", "V60 · 92°C", "blueberry, heavy; stalled drawdown"], ["Guatemala Huehuetenango", "16g", "220g", "1:13.8", "AeroPress · 85°C", "cocoa, clean; best as a quick weekday cup"], ["Colombia decaf", "30g", "500g", "1:16.7", "French press · 4 min", "caramel, gentle; evening cup"], ["Brazil Mogiana", "17g", "~170g", "≈1:10", "Moka pot", "nutty, strong; take off the heat early"]];

export default function CoffeePage() {
  return <main className="mx-auto max-w-[1200px] px-4 sm:px-6">
    <JsonLd data={breadcrumbJsonLd([{ name: "Coffee Lab", path: "/coffee" }])} />
    <PageIntro eyebrow="COFFEE LAB / BREW LOG" title="One variable at a time."><p>I change one thing per brew (grind, ratio, water temperature) and write down what happens. It’s the most reliable experiment I run.</p></PageIntro>
    <section className="py-10"><div className="surface overflow-x-auto rounded-lg"><table className="w-full min-w-[760px] text-left font-mono text-xs"><caption className="sr-only">Brew log: coffee, dose, water, ratio, method and result</caption><thead className="border-b border-border text-[10px] uppercase tracking-wider text-muted-foreground"><tr>{headers.map((h) => <th scope="col" className="px-4 py-3 font-medium" key={h}>{h}</th>)}</tr></thead><tbody>{brews.map((b) => <tr className="border-b border-border last:border-0" key={b[0]}>{b.map((c, i) => i === 0 ? <th scope="row" className="px-4 py-4 font-normal" key={headers[i]}>{c}</th> : <td className={`px-4 py-4 ${i === 5 ? "text-primary" : ""}`} key={headers[i]}>{c}</td>)}</tr>)}</tbody></table></div></section>
    <section className="grid gap-8 border-t border-border py-12 md:grid-cols-3"><div><Meta>CURRENT QUESTION</Meta><h2 className="mt-3 font-display text-2xl font-bold">Does water temperature matter as much as grind size?</h2></div><p className="leading-7 text-muted-foreground md:col-span-2">For the next few weeks I’m brewing the same Kenyan coffee at 88°C, 92°C and 96°C with everything else fixed. So far, grind still seems to matter more, but lighter roasts clearly taste thinner at lower temperatures. The full notes will go into a garden essay once there’s enough data to be honest about.</p></section>
  </main>;
}
