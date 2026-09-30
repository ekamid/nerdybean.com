import { getBook, getBooks } from "@/lib/content";
import { renderOgImage } from "@/lib/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Ebrahim Khalil";
export const generateStaticParams = () => getBooks().map((item) => ({ slug: item.slug }));

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const item = getBook((await params).slug);
  if (!item) return renderOgImage({ eyebrow: "Ebrahim Khalil", title: "Not found" });
  return renderOgImage({ eyebrow: `Reading journal · ${item.author}`, title: item.title, subtitle: item.thought });
}
