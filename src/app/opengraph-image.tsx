import { renderOgImage } from "@/lib/og";
import { site } from "@/lib/site";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = site.title;

export default function Image() {
  return renderOgImage({ eyebrow: "Notes from Cardiff, written in public", title: "Building software. Walking uphill.", subtitle: "Essays on AI and engineering, project write-ups, reading notes, and lessons from running and mountains." });
}
