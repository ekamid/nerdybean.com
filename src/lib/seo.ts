import type { Metadata } from "next";
import { absoluteUrl, site } from "./site";

type PageMetaInput = {
  title: string;
  description: string;
  path: string;
  type?: "website" | "article" | "profile";
  publishedTime?: string;
  tags?: string[];
  image?: { url: string; alt: string; width?: number; height?: number };
  noIndex?: boolean;
};

/**
 * Builds consistent per-page metadata: canonical URL, Open Graph and Twitter cards.
 * When no image is passed, the route's generated `opengraph-image` is used automatically.
 */
export function pageMetadata({
  title,
  description,
  path,
  type = "website",
  publishedTime,
  tags,
  image,
  noIndex,
}: PageMetaInput): Metadata {
  const images = image ? [{ width: 1200, height: 630, ...image }] : undefined;
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      title,
      description,
      url: path,
      type,
      siteName: site.name,
      locale: site.locale,
      ...(images && { images }),
      ...(type === "article" && {
        authors: [site.author.name],
        ...(publishedTime && { publishedTime }),
        ...(tags && { tags }),
      }),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      ...(images && { images: images.map((i) => i.url) }),
    },
    ...(noIndex && { robots: { index: false, follow: true } }),
  };
}

export const personId = absoluteUrl("/#person");
export const websiteId = absoluteUrl("/#website");

export const personJsonLd = {
  "@type": "Person",
  "@id": personId,
  name: site.author.name,
  url: absoluteUrl("/"),
  jobTitle: site.author.jobTitle,
  sameAs: [site.social.linkedin],
  address: { "@type": "PostalAddress", addressLocality: "Cardiff", addressCountry: "GB" },
  knowsAbout: ["Software engineering", "Artificial intelligence", "Machine learning", "Mobile applications", "Web applications"],
};

export const websiteJsonLd = {
  "@type": "WebSite",
  "@id": websiteId,
  url: absoluteUrl("/"),
  name: site.name,
  description: site.description,
  inLanguage: site.language,
  publisher: { "@id": personId },
};

export function breadcrumbJsonLd(items: { name: string; path: string }[]) {
  return {
    "@type": "BreadcrumbList",
    itemListElement: [{ name: "Home", path: "/" }, ...items].map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

export function itemListJsonLd(name: string, path: string, items: { name: string; path: string }[]) {
  return {
    "@type": "CollectionPage",
    name,
    url: absoluteUrl(path),
    isPartOf: { "@id": websiteId },
    mainEntity: {
      "@type": "ItemList",
      itemListElement: items.map((item, index) => ({
        "@type": "ListItem",
        position: index + 1,
        url: absoluteUrl(item.path),
        name: item.name,
      })),
    },
  };
}
