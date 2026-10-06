"use client";

import { useActionState, useEffect, useState, useSyncExternalStore } from "react";
import { rateRecipe, type RateState } from "@/app/[slug]/actions";

const LABELS = ["Không ngon", "Tạm được", "Được", "Ngon", "Rất ngon"];

// Phiếu đã lưu trên máy không đổi trong lúc trang mở (lượt mới đi qua `state`),
// nên không cần đăng ký lắng nghe gì.
const noSubscribe = () => () => {};

function readSaved(key: string): number {
  try {
    const saved = Number(localStorage.getItem(key));
    return saved >= 1 && saved <= 5 ? saved : 0;
  } catch {
    return 0;
  }
}

/**
 * Năm nút radio trong một `fieldset` — đúng nghĩa "chọn một trong năm", nên
 * trình đọc màn hình đọc được và bàn phím dùng được mũi tên. Không có JS thì
 * form vẫn gửi bình thường qua Server Action; JS chỉ thêm phần tô sao khi rê
 * chuột và lời xác nhận tại chỗ.
 */
export function RatingForm({ slug }: { slug: string }) {
  // Hàm action phải giữ nguyên danh tính giữa các lần render: một bản
  // `.bind(null, slug)` mới mỗi lần khiến React render lại form vô tận khi
  // dựng kết quả của một lần gửi không có JS. Slug đi bằng input ẩn.
  const [state, action, pending] = useActionState<RateState, FormData>(rateRecipe, {
    status: "idle",
  });
  const [choice, setChoice] = useState(0);
  const [hover, setHover] = useState(0);

  const key = `bd_rating:${slug}`;

  // Nhớ phiếu của chính người này trên máy họ — chỉ để hiện lại, server mới là
  // nơi quyết định một người một phiếu. Server render ra 0, máy người đọc đọc
  // localStorage sau khi hydrate.
  const saved = useSyncExternalStore(noSubscribe, () => readSaved(key), () => 0);
  const previous = state.status === "ok" ? state.stars : saved;
  const selected = choice || previous;

  useEffect(() => {
    if (state.status !== "ok") return;
    try {
      localStorage.setItem(key, String(state.stars));
    } catch {}
  }, [state, key]);

  const shown = hover || selected;

  return (
    <form action={action} className="mt-4">
      <input type="hidden" name="slug" value={slug} />
      <fieldset>
        <legend className="text-sm font-semibold">
          {previous ? `Bạn đã chấm ${previous} sao — chọn lại để sửa` : "Bạn chấm món này mấy sao?"}
        </legend>

        <div className="mt-2 flex items-center gap-3">
          <div className="flex" onMouseLeave={() => setHover(0)}>
            {LABELS.map((label, i) => {
              const stars = i + 1;
              return (
                <label
                  key={stars}
                  className="cursor-pointer p-0.5 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-lam"
                  onMouseEnter={() => setHover(stars)}
                >
                  <input
                    type="radio"
                    name="stars"
                    value={stars}
                    required
                    checked={selected === stars}
                    onChange={() => setChoice(stars)}
                    className="sr-only"
                  />
                  <svg
                    viewBox="0 0 20 20"
                    aria-hidden
                    className={`size-8 transition-colors ${stars <= shown ? "text-gach" : "text-line"}`}
                  >
                    <path
                      fill="currentColor"
                      d="M10 1.5l2.6 5.4 5.9.8-4.3 4.1 1 5.8L10 14.8l-5.2 2.8 1-5.8L1.5 7.7l5.9-.8z"
                    />
                  </svg>
                  <span className="sr-only">
                    {stars} sao — {label}
                  </span>
                </label>
              );
            })}
          </div>
          <span className="text-sm text-muted" aria-hidden>
            {shown ? LABELS[shown - 1] : ""}
          </span>
        </div>
      </fieldset>

      {/* Bẫy bot: ẩn với người thật và với trình đọc màn hình. */}
      <div aria-hidden className="absolute -left-[9999px]">
        <label>
          Website
          <input type="text" name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="mt-3 bg-lam px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {pending ? "Đang gửi…" : "Gửi đánh giá"}
      </button>

      <p role="status" className="mt-2 text-sm">
        {state.status === "ok" && (
          <span className="text-text">
            Cảm ơn bạn! Món này hiện được {String(state.rating.value).replace(".", ",")}/5 từ{" "}
            {state.rating.count} lượt đánh giá.
          </span>
        )}
        {state.status === "error" && <span className="text-gach">{state.message}</span>}
      </p>
    </form>
  );
}
