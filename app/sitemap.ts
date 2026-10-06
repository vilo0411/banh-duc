import type { MetadataRoute } from "next";
import { getAllDocs, getPosts } from "@/lib/content";
import { publishedCollections } from "@/lib/collections";
import { absoluteUrl, site } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const posts = getPosts();
  const newest = posts[0]?.updated ?? new Date().toISOString();

  const listings: MetadataRoute.Sitemap = [
    { url: absoluteUrl("/"), lastModified: newest, changeFrequency: "weekly", priority: 1 },
    { url: absoluteUrl("/cong-thuc/"), lastModified: newest, changeFrequency: "weekly", priority: 0.9 },
    ...publishedCollections().map((collection) => ({
      url: absoluteUrl(`/cong-thuc/${collection.slug}/`),
      lastModified: newest,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
    {
      url: absoluteUrl(site.author.url),
      lastModified: newest,
      changeFrequency: "monthly",
      priority: 0.5,
    },
  ];
  // /tin-tuc/ is intentionally absent: it 301s to /cong-thuc/, and a sitemap
  // should only list URLs that answer for themselves.

  const docs: MetadataRoute.Sitemap = getAllDocs()
    // The listings above already cover these; a URL must appear only once.
    .filter((doc) => !["home", "tin-tuc"].includes(doc.slug))
    .map((doc) => ({
      url: absoluteUrl(doc.url),
      lastModified: doc.updated || doc.date,
      // Cẩm nang đứng ngang công thức: đó là nội dung chủ đề, không phải trang
      // thủ tục như chính sách hay liên hệ.
      changeFrequency: doc.collection === "pages" ? "yearly" : "monthly",
      priority: doc.collection === "pages" ? 0.4 : 0.8,
    }));

  return [...listings, ...docs];
}
