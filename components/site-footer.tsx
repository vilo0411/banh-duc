import Link from "next/link";
import { publishedCollections } from "@/lib/collections";
import { getGuides } from "@/lib/content";
import { site } from "@/lib/site";

/**
 * Chân trang kiểu báo: một dải xám, các cột liên kết, rồi một dòng bản quyền
 * ngăn bằng kẻ mảnh. Nó là nơi chứa mọi liên kết không đủ quan trọng để lên
 * đầu trang nhưng vẫn phải đi tới được từ mọi trang.
 */
export function SiteFooter() {
  return (
    <footer data-site-footer className="mt-10 border-t border-line bg-surface-am">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-2 lg:grid-cols-5">
        <div className="sm:col-span-2 lg:col-span-1">
          <p className="flex items-baseline gap-1.5">
            <span className="text-lg leading-none font-bold tracking-tight">Bánh Đúc</span>
            <span className="text-sm leading-none font-bold text-gach">.vn</span>
          </p>
          <p className="mt-3 max-w-sm text-sm text-muted">{site.description}</p>
        </div>

        {/* Mỗi cột là một khối điều hướng thật, nên nó là `nav` chứ không phải
            `div`, và nhãn của nó là chính cái tiêu đề người đọc thấy —
            `aria-labelledby` trỏ vào đó thay vì thêm một h2 ở chân trang, thứ
            sẽ chen vào dàn tiêu đề của mọi trang. */}
        <nav aria-labelledby="chan-trang-nhom">
          <p id="chan-trang-nhom" className="eyebrow">
            Nhóm công thức
          </p>
          <ul className="mt-3 space-y-2 text-sm">
            {publishedCollections().map((collection) => (
              <li key={collection.slug}>
                <Link
                  href={`/cong-thuc/${collection.slug}/`}
                  className="text-muted hover:text-lam"
                >
                  {collection.title}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* Cẩm nang phải đi tới được từ mọi trang: đây là ba trang duy nhất
            trả lời câu hỏi "bánh đúc là gì" thay vì liệt kê công thức, nên
            chúng cần đường vào cố định chứ không chỉ một khối ở trang chủ. */}
        <nav aria-labelledby="chan-trang-cam-nang">
          <p id="chan-trang-cam-nang" className="eyebrow">
            Cẩm nang
          </p>
          <ul className="mt-3 space-y-2 text-sm">
            {getGuides().map((guide) => (
              <li key={guide.slug}>
                <Link href={guide.url} className="text-muted hover:text-lam">
                  {guide.shortTitle}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-labelledby="chan-trang-chuyen-muc">
          <p id="chan-trang-chuyen-muc" className="eyebrow">
            Chuyên mục
          </p>
          <ul className="mt-3 space-y-2 text-sm">
            {site.nav.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="text-muted hover:text-lam">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-labelledby="chan-trang-thong-tin">
          <p id="chan-trang-thong-tin" className="eyebrow">
            Thông tin
          </p>
          <ul className="mt-3 space-y-2 text-sm">
            {site.footerNav.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="text-muted hover:text-lam">
                  {item.label}
                </Link>
              </li>
            ))}
            <li>
              <a href="/feed.xml" className="text-muted hover:text-lam">
                RSS
              </a>
            </li>
          </ul>
        </nav>
      </div>

      <div className="border-t border-line">
        <p className="mx-auto max-w-6xl px-4 py-5 text-xs text-muted">
          © {new Date().getFullYear()} banhduc.vn — Công thức nấu ăn chia sẻ phi lợi nhuận.
        </p>
      </div>
    </footer>
  );
}
