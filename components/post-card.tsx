import Image from "next/image";
import Link from "next/link";
import type { Doc } from "@/lib/content";
import { formatDuration, recipeTimes } from "@/lib/recipe";

/**
 * Thẻ ảnh trên, tiêu đề dưới — dùng cho các khối tuyển chọn, nơi ảnh mới là
 * thứ mời người đọc bấm vào. Danh sách dài dùng `PostRow`, đặc hơn nhiều.
 *
 * Thẻ trong danh mục công thức trả lời câu "tối nay nấu được món này không?",
 * nên nó mang các con số của bếp chứ không mang thời gian đọc.
 */
export function PostCard({ doc, priority = false }: { doc: Doc; priority?: boolean }) {
  const recipe = doc.recipe;
  const total = formatDuration(recipeTimes(recipe).total);

  const facts = [total, recipe?.yield, doc.group].filter(Boolean);

  return (
    <article className="group">
      <Link href={doc.url} className="block">
        {doc.image && (
          <div className="relative aspect-[5/3] overflow-hidden bg-surface-am">
            <Image
              src={doc.image}
              alt={doc.imageAlt || doc.title}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 360px"
              priority={priority}
              className="object-cover"
            />
          </div>
        )}
        <h3 className="headline mt-2.5 transition-colors group-hover:text-lam">{doc.title}</h3>
      </Link>

      {doc.description && (
        <p className="mt-1.5 line-clamp-2 text-sm text-muted">{doc.description}</p>
      )}

      {facts.length > 0 && (
        <p className="nums mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
          {facts.map((fact, i) => (
            <span key={fact} className="flex items-center gap-2">
              {i > 0 && <span className="diamond" aria-hidden />}
              {fact}
            </span>
          ))}
        </p>
      )}
    </article>
  );
}
