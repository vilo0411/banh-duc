import Image from "next/image";
import Link from "next/link";
import type { Doc } from "@/lib/content";
import { formatDuration, recipeTimes } from "@/lib/recipe";

/** Dòng meta dưới tiêu đề: thời gian nấu, khẩu phần, nhóm món. */
function facts(doc: Doc): string[] {
  return [
    formatDuration(recipeTimes(doc.recipe).total),
    doc.recipe?.yield,
    doc.group,
  ].filter((value): value is string => Boolean(value));
}

/**
 * Một mục trong danh sách: ảnh bên trái, tiêu đề và tóm tắt bên phải.
 *
 * Đây là đơn vị chính của trang — nó cho mười công thức vào đúng khoảng màn
 * hình mà lưới thẻ ảnh chỉ xếp được ba, và người đọc quét bằng tiêu đề chứ
 * không bằng ảnh. Bản `sm` dùng cho cột phải, nơi ảnh chỉ còn là mỏ neo.
 */
export function PostRow({
  doc,
  size = "md",
  priority = false,
  level = 3,
}: {
  doc: Doc;
  size?: "md" | "sm";
  priority?: boolean;
  /**
   * Cấp tiêu đề của dòng. Mặc định là h3 vì hầu hết danh sách nằm dưới một h2
   * ("Mới nhất", "Công thức liên quan"). Khi danh sách nằm thẳng dưới h1 của
   * trang — trang danh mục, trang nhóm — nó phải là h2, không thì dàn tiêu đề
   * nhảy từ h1 sang h3 và cả trang mất một tầng.
   */
  level?: 2 | 3;
}) {
  const small = size === "sm";
  const meta = small ? [] : facts(doc);
  const Heading = level === 2 ? "h2" : "h3";

  return (
    <article className="group flex gap-3 sm:gap-4">
      {doc.image && (
        <Link
          href={doc.url}
          tabIndex={-1}
          aria-hidden
          className={`relative block shrink-0 overflow-hidden bg-surface-am ${
            small ? "w-22 sm:w-24" : "w-32 sm:w-45"
          }`}
        >
          <div className="relative aspect-[5/3]">
            <Image
              src={doc.image}
              alt=""
              fill
              sizes={small ? "96px" : "(max-width: 640px) 128px, 180px"}
              priority={priority}
              className="object-cover"
            />
          </div>
        </Link>
      )}

      <div className="min-w-0 flex-1">
        <Heading>
          <Link
            href={doc.url}
            className={`headline block transition-colors group-hover:text-lam ${
              small ? "line-clamp-3 text-sm" : "text-base sm:text-lg"
            }`}
          >
            {doc.title}
          </Link>
        </Heading>

        {!small && doc.description && (
          <p className="mt-1.5 line-clamp-2 text-sm text-muted">{doc.description}</p>
        )}

        {meta.length > 0 && (
          <p className="nums mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
            {meta.map((fact, i) => (
              <span key={fact} className="flex items-center gap-2">
                {i > 0 && <span className="diamond" aria-hidden />}
                {fact}
              </span>
            ))}
          </p>
        )}
      </div>
    </article>
  );
}

/**
 * Danh sách các dòng, ngăn nhau bằng kẻ mảnh — mật độ của một trang tin đến từ
 * đường kẻ chứ không từ khoảng trắng.
 */
export function PostRows({
  docs,
  size = "md",
  priority = 0,
  level = 3,
}: {
  docs: Doc[];
  size?: "md" | "sm";
  /** Số ảnh đầu danh sách được tải ưu tiên (chỉ dùng khi danh sách ở đầu trang). */
  priority?: number;
  /** Xem `PostRow`. */
  level?: 2 | 3;
}) {
  return (
    <ul className="divide-y divide-line border-b border-line">
      {docs.map((doc, i) => (
        <li key={doc.slug} className={size === "sm" ? "py-3" : "py-4"}>
          <PostRow doc={doc} size={size} priority={i < priority} level={level} />
        </li>
      ))}
    </ul>
  );
}
