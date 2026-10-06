import type { MetadataRoute } from "next";
import { getAllDocs, getGuides, getHomePage, getPosts, type Doc } from "@/lib/content";
import { collectionPosts, publishedCollections } from "@/lib/collections";
import { absoluteUrl, site } from "@/lib/site";

/**
 * Ngày trong frontmatter là giờ địa phương của bản WordPress (trường `date` /
 * `modified` của REST API, không phải `_gmt`) và không mang múi giờ. W3C
 * Datetime bắt buộc có múi giờ khi có phần giờ, nên gắn +07:00 — Việt Nam không
 * có giờ mùa hè, độ lệch này cố định.
 */
function lastmod(iso: string): string {
  if (!iso || /(Z|[+-]\d{2}:\d{2})$/.test(iso)) return iso;
  return /T/.test(iso) ? `${iso}+07:00` : iso;
}

/**
 * Một trang danh sách thay đổi khi bất kỳ bài nào nó liệt kê thay đổi — nên
 * lastmod của nó là ngày sửa mới nhất trong số đó, không phải ngày của bài đăng
 * gần nhất (bài đăng gần nhất chưa chắc là bài vừa sửa).
 */
function newest(docs: (Doc | undefined)[]): string {
  const dates = docs.flatMap((doc) => (doc ? [doc.updated || doc.date] : []));
  return lastmod(dates.reduce((a, b) => (b > a ? b : a), ""));
}

/**
 * Ảnh hero cộng mọi ảnh trong thân bài. Công thức sống nhờ Google Hình ảnh một
 * phần đáng kể; ảnh từng bước nằm sâu trong thân bài là thứ trình thu thập dễ
 * bỏ sót nhất.
 */
function images(doc: Doc): string[] {
  const inBody = [...doc.body.matchAll(/!\[[^\]]*\]\(([^)\s]+)/g)].map((m) => m[1]);
  const all = [doc.image, ...inBody].filter((src): src is string => !!src?.startsWith("/"));
  return [...new Set(all)].map(absoluteUrl);
}

export default function sitemap(): MetadataRoute.Sitemap {
  const posts = getPosts();
  const guides = getGuides();
  const docs = getAllDocs()
    // The listings below already cover these; a URL must appear only once.
    .filter((doc) => !["home", "tin-tuc"].includes(doc.slug));

  const listings: MetadataRoute.Sitemap = [
    {
      url: absoluteUrl("/"),
      // Trang chủ liệt kê cả công thức lẫn cẩm nang, và có nội dung riêng.
      lastModified: newest([...posts, ...guides, getHomePage()]),
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: absoluteUrl("/cong-thuc/"),
      lastModified: newest(posts),
      changeFrequency: "weekly",
      priority: 0.9,
    },
    ...publishedCollections().map((collection) => ({
      url: absoluteUrl(`/cong-thuc/${collection.slug}/`),
      lastModified: newest(collectionPosts(collection)),
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
    {
      url: absoluteUrl(site.author.url),
      lastModified: newest([...posts, ...guides]),
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: absoluteUrl("/so-do-trang/"),
      lastModified: newest(docs),
      changeFrequency: "weekly",
      priority: 0.3,
    },
  ];
  // /tin-tuc/ is intentionally absent: it 301s to /cong-thuc/, and a sitemap
  // should only list URLs that answer for themselves.

  const pages: MetadataRoute.Sitemap = docs.map((doc) => {
    const pictures = images(doc);
    return {
      url: absoluteUrl(doc.url),
      lastModified: lastmod(doc.updated || doc.date),
      // Cẩm nang đứng ngang công thức: đó là nội dung chủ đề, không phải trang
      // thủ tục như chính sách hay liên hệ.
      changeFrequency: doc.collection === "pages" ? "yearly" : "monthly",
      priority: doc.collection === "pages" ? 0.4 : 0.8,
      ...(pictures.length ? { images: pictures } : {}),
    };
  });

  return [...listings, ...pages];
}
