import type { NextConfig } from "next";

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
      { source: "/wp-admin/:path*", destination: "/", permanent: false },
      { source: "/wp-login.php", destination: "/", permanent: false },
    ];
  },
};

export default nextConfig;
