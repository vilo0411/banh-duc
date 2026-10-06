import Link from "next/link";
import { publishedCollections } from "@/lib/collections";
import { site } from "@/lib/site";

/**
 * Đầu trang kiểu báo điện tử: hai tầng. Tầng trên là măng sét và các chuyên
 * mục lớn của trang; tầng dưới là các nhóm công thức — trục phân loại thật sự
 * của nội dung, luôn hiện sẵn thay vì nằm sau một trang trung gian.
 *
 * Tầng dưới cuộn ngang trên điện thoại thay vì xuống dòng: một hàng cuộn được
 * giữ chiều cao đầu trang cố định, còn hai hàng nhãn xuống dòng thì ăn mất nửa
 * màn hình đầu tiên.
 */
export function SiteHeader() {
  const collections = publishedCollections();

  return (
    <header data-site-header className="sticky top-0 z-40 bg-bg">
      <div className="border-b border-line">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-6 px-4">
          <Link href="/" className="flex shrink-0 items-baseline gap-1.5">
            <span className="text-xl leading-none font-bold tracking-tight text-text">
              Bánh Đúc
            </span>
            <span className="text-sm leading-none font-bold text-gach">.vn</span>
          </Link>

          <nav aria-label="Điều hướng chính" className="min-w-0 flex-1">
            <ul className="scrollbar-none flex items-center gap-1 overflow-x-auto text-sm font-semibold">
              {site.nav.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="block px-2.5 py-2 whitespace-nowrap text-text transition-colors hover:text-lam sm:px-3"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </div>

      {collections.length > 0 && (
        <div className="border-b border-line bg-surface-am">
          <nav aria-label="Nhóm công thức" className="mx-auto max-w-6xl px-4">
            <ul className="scrollbar-none flex items-center gap-4 overflow-x-auto py-2 text-[0.8rem] sm:gap-5">
              <li>
                <Link
                  href="/cong-thuc/"
                  className="whitespace-nowrap font-semibold text-gach hover:underline"
                >
                  Tất cả
                </Link>
              </li>
              {collections.map((collection) => (
                <li key={collection.slug}>
                  <Link
                    href={`/cong-thuc/${collection.slug}/`}
                    className="whitespace-nowrap text-muted transition-colors hover:text-lam"
                  >
                    {collection.title}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      )}
    </header>
  );
}
