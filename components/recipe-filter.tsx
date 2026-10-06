"use client";

import { useMemo, useState, useSyncExternalStore, type ReactNode } from "react";
import { matcher } from "@/lib/text";

export type FilterItem = {
  slug: string;
  /** Tên bài cộng nguyên liệu — gõ "lạc" phải ra được các công thức có lạc. */
  haystack: string;
  minutes?: number;
  difficulty?: string;
  card: ReactNode;
};

// Dễ trước — dãy nhãn đọc ra là một thang độ khó, không phải thứ tự tình cờ
// của lúc viết bài.
const ORDER = ["Dễ", "Trung bình", "Khó"];

const TIME_BANDS = [
  { id: "nhanh", label: "Dưới 30 phút", test: (m: number) => m < 30 },
  { id: "vua", label: "30 – 60 phút", test: (m: number) => m >= 30 && m <= 60 },
  { id: "lau", label: "Trên 60 phút", test: (m: number) => m > 60 },
];

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`border px-3 py-1.5 text-sm transition-colors ${
        active
          ? "border-lam bg-lam font-semibold text-white"
          : "border-line text-muted hover:border-lam hover:text-lam"
      }`}
    >
      {children}
    </button>
  );
}

/**
 * Lọc chạy ở trình duyệt trên toàn bộ danh sách đã dựng sẵn, nên mọi công thức
 * vẫn nằm trong HTML cho trình thu thập và URL không đổi — danh mục là một
 * trang, không phải một tổ hợp các trang lọc mỏng.
 */
export function RecipeFilter({ items }: { items: FilterItem[] }) {
  const [time, setTime] = useState<string | null>(null);
  const [level, setLevel] = useState<string | null>(null);

  // Các nhãn nguyên liệu ở trang chủ trỏ về đây kèm `?q=`.
  //
  // Đọc nó bằng `useSyncExternalStore` chứ không bằng `useSearchParams`: hook
  // của router sẽ đẩy cả danh sách này sang dựng ở trình duyệt, và HTML dựng
  // sẵn mất sạch liên kết công thức. Ảnh chụp phía máy chủ là chuỗi rỗng, nên
  // lần dựng đầu khớp với HTML, rồi React dựng lại với từ khoá thật.
  const fromUrl = useSyncExternalStore(
    () => () => {},
    () => new URLSearchParams(window.location.search).get("q") ?? "",
    () => "",
  );

  // `null` nghĩa là người đọc chưa gõ gì — ô tìm kiếm vẫn thuộc về URL.
  const [typed, setTyped] = useState<string | null>(null);
  const query = typed ?? fromUrl;
  const setQuery = (value: string) => setTyped(value);

  const levels = useMemo(
    () =>
      ([...new Set(items.map((i) => i.difficulty).filter(Boolean))] as string[]).sort(
        (a, b) => ORDER.indexOf(a) - ORDER.indexOf(b),
      ),
    [items],
  );

  const trimmed = query.trim();
  const matches = useMemo(() => matcher(trimmed), [trimmed]);
  const shown = items.filter((item) => {
    const band = TIME_BANDS.find((b) => b.id === time);
    if (band && (item.minutes === undefined || !band.test(item.minutes))) return false;
    if (level && item.difficulty !== level) return false;
    if (trimmed && !matches(item.haystack)) return false;
    return true;
  });

  const filtering = time !== null || level !== null || trimmed !== "";

  return (
    <>
      {/* `search` là thẻ đúng cho khối này — nó cho trình đọc màn hình và trình
          thu thập biết đây là ô tìm kiếm của trang, thay vì một div có input. */}
      <search className="mt-6 rim rim-am block p-4">
        <label className="block">
          <span className="sr-only">Tìm công thức</span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm công thức hoặc nguyên liệu — lạc, lá dứa, mắm nêm…"
            className="w-full border border-line bg-surface px-3 py-2.5 text-sm placeholder:text-muted focus:border-lam focus:outline-none"
          />
        </label>

        <div
          role="group"
          aria-label="Lọc theo thời gian và độ khó"
          className="mt-3 flex flex-wrap items-center gap-2"
        >
          <Chip
            active={!filtering}
            onClick={() => {
              setTime(null);
              setLevel(null);
              setQuery("");
            }}
          >
            Tất cả
          </Chip>

          {TIME_BANDS.map((band) => (
            <Chip
              key={band.id}
              active={time === band.id}
              onClick={() => setTime(time === band.id ? null : band.id)}
            >
              {band.label}
            </Chip>
          ))}

          {levels.length > 1 &&
            levels.map((name) => (
              <Chip
                key={name}
                active={level === name}
                onClick={() => setLevel(level === name ? null : name)}
              >
                {name}
              </Chip>
            ))}
        </div>

        {/* Tổng số đã có trên tiêu đề trang, nên dòng này chỉ lên tiếng khi có
            bộ lọc đang bật — và khi đó thì nó buộc phải lên tiếng, cho trình
            đọc màn hình. */}
        <p aria-live="polite" className="nums mt-3 text-sm text-muted">
          {filtering ? `${shown.length} công thức phù hợp` : " "}
        </p>
      </search>

      {shown.length === 0 ? (
        <p className="mt-8 text-muted">
          Chưa có công thức nào khớp. Bỏ bớt một bộ lọc để xem thêm.
        </p>
      ) : (
        <ul className="mt-6 divide-y divide-line border-y border-line">
          {shown.map((item) => (
            <li key={item.slug} className="py-4">
              {item.card}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
