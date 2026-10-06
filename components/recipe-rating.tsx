import type { Rating } from "@/lib/ratings";
import { RatingForm } from "./rating-form";

const one = new Intl.NumberFormat("vi-VN", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

/** "4,6" — cùng cách viết ở khối này, ở link đầu bài và trong luật của `check-html`. */
export function formatRating(value: number): string {
  return one.format(value);
}

const STAR = "M10 1.5l2.6 5.4 5.9.8-4.3 4.1 1 5.8L10 14.8l-5.2 2.8 1-5.8L1.5 7.7l5.9-.8z";

function Star({ fill }: { fill: number }) {
  // Sao tô theo tỉ lệ (4,6 điểm = bốn sao đầy, một sao 60%) bằng một lớp phủ
  // cắt theo chiều rộng — không dùng gradient vì nó cần `id`, và hai khối sao
  // trên cùng trang sẽ trùng `id`.
  return (
    <span className="relative block size-5">
      <svg viewBox="0 0 20 20" className="size-5 text-line">
        <path fill="currentColor" d={STAR} />
      </svg>
      <span className="absolute inset-y-0 left-0 overflow-hidden" style={{ width: `${fill * 100}%` }}>
        <svg viewBox="0 0 20 20" className="size-5 max-w-none text-gach">
          <path fill="currentColor" d={STAR} />
        </svg>
      </span>
    </span>
  );
}

export function Stars({ value }: { value: number }) {
  return (
    <span className="flex" aria-hidden>
      {[0, 1, 2, 3, 4].map((i) => (
        <Star key={i} fill={Math.max(0, Math.min(1, value - i))} />
      ))}
    </span>
  );
}

/**
 * Khối đánh giá cuối công thức: điểm hiện tại và form để chấm.
 *
 * Điểm render ở server, vì nó phải nằm trong HTML Google đọc — `aggregateRating`
 * trong JSON-LD chỉ hợp lệ khi đúng con số đó hiện trên trang, và
 * `npm run check` soát điều này qua `data-rating-summary`.
 */
export function RecipeRating({ slug, rating }: { slug: string; rating: Rating }) {
  return (
    <section id="danh-gia" aria-labelledby="danh-gia-tieu-de" data-print="hide" className="mt-10">
      <h2 id="danh-gia-tieu-de" className="section-title border-b border-line pb-2">
        Đánh giá công thức
      </h2>

      {rating.count > 0 ? (
        <p data-rating-summary className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1">
          <Stars value={rating.value} />
          <span>
            <strong className="nums text-lg">{formatRating(rating.value)}</strong>
            <span className="text-muted">/5</span>
            <span className="text-muted">
              {" "}
              · <span className="nums">{rating.count}</span> lượt đánh giá
            </span>
          </span>
        </p>
      ) : (
        <p className="mt-4 text-muted">Chưa có ai chấm điểm món này. Bạn đã nấu thử chưa?</p>
      )}

      <RatingForm slug={slug} />
    </section>
  );
}
