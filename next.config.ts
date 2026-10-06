import type { NextConfig } from "next";
import legacy from "./lib/legacy-redirects.json";

// Trang đính kèm ảnh của WP — bảng do scripts/legacy-redirects.ts sinh.
// Shortlink `/?p=<id>` dùng chung bảng đó nhưng nằm ở proxy.ts: redirect ở đây
// luôn mang query cũ theo sang đích, nên `/?attachment_id=…` về `/` sẽ tự lặp.
const attachmentRedirects = Object.entries(legacy.attachments).map(([source, destination]) => ({
  source,
  destination,
  permanent: true,
}));

const nextConfig: NextConfig = {
  // The WordPress site served every URL with a trailing slash. Keeping that
  // shape means zero redirects and zero lost link equity after the migration.
  trailingSlash: true,
  images: {
    formats: ["image/avif", "image/webp"],
  },

  // Every content URL carries over unchanged. What does not carry over is
  // WordPress's own plumbing — the Yoast sitemaps, the RSS path, wp-admin —
  // which Google has indexed and other sites link to. These are the only
  // redirects the migration needs.
  async redirects() {
    return [
      // Sources need the trailing slash: `trailingSlash: true` normalises the
      // incoming URL before these rules run.
      { source: "/feed/", destination: "/feed.xml", permanent: true },
      { source: "/comments/feed/", destination: "/feed.xml", permanent: true },
      { source: "/sitemap_index.xml", destination: "/sitemap.xml", permanent: true },
      { source: "/post-sitemap.xml", destination: "/sitemap.xml", permanent: true },
      { source: "/page-sitemap.xml", destination: "/sitemap.xml", permanent: true },
      { source: "/category-sitemap.xml", destination: "/sitemap.xml", permanent: true },
      { source: "/category/cong-thuc/", destination: "/cong-thuc/", permanent: true },
      // Hai chuyên mục rỗng mặc định của WP, vẫn trả 200 trên bản cũ.
      { source: "/:cat(uncategorized|uncategorised)/", destination: "/cong-thuc/", permanent: true },
      { source: "/category/:cat(uncategorized|uncategorised)/", destination: "/cong-thuc/", permanent: true },
      // Phân trang WP. Trang mới liệt kê mọi bài trên một trang.
      { source: "/page/:n(\\d+)/", destination: "/cong-thuc/", permanent: true },
      { source: "/:list(cong-thuc|tin-tuc)/page/:n(\\d+)/", destination: "/cong-thuc/", permanent: true },
      // WP có feed cho từng bài và từng chuyên mục; site mới chỉ có một feed.
      { source: "/:slug/feed/", destination: "/feed.xml", permanent: true },
      // /tin-tuc/ was a second listing of the same posts as /cong-thuc/. It
      // used to survive as a page with a canonical pointing at the recipe
      // index; a redirect says the same thing without asking Google to crawl a
      // duplicate first, and without asking a reader to pick between two menu
      // items that lead to the same list.
      //
      // `statusCode: 301` rather than `permanent: true`: the rules above emit
      // 308, which Google treats identically, but this URL was a live menu item
      // and gets hit by every crawler and link checker pointed at the old site
      // — 301 is the code all of them agree on.
      { source: "/tin-tuc/", destination: "/cong-thuc/", statusCode: 301 },
      // Kho bài theo tác giả đổi từ /author/<username>/ sang /tac-gia/<tên>/.
      // Chỉ có một tác giả, nên mọi URL /author/... đều về cùng một trang.
      { source: "/author/:path*", destination: "/tac-gia/loc-nguyen/", permanent: true },
      // /tac-gia/ không phải một trang: nó là thư mục cha của trang hồ sơ duy
      // nhất, và người gõ tay hoặc cắt bớt URL phải tới được đó thay vì 404.
      { source: "/tac-gia/", destination: "/tac-gia/loc-nguyen/", permanent: true },
      // Ảnh WordPress nằm phẳng trong /wp-content/uploads/ và giữ nguyên tên
      // khi migrate sang /images/. Google Images và các lượt chia sẻ cũ trỏ vào
      // cả bản gốc lẫn các bản WP tự cắt cỡ (`-768x480`) — bản cắt cỡ về ảnh
      // gốc, vì next/image tự sinh cỡ nhỏ từ đó. Không có `/` cuối: URL có phần
      // mở rộng không bị `trailingSlash` chuẩn hoá.
      // Favicon và logo của theme WP không được migrate; các bản cắt cỡ của
      // chúng vẫn được trình duyệt và trình đọc feed giữ lại.
      { source: "/wp-content/uploads/:f(cropped-favicon|favicon)-:rest(.+)", destination: "/icon.png", permanent: true },
      { source: "/wp-content/uploads/cropped-logo-banh-duc:rest(.*)", destination: "/images/logo-banh-duc.png", permanent: true },
      {
        source: "/wp-content/uploads/:name([^/]+?)-:size(\\d+x\\d+).:ext(jpe?g|png|webp|gif)",
        destination: "/images/:name.:ext",
        permanent: true,
      },
      { source: "/wp-content/uploads/:file([^/]+)", destination: "/images/:file", permanent: true },
      { source: "/wp-admin/:path*", destination: "/", permanent: false },
      { source: "/wp-login.php", destination: "/", permanent: false },
      ...attachmentRedirects,
    ];
  },
};

export default nextConfig;
