import Link from "next/link";

export type Crumb = { name: string; url: string };

/**
 * Đường dẫn phân cấp, đặt ngay dưới đầu trang trên mọi trang con. Cùng một
 * mảng `trail` được dùng cho JSON-LD `BreadcrumbList`, nên thứ Google đọc và
 * thứ người đọc thấy không thể lệch nhau.
 */
export function Breadcrumb({ trail }: { trail: Crumb[] }) {
  return (
    <nav aria-label="Đường dẫn" data-print="hide" className="text-xs text-muted">
      <ol className="flex flex-wrap items-center gap-1.5">
        {trail.map((item, i) => {
          const last = i === trail.length - 1;
          return (
            <li key={item.url} className="flex items-center gap-1.5">
              {i > 0 && (
                <span aria-hidden className="text-line">
                  ›
                </span>
              )}
              {last ? (
                <span aria-current="page" className="line-clamp-1 text-text">
                  {item.name}
                </span>
              ) : (
                <Link href={item.url} className="hover:text-lam">
                  {item.name}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
