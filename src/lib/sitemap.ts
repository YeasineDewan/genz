import { seedProducts } from "./seed";

export const SITEMAP_BASE_URL = "https://gentle-store-forge.lovable.app";

export interface SitemapEntry {
  path: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: string;
  lastmod?: string;
}

export const productCategories = (): string[] =>
  [...new Set(seedProducts.map((p) => p.category))].sort();

/** Curated collections that map to shop filters. */
export const collections: { slug: string; label: string }[] = [
  { slug: "new", label: "New arrivals" },
  { slug: "hot", label: "Trending now" },
  { slug: "sale", label: "On sale" },
  { slug: "under-50", label: "Under $50" },
  { slug: "accessories", label: "Accessories" },
];

export const renderUrlset = (entries: SitemapEntry[]): string => {
  const urls = entries.map((e) =>
    [
      `  <url>`,
      `    <loc>${SITEMAP_BASE_URL}${e.path}</loc>`,
      e.lastmod ? `    <lastmod>${e.lastmod}</lastmod>` : null,
      e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
      e.priority ? `    <priority>${e.priority}</priority>` : null,
      `  </url>`,
    ].filter(Boolean).join("\n"),
  );
  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
    ...urls,
    `</urlset>`,
  ].join("\n");
};

export const xmlResponse = (xml: string) =>
  new Response(xml, {
    headers: {
      "Content-Type": "application/xml",
      "Cache-Control": "public, max-age=3600",
    },
  });
