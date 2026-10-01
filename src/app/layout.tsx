import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono, Lora } from "next/font/google";
import type { ReactNode } from "react";

import "../styles.css";
import { JsonLd } from "@/components/site/json-ld";
import { SiteShell } from "@/components/site/site-shell";
import { personJsonLd, websiteJsonLd } from "@/lib/seo";
import { site } from "@/lib/site";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const lora = Lora({ subsets: ["latin"], style: ["normal", "italic"], variable: "--font-lora", display: "swap" });
const mono = JetBrains_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-jetbrains-mono", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: { default: site.title, template: `%s — ${site.shortTitle}` },
  description: site.description,
  applicationName: site.name,
  authors: [{ name: site.author.name, url: site.url }],
  creator: site.author.name,
  publisher: site.author.name,
  keywords: [...site.keywords],
  category: "personal",
  alternates: {
    canonical: "/",
    types: { "application/rss+xml": [{ url: "/rss.xml", title: `${site.name} — Garden` }] },
  },
  openGraph: {
    type: "website",
    siteName: site.name,
    locale: site.locale,
    url: "/",
    title: site.title,
    description: site.description,
  },
  twitter: { card: "summary_large_image", title: site.title, description: site.description },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 },
  },
  formatDetection: { telephone: false, email: false, address: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#171c22",
};

// Dark by default; runs before first paint so a saved choice never flashes.
const themeScript = `(function(){try{document.documentElement.classList.toggle("dark",localStorage.getItem("ek-theme")!=="light")}catch(e){}})()`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en-GB" className={`dark ${inter.variable} ${lora.variable} ${mono.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <JsonLd data={[personJsonLd, websiteJsonLd]} />
        <SiteShell>{children}</SiteShell>
      </body>
    </html>
  );
}
