import type { Metadata } from "next";
import { Be_Vietnam_Pro } from "next/font/google";
import "./globals.css";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { site } from "@/lib/site";

// Một bộ chữ cho cả trang — tiêu đề và thân bài khác nhau ở cỡ và độ đậm, đúng
// cách một trang tin xếp chữ. `vietnamese` là bắt buộc, thiếu nó thì dấu tiếng
// Việt rơi về font hệ thống và cỡ chữ vỡ ngay giữa câu.
const body = Be_Vietnam_Pro({
  variable: "--font-be-vietnam",
  subsets: ["vietnamese", "latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: site.title,
    template: `%s | ${site.name}`,
  },
  description: site.description,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: site.name,
    locale: site.locale,
    url: site.url,
  },
  robots: {
    index: true,
    follow: true,
    "max-image-preview": "large",
    "max-snippet": -1,
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang={site.lang}
      // `scroll-behavior: smooth` (globals.css) makes in-article anchors glide,
      // but the router scrolls the same way — the reset to the top of a new page
      // becomes an 800ms animation that loses the race and leaves the reader
      // stranded near "Công thức khác". This attribute is how the App Router is
      // told to turn smooth off for the duration of a route transition.
      data-scroll-behavior="smooth"
      className={`${body.variable} h-full`}
    >
      <body className="flex min-h-full flex-col bg-bg text-text">
        {/* JSON-LD không còn ở đây: mỗi trang tự phát một `@graph` đầy đủ đã
            gồm các nút WebSite/Organization/Person — xem `lib/seo.tsx`. */}
        <a
          href="#noi-dung"
          className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50 focus:bg-surface focus:px-4 focus:py-2"
        >
          Tới nội dung chính
        </a>
        <SiteHeader />
        <main id="noi-dung" className="flex-1">
          {children}
        </main>
        <SiteFooter />
      </body>
    </html>
  );
}
