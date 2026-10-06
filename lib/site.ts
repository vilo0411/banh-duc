/**
 * Origin thật của site. Mọi canonical, `og:url` và `@id` trong JSON-LD đều mọc
 * ra từ đây, nên một giá trị sai không hỏng build mà hỏng lặng lẽ: cả site trỏ
 * canonical sang một tên miền khác và Google gộp nhầm. Bản dựng production
 * phải nói rõ nó đang ở đâu.
 */
const FALLBACK_URL = "https://banhduc.vn";
if (process.env.NODE_ENV === "production" && !process.env.NEXT_PUBLIC_SITE_URL) {
  console.warn(
    `⚠ NEXT_PUBLIC_SITE_URL chưa đặt — dùng tạm ${FALLBACK_URL} cho canonical và JSON-LD.`,
  );
}

/** Single source of truth for site-wide identity, used by metadata + JSON-LD. */
export const site = {
  url: process.env.NEXT_PUBLIC_SITE_URL ?? FALLBACK_URL,
  name: "Bánh Đúc",
  title: "Bánh Đúc – Tổng hợp và chia sẻ công thức làm bánh đúc",
  description:
    "Tổng hợp công thức làm bánh đúc các vùng miền: bánh đúc nóng, bánh đúc lạc, bánh đúc Huế, bánh đúc tàu… hướng dẫn chi tiết từng bước, dễ làm tại nhà.",
  locale: "vi_VN",
  lang: "vi",
  /** Đúng địa chỉ in trên /lien-he/ — dùng cho `email` của Person trong JSON-LD. */
  email: "nguyenvietloc0411@gmail.com",
  logo: "/images/logo-banh-duc.png",
  /**
   * Container GTM mà bản WordPress đã dùng — giữ nguyên ID để GA4 và mọi tag
   * trong container chạy tiếp, không đứt dữ liệu ở ngày chuyển nhà.
   */
  gtmId: "GTM-MQ8HRJNG",
  /**
   * Người đứng tên nội dung. Bản WordPress ký tên tác giả dưới mỗi bài, có một
   * khối giới thiệu ở cuối bài và một kho bài theo tác giả tại
   * /author/nvloc0411/; trang này giữ cả ba vì với nội dung công thức, "ai
   * viết" là một phần của E-E-A-T chứ không phải trang trí. Đường dẫn đổi sang
   * tiếng Việt như phần còn lại của trang, URL cũ được 301 trong next.config.
   */
  author: {
    name: "Lộc Nguyễn",
    slug: "loc-nguyen",
    role: "Người sáng lập Banhduc.vn",
    bio: "Xin chào, tôi là Lộc — người sáng lập và chủ blog Banhduc.vn. Với niềm đam mê sâu sắc dành cho ẩm thực truyền thống Việt Nam, đặc biệt là món bánh đúc, tôi xây dựng website này để chia sẻ kiến thức, công thức và những câu chuyện văn hóa xung quanh món ăn dân dã này.",
    url: "/tac-gia/loc-nguyen/",
  },
  nav: [
    { href: "/cong-thuc/", label: "Công thức" },
    { href: "/ve-chung-toi/", label: "Về chúng tôi" },
    { href: "/lien-he/", label: "Liên hệ" },
  ],
  footerNav: [
    { href: "/tac-gia/loc-nguyen/", label: "Tác giả" },
    { href: "/dieu-khoan-chinh-sach/", label: "Điều khoản & Chính sách" },
    { href: "/quy-trinh-san-xuat-noi-dung/", label: "Quy trình sản xuất nội dung" },
  ],
} as const;

/** Absolute URL for a site-relative path — required by OG tags and JSON-LD. */
export function absoluteUrl(path: string): string {
  return new URL(path, site.url).toString();
}
