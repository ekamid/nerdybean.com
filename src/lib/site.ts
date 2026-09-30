function resolveSiteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return explicit.replace(/\/+$/, "");
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (vercel) return `https://${vercel}`;
  return "http://localhost:3000";
}

export const site = {
  url: resolveSiteUrl(),
  name: "Ebrahim Khalil",
  title: "Ebrahim Khalil — software developer, AI student, long-distance runner",
  shortTitle: "Ebrahim Khalil",
  description:
    "Ebrahim Khalil’s digital garden: essays on AI and software engineering, project write-ups, reading notes, and lessons from running, mountains and coffee.",
  locale: "en_GB",
  language: "en-GB",
  author: {
    name: "Ebrahim Khalil",
    jobTitle: "Software developer & MSc Artificial Intelligence student",
    location: "Cardiff, Wales",
  },
  keywords: [
    "Ebrahim Khalil",
    "software developer",
    "artificial intelligence",
    "machine learning",
    "digital garden",
    "Cardiff",
    "Wales",
    "travel",
    "running",
    "books",
    "coffee",
  ],
} as const;

export const absoluteUrl = (path = "/") => new URL(path, `${site.url}/`).toString();
