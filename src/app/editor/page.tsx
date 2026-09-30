import type { Metadata } from "next";
import { Editor } from "@/components/editor/editor";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Writing desk",
  description: "Write freely, preview your words, and download a garden entry as an MDX file.",
  path: "/editor",
  noIndex: true,
});

export default function EditorPage() {
  return <Editor />;
}
